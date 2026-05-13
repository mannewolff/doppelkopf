/**
 * GameEngine — koordiniert Spielablauf, Validierung und Zustandsübergänge.
 *
 * MVP: Normalspiel, 1 Human vs. 3 KI, in-memory.
 *
 * Verantwortungen:
 * - Spiel erzeugen (Mischen, Verteilen, Parteien)
 * - Karte spielen (Validieren, Stich abschließen, Score updaten)
 * - Ansagen entgegennehmen (Zeitpunkt/Kartenzahl validieren)
 * - Spielende erkennen (12 Stiche gespielt) und Endergebnis berechnen
 */

import type {
  Announcement,
  AnnouncementType,
  Card,
  GameEndResult,
  GameState as PublicGameState,
  Player,
  PlayerPosition,
  Trick,
  TrickCard,
} from '../shared/types.js'
import {
  ANNOUNCEMENT_MIN_CARDS,
  HAND_SIZE,
  TRICKS_PER_GAME,
  isKreuzDame,
  sumEyes,
} from '../shared/rules.js'
import {
  dealCards3334,
  generateDeck,
  shuffleAuthentic,
  sortHandForDisplay,
  type Rng,
} from './Deck.js'
import {
  computeValidCardIds,
  determineTrickWinner,
  isValidPlay,
} from './RulesValidator.js'
import {
  findPlayer,
  getHand,
  isAnnouncementAlready,
  nextPositionClockwise,
  newTrickId,
  type InternalGameState,
} from './GameState.js'
import {
  computeScore,
  type AnnouncementsByParty,
  type Party,
  type PartyAssignment,
} from './ScoringEngine.js'

export const HUMAN_PLAYER_ID = 'player-human-001'
export const AI_PLAYER_IDS = ['ai-1', 'ai-2', 'ai-3'] as const

export interface CreateGameOptions {
  gameId: string
  humanPlayerName: string
  rng?: Rng
}

export interface PlayResult {
  card: Card
  /** Wurde der Stich durch diesen Zug vervollständigt? */
  trickFinished: boolean
  /** Falls trickFinished: ID des Stich-Gewinners + Punkte */
  trickWinnerId?: string
  trickPoints?: number
  /** Wurde das Spiel durch diesen Zug beendet? */
  gameFinished: boolean
  gameEndResult?: GameEndResult
}

export class GameEngine {
  private state: InternalGameState

  constructor(opts: CreateGameOptions) {
    this.state = createInitialState(opts)
  }

  /** Vollständiger Server-Zustand (nicht an Clients senden!). */
  internal(): InternalGameState {
    return this.state
  }

  /**
   * Spieler-spezifische öffentliche Sicht.
   * Enthält nur die Hand des angefragten Spielers + dessen validCardIds.
   */
  publicViewFor(playerId: string): PublicGameState {
    const state = this.state
    const isCurrent = state.currentPlayerId === playerId
    const hand = state.hands.get(playerId) ?? []
    const validCardIds = isCurrent
      ? computeValidCardIds({
          hand,
          trickCards: state.currentTrick.cards,
        })
      : []

    const handForView = sortHandForDisplay(hand)

    return {
      gameId: state.gameId,
      phase: state.phase,
      gameType: state.gameType,
      round: state.round,
      players: state.players.map((p) => ({
        ...p,
        announcements: [...p.announcements],
      })),
      currentPlayerId: state.currentPlayerId,
      currentPlayerPosition: state.currentPlayerPosition,
      hand: handForView,
      validCardIds,
      tricks: state.tricks.map(cloneTrick),
      currentTrick: state.currentTrick.cards.length === 0 && state.tricks.length === TRICKS_PER_GAME
        ? null
        : cloneTrick(state.currentTrick),
      playHistory: state.playHistory.map((tc) => ({ ...tc })),
      announcements: state.announcements.map((a) => ({ ...a })),
      score: { ...state.score },
      isFinished: state.isFinished,
      ...(state.isFinished ? { gameEndResult: this.buildEndResult() } : {}),
    }
  }

