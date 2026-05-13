/**
 * ScoringEngine — Augen- und Punkt-Berechnung für Normalspiel.
 *
 * Vereinfachung für MVP:
 * - Nur Normalspiel.
 * - Re-Partei = Spieler mit mindestens einer Kreuz-Dame.
 * - Gewinnschwelle: Re ≥ 121 Augen, Kontra ≥ 120 Augen.
 * - Ansagen (Re/Kontra) erhöhen Spielwert. 90/60/30/Schwarz mit
 *   entsprechender Schwelle.
 * - Sonderpunkte: Doppelkopf (40+ Augen), Fuchs (gefangenes Karo-Ass der
 *   Gegenpartei), Karlchen (Kreuz-Bube im letzten Stich).
 * - "Gegen die Kreuz-Damen" (Bonus für Kontra, falls Kontra das Normalspiel
 *   gewinnt).
 */

import type { AnnouncementType, Trick, TrickCard } from '../shared/types.js'
import {
  ANNOUNCEMENT_POINT_VALUE,
  TOTAL_EYES,
  eyesOf,
  isFuchs,
  isKarlchen,
  sumEyes,
} from '../shared/rules.js'

export type Party = 're' | 'kontra'

export interface PartyAssignment {
  /** PlayerId → Partei (Re/Kontra). Sollte 2:2 sein, ist es aber nicht zwingend (Vorbehalt-Folge). */
  byPlayer: ReadonlyMap<string, Party>
}

export interface AnnouncementsByParty {
  re: ReadonlyArray<AnnouncementType>
  kontra: ReadonlyArray<AnnouncementType>
}

export interface ScoringInput {
  tricks: ReadonlyArray<Trick>
  parties: PartyAssignment
  announcements: AnnouncementsByParty
}

export interface PartyResult {
  eyes: number
  trickCount: number
}

export interface ScoringResult {
  winner: Party
  /** Augen-Verteilung */
  reEyes: number
  kontraEyes: number
  /** Spielpunkte (kompakt, MVP) */
  reScore: number
  kontraScore: number
  /** Aufschlüsselung für UI */
  breakdown: ScoreBreakdown
}

export interface ScoreBreakdown {
  basePoint: number
  underThresholdBonuses: number
  announcementBonuses: number
  doppelkopfBonuses: number
  fuchsBonuses: number
  karlchenBonus: number
  gegenKreuzDamen: number
}

const RE_WIN_THRESHOLD = 121
const KONTRA_WIN_THRESHOLD = 120

/**
 * Hauptberechnung.
 */
export function computeScore(input: ScoringInput): ScoringResult {
  const { tricks, parties, announcements } = input

  // Augen pro Partei
  let reEyes = 0
  let kontraEyes = 0
  let reTricks = 0
  let kontraTricks = 0

  for (const trick of tricks) {
    if (!trick.winnerId) continue
    const party = parties.byPlayer.get(trick.winnerId)
    const eyes = sumEyes(trick.cards.map((tc) => tc.card))
    if (party === 're') {
      reEyes += eyes
      reTricks += 1
    } else if (party === 'kontra') {
      kontraEyes += eyes
      kontraTricks += 1
    }
  }

  // Sanity check: Summe der Augen muss 240 sein, wenn 12 Stiche gespielt.
  if (tricks.length === 12 && reEyes + kontraEyes !== TOTAL_EYES) {
    throw new Error(
      `Eye total mismatch: re=${reEyes}, kontra=${kontraEyes}, sum=${reEyes + kontraEyes}`,
    )
  }

  const winner: Party = reEyes >= RE_WIN_THRESHOLD ? 're' : 'kontra'

  // Spielpunkte: Basis = 1 Punkt für den Sieger.
  const basePoint = 1

  // "Unter-90/60/30/Schwarz" Bonuspunkte
  const loserEyes = winner === 're' ? kontraEyes : reEyes
  const loserTricks = winner === 're' ? kontraTricks : reTricks
  let underThresholdBonuses = 0
  if (loserEyes < 90) underThresholdBonuses += 1
  if (loserEyes < 60) underThresholdBonuses += 1
  if (loserEyes < 30) underThresholdBonuses += 1
  if (loserTricks === 0) underThresholdBonuses += 1 // Schwarz

  // Ansage-Boni
  const announcementBonuses =
    sumAnnouncementValues(announcements.re) + sumAnnouncementValues(announcements.kontra)

  // Sonderpunkte
  const doppelkopfBonuses = countDoppelkopfBonuses(tricks, parties, winner)
  const fuchsBonuses = countFuchsBonuses(tricks, parties, winner)
  const karlchenBonus = computeKarlchenBonus(tricks, parties, winner)
  const gegenKreuzDamen = winner === 'kontra' ? 1 : 0

  const totalBonus =
    basePoint +
    underThresholdBonuses +
    announcementBonuses +
    doppelkopfBonuses +
    fuchsBonuses +
    karlchenBonus +
    gegenKreuzDamen

  let reScore = 0
  let kontraScore = 0
  if (winner === 're') {
    reScore = totalBonus
    kontraScore = -totalBonus
  } else {
    kontraScore = totalBonus
    reScore = -totalBonus
  }

  return {
    winner,
    reEyes,
    kontraEyes,
    reScore,
    kontraScore,
    breakdown: {
      basePoint,
      underThresholdBonuses,
      announcementBonuses,
      doppelkopfBonuses,
      fuchsBonuses,
      karlchenBonus,
      gegenKreuzDamen,
    },
  }
}

