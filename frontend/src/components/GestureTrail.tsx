// ============================================================
// GestureTrail — SVG finger trail with physics-based fling
// Glowing inertia trail with exponential opacity fade
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import type { HandLandmarks, Velocity } from '../types'
import { LANDMARK_INDICES } from '../utils/landmarks'
import { useAppStore } from '../context/ModeTransitionContext'
import { MODE_COLORS } from '../utils/colors'

interface TrailPoint { x: number; y: number; id: string }

interface GestureTrailProps {
    landmarks: HandLandmarks | null
    velocity: Velocity
}

const MAX_TRAIL = 28
const FADE_DURATION = 1200 // ms

export default function GestureTrail({ landmarks, velocity }: GestureTrailProps) {
    const mode = useAppStore((s) => s.mode)
    const color = MODE_COLORS[mode].primary
    const trail = useRef<(TrailPoint & { t: number })[]>([])
    const [pts, setPts] = useState<TrailPoint[]>([])

    // Phantom tip for inertia fling
    const tipX = useMotionValue(-100)
    const tipY = useMotionValue(-100)

    // ---- Update trail from real landmarks ----
    const updateTrail = useCallback((lm: HandLandmarks) => {
        const tip = lm[LANDMARK_INDICES.INDEX_TIP]
        // Convert from normalized (0-1) mirrored to screen pixels
        const x = (1 - tip.x) * window.innerWidth
        const y = tip.y * window.innerHeight
        tipX.set(x); tipY.set(y)

        const now = performance.now()
        trail.current.push({ x, y, t: now, id: `${now}${Math.random()}` })
        // Expire old points
        trail.current = trail.current.filter((p) => now - p.t < FADE_DURATION)
        if (trail.current.length > MAX_TRAIL) trail.current.shift()
        setPts(trail.current.map(({ x, y, id }) => ({ x, y, id })))
    }, [tipX, tipY])

    useEffect(() => {
        if (landmarks) updateTrail(landmarks)
    }, [landmarks, updateTrail])

    // ---- Fling animation on throw gesture ----
    const lastGesture = useAppStore((s) => s.lastGesture)
    useEffect(() => {
        if (lastGesture?.gesture === 'throw') {
            const vx = velocity.x * 8000, vy = velocity.y * 8000
            animate(tipX, tipX.get() + vx, {
                type: 'inertia', velocity: vx, power: 0.8, timeConstant: 280,
            })
            animate(tipY, tipY.get() + vy, {
                type: 'inertia', velocity: vy, power: 0.8, timeConstant: 280,
            })
        }
    }, [lastGesture, velocity, tipX, tipY])

    if (!landmarks && pts.length === 0) return null

    const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')

    return (
        <svg className="fixed inset-0 w-full h-full pointer-events-none z-30" style={{ overflow: 'visible' }}>
            <defs>
                <filter id="glow-trail">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Ghost trail polyline — fades at tail, bright at tip */}
            {pts.length > 1 && (
                <polyline
                    points={polyline}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow-trail)"
                    opacity={0.7}
                    style={{
                        strokeDasharray: `${pts.length * 8} ${pts.length * 8}`,
                        strokeDashoffset: 0,
                    }}
                />
            )}

            {/* Per-segment dots with decreasing opacity */}
            {pts.map((p, i) => (
                <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r={i === pts.length - 1 ? 5 : 2}
                    fill={color}
                    opacity={0.15 + 0.85 * (i / pts.length)}
                    filter={i === pts.length - 1 ? 'url(#glow-trail)' : undefined}
                />
            ))}

            {/* Inertia-flung phantom tip */}
            <motion.circle
                cx={tipX}
                cy={tipY}
                r={6}
                fill={color}
                filter="url(#glow-trail)"
                opacity={0.9}
            />
        </svg>
    )
}