  /**
   * Hauptaktion: Karte legen.
   * Wirft GameRuleError bei Verstößen.
   */
  playCard(playerId: string, cardId: string): PlayResult {
    const state = this.state

    if (state.isFinished) {
      throw new GameRuleError('rule-violation', 'Game already finished')
    }
    if (state.currentPlayerId !== playerId) {
      throw new GameRuleError('not-your-turn', 'Not your turn')
    }

    const hand = getHand(state, playerId)
    const cardIndex = hand.findIndex((c) => c.id === cardId)
    if (cardIndex === -1) {
      throw new GameRuleError('invalid-card', 'Card not in your hand')
    }
    const card = hand[cardIndex]
    if (!card) throw new GameRuleError('invalid-card', 'Card not in your hand')

    const valid = isValidPlay(card, {
      hand,
      trickCards: state.currentTrick.cards,
    })
    if (!valid) {
      throw new GameRuleError('invalid-card', 'Bedienungspflicht: Karte muss bedient werden')
    }

    // Karte aus Hand entfernen
    hand.splice(cardIndex, 1)
    const player = findPlayer(state, playerId)
    player.cardsRemaining = hand.length

    // In Stich legen
    const trickCard: TrickCard = {
      playerId,
      card,
      playedAt: Date.now(),
    }
    state.currentTrick.cards.push(trickCard)
    state.playHistory.push(trickCard)

    const result: PlayResult = {
      card,
      trickFinished: false,
      gameFinished: false,
    }

    if (state.currentTrick.cards.length === 4) {
      this.finishCurrentTrick(result)
    } else {
      this.advanceToNextPlayer()
    }

    return result
  }

  private finishCurrentTrick(result: PlayResult): void {
    const state = this.state
    const winnerCard = determineTrickWinner(state.currentTrick.cards)
    const points = sumEyes(state.currentTrick.cards.map((tc) => tc.card))

    state.currentTrick.winnerId = winnerCard.playerId
    state.currentTrick.points = points

    // Live-Augen-Summe für UI (Partei-Augen)
    const winnerParty = this.partyOf(winnerCard.playerId)
    if (winnerParty === 're') {
      state.score.re += points
    } else if (winnerParty === 'kontra') {
      state.score.kontra += points
    }

    state.tricks.push(state.currentTrick)

    result.trickFinished = true
    result.trickWinnerId = winnerCard.playerId
    result.trickPoints = points

    if (state.tricks.length >= TRICKS_PER_GAME) {
      this.finishGame(result)
      return
    }

    // Neuer Stich, Sieger spielt aus
    const winnerPlayer = findPlayer(state, winnerCard.playerId)
    state.currentTrick = {
      id: newTrickId(state),
      cards: [],
      points: 0,
    }
    state.currentPlayerId = winnerPlayer.id
    state.currentPlayerPosition = winnerPlayer.position
  }

  private finishGame(result: PlayResult): void {
    const state = this.state
    state.isFinished = true
    state.phase = 'finished'
    result.gameFinished = true
    result.gameEndResult = this.buildEndResult()
  }

  private advanceToNextPlayer(): void {
    const state = this.state
    const nextPos = nextPositionClockwise(state.currentPlayerPosition)
    const next = state.players.find((p) => p.position === nextPos)
    if (!next) throw new Error('Next player not found')
    state.currentPlayerId = next.id
    state.currentPlayerPosition = next.position
  }

