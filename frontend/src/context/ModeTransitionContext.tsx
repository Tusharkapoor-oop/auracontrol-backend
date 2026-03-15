// ============================================================
// ModeTransitionContext — global app state via Zustand
// ============================================================
import { createContext, useContext, useEffect, ReactNode } from 'react'
import { create } from 'zustand'
import type { AppState, GestureMode, GesturePrediction, HandLandmarks, Velocity } from '../types'

// --------------- Zustand Store ---------------
interface Store extends AppState {
    setMode: (mode: GestureMode) => void
    setWSStatus: (s: AppState['wsStatus']) => void
    setHandDetected: (v: boolean) => void
    setFps: (fps: number, latency: number) => void
    setLastGesture: (g: GesturePrediction | null) => void
    setLandmarks: (lm: HandLandmarks | null) => void
    setVelocity: (v: Velocity) => void
    setRecording: (v: boolean) => void
    setDashboardOpen: (v: boolean) => void
    setHighContrast: (v: boolean) => void
    setPhysics: (p: Partial<AppState['physics']>) => void
}

export const useAppStore = create<Store>((set) => ({
    mode: 'efficiency',
    wsStatus: 'disconnected',
    handDetected: false,
    fps: 0,
    latency: 0,
    lastGesture: null,
    landmarks: null,
    velocity: { x: 0, y: 0, z: 0, magnitude: 0 },
    isRecording: false,
    dashboardOpen: false,
    signatures: [],
    appMappings: [],
    physics: { decayFactor: 0.92, velocityThreshold: 0.03, throwMultiplier: 4 },
    highContrast: false,

    setMode: (mode) => set({ mode }),
    setWSStatus: (wsStatus) => set({ wsStatus }),
    setHandDetected: (handDetected) => set({ handDetected }),
    setFps: (fps, latency) => set({ fps, latency }),
    setLastGesture: (lastGesture) => set({ lastGesture }),
    setLandmarks: (landmarks) => set({ landmarks }),
    setVelocity: (velocity) => set({ velocity }),
    setRecording: (isRecording) => set({ isRecording }),
    setDashboardOpen: (dashboardOpen) => set({ dashboardOpen }),
    setHighContrast: (highContrast) => set({ highContrast }),
    setPhysics: (p) => set((s) => ({ physics: { ...s.physics, ...p } })),
}))

// --------------- React Context (thin wrapper) ---------------
const ModeTransitionContext = createContext<null>(null)

export function ModeTransitionProvider({ children }: { children: ReactNode }) {
    return (
        <ModeTransitionContext.Provider value={null}>
            {children}
        </ModeTransitionContext.Provider>
    )
}

export function useModeTransition() {
    useContext(ModeTransitionContext)
    return useAppStore((s) => ({
        mode: s.mode,
        setMode: s.setMode,
    }))
}
