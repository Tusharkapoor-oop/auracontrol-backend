# AuraControl AI

**Contactless gesture control for your computer — camera in, OS actions out.**

> Repository status: this repo contains the **backend + reference frontend** for AuraControl.
> A second, newer frontend lives at [`Advance_hand_gesture`](https://github.com/Tusharkapoor-oop/Advance_hand_gesture).
> *(Repo currently named `idk` — rename to `auracontrol-backend` planned; GitHub redirects will keep links working.)*

---

## What it does

```
webcam → MediaPipe (21 landmarks) → Kalman smoothing → gesture classifier
        → context engine (mode) → OS action dispatcher → keyboard/mouse
        └─ WebSocket telemetry ─────────────────────────────→ React UI
```

Two inference modes:

| Mode | How it works | When |
|---|---|---|
| **Heuristic (default)** | Geometric rules over landmark positions — no weights, no model download | Ships working out of the box |
| **Trained model** | `app/models/gesture_model.py` → exported to ONNX, INT8 for CPU inference | After you collect data and train |

> **Honest accuracy note:** the ">97% macro-F1" figure is the *target enforced by the benchmark script*
> (`tests/test_accuracy.py` exits non-zero below 0.97). Model weights are **not** committed —
> train your own with the steps below, then run the benchmark to see your number.

---

## Repository layout

```
backend/
  app/
    main.py               # FastAPI app — WebSocket /ws, health endpoint
    gesture_engine.py     # classifier (heuristic or ONNX)
    kalman_filter.py      # landmark smoothing
    context_switcher.py   # mode → action resolution
    os_controller.py      # pyautogui / pynput execution
    models/
      gesture_model.py    # torch model definition
      dataset.py          # (32, 66) landmark-sequence dataset
      train.py            # training entry point
      weights/            # empty — weights are yours to produce
    tests/
      test_accuracy.py    # benchmark: macro-F1 ≥ 0.97 gate (needs weights + data)
      test_latency.py     # benchmark: P95 < 15 ms on CPU (needs ONNX export)
  Dockerfile · docker-compose.yml · requirements.txt · .env.example
frontend/                 # reference React UI (Vite + three.js + zustand)
```

---

## Quick start

### Backend

```bash
cd backend
pip install -r requirements.txt

# heuristic mode (no weights required)
uvicorn app.main:app --reload --port 8000

# health check
curl http://localhost:8000/health        # {"status":"ok","engine":false}
```

Docker:

```bash
docker-compose up --build -d
```

### Frontend (this repo)

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Point the frontend at the backend with an env var:

```bash
# .env.local — default backend route is /ws
echo "VITE_WS_URL=ws://localhost:8000/ws" > .env.local
```

---

## Training the model (optional, for >97% mode)

```bash
cd backend

# 1. record ~15k samples per class as 32-frame / 66-feature .npy sequences
mkdir -p data/open_palm data/fist data/swipe_left    # etc.

# 2. train
python -m app.models.train --data_dir ./data --epochs 80 --batch_size 128

# 3. export to ONNX (INT8 target for <15 ms CPU)
python -m app.models.export --weights ./app/models/weights/best_model.pt

# 4. benchmark — both scripts exit non-zero on failure
python -m tests.test_accuracy --data_dir ./data
python -m tests.test_latency
```

---

## API surface

| Endpoint | Type | Purpose |
|---|---|---|
| `GET /health` | HTTP | Liveness + whether a model engine loaded |
| `WS /ws` | WebSocket | Receives `{type:"landmarks", landmarks:[{x,y,z}×21], mode, timestamp}`; replies `{type:"gesture", payload:{gesture, confidence, …}}` and `{type:"fps", payload:{fps}}` |
| `WS /ws` + `{type:"ping"}` | WebSocket | Keepalive → `{type:"pong"}` |

---

## Security notes (read before exposing anything)

- The backend executes **OS-level input actions** (keyboard/mouse). Run it on `localhost`, behind your own network.
- CORS is wide open in this development build — **do not deploy it to a public host** without restricting `allow_origins`.
- A production build should add an auth token on the WebSocket handshake. Tracked in Limitations.

---

## Known limitations

- Heuristic mode trades accuracy for zero-latency startup; it is not a substitute for the trained model on subtle gestures.
- Benchmarks require artifacts that are intentionally not committed (dataset, weights).
- Single-user by design: one WebSocket client at a time.
- OS action dispatch supports a fixed gesture vocabulary (see `context_switcher.py`), not arbitrary commands.

---

## License

No license file yet — MIT intended (to be added by the repository owner).
