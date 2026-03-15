"""
GestureDataset — Loads sequences of normalized landmarks + labels.
Format: data_dir/gesture_name/sample_XXXX.npy — each (32, 66) float32 array
Also supports augmentation for robustness to lighting/angle/speed variation.
"""
from __future__ import annotations
import random
from pathlib import Path
from typing import Tuple, List

import numpy as np
import torch
from torch.utils.data import Dataset, Subset


GESTURE_CLASSES = [
    "none", "open_palm", "fist", "pointing", "peace", "thumb_up", "thumb_down",
    "ok", "rock", "pinch", "grab", "swipe_left", "swipe_right", "swipe_up",
    "swipe_down", "circle_cw", "circle_ccw", "zoom_in", "zoom_out", "throw", "air_write",
]
CLASS_TO_IDX = {c: i for i, c in enumerate(GESTURE_CLASSES)}


class GestureDataset(Dataset):
    """
    Loads .npy gesture sequences from disk.
    Expected dir structure:
        data_dir/
          open_palm/
            sample_0000.npy  → (32, 66) float32
            …
          fist/
            …
    """

    def __init__(self, data_dir: str, augment: bool = True):
        self.augment = augment
        self.samples: List[Tuple[Path, int]] = []

        data_path = Path(data_dir)
        for cls_name in GESTURE_CLASSES:
            cls_dir = data_path / cls_name
            if not cls_dir.exists():
                continue
            label = CLASS_TO_IDX[cls_name]
            for npy in cls_dir.glob("*.npy"):
                self.samples.append((npy, label))

        if not self.samples:
            raise FileNotFoundError(f"No gesture .npy files found in {data_dir}. "
                                    "Run the data collection script first.")

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        path, label = self.samples[idx]
        seq = np.load(path).astype(np.float32)   # (32, 66)

        if self.augment:
            seq = self._augment(seq)

        return torch.from_numpy(seq), torch.tensor(label, dtype=torch.long)

    @staticmethod
    def _augment(seq: np.ndarray) -> np.ndarray:
        """
        Augmentation pipeline:
        1. Gaussian noise (σ=0.005) — simulate sensor jitter
        2. Random temporal speed-up/slow-down (resample to fixed 32 frames)
        3. Random axis reflection (mirror hand horizontally)
        4. Landmark dropout (zero out 2-3 landmarks with prob 0.2)
        5. Scale jitter (multiply by 0.85–1.15)
        """
        # 1. Noise
        seq = seq + np.random.normal(0, 0.005, seq.shape).astype(np.float32)

        # 2. Speed jitter (temporal resample)
        if random.random() < 0.5:
            orig_len = seq.shape[0]
            speed = random.uniform(0.7, 1.3)
            new_len = max(4, int(orig_len * speed))
            indices = np.linspace(0, orig_len - 1, new_len).astype(int)
            resampled = seq[indices]
            # Pad or trim back to orig_len
            if new_len < orig_len:
                pad = np.tile(resampled[-1:], (orig_len - new_len, 1))
                seq = np.concatenate([resampled, pad], axis=0)
            else:
                seq = resampled[:orig_len]

        # 3. Horizontal reflection (flip x of landmarks)
        if random.random() < 0.3:
            # Landmarks are in first 63 cols: [x0,y0,z0, x1,y1,z1, …]
            seq_lm = seq[:, :63].reshape(-1, 21, 3)
            seq_lm[:, :, 0] *= -1
            seq[:, :63] = seq_lm.reshape(-1, 63)
            seq[:, 63] *= -1  # velocity x

        # 4. Landmark dropout
        if random.random() < 0.2:
            drop_idx = random.sample(range(21), random.randint(1, 3))
            for d in drop_idx:
                seq[:, d*3:(d+1)*3] = 0.0

        # 5. Scale jitter
        scale = random.uniform(0.85, 1.15)
        seq[:, :63] *= scale

        return seq


def split_dataset(dataset: GestureDataset, val_ratio: float = 0.15, seed: int = 42):
    """Stratified split into train / val subsets."""
    rng = random.Random(seed)
    by_class: dict[int, List[int]] = {}
    for i, (_, label) in enumerate(dataset.samples):
        by_class.setdefault(label, []).append(i)

    train_idx, val_idx = [], []
    for indices in by_class.values():
        rng.shuffle(indices)
        split = max(1, int(len(indices) * val_ratio))
        val_idx.extend(indices[:split])
        train_idx.extend(indices[split:])

    return Subset(dataset, train_idx), Subset(dataset, val_idx)
