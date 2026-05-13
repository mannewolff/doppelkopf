import { describe, it, expect } from 'vitest'
import type { Card, TrickCard } from '../src/shared/types.js'
import {
  computeValidCardIds,
  determineTrickWinner,
} from '../src/engine/RulesValidator.js'

function card(id: string, suit: Card['suit'], rank: Card['rank']): Card {
  return { id, suit, rank }
}

function tc(playerId: string, c: Card): TrickCard {
  return { playerId, card: c, playedAt: 0 }
}

describe('computeValidCardIds', () => {
  it('lead: all cards are valid', () => {
    const hand = [card('a', 'hearts', 'ace'), card('b', 'clubs', 'queen')]
    const ids = computeValidCardIds({ hand, trickCards: [] })
    expect(ids.sort()).toEqual(['a', 'b'])
  })

  it('must follow fehl suit if possible', () => {
    const lead = card('lead', 'spades', 'ace')
    const hand = [
      card('s1', 'spades', 'king'),
      card('h1', 'hearts', 'king'), // Trumpf wäre falsch? Herz König ist Fehl (nicht Trumpf)
      card('d1', 'diamonds', 'nine'), // Karo 9 ist Trumpf
    ]
    const ids = computeValidCardIds({
      hand,
      trickCards: [tc('p1', lead)],
    })
    // Lead = Pik (Fehl). Pik vorhanden → muss Pik bedienen.
    expect(ids).toEqual(['s1'])
  })

  it('must follow trump if lead is trump', () => {
    const lead = card('lead', 'hearts', 'ten') // Dulle = Trumpf
    const hand = [
      card('q1', 'spades', 'queen'), // Trumpf (alle Damen)
      card('s1', 'spades', 'ace'), // Fehl
    ]
    const ids = computeValidCardIds({
      hand,
      trickCards: [tc('p1', lead)],
    })
    expect(ids).toEqual(['q1'])
  })

  it('free choice when cannot follow', () => {
    const lead = card('lead', 'spades', 'ace')
    const hand = [
      card('h1', 'hearts', 'king'),
      card('d1', 'diamonds', 'nine'),
    ]
    const ids = computeValidCardIds({
      hand,
      trickCards: [tc('p1', lead)],
    })
    expect(ids.sort()).toEqual(['d1', 'h1'])
  })
})

describe('determineTrickWinner', () => {
  it('higher fehl card wins', () => {
    const winner = determineTrickWinner([
      tc('p1', card('a', 'spades', 'king')),
      tc('p2', card('b', 'spades', 'ace')),
      tc('p3', card('c', 'spades', 'nine')),
      tc('p4', card('d', 'spades', 'ten')),
    ])
    expect(winner.playerId).toBe('p2') // Ass schlägt 10/König/9
  })

  it('trump beats fehl', () => {
    const winner = determineTrickWinner([
      tc('p1', card('a', 'spades', 'ace')),
      tc('p2', card('b', 'spades', 'king')),
      tc('p3', card('c', 'diamonds', 'nine')), // Karo 9 = Trumpf
      tc('p4', card('d', 'spades', 'ten')),
    ])
    expect(winner.playerId).toBe('p3')
  })

  it('higher trump wins', () => {
    const winner = determineTrickWinner([
      tc('p1', card('a', 'diamonds', 'nine')), // niedrigster Trumpf
      tc('p2', card('b', 'clubs', 'queen')), // höchste Dame
      tc('p3', card('c', 'hearts', 'ten')), // Dulle - höchster Trumpf
      tc('p4', card('d', 'diamonds', 'jack')), // Karo Bube
    ])
    expect(winner.playerId).toBe('p3')
  })

  it('first equal card wins (zwei Herz 10)', () => {
    const winner = determineTrickWinner([
      tc('p1', card('a', 'diamonds', 'nine')),
      tc('p2', card('b', 'hearts', 'ten')),
      tc('p3', card('c', 'hearts', 'ten')),
      tc('p4', card('d', 'diamonds', 'jack')),
    ])
    expect(winner.playerId).toBe('p2')
  })

  it('discard (other fehl) loses against lead fehl', () => {
    const winner = determineTrickWinner([
      tc('p1', card('a', 'spades', 'ace')), // Lead = Pik Ass (höchste Fehl in Pik)
      tc('p2', card('b', 'hearts', 'king')), // andere Fehlfarbe (Herz König) → Abwurf, verliert immer
      tc('p3', card('c', 'spades', 'nine')),
      tc('p4', card('d', 'spades', 'ten')),
    ])
    expect(winner.playerId).toBe('p1')
  })
})
