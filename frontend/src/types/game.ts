/**
 * Doppelkopf Game Types
 * Complete type-safe contract between Frontend and Backend
 */

// ============================================================================
// PRIMITIVES
// ============================================================================

export type Suit = 'clubs' | 'spades' | 'hearts' | 'diamonds'
export type Rank = 'ace' | 'ten' | 'king' | 'queen' | 'jack' | 'nine'

export interface Card {
  id: string // e.g., 'clubs-ten-abc123'
  suit: Suit
  rank: Rank
}

// ============================================================================
// PLAYER & PARTY
// ============================================================================

export type Party = 're' | 'kontra' | 'solo' | null // null = unresolved
export type PlayerPosition = 1 | 2 | 3 | 4
export type AnnouncementType = 're' | 'kontra' | '90' | '60' | '30' | 'schwarz'

export interface Announcement {
  id: string
  playerId: string
  playerName: string
  type: AnnouncementType
  timestamp: number
}

export interface Player {
  id: string
  name: string
  position: PlayerPosition
  party: Party
  isAI: boolean
  announcements: Announcement[]
  cardsRemaining: number
  /**
   * Decision in Vorbehalt phase ('gesund' or specific vorbehalt type).
   * undefined = has not decided yet
   */
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
  winnerId?: string // undefined until trick finishes
  cards: TrickCard[]
  points: number
}

// ============================================================================
// GAME STATE (Server → Client)
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
 *  - waiting: Spielsetup, Karten werden verteilt
 *  - finding: Vorbehalt-Frage reihum (Phase 1)
 *  - finding-vorbehalt-type: Spieler mit Vorbehalt wählt Typ (Phase 2)
 *  - ready-to-play: Karten sind sortiert, Mensch klickt „Spiel starten"
 *  - playing: Spiel läuft
 *  - finished: Spiel beendet, kann mit „Nächstes Spiel" fortsetzen
 *  - round-finished: 20-Spiele-Runde komplett, Endabrechnung
 */
export type GamePhase =
  | 'waiting'
  | 'finding'
  | 'finding-vorbehalt-type'
  | 'ready-to-play'
  | 'playing'
  | 'finished'
  | 'round-finished'

/**
 * Entscheidung in der Vorbehalt-Phase.
 * 'gesund' = kein Vorbehalt, Normalspiel
 * Andere = konkreter Vorbehalt-Typ
 */
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

/**
 * Snapshot of one completed game within a Spielzettel round.
 */
export interface GameHistoryEntry {
  gameNumber: number
  gameType: GameType
  winnerParty: 're' | 'kontra'
  pointValue: number
  /** playerId of the solo player, if this game was a solo */
  soloPlayer?: string
}

export interface GameState {
  gameId: string
  phase: GamePhase
  gameType: GameType
  round: number

  // Players
  players: Player[]
  currentPlayerId: string
  currentPlayerPosition: PlayerPosition

  // Cards
  hand: Card[] // Only visible to the player
  validCardIds: string[] // Server-provided; frontend computes its own

  // History (in this single game)
  tricks: Trick[]
  currentTrick: Trick | null
  playHistory: TrickCard[]

  // Vorbehalt phase tracking
  /** Player ID who declared "Vorbehalt" (during phase 'finding-vorbehalt-type') */
  vorbehaltActivePlayerId?: string

  // Status
  announcements: Announcement[]
  /**
   * Current trick-points per party. `null` means: not yet revealed to this
   * client (Spoiler-Schutz before parties are clarified).
   */
  score: { re: number | null; kontra: number | null }
  isFinished: boolean
  gameEndResult?: {
    winner: 're' | 'kontra'
    finalScore: number
    statistics: GameStatistics
  }

  // Spielzettel (Round of N games, default 20)
  /** Current game number within the round (1..totalGames) */
  gameNumber: number
  /** Games per round (default 20) */
  totalGames: number
  /** Cumulative score across all completed games of this round, per playerId */
  cumulativeScore: Record<string, number>
  /** History of completed games in this round */
  gameHistory: GameHistoryEntry[]
  /** Tracks which players have already played their mandatory solo (Pflichtsolo) */
  pflichtsoloPlayed: Record<string, boolean>
}

export interface GameStatistics {
  re: { players: string[]; score: number }
  kontra: { players: string[]; score: number }
  tricks: number
  announcements: Announcement[]
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
  /** Phase 1: declare gesund or vorbehalt */
  | { type: 'game:declare-vorbehalt'; payload: { decision: 'gesund' | 'vorbehalt' } }
  /** Phase 2: choose specific vorbehalt type */
  | { type: 'game:choose-vorbehalt-type'; payload: { type: VorbehaltDecision } }
  /** Wait phase: human signals readiness, server starts the play */
  | { type: 'game:start-playing'; payload: Record<string, never> }
  /** After phase 'finished': human starts the next game in the round */
  | { type: 'game:next-game'; payload: Record<string, never> }

export type ServerMessage =
  | { type: 'game:state-updated'; payload: GameState }
  | { type: 'game:card-played'; payload: { playerId: string; card: Card; timestamp: number } }
  | { type: 'game:trick-won'; payload: { winnerId: string; trickId: string; points: number } }
  | { type: 'game:announcement'; payload: Announcement }
  | { type: 'game:error'; payload: { code: string; message: string } }
  | { type: 'game:joined'; payload: { playerId: string; gameState: GameState } }
  | { type: 'game:ended'; payload: GameEndResult }

export interface GameEndResult {
  gameId: string
  winner: 're' | 'kontra'
  finalScore: number
  statistics: GameStatistics
  playedAt: number
}

// ============================================================================
// UI STATE (Frontend-only)
// ============================================================================

export interface UIState {
  selectedCardId: string | null
  isAnimating: boolean
  hoveredPlayerId: string | null
  showAnnouncementButtons: boolean
  viewport: 'mobile' | 'tablet' | 'desktop'
  notifications: Toast[]
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
}

// ============================================================================
// ERRORS
// ============================================================================

export type GameErrorCode =
  | 'invalid-card'
  | 'not-your-turn'
  | 'game-not-found'
  | 'connection-lost'
  | 'server-error'

export interface GameError {
  code: GameErrorCode
  message: string
  timestamp: number
}
