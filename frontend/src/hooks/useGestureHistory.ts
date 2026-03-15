// ============================================================
// useGestureHistory — Circular buffer of last N frames
// Used to feed the LSTM backend with temporal gesture sequences
// ============================================================
import { useRef, useCallback } from 'react'
import type { HandLandmarks } from '../types'
import { normalizeLandmarks, flattenLandmarks } from '../utils/landmarks'

const BUFFER_SIZE = 32 // 32 frames @ 30fps ≈ 1 second of history

interface FrameRecord {
    landmarks: number[]  // flattened normalized — 21*3=63 values
    timestamp: number
    velocityX: number
    velocityY: number
    velocityZ: number
}

export function useGestureHistory() {
    const buffer = useRef<FrameRecord[]>([])

    // Push a new frame to circular buffer
    const push = useCallback((lm: HandLandmarks, vel: { x: number; y: number; z: number }) => {
        const normalized = normalizeLandmarks(lm)
        const flat = flattenLandmarks(normalized)
        buffer.current.push({
            landmarks: flat,
            timestamp: performance.now(),
            velocityX: vel.x,
            velocityY: vel.y,
            velocityZ: vel.z,
        })
        if (buffer.current.length > BUFFER_SIZE) buffer.current.shift()
    }, [])

    // Get the current buffer as a 2D array ready for the model:
    // shape (T, 63+3) = (T, 66)
    const getSequence = useCallback((): number[][] => {
        return buffer.current.map((f) => [
            ...f.landmarks,
            f.velocityX,
            f.velocityY,
            f.velocityZ,
        ])
    }, [])

    const clear = useCallback(() => { buffer.current = [] }, [])

    return { push, getSequence, clear, length: () => buffer.current.length }
}
