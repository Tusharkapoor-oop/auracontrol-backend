"""
Kalman Filter for per-landmark smoothing.
Reduces jitter from MediaPipe without introducing latency.
Pure NumPy — no OpenCV dependency.
"""
from __future__ import annotations
import numpy as np
from typing import List, Dict


class _KF1D:
    """1D Kalman filter: constant-velocity model."""
    def __init__(self, process_noise: float = 1e-4, measurement_noise: float = 1e-2):
        self.x = np.array([0.0, 0.0])          # state: [pos, vel]
        self.P = np.eye(2) * 1.0               # covariance
        self.F = np.array([[1, 1], [0, 1]])    # transition
        self.H = np.array([[1, 0]])            # observation
        self.Q = np.eye(2) * process_noise
        self.R = np.array([[measurement_noise]])

    def update(self, z: float) -> float:
        # Predict
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        # Update
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = self.x + K @ (np.array([[z]]) - self.H @ self.x)
        self.P = (np.eye(2) - K @ self.H) @ self.P
        return float(self.x[0])


class KalmanSmoother:
    """
    Maintains one 1-D Kalman filter per coordinate per landmark.
    Handles 21 landmarks × 3 axes = 63 independent filters.
    """
    N_LANDMARKS = 21

    def __init__(self):
        self._filters: List[List[_KF1D]] = [
            [_KF1D() for _ in range(3)]
            for _ in range(self.N_LANDMARKS)
        ]

    def update(self, landmarks: List[Dict[str, float]]) -> List[Dict[str, float]]:
        """
        Args:
            landmarks: list of {x, y, z} dicts, length 21
        Returns:
            Smoothed list of {x, y, z} dicts
        """
        out = []
        for i, lm in enumerate(landmarks):
            sx = self._filters[i][0].update(lm["x"])
            sy = self._filters[i][1].update(lm["y"])
            sz = self._filters[i][2].update(lm["z"])
            out.append({"x": sx, "y": sy, "z": sz})
        return out

    def reset(self):
        for row in self._filters:
            for f in row:
                f.x[:] = 0
                f.P[:] = np.eye(2)
