// ============================================================
// MediaPipe hand landmark topology helpers
// ============================================================
import type { Landmark, HandLandmarks } from '../types'

/** MediaPipe 21-landmark indices (standard hand topology) */
export const LANDMARK_INDICES = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const

/** Bone connections for 3D skeleton rendering */
export const HAND_CONNECTIONS: [number, number][] = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [5, 9], [9, 13], [13, 17],
]

/** Euclidean 3D distance between two landmarks */
export function dist3D(a: Landmark, b: Landmark): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

/** Euclidean 2D distance (x,y plane) between two landmarks */
export function dist2D(a: Landmark, b: Landmark): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/** Angle (degrees) at vertex B formed by A-B-C */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
    const v1 = { x: a.x - b.x, y: a.y - b.y }
    const v2 = { x: c.x - b.x, y: c.y - b.y }
    const dot = v1.x * v2.x + v1.y * v2.y
    const mag = Math.sqrt(v1.x ** 2 + v1.y ** 2) * Math.sqrt(v2.x ** 2 + v2.y ** 2)
    if (mag === 0) return 0
    return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI
}

/** Check if a finger is extended (tip above PIP in y) */
export function isFingerExtended(
    landmarks: HandLandmarks,
    tipIdx: number,
    pipIdx: number
): boolean {
    return landmarks[tipIdx].y < landmarks[pipIdx].y
}

/** Normalize landmarks so wrist is at origin, scale by wrist-to-middle-mcp */
export function normalizeLandmarks(lm: HandLandmarks): HandLandmarks {
    const wrist = lm[0]
    const scale = dist3D(lm[0], lm[9]) || 1
    return lm.map((pt) => ({
        x: (pt.x - wrist.x) / scale,
        y: (pt.y - wrist.y) / scale,
        z: (pt.z - wrist.z) / scale,
    }))
}

/** Flatten normalized landmarks to a Float32Array for model input */
export function flattenLandmarks(lm: HandLandmarks): number[] {
    return lm.flatMap((p) => [p.x, p.y, p.z])
}

/** Convert landmark (normalized 0-1) to canvas pixel coords */
export function landmarkToCanvas(
    lm: Landmark,
    canvasW: number,
    canvasH: number
): { x: number; y: number } {
    return { x: lm.x * canvasW, y: lm.y * canvasH }
}
