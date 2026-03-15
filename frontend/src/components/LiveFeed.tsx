// ============================================================
// LiveFeed — Full-screen webcam with canvas overlay
// ============================================================
import { useRef, forwardRef, useImperativeHandle } from 'react'

export interface LiveFeedHandle {
    getVideo: () => HTMLVideoElement | null
    getCanvas: () => HTMLCanvasElement | null
}

interface LiveFeedProps {
    dimmed?: boolean
}

const LiveFeed = forwardRef<LiveFeedHandle, LiveFeedProps>(({ dimmed = false }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useImperativeHandle(ref, () => ({
        getVideo: () => videoRef.current,
        getCanvas: () => canvasRef.current,
    }))

    return (
        <div className="fixed inset-0 overflow-hidden bg-black">
            {/* Mirrored camera feed */}
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                    transform: 'scaleX(-1)',
                    filter: dimmed ? 'brightness(0.5)' : 'brightness(1)',
                    transition: 'filter 0.3s ease',
                }}
                playsInline
                muted
                autoPlay
            />
            {/* Canvas overlay for 2D drawings (gesture trail, debug) */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
            />
            {/* CRT scanline overlay (aesthetic) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
                }}
            />
        </div>
    )
})

LiveFeed.displayName = 'LiveFeed'
export default LiveFeed
