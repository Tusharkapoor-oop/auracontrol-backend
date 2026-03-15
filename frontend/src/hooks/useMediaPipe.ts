// ============================================================
// useMediaPipe — Real-time hand tracking with MediaPipe Tasks Vision
// Uses GestureRecognizer for high-accuracy static gesture detection
// + velocity-gated dynamic gesture detection (swipe/pinch/zoom)
// ============================================================
import { useEffect, useRef, useCallback } from 'react'
import {
    GestureRecognizer,
    FilesetResolver,
    type GestureRecognizerResult,
} from '@mediapipe/tasks-vision'
import type { HandLandmarks, GesturePrediction, GestureName, Velocity } from '../types'
import { isFingerExtended, dist2D, LANDMARK_INDICES } from '../utils/landmarks'

const CONFIDENCE_THRESHOLD = 0.82
const SWIPE_VEL_THRESHOLD = 0.018   // normalized units/ms
const SWIPE_COOLDOWN_MS = 600
const PINCH_DIST_THRESHOLD = 0.065  // normalized distance

interface UseMediaPipeOptions {
    videoRef: React.RefObject<HTMLVideoElement>
    onGesture: (g: GesturePrediction) => void
    onLandmarks: (lm: HandLandmarks) => void
    onFps: (fps: number, latency: number) => void
    onHandDetected: (v: boolean) => void
    mode: import('../types').GestureMode
}

