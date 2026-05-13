import { describe, it, expect } from 'vitest'
import { GameEngine, HUMAN_PLAYER_ID, GameRuleError } from '../src/engine/GameEngine.js'
import { decideAiMove } from '../src/ai/SimpleAI.js'
import { computeValidCardIds } from '../src/engine/RulesValidator.js'

function seededRng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/**
 * Hilfsfunktion: durchläuft Vorbehalt + ready-to-play, sodass das Spiel in
 * 'playing' steht und ausgespielt werden kann.
 */
function skipToPlaying(engine: GameEngine): void {
  while (engine.internal().phase === 'finding') {
    const current = engine.internal().currentPlayerId
    engine.declareVorbehalt(current, 'gesund')
  }
  if (engine.internal().phase === 'ready-to-play') {
    engine.startPlaying(HUMAN_PLAYER_ID)
  }
}

/** Spielt das laufende Spiel mit der SimpleAI vollständig zu Ende. */
function playOutWithAi(engine: GameEngine): void {
  let safety = 200
  while (!engine.internal().isFinished && safety-- > 0) {
    const state = engine.internal()
    const currentId = state.currentPlayerId
    const hand = state.hands.get(currentId) ?? []
    const validIds = computeValidCardIds({
      hand,
      trickCards: state.currentTrick.cards,
    })
    const validCards = hand.filter((c) => validIds.includes(c.id))
    const decision = decideAiMove({
      validCards,
      trickCards: state.currentTrick.cards,
    })
    engine.playCard(currentId, decision.cardId)
  }
}

describe('GameEngine — Phase: finding', () => {
  it('starts in finding phase with position 1 (ai-1) at turn', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    const state = engine.internal()
    expect(state.phase).toBe('finding')
    expect(state.currentPlayerId).toBe('ai-1')
    expect(state.currentPlayerPosition).toBe(1)
    for (const p of state.players) {
      expect(p.party).toBeNull()
    }
  })

  it('transitions to ready-to-play after all 4 declare gesund', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    engine.declareVorbehalt('ai-1', 'gesund')
    engine.declareVorbehalt('ai-2', 'gesund')
    engine.declareVorbehalt('ai-3', 'gesund')
    engine.declareVorbehalt(HUMAN_PLAYER_ID, 'gesund')

    expect(engine.internal().phase).toBe('ready-to-play')
    expect(engine.internal().gameType).toBe('normalspiel')
    expect(engine.internal().currentPlayerId).toBe('ai-1')
    const reCount = engine.internal().players.filter((p) => p.party === 're').length
    expect(reCount).toBeGreaterThan(0)
  })

  it('rejects play-card while still in finding phase', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    const someAiCard = (engine.internal().hands.get('ai-1') ?? [])[0]
    expect(someAiCard).toBeDefined()
    expect(() => engine.playCard('ai-1', someAiCard!.id)).toThrow(GameRuleError)
  })
})

describe('GameEngine — Phase: ready-to-play', () => {
  it('stays in ready-to-play until startPlaying is called', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    engine.declareVorbehalt('ai-1', 'gesund')
    engine.declareVorbehalt('ai-2', 'gesund')
    engine.declareVorbehalt('ai-3', 'gesund')
    engine.declareVorbehalt(HUMAN_PLAYER_ID, 'gesund')

    expect(engine.internal().phase).toBe('ready-to-play')

    const aiHand = engine.internal().hands.get('ai-1') ?? []
    const someCard = aiHand[0]
    expect(someCard).toBeDefined()
    // Spielen nicht erlaubt in ready-to-play
    expect(() => engine.playCard('ai-1', someCard!.id)).toThrow(GameRuleError)
  })

  it('only human may call startPlaying', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    engine.declareVorbehalt('ai-1', 'gesund')
    engine.declareVorbehalt('ai-2', 'gesund')
    engine.declareVorbehalt('ai-3', 'gesund')
    engine.declareVorbehalt(HUMAN_PLAYER_ID, 'gesund')

    expect(() => engine.startPlaying('ai-1')).toThrow(GameRuleError)
    expect(engine.internal().phase).toBe('ready-to-play')
    engine.startPlaying(HUMAN_PLAYER_ID)
    expect(engine.internal().phase).toBe('playing')
  })

  it('startPlaying refused outside ready-to-play phase', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    expect(() => engine.startPlaying(HUMAN_PLAYER_ID)).toThrow(GameRuleError)
  })
})

