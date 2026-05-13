/**
 * WebSocket-Handler: koppelt Client-Events an GameEngine.
 *
 * Eine Spielsitzung lebt in der globalen `sessions`-Map, indiziert nach
 * `gameId`. Eine WebSocket-Connection ist nur das aktuelle Kommunikations-
 * Endgerät der Sitzung — sie kann jederzeit ausgetauscht werden (Reconnect,
 * React-StrictMode-Doppelmount). Die Engine, der laufende KI-Timer und der
 * Spielzettel überleben Reconnects.
 *
 * Phasenablauf:
 *  1. 'finding'                : KI-Chain deklariert reihum 'gesund', Mensch antwortet manuell.
 *  2. 'finding-vorbehalt-type'  : Mensch wählt konkreten Typ (MVP: nur 'hochzeit').
 *  3. 'ready-to-play'           : Backend wartet auf game:start-playing vom Menschen.
 *  4. 'playing'                 : KI-Chain spielt Karten bis Mensch dran.
 *  5. 'finished'                : Backend wartet auf game:next-game vom Menschen.
 *  6. 'round-finished'          : 20er-Runde komplett. Keine Auto-Aktion.
 */

import type { RawData, WebSocket, WebSocketServer } from 'ws'
import { computeValidCardIds } from '../engine/RulesValidator.js'
import {
  GameEngine,
  GameRuleError,
  HUMAN_PLAYER_ID,
} from '../engine/GameEngine.js'
import { decideAiMove, decideVorbehalt } from '../ai/SimpleAI.js'
import type {
  Card,
  ClientMessage,
  GameErrorCode,
  ServerMessage,
  VorbehaltDecision,
} from '../shared/types.js'

const AI_MOVE_DELAY_MS = 800
const TRICK_PAUSE_MS = 1500
const VORBEHALT_DELAY_MS = 600

/**
 * Eine Spielsitzung — überlebt WebSocket-Reconnects.
 *
 * `version` schützt vor Stale-Timern aus früheren Spielen derselben Session
 * (z.B. nach `game:next-game`). Sie wird NICHT bei einem WS-Reconnect
 * inkrementiert; laufende KI-Timer sollen weiterarbeiten und ihre Outputs
 * einfach an die *aktuelle* `activeWs` schicken.
 */
interface GameSession {
  engine: GameEngine
  /** Die zuletzt verbundene WebSocket; an sie gehen alle Outputs. */
  activeWs: WebSocket
  version: number
}

const sessions = new Map<string, GameSession>()

/** Pro-Connection-Zustand: nur die zugehörige gameId. */
interface ConnectionContext {
  gameId: string | undefined
}

export function attachWebSocketHandlers(wss: WebSocketServer): void {
  wss.on('connection', (ws) => {
    const ctx: ConnectionContext = { gameId: undefined }

    console.log('[ws] client connected')

    ws.on('message', (data) => {
      void handleRawMessage(ws, ctx, data)
    })

    ws.on('close', () => {
      console.log(`[ws] client disconnected (gameId=${ctx.gameId ?? '-'})`)
      // Session NICHT löschen — Reconnect soll möglich sein.
    })

    ws.on('error', (err) => {
      console.error('[ws] error:', err)
    })
  })
}

async function handleRawMessage(
  ws: WebSocket,
  ctx: ConnectionContext,
  data: RawData,
): Promise<void> {
  let parsed: unknown
  try {
    parsed = JSON.parse(data.toString())
  } catch {
    sendToWs(ws, {
      type: 'game:error',
      payload: { code: 'server-error', message: 'Invalid JSON' },
    })
    return
  }
  const msg = parseClientMessage(parsed)
  if (!msg) {
    sendToWs(ws, {
      type: 'game:error',
      payload: { code: 'server-error', message: 'Unknown message format' },
    })
    return
  }

  try {
    await dispatch(ws, ctx, msg)
  } catch (err) {
    if (err instanceof GameRuleError) {
      sendErrorToCtx(ctx, err.code, err.message, ws)
    } else {
      console.error('[ws] unhandled error:', err)
      sendErrorToCtx(ctx, 'server-error', 'Internal server error', ws)
    }
  }
}

