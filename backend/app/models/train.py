"""
Full Training Script — AuraControl AI Gesture Model
Uses AdamW + cosine annealing, label smoothing, gradient clipping.
Supports multi-GPU via DataParallel.
"""
from __future__ import annotations
import argparse
import json
import logging
import os
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader

from app.models.gesture_model import GestureModel, NUM_CLASSES, SEQ_LEN, INPUT_DIM
from app.models.dataset import GestureDataset, split_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("train")

WEIGHT_DIR = Path(__file__).parent / "weights"
WEIGHT_DIR.mkdir(parents=True, exist_ok=True)


def train_epoch(model, loader, optimizer, criterion, device, grad_clip=1.0):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad(set_to_none=True)
        logits = model(x)
        loss   = criterion(logits, y)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
        optimizer.step()
        total_loss += loss.item() * y.size(0)
        correct    += (logits.argmax(1) == y).sum().item()
        total      += y.size(0)
    return total_loss / total, correct / total


@torch.no_grad()
def eval_epoch(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels = [], []
    for x, y in loader:
        x, y  = x.to(device), y.to(device)
        logits = model(x)
        loss   = criterion(logits, y)
        total_loss += loss.item() * y.size(0)
        preds   = logits.argmax(1)
        correct += (preds == y).sum().item()
        total   += y.size(0)
        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(y.cpu().numpy())
    return total_loss / total, correct / total, all_preds, all_labels


def compute_f1(preds, labels, num_classes):
    preds, labels = np.array(preds), np.array(labels)
    f1s = []
    for c in range(num_classes):
        tp = ((preds == c) & (labels == c)).sum()
        fp = ((preds == c) & (labels != c)).sum()
        fn = ((preds != c) & (labels == c)).sum()
        prec = tp / (tp + fp + 1e-8)
        rec  = tp / (tp + fn + 1e-8)
        f1s.append(2 * prec * rec / (prec + rec + 1e-8))
    return float(np.mean(f1s))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir",   type=str,   default="./data")
    parser.add_argument("--epochs",     type=int,   default=80)
    parser.add_argument("--batch_size", type=int,   default=128)
    parser.add_argument("--lr",         type=float, default=3e-4)
    parser.add_argument("--label_smooth", type=float, default=0.1)
    parser.add_argument("--patience",   type=int,   default=10)
    args = parser.parse_args()

    device  = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info(f"Device: {device}")

    # Dataset
    full_ds = GestureDataset(args.data_dir)
    train_ds, val_ds = split_dataset(full_ds, val_ratio=0.15, seed=42)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,  num_workers=4, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=True)
    log.info(f"Train: {len(train_ds)} | Val: {len(val_ds)}")

    # Model + optimizer
    model     = GestureModel(NUM_CLASSES).to(device)
    if torch.cuda.device_count() > 1:
        model = nn.DataParallel(model)
    optimizer = AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    criterion = nn.CrossEntropyLoss(label_smoothing=args.label_smooth)

    best_f1    = 0.0
    bad_epochs = 0
    history    = []

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        tr_loss, tr_acc = train_epoch(model, train_loader, optimizer, criterion, device)
        va_loss, va_acc, preds, labels = eval_epoch(model, val_loader, criterion, device)
        f1 = compute_f1(preds, labels, NUM_CLASSES)
        scheduler.step()

        row = {"epoch": epoch, "tr_loss": round(tr_loss, 4), "tr_acc": round(tr_acc, 4),
               "va_loss": round(va_loss, 4), "va_acc": round(va_acc, 4), "f1": round(f1, 4)}
        history.append(row)
        elapsed = time.time() - t0
        log.info(f"Ep {epoch:03d} | tr={tr_acc:.3f} | va={va_acc:.3f} | F1={f1:.3f} | {elapsed:.1f}s")

        if f1 > best_f1:
            best_f1 = f1
            bad_epochs = 0
            torch.save(model.state_dict(), WEIGHT_DIR / "best_model.pt")
            log.info(f"  → Saved best model (F1={best_f1:.4f})")
        else:
            bad_epochs += 1
            if bad_epochs >= args.patience:
                log.info("Early stopping triggered")
                break

    log.info(f"Training complete. Best macro F1: {best_f1:.4f}")
    with open(WEIGHT_DIR / "history.json", "w") as f:
        json.dump(history, f, indent=2)

    if best_f1 >= 0.97:
        log.info("✅ >97% macro F1 target achieved!")
    else:
        log.warning(f"⚠️  F1={best_f1:.4f} — target is 0.97. Collect more data or tune hyperparameters.")


if __name__ == "__main__":
    main()
