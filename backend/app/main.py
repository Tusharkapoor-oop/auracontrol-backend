"""
AuraControl AI — FastAPI Backend
WebSocket endpoint for real-time gesture streaming.
"""
from __future__ import annotations
import asyncio
import json
import logging
import time
from typing import Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.gesture_engine import GestureEngine
from app.kalman_filter  import KalmanSmoother
from app.context_switcher import ContextSwitcher
from app.os_controller  import OSController

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("auracontrol")

app = FastAPI(title="AuraControl AI Backend", version="2.0.0")

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Singletons (loaded at startup) ----
gesture_engine:  Optional[GestureEngine]  = None
context_switcher: ContextSwitcher         = ContextSwitcher()
os_controller:   OSController            = OSController()


@app.on_event("startup")
async def startup():
    global gesture_engine
    try:
        gesture_engine = GestureEngine()
        log.info("✅ Gesture engine loaded")
    except Exception as e:
        log.warning(f"⚠️  Gesture engine not loaded (model missing?): {e}")


@app.get("/health")
async def health():
    return {"status": "ok", "engine": gesture_engine is not None}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    log.info("🔌 Client connected")
    smoother = KalmanSmoother()
    frame_count = 0
    fps_timer   = time.time()

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
                continue

            if msg.get("type") == "landmarks":
                landmarks_raw = msg["landmarks"]  # list of {x,y,z}
                t = msg.get("timestamp", time.time() * 1000)

                # Smooth landmarks with Kalman filter
                smoothed = smoother.update(landmarks_raw)

                # Run gesture inference
                pred = None
                if gesture_engine:
                    pred = await asyncio.get_event_loop().run_in_executor(
                        None, gesture_engine.predict, smoothed
                    )

                # Context switching
                mode   = msg.get("mode", "efficiency")
                action = context_switcher.resolve(pred, mode) if pred else None

                # OS action
                if action:
                    await asyncio.get_event_loop().run_in_executor(
                        None, os_controller.execute, action
                    )

                # Reply
                response = {
                    "type": "gesture",
                    "payload": {
                        "gesture":    pred["gesture"]    if pred else "none",
                        "confidence": pred["confidence"] if pred else 0.0,
                        "mode": mode,
                        "velocity": pred.get("velocity", {"x":0,"y":0,"z":0,"magnitude":0}) if pred else {},
                        "timestamp": t,
                    }
                }
                await ws.send_text(json.dumps(response))

                # FPS reporting
                frame_count += 1
                now = time.time()
                if now - fps_timer >= 1.0:
                    await ws.send_text(json.dumps({
                        "type": "fps",
                        "payload": {"fps": frame_count, "latency_ms": 0}
                    }))
                    frame_count = 0
                    fps_timer   = now

    except WebSocketDisconnect:
        log.info("🔌 Client disconnected")
    except Exception as e:
        log.error(f"WS error: {e}")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
