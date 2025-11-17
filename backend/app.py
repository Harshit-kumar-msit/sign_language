from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests

from models import ModelWrapper
import base64
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

# choose model file from repo root if available
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
# use the best LSTM model by default
DEFAULT_LSTM = os.path.join(BASE_DIR, 'gesture_lstm_cpu_best.pth')

# instantiate model wrapper (LSTM/keypoint-based) by default
model = ModelWrapper(model_type='lstm', model_path=DEFAULT_LSTM, device='cpu')

# instantiate FER face emotion detector (singleton)
face_detector = None
try:
	# import FER lazily so the server can still start even if fer isn't installed
	# try the package-level export first, then fall back to the module path
	try:
		from fer import FER
	except Exception:
		from fer.fer import FER
except Exception as e:
	app.logger.warning(
		'FER package import failed or is not exposing FER class: %s. /api/predict_emotion may be unavailable until you fix the installation (see backend/requirements.txt).',
		e,
	)
else:
	try:
		face_detector = FER(mtcnn=True)
		app.logger.info('FER detector initialized')
	except Exception as e:
		face_detector = None
		app.logger.warning('FER init failed: %s. /api/predict_emotion will be available but may return Unknown.', e)


@app.route('/api/health', methods=['GET'])
def health():
	return jsonify({'status': 'ok'})


@app.route('/api/predict_kp', methods=['POST'])
def predict_kp():
	data = request.get_json()
	if not data or 'sequence' not in data:
		return jsonify({'error': "missing 'sequence' in JSON body"}), 400

	seq = data['sequence']
	try:
		label, conf, probs = model.predict(seq)
		app.logger.info(f"predict_kp -> {label} conf={conf:.3f}")
		return jsonify({'label': label, 'confidence': conf, 'probs': probs})
	except Exception as e:
		return jsonify({'error': str(e)}), 500


@app.route('/api/debug_save', methods=['POST'])
def debug_save():
	"""Save the incoming sequence to disk for offline comparison with training samples.

	Request JSON: { sequence: [[...], ...], note: optional string }
	Returns: { saved: <relative_path>, shape: [seq_len, feat], min: val, max: val }
	"""
	data = request.get_json()
	if not data or 'sequence' not in data:
		return jsonify({'error': "missing 'sequence' in JSON body"}), 400
	seq = data['sequence']
	arr = None
	try:
		import numpy as _np
		arr = _np.array(seq, dtype=_np.float32)
		debug_dir = os.path.join(os.path.dirname(__file__), 'debug_sequences')
		os.makedirs(debug_dir, exist_ok=True)
		fname = f"seq_{int(__import__('time').time()*1000)}.npy"
		path = os.path.join(debug_dir, fname)
		_np.save(path, arr)
		app.logger.info(f"Saved debug sequence to {path} shape={arr.shape}")
		return jsonify({'saved': os.path.relpath(path, start=os.path.dirname(__file__)), 'shape': list(arr.shape), 'min': float(arr.min()), 'max': float(arr.max())})
	except Exception as e:
		return jsonify({'error': str(e)}), 500

@app.route('/api/translate', methods=['POST'])
def translate_proxy():
    data = request.get_json() or {}
    text = (data.get("text", "") or "").strip()
    target = (data.get("target", "") or "").strip()

    if not text or not target:
        return jsonify({"error": "missing text or target"}), 400

    primary = target.split("-")[0].lower()

    print("TEXT RECEIVED:", repr(text))
    print("TARGET RECEIVED:", repr(primary))

    alphabet_hi = {
        "i": "मैं",
    }

    # custom rule for single character "I"
    if len(text) == 1 and text.lower() in alphabet_hi and primary == "hi":
        return jsonify({"translation": alphabet_hi[text.lower()]})

    # Google translate fallback
    try:
        params = {
            "client": "gtx",
            "sl": "en",
            "tl": primary,
            "dt": "t",
            "q": text
        }

        resp = requests.get(
            "https://translate.googleapis.com/translate_a/single",
            params=params,
            timeout=10
        )

        if resp.ok:
            arr = resp.json()
            translated = arr[0][0][0] if arr and arr[0] and arr[0][0] else text
            return jsonify({"translation": translated})

        print("GOOGLE RESP NOT OK:", resp.status_code, resp.text)

    except Exception as e:
        print("GOOGLE ERROR:", e)

    return jsonify({"translation": text})




@app.route('/api/predict_emotion', methods=['POST'])
def predict_emotion():
	data = request.get_json()
	if not data or 'image' not in data:
		return jsonify({'error': "missing 'image' in JSON body"}), 400
	img_b64 = data['image']
	# strip data URL prefix if present
	if ',' in img_b64:
		img_b64 = img_b64.split(',', 1)[1]
	try:
		img_bytes = base64.b64decode(img_b64)
		nparr = np.frombuffer(img_bytes, np.uint8)
		frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
		if frame is None:
			return jsonify({'label': 'Unknown', 'score': 0.0})
		# convert to RGB for FER
		rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
		if face_detector is None:
			# FER not available/initialized on server
			return jsonify({'error': 'FER not available on server. Install fer and dependencies.'}), 503
		top = face_detector.top_emotion(rgb)
		if top is None:
			return jsonify({'label': 'Unknown', 'score': 0.0})
		label, score = top
		app.logger.info(f'predict_emotion -> {label} score={score:.3f}')
		return jsonify({'label': label, 'score': float(score)})
	except Exception as e:
		return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
	# development server
	app.run(host='0.0.0.0', port=5000, debug=True)

