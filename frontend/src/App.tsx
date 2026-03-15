// ============================================================
// App.tsx — Root component, wires everything together
// ============================================================
import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'

import { ModeTransitionProvider, useAppStore } from './context/ModeTransitionContext'
import { useModeTransition } from './hooks/useModeTransition'
import { useWebSocket } from './hooks/useWebSocket'
import { useGestureHistory } from './hooks/useGestureHistory'

import LoadingScreen from './components/LoadingScreen'
import LiveFeed, { type LiveFeedHandle } from './components/LiveFeed'
import HUD from './components/HUD'
import ModeSelector from './components/ModeSelector'
import GestureTrail from './components/GestureTrail'
import ThreeCanvas from './components/ThreeCanvas'
import StatusBar from './components/StatusBar'
import Dashboard from './components/Dashboard'
import NotificationToast, { showToast } from './components/NotificationToast'
import ChromaticSweep from './components/animations/ChromaticSweep'

import type { GesturePrediction, HandLandmarks, WSMessage } from './types'

// ---- Lazy MediaPipe hook (must only run after boot + video ready) ----
import { useMediaPipe } from './hooks/useMediaPipe'

// ---- Inner app (uses store & hooks) ----
function AuraApp() {
    const liveFeedRef = useRef<LiveFeedHandle>(null)
    const sweepRef = useRef<import('./components/animations/ChromaticSweep').ChromaticSweepHandle>(null)
    const [booted, setBooted] = useState(false)

    const mode = useAppStore((s) => s.mode)
    const dashOpen = useAppStore((s) => s.dashboardOpen)
    const setWsStatus = useAppStore((s) => s.setWSStatus)
    const setHandDetected = useAppStore((s) => s.setHandDetected)
    const setFps = useAppStore((s) => s.setFps)
    const setGesture = useAppStore((s) => s.setLastGesture)
    const setLandmarks = useAppStore((s) => s.setLandmarks)
    const setVelocity = useAppStore((s) => s.setVelocity)
    const landmarks = useAppStore((s) => s.landmarks)
    const velocity = useAppStore((s) => s.velocity)

    const { registerSweep } = useModeTransition()
    const history = useGestureHistory()

    // Register chromatic sweep trigger
    useEffect(() => {
        if (sweepRef.current) registerSweep(sweepRef.current.sweep)
    }, [registerSweep])

    // ---- Gesture handler ----
    const handleGesture = useCallback((g: GesturePrediction) => {
        setGesture(g)
        setVelocity(g.velocity)
        if (g.landmarks) history.push(g.landmarks, g.velocity)

        // Toast for key dynamic gestures
        const NOTIFY: Partial<Record<string, string>> = {
            swipe_left: '⬅  Swipe Left',
            swipe_right: '➡  Swipe Right',
            swipe_up: '⬆  Swipe Up',
            swipe_down: '⬇  Swipe Down',
            pinch: '🤏 Pinch',
            throw: '🏀 Throw!',
            zoom_in: '🔍 Zoom In',
        }
        if (g.confidence > 0.87 && NOTIFY[g.gesture]) {
            showToast('info', NOTIFY[g.gesture]!)
        }
    }, [setGesture, setVelocity, history])

    // ---- Landmark handler ----
    const handleLandmarks = useCallback((lm: HandLandmarks) => {
        setLandmarks(lm)
    }, [setLandmarks])

    // ---- WebSocket message handler (when backend is running) ----
    const handleWsMessage = useCallback((msg: WSMessage) => {
        switch (msg.type) {
            case 'gesture': setGesture(msg.payload); setVelocity(msg.payload.velocity); break
            case 'landmarks': setLandmarks(msg.payload.landmarks); break
            case 'fps': setFps(msg.payload.fps, msg.payload.latency_ms); break
            case 'status': setHandDetected(msg.payload.hand_detected); break
        }
    }, [setGesture, setVelocity, setLandmarks, setFps, setHandDetected])

    // ---- A stable ref the useMediaPipe hook reads from ----
    // We construct a RefObject that dynamically resolves to the video element.
    const videoProxyRef = useRef<HTMLVideoElement>(null)
    useEffect(() => {
        const sync = () => {
            const vid = liveFeedRef.current?.getVideo() ?? null
                ; (videoProxyRef as React.MutableRefObject<HTMLVideoElement | null>).current = vid
        }
        sync()
        // Re-sync whenever booted changes so the video element is available
        const id = setInterval(sync, 200)
        return () => clearInterval(id)
    }, [booted])

    // ---- MediaPipe hook (browser-side real-time tracking) ----
    useMediaPipe({
        videoRef: videoProxyRef as React.RefObject<HTMLVideoElement>,
        onGesture: handleGesture,
        onLandmarks: handleLandmarks,
        onFps: (fps, lat) => setFps(fps, lat),
        onHandDetected: setHandDetected,
        mode,
    })

    // ---- WebSocket (optional — enhances with server-side LSTM inference) ----
    useWebSocket({
        onMessage: handleWsMessage,
        onStatusChange: setWsStatus,
        enabled: booted,
    })

    return (
        <div className="fixed inset-0 overflow-hidden" style={{ background: '#000' }}>
            {/* ---- Loading splash ---- */}
            <AnimatePresence>
                {!booted && <LoadingScreen onComplete={() => setBooted(true)} />}
            </AnimatePresence>

            {booted && (
                <>
                    {/* Camera feed + 2D canvas overlay */}
                    <LiveFeed ref={liveFeedRef} dimmed={dashOpen} />

                    {/* R3F 3D hand skeleton */}
                    <ThreeCanvas landmarks={landmarks} />

                    {/* Glowing SVG gesture trail with inertia */}
                    <GestureTrail landmarks={landmarks} velocity={velocity} />

                    {/* Full-screen chromatic sweep on mode change */}
                    <ChromaticSweep ref={sweepRef} />

                    {/* HUD — top-left floating panel */}
                    <HUD />

                    {/* Mode selector — right edge */}
                    <ModeSelector />

                    {/* Status bar — bottom strip */}
                    <StatusBar />

                    {/* Slide-up Dashboard */}
                    <Dashboard />

                    {/* Toast notifications */}
                    <NotificationToast />
                </>
            )}
        </div>
    )
}

// ---- Root with Zustand provider ----
export default function App() {
    return (
        <ModeTransitionProvider>
            <AuraApp />
        </ModeTransitionProvider>
    )
}
