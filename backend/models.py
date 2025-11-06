import os
import numpy as np
import torch
import torch.nn as nn


# --- Model definitions (same architecture used in training notebook) ---
class GestureLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dim=64, num_classes=5, num_layers=1,dropout=0.3, bidirectional=True):
        # super().__init__()
        # self.bidirectional = bidirectional
        # self.hidden_dim = hidden_dim
        # self.num_layers = num_layers
        # self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=num_layers, batch_first=True, bidirectional=bidirectional)
        # fc_in = hidden_dim * (2 if bidirectional else 1)
        # self.classifier = nn.Linear(fc_in, num_classes)
        super(GestureLSTM, self).__init__()
        
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0
        )
        self.fc = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_dim * 2, num_classes)
        )

    def forward(self, x):
        # x: (batch, seq_len, input_dim)
        out, _ = self.lstm(x)        # out shape: (batch, seq_len, hidden_dim * num_directions)
        out_last = out[:, -1, :]     # take last timestep
        # logits = self.classifier(out_last)
        logits=self.fc(out_last)
        return logits


class Simple3DCNN(nn.Module):
    def __init__(self, num_classes=5):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv3d(3, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool3d((1,2,2)),

            nn.Conv3d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool3d((2,2,2)),

            nn.Conv3d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool3d((1,1,1)),
        )
        self.classifier = nn.Linear(64, num_classes)

    def forward(self, x):
        # x expects shape (batch, channels=3, frames, H, W)
        h = self.features(x)        # (batch, 64, 1, 1, 1)
        h = h.view(h.size(0), -1)   # (batch, 64)
        logits = self.classifier(h)
        return logits


# --- Model wrapper to load state_dict and predict ---
class ModelWrapper:
    def __init__(self, model_type='lstm', model_path=None, device='cpu'):
        self.device = torch.device(device)
        self.model_type = model_type

        # try to infer labels from processed/keypoints directory
        kp_root = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'processed', 'keypoints')
        # normalized path
        kp_root = os.path.normpath(kp_root)
        if os.path.isdir(kp_root):
            labels = sorted([d for d in os.listdir(kp_root) if os.path.isdir(os.path.join(kp_root, d))])
        else:
            # fallback to a sensible default
            labels = ["Food", "I", "Sorry", "ThankYou", "Water"]
        self.labels = labels

        # determine feature dim by reading a sample keypoint file if present
        feature_dim = None
        try:
            if os.path.isdir(kp_root):
                for label in labels:
                    label_dir = os.path.join(kp_root, label)
                    for fname in os.listdir(label_dir):
                        if fname.endswith('.npy'):
                            arr = np.load(os.path.join(label_dir, fname))
                            feature_dim = int(arr.shape[1])
                            break
                    if feature_dim:
                        break
        except Exception:
            feature_dim = None

        # choose model and instantiate
        if model_type == 'lstm':
            if feature_dim is None:
                # assume MediaPipe two-hands 21*3*2 = 126
                feature_dim = 126
            self.model = GestureLSTM(input_dim=feature_dim, hidden_dim=64, num_classes=len(self.labels))
        else:
            self.model = Simple3DCNN(num_classes=len(self.labels))

        # load weights if path provided
        if model_path and os.path.exists(model_path):
            state = torch.load(model_path, map_location=self.device)
            # if the saved file is a dict containing extra keys, try to locate state_dict
            if isinstance(state, dict) and 'state_dict' in state:
                state = state['state_dict']

            # normalize keys by removing common DataParallel 'module.' prefix
            norm_state = {}
            for k, v in state.items():
                new_k = k.replace('module.', '')
                norm_state[new_k] = v

            model_keys = set(self.model.state_dict().keys())

            # quick try: exact load
            try:
                self.model.load_state_dict(norm_state)
            except RuntimeError as e:
                # try to handle common naming differences (e.g., original model used 'fc' but here it's 'classifier')
                # mapping candidates: 'fc' -> 'classifier'
                mapped = None
                if any(k.startswith('fc.') for k in norm_state.keys()) and any(k.startswith('classifier.') for k in model_keys):
                    mapped = {}
                    for k, v in norm_state.items():
                        if k.startswith('fc.'):
                            mapped['classifier.' + k.split('.', 1)[1]] = v
                        else:
                            mapped[k] = v
                # if we created a mapped dict, attempt to load it
                if mapped is not None:
                    try:
                        self.model.load_state_dict(mapped)
                    except RuntimeError:
                        # fallback: try non-strict load to at least load matching layers
                        self.model.load_state_dict(mapped, strict=False)
                else:
                    # final fallback: load non-strict using normalized keys so matching layers load
                    self.model.load_state_dict(norm_state, strict=False)

        # --- Debugging: report a few parameter norms so we can verify important layers loaded ---
        try:
            param_names = list(self.model.state_dict().keys())
            # look for classifier or fc weights
            wname = None
            for candidate in ('classifier.weight', 'fc.weight', 'classifier.0.weight'):
                if candidate in param_names:
                    wname = candidate
                    break
            if wname is not None:
                w = self.model.state_dict()[wname]
                print(f"Loaded model param '{wname}' shape={tuple(w.shape)} norm={float(torch.norm(w).item()):.6f}")
            else:
                # print first few param names
                print('Loaded model parameters:', param_names[:6])
        except Exception as _:
            pass

        self.model.to(self.device)
        self.model.eval()

    def _preprocess(self, sequence, target_frames=8):
        # sequence: list of per-frame feature lists
        arr = np.array(sequence, dtype=np.float32)
        # pad or truncate to target_frames
        if arr.ndim == 1:
            # single flattened frame -> expand
            arr = arr.reshape(1, -1)
        if arr.shape[0] < target_frames:
            pad = np.zeros((target_frames - arr.shape[0], arr.shape[1]), dtype=np.float32)
            arr = np.vstack([arr, pad])
        elif arr.shape[0] > target_frames:
            arr = arr[:target_frames]
        # return tensor shape (1, seq, feat)
        return torch.from_numpy(arr).unsqueeze(0).to(self.device)

    def predict(self, sequence, target_frames=8):
        x = self._preprocess(sequence, target_frames=target_frames)
        with torch.no_grad():
            logits = self.model(x)
            probs = torch.softmax(logits, dim=-1).cpu().numpy().flatten()
        top_idx = int(probs.argmax())
        return self.labels[top_idx], float(probs[top_idx]), {self.labels[i]: float(probs[i]) for i in range(len(self.labels))}
