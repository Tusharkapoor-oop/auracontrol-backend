// ============================================================
// useModeTransition — Orchestrate chromatic sweep + flash
// ============================================================
import { useRef, useCallback } from 'react'
import { useAppStore } from '../context/ModeTransitionContext'
import type { GestureMode } from '../types'
import { MODE_COLORS } from '../utils/colors'

export function useModeTransition() {
    const setMode = useAppStore((s) => s.setMode)
    const mode = useAppStore((s) => s.mode)
    const sweepRef = useRef<((color: string) => void) | null>(null)

    /** Register the chromatic sweep trigger from ChromaticSweep component */
    const registerSweep = useCallback((fn: (color: string) => void) => {
        sweepRef.current = fn
    }, [])

    const transition = useCallback((newMode: GestureMode) => {
        if (newMode === mode) return
        const color = MODE_COLORS[newMode].primary
        sweepRef.current?.(color)
        // Small delay so sweep animation starts before state changes
        setTimeout(() => setMode(newMode), 80)
    }, [mode, setMode])

    return { mode, transition, registerSweep }
}