async function dispatch(
  ws: WebSocket,
  ctx: ConnectionContext,
  msg: ClientMessage,
): Promise<void> {
  switch (msg.type) {
    case 'game:join': {
      const { gameId, playerName } = msg.payload
      ctx.gameId = gameId

      const existing = sessions.get(gameId)
      if (existing) {
        // Idempotenter Re-Attach (StrictMode-Doppelmount, Reconnect).
        existing.activeWs = ws
        console.log(`[session ${gameId}] re-attached (version=${existing.version})`)
        sendToWs(ws, {
          type: 'game:joined',
          payload: {
            playerId: HUMAN_PLAYER_ID,
            gameState: existing.engine.publicViewFor(HUMAN_PLAYER_ID),
          },
        })
        // KEIN AI-Chain-Restart — laufende Timer senden ohnehin an activeWs.
        return
      }

      const engine = new GameEngine({ gameId, humanPlayerName: playerName })
      const session: GameSession = { engine, activeWs: ws, version: 1 }
      sessions.set(gameId, session)
      console.log(`[session ${gameId}] created (version=${session.version})`)

      sendToWs(ws, {
        type: 'game:joined',
        payload: {
          playerId: HUMAN_PLAYER_ID,
          gameState: engine.publicViewFor(HUMAN_PLAYER_ID),
        },
      })
      scheduleNextAiIfNeeded(session)
      return
    }

    case 'game:declare-vorbehalt': {
      const session = requireSession(ctx, ws)
      if (!session) return
      session.engine.declareVorbehalt(HUMAN_PLAYER_ID, msg.payload.decision)
      broadcastState(session)
      scheduleNextAiIfNeeded(session)
      return
    }

    case 'game:choose-vorbehalt-type': {
      const session = requireSession(ctx, ws)
      if (!session) return
      session.engine.chooseVorbehaltType(HUMAN_PLAYER_ID, msg.payload.type)
      broadcastState(session)
      return
    }

    case 'game:start-playing': {
      const session = requireSession(ctx, ws)
      if (!session) return
      session.engine.startPlaying(HUMAN_PLAYER_ID)
      broadcastState(session)
      scheduleNextAiIfNeeded(session)
      return
    }

    case 'game:next-game': {
      const session = requireSession(ctx, ws)
      if (!session) return
      session.version += 1
      const res = session.engine.nextGame(HUMAN_PLAYER_ID)
      broadcastState(session)
      if (res.startedNewGame) {
        scheduleNextAiIfNeeded(session)
      }
      return
    }

    case 'game:play-card': {
      const session = requireSession(ctx, ws)
      if (!session) return
      const myVersion = session.version
      const result = session.engine.playCard(HUMAN_PLAYER_ID, msg.payload.cardId)

      sendToSession(session, {
        type: 'game:card-played',
        payload: {
          playerId: HUMAN_PLAYER_ID,
          card: result.card,
          timestamp: Date.now(),
        },
      })

      if (result.trickFinished && result.trickWinnerId && result.trickPoints !== undefined) {
        await sleep(TRICK_PAUSE_MS)
        if (myVersion !== session.version) return
        sendToSession(session, {
          type: 'game:trick-won',
          payload: {
            winnerId: result.trickWinnerId,
            trickId:
              session.engine.internal().tricks[session.engine.internal().tricks.length - 1]?.id ??
              '',
            points: result.trickPoints,
          },
        })
      }

      broadcastState(session)

      if (result.gameFinished && result.gameEndResult) {
        sendToSession(session, { type: 'game:ended', payload: result.gameEndResult })
        return
      }

      scheduleNextAiIfNeeded(session)
      return
    }

    case 'game:announce': {
      const session = requireSession(ctx, ws)
      if (!session) return
      const ann = session.engine.makeAnnouncement(HUMAN_PLAYER_ID, msg.payload.announcementType)
      sendToSession(session, { type: 'game:announcement', payload: ann })
      broadcastState(session)
      return
    }

    case 'game:state-request': {
      const session = requireSession(ctx, ws)
      if (!session) return
      broadcastState(session)
      return
    }

    case 'game:leave': {
      if (ctx.gameId) {
        sessions.delete(ctx.gameId)
        console.log(`[session ${ctx.gameId}] removed (game:leave)`)
        ctx.gameId = undefined
      }
      return
    }
  }
}

