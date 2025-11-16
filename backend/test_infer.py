import os
import numpy as np
from models import ModelWrapper


def find_sample():
    base = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'processed', 'keypoints'))
    if not os.path.isdir(base):
        raise RuntimeError('processed/keypoints not found')
    for label in sorted(os.listdir(base)):
        label_dir = os.path.join(base, label)
        if not os.path.isdir(label_dir):
            continue
        for f in os.listdir(label_dir):
            if f.endswith('.npy'):
                return os.path.join(label_dir, f), label
    raise RuntimeError('no sample found')


if __name__ == '__main__':
    sample_path, expected_label = find_sample()
    print('Using sample:', sample_path, 'expected label:', expected_label)

    # instantiate model wrapper (same as app)
    repo_root = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
    # use the best LSTM model by default
    pth = os.path.join(repo_root, 'gesture_lstm_cpu_best.pth')
    m = ModelWrapper(model_type='lstm', model_path=pth, device='cpu')

    arr = np.load(sample_path).astype(np.float32)
    print('sample shape:', arr.shape, 'min/max', float(arr.min()), float(arr.max()))

    # take first 8 frames
    seq = arr[:8].tolist()
    label, conf, probs = m.predict(seq)
    print('predicted:', label, conf)
    print('probs:', probs)
