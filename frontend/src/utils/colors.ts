// ============================================================
// Mode → color/glow/label mapping
// ============================================================
import type { GestureMode } from '../types'

export interface ModeColors {
    primary: string
    glow: string
    bg: string
    text: string
    border: string
    label: string
    emoji: string
}

export const MODE_COLORS: Record<GestureMode, ModeColors> = {
    efficiency: {
        primary: '#00ffff',
        glow: 'rgba(0,255,255,0.7)',
        bg: 'rgba(0,255,255,0.12)',
        text: '#00ffff',
        border: 'rgba(0,255,255,0.5)',
        label: 'EFFICIENCY',
        emoji: '⚡',
    },
    creative: {
        primary: '#7b00ff',
        glow: 'rgba(123,0,255,0.7)',
        bg: 'rgba(123,0,255,0.12)',
        text: '#c87dff',
        border: 'rgba(123,0,255,0.5)',
        label: 'CREATIVE',
        emoji: '🎨',
    },
    security: {
        primary: '#ff00ff',
        glow: 'rgba(255,0,255,0.7)',
        bg: 'rgba(255,0,255,0.12)',
        text: '#ff00ff',
        border: 'rgba(255,0,255,0.5)',
        label: 'SECURITY',
        emoji: '🔐',
    },
    utility: {
        primary: '#00ff41',
        glow: 'rgba(0,255,65,0.7)',
        bg: 'rgba(0,255,65,0.12)',
        text: '#00ff41',
        border: 'rgba(0,255,65,0.5)',
        label: 'UTILITY',
        emoji: '🔧',
    },
}

/** Returns the CSS box-shadow glow string for a mode */
export function getModeGlow(mode: GestureMode, intensity = 1): string {
    const c = MODE_COLORS[mode]
    return `0 0 ${Math.round(15 * intensity)}px ${c.glow}, 0 0 ${Math.round(30 * intensity)}px ${c.bg}`
}
