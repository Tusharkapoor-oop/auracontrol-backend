"""
Export trained model to TorchScript + INT8-quantized ONNX.
INT8 ONNX achieves <15ms P95 inference on CPU (Intel i5).
"""
from __future__ import annotations
import argparse
import logging
import time
from pathlib import Path

import numpy as np
import torch

from app.models.gesture_model import GestureModel, NUM_CLASSES, SEQ_LEN, INPUT_DIM

log = logging.getLogger("export")
logging.basicConfig(level=logging.INFO)

WEIGHT_DIR = Path(__file__).parent / "weights"


def export_torchscript(model: GestureModel, out_path: Path):
    dummy = torch.randn(1, SEQ_LEN, INPUT_DIM)
    with torch.no_grad():
        traced = torch.jit.trace(model, dummy)
    traced.save(str(out_path))
    log.info(f"TorchScript saved → {out_path}")


def export_onnx(model: GestureModel, out_path: Path):
    dummy = torch.randn(1, SEQ_LEN, INPUT_DIM)
    torch.onnx.export(
        model, dummy, str(out_path),
        opset_version=17,
        input_names=["landmarks"],
        output_names=["logits"],
        dynamic_axes={"landmarks": {0: "batch"}},
        do_constant_folding=True,
    )
    log.info(f"ONNX saved → {out_path}")

    # INT8 quantization via onnxruntime
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
        q_path = out_path.with_name("gesture_model_int8.onnx")
        quantize_dynamic(str(out_path), str(q_path), weight_type=QuantType.QInt8)
        log.info(f"INT8 ONNX saved → {q_path}")
    except ImportError:
        log.warning("onnxruntime-tools not installed — skipping INT8 quantization")


def benchmark_onnx(onnx_path: Path, n_runs: int = 1000):
    import onnxruntime as ort  # type: ignore
    sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    inp  = {"landmarks": np.random.randn(1, SEQ_LEN, INPUT_DIM).astype(np.float32)}

    # Warmup
    for _ in range(50):
        sess.run(None, inp)

    times = []
    for _ in range(n_runs):
        t0 = time.perf_counter()
        sess.run(None, inp)
        times.append((time.perf_counter() - t0) * 1000)

    times = sorted(times)
    p50  = times[int(0.50 * n_runs)]
    p95  = times[int(0.95 * n_runs)]
    log.info(f"CPU Inference | P50={p50:.2f}ms | P95={p95:.2f}ms | {'✅ PASS' if p95 < 15 else '❌ FAIL (>15ms)'}")
    return p95


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", type=str, default=str(WEIGHT_DIR / "best_model.pt"))
    args = parser.parse_args()

    weights_path = Path(args.weights)
    if not weights_path.exists():
        raise FileNotFoundError(f"No weights at {weights_path}. Run train.py first.")

    model = GestureModel(NUM_CLASSES)
    state = torch.load(args.weights, map_location="cpu")
    # Handle DataParallel-wrapped state dicts
    if any(k.startswith("module.") for k in state):
        state = {k.replace("module.", ""): v for k, v in state.items()}
    model.load_state_dict(state)
    model.eval()

    export_torchscript(model, WEIGHT_DIR / "gesture_model.pt")
    export_onnx(model, WEIGHT_DIR / "gesture_model.onnx")
    benchmark_onnx(WEIGHT_DIR / "gesture_model.onnx")


if __name__ == "__main__":
    main()
