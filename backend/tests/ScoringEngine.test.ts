import { describe, it, expect } from 'vitest'
import type { Card, Trick, TrickCard } from '../src/shared/types.js'
import { computeScore, type PartyAssignment } from '../src/engine/ScoringEngine.js'

function card(id: string, suit: Card['suit'], rank: Card['rank']): Card {
  return { id, suit, rank }
}
function tc(playerId: string, c: Card): TrickCard {
  return { playerId, card: c, playedAt: 0 }
}
function partyMap(entries: Array<[string, 're' | 'kontra']>): PartyAssignment {
  return { byPlayer: new Map(entries) }
}

const STANDARD_PARTIES = partyMap([
  ['re1', 're'],
  ['re2', 're'],
  ['kontra1', 'kontra'],
  ['kontra2', 'kontra'],
])

describe('ScoringEngine — Augensummen', () => {
  it('sums eyes correctly per party', () => {
    const t1: Trick = {
      id: 't1',
      winnerId: 're1',
      cards: [
        tc('re1', card('a', 'clubs', 'ace')), // 11
        tc('re2', card('b', 'spades', 'ten')), // 10
        tc('kontra1', card('c', 'hearts', 'king')), // 4
        tc('kontra2', card('d', 'diamonds', 'queen')), // 3
      ],
      points: 28,
    }
    const t2: Trick = {
      id: 't2',
      winnerId: 'kontra1',
      cards: [
        tc('re1', card('e', 'clubs', 'nine')), // 0
        tc('re2', card('f', 'spades', 'jack')), // 2
        tc('kontra1', card('g', 'hearts', 'ace')), // 11
        tc('kontra2', card('h', 'diamonds', 'king')), // 4
      ],
      points: 17,
    }
    const result = computeScore({
      tricks: [t1, t2],
      parties: STANDARD_PARTIES,
      announcements: { re: [], kontra: [] },
    })
    expect(result.reEyes).toBe(28)
    expect(result.kontraEyes).toBe(17)
  })
})

describe('ScoringEngine — Sieger-Schwelle', () => {
  it('kontra wins when re below 121', () => {
    const t1: Trick = {
      id: 't1',
      winnerId: 're1',
      cards: [
        tc('re1', card('a', 'clubs', 'ace')),
        tc('re2', card('b', 'spades', 'ten')),
        tc('kontra1', card('c', 'hearts', 'king')),
        tc('kontra2', card('d', 'diamonds', 'queen')),
      ],
      points: 28,
    }
    const result = computeScore({
      tricks: [t1],
      parties: STANDARD_PARTIES,
      announcements: { re: [], kontra: [] },
    })
    expect(result.winner).toBe('kontra')
  })
})

