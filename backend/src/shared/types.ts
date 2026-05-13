/**
 * Doppelkopf Game Types — Vertrag zwischen Frontend und Backend.
 */

// ============================================================================
// PRIMITIVES
// ============================================================================

export type Suit = 'clubs' | 'spades' | 'hearts' | 'diamonds'
export type Rank = 'ace' | 'ten' | 'king' | 'queen' | 'jack' | 'nine'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
}

// ============================================================================
// PLAYER & PARTY
// ============================================================================

export type Party = 're' | 'kontra' | 'solo' | null
export type PlayerPosition = 1 | 2 | 3 | 4
export type AnnouncementType = 're' | 'kontra' | '90' | '60' | '30' | 'schwarz'

export interface Announcement {
  id: string
  playerId: string
  playerName: string
  type: AnnouncementType
  timestamp: number
}

export type VorbehaltDecision =
  | 'gesund'
  | 'hochzeit'
  | 'damen-solo'
  | 'buben-solo'
  | 'fleischlos'
  | 'farbsolo-clubs'
  | 'farbsolo-spades'
  | 'farbsolo-hearts'
  | 'farbsolo-diamonds'

export interface Player {
  id: string
  name: string
  position: PlayerPosition
  party: Party
  isAI: boolean
  announcements: Announcement[]
  cardsRemaining: number
  vorbehaltDecision?: VorbehaltDecision
}

// ============================================================================
// TRICKS
// ============================================================================

export interface TrickCard {
  playerId: string
  card: Card
  playedAt: number
}

export interface Trick {
  id: string
  winnerId?: string
  cards: TrickCard[]
  points: number
}

// ============================================================================
// GAME STATE
// ============================================================================

export type GameType =
  | 'normalspiel'
  | 'hochzeit'
  | 'damen-solo'
  | 'buben-solo'
  | 'fleischlos'
  | 'farbsolo-clubs'
  | 'farbsolo-spades'
  | 'farbsolo-hearts'
  | 'farbsolo-diamonds'

/**
 * Spielphasen:
 *  - waiting               : Spielsetup
 *  - finding               : Vorbehalt-Frage reihum (Phase 1)
 *  - finding-vorbehalt-type: Spieler mit Vorbehalt wählt Typ (Phase 2)
 *  - ready-to-play         : Karten verteilt, wartet auf game:start-playing
 *  - playing               : Spiel läuft
 *  - finished              : Spiel beendet, wartet auf game:next-game
 *  - round-finished        : 20er-Runde komplett, Endabrechnung
 */
export type GamePhase =
  | 'waiting'
  | 'finding'
  | 'finding-vorbehalt-type'
  | 'ready-to-play'
  | 'playing'
  | 'finished'
  | 'round-finished'

export interface GameStatistics {
  re: { players: string[]; score: number }
  kontra: { players: string[]; score: number }
  tricks: number
  announcements: Announcement[]
}

export interface GameEndResult {
  gameId: string
  winner: 're' | 'kontra'
  finalScore: number
  statistics: GameStatistics
  playedAt: number
}

/**
 * Eintrag im Spielzettel pro abgeschlossenem Spiel.
 */
export interface GameHistoryEntry {
  gameNumber: number
  gameType: GameType
  winnerParty: 're' | 'kontra'
  /** Spielpunkt-Betrag (positiv, Sicht des Siegers). */
  pointValue: number
  /** Solospieler-ID, falls Solo (alle Soli außer 'hochzeit'). */
  soloPlayer?: string
}

export interface GameState {
  gameId: string
  phase: GamePhase
  gameType: GameType
  round: number

  players: Player[]
  currentPlayerId: string
  currentPlayerPosition: PlayerPosition

  hand: Card[]
  validCardIds: string[]

  tricks: Trick[]
  currentTrick: Trick | null
  playHistory: TrickCard[]

  vorbehaltActivePlayerId?: string

  announcements: Announcement[]
  score: { re: number; kontra: number }
  isFinished: boolean
  gameEndResult?: GameEndResult

  // ====== Spielzettel (P5) ======
  /** Spielnummer in der aktuellen 20er-Runde (1..totalGames) */
  gameNumber: number
  /** Spiele pro Runde, default 20 */
  totalGames: number
  /** Akkumulierte Punkte pro Spieler über alle bisherigen Spiele der Runde */
  cumulativeScore: Record<string, number>
  /** History der bisherigen Spiele dieser Runde */
  gameHistory: GameHistoryEntry[]
  /** Welche Spieler haben ihr Pflichtsolo schon gespielt */
  pflichtsoloPlayed: Record<string, boolean>
}

// ============================================================================
// WEBSOCKET MESSAGES
// ============================================================================

export type ClientMessage =
  | { type: 'game:join'; payload: { gameId: string; playerName: string } }
  | { type: 'game:play-card'; payload: { cardId: string } }
  | { type: 'game:announce'; payload: { announcementType: AnnouncementType } }
  | { type: 'game:state-request'; payload: { gameId: string } }
  | { type: 'game:leave'; payload: { reason?: string } }
  | { type: 'game:declare-vorbehalt'; payload: { decision: 'gesund' | 'vorbehalt' } }
  | { type: 'game:choose-vorbehalt-type'; payload: { type: VorbehaltDecision } }
  /** Mensch ist bereit, das Spiel zu starten (nach ready-to-play). */
  | { type: 'game:start-playing'; payload: Record<string, never> }
  /** Mensch will das nächste Spiel der Runde starten (nach finished). */
  | { type: 'game:next-game'; payload: Record<string, never> }

export type ServerMessage =
  | { type: 'game:state-updated'; payload: GameState }
  | {
      type: 'game:card-played'
      payload: { playerId: string; card: Card; timestamp: number }
    }
  | {
      type: 'game:trick-won'
      payload: { winnerId: string; trickId: string; points: number }
    }
  | { type: 'game:announcement'; payload: Announcement }
  | { type: 'game:error'; payload: { code: GameErrorCode; message: string } }
  | { type: 'game:joined'; payload: { playerId: string; gameState: GameState } }
  | { type: 'game:ended'; payload: GameEndResult }

// ============================================================================
// ERRORS
// ============================================================================

export type GameErrorCode =
  | 'invalid-card'
  | 'not-your-turn'
  | 'game-not-found'
  | 'connection-lost'
  | 'server-error'
  | 'rule-violation'
  | 'announcement-invalid'
  | 'vorbehalt-invalid'
  | 'phase-invalid'
