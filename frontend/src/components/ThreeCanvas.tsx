// ============================================================
// ThreeCanvas — R3F 3D hand skeleton overlay
// 21 landmark spheres + bone connections, pulsing glow
// ============================================================
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import type { HandLandmarks } from '../types'
import { HAND_CONNECTIONS } from '../utils/landmarks'
import { useAppStore } from '../context/ModeTransitionContext'
import { MODE_COLORS } from '../utils/colors'

// ---- Internal skeleton mesh ----
interface SkeletonProps {
    landmarks: HandLandmarks
    color: string
}

function Skeleton({ landmarks, color }: SkeletonProps) {
    const groupRef = useRef<THREE.Group>(null)
    const matRef = useRef<THREE.MeshBasicMaterial>(null)
    const c = useMemo(() => new THREE.Color(color), [color])

    useFrame(({ clock }) => {
        // Breathing pulse on opacity
        if (matRef.current) {
            matRef.current.opacity = 0.6 + 0.4 * Math.sin(clock.getElapsedTime() * 2)
        }
    })

    // Map normalized [0,1] landmarks → world space [-1,1]
    const worldPos = (lm: { x: number; y: number; z: number }): [number, number, number] => [
        (1 - lm.x) * 2 - 1,  // mirrored x
        -(lm.y * 2 - 1),     // y flipped
        lm.z * -2,            // z depth
    ]

    return (
        <group ref={groupRef}>
            {/* Bone lines */}
            {HAND_CONNECTIONS.map(([a, b], i) => (
                <Line
                    key={i}
                    points={[worldPos(landmarks[a]), worldPos(landmarks[b])]}
                    color={color}
                    lineWidth={1.5}
                    transparent
                    opacity={0.7}
                />
            ))}

            {/* Joint spheres */}
            {landmarks.map((lm, i) => {
                const isTip = [4, 8, 12, 16, 20].includes(i)
                return (
                    <mesh key={i} position={worldPos(lm)}>
                        <sphereGeometry args={[isTip ? 0.022 : 0.014, 8, 8]} />
                        <meshBasicMaterial ref={i === 8 ? matRef : undefined} color={c} transparent opacity={0.9} />
                    </mesh>
                )
            })}
        </group>
    )
}

// ---- Canvas wrapper ----
interface ThreeCanvasProps {
    landmarks: HandLandmarks | null
}

export default function ThreeCanvas({ landmarks }: ThreeCanvasProps) {
    const mode = useAppStore((s) => s.mode)
    const color = MODE_COLORS[mode].primary

    return (
        <div className="fixed inset-0 pointer-events-none z-20">
            <Canvas
                camera={{ position: [0, 0, 2], fov: 60 }}
                gl={{ alpha: true, antialias: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.3} />
                {landmarks && <Skeleton landmarks={landmarks} color={color} />}
            </Canvas>
        </div>
    )
}
