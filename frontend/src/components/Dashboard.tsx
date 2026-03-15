// ============================================================
// Dashboard — Slide-up config panel with tabs
// Air Signatures | App Mappings | Physics Lab | Settings
// ============================================================
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Play, Square, CheckCircle, RefreshCw, Trash2 } from 'lucide-react'
import { useAppStore } from '../context/ModeTransitionContext'
import { MODE_COLORS } from '../utils/colors'
import type { GestureMode, AirSignature } from '../types'

type Tab = 'signatures' | 'mappings' | 'physics' | 'settings'

// ---- Signature Studio ----
function SignatureStudio({ onSave }: { onSave: (sig: AirSignature) => void }) {
    const [name, setName] = useState('')
    const [recording, setRecording] = useState(false)
    const [captured, setCaptured] = useState(false)
    const [score, setScore] = useState<number | null>(null)
    const [testing, setTesting] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const trajRef = useRef<{ x: number; y: number }[]>([])
    const rafRef = useRef(0)
    const tRef = useRef(0)

    const startRecording = () => {
        setRecording(true); setCaptured(false); setScore(null)
        trajRef.current = []
        const canvas = canvasRef.current
        if (canvas) { const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, canvas.width, canvas.height) }
        let angle = 0
        const draw = () => {
            angle += 0.04
            const cx = Math.cos(angle) * 60 + 100
            const cy = Math.sin(angle * 1.6) * 40 + 60
            trajRef.current.push({ x: cx, y: cy })
            const canvas = canvasRef.current
            if (canvas) {
                const ctx = canvas.getContext('2d')!
                ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2.5; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 8
                if (trajRef.current.length > 1) {
                    const prev = trajRef.current[trajRef.current.length - 2]
                    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(cx, cy); ctx.stroke()
                }
            }
            if (tRef.current < 180) { tRef.current++; rafRef.current = requestAnimationFrame(draw) }
            else stopRecording()
        }
        tRef.current = 0
        rafRef.current = requestAnimationFrame(draw)
    }

    const stopRecording = () => {
        cancelAnimationFrame(rafRef.current)
        setRecording(false); setCaptured(true)
    }

    const testMatch = () => {
        setTesting(true)
        setTimeout(() => { setScore(Math.round(Math.random() * 20 + 80)); setTesting(false) }, 1200)
    }

    const save = () => {
        if (!name.trim()) return
        onSave({
            id: `sig-${Date.now()}`,
            name: name.trim(),
            trajectory: trajRef.current.map((p, i) => ({ ...p, z: 0, t: i * 33 })),
            createdAt: Date.now(),
        })
        setName(''); setCaptured(false); setScore(null)
        const canvas = canvasRef.current
        if (canvas) { const ctx = canvas.getContext('2d')!; ctx.clearRect(0, 0, canvas.width, canvas.height) }
    }

    return (
        <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(0,255,255,0.04)', border: '1px solid rgba(0,255,255,0.15)' }}>
            <h3 className="font-orbitron text-xs text-cyan-400 tracking-widest uppercase">Signature Studio</h3>

            {/* Canvas */}
            <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,255,255,0.2)', background: '#00000066' }}>
                <canvas ref={canvasRef} width={200} height={120} className="w-full" style={{ height: 120 }} />
                {captured && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: 'rgba(0,255,65,0.1)' }}
                    >
                        <CheckCircle className="text-green-400" size={32} />
                    </motion.div>
                )}
            </div>

            {/* Name input */}
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Signature name…"
                className="w-full bg-transparent font-inter text-sm text-white px-3 py-2 rounded-lg outline-none"
                style={{ border: '1px solid rgba(0,255,255,0.25)', borderBottomColor: '#00ffff' }}
            />

            {/* Controls */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={recording ? stopRecording : startRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                        background: recording ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,255,0.15)',
                        border: `1px solid ${recording ? '#ff4444' : '#00ffff'}`,
                        color: recording ? '#ff8888' : '#00ffff',
                    }}
                >
                    {recording ? <><Square size={11} /> Stop</> : <><Play size={11} /> Record</>}
                    {recording && <motion.span className="w-1.5 h-1.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} />}
                </button>

                <button
                    onClick={testMatch}
                    disabled={!captured || testing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-all"
                    style={{ background: 'rgba(123,0,255,0.15)', border: '1px solid rgba(123,0,255,0.4)', color: '#c87dff' }}
                >
                    {testing ? <RefreshCw size={11} className="animate-spin" /> : 'Test Match'}
                </button>

                <button
                    onClick={save}
                    disabled={!captured || !name.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 transition-all"
                    style={{ background: 'rgba(0,255,65,0.15)', border: '1px solid rgba(0,255,65,0.4)', color: '#00ff41' }}
                >
                    <Plus size={11} /> Save
                </button>
            </div>

            {/* Similarity score */}
            <AnimatePresence>
                {score !== null && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1">
                        <div className="flex justify-between font-fira text-xs">
                            <span className="text-white/50">Similarity</span>
                            <span style={{ color: score >= 90 ? '#00ff41' : score >= 75 ? '#ffaa00' : '#ff4444' }}>{score}%</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                                className="h-full rounded-full"
                                style={{ background: score >= 90 ? '#00ff41' : score >= 75 ? '#ffaa00' : '#ff4444' }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ---- Main Dashboard ----
export default function Dashboard() {
    const open = useAppStore((s) => s.dashboardOpen)
    const setOpen = useAppStore((s) => s.setDashboardOpen)
    const sigs = useAppStore((s) => s.signatures)
    const physics = useAppStore((s) => s.physics)
    const setPhysics = useAppStore((s) => s.setPhysics)
    const highContrast = useAppStore((s) => s.highContrast)
    const setContrast = useAppStore((s) => s.setHighContrast)
    const mode = useAppStore((s) => s.mode)
    const color = MODE_COLORS[mode].primary

    const [activeTab, setActiveTab] = useState<Tab>('signatures')

    const TABS: { id: Tab; label: string }[] = [
        { id: 'signatures', label: 'Air Signatures' },
        { id: 'mappings', label: 'App Mappings' },
        { id: 'physics', label: 'Physics Lab' },
        { id: 'settings', label: 'Settings' },
    ]

    return (
        <>
            {/* Handle */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(true)}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 px-6 py-2 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <div className="w-8 h-0.5 bg-white/30 rounded-full" />
                        <span className="font-orbitron text-[9px] text-white/30 tracking-widest uppercase">Dashboard</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Slide-up panel */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                            className="fixed bottom-0 left-0 right-0 z-50 h-[72vh] rounded-t-3xl flex flex-col"
                            style={{ background: 'rgba(4,8,20,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <h2 className="font-orbitron text-sm font-bold tracking-widest text-white uppercase">
                                    Control Dashboard
                                </h2>
                                <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 transition-colors">
                                    <ChevronDown size={18} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex px-6 gap-1 pt-3">
                                {TABS.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setActiveTab(t.id)}
                                        className="font-orbitron text-[10px] tracking-wider px-3 py-1.5 rounded-t-lg transition-all"
                                        style={{
                                            color: activeTab === t.id ? color : 'rgba(255,255,255,0.3)',
                                            borderBottom: activeTab === t.id ? `2px solid ${color}` : '2px solid transparent',
                                            textShadow: activeTab === t.id ? `0 0 8px ${color}` : undefined,
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === 'signatures' && (
                                            <div className="space-y-4">
                                                <SignatureStudio onSave={(sig) => useAppStore.setState((s) => ({ signatures: [...s.signatures, sig] }))} />
                                                {sigs.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h3 className="font-orbitron text-xs text-white/40 uppercase tracking-widest">Saved</h3>
                                                        {sigs.map((sig) => (
                                                            <div key={sig.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                                                                <span className="font-inter text-sm text-white/80">{sig.name}</span>
                                                                <button onClick={() => useAppStore.setState((s) => ({ signatures: s.signatures.filter((x) => x.id !== sig.id) }))} className="text-white/20 hover:text-red-400 transition-colors">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'mappings' && (
                                            <div className="space-y-3">
                                                <h3 className="font-inter text-sm text-white/50">Configure regex → mode mappings (coming soon)</h3>
                                                {(['efficiency', 'creative', 'security', 'utility'] as GestureMode[]).map((m) => (
                                                    <div key={m} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ border: `1px solid ${MODE_COLORS[m].border}30` }}>
                                                        <span className="font-orbitron text-xs" style={{ color: MODE_COLORS[m].primary }}>{m.toUpperCase()}</span>
                                                        <input placeholder="App regex (e.g. PowerPoint.*)" className="flex-1 bg-transparent text-sm text-white/60 outline-none" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'physics' && (
                                            <div className="space-y-6">
                                                {[
                                                    { label: 'Decay Factor', key: 'decayFactor' as const, min: 0.8, max: 0.99, step: 0.01 },
                                                    { label: 'Velocity Threshold', key: 'velocityThreshold' as const, min: 0.01, max: 0.1, step: 0.005 },
                                                    { label: 'Throw Multiplier', key: 'throwMultiplier' as const, min: 1, max: 10, step: 0.5 },
                                                ].map(({ label, key, min, max, step }) => (
                                                    <div key={key} className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="font-inter text-xs text-white/60">{label}</span>
                                                            <span className="font-fira text-xs" style={{ color }}>{physics[key]}</span>
                                                        </div>
                                                        <input
                                                            type="range" min={min} max={max} step={step} value={physics[key]}
                                                            onChange={(e) => setPhysics({ [key]: parseFloat(e.target.value) })}
                                                            className="w-full accent-cyan-400 h-1"
                                                            style={{ accentColor: color }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTab === 'settings' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <span className="font-inter text-sm text-white/70">High Contrast Mode</span>
                                                    <button
                                                        onClick={() => setContrast(!highContrast)}
                                                        className="w-10 h-5 rounded-full transition-all relative"
                                                        style={{ background: highContrast ? color : 'rgba(255,255,255,0.15)' }}
                                                    >
                                                        <motion.span
                                                            animate={{ x: highContrast ? 20 : 2 }}
                                                            className="absolute top-0.5 w-4 h-4 bg-white rounded-full"
                                                            style={{ left: 0 }}
                                                        />
                                                    </button>
                                                </div>
                                                <p className="font-inter text-xs text-white/30 text-center">
                                                    Backend URL: {import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'}
                                                </p>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}