describe('ScoringEngine — Sonderpunkte', () => {
  it('counts doppelkopf bonus only for winning party', () => {
    // Sechs schwere Re-Tricks à 42 Augen (>40) = 252 — wir nehmen 5 Tricks (=210),
    // damit Re klar > 121 ist.
    const heavyTricks: Trick[] = []
    for (let i = 0; i < 5; i++) {
      heavyTricks.push({
        id: `re${i}`,
        winnerId: 're1',
        cards: [
          tc('re1', card(`r${i}a`, 'clubs', 'ace')), // 11
          tc('re2', card(`r${i}b`, 'spades', 'ace')), // 11
          tc('kontra1', card(`r${i}c`, 'hearts', 'ace')), // 11
          tc('kontra2', card(`r${i}d`, 'spades', 'ten')), // 10
        ],
        points: 43,
      })
    }
    const result = computeScore({
      tricks: heavyTricks,
      parties: STANDARD_PARTIES,
      announcements: { re: [], kontra: [] },
    })
    expect(result.reEyes).toBe(215)
    expect(result.winner).toBe('re')
    expect(result.breakdown.doppelkopfBonuses).toBe(5)
  })

  it('counts fuchs when karo ace of opponent is captured by winning party', () => {
    const trickWithFuchs: Trick = {
      id: 't1',
      winnerId: 're1',
      cards: [
        tc('re1', card('a', 'hearts', 'ten')), // Dulle (Trumpf, höchster)
        tc('kontra1', card('b', 'diamonds', 'ace')), // FUCHS der Kontra
        tc('re2', card('c', 'diamonds', 'king')),
        tc('kontra2', card('d', 'diamonds', 'nine')),
      ],
      points: 26,
    }
    // Mehr Re-Tricks für klaren Sieg
    const moreRe: Trick[] = []
    for (let i = 0; i < 4; i++) {
      moreRe.push({
        id: `mr${i}`,
        winnerId: 're1',
        cards: [
          tc('re1', card(`m${i}a`, 'clubs', 'ace')), // 11
          tc('re2', card(`m${i}b`, 'spades', 'ten')), // 10
          tc('kontra1', card(`m${i}c`, 'hearts', 'king')), // 4
          tc('kontra2', card(`m${i}d`, 'hearts', 'ace')), // 11
        ],
        points: 36,
      })
    }
    const result = computeScore({
      tricks: [trickWithFuchs, ...moreRe],
      parties: STANDARD_PARTIES,
      announcements: { re: [], kontra: [] },
    })
    expect(result.winner).toBe('re')
    expect(result.breakdown.fuchsBonuses).toBe(1)
  })

  it('counts karlchen when kreuz-bube wins the last trick for winning party', () => {
    const earlyTrick: Trick = {
      id: 't1',
      winnerId: 're1',
      cards: [
        tc('re1', card('e1', 'clubs', 'ace')),
        tc('re2', card('e2', 'spades', 'ace')),
        tc('kontra1', card('e3', 'hearts', 'ace')),
        tc('kontra2', card('e4', 'spades', 'ten')),
      ],
      points: 43,
    }
    const lastTrick: Trick = {
      id: 't2',
      winnerId: 're1',
      cards: [
        tc('re1', card('lb', 'clubs', 'jack')), // Karlchen!
        tc('re2', card('l2', 'spades', 'queen')),
        tc('kontra1', card('l3', 'hearts', 'queen')),
        tc('kontra2', card('l4', 'diamonds', 'queen')),
      ],
      points: 14,
    }
    // Plus genug Augen für Re-Sieg (Re hat hier 43+14=57, also nochmal viel Re draufladen)
    const fillers: Trick[] = []
    for (let i = 0; i < 3; i++) {
      fillers.push({
        id: `f${i}`,
        winnerId: 're1',
        cards: [
          tc('re1', card(`f${i}a`, 'clubs', 'ace')),
          tc('re2', card(`f${i}b`, 'spades', 'ace')),
          tc('kontra1', card(`f${i}c`, 'hearts', 'king')),
          tc('kontra2', card(`f${i}d`, 'spades', 'ten')),
        ],
        points: 36,
      })
    }
    // Wichtig: lastTrick muss WIRKLICH der letzte sein
    const result = computeScore({
      tricks: [earlyTrick, ...fillers, lastTrick],
      parties: STANDARD_PARTIES,
      announcements: { re: [], kontra: [] },
    })
    expect(result.winner).toBe('re')
    expect(result.breakdown.karlchenBonus).toBe(1)
  })
})

describe('ScoringEngine — Ansagen erhöhen Spielwert', () => {
  it('Re-Ansage gibt +2 Bonuspunkte', () => {
    const trick: Trick = {
      id: 't1',
      winnerId: 're1',
      cards: [
        tc('re1', card('a', 'clubs', 'ace')),
        tc('re2', card('b', 'spades', 'ten')),
        tc('kontra1', card('c', 'hearts', 'king')),
        tc('kontra2', card('d', 'diamonds', 'queen')),
      ],
      points: 28,
    }
    const result = computeScore({
      tricks: [trick],
      parties: STANDARD_PARTIES,
      announcements: { re: ['re'], kontra: [] },
    })
    expect(result.breakdown.announcementBonuses).toBe(2)
  })

  it('Re + 90 + 60 = 2 + 1 + 1 = 4', () => {
    const trick: Trick = {
      id: 't1',
      winnerId: 're1',
      cards: [
        tc('re1', card('a', 'clubs', 'ace')),
        tc('re2', card('b', 'spades', 'ten')),
        tc('kontra1', card('c', 'hearts', 'king')),
        tc('kontra2', card('d', 'diamonds', 'queen')),
      ],
      points: 28,
    }
    const result = computeScore({
      tricks: [trick],
      parties: STANDARD_PARTIES,
      announcements: { re: ['re', '90', '60'], kontra: [] },
    })
    expect(result.breakdown.announcementBonuses).toBe(4)
  })
})
