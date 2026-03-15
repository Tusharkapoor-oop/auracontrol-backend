// ============================================================
// ModeSelector — Right-edge vertical mode picker
// ============================================================
import { motion } from 'framer-motion'
import { Shield, Palette, Zap, Wrench, PenLine } from 'lucide-react'
import { useAppStore } from '../context/ModeTransitionContext'
import { useModeTransition } from '../hooks/useModeTransition'
import { MODE_COLORS } from '../utils/colors'
import type { GestureMode } from '../types'

const MODES: { id: GestureMode; icon: typeof Zap; label: string }[] = [
    { id: 'efficiency', icon: Zap, label: 'Efficiency' },
    { id: 'creative', icon: Palette, label: 'Creative' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'utility', icon: Wrench, label: 'Utility' },
]

export default function ModeSelector() {
    const currentMode = useAppStore((s) => s.mode)
    const setDash = useAppStore((s) => s.setDashboardOpen)
    const { transition } = useModeTransition()

    return (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 items-end">
            {/* Signature shortcut */}
            <motion.button
                whileHover={{ scale: 1.08, x: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDash(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl mb-2"
                style={{
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff99',
                }}
                title="Add Air Signature"
            >
                <PenLine size={14} />
                <span className="font-orbitron text-xs tracking-wider">SIGN</span>
            </motion.button>

            {/* Mode buttons */}
            <div
                className="flex flex-col gap-2 p-2 rounded-2xl"
                style={{
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(14px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                {MODES.map(({ id, icon: Icon, label }) => {
                    const active = id === currentMode
                    const c = MODE_COLORS[id]
                    return (
                        <motion.button
                            key={id}
                            onClick={() => transition(id)}
                            whileHover={{ scale: 1.06, x: -3 }}
                            whileTap={{ scale: 0.94 }}
                            animate={
                                active
                                    ? { boxShadow: [`0 0 8px ${c.glow}`, `0 0 22px ${c.glow}`, `0 0 8px ${c.glow}`] }
                                    : { boxShadow: 'none' }
                            }
                            transition={active ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors duration-200 group relative"
                            style={{
                                background: active ? c.bg : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.1)'}`,
                                color: active ? c.primary : '#ffffff66',
                                minWidth: '110px',
                            }}
                            aria-label={`Switch to ${label} mode`}
                            aria-pressed={active}
                        >
                            <Icon
                                size={14}
                                style={{ filter: active ? `drop-shadow(0 0 6px ${c.primary})` : undefined }}
                            />
                            <span
                                className="font-orbitron text-[10px] font-bold tracking-widest uppercase"
                                style={{ textShadow: active ? `0 0 8px ${c.primary}` : undefined }}
                            >
                                {label}
                            </span>

                            {/* Active indicator dot */}
                            {active && (
                                <motion.span
                                    layoutId="active-dot"
                                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                                    style={{ background: c.primary, boxShadow: `0 0 6px ${c.primary}` }}
                                />
                            )}
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}
