/**
 * RulesValidator — Bedienungspflicht & Stich-Gewinner (Normalspiel).
 */

import type { Card, TrickCard } from '../shared/types.js'
import {
  effectiveSuit,
  fehlRankPosition,
  isTrump,
  trumpPosition,
  type EffectiveSuit,
} from '../shared/rules.js'

export interface ValidPlayInput {
  hand: ReadonlyArray<Card>
  trickCards: ReadonlyArray<TrickCard>
}

/**
 * Liefert IDs aller Karten, die der Spieler aktuell legen DARF.
 *
 * Regeln:
 * - Eröffnungskarte: alle Karten gültig.
 * - Folgende Karten: wirksame Farbe der ersten Karte muss bedient werden,
 *   falls vorhanden. Sonst freie Wahl.
 */
export function computeValidCardIds({ hand, trickCards }: ValidPlayInput): string[] {
  if (trickCards.length === 0) {
    return hand.map((c) => c.id)
  }

  const leadCard = trickCards[0]?.card
  if (!leadCard) {
    return hand.map((c) => c.id)
  }
  const leadSuit = effectiveSuit(leadCard)

  const matching = hand.filter((c) => effectiveSuit(c) === leadSuit)
  if (matching.length > 0) {
    return matching.map((c) => c.id)
  }
  return hand.map((c) => c.id)
}

/**
 * Darf der Spieler diese konkrete Karte legen?
 */
export function isValidPlay(card: Card, input: ValidPlayInput): boolean {
  return computeValidCardIds(input).includes(card.id)
}

/**
 * Sortier-Key zur Bestimmung des Stich-Siegers innerhalb derselben
 * wirksamen Farbe. Niedrigerer Key = stärkere Karte.
 *
 * Für Trumpf: trumpPosition (1 = stärkster).
 * Für Fehlfarben: fehlRankPosition (1 = Ass).
 *
 * Gleiche Karten (z.B. zwei Herz 10): der FRÜHERE Spieler im Stich ist
 * höher (TSR-Regel "vom früheren Spieler ist höher"). Das wird in
 * determineTrickWinner durch Reihenfolge-Stabilität abgebildet.
 */
function strengthKey(card: Pick<Card, 'suit' | 'rank'>): number {
  if (isTrump(card)) return trumpPosition(card)
  return fehlRankPosition(card.rank)
}

/**
 * Wer gewinnt den vollständigen 4er-Stich?
 *
 * Logik:
 * - Wirksame Farbe = effectiveSuit der Eröffnungskarte.
 * - Ein Trumpf sticht jede Fehlkarte.
 * - Unter Karten gleicher wirksamer Farbe gewinnt die mit niedrigerem strengthKey.
 * - Bei Gleichstand (z.B. zwei Herz 10) gewinnt der FRÜHERE Spieler.
 */
export function determineTrickWinner(
  trickCards: ReadonlyArray<TrickCard>,
): TrickCard {
  if (trickCards.length === 0) {
    throw new Error('Cannot determine winner of empty trick')
  }
  const lead = trickCards[0]
  if (!lead) throw new Error('Unreachable: lead missing')
  const leadSuit: EffectiveSuit = effectiveSuit(lead.card)

  // Wenn der lead nicht Trumpf ist, dürfen nur Trumpf oder Karten dieser
  // Fehlfarbe gewinnen. Andere Fehlfarben (Abwürfe) verlieren immer.
  let winner: TrickCard = lead
  let winnerEff: EffectiveSuit = leadSuit
  let winnerStrength: number = strengthKey(lead.card)

  for (let i = 1; i < trickCards.length; i++) {
    const tc = trickCards[i]
    if (!tc) throw new Error('Unreachable: trick card missing')
    const eff = effectiveSuit(tc.card)
    const strength = strengthKey(tc.card)

    if (winnerEff === 'trump') {
      if (eff === 'trump' && strength < winnerStrength) {
        winner = tc
        winnerEff = eff
        winnerStrength = strength
      }
      // sonst: bleibt Trumpf-Sieger
    } else {
      if (eff === 'trump') {
        // Erster Trumpf sticht jede Fehlkarte
        winner = tc
        winnerEff = eff
        winnerStrength = strength
      } else if (eff === leadSuit && strength < winnerStrength) {
        winner = tc
        winnerEff = eff
        winnerStrength = strength
      }
      // Andere Fehlfarben (Abwurf) verlieren immer
    }
  }
  return winner
}
