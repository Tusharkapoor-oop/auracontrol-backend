"""
Latency benchmark — asserts P95 CPU inference < 15ms.
Also benchmarks heuristic fallback for comparison.
Usage: python -m tests.test_latency [--weights path]
"""
import sys
import time
import argparse
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

N_WARMUP = 100
N_RUNS   = 1000
TARGET_P95_MS = 15.0


def bench_onnx(onnx_path: str):
    import onnxruntime as ort
    sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    inp  = {"landmarks": np.random.randn(1, 32, 66).astype(np.float32)}

    for _ in range(N_WARMUP):
        sess.run(None, inp)

    times = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        sess.run(None, inp)
        times.append((time.perf_counter() - t0) * 1000)

    return sorted(times)


def bench_heuristic():
    from app.gesture_engine import GestureEngine
    dummy_lm = [{"x": np.random.rand(), "y": np.random.rand(), "z": np.random.rand()} for _ in range(21)]
    eng = GestureEngine()  # no model path = heuristic mode

    times = []
    for _ in range(N_RUNS):
        t0 = time.perf_counter()
        eng.predict(dummy_lm)
        times.append((time.perf_counter() - t0) * 1000)
    return sorted(times)


def report(name: str, times: list):
    p50 = times[int(0.50 * N_RUNS)]
    p95 = times[int(0.95 * N_RUNS)]
    p99 = times[int(0.99 * N_RUNS)]
    passed = p95 < TARGET_P95_MS
    print(f"\n{name}")
    print(f"  P50={p50:.2f}ms  P95={p95:.2f}ms  P99={p99:.2f}ms")
    print(f"  {'✅ PASS' if passed else '❌ FAIL'} (target P95 < {TARGET_P95_MS}ms)")
    return passed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--onnx", type=str, default="./app/models/weights/gesture_model.onnx")
    args = parser.parse_args()

    all_passed = True

    onnx_path = Path(args.onnx)
    if onnx_path.exists():
        times = bench_onnx(str(onnx_path))
        all_passed &= report("ONNX Model (CPU)", times)
    else:
        print(f"\nSkipping ONNX benchmark — model not found at {onnx_path}")

    times = bench_heuristic()
    report("Heuristic Fallback", times)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
