from flask import Flask, request, jsonify
from flask_cors import CORS
import os

from models import ModelWrapper

app = Flask(__name__)
CORS(app)

# choose model file from repo root if available
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DEFAULT_LSTM = os.path.join(BASE_DIR, 'gesture_lstm_cpu.pth')

# instantiate model wrapper (LSTM/keypoint-based) by default
model = ModelWrapper(model_type='lstm', model_path=DEFAULT_LSTM, device='cpu')


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


if __name__ == '__main__':
	# development server
	app.run(host='0.0.0.0', port=5000, debug=True)