  /**
   * Ansage entgegennehmen.
   * Validiert Kartenzahl + Duplikat-Verhinderung.
   *
   * MVP: Re-Voraussetzung "geklärt = Spieler hat Kreuz-Dame" wird im Normalspiel
   * über die initial zugewiesene Partei abgeprüft. Spieler muss Re ansagen können
   * (= Re-Partei) bzw. Kontra (= Kontra-Partei). Folge-Ansagen (90/60/...)
   * setzen voraus, dass die eigene Partei zuvor Re/Kontra angesagt hat.
   */
  makeAnnouncement(playerId: string, type: AnnouncementType): Announcement {
    const state = this.state
    if (state.isFinished) {
      throw new GameRuleError('announcement-invalid', 'Game already finished')
    }

    const player = findPlayer(state, playerId)
    const handSize = (state.hands.get(playerId) ?? []).length
    const minCards = ANNOUNCEMENT_MIN_CARDS[type]
    if (handSize < minCards) {
      throw new GameRuleError(
        'announcement-invalid',
        `Ansage zu spät: brauchst noch ${minCards} Karten in Hand, hast aber nur ${handSize}.`,
      )
    }

    if (isAnnouncementAlready(state, playerId, type)) {
      throw new GameRuleError('announcement-invalid', 'Diese Ansage hast du bereits gemacht.')
    }

    const playerParty = player.party
    if (type === 're') {
      if (playerParty !== 're') {
        throw new GameRuleError('announcement-invalid', 'Re darf nur die Re-Partei ansagen.')
      }
    } else if (type === 'kontra') {
      if (playerParty !== 'kontra') {
        throw new GameRuleError('announcement-invalid', 'Kontra darf nur die Kontra-Partei ansagen.')
      }
    } else {
      // Folge-Ansagen: eigene Partei muss vorher Re bzw. Kontra angesagt haben.
      const ownPartyType: AnnouncementType = playerParty === 're' ? 're' : 'kontra'
      const hasFirst = state.announcements.some((a) => {
        const otherParty = this.partyOf(a.playerId)
        return otherParty === playerParty && a.type === ownPartyType
      })
      if (!hasFirst) {
        throw new GameRuleError(
          'announcement-invalid',
          'Folgeansage erfordert vorherige Erstansage der eigenen Partei.',
        )
      }
    }

    const ann: Announcement = {
      id: `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      playerId,
      playerName: player.name,
      type,
      timestamp: Date.now(),
    }
    state.announcements.push(ann)
    player.announcements.push(ann)
    return ann
  }

  private partyOf(playerId: string): Party | undefined {
    const p = this.state.players.find((pl) => pl.id === playerId)
    if (!p) return undefined
    if (p.party === 're') return 're'
    if (p.party === 'kontra') return 'kontra'
    return undefined
  }

  private buildEndResult(): GameEndResult {
    const state = this.state
    const parties = this.partyAssignment()
    const groupedAnnouncements = this.announcementsByParty()
    const score = computeScore({
      tricks: state.tricks,
      parties,
      announcements: groupedAnnouncements,
    })

    const reIds: string[] = []
    const kontraIds: string[] = []
    for (const p of state.players) {
      if (p.party === 're') reIds.push(p.id)
      else if (p.party === 'kontra') kontraIds.push(p.id)
    }

    return {
      gameId: state.gameId,
      winner: score.winner,
      finalScore: score.winner === 're' ? score.reScore : score.kontraScore,
      statistics: {
        re: { players: reIds, score: score.reScore },
        kontra: { players: kontraIds, score: score.kontraScore },
        tricks: state.tricks.length,
        announcements: state.announcements.map((a) => ({ ...a })),
      },
      playedAt: Date.now(),
    }
  }

  private partyAssignment(): PartyAssignment {
    const map = new Map<string, Party>()
    for (const p of this.state.players) {
      if (p.party === 're') map.set(p.id, 're')
      else if (p.party === 'kontra') map.set(p.id, 'kontra')
    }
    return { byPlayer: map }
  }

  private announcementsByParty(): AnnouncementsByParty {
    const re: AnnouncementType[] = []
    const kontra: AnnouncementType[] = []
    for (const a of this.state.announcements) {
      const party = this.partyOf(a.playerId)
      if (party === 're') re.push(a.type)
      else if (party === 'kontra') kontra.push(a.type)
    }
    return { re, kontra }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

function createInitialState(opts: CreateGameOptions): InternalGameState {
  const { gameId, humanPlayerName, rng } = opts

  const playerOrder: ReadonlyArray<string> = [
    'ai-1',
    'ai-2',
    'ai-3',
    HUMAN_PLAYER_ID,
  ]

  const deck = shuffleAuthentic(generateDeck(), rng)
  const dealt = dealCards3334(deck, playerOrder)

  const hands = new Map<string, Card[]>()
  for (const id of playerOrder) {
    const h = dealt[id]
    if (!h) throw new Error('Deal failed')
    hands.set(id, h)
  }

  const players: Player[] = [
    {
      id: 'ai-1',
      name: 'KI Nord',
      position: 1,
      party: null,
      isAI: true,
      announcements: [],
      cardsRemaining: HAND_SIZE,
    },
    {
      id: 'ai-2',
      name: 'KI Ost',
      position: 2,
      party: null,
      isAI: true,
      announcements: [],
      cardsRemaining: HAND_SIZE,
    },
    {
      id: 'ai-3',
      name: 'KI West',
      position: 3,
      party: null,
      isAI: true,
      announcements: [],
      cardsRemaining: HAND_SIZE,
    },
    {
      id: HUMAN_PLAYER_ID,
      name: humanPlayerName || 'You',
      position: 4,
      party: null,
      isAI: false,
      announcements: [],
      cardsRemaining: HAND_SIZE,
    },
  ]

  assignPartiesByKreuzDamen(players, hands)

  // Position 1 spielt zum ersten Stich auf (linker Nachbar des Gebers = Position 4)
  const startPlayer = players.find((p) => p.position === 1)
  if (!startPlayer) throw new Error('Start player missing')

  const firstTrick: Trick = {
    id: 'trick-1',
    cards: [],
    points: 0,
  }

  return {
    gameId,
    phase: 'playing',
    gameType: 'normalspiel',
    round: 1,
    players,
    playerOrder,
    currentPlayerId: startPlayer.id,
    currentPlayerPosition: startPlayer.position,
    hands,
    tricks: [],
    currentTrick: firstTrick,
    playHistory: [],
    announcements: [],
    score: { re: 0, kontra: 0 },
    isFinished: false,
    version: Date.now(),
  }
}

/**
 * Normalspiel: Spieler mit mindestens einer Kreuz-Dame = Re-Partei.
 * Sollten alle Kreuz-Damen bei einem Spieler liegen, ist das die Hochzeit
 * (für MVP behandeln wir das als Re-Spieler allein -> Solo-ähnlich, ABER
 * Briefing fokussiert Normalspiel ohne Hochzeit). Wir loggen es und legen
 * den Hochzeiter trotzdem als Re fest; die übrigen drei sind Kontra.
 */
function assignPartiesByKreuzDamen(players: Player[], hands: Map<string, Card[]>): void {
  for (const p of players) {
    const hand = hands.get(p.id) ?? []
    const hasKreuzDame = hand.some((c) => isKreuzDame(c))
    p.party = hasKreuzDame ? 're' : 'kontra'
  }
}

function cloneTrick(t: Trick): Trick {
  const cloned: Trick = {
    id: t.id,
    cards: t.cards.map((tc) => ({ ...tc, card: { ...tc.card } })),
    points: t.points,
  }
  if (t.winnerId !== undefined) cloned.winnerId = t.winnerId
  return cloned
}

// ============================================================================
// ERROR
// ============================================================================

export type GameRuleErrorCode =
  | 'invalid-card'
  | 'not-your-turn'
  | 'rule-violation'
  | 'announcement-invalid'

export class GameRuleError extends Error {
  readonly code: GameRuleErrorCode
  constructor(code: GameRuleErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'GameRuleError'
  }
}
