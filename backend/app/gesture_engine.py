"""
GestureEngine — ONNX Runtime inference wrapper.
Loads TorchScript/ONNX model or falls back to heuristic rules.

Target: <15ms inference on CPU (Intel i5).
"""
from __future__ import annotations
import time
import logging
import numpy as np
from collections import deque
from pathlib import Path
from typing import Dict, Any, List, Optional

log = logging.getLogger("gesture_engine")

WEIGHT_DIR = Path(__file__).parent / "models" / "weights"
ONNX_PATH  = WEIGHT_DIR / "gesture_model.onnx"

GESTURE_CLASSES = [
    "none", "open_palm", "fist", "pointing", "peace", "thumb_up", "thumb_down",
    "ok", "rock", "pinch", "grab", "swipe_left", "swipe_right", "swipe_up",
    "swipe_down", "circle_cw", "circle_ccw", "zoom_in", "zoom_out", "throw", "air_write",
]

# Confidence threshold — predictions below this are converted to "none"
CONFIDENCE_THRESHOLD = 0.85
# Temporal smoothing: majority vote over last N predictions
SMOOTHING_WINDOW = 5
# Circular buffer length for LSTM input
SEQ_LEN = 32


def _normalize(lm: List[Dict[str, float]]) -> np.ndarray:
    """Normalize landmarks relative to wrist; scale by wrist→middle-knuckle dist."""
    pts = np.array([[p["x"], p["y"], p["z"]] for p in lm], dtype=np.float32)
    wrist  = pts[0]
    scale  = float(np.linalg.norm(pts[9] - pts[0])) or 1.0
    return (pts - wrist) / scale


def _compute_velocity(curr: np.ndarray, prev: np.ndarray, dt_ms: float) -> np.ndarray:
    if dt_ms <= 0:
        return np.zeros(3, dtype=np.float32)
    delta = (curr[0] - prev[0]) / (dt_ms / 1000.0)  # wrist velocity
    return delta.astype(np.float32)


class GestureEngine:
    """
    Hybrid inference engine:
      1. Try ONNX Runtime with exported BiLSTM+Transformer model.
      2. Fall back to fast heuristic rules if model not available.
    """

    def __init__(self):
        self._ort: Optional[Any] = None
        self._buffer: deque[np.ndarray] = deque(maxlen=SEQ_LEN)
        self._prev_lm: Optional[np.ndarray] = None
        self._prev_t: float = 0.0
        self._vote_buf: deque[str] = deque(maxlen=SMOOTHING_WINDOW)
        self._last_dynamic_t: float = 0.0
        self._dynamic_cooldown = 0.55  # seconds

        # Try loading ONNX model
        if ONNX_PATH.exists():
            try:
                import onnxruntime as ort
                sess_opts = ort.SessionOptions()
                sess_opts.intra_op_num_threads = 2
                sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self._ort = ort.InferenceSession(
                    str(ONNX_PATH),
                    sess_options=sess_opts,
                    providers=["CPUExecutionProvider"],
                )
                log.info(f"✅ ONNX model loaded: {ONNX_PATH}")
            except ImportError:
                log.warning("onnxruntime not installed — using heuristic fallback")
        else:
            log.info("No weights found — using heuristic gesture engine")

    def predict(self, landmarks: List[Dict[str, float]]) -> Dict[str, Any]:
        """
        Main inference entry point.
        Returns dict: {gesture, confidence, velocity}
        """
        t0 = time.perf_counter()

        norm = _normalize(landmarks)
        now  = time.time()
        dt   = (now - self._prev_t) * 1000 if self._prev_t else 33.0
        vel  = _compute_velocity(norm, self._prev_lm, dt) if self._prev_lm is not None else np.zeros(3)

        self._prev_lm = norm
        self._prev_t  = now

        # Build frame feature: 63 landmark values + 3 velocity
        frame = np.concatenate([norm.flatten(), vel]).astype(np.float32)
        self._buffer.append(frame)

        # --- ONNX path ---
        if self._ort and len(self._buffer) == SEQ_LEN:
            result = self._onnx_predict()
        else:
            result = self._heuristic_predict(norm, vel)

        # Temporal smoothing
        self._vote_buf.append(result["gesture"])
        smoothed = max(set(self._vote_buf), key=list(self._vote_buf).count)
        result["gesture"] = smoothed

        latency_ms = (time.perf_counter() - t0) * 1000
        result["latency_ms"] = round(latency_ms, 2)
        result["velocity"]   = {"x": float(vel[0]), "y": float(vel[1]),
                                 "z": float(vel[2]), "magnitude": float(np.linalg.norm(vel))}
        return result

    def _onnx_predict(self) -> Dict[str, Any]:
        seq = np.stack(list(self._buffer))[np.newaxis].astype(np.float32)  # (1, 32, 66)
        inp = {self._ort.get_inputs()[0].name: seq}
        logits = self._ort.run(None, inp)[0][0]  # (num_classes,)
        probs  = _softmax(logits)
        idx    = int(np.argmax(probs))
        conf   = float(probs[idx])
        if conf < CONFIDENCE_THRESHOLD:
            return {"gesture": "none", "confidence": conf}
        return {"gesture": GESTURE_CLASSES[idx], "confidence": conf}

    def _heuristic_predict(self, norm: np.ndarray, vel: np.ndarray) -> Dict[str, Any]:
        """
        Fast heuristic rules on normalized landmarks.
        Order: static gestures first (cheapest), then dynamic (velocity-gated).
        """
        fingertips  = [4, 8, 12, 16, 20]
        pip_joints  = [3, 6, 10, 14, 18]
        extended    = [norm[t][1] < norm[p][1] for t, p in zip(fingertips, pip_joints)]
        n_ext       = sum(extended)

        # Pinch: index–thumb close
        pinch_dist = float(np.linalg.norm(norm[8] - norm[4]))
        if pinch_dist < 0.2:
            now = time.time()
            speed = float(np.linalg.norm(vel))
            if speed > 0.8 and now - self._last_dynamic_t > self._dynamic_cooldown:
                self._last_dynamic_t = now
                return {"gesture": "throw", "confidence": 0.88}
            return {"gesture": "pinch", "confidence": 0.90}

        # Static shapes
        if n_ext == 0:    return {"gesture": "fist",      "confidence": 0.92}
        if n_ext == 5:    return {"gesture": "open_palm", "confidence": 0.92}
        if n_ext == 1 and extended[1]:
            # Pointing — check for swipe
            speed = float(np.linalg.norm(vel))
            now   = time.time()
            if speed > 0.5 and now - self._last_dynamic_t > self._dynamic_cooldown:
                self._last_dynamic_t = now
                ax = abs(vel[0]), abs(vel[1])
                if ax[0] > ax[1]:
                    g = "swipe_left" if vel[0] < 0 else "swipe_right"
                else:
                    g = "swipe_up"   if vel[1] < 0 else "swipe_down"
                return {"gesture": g, "confidence": 0.88}
            return {"gesture": "pointing", "confidence": 0.89}
        if n_ext == 2 and extended[1] and extended[2]: return {"gesture": "peace",   "confidence": 0.91}
        if n_ext == 1 and extended[0]:                 return {"gesture": "thumb_up", "confidence": 0.90}

        return {"gesture": "none", "confidence": 0.0}


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()
