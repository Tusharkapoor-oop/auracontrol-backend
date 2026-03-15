// ============================================================
// NotificationToast — Slide-up toast system
// ============================================================
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'
export interface Toast { id: string; type: ToastType; message: string }

const TIMEOUT = 3500

const STYLES: Record<ToastType, { border: string; icon: typeof Info; color: string }> = {
    success: { color: '#00ff41', border: 'rgba(0,255,65,0.4)', icon: CheckCircle },
    error: { color: '#ff00ff', border: 'rgba(255,0,255,0.4)', icon: AlertCircle },
    info: { color: '#00ffff', border: 'rgba(0,255,255,0.4)', icon: Info },
    warning: { color: '#ffaa00', border: 'rgba(255,170,0,0.4)', icon: AlertTriangle },
}

// Global singleton queue
type Listener = (t: Toast) => void
const listeners: Listener[] = []
let idCounter = 0
export function showToast(type: ToastType, message: string) {
    const t: Toast = { id: `t${idCounter++}`, type, message }
    listeners.forEach((fn) => fn(t))
}

export default function NotificationToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    useEffect(() => {
        const handler = (t: Toast) => {
            setToasts((prev) => [...prev, t].slice(-4))
            setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), TIMEOUT)
        }
        listeners.push(handler)
        return () => { const i = listeners.indexOf(handler); if (i !== -1) listeners.splice(i, 1) }
    }, [])

    return (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
            <AnimatePresence>
                {toasts.map((t) => {
                    const s = STYLES[t.type]
                    const Icon = s.icon
                    return (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 25 }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white"
                            style={{
                                background: 'rgba(0,0,0,0.8)',
                                backdropFilter: 'blur(16px)',
                                border: `1px solid ${s.border}`,
                                boxShadow: `0 0 12px ${s.border}`,
                                minWidth: 240,
                            }}
                        >
                            <Icon size={15} color={s.color} />
                            <span className="font-inter text-sm text-white/85 flex-1">{t.message}</span>
                            <button
                                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                                className="text-white/30 hover:text-white/70 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </div>
    )
}
