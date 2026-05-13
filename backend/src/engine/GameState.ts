/**
 * Interne, vollständige Server-Sicht des Spiels.
 *
 * GameState (in shared/types) ist die spielereigene, gefilterte Sicht.
 * Diese Datei hält den "Master-Zustand" inkl. aller Hände und Vorbehalt-Tracking.
 */

import type {
  Announcement,
  AnnouncementType,
  Card,
  GameHistoryEntry,
  GamePhase,
  GameType,
  Player,
  PlayerPosition,
  Trick,
  TrickCard,
} from '../shared/types.js'

export interface InternalGameState {
  gameId: string
  phase: GamePhase
  gameType: GameType
  round: number

  players: Player[]
  /** Reihenfolge der Spieler-IDs nach Position 1..4 */
  playerOrder: ReadonlyArray<string>

  currentPlayerId: string
  currentPlayerPosition: PlayerPosition

  /** Spieler-ID, die 'vorbehalt' angemeldet hat. */
  vorbehaltActivePlayerId?: string

  /** Alle Hände (Server-only). */
  hands: Map<string, Card[]>

  tricks: Trick[]
  currentTrick: Trick

  playHistory: TrickCard[]

  announcements: Announcement[]

  score: { re: number; kontra: number }

  isFinished: boolean

  /** Position des aktuellen Gebers (Server-only). Rotiert mit jedem nextGame. */
  dealerPosition: PlayerPosition

  /** Spielzettel-Felder (kumulativ über die 20er-Runde). */
  gameNumber: number
  totalGames: number
  cumulativeScore: Record<string, number>
  gameHistory: GameHistoryEntry[]
  pflichtsoloPlayed: Record<string, boolean>

  version: number
}

export function findPlayer(state: InternalGameState, playerId: string): Player {
  const p = state.players.find((pl) => pl.id === playerId)
  if (!p) throw new Error(`Player not found: ${playerId}`)
  return p
}

export function nextPositionClockwise(pos: PlayerPosition): PlayerPosition {
  const next = (pos % 4) + 1
  return next as PlayerPosition
}

export function playerAt(state: InternalGameState, pos: PlayerPosition): Player {
  const p = state.players.find((pl) => pl.position === pos)
  if (!p) throw new Error(`No player at position ${pos}`)
  return p
}

export function getHand(state: InternalGameState, playerId: string): Card[] {
  const hand = state.hands.get(playerId)
  if (!hand) throw new Error(`No hand for player ${playerId}`)
  return hand
}

export function newTrickId(state: InternalGameState): string {
  return `trick-${state.tricks.length + 1}`
}

export function isAnnouncementAlready(
  state: InternalGameState,
  playerId: string,
  type: AnnouncementType,
): boolean {
  return state.announcements.some((a) => a.playerId === playerId && a.type === type)
}
