"""Context Switcher — gesture + mode → OS action mapping"""
from __future__ import annotations
import time
from typing import Optional, Dict, Any

# Action keys
ACTION_NEXT_SLIDE   = "next_slide"
ACTION_PREV_SLIDE   = "prev_slide"
ACTION_VOLUME_UP    = "volume_up"
ACTION_VOLUME_DOWN  = "volume_down"
ACTION_SCROLL_UP    = "scroll_up"
ACTION_SCROLL_DOWN  = "scroll_down"
ACTION_ZOOM_IN      = "zoom_in"
ACTION_ZOOM_OUT     = "zoom_out"
ACTION_MOUSE_CLICK  = "mouse_click"
ACTION_PLAY_PAUSE   = "play_pause"

# Gesture → mode → action mapping
ACTION_MAP: Dict[str, Dict[str, str]] = {
    "swipe_right": {
        "efficiency": ACTION_NEXT_SLIDE,
        "creative":   ACTION_NEXT_SLIDE,
        "utility":    ACTION_SCROLL_DOWN,
        "security":   "",
    },
    "swipe_left": {
        "efficiency": ACTION_PREV_SLIDE,
        "creative":   ACTION_PREV_SLIDE,
        "utility":    ACTION_SCROLL_UP,
        "security":   "",
    },
    "swipe_up": {
        "efficiency": ACTION_VOLUME_UP,
        "creative":   ACTION_VOLUME_UP,
        "utility":    ACTION_SCROLL_UP,
        "security":   "",
    },
    "swipe_down": {
        "efficiency": ACTION_VOLUME_DOWN,
        "creative":   ACTION_VOLUME_DOWN,
        "utility":    ACTION_SCROLL_DOWN,
        "security":   "",
    },
    "pinch": {
        "efficiency": ACTION_ZOOM_IN,
        "creative":   ACTION_MOUSE_CLICK,
        "utility":    ACTION_ZOOM_IN,
        "security":   "",
    },
    "thumb_up": {
        "efficiency": ACTION_VOLUME_UP,
        "creative":   ACTION_VOLUME_UP,
        "utility":    ACTION_VOLUME_UP,
        "security":   "",
    },
    "thumb_down": {
        "efficiency": ACTION_VOLUME_DOWN,
        "creative":   ACTION_VOLUME_DOWN,
        "utility":    ACTION_VOLUME_DOWN,
        "security":   "",
    },
    "peace": {
        "efficiency": ACTION_PLAY_PAUSE,
        "creative":   ACTION_PLAY_PAUSE,
        "utility":    ACTION_PLAY_PAUSE,
        "security":   "",
    },
}

DEBOUNCE_S = 0.45  # min seconds between same action


class ContextSwitcher:
    def __init__(self):
        self._last_action: Optional[str] = None
        self._last_time: float = 0.0

    def resolve(self, prediction: Dict[str, Any], mode: str) -> Optional[str]:
        if not prediction:
            return None
        gesture = prediction.get("gesture", "none")
        if gesture not in ACTION_MAP:
            return None
        action = ACTION_MAP[gesture].get(mode, "")
        if not action:
            return None
        now = time.time()
        if action == self._last_action and now - self._last_time < DEBOUNCE_S:
            return None  # debounced
        self._last_action = action
        self._last_time   = now
        return action
