// ============================================================
// AuraControl AI — Shared TypeScript Types
// All interfaces used across the frontend codebase
// ============================================================

/** Four interaction modes of AuraControl */
export type GestureMode = 'efficiency' | 'creative' | 'security' | 'utility'

/** A single 3D landmark from MediaPipe (normalized 0-1) */
export interface Landmark {
    x: number
    y: number
    z: number
}

/** Raw landmarks array — 21 points per hand */
export type HandLandmarks = Landmark[]

/**
 * Velocity vector computed from successive landmarks.
 * magnitude = sqrt(x²+y²+z²)
 */
export interface Velocity {
    x: number
    y: number
    z: number
    magnitude: number
}

/** Gesture class names recognized by the system */
export type GestureName =
    | 'open_palm'
    | 'fist'
    | 'pointing'
    | 'peace'
    | 'thumb_up'
    | 'thumb_down'
    | 'ok'
    | 'rock'
    | 'pinch'
    | 'grab'
    | 'swipe_left'
    | 'swipe_right'
    | 'swipe_up'
    | 'swipe_down'
    | 'circle_cw'
    | 'circle_ccw'
    | 'zoom_in'
    | 'zoom_out'
    | 'throw'
    | 'air_write'
    | 'none'

/**
 * Prediction from the gesture engine.
 * confidence ∈ [0,1]; predictions below CONFIDENCE_THRESHOLD are dropped.
 */
export interface GesturePrediction {
    gesture: GestureName
    confidence: number
    mode: GestureMode
    velocity: Velocity
    landmarks?: HandLandmarks
    timestamp: number
}

/** WebSocket message schema — backend → frontend */
export type WSMessage =
    | { type: 'gesture'; payload: GesturePrediction }
    | { type: 'landmarks'; payload: { landmarks: HandLandmarks; hand: 'left' | 'right' } }
    | { type: 'fps'; payload: { fps: number; latency_ms: number } }
    | { type: 'status'; payload: { hand_detected: boolean; connected: boolean } }
    | { type: 'error'; payload: { message: string } }
    | { type: 'pong' }

/** WebSocket connection state */
export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/** Air signature trajectory point */
export interface TrajectoryPoint {
    x: number
    y: number
    z: number
    t: number // ms
}

/** Saved air signature */
export interface AirSignature {
    id: string
    name: string
    trajectory: TrajectoryPoint[]
    createdAt: number
}

/** App mappings: regex → mode override */
export interface AppMapping {
    id: string
    pattern: string
    mode: GestureMode
}

/** Physics engine parameters (tunable in Dashboard) */
export interface PhysicsConfig {
    decayFactor: number        // 0.8–0.99
    velocityThreshold: number  // 0.01–0.1
    throwMultiplier: number    // 1–10
}

/** Global app state shape */
export interface AppState {
    mode: GestureMode
    wsStatus: WSStatus
    handDetected: boolean
    fps: number
    latency: number
    lastGesture: GesturePrediction | null
    landmarks: HandLandmarks | null
    velocity: Velocity
    isRecording: boolean
    dashboardOpen: boolean
    signatures: AirSignature[]
    appMappings: AppMapping[]
    physics: PhysicsConfig
    highContrast: boolean
}