function sumAnnouncementValues(list: ReadonlyArray<AnnouncementType>): number {
  let total = 0
  for (const a of list) total += ANNOUNCEMENT_POINT_VALUE[a]
  return total
}

/**
 * Doppelkopf: Ein Stich mit ≥ 40 Augen.
 * Punkt nur für den Sieger (Partei).
 */
function countDoppelkopfBonuses(
  tricks: ReadonlyArray<Trick>,
  parties: PartyAssignment,
  winner: Party,
): number {
  let count = 0
  for (const trick of tricks) {
    const eyes = sumEyes(trick.cards.map((tc) => tc.card))
    if (eyes >= 40 && trick.winnerId) {
      const party = parties.byPlayer.get(trick.winnerId)
      if (party === winner) count += 1
    }
  }
  return count
}

/**
 * Fuchs: Karo-Ass der Gegenpartei "gefangen".
 * Bedingung: Karte gehört einem Spieler der Gegenpartei (= nicht-Sieger),
 * Stich-Gewinner ist Sieger-Partei.
 *
 * Im MVP haben wir die Original-Spieler der Karten in trickCards.playerId.
 */
function countFuchsBonuses(
  tricks: ReadonlyArray<Trick>,
  parties: PartyAssignment,
  winner: Party,
): number {
  let count = 0
  for (const trick of tricks) {
    if (!trick.winnerId) continue
    const winnerParty = parties.byPlayer.get(trick.winnerId)
    if (winnerParty !== winner) continue
    for (const tc of trick.cards) {
      if (!isFuchs(tc.card)) continue
      const owner = parties.byPlayer.get(tc.playerId)
      if (owner && owner !== winner) {
        count += 1
      }
    }
  }
  return count
}

/**
 * Karlchen: Letzter Stich mit Kreuz-Bube, gewonnen von der Sieger-Partei,
 * UND der Kreuz-Bube ist die siegreiche Karte (vereinfacht: Karte des Stich-Gewinners).
 */
function computeKarlchenBonus(
  tricks: ReadonlyArray<Trick>,
  parties: PartyAssignment,
  winner: Party,
): number {
  const last = tricks[tricks.length - 1]
  if (!last || !last.winnerId) return 0
  if (parties.byPlayer.get(last.winnerId) !== winner) return 0

  // Hat der Stich-Gewinner mit einem Kreuz-Bube gewonnen?
  const winningCard = lastTrickWinningCard(last)
  if (!winningCard) return 0
  return isKarlchen(winningCard) ? 1 : 0
}

function lastTrickWinningCard(trick: Trick): TrickCard['card'] | undefined {
  const winnerCard = trick.cards.find((tc) => tc.playerId === trick.winnerId)
  return winnerCard?.card
}

// Re-export für externe Verwendung (z. B. Tests)
export { eyesOf }