describe('GameEngine — Vorbehalt: Hochzeit', () => {
  it('rejects hochzeit if player does not have both kreuz-damen', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    engine.declareVorbehalt('ai-1', 'gesund')
    engine.declareVorbehalt('ai-2', 'gesund')
    engine.declareVorbehalt('ai-3', 'gesund')
    engine.declareVorbehalt(HUMAN_PLAYER_ID, 'vorbehalt')

    const humanHand = engine.internal().hands.get(HUMAN_PLAYER_ID) ?? []
    const kreuzDamen = humanHand.filter(
      (c) => c.suit === 'clubs' && c.rank === 'queen',
    )
    if (kreuzDamen.length < 2) {
      expect(() =>
        engine.chooseVorbehaltType(HUMAN_PLAYER_ID, 'hochzeit'),
      ).toThrow(GameRuleError)
    }
  })

  it('rejects non-hochzeit vorbehalt types in MVP', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    engine.declareVorbehalt('ai-1', 'gesund')
    engine.declareVorbehalt('ai-2', 'gesund')
    engine.declareVorbehalt('ai-3', 'gesund')
    engine.declareVorbehalt(HUMAN_PLAYER_ID, 'vorbehalt')

    expect(() =>
      engine.chooseVorbehaltType(HUMAN_PLAYER_ID, 'damen-solo'),
    ).toThrow(GameRuleError)
  })
})

describe('GameEngine — Spoiler-Schutz', () => {
  it('other players have party=null until clarified, own party visible', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(123),
    })
    skipToPlaying(engine)
    const view = engine.publicViewFor(HUMAN_PLAYER_ID)

    const self = view.players.find((p) => p.id === HUMAN_PLAYER_ID)
    expect(self?.party).not.toBeNull()

    const otherPlayers = view.players.filter((p) => p.id !== HUMAN_PLAYER_ID)
    for (const op of otherPlayers) {
      expect(op.party).toBeNull()
    }
  })

  it('all parties visible after game finished', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(7),
    })
    skipToPlaying(engine)
    playOutWithAi(engine)

    const view = engine.publicViewFor(HUMAN_PLAYER_ID)
    for (const p of view.players) {
      expect(p.party).not.toBeNull()
    }
  })
})

