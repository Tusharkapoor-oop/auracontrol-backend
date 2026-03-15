"""
OS Controller — PyAutoGUI + pynput for cross-platform system control.
Executes OS actions from context switcher without blocking.
"""
from __future__ import annotations
import platform
import logging

log = logging.getLogger("os_controller")

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0.0
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False
    log.warning("pyautogui not installed — OS control disabled")

try:
    from pynput.keyboard import Key, Controller as KBController
    _kb = KBController()
    HAS_PYNPUT = True
except ImportError:
    HAS_PYNPUT = False


class OSController:
    """Thread-safe OS action executor."""

    def execute(self, action: str) -> None:
        try:
            self._dispatch(action)
        except Exception as e:
            log.error(f"OS action error [{action}]: {e}")

    def _dispatch(self, action: str) -> None:
        match action:
            case "next_slide":
                self._key("right")
            case "prev_slide":
                self._key("left")
            case "volume_up":
                self._media_key("volumeup")
            case "volume_down":
                self._media_key("volumedown")
            case "scroll_up":
                if HAS_PYAUTOGUI: pyautogui.scroll(5)
            case "scroll_down":
                if HAS_PYAUTOGUI: pyautogui.scroll(-5)
            case "zoom_in":
                if HAS_PYNPUT:
                    from pynput.keyboard import Key as K, Controller as C
                    _k = C()
                    with _k.pressed(K.ctrl): _k.press('+'); _k.release('+')
            case "zoom_out":
                if HAS_PYNPUT:
                    from pynput.keyboard import Key as K, Controller as C
                    _k = C()
                    with _k.pressed(K.ctrl): _k.press('-'); _k.release('-')
            case "mouse_click":
                if HAS_PYAUTOGUI: pyautogui.click()
            case "play_pause":
                self._media_key("playpause")

    def _key(self, key: str) -> None:
        if HAS_PYAUTOGUI:
            pyautogui.press(key)

    def _media_key(self, key: str) -> None:
        os_name = platform.system()
        if os_name == "Windows":
            import ctypes
            VK_MAP = {"volumeup": 0xAF, "volumedown": 0xAE, "playpause": 0xB3}
            vk = VK_MAP.get(key)
            if vk:
                ctypes.windll.user32.keybd_event(vk, 0, 0, 0)
                ctypes.windll.user32.keybd_event(vk, 0, 2, 0)
        elif HAS_PYAUTOGUI:
            pyautogui.press(key)
