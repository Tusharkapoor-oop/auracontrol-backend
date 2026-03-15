// ============================================================
// LoadingScreen — Futuristic startup splash
// ============================================================
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingScreenProps {
    onComplete: () => void
}

const STEPS = [
    'INITIALIZING VISION ENGINE…',
    'LOADING MEDIAPIPE TASKS…',
    'CALIBRATING LANDMARKS…',
    'TRAINING GESTURE RECOGNIZER…',
    'CONNECTING NEURAL INTERFACE…',
    'SYSTEM READY',
]

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0)
    const [stepIdx, setStepIdx] = useState(0)
    const [done, setDone] = useState(false)

    useEffect(() => {
        let p = 0
        const id = setInterval(() => {
            p += Math.random() * 8 + 2
            if (p >= 100) { p = 100; clearInterval(id); setDone(true); setTimeout(onComplete, 800) }
            setProgress(Math.min(p, 100))
            setStepIdx(Math.floor((p / 100) * (STEPS.length - 1)))
        }, 180)
        return () => clearInterval(id)
    }, [onComplete])

    return (
        <AnimatePresence>
            {!done ? (
                <motion.div
                    className="fixed inset-0 z-[999] flex flex-col items-center justify-center select-none"
                    style={{ background: 'radial-gradient(circle at top, #020024 0%, #090979 40%, #000000 100%)' }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.6 }}
                >
                    {/* Outer rotating ring */}
                    <motion.div
                        className="absolute w-72 h-72 rounded-full"
                        style={{
                            border: '2px solid transparent',
                            background: 'linear-gradient(#000,#000) padding-box, conic-gradient(from 0deg, #00ffff, #ff00ff, #00ffff) border-box',
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Inner counter-rotating ring */}
                    <motion.div
                        className="absolute w-56 h-56 rounded-full"
                        style={{
                            border: '1px solid transparent',
                            background: 'linear-gradient(#000,#000) padding-box, conic-gradient(from 180deg, #7b00ff, #00ffff, #7b00ff) border-box',
                        }}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />

                    {/* Logo */}
                    <motion.div className="z-10 text-center">
                        <motion.h1
                            className="font-orbitron text-4xl font-black tracking-widest uppercase"
                            style={{ color: '#00ffff', textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff88' }}
                            animate={{ opacity: [0.7, 1, 0.7] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            AURACONTROL
                        </motion.h1>
                        <p className="font-inter text-xs tracking-[0.4em] text-cyan-300 mt-1 uppercase">
                            Universal Contactless Interface
                        </p>
                    </motion.div>

                    {/* Progress section */}
                    <div className="absolute bottom-24 w-80 px-4">
                        <p className="font-fira text-xs text-cyan-400 mb-2 text-center tracking-wider animate-pulse">
                            {STEPS[stepIdx]}
                        </p>
                        {/* Progress bar */}
                        <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, #00ffff, #7b00ff)',
                                    boxShadow: '0 0 8px #00ffff',
                                }}
                                transition={{ ease: 'easeOut' }}
                            />
                        </div>
                        <p className="font-fira text-xs text-white/30 mt-2 text-right">
                            {Math.round(progress)}%
                        </p>
                    </div>

                    {/* Corner scan lines */}
                    <motion.div
                        className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40"
                        animate={{ y: ['0%', '100vh'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                </motion.div>
            ) : null}
        </AnimatePresence>
    )
}