describe('GameEngine — Bug-Report: Trick-Winner & currentPlayerId', () => {
  /**
   * Bug-Report (Frontend): nach einem abgeschlossenen Stich startet der
   * falsche Spieler den nächsten Stich. Mensch ist „dran", obwohl er den
   * vorherigen Stich nicht gewonnen hat.
   *
   * Akzeptanzkriterium: tricks.at(-1).winnerId === state.currentPlayerId.
   */
  it('after a finished trick, currentPlayerId equals winnerId of the last trick', () => {
    const engine = new GameEngine({
      gameId: 'g-trickwinner',
      humanPlayerName: 'Test',
      rng: seededRng(42),
    })
    skipToPlaying(engine)

    // Spiele genau einen vollständigen Stich (4 Karten)
    for (let i = 0; i < 4; i++) {
      const s = engine.internal()
      const currentId = s.currentPlayerId
      const hand = s.hands.get(currentId) ?? []
      const validIds = computeValidCardIds({
        hand,
        trickCards: s.currentTrick.cards,
      })
      const validCards = hand.filter((c) => validIds.includes(c.id))
      const decision = decideAiMove({
        validCards,
        trickCards: s.currentTrick.cards,
      })
      engine.playCard(currentId, decision.cardId)
    }

    const state = engine.internal()
    expect(state.tricks).toHaveLength(1)
    expect(state.currentTrick.cards).toHaveLength(0)
    const lastTrick = state.tricks[0]
    expect(lastTrick).toBeDefined()
    expect(lastTrick!.winnerId).toBeDefined()
    expect(state.currentPlayerId).toBe(lastTrick!.winnerId)
  })

  /**
   * Mehrfach-Test: das Invariant „Winner startet nächsten Stich" muss
   * über ALLE Stiche eines Spiels halten.
   */
  it('winner starts next trick — invariant holds across all 12 tricks', () => {
    const engine = new GameEngine({
      gameId: 'g-trickwinner-full',
      humanPlayerName: 'Test',
      rng: seededRng(7),
    })
    skipToPlaying(engine)

    let lastTrickCount = 0
    let safety = 200
    while (!engine.internal().isFinished && safety-- > 0) {
      const s = engine.internal()

      // Wenn ein neuer Trick gerade begonnen hat: Invariant prüfen
      if (s.tricks.length > lastTrickCount && s.tricks.length < TRICKS_PER_GAME_VALUE) {
        const lastTrick = s.tricks[s.tricks.length - 1]!
        if (s.currentTrick.cards.length === 0) {
          // Stich gerade geschlossen, neuer noch leer → Winner = currentPlayer
          expect(s.currentPlayerId).toBe(lastTrick.winnerId)
        }
        lastTrickCount = s.tricks.length
      }

      const currentId = s.currentPlayerId
      const hand = s.hands.get(currentId) ?? []
      const validIds = computeValidCardIds({
        hand,
        trickCards: s.currentTrick.cards,
      })
      const validCards = hand.filter((c) => validIds.includes(c.id))
      const decision = decideAiMove({
        validCards,
        trickCards: s.currentTrick.cards,
      })
      engine.playCard(currentId, decision.cardId)
    }

    expect(engine.internal().tricks).toHaveLength(TRICKS_PER_GAME_VALUE)
  })
})

const TRICKS_PER_GAME_VALUE = 12

describe('GameEngine — Spielablauf', () => {
  it('plays a full game to finished (waits for next-game, does not auto-restart)', () => {
    const engine = new GameEngine({
      gameId: 'g-full',
      humanPlayerName: 'Test',
      rng: seededRng(123),
    })
    skipToPlaying(engine)
    playOutWithAi(engine)

    expect(engine.internal().phase).toBe('finished')
    expect(engine.internal().tricks).toHaveLength(12)
    const view = engine.publicViewFor(HUMAN_PLAYER_ID)
    expect(view.gameEndResult).toBeDefined()
  })

  it('total eyes across all tricks equals 240', () => {
    const engine = new GameEngine({
      gameId: 'g-eyes',
      humanPlayerName: 'Test',
      rng: seededRng(7),
    })
    skipToPlaying(engine)
    playOutWithAi(engine)

    const tricks = engine.internal().tricks
    const total = tricks.reduce((sum, t) => sum + t.points, 0)
    expect(total).toBe(240)
  })

  it('rejects play out of turn during playing phase', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(2),
    })
    skipToPlaying(engine)
    const view = engine.publicViewFor(HUMAN_PLAYER_ID)
    const anyCard = view.hand[0]
    expect(anyCard).toBeDefined()
    expect(() => engine.playCard(HUMAN_PLAYER_ID, anyCard!.id)).toThrow(GameRuleError)
  })
})