function requireSession(
  ctx: ConnectionContext,
  ws: WebSocket,
): GameSession | undefined {
  if (!ctx.gameId) {
    sendToWs(ws, {
      type: 'game:error',
      payload: { code: 'game-not-found', message: 'No active game (call game:join first)' },
    })
    return undefined
  }
  const session = sessions.get(ctx.gameId)
  if (!session) {
    sendToWs(ws, {
      type: 'game:error',
      payload: { code: 'game-not-found', message: 'Session not found' },
    })
    return undefined
  }
  // Falls dieser ws nicht der zuletzt registrierte ist: impliziter Reconnect.
  if (session.activeWs !== ws) {
    session.activeWs = ws
  }
  return session
}

// ============================================================================
// AI CHAIN
// ============================================================================

function scheduleNextAiIfNeeded(session: GameSession): void {
  const state = session.engine.internal()
  if (state.isFinished) return
  if (state.currentPlayerId === HUMAN_PLAYER_ID) return

  if (
    state.phase === 'finding-vorbehalt-type' ||
    state.phase === 'ready-to-play' ||
    state.phase === 'finished' ||
    state.phase === 'round-finished' ||
    state.phase === 'waiting'
  ) {
    return
  }

  const delay = state.phase === 'finding' ? VORBEHALT_DELAY_MS : AI_MOVE_DELAY_MS
  const scheduledVersion = session.version
  setTimeout(() => {
    void runAiTurn(session, scheduledVersion)
  }, delay)
}

async function runAiTurn(session: GameSession, scheduledVersion: number): Promise<void> {
  if (scheduledVersion !== session.version) return
  const state = session.engine.internal()
  if (state.isFinished) return
  const currentId = state.currentPlayerId
  if (currentId === HUMAN_PLAYER_ID) return

  if (state.phase === 'finding') {
    await runAiVorbehalt(session, scheduledVersion, currentId)
    return
  }
  if (state.phase === 'playing') {
    await runAiCardPlay(session, scheduledVersion, currentId)
    return
  }
}

async function runAiVorbehalt(
  session: GameSession,
  scheduledVersion: number,
  aiId: string,
): Promise<void> {
  try {
    session.engine.declareVorbehalt(aiId, decideVorbehalt())
    broadcastState(session)
    if (scheduledVersion === session.version) {
      scheduleNextAiIfNeeded(session)
    }
  } catch (err) {
    if (err instanceof GameRuleError) {
      console.error(`[ai vorbehalt] illegal: ${err.message}`)
    } else {
      console.error('[ai vorbehalt] unexpected:', err)
    }
    sendToSession(session, {
      type: 'game:error',
      payload: { code: 'server-error', message: 'AI failed in vorbehalt phase' },
    })
  }
}

