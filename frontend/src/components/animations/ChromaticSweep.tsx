// ============================================================
// ChromaticSweep — Full-screen color wave on mode transition
// ============================================================
import { useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

export interface ChromaticSweepHandle {
    sweep: (color: string) => void
}

const ChromaticSweep = forwardRef<ChromaticSweepHandle>((_, ref) => {
    const progress = useMotionValue(0)
    const colorRef = useRef('#00ffff')

    const opacity = useTransform(progress, [0, 0.25, 0.7, 1], [0, 0.65, 0.45, 0])
    const scaleX = useTransform(progress, [0, 1], [0, 2.2])

    const sweep = useCallback((color: string) => {
        colorRef.current = color
        progress.set(0)
        animate(progress, 1, { duration: 0.72, ease: [0.22, 1, 0.36, 1] })
    }, [progress])

    useImperativeHandle(ref, () => ({ sweep }), [sweep])

    return (
        <motion.div
            className="fixed inset-0 pointer-events-none z-50 origin-left"
            style={{
                opacity,
                scaleX,
                background: `linear-gradient(90deg, ${colorRef.current}99 0%, ${colorRef.current}33 55%, transparent 100%)`,
            }}
        />
    )
})

ChromaticSweep.displayName = 'ChromaticSweep'
export default ChromaticSweep
