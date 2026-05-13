/**
 * Kartenverwaltung: Erzeugung, Mischen (mehrfach + Cut + 3-3-3-3 Deal).
 *
 * Bei Tests kann eine deterministische RNG injiziert werden.
 */

import type { Card, Rank, Suit } from '../shared/types.js'
import { ALL_RANKS, ALL_SUITS, HAND_SIZE, PLAYERS_PER_GAME, TOTAL_CARDS } from '../shared/rules.js'

export type Rng = () => number

const defaultRng: Rng = Math.random

function makeCardId(suit: Suit, rank: Rank, copy: number): string {
  return `${suit}-${rank}-${copy}`
}

/**
 * Doppelkopf-Deck: 48 Karten (4 Farben × 6 Ränge × 2 Kopien).
 */
export function generateDeck(): Card[] {
  const deck: Card[] = []
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of ALL_SUITS) {
      for (const rank of ALL_RANKS) {
        deck.push({ id: makeCardId(suit, rank, copy), suit, rank })
      }
    }
  }
  if (deck.length !== TOTAL_CARDS) {
    throw new Error(`Deck has wrong size: ${deck.length}`)
  }
  return deck
}

function fisherYatesShuffle(cards: ReadonlyArray<Card>, rng: Rng): Card[] {
  const arr = [...cards]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = arr[i]
    const b = arr[j]
    if (a === undefined || b === undefined) {
      throw new Error('Shuffle index out of range — unreachable')
    }
    arr[i] = b
    arr[j] = a
  }
  return arr
}

/**
 * Abheben (Cut): mind. 3 Karten oben oder unten.
 */
function cutDeck(deck: ReadonlyArray<Card>, rng: Rng): Card[] {
  const minCut = 3
  const maxCut = deck.length - 3
  const cutPoint = Math.floor(rng() * (maxCut - minCut + 1)) + minCut
  return [...deck.slice(cutPoint), ...deck.slice(0, cutPoint)]
}

/**
 * Authentisches Mischen: 3–4× Fisher-Yates + Cut + finaler Shuffle.
 */
export function shuffleAuthentic(deck: ReadonlyArray<Card>, rng: Rng = defaultRng): Card[] {
  let result: Card[] = [...deck]
  const passes = 3 + Math.floor(rng() * 2)
  for (let i = 0; i < passes; i++) {
    result = fisherYatesShuffle(result, rng)
  }
  result = cutDeck(result, rng)
  result = fisherYatesShuffle(result, rng)
  return result
}

/**
 * 4×3 Deal an 4 Spieler in der angegebenen Reihenfolge.
 * Reihenfolge MUSS exakt 4 IDs enthalten; jede Hand erhält 12 Karten.
 */
export function dealCards3334(
  deck: ReadonlyArray<Card>,
  playerOrder: ReadonlyArray<string>,
): Record<string, Card[]> {
  if (playerOrder.length !== PLAYERS_PER_GAME) {
    throw new Error(`Expected ${PLAYERS_PER_GAME} players, got ${playerOrder.length}`)
  }
  if (deck.length !== TOTAL_CARDS) {
    throw new Error(`Expected ${TOTAL_CARDS} cards, got ${deck.length}`)
  }

  const hands: Record<string, Card[]> = {}
  for (const id of playerOrder) hands[id] = []

  let deckIndex = 0
  for (let round = 0; round < 4; round++) {
    for (const playerId of playerOrder) {
      const target = hands[playerId]
      if (!target) throw new Error(`Unknown player ${playerId}`)
      for (let k = 0; k < 3; k++) {
        const card = deck[deckIndex++]
        if (!card) throw new Error('Deck exhausted mid-deal — unreachable')
        target.push(card)
      }
    }
  }

  for (const id of playerOrder) {
    const h = hands[id]
    if (!h || h.length !== HAND_SIZE) {
      throw new Error(`Hand size mismatch for ${id}`)
    }
  }
  return hands
}

/**
 * Vergleichs-Sortierung für Hand-Anzeige.
 * Trumpf zuerst (hoch → niedrig), dann Fehlfarben gruppiert.
 */
export function sortHandForDisplay(hand: ReadonlyArray<Card>): Card[] {
  const suitOrder: Record<Suit, number> = { clubs: 0, spades: 1, hearts: 2, diamonds: 3 }
  const rankOrder: Record<Rank, number> = {
    ace: 0,
    ten: 1,
    king: 2,
    queen: 3,
    jack: 4,
    nine: 5,
  }
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit]
    if (suitDiff !== 0) return suitDiff
    return rankOrder[a.rank] - rankOrder[b.rank]
  })
}