async function runAiCardPlay(
  session: GameSession,
  scheduledVersion: number,
  aiId: string,
): Promise<void> {
  const state = session.engine.internal()
  const hand = state.hands.get(aiId) ?? []
  const validIds = computeValidCardIds({
    hand,
    trickCards: state.currentTrick.cards,
  })
  const validCards = hand.filter((c: Card) => validIds.includes(c.id))
  const decision = decideAiMove({
    validCards,
    trickCards: state.currentTrick.cards,
  })

  try {
    const result = session.engine.playCard(aiId, decision.cardId)

    sendToSession(session, {
      type: 'game:card-played',
      payload: {
        playerId: aiId,
        card: result.card,
        timestamp: Date.now(),
      },
    })

    if (result.trickFinished && result.trickWinnerId && result.trickPoints !== undefined) {
      await sleep(TRICK_PAUSE_MS)
      if (scheduledVersion !== session.version) return
      sendToSession(session, {
        type: 'game:trick-won',
        payload: {
          winnerId: result.trickWinnerId,
          trickId:
            session.engine.internal().tricks[session.engine.internal().tricks.length - 1]?.id ??
            '',
          points: result.trickPoints,
        },
      })
    }

    broadcastState(session)

    if (result.gameFinished && result.gameEndResult) {
      sendToSession(session, { type: 'game:ended', payload: result.gameEndResult })
      return
    }

    if (scheduledVersion === session.version) {
      scheduleNextAiIfNeeded(session)
    }
  } catch (err) {
    if (err instanceof GameRuleError) {
      console.error(`[ai play] illegal: ${err.message}`)
    } else {
      console.error('[ai play] unexpected:', err)
    }
    sendToSession(session, {
      type: 'game:error',
      payload: { code: 'server-error', message: 'AI failed' },
    })
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function broadcastState(session: GameSession): void {
  sendToSession(session, {
    type: 'game:state-updated',
    payload: session.engine.publicViewFor(HUMAN_PLAYER_ID),
  })
}

function sendToSession(session: GameSession, message: ServerMessage): void {
  sendToWs(session.activeWs, message)
}

function sendToWs(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState !== ws.OPEN) return
  ws.send(JSON.stringify(message))
}

function sendErrorToCtx(
  ctx: ConnectionContext,
  code: GameErrorCode,
  message: string,
  fallbackWs: WebSocket,
): void {
  const session = ctx.gameId ? sessions.get(ctx.gameId) : undefined
  if (session) {
    sendToSession(session, { type: 'game:error', payload: { code, message } })
    return
  }
  sendToWs(fallbackWs, { type: 'game:error', payload: { code, message } })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Testhilfe: Sitzungen zurücksetzen. */
export function resetSessionsForTest(): void {
  sessions.clear()
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

const VORBEHALT_TYPES: ReadonlyArray<VorbehaltDecision> = [
  'gesund',
  'hochzeit',
  'damen-solo',
  'buben-solo',
  'fleischlos',
  'farbsolo-clubs',
  'farbsolo-spades',
  'farbsolo-hearts',
  'farbsolo-diamonds',
]

function isVorbehaltDecision(value: unknown): value is VorbehaltDecision {
  return typeof value === 'string' && (VORBEHALT_TYPES as ReadonlyArray<string>).includes(value)
}

function parseClientMessage(value: unknown): ClientMessage | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const v = value as Record<string, unknown>
  const type = v['type']
  const payload = v['payload']
  if (typeof type !== 'string') return undefined
  const p =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {}

  switch (type) {
    case 'game:join':
      if (typeof p['gameId'] === 'string' && typeof p['playerName'] === 'string') {
        return {
          type: 'game:join',
          payload: { gameId: p['gameId'], playerName: p['playerName'] },
        }
      }
      return undefined
    case 'game:play-card':
      if (typeof p['cardId'] === 'string') {
        return { type: 'game:play-card', payload: { cardId: p['cardId'] } }
      }
      return undefined
    case 'game:announce': {
      const t = p['announcementType']
      if (
        t === 're' ||
        t === 'kontra' ||
        t === '90' ||
        t === '60' ||
        t === '30' ||
        t === 'schwarz'
      ) {
        return { type: 'game:announce', payload: { announcementType: t } }
      }
      return undefined
    }
    case 'game:state-request':
      if (typeof p['gameId'] === 'string') {
        return { type: 'game:state-request', payload: { gameId: p['gameId'] } }
      }
      return undefined
    case 'game:leave': {
      const reason = p['reason']
      return {
        type: 'game:leave',
        payload: typeof reason === 'string' ? { reason } : {},
      }
    }
    case 'game:declare-vorbehalt': {
      const d = p['decision']
      if (d === 'gesund' || d === 'vorbehalt') {
        return { type: 'game:declare-vorbehalt', payload: { decision: d } }
      }
      return undefined
    }
    case 'game:choose-vorbehalt-type': {
      const t = p['type']
      if (isVorbehaltDecision(t)) {
        return { type: 'game:choose-vorbehalt-type', payload: { type: t } }
      }
      return undefined
    }
    case 'game:start-playing':
      return { type: 'game:start-playing', payload: {} }
    case 'game:next-game':
      return { type: 'game:next-game', payload: {} }
    default:
      return undefined
  }
}
