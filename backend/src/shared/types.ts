/**
 * Doppelkopf Game Types — kopiert vom Frontend (frontend/src/types/game.ts).
 * Diese Datei MUSS strukturell identisch zum Frontend bleiben, da sie
 * den WebSocket-Contract definiert.
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

export interface Player {
  id: string
  name: string
  position: PlayerPosition
  party: Party
  isAI: boolean
  announcements: Announcement[]
  cardsRemaining: number
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

export type GameType = 'normalspiel' | 'solo' | 'hochzeit'
export type GamePhase = 'waiting' | 'playing' | 'finished'

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

  announcements: Announcement[]
  score: { re: number; kontra: number }
  isFinished: boolean
  gameEndResult?: GameEndResult
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
