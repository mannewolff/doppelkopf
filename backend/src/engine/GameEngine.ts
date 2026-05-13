/**
 * GameEngine — koordiniert Spielablauf, Validierung und Zustandsübergänge.
 *
 * Phasenablauf:
 *  - 'finding'                : Vorbehalt-Frage reihum
 *  - 'finding-vorbehalt-type' : Vorbehalt-Spieler wählt Typ (MVP: nur 'hochzeit')
 *  - 'ready-to-play'          : Karten verteilt, wartet auf game:start-playing
 *  - 'playing'                : 12 Stiche
 *  - 'finished'               : Spielende, wartet auf game:next-game
 *  - 'round-finished'         : 20er-Runde komplett
 *
 * MVP: Normalspiel + Hochzeit (vereinfacht), 1 Human vs. 3 KI, in-memory.
 *
 * Spoiler-Schutz (publicViewFor):
 *  - Andere Spieler `party` ist `null`, bis sie sich "geoutet" haben
 *    (Re/Kontra-Ansage, Kreuz-Dame ausgespielt, Hochzeit-Anmeldung, oder Spielende).
 *  - Eigene `party` ist immer echt.
 *  - Score bleibt numerisch (Briefing-Alternative).
 */

import type {
  Announcement,
  AnnouncementType,
  Card,
  GameEndResult,
  GameHistoryEntry,
  GamePhase,
  GameState as PublicGameState,
  GameType,
  Player,
  PlayerPosition,
  Trick,
  TrickCard,
  VorbehaltDecision,
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
export const DEFAULT_TOTAL_GAMES = 20

export interface CreateGameOptions {
  gameId: string
  humanPlayerName: string
  rng?: Rng
  totalGames?: number
}

export interface PlayResult {
  card: Card
  trickFinished: boolean
  trickWinnerId?: string
  trickPoints?: number
  gameFinished: boolean
  gameEndResult?: GameEndResult
}

export interface VorbehaltResult {
  transitionedToReady: boolean
  awaitingVorbehaltType: boolean
}

export interface NextGameResult {
  /** True wenn ein neues Spiel gestartet wurde (phase wieder 'finding'). */
  startedNewGame: boolean
  /** True wenn die 20er-Runde abgeschlossen ist (phase 'round-finished'). */
  roundFinished: boolean
}

export class GameEngine {
  private state: InternalGameState
  /** Optionaler RNG für Reproduzierbarkeit (Tests). */
  private readonly rng: Rng | undefined

  constructor(opts: CreateGameOptions) {
    this.rng = opts.rng
    this.state = createInitialState({
      gameId: opts.gameId,
      humanPlayerName: opts.humanPlayerName,
      rng: opts.rng,
      totalGames: opts.totalGames ?? DEFAULT_TOTAL_GAMES,
    })
  }

  internal(): InternalGameState {
    return this.state
  }

  // ========================================================================
  // PUBLIC VIEW (Spoiler-Schutz inbegriffen)
  // ========================================================================

  publicViewFor(playerId: string): PublicGameState {
    const state = this.state
    const isCurrent = state.currentPlayerId === playerId
    const hand = state.hands.get(playerId) ?? []
    const validCardIds =
      isCurrent && state.phase === 'playing'
        ? computeValidCardIds({ hand, trickCards: state.currentTrick.cards })
        : []

    const handForView = sortHandForDisplay(hand)

    return {
      gameId: state.gameId,
      phase: state.phase,
      gameType: state.gameType,
      round: state.round,
      players: state.players.map((p) => this.publicPlayer(p, playerId)),
      currentPlayerId: state.currentPlayerId,
      currentPlayerPosition: state.currentPlayerPosition,
      hand: handForView,
      validCardIds,
      tricks: state.tricks.map(cloneTrick),
      currentTrick:
        state.currentTrick.cards.length === 0 && state.tricks.length === TRICKS_PER_GAME
          ? null
          : cloneTrick(state.currentTrick),
      playHistory: state.playHistory.map((tc) => ({ ...tc })),
      announcements: state.announcements.map((a) => ({ ...a })),
      score: { ...state.score },
      isFinished: state.isFinished,
      ...(state.vorbehaltActivePlayerId
        ? { vorbehaltActivePlayerId: state.vorbehaltActivePlayerId }
        : {}),
      ...(state.isFinished ? { gameEndResult: this.buildEndResult() } : {}),
      gameNumber: state.gameNumber,
      totalGames: state.totalGames,
      cumulativeScore: { ...state.cumulativeScore },
      gameHistory: state.gameHistory.map((h) => ({ ...h })),
      pflichtsoloPlayed: { ...state.pflichtsoloPlayed },
    }
  }

  private publicPlayer(player: Player, viewerId: string): Player {
    const isSelf = player.id === viewerId
    const partyVisible =
      this.state.isFinished || isSelf || this.hasPartyBeenRevealed(player.id)

    const out: Player = {
      id: player.id,
      name: player.name,
      position: player.position,
      party: partyVisible ? player.party : null,
      isAI: player.isAI,
      announcements: [...player.announcements],
      cardsRemaining: player.cardsRemaining,
    }
    if (player.vorbehaltDecision !== undefined) {
      out.vorbehaltDecision = player.vorbehaltDecision
    }
    return out
  }

  private hasPartyBeenRevealed(playerId: string): boolean {
    for (const a of this.state.announcements) {
      if (a.playerId === playerId && (a.type === 're' || a.type === 'kontra')) {
        return true
      }
    }
    for (const tc of this.state.playHistory) {
      if (tc.playerId === playerId && isKreuzDame(tc.card)) return true
    }
    if (this.state.gameType === 'hochzeit') {
      const player = this.state.players.find((p) => p.id === playerId)
      if (player?.vorbehaltDecision === 'hochzeit') return true
    }
    return false
  }

  // ========================================================================
  // VORBEHALTSPHASE
  // ========================================================================

  declareVorbehalt(
    playerId: string,
    decision: 'gesund' | 'vorbehalt',
  ): VorbehaltResult {
    const state = this.state
    if (state.phase !== 'finding') {
      throw new GameRuleError('vorbehalt-invalid', 'Nicht in Vorbehalts-Phase.')
    }
    if (state.currentPlayerId !== playerId) {
      throw new GameRuleError('not-your-turn', 'Du bist nicht am Zug.')
    }
    const player = findPlayer(state, playerId)
    if (player.vorbehaltDecision !== undefined) {
      throw new GameRuleError('vorbehalt-invalid', 'Bereits entschieden.')
    }

    if (decision === 'vorbehalt') {
      state.phase = 'finding-vorbehalt-type'
      state.vorbehaltActivePlayerId = playerId
      return { transitionedToReady: false, awaitingVorbehaltType: true }
    }

    player.vorbehaltDecision = 'gesund'

    const allAnswered = state.players.every((p) => p.vorbehaltDecision === 'gesund')
    if (allAnswered) {
      this.prepareForPlay('normalspiel')
      return { transitionedToReady: true, awaitingVorbehaltType: false }
    }
    this.advanceToNextPlayer()
    return { transitionedToReady: false, awaitingVorbehaltType: false }
  }

  chooseVorbehaltType(playerId: string, type: VorbehaltDecision): void {
    const state = this.state
    if (state.phase !== 'finding-vorbehalt-type') {
      throw new GameRuleError('vorbehalt-invalid', 'Nicht in Vorbehalt-Typ-Phase.')
    }
    if (state.vorbehaltActivePlayerId !== playerId) {
      throw new GameRuleError('vorbehalt-invalid', 'Du hast keinen Vorbehalt angemeldet.')
    }
    if (type === 'gesund') {
      throw new GameRuleError(
        'vorbehalt-invalid',
        '"gesund" ist kein gültiger Vorbehalt-Typ.',
      )
    }
    if (type !== 'hochzeit') {
      throw new GameRuleError(
        'vorbehalt-invalid',
        `Vorbehalt-Typ "${type}" ist im MVP noch nicht unterstützt.`,
      )
    }

    const hand = getHand(state, playerId)
    const kreuzDamen = hand.filter((c) => isKreuzDame(c))
    if (kreuzDamen.length < 2) {
      throw new GameRuleError(
        'vorbehalt-invalid',
        'Hochzeit nur möglich, wenn beide Kreuz-Damen in deiner Hand sind.',
      )
    }

    const player = findPlayer(state, playerId)
    player.vorbehaltDecision = 'hochzeit'
    for (const p of state.players) {
      if (p.id !== playerId && p.vorbehaltDecision === undefined) {
        p.vorbehaltDecision = 'gesund'
      }
    }

    this.prepareForPlay('hochzeit', playerId)
  }

  /**
   * Wechsel in 'ready-to-play': Parteien zuweisen, Ausspielspieler setzen,
   * aber WARTEN auf game:start-playing vor dem ersten Zug.
   */
  private prepareForPlay(gameType: GameType, hochzeiterId?: string): void {
    const state = this.state
    state.gameType = gameType
    state.phase = 'ready-to-play'
    delete state.vorbehaltActivePlayerId

    assignParties(state.players, state.hands, gameType, hochzeiterId)

    const startPos = firstPlayerPosition(state.dealerPosition)
    const startPlayer = state.players.find((p) => p.position === startPos)
    if (!startPlayer) throw new Error(`No player at position ${startPos}`)
    state.currentPlayerId = startPlayer.id
    state.currentPlayerPosition = startPlayer.position
  }

  /**
   * Mensch klickt "Spiel starten". Wechsel von ready-to-play → playing.
   * Nur der Mensch darf dieses Event auslösen.
   */
  startPlaying(playerId: string): void {
    const state = this.state
    if (state.phase !== 'ready-to-play') {
      throw new GameRuleError(
        'phase-invalid',
        `start-playing nur in Phase 'ready-to-play' erlaubt.`,
      )
    }
    if (playerId !== HUMAN_PLAYER_ID) {
      throw new GameRuleError('phase-invalid', 'Nur der Mensch darf das Spiel starten.')
    }
    state.phase = 'playing'
  }

  // ========================================================================
  // NÄCHSTES SPIEL / RUNDE
  // ========================================================================

  /**
   * Mensch will das nächste Spiel der 20er-Runde starten.
   * Voraussetzung: aktuelles Spiel ist 'finished'.
   *
   * Rotiert Geber, verteilt neu, akkumuliert Spielzettel.
   * Wenn gameNumber+1 > totalGames → phase = 'round-finished' (kein neues Spiel).
   */
  nextGame(playerId: string): NextGameResult {
    const state = this.state
    if (state.phase !== 'finished') {
      throw new GameRuleError(
        'phase-invalid',
        `next-game nur in Phase 'finished' erlaubt.`,
      )
    }
    if (playerId !== HUMAN_PLAYER_ID) {
      throw new GameRuleError('phase-invalid', 'Nur der Mensch darf das nächste Spiel starten.')
    }

    // Spielzettel-Update (Score-Akku, History, Pflichtsolo-Tracking) wurde
    // bereits beim Spielende vorgenommen (recordCompletedGame). Hier nur Übergang.
    const nextGameNumber = state.gameNumber + 1
    if (nextGameNumber > state.totalGames) {
      state.phase = 'round-finished'
      return { startedNewGame: false, roundFinished: true }
    }

    // Geber rotiert (Position rotiert im Uhrzeigersinn weiter)
    state.dealerPosition = nextPositionClockwise(state.dealerPosition)

    // Neue Karten, Reset alle "Spielzustand"-Felder. Spielzettel bleibt erhalten.
    resetForNewDeal(state, this.rng, nextGameNumber)

    return { startedNewGame: true, roundFinished: false }
  }

  // ========================================================================
  // KARTE SPIELEN
  // ========================================================================

  playCard(playerId: string, cardId: string): PlayResult {
    const state = this.state

    if (state.phase !== 'playing') {
      throw new GameRuleError('rule-violation', 'Kartenspielen nur in Phase "playing" möglich.')
    }
    if (state.isFinished) {
      throw new GameRuleError('rule-violation', 'Spiel bereits beendet.')
    }
    if (state.currentPlayerId !== playerId) {
      throw new GameRuleError('not-your-turn', 'Du bist nicht am Zug.')
    }

    const hand = getHand(state, playerId)
    const cardIndex = hand.findIndex((c) => c.id === cardId)
    if (cardIndex === -1) {
      throw new GameRuleError('invalid-card', 'Karte nicht in deiner Hand.')
    }
    const card = hand[cardIndex]
    if (!card) throw new GameRuleError('invalid-card', 'Karte nicht in deiner Hand.')

    const valid = isValidPlay(card, {
      hand,
      trickCards: state.currentTrick.cards,
    })
    if (!valid) {
      throw new GameRuleError('invalid-card', 'Bedienungspflicht: Karte muss bedient werden.')
    }

    hand.splice(cardIndex, 1)
    const player = findPlayer(state, playerId)
    player.cardsRemaining = hand.length

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

    const winnerParty = this.partyOf(winnerCard.playerId)
    if (winnerParty === 're') state.score.re += points
    else if (winnerParty === 'kontra') state.score.kontra += points

    state.tricks.push(state.currentTrick)

    result.trickFinished = true
    result.trickWinnerId = winnerCard.playerId
    result.trickPoints = points

    if (state.tricks.length >= TRICKS_PER_GAME) {
      this.finishGame(result)
      return
    }

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
    const endResult = this.buildEndResult()
    result.gameFinished = true
    result.gameEndResult = endResult

    // Spielzettel-Akku + Pflichtsolo-Tracking
    this.recordCompletedGame(endResult)
  }

  private recordCompletedGame(endResult: GameEndResult): void {
    const state = this.state

    // Punkte pro Spieler akkumulieren
    for (const p of state.players) {
      const prev = state.cumulativeScore[p.id] ?? 0
      const partyScore =
        p.party === 're'
          ? endResult.statistics.re.score
          : p.party === 'kontra'
            ? endResult.statistics.kontra.score
            : 0
      state.cumulativeScore[p.id] = prev + partyScore
    }

    // Pflichtsolo-Tracking: nur "echte" Soli (nicht normalspiel, nicht hochzeit)
    if (state.gameType !== 'normalspiel' && state.gameType !== 'hochzeit') {
      const soloist = state.players.find((p) => p.party === 're')
      if (soloist) state.pflichtsoloPlayed[soloist.id] = true
    }

    // History-Eintrag
    const winnerScore =
      endResult.winner === 're'
        ? endResult.statistics.re.score
        : endResult.statistics.kontra.score
    const entry: GameHistoryEntry = {
      gameNumber: state.gameNumber,
      gameType: state.gameType,
      winnerParty: endResult.winner,
      pointValue: Math.abs(winnerScore),
    }
    if (state.gameType !== 'normalspiel' && state.gameType !== 'hochzeit') {
      const soloist = state.players.find((p) => p.party === 're')
      if (soloist) entry.soloPlayer = soloist.id
    }
    state.gameHistory.push(entry)
  }

  private advanceToNextPlayer(): void {
    const state = this.state
    const nextPos = nextPositionClockwise(state.currentPlayerPosition)
    const next = state.players.find((p) => p.position === nextPos)
    if (!next) throw new Error('Next player not found')
    state.currentPlayerId = next.id
    state.currentPlayerPosition = next.position
  }

  // ========================================================================
  // ANSAGEN
  // ========================================================================

  makeAnnouncement(playerId: string, type: AnnouncementType): Announcement {
    const state = this.state
    if (state.phase !== 'playing') {
      throw new GameRuleError(
        'announcement-invalid',
        'Ansagen nur während des Spiels möglich.',
      )
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

  // ========================================================================
  // INTERNAL HELPERS
  // ========================================================================

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
// FACTORY & STATE-RESET
// ============================================================================

interface InternalCreateOptions {
  gameId: string
  humanPlayerName: string
  rng: Rng | undefined
  totalGames: number
}

function createInitialState(opts: InternalCreateOptions): InternalGameState {
  const { gameId, humanPlayerName, rng, totalGames } = opts

  const playerOrder: ReadonlyArray<string> = [
    'ai-1',
    'ai-2',
    'ai-3',
    HUMAN_PLAYER_ID,
  ]

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

  const dealerPosition: PlayerPosition = 4
  const hands = dealNewHands(playerOrder, rng)

  const startPos = firstPlayerPosition(dealerPosition)
  const startPlayer = players.find((p) => p.position === startPos)
  if (!startPlayer) throw new Error('Start player missing')

  const firstTrick: Trick = {
    id: 'trick-1',
    cards: [],
    points: 0,
  }

  const phase: GamePhase = 'finding'

  const cumulativeScore: Record<string, number> = {}
  const pflichtsoloPlayed: Record<string, boolean> = {}
  for (const id of playerOrder) {
    cumulativeScore[id] = 0
    pflichtsoloPlayed[id] = false
  }

  return {
    gameId,
    phase,
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
    dealerPosition,
    gameNumber: 1,
    totalGames,
    cumulativeScore,
    gameHistory: [],
    pflichtsoloPlayed,
    version: Date.now(),
  }
}

/**
 * Reset für ein neues Spiel der laufenden 20er-Runde.
 * Behält: cumulativeScore, gameHistory, pflichtsoloPlayed, totalGames, players (Identität).
 */
function resetForNewDeal(
  state: InternalGameState,
  rng: Rng | undefined,
  nextGameNumber: number,
): void {
  // Spieler-spezifische Felder zurücksetzen
  for (const p of state.players) {
    p.party = null
    p.announcements = []
    p.cardsRemaining = HAND_SIZE
    delete p.vorbehaltDecision
  }

  state.gameNumber = nextGameNumber
  state.gameId = `${state.gameId.split('::g')[0]}::g${nextGameNumber}`
  state.gameType = 'normalspiel'
  state.round = 1
  state.hands = dealNewHands(state.playerOrder, rng)
  state.tricks = []
  state.currentTrick = { id: 'trick-1', cards: [], points: 0 }
  state.playHistory = []
  state.announcements = []
  state.score = { re: 0, kontra: 0 }
  state.isFinished = false
  delete state.vorbehaltActivePlayerId
  state.phase = 'finding'
  state.version = Date.now()

  const startPos = firstPlayerPosition(state.dealerPosition)
  const startPlayer = state.players.find((p) => p.position === startPos)
  if (!startPlayer) throw new Error(`No player at position ${startPos}`)
  state.currentPlayerId = startPlayer.id
  state.currentPlayerPosition = startPlayer.position
}

function dealNewHands(
  playerOrder: ReadonlyArray<string>,
  rng: Rng | undefined,
): Map<string, Card[]> {
  const deck = shuffleAuthentic(generateDeck(), rng)
  const dealt = dealCards3334(deck, playerOrder)
  const hands = new Map<string, Card[]>()
  for (const id of playerOrder) {
    const h = dealt[id]
    if (!h) throw new Error('Deal failed')
    hands.set(id, h)
  }
  return hands
}

/**
 * Ausspielspieler = linker Nachbar des Gebers (im Uhrzeigersinn).
 */
function firstPlayerPosition(dealer: PlayerPosition): PlayerPosition {
  return nextPositionClockwise(dealer)
}

function assignParties(
  players: Player[],
  hands: Map<string, Card[]>,
  gameType: GameType,
  hochzeiterId?: string,
): void {
  if (gameType === 'hochzeit') {
    if (!hochzeiterId) throw new Error('hochzeiterId required for Hochzeit')
    for (const p of players) {
      p.party = p.id === hochzeiterId ? 're' : 'kontra'
    }
    return
  }
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
  | 'vorbehalt-invalid'
  | 'phase-invalid'

export class GameRuleError extends Error {
  readonly code: GameRuleErrorCode
  constructor(code: GameRuleErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'GameRuleError'
  }
}
