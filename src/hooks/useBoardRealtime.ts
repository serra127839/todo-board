import { useEffect, useRef } from 'react'
import type { BoardSnapshot } from '../../shared/boardTypes'
import type { RealtimeEvent } from '../../shared/realtimeTypes'
import { useBoardStore } from '@/stores/boardStore'
import { useAuthStore } from '@/stores/authStore'

const getWsUrl = (token: string): string => {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  const isVite =
    location.port === '5173' ||
    location.port === '4173' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'

  if (isVite) {
    return `${proto}//${location.hostname}:3001/ws?token=${encodeURIComponent(token)}`
  }

  return `${proto}//${location.host}/ws?token=${encodeURIComponent(token)}`
}

export const useBoardRealtime = (): void => {
  const applySnapshot = useBoardStore((s) => s.applySnapshot)
  const applyEvent = useBoardStore((s) => s.applyEvent)
  const setConnected = useBoardStore((s) => s.setConnected)
  const token = useAuthStore((s) => s.token)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<number | null>(null)

  useEffect(() => {
    let stopped = false

    const connect = () => {
      if (stopped) return
      if (!token) return
      const ws = new WebSocket(getWsUrl(token))
      socketRef.current = ws

      ws.addEventListener('open', () => {
        setConnected(true)
      })

      ws.addEventListener('close', () => {
        setConnected(false)
        if (stopped) return
        reconnectRef.current = window.setTimeout(connect, 800)
      })

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as
            | { type: 'server:hello'; payload: BoardSnapshot }
            | RealtimeEvent

          if (msg.type === 'server:hello') {
            applySnapshot(msg.payload)
            return
          }

          applyEvent(msg)
        } catch {
        }
      })
    }

    connect()

    return () => {
      stopped = true
      setConnected(false)
      if (reconnectRef.current) window.clearTimeout(reconnectRef.current)
      socketRef.current?.close()
    }
  }, [applyEvent, applySnapshot, setConnected, token])
}