describe('GameEngine — Spielzettel & nextGame', () => {
  it('initial Spielzettel-Felder sind sauber gesetzt', () => {
    const engine = new GameEngine({
      gameId: 'g-zettel',
      humanPlayerName: 'Test',
      rng: seededRng(11),
    })
    const view = engine.publicViewFor(HUMAN_PLAYER_ID)
    expect(view.gameNumber).toBe(1)
    expect(view.totalGames).toBe(20)
    expect(view.gameHistory).toEqual([])
    for (const id of ['ai-1', 'ai-2', 'ai-3', HUMAN_PLAYER_ID]) {
      expect(view.cumulativeScore[id]).toBe(0)
      expect(view.pflichtsoloPlayed[id]).toBe(false)
    }
  })

  it('next-game rotates dealer, increments gameNumber, accumulates score', () => {
    const engine = new GameEngine({
      gameId: 'g-zettel',
      humanPlayerName: 'Test',
      rng: seededRng(42),
    })
    const initialDealer = engine.internal().dealerPosition
    skipToPlaying(engine)
    playOutWithAi(engine)

    const endResult = engine.publicViewFor(HUMAN_PLAYER_ID).gameEndResult!
    const reScore = endResult.statistics.re.score
    const kontraScore = endResult.statistics.kontra.score

    const reIds = endResult.statistics.re.players
    const kontraIds = endResult.statistics.kontra.players

    engine.nextGame(HUMAN_PLAYER_ID)

    const state = engine.internal()
    expect(state.gameNumber).toBe(2)
    expect(state.phase).toBe('finding')
    expect(state.dealerPosition).not.toBe(initialDealer)
    expect(state.gameHistory).toHaveLength(1)
    expect(state.gameHistory[0]?.gameNumber).toBe(1)

    // cumulativeScore = letzte Spielergebnisse
    for (const id of reIds) {
      expect(state.cumulativeScore[id]).toBe(reScore)
    }
    for (const id of kontraIds) {
      expect(state.cumulativeScore[id]).toBe(kontraScore)
    }
  })

  it('rejects nextGame in wrong phase', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    expect(() => engine.nextGame(HUMAN_PLAYER_ID)).toThrow(GameRuleError)
  })

  it('rejects nextGame from non-human', () => {
    const engine = new GameEngine({
      gameId: 'g1',
      humanPlayerName: 'Test',
      rng: seededRng(1),
    })
    skipToPlaying(engine)
    playOutWithAi(engine)
    expect(() => engine.nextGame('ai-1')).toThrow(GameRuleError)
  })

  it('transitions to round-finished after the last game of the round', () => {
    const engine = new GameEngine({
      gameId: 'g-round',
      humanPlayerName: 'Test',
      rng: seededRng(99),
      totalGames: 2,
    })

    // Spiel 1
    skipToPlaying(engine)
    playOutWithAi(engine)
    expect(engine.internal().phase).toBe('finished')
    engine.nextGame(HUMAN_PLAYER_ID)
    expect(engine.internal().gameNumber).toBe(2)
    expect(engine.internal().phase).toBe('finding')

    // Spiel 2
    skipToPlaying(engine)
    playOutWithAi(engine)
    expect(engine.internal().phase).toBe('finished')
    engine.nextGame(HUMAN_PLAYER_ID)
    expect(engine.internal().phase).toBe('round-finished')
    expect(engine.internal().gameNumber).toBe(2) // bleibt bei letztem absolvierten Spiel
    expect(engine.internal().gameHistory).toHaveLength(2)
  })

  it('pflichtsoloPlayed bleibt false bei normalspiel und hochzeit', () => {
    const engine = new GameEngine({
      gameId: 'g-solo',
      humanPlayerName: 'Test',
      rng: seededRng(3),
    })
    skipToPlaying(engine)
    playOutWithAi(engine)

    const view = engine.publicViewFor(HUMAN_PLAYER_ID)
    for (const id of Object.keys(view.pflichtsoloPlayed)) {
      expect(view.pflichtsoloPlayed[id]).toBe(false)
    }
  })

  it('dealer rotates 4 → 1 → 2 → 3 across multiple next-game calls', () => {
    const engine = new GameEngine({
      gameId: 'g-deal',
      humanPlayerName: 'Test',
      rng: seededRng(5),
      totalGames: 5,
    })
    const dealersSeen: number[] = [engine.internal().dealerPosition]

    for (let i = 0; i < 3; i++) {
      skipToPlaying(engine)
      playOutWithAi(engine)
      engine.nextGame(HUMAN_PLAYER_ID)
      dealersSeen.push(engine.internal().dealerPosition)
    }
    // initial dealer = 4 → 1 → 2 → 3
    expect(dealersSeen).toEqual([4, 1, 2, 3])
  })
})
