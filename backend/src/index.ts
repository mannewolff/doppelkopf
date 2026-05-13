/**
 * Server-Einstieg: startet WebSocketServer auf Port 3001.
 */

import { WebSocketServer } from 'ws'
import { attachWebSocketHandlers } from './api/websocket.js'

const PORT = Number(process.env['PORT'] ?? 3001)

const wss = new WebSocketServer({ port: PORT })
attachWebSocketHandlers(wss)

console.log(`🎮 Doppelkopf Backend ready on ws://localhost:${PORT}`)

wss.on('error', (err) => {
  console.error('Server error:', err)
})
