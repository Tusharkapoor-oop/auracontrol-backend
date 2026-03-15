"""
Accuracy benchmark — runs inference on the test split and asserts macro F1 > 0.97.
Usage: python -m tests.test_accuracy --data_dir ./data --weights ./app/models/weights/best_model.pt
"""
import argparse
import sys
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.models.gesture_model import GestureModel, NUM_CLASSES
from app.models.dataset import GestureDataset, split_dataset, GESTURE_CLASSES


def compute_metrics(preds, labels, num_classes):
    preds, labels = np.array(preds), np.array(labels)
    f1s, precs, recs = [], [], []
    for c in range(num_classes):
        tp = int(((preds == c) & (labels == c)).sum())
        fp = int(((preds == c) & (labels != c)).sum())
        fn = int(((preds != c) & (labels == c)).sum())
        prec = tp / (tp + fp + 1e-8)
        rec  = tp / (tp + fn + 1e-8)
        f1   = 2 * prec * rec / (prec + rec + 1e-8)
        precs.append(prec); recs.append(rec); f1s.append(f1)
    return np.mean(f1s), np.mean(precs), np.mean(recs), f1s


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=str, default="./data")
    parser.add_argument("--weights",  type=str, default="./app/models/weights/best_model.pt")
    parser.add_argument("--target_f1", type=float, default=0.97)
    args = parser.parse_args()

    device   = torch.device("cpu")
    dataset  = GestureDataset(args.data_dir, augment=False)
    _, val   = split_dataset(dataset, val_ratio=0.15, seed=42)
    loader   = DataLoader(val, batch_size=256, num_workers=0)

    model = GestureModel(NUM_CLASSES)
    state = torch.load(args.weights, map_location="cpu")
    if any(k.startswith("module.") for k in state):
        state = {k.replace("module.", ""): v for k, v in state.items()}
    model.load_state_dict(state)
    model.eval()

    all_preds, all_labels = [], []
    with torch.no_grad():
        for x, y in loader:
            preds = model(x.to(device)).argmax(1).cpu().numpy()
            all_preds.extend(preds); all_labels.extend(y.numpy())

    macro_f1, macro_prec, macro_rec, per_class = compute_metrics(all_preds, all_labels, NUM_CLASSES)
    overall_acc = sum(p == l for p, l in zip(all_preds, all_labels)) / len(all_preds)

    print("\n=== ACCURACY BENCHMARK ===")
    print(f"Samples     : {len(all_preds)}")
    print(f"Accuracy    : {overall_acc:.4f} ({overall_acc*100:.2f}%)")
    print(f"Macro F1    : {macro_f1:.4f}")
    print(f"Macro Prec  : {macro_prec:.4f}")
    print(f"Macro Rec   : {macro_rec:.4f}")
    print("\nPer-class F1:")
    for cls, f1v in zip(GESTURE_CLASSES, per_class):
        bar = "█" * int(f1v * 20) + "░" * (20 - int(f1v * 20))
        print(f"  {cls:15s} [{bar}] {f1v:.3f}")

    target = args.target_f1
    if macro_f1 >= target:
        print(f"\n✅ PASS  Macro F1={macro_f1:.4f} ≥ {target}")
        sys.exit(0)
    else:
        print(f"\n❌ FAIL  Macro F1={macro_f1:.4f} < {target}")
        sys.exit(1)


if __name__ == "__main__":
    main()
