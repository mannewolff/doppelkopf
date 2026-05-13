/**
 * Doppelkopf-Regelwerk (Normalspiel).
 *
 * Quelle: Dokumente/doppelkopf-rules.json (TSR Stand 21.02.2026).
 * Wir spiegeln die für die Engine relevanten Teile als typsichere TS-Konstanten,
 * um zur Laufzeit keine JSON-Parser-Logik zu benötigen und Strict-Type-Checks zu
 * ermöglichen.
 */

import type { Rank, Suit, Card } from './types.js'

// ============================================================================
// AUGEN (Eyes)
// ============================================================================

export const RANK_EYES: Readonly<Record<Rank, number>> = Object.freeze({
  ace: 11,
  ten: 10,
  king: 4,
  queen: 3,
  jack: 2,
  nine: 0,
})

export const TOTAL_EYES = 240

// ============================================================================
// TRUMPF-HIERARCHIE (Normalspiel)
//
// Position 1 = höchster Trumpf, Position 26 = niedrigster Trumpf.
// Alle nicht hier gelisteten Karten sind Fehlfarben.
// ============================================================================

export interface TrumpCardSpec {
  suit: Suit
  rank: Rank
  position: number
}

export const NORMALSPIEL_TRUMP_ORDER: ReadonlyArray<TrumpCardSpec> = Object.freeze([
  // Sonderkarten
  { suit: 'hearts', rank: 'ten', position: 1 }, // Herz 10 (Dulle)
  // Damen (clubs > spades > hearts > diamonds)
  { suit: 'clubs', rank: 'queen', position: 2 },
  { suit: 'spades', rank: 'queen', position: 3 },
  { suit: 'hearts', rank: 'queen', position: 4 },
  { suit: 'diamonds', rank: 'queen', position: 5 },
  // Buben
  { suit: 'clubs', rank: 'jack', position: 6 },
  { suit: 'spades', rank: 'jack', position: 7 },
  { suit: 'hearts', rank: 'jack', position: 8 },
  { suit: 'diamonds', rank: 'jack', position: 9 },
  // Karo (Trumpffarbe)
  { suit: 'diamonds', rank: 'ace', position: 10 },
  { suit: 'diamonds', rank: 'ten', position: 11 },
  { suit: 'diamonds', rank: 'king', position: 12 },
  { suit: 'diamonds', rank: 'nine', position: 13 },
])

const trumpLookup = new Map<string, number>()
for (const t of NORMALSPIEL_TRUMP_ORDER) {
  trumpLookup.set(`${t.suit}-${t.rank}`, t.position)
}

/**
 * Ist die Karte im Normalspiel ein Trumpf?
 */
export function isTrump(card: Pick<Card, 'suit' | 'rank'>): boolean {
  return trumpLookup.has(`${card.suit}-${card.rank}`)
}

/**
 * Trumpf-Position (1 = höchster). Wirft, wenn Karte keine Trumpfkarte ist.
 */
export function trumpPosition(card: Pick<Card, 'suit' | 'rank'>): number {
  const pos = trumpLookup.get(`${card.suit}-${card.rank}`)
  if (pos === undefined) {
    throw new Error(`Card ${card.suit}-${card.rank} is not a trump in Normalspiel`)
  }
  return pos
}

// ============================================================================
// FEHLFARBEN-HIERARCHIE
//
// Innerhalb einer Fehlfarbe gilt: Ass > 10 > König > 9.
// (Buben und Damen sind im Normalspiel immer Trumpf.)
// ============================================================================

const FEHL_RANK_ORDER: Readonly<Record<Rank, number>> = Object.freeze({
  ace: 1,
  ten: 2,
  king: 3,
  nine: 4,
  // Buben & Damen kommen in Fehlfarben nicht vor, fallen aber im Type ab.
  queen: 99,
  jack: 99,
})

/**
 * Fehlfarben-Rang: 1 = höchste Fehlkarte (Ass).
 */
export function fehlRankPosition(rank: Rank): number {
  return FEHL_RANK_ORDER[rank]
}

/**
 * Wirksame Farbe einer Karte:
 * - Bei Trümpfen IMMER 'trump' (auch Herz 10!).
 * - Sonst die Suit der Karte.
 */
export type EffectiveSuit = 'trump' | Suit
export function effectiveSuit(card: Pick<Card, 'suit' | 'rank'>): EffectiveSuit {
  return isTrump(card) ? 'trump' : card.suit
}

// ============================================================================
// AUGEN-HILFE
// ============================================================================

export function eyesOf(card: Pick<Card, 'rank'>): number {
  return RANK_EYES[card.rank]
}

export function sumEyes(cards: ReadonlyArray<Pick<Card, 'rank'>>): number {
  let total = 0
  for (const c of cards) total += RANK_EYES[c.rank]
  return total
}

// ============================================================================
// SONDERKARTEN
// ============================================================================

export function isFuchs(card: Pick<Card, 'suit' | 'rank'>): boolean {
  return card.suit === 'diamonds' && card.rank === 'ace'
}

export function isKarlchen(card: Pick<Card, 'suit' | 'rank'>): boolean {
  return card.suit === 'clubs' && card.rank === 'jack'
}

export function isKreuzDame(card: Pick<Card, 'suit' | 'rank'>): boolean {
  return card.suit === 'clubs' && card.rank === 'queen'
}

// ============================================================================
// ANSAGE-BEDINGUNGEN
//
// Minimale Kartenzahl (in Hand) zum Ansage-Zeitpunkt.
// ============================================================================

export const ANNOUNCEMENT_MIN_CARDS = Object.freeze({
  re: 11,
  kontra: 11,
  '90': 10,
  '60': 9,
  '30': 8,
  schwarz: 7,
} as const)

export const ANNOUNCEMENT_POINT_VALUE = Object.freeze({
  re: 2,
  kontra: 2,
  '90': 1,
  '60': 1,
  '30': 1,
  schwarz: 1,
} as const)

// ============================================================================
// KARTEN-KONSTANTEN
// ============================================================================

export const ALL_SUITS: ReadonlyArray<Suit> = Object.freeze(['clubs', 'spades', 'hearts', 'diamonds'])
export const ALL_RANKS: ReadonlyArray<Rank> = Object.freeze(['ace', 'ten', 'king', 'queen', 'jack', 'nine'])

export const TOTAL_CARDS = 48
export const HAND_SIZE = 12
export const TRICKS_PER_GAME = 12
export const PLAYERS_PER_GAME = 4
