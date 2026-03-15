// ============================================================
// StatusBar — Bottom strip: hand detection, WS, recording
// ============================================================
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../context/ModeTransitionContext'

export default function StatusBar() {
    const handDetected = useAppStore((s) => s.handDetected)
    const wsStatus = useAppStore((s) => s.wsStatus)
    const isRecording = useAppStore((s) => s.isRecording)
    const mode = useAppStore((s) => s.mode)

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-2"
            style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Hand detection */}
            <div className="flex items-center gap-2">
                <motion.span
                    className="w-2 h-2 rounded-full"
                    style={{ background: handDetected ? '#00ff41' : '#ff4444' }}
                    animate={{ opacity: handDetected ? [0.6, 1, 0.6] : 1 }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span className="font-inter text-xs text-white/50">
                    {handDetected ? 'Hand Tracked' : 'No Hand Detected'}
                </span>
            </div>

            {/* Center: mode label */}
            <span className="font-orbitron text-xs text-white/20 tracking-widest uppercase">
                AURACONTROL · {mode.toUpperCase()} MODE
            </span>

            {/* Right: WS status + recording */}
            <div className="flex items-center gap-4">
                {/* Recording indicator (Security mode) */}
                <AnimatePresence>
                    {isRecording && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5"
                        >
                            <motion.span
                                className="w-2 h-2 rounded-full bg-red-500"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity }}
                            />
                            <span className="font-fira text-xs text-red-400 tracking-wider">REC</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* WebSocket status */}
                <div className="flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{
                            background:
                                wsStatus === 'connected' ? '#00ffff' :
                                    wsStatus === 'connecting' ? '#ffaa00' : '#ff4444',
                            boxShadow: wsStatus === 'connected' ? '0 0 6px #00ffff' : undefined,
                        }}
                    />
                    <span className="font-inter text-xs text-white/40 capitalize">{wsStatus}</span>
                </div>
            </div>
        </motion.div>
    )
}