export function useMediaPipe({
    videoRef,
    onGesture,
    onLandmarks,
    onFps,
    onHandDetected,
    mode,
}: UseMediaPipeOptions) {
    const recognizerRef = useRef<GestureRecognizer | null>(null)
    const rafRef = useRef<number>(0)
    const lastFrameRef = useRef<number>(0)
    const lastSwipeRef = useRef<number>(0)
    const prevLandmarks = useRef<HandLandmarks | null>(null)
    const prevTimestamp = useRef<number>(0)
    const frameCountRef = useRef(0)
    const fpsTimerRef = useRef<number>(0)

    // ---- Build recognizer once ----
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    const vision = await FilesetResolver.forVisionTasks(
                        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
                    )
                    const gr = await GestureRecognizer.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath:
                                'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                            delegate: 'GPU',
                        },
                        runningMode: 'VIDEO',
                        numHands: 1,
                        minHandDetectionConfidence: 0.7,
                        minHandPresenceConfidence: 0.7,
                        minTrackingConfidence: 0.7,
                    })
                    if (!cancelled) recognizerRef.current = gr
                } catch (e) {
                    console.error('[useMediaPipe] init failed', e)
                }
            })()
        return () => { cancelled = true }
    }, [])

    // ---- Compute velocity from successive landmarks ----
    const computeVelocity = useCallback(
        (curr: HandLandmarks, prev: HandLandmarks, dtMs: number): Velocity => {
            const wC = curr[0], wP = prev[0]
            const dx = (wC.x - wP.x) / dtMs
            const dy = (wC.y - wP.y) / dtMs
            const dz = (wC.z - wP.z) / dtMs
            return { x: dx, y: dy, z: dz, magnitude: Math.sqrt(dx * dx + dy * dy + dz * dz) }
        },
        []
    )

    // ---- Dynamic gesture detector (swipe / pinch / zoom) ----
    const detectDynamic = useCallback(
        (
            lm: HandLandmarks,
            vel: Velocity,
            staticGesture: GestureName,
            timestamp: number
        ): GestureName => {
            const now = timestamp
            const sinceLastSwipe = now - lastSwipeRef.current

            // Pinch: index-tip ↔ thumb-tip distance
            const pinchDist = dist2D(lm[LANDMARK_INDICES.INDEX_TIP], lm[LANDMARK_INDICES.THUMB_TIP])
            if (pinchDist < PINCH_DIST_THRESHOLD) {
                // Two-finger pinch — check for zoom (middle also close)
                const midDist = dist2D(lm[LANDMARK_INDICES.MIDDLE_TIP], lm[LANDMARK_INDICES.THUMB_TIP])
                if (midDist < PINCH_DIST_THRESHOLD * 1.5) return 'zoom_in'
                return 'pinch'
            }

            // Swipe: only trigger if hand is open or pointing (prevents false positives on fist)
            const indexExt = isFingerExtended(lm, LANDMARK_INDICES.INDEX_TIP, LANDMARK_INDICES.INDEX_PIP)
            const middleExt = isFingerExtended(lm, LANDMARK_INDICES.MIDDLE_TIP, LANDMARK_INDICES.MIDDLE_PIP)
            const handOpen = staticGesture === 'open_palm' || staticGesture === 'pointing'
                || (indexExt && middleExt)

            if (handOpen && vel.magnitude > SWIPE_VEL_THRESHOLD && sinceLastSwipe > SWIPE_COOLDOWN_MS) {
                lastSwipeRef.current = now
                const absX = Math.abs(vel.x), absY = Math.abs(vel.y)
                if (absX > absY) return vel.x < 0 ? 'swipe_left' : 'swipe_right'
                else return vel.y < 0 ? 'swipe_up' : 'swipe_down'
            }

            // Air-write: only index extended with slow movement
            if (mode === 'security' && indexExt && !middleExt && vel.magnitude < SWIPE_VEL_THRESHOLD)
                return 'air_write'

            return staticGesture
        },
        [mode]
    )

    // ---- Map MediaPipe category names → our GestureName ----
    const mapCategory = (name: string): GestureName => {
        const MAP: Record<string, GestureName> = {
            Open_Palm: 'open_palm',
            Closed_Fist: 'fist',
            Pointing_Up: 'pointing',
            Victory: 'peace',
            Thumb_Up: 'thumb_up',
            Thumb_Down: 'thumb_down',
            ILoveYou: 'rock',
            None: 'none',
        }
        return MAP[name] ?? 'none'
    }

    // ---- Main inference loop ----
    const runFrame = useCallback((timestampMs: number) => {
        rafRef.current = requestAnimationFrame(runFrame)

        const video = videoRef.current
        const gr = recognizerRef.current
        if (!video || !gr || video.readyState < 2) return

        // Throttle to ~30fps
        if (timestampMs - lastFrameRef.current < 33) return
        const startT = performance.now()
        lastFrameRef.current = timestampMs

        let result: GestureRecognizerResult
        try {
            result = gr.recognizeForVideo(video, timestampMs)
        } catch { return }

        const hasHand = (result.landmarks?.length ?? 0) > 0
        onHandDetected(hasHand)

        if (!hasHand) {
            prevLandmarks.current = null
            return
        }

        const lm = result.landmarks[0] as HandLandmarks
        const dtMs = prevTimestamp.current ? timestampMs - prevTimestamp.current : 33
        const vel = prevLandmarks.current
            ? computeVelocity(lm, prevLandmarks.current, dtMs)
            : { x: 0, y: 0, z: 0, magnitude: 0 }

        prevLandmarks.current = lm
        prevTimestamp.current = timestampMs

        onLandmarks(lm)

        // Static gesture from model
        const cats = result.gestures?.[0] ?? []
        const top = cats[0]
        const confidence = top?.score ?? 0
        const staticG = confidence >= CONFIDENCE_THRESHOLD
            ? mapCategory(top.categoryName)
            : 'none'

        // Dynamic gesture (swipe / pinch / air_write)
        const gesture = detectDynamic(lm, vel, staticG, timestampMs)
        const finalConf = gesture !== staticG ? Math.max(0.88, confidence) : confidence

        onGesture({
            gesture,
            confidence: finalConf,
            mode,
            velocity: vel,
            landmarks: lm,
            timestamp: timestampMs,
        })

        // FPS tracking
        frameCountRef.current++
        if (timestampMs - fpsTimerRef.current >= 1000) {
            const latency = performance.now() - startT
            onFps(frameCountRef.current, Math.round(latency * 10) / 10)
            frameCountRef.current = 0
            fpsTimerRef.current = timestampMs
        }
    }, [videoRef, onGesture, onLandmarks, onFps, onHandDetected, mode, computeVelocity, detectDynamic])

    // ---- Lifecycle ----
    useEffect(() => {
        // Start camera
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.play()
                }
            })
            .catch((e) => console.error('[useMediaPipe] camera error', e))

        rafRef.current = requestAnimationFrame(runFrame)
        return () => cancelAnimationFrame(rafRef.current)
    }, [runFrame, videoRef])
}
