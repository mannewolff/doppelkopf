import { useEffect, useRef, useCallback, useState } from 'react'
import type { GameState, ServerMessage, ClientMessage, AnnouncementType } from '../types/game'
import { useGameState } from './useGameState'

interface UseGameWebSocketOptions {
  gameId: string
  playerId: string
  playerName: string
  serverUrl?: string
}

interface UseGameWebSocketReturn {
  gameState: GameState
  connected: boolean
  error: string | null
  sendPlayCard: (cardId: string) => void
  sendAnnounce: (announcementType: AnnouncementType) => void
  requestState: () => void
}

/**
 * WebSocket Hook for Doppelkopf Game
 * Handles connection, reconnection, message sending/receiving
 * Development: Uses mock server by default
 */
export function useGameWebSocket(options: UseGameWebSocketOptions): UseGameWebSocketReturn {
  const {
    gameId,
    playerName,
    serverUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  } = options

  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const { gameState, setState, addAnnouncement, updateTrick, finishGame, setError: setGameError } =
    useGameState()
  const messageQueueRef = useRef<ClientMessage[]>([])
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ========================================================================
  // MESSAGE SENDING
  // ========================================================================

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      // Queue message if not connected
      messageQueueRef.current.push(message)
    }
  }, [])

  const sendPlayCard = useCallback(
    (cardId: string) => {
      sendMessage({
        type: 'game:play-card',
        payload: { cardId },
      })
    },
    [sendMessage]
  )

  const sendAnnounce = useCallback(
    (announcementType: AnnouncementType) => {
      sendMessage({
        type: 'game:announce',
        payload: { announcementType },
      })
    },
    [sendMessage]
  )

  const requestState = useCallback(() => {
    sendMessage({
      type: 'game:state-request',
      payload: { gameId },
    })
  }, [gameId, sendMessage])

  // ========================================================================
  // MESSAGE HANDLING
  // ========================================================================

  const handleMessage = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const message: ServerMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'game:state-updated':
            setState(message.payload)
            setError(null)
            break

          case 'game:card-played':
            // Update UI to show card was played
            console.log(`${message.payload.playerId} played:`, message.payload.card)
            break

          case 'game:trick-won':
            console.log(`${message.payload.winnerId} won trick ${message.payload.trickId}`)
            break

          case 'game:announcement':
            addAnnouncement(message.payload)
            break

          case 'game:joined':
            setState(message.payload.gameState)
            setError(null)
            break

          case 'game:ended':
            finishGame({
              gameId: message.payload.gameId,
              winner: message.payload.winner,
              finalScore: message.payload.finalScore,
              statistics: message.payload.statistics,
              playedAt: Date.now(),
            })
            break

          case 'game:error':
            console.error(`Game Error [${message.payload.code}]:`, message.payload.message)
            setGameError({
              code: message.payload.code as any,
              message: message.payload.message,
              timestamp: Date.now(),
            })
            setError(message.payload.message)
            break
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
        setError('Failed to parse server message')
      }
    },
    [setState, addAnnouncement, updateTrick, finishGame, setGameError]
  )

  // ========================================================================
  // CONNECTION MANAGEMENT
  // ========================================================================

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(serverUrl)

      ws.addEventListener('open', () => {
        console.log('WebSocket connected')
        setConnected(true)
        setError(null)

        // Send join message
        const joinMessage: ClientMessage = {
          type: 'game:join',
          payload: { gameId, playerName },
        }
        ws.send(JSON.stringify(joinMessage))

        // Flush message queue
        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift()
          if (msg) {
            ws.send(JSON.stringify(msg))
          }
        }
      })

      ws.addEventListener('message', handleMessage)

      ws.addEventListener('close', () => {
        console.log('WebSocket disconnected')
        setConnected(false)
        wsRef.current = null

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, 3000)
      })

      ws.addEventListener('error', (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      })

      wsRef.current = ws
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to connect WebSocket:', msg)
      setError(`Failed to connect: ${msg}`)

      // Retry connection
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 3000)
    }
  }, [gameId, playerName, serverUrl, handleMessage])

  // ========================================================================
  // LIFECYCLE
  // ========================================================================

  useEffect(() => {
    connect()

    return () => {
      // Cleanup
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return {
    gameState,
    connected,
    error,
    sendPlayCard,
    sendAnnounce,
    requestState,
  }
}
