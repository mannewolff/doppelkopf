import { describe, it, expect } from 'vitest'
import { dealCards3334, generateDeck, shuffleAuthentic } from '../src/engine/Deck.js'

function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

describe('Deck', () => {
  it('generates 48 unique cards (4 suits × 6 ranks × 2 copies)', () => {
    const deck = generateDeck()
    expect(deck).toHaveLength(48)
    const ids = new Set(deck.map((c) => c.id))
    expect(ids.size).toBe(48)
  })

  it('shuffleAuthentic preserves cards', () => {
    const deck = generateDeck()
    const shuffled = shuffleAuthentic(deck, seededRng(42))
    expect(shuffled).toHaveLength(48)
    const idsBefore = new Set(deck.map((c) => c.id))
    const idsAfter = new Set(shuffled.map((c) => c.id))
    expect(idsAfter).toEqual(idsBefore)
  })

  it('shuffleAuthentic is deterministic with seeded RNG', () => {
    const a = shuffleAuthentic(generateDeck(), seededRng(7))
    const b = shuffleAuthentic(generateDeck(), seededRng(7))
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
  })

  it('dealCards3334 distributes 12 cards to each of 4 players', () => {
    const deck = shuffleAuthentic(generateDeck(), seededRng(99))
    const hands = dealCards3334(deck, ['p1', 'p2', 'p3', 'p4'])
    for (const id of ['p1', 'p2', 'p3', 'p4'] as const) {
      expect(hands[id]).toHaveLength(12)
    }
    const total = ['p1', 'p2', 'p3', 'p4'].flatMap((id) => hands[id]!).length
    expect(total).toBe(48)
  })

  it('dealCards3334 throws on wrong player count', () => {
    const deck = generateDeck()
    expect(() => dealCards3334(deck, ['only-one'])).toThrow()
  })
})
