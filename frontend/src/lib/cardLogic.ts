/**
 * Client-side card logic:
 *  - Sort hand by game type (trumps left, fail suits right)
 *  - Determine which cards are valid to play (Bedienungspflicht)
 *
 * The server is still the source of truth and will reject invalid moves,
 * but the client computes its own valid card set so the UI can disable
 * cards that would violate Bedienungspflicht without relying on the server
 * to spoonfeed `validCardIds`.
 */

import type { Card, GameState, GameType, Suit, Trick } from '../types/game'

// ============================================================================
// TRUMP & SORT DEFINITIONS
// ============================================================================

interface CardId {
  suit: Suit
  rank: Card['rank']
}

const NORMAL_TRUMP_ORDER: CardId[] = [
  { suit: 'hearts', rank: 'ten' },
  { suit: 'clubs', rank: 'queen' },
  { suit: 'spades', rank: 'queen' },
  { suit: 'hearts', rank: 'queen' },
  { suit: 'diamonds', rank: 'queen' },
  { suit: 'clubs', rank: 'jack' },
  { suit: 'spades', rank: 'jack' },
  { suit: 'hearts', rank: 'jack' },
  { suit: 'diamonds', rank: 'jack' },
  { suit: 'diamonds', rank: 'ace' },
  { suit: 'diamonds', rank: 'ten' },
  { suit: 'diamonds', rank: 'king' },
  { suit: 'diamonds', rank: 'nine' },
]

const NORMAL_FAIL_SUIT_ORDER: Suit[] = ['clubs', 'spades', 'hearts']
const FAIL_RANK_ORDER: Card['rank'][] = ['ace', 'ten', 'king', 'nine']

const QUEEN_SOLO_TRUMP_ORDER: CardId[] = [
  { suit: 'clubs', rank: 'queen' },
  { suit: 'spades', rank: 'queen' },
  { suit: 'hearts', rank: 'queen' },
  { suit: 'diamonds', rank: 'queen' },
]

const JACK_SOLO_TRUMP_ORDER: CardId[] = [
  { suit: 'clubs', rank: 'jack' },
  { suit: 'spades', rank: 'jack' },
  { suit: 'hearts', rank: 'jack' },
  { suit: 'diamonds', rank: 'jack' },
]

function buildColorSoloTrumpOrder(trumpSuit: Suit): CardId[] {
  if (trumpSuit === 'hearts') {
    return [
      { suit: 'hearts', rank: 'ten' },
      { suit: 'clubs', rank: 'queen' },
      { suit: 'spades', rank: 'queen' },
      { suit: 'hearts', rank: 'queen' },
      { suit: 'diamonds', rank: 'queen' },
      { suit: 'clubs', rank: 'jack' },
      { suit: 'spades', rank: 'jack' },
      { suit: 'hearts', rank: 'jack' },
      { suit: 'diamonds', rank: 'jack' },
      { suit: 'hearts', rank: 'ace' },
      { suit: 'hearts', rank: 'king' },
      { suit: 'hearts', rank: 'nine' },
    ]
  }
  return [
    { suit: 'hearts', rank: 'ten' },
    { suit: 'clubs', rank: 'queen' },
    { suit: 'spades', rank: 'queen' },
    { suit: 'hearts', rank: 'queen' },
    { suit: 'diamonds', rank: 'queen' },
    { suit: 'clubs', rank: 'jack' },
    { suit: 'spades', rank: 'jack' },
    { suit: 'hearts', rank: 'jack' },
    { suit: 'diamonds', rank: 'jack' },
    { suit: trumpSuit, rank: 'ace' },
    { suit: trumpSuit, rank: 'ten' },
    { suit: trumpSuit, rank: 'king' },
    { suit: trumpSuit, rank: 'nine' },
  ]
}

interface SortConfig {
  trumpOrder: CardId[]
  failSuitOrder: Suit[]
}

