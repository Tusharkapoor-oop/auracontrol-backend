// ============================================================
// useWebSocket — Resilient WS connection to FastAPI backend
// Binary protocol, reconnect with exponential backoff, heartbeat
// ============================================================
import { useEffect, useRef, useCallback } from 'react'
import type { WSMessage, WSStatus } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'
const HEARTBEAT_INTERVAL = 15_000
const MAX_RECONNECT_DELAY = 30_000
const INITIAL_RECONNECT_DELAY = 1_000

interface UseWebSocketOptions {
    onMessage: (msg: WSMessage) => void
    onStatusChange: (s: WSStatus) => void
    enabled?: boolean
}

export function useWebSocket({ onMessage, onStatusChange, enabled = true }: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY)
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
    const heartbeatTimer = useRef<ReturnType<typeof setInterval>>()
    const mountedRef = useRef(true)

    const clearTimers = () => {
        clearTimeout(reconnectTimer.current)
        clearInterval(heartbeatTimer.current)
    }

    const connect = useCallback(() => {
        if (!mountedRef.current || !enabled) return
        try {
            onStatusChange('connecting')
            const ws = new WebSocket(WS_URL)
            wsRef.current = ws

            ws.onopen = () => {
                if (!mountedRef.current) { ws.close(); return }
                reconnectDelay.current = INITIAL_RECONNECT_DELAY
                onStatusChange('connected')
                // Heartbeat ping every 15s
                heartbeatTimer.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
                }, HEARTBEAT_INTERVAL)
            }

            ws.onmessage = (ev) => {
                try {
                    const msg: WSMessage = JSON.parse(ev.data as string)
                    onMessage(msg)
                } catch { /* ignore malformed */ }
            }

            ws.onerror = () => { /* handled in onclose */ }

            ws.onclose = () => {
                clearTimers()
                if (!mountedRef.current) return
                onStatusChange('disconnected')
                // Exponential backoff reconnect
                reconnectTimer.current = setTimeout(() => {
                    reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY)
                    connect()
                }, reconnectDelay.current)
            }
        } catch {
            onStatusChange('error')
        }
    }, [enabled, onMessage, onStatusChange])

    useEffect(() => {
        mountedRef.current = true
        if (enabled) connect()
        return () => {
            mountedRef.current = false
            clearTimers()
            wsRef.current?.close()
        }
    }, [connect, enabled])

    /** Send a raw JSON message to the backend */
    const send = useCallback((msg: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg))
        }
    }, [])

    return { send }
}
