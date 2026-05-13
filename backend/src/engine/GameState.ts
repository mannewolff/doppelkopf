/**
 * Interne, vollständige Server-Sicht des Spiels.
 *
 * GameState (im shared/types) ist die spielereigene, gefilterte Sicht
 * (eigene Hand + validCardIds). Diese Datei hält den "Master-Zustand"
 * inkl. aller Hände.
 */

import type {
  Announcement,
  AnnouncementType,
  Card,
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

  /** Alle Hände (Server-only). */
  hands: Map<string, Card[]>

  /** Bereits abgeschlossene Stiche. */
  tricks: Trick[]
  /** Aktueller, offener Stich. */
  currentTrick: Trick

  /** Flache Liste aller gespielten Karten. */
  playHistory: TrickCard[]

  /** Alle Ansagen in chronologischer Reihenfolge. */
  announcements: Announcement[]

  /** Live-Score während des Spiels (Augensumme pro Partei). */
  score: { re: number; kontra: number }

  isFinished: boolean

  /** Version-Marker für stale-callback-Schutz. */
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
