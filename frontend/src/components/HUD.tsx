// ============================================================
// HUD — Top-left floating panel: mode badge, FPS, last gesture
// ============================================================
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../context/ModeTransitionContext'
import { MODE_COLORS } from '../utils/colors'

const GESTURE_LABELS: Record<string, string> = {
    open_palm: '🖐 Open Palm', fist: '✊ Fist', pointing: '☝ Pointing',
    peace: '✌ Peace', thumb_up: '👍 Thumb Up', thumb_down: '👎 Thumb Down',
    ok: '👌 OK', rock: '🤘 Rock', pinch: '🤏 Pinch', grab: '🤜 Grab',
    swipe_left: '⬅ Swipe Left', swipe_right: '➡ Swipe Right',
    swipe_up: '⬆ Swipe Up', swipe_down: '⬇ Swipe Down',
    circle_cw: '🔄 Circle', circle_ccw: '↩ Circle CCW',
    zoom_in: '🔍 Zoom In', zoom_out: '🔎 Out', throw: '🏀 Throw',
    air_write: '✍ Air Write', none: '',
}

export default function HUD() {
    const mode = useAppStore((s) => s.mode)
    const fps = useAppStore((s) => s.fps)
    const latency = useAppStore((s) => s.latency)
    const lastGesture = useAppStore((s) => s.lastGesture)
    const colors = MODE_COLORS[mode]

    return (
        <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed top-4 left-4 z-40 min-w-48 select-none"
        >
            <div
                className="rounded-xl px-4 py-3 space-y-2"
                style={{
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(14px)',
                    border: `1px solid ${colors.border}`,
                    boxShadow: `0 0 18px ${colors.glow}40`,
                }}
            >
                {/* Mode badge */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ rotateX: -90, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        exit={{ rotateX: 90, opacity: 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="flex items-center gap-2"
                    >
                        <span className="text-sm">{colors.emoji}</span>
                        <span
                            className="font-orbitron text-xs font-bold tracking-widest px-2 py-0.5 rounded-full"
                            style={{
                                color: colors.primary,
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                                textShadow: `0 0 8px ${colors.primary}`,
                            }}
                        >
                            {colors.label}
                        </span>
                    </motion.div>
                </AnimatePresence>

                {/* FPS / Latency */}
                <div className="flex items-center gap-3 font-fira text-xs">
                    <span
                        style={{ color: fps > 0 && fps < 25 ? '#ffaa00' : '#00ffff' }}
                        className="tabular-nums"
                    >
                        {fps > 0 ? `${fps} FPS` : '-- FPS'}
                    </span>
                    <span className="text-white/30">|</span>
                    <span className="text-white/50 tabular-nums">
                        {latency > 0 ? `${latency}ms` : '--ms'}
                    </span>
                </div>

                {/* Last gesture */}
                <AnimatePresence>
                    {lastGesture && lastGesture.gesture !== 'none' && (
                        <motion.div
                            key={`${lastGesture.gesture}-${lastGesture.timestamp}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                        >
                            <span className="font-inter text-xs text-white/80">
                                {GESTURE_LABELS[lastGesture.gesture] ?? lastGesture.gesture}
                            </span>
                            {/* Confidence bar */}
                            <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.round(lastGesture.confidence * 100)}%`,
                                        background: lastGesture.confidence > 0.9 ? '#00ffff' : '#ffaa00',
                                    }}
                                />
                            </div>
                            <span className="font-fira text-xs text-white/40">
                                {Math.round(lastGesture.confidence * 100)}%
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
