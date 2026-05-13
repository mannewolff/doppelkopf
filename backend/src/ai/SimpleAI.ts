/**
 * SimpleAI — regelkonforme, aber simple Kartenwahl für KI-Gegner.
 *
 * Strategie (MVP):
 * - Server liefert validCards (Bedienungspflicht ist hart erzwungen).
 * - Anspielen: bevorzugt mittlere Karte (kein Ass verschwenden, kein Bube).
 * - Bedienen: wenn möglich ÜBERTRUMPFEN, sonst niedrigste passende.
 * - Werfen (kein Bedienen möglich): niedrigste Karte abwerfen.
 *
 * KI macht keine Ansagen (MVP).
 * In der Vorbehaltsphase deklariert die KI immer 'gesund'.
 */

import type { Card, TrickCard } from '../shared/types.js'
import {
  effectiveSuit,
  fehlRankPosition,
  isTrump,
  trumpPosition,
} from '../shared/rules.js'

export interface AiDecideInput {
  validCards: ReadonlyArray<Card>
  trickCards: ReadonlyArray<TrickCard>
}

export interface AiDecision {
  cardId: string
}

/**
 * Vorbehaltsphase: SimpleAI sagt immer 'gesund'.
 * (Auch wenn die KI zufällig beide Kreuz-Damen hätte: vereinfachte MVP-Logik
 * spielt das als "stille Hochzeit", also Normalspiel.)
 */
export function decideVorbehalt(): 'gesund' | 'vorbehalt' {
  return 'gesund'
}

export function decideAiMove(input: AiDecideInput): AiDecision {
  const { validCards, trickCards } = input
  if (validCards.length === 0) {
    throw new Error('AI cannot decide without valid cards')
  }

  // Eröffnung: lege eine mittlere Fehlfarben-Karte (kein Trumpf, kein Ass)
  if (trickCards.length === 0) {
    return { cardId: chooseOpening(validCards).id }
  }

  const lead = trickCards[0]?.card
  if (!lead) {
    return { cardId: chooseOpening(validCards).id }
  }
  const leadIsTrump = isTrump(lead)
  const mustFollow = validCards.every((c) => effectiveSuit(c) === effectiveSuit(lead))

  if (mustFollow) {
    return { cardId: chooseFollow(validCards, trickCards, leadIsTrump).id }
  }

  // Kein Bedienen möglich: niedrigste Karte abwerfen
  return { cardId: chooseDiscard(validCards).id }
}

function chooseOpening(cards: ReadonlyArray<Card>): Card {
  const fehl = cards.filter((c) => !isTrump(c))
  if (fehl.length > 0) {
    // bevorzugt König (4 Augen) oder 9 (0) — keine Asse/10er verbraten
    const nonAceTen = fehl.filter((c) => c.rank !== 'ace' && c.rank !== 'ten')
    const pool = nonAceTen.length > 0 ? nonAceTen : fehl
    return pickLowestFehl(pool)
  }
  // Nur Trumpf in der Hand: spiele niedrigsten Trumpf
  return pickLowestTrump(cards)
}

function chooseFollow(
  cards: ReadonlyArray<Card>,
  trickCards: ReadonlyArray<TrickCard>,
  leadIsTrump: boolean,
): Card {
  // Aktueller Stich-Höchstwert in der wirksamen Lead-Farbe
  const leadCard = trickCards[0]?.card
  if (!leadCard) return cards[0] as Card
  const leadEff = effectiveSuit(leadCard)

  // Welche Karte ist aktuell am stärksten in lead-Farbe?
  let currentStrength = Number.POSITIVE_INFINITY
  for (const tc of trickCards) {
    if (effectiveSuit(tc.card) !== leadEff) continue
    const s = leadIsTrump ? trumpPosition(tc.card) : fehlRankPosition(tc.card.rank)
    if (s < currentStrength) currentStrength = s
  }

  // Kandidaten, die stechen können (kleiner strengthKey = stärker)
  const sorted = [...cards].sort((a, b) => sortBySuitGroup(a, b, leadIsTrump))
  const beating = sorted.filter((c) => {
    const s = leadIsTrump ? trumpPosition(c) : fehlRankPosition(c.rank)
    return s < currentStrength
  })

  if (beating.length > 0) {
    // Wähle den GERADE ausreichend hohen Stech-Kandidaten (niedrigste Stech-Karte)
    let best = beating[0] as Card
    let bestStrength = leadIsTrump ? trumpPosition(best) : fehlRankPosition(best.rank)
    for (let i = 1; i < beating.length; i++) {
      const cand = beating[i] as Card
      const s = leadIsTrump ? trumpPosition(cand) : fehlRankPosition(cand.rank)
      // wir wollen die SCHWÄCHSTE Karte, die noch sticht
      if (s > bestStrength) {
        best = cand
        bestStrength = s
      }
    }
    return best
  }

  // Nicht stechen möglich -> niedrigste Karte
  return leadIsTrump ? pickLowestTrump(cards) : pickLowestFehl(cards)
}

function chooseDiscard(cards: ReadonlyArray<Card>): Card {
  const fehl = cards.filter((c) => !isTrump(c))
  if (fehl.length > 0) return pickLowestFehl(fehl)
  return pickLowestTrump(cards)
}

function pickLowestFehl(cards: ReadonlyArray<Card>): Card {
  if (cards.length === 0) throw new Error('Empty card list')
  let best = cards[0] as Card
  let bestRank = fehlRankPosition(best.rank)
  for (let i = 1; i < cards.length; i++) {
    const c = cards[i] as Card
    const r = fehlRankPosition(c.rank)
    if (r > bestRank) {
      best = c
      bestRank = r
    }
  }
  return best
}

function pickLowestTrump(cards: ReadonlyArray<Card>): Card {
  if (cards.length === 0) throw new Error('Empty card list')
  let best = cards[0] as Card
  let bestPos = isTrump(best) ? trumpPosition(best) : Number.NEGATIVE_INFINITY
  for (let i = 1; i < cards.length; i++) {
    const c = cards[i] as Card
    if (!isTrump(c)) continue
    const p = trumpPosition(c)
    if (p > bestPos) {
      best = c
      bestPos = p
    }
  }
  return best
}

function sortBySuitGroup(a: Card, b: Card, leadIsTrump: boolean): number {
  const aTrump = isTrump(a)
  const bTrump = isTrump(b)
  if (leadIsTrump) {
    if (aTrump && bTrump) return trumpPosition(a) - trumpPosition(b)
    return aTrump ? -1 : 1
  }
  if (!aTrump && !bTrump) return fehlRankPosition(a.rank) - fehlRankPosition(b.rank)
  return aTrump ? 1 : -1
}