function getSortConfig(gameType: GameType): SortConfig {
  switch (gameType) {
    case 'normalspiel':
    case 'hochzeit':
      return { trumpOrder: NORMAL_TRUMP_ORDER, failSuitOrder: NORMAL_FAIL_SUIT_ORDER }
    case 'farbsolo-clubs':
      return {
        trumpOrder: buildColorSoloTrumpOrder('clubs'),
        failSuitOrder: ['spades', 'hearts', 'diamonds'],
      }
    case 'farbsolo-spades':
      return {
        trumpOrder: buildColorSoloTrumpOrder('spades'),
        failSuitOrder: ['clubs', 'hearts', 'diamonds'],
      }
    case 'farbsolo-hearts':
      return {
        trumpOrder: buildColorSoloTrumpOrder('hearts'),
        failSuitOrder: ['clubs', 'spades', 'diamonds'],
      }
    case 'farbsolo-diamonds':
      return {
        trumpOrder: buildColorSoloTrumpOrder('diamonds'),
        failSuitOrder: ['clubs', 'spades', 'hearts'],
      }
    case 'damen-solo':
      return {
        trumpOrder: QUEEN_SOLO_TRUMP_ORDER,
        failSuitOrder: ['clubs', 'spades', 'hearts', 'diamonds'],
      }
    case 'buben-solo':
      return {
        trumpOrder: JACK_SOLO_TRUMP_ORDER,
        failSuitOrder: ['clubs', 'spades', 'hearts', 'diamonds'],
      }
    case 'fleischlos':
      return {
        trumpOrder: [],
        failSuitOrder: ['clubs', 'spades', 'hearts', 'diamonds'],
      }
    default:
      return { trumpOrder: NORMAL_TRUMP_ORDER, failSuitOrder: NORMAL_FAIL_SUIT_ORDER }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Returns true if the card is a trump in the given game type.
 */
export function isTrump(card: Card, gameType: GameType): boolean {
  const { trumpOrder } = getSortConfig(gameType)
  return trumpOrder.some((t) => t.suit === card.suit && t.rank === card.rank)
}

/**
 * Returns the trump position (0 = highest, -1 = not a trump).
 */
export function getTrumpPosition(card: Card, gameType: GameType): number {
  const { trumpOrder } = getSortConfig(gameType)
  return trumpOrder.findIndex((t) => t.suit === card.suit && t.rank === card.rank)
}

/**
 * Sort a hand client-side so trumps appear left (strongest first),
 * then fail suits in their canonical order, each high → low.
 */
export function sortHandByGameType(hand: Card[], gameType: GameType): Card[] {
  const { trumpOrder, failSuitOrder } = getSortConfig(gameType)

  const failSuitIndex = (suit: Suit): number => {
    const idx = failSuitOrder.indexOf(suit)
    return idx === -1 ? 99 : idx
  }
  const failRankIndex = (rank: Card['rank']): number => FAIL_RANK_ORDER.indexOf(rank)
  const trumpPos = (card: Card): number =>
    trumpOrder.findIndex((t) => t.suit === card.suit && t.rank === card.rank)

  return [...hand].sort((a, b) => {
    const aT = trumpPos(a)
    const bT = trumpPos(b)
    if (aT !== -1 && bT !== -1) return aT - bT
    if (aT !== -1) return -1
    if (bT !== -1) return 1
    const suitDiff = failSuitIndex(a.suit) - failSuitIndex(b.suit)
    if (suitDiff !== 0) return suitDiff
    return failRankIndex(a.rank) - failRankIndex(b.rank)
  })
}

/**
 * Determine the "led suit" of the current trick:
 *  - If trick is empty → null (no constraint)
 *  - If first card is a trump → 'trump' (special token)
 *  - Otherwise → first card's suit
 */
function getLedCategory(trick: Trick | null, gameType: GameType): Suit | 'trump' | null {
  if (!trick || trick.cards.length === 0) return null
  const firstCard = trick.cards[0].card
  if (isTrump(firstCard, gameType)) return 'trump'
  return firstCard.suit
}

/**
 * Compute the set of valid card IDs the human may play right now.
 *
 * Bedienungspflicht-Regeln:
 *  - Wenn Stich leer → alle Karten der Hand sind gültig (Aufspiel)
 *  - Wenn Trumpf aufgespielt → muss Trumpf bedienen, wenn vorhanden;
 *    sonst freie Wahl
 *  - Wenn Fehlfarbe X aufgespielt → muss X bedienen, wenn vorhanden
 *    (Trumpf zählt nicht als X-Bedienung); sonst freie Wahl
 *
 * Wenn der Spieler nicht am Zug ist (kein hand-Spielen erlaubt),
 * gibt diese Funktion ein leeres Set zurück, sofern `isPlayerTurn = false`.
 */
export function getValidCardIds(
  hand: Card[],
  currentTrick: Trick | null,
  gameType: GameType,
  isPlayerTurn: boolean
): string[] {
  if (!isPlayerTurn) return []

  const led = getLedCategory(currentTrick, gameType)

  // No led card → any card is valid (player is leading)
  if (led === null) {
    return hand.map((c) => c.id)
  }

  if (led === 'trump') {
    // Must follow with trump if possible
    const trumpsInHand = hand.filter((c) => isTrump(c, gameType))
    if (trumpsInHand.length > 0) {
      return trumpsInHand.map((c) => c.id)
    }
    // No trumps → free choice
    return hand.map((c) => c.id)
  }

  // led is a fail suit (Suit)
  const ledSuit: Suit = led
  // Must follow with same suit if available AND not trump
  const sameSuitNonTrump = hand.filter(
    (c) => c.suit === ledSuit && !isTrump(c, gameType)
  )
  if (sameSuitNonTrump.length > 0) {
    return sameSuitNonTrump.map((c) => c.id)
  }
  // No same-suit fail cards → free choice (trump or any other suit)
  return hand.map((c) => c.id)
}

// ============================================================================
// REVEALED PARTIES (Re / Kontra Klärung über Kreuz-Damen)
// ============================================================================

/**
 * Compute which player parties (Re / Kontra) are currently revealed to the
 * human, based on Kreuz-Dame plays in the playHistory.
 *
 * Rules (Normalspiel):
 *  - As soon as a player plays a Kreuz-Dame, they're revealed as Re-Partei.
 *  - Once two distinct players have played a Kreuz-Dame, the remaining two
 *    players are by elimination revealed as Kontra-Partei.
 *  - Until then, other players' party stays hidden (returned as undefined).
 *
 * Edge case: Hochzeit (both Kreuz-Damen at one player) — only one player
 * gets revealed as Re; the others stay hidden until the Klärungsstich is
 * played (out of MVP scope, backend handles that).
 *
 * At game end (`isFinished`), all parties are revealed via this same
 * mechanism plus a fallback to `player.party` from the server.
 */
export function getRevealedParties(
  gameState: GameState
): Record<string, 're' | 'kontra'> {
  const revealed: Record<string, 're' | 'kontra'> = {}

  const kreuzDamePlayers = new Set<string>()
  for (const tc of gameState.playHistory) {
    if (tc.card.suit === 'clubs' && tc.card.rank === 'queen') {
      kreuzDamePlayers.add(tc.playerId)
    }
  }

  for (const pid of kreuzDamePlayers) {
    revealed[pid] = 're'
  }

  // Once both Kreuz-Damen are revealed at different players, the other two
  // must be Kontra. (Hochzeit case: only one player → others stay hidden.)
  if (kreuzDamePlayers.size >= 2) {
    for (const p of gameState.players) {
      if (!kreuzDamePlayers.has(p.id) && !(p.id in revealed)) {
        revealed[p.id] = 'kontra'
      }
    }
  }

  // After the game ends, the server has authoritative knowledge of all
  // parties. Fall back to the server-supplied player.party for any player
  // still unrevealed by the Kreuz-Dame logic.
  if (gameState.isFinished) {
    for (const p of gameState.players) {
      if (!(p.id in revealed) && (p.party === 're' || p.party === 'kontra')) {
        revealed[p.id] = p.party
      }
    }
  }

  return revealed
}
