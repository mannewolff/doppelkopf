/**
 * Mock WebSocket Server for Doppelkopf Frontend Development
 *
 * Simulates a game with 1 human player vs 3 AI opponents.
 * - Generates a sample hand (12 cards)
 * - Simulates AI moves automatically
 * - Validates basic card plays
 * - Handles announcements
 *
 * Usage:
 *   npm install
 *   npm start
 *
 * Server runs on ws://localhost:3001
 */

import { WebSocketServer } from 'ws'

const PORT = 3001

// ============================================================================
// GAME DATA GENERATION
// ============================================================================

const SUITS = ['clubs', 'spades', 'hearts', 'diamonds']
const RANKS = ['ace', 'ten', 'king', 'queen', 'jack', 'nine']

/**
 * Generate a unique card ID
 */
function makeCardId(suit, rank, index) {
  return `${suit}-${rank}-${index}`
}

/**
 * Generate a full Doppelkopf deck (48 cards: 4 suits × 6 ranks × 2 copies)
 */
function generateDeck() {
  const deck = []
  let idx = 0
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: makeCardId(suit, rank, idx++),
          suit,
          rank,
        })
      }
    }
  }
  return deck
}

/**
 * Single Fisher-Yates shuffle pass (uniform distribution)
 */
function fisherYatesShuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Cut the deck (abheben)
 *
 * TSR Regel: Mindestens 3 Karten oben oder unten beim Abheben.
 * Wir wählen einen zufälligen Cut-Punkt zwischen Index 3 und (48 - 3).
 *
 * Beispiel: [A, B, C, D, E, F, ...] -> cut bei 3 -> [D, E, F, ..., A, B, C]
 */
function cutDeck(deck) {
  const minCut = 3
  const maxCut = deck.length - 3
  const cutPoint = Math.floor(Math.random() * (maxCut - minCut + 1)) + minCut
  return [...deck.slice(cutPoint), ...deck.slice(0, cutPoint)]
}

/**
 * Authentic Doppelkopf shuffle:
 * 1. Mehrfach mischen (3 Durchgänge Fisher-Yates)
 * 2. Abheben (Cut durch rechten Nachbarn)
 * 3. Erneut leichtes Mischen
 */
function shuffleAuthentic(deck) {
  let result = [...deck]

  // Step 1: Multiple Fisher-Yates shuffles (simulates "gut mischen")
  const passes = 3 + Math.floor(Math.random() * 2) // 3-4 times
  for (let i = 0; i < passes; i++) {
    result = fisherYatesShuffle(result)
  }

  // Step 2: Cut (Abheben)
  result = cutDeck(result)

  // Step 3: Final light shuffle
  result = fisherYatesShuffle(result)

  return result
}

/**
 * Backwards compatibility - main shuffle function
 */
function shuffle(deck) {
  return shuffleAuthentic(deck)
}

/**
 * Deal cards in authentic Doppelkopf style: 4 × 3 cards
 *
 * Each player receives 3 cards in 4 rounds, starting with the player
 * to the left of the dealer (position 1 -> 2 -> 3 -> 4).
 *
 * Returns object: { 'ai-1': [...12 cards], 'ai-2': [...12], 'ai-3': [...12], 'player-human-001': [...12] }
 */
function dealCards3334(deck) {
  const hands = {
    'ai-1': [], // position 1 (oben, links vom "Geber" position 4)
    'ai-2': [], // position 2 (rechts vom Geber)
    'ai-3': [], // position 3 (gegenüber)
    'player-human-001': [], // position 4 (Geber)
  }

  const playerOrder = ['ai-1', 'ai-2', 'ai-3', 'player-human-001']
  let deckIndex = 0

  // 4 Runden zu je 3 Karten pro Spieler
  for (let round = 0; round < 4; round++) {
    for (const playerId of playerOrder) {
      hands[playerId].push(deck[deckIndex], deck[deckIndex + 1], deck[deckIndex + 2])
      deckIndex += 3
    }
  }

  return hands
}

/**
 * Sort hand by suit + rank for better display
 */
function sortHand(hand) {
  const suitOrder = { clubs: 0, spades: 1, hearts: 2, diamonds: 3 }
  const rankOrder = { ace: 0, ten: 1, king: 2, queen: 3, jack: 4, nine: 5 }
  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit]
    if (suitDiff !== 0) return suitDiff
    return rankOrder[a.rank] - rankOrder[b.rank]
  })
}

// ============================================================================
// GAME STATE
// ============================================================================

const games = new Map() // gameId -> gameState

function createGameState(gameId, playerName) {
  // Authentic Doppelkopf shuffle: multiple shuffles + cut + final shuffle
  const deck = shuffleAuthentic(generateDeck())

  // Deal cards 3-3-3-3 (authentic Doppelkopf style)
  const hands = dealCards3334(deck)

  const playerHand = sortHand(hands['player-human-001'])
  const ai1Hand = hands['ai-1']
  const ai2Hand = hands['ai-2']
  const ai3Hand = hands['ai-3']

  console.log(
    `🃏 Cards dealt — Human: ${playerHand.length}, AI1: ${ai1Hand.length}, AI2: ${ai2Hand.length}, AI3: ${ai3Hand.length}`
  )

  // Game version increments every time a new game is created.
  // This is used by setTimeouts from previous games to skip stale moves.
  const gameVersion = Date.now()

  const players = [
    {
      id: 'ai-1',
      name: 'KI Nord',
      position: 1,
      party: null,
      isAI: true,
      announcements: [],
      cardsRemaining: 12,
    },
    {
      id: 'ai-2',
      name: 'KI Ost',
      position: 2,
      party: null,
      isAI: true,
      announcements: [],
      cardsRemaining: 12,
    },
    {
      id: 'ai-3',
      name: 'KI West',
      position: 3,
      party: null,
      isAI: true,
      announcements: [],
      cardsRemaining: 12,
    },
    {
      id: 'player-human-001',
      name: playerName || 'You',
      position: 4,
      party: null,
      isAI: false,
      announcements: [],
      cardsRemaining: 12,
    },
  ]

  return {
    gameId,
    phase: 'playing',
    gameType: 'normalspiel',
    round: 1,
    players,
    currentPlayerId: 'player-human-001', // Human starts for demo
    currentPlayerPosition: 4,
    hand: playerHand,
    validCardIds: playerHand.map((c) => c.id), // All cards valid for demo
    tricks: [],
    currentTrick: {
      id: 'trick-1',
      cards: [],
      points: 0,
    },
    playHistory: [],
    announcements: [],
    score: { re: 0, kontra: 0 },
    isFinished: false,
    // Hidden state (not sent to client)
    _hands: {
      'ai-1': ai1Hand,
      'ai-2': ai2Hand,
      'ai-3': ai3Hand,
      'player-human-001': playerHand,
    },
    _version: gameVersion,
  }
}

/**
 * Strip server-only fields before sending to client
 */
function stripPrivateFields(state) {
  const { _hands, _version, ...publicState } = state
  return publicState
}

// ============================================================================
// AI MOVES
// ============================================================================

/**
 * Simulate an AI player making a move
 */
function makeAIMove(game, aiPlayerId, ws, gameVersion) {
  // Skip if this is a stale callback from a previous game
  if (gameVersion !== undefined && game._version !== gameVersion) {
    console.log(`⏭ Skipping stale AI move (version mismatch)`)
    return
  }

  // Safety check: don't auto-play for the human player
  if (aiPlayerId === 'player-human-001') {
    console.log(`⏭ Skipping AI move - this is the human player`)
    return
  }

  const aiHand = game._hands[aiPlayerId]
  if (!aiHand || aiHand.length === 0) return

  // Pick a random card (very simple AI)
  const cardIndex = Math.floor(Math.random() * aiHand.length)
  const card = aiHand[cardIndex]

  // Remove from AI hand
  aiHand.splice(cardIndex, 1)

  // Update player's cards remaining
  const player = game.players.find((p) => p.id === aiPlayerId)
  if (player) {
    player.cardsRemaining = aiHand.length
  }

  // Add to current trick
  game.currentTrick.cards.push({
    playerId: aiPlayerId,
    card,
    playedAt: Date.now(),
  })

  game.playHistory.push({
    playerId: aiPlayerId,
    card,
    playedAt: Date.now(),
  })

  console.log(`[AI ${aiPlayerId}] played ${card.suit} ${card.rank}`)

  // Broadcast card played event
  send(ws, {
    type: 'game:card-played',
    payload: {
      playerId: aiPlayerId,
      card,
      timestamp: Date.now(),
    },
  })

  // Check if trick is complete (4 cards)
  if (game.currentTrick.cards.length === 4) {
    const v = game._version
    setTimeout(() => finishTrick(game, ws, v), 1500) // Pause to show trick
  } else {
    // Move to next player
    nextPlayer(game)

    // Set valid cards if human is next
    if (game.currentPlayerId === 'player-human-001') {
      game.validCardIds = game.hand.map((c) => c.id)
    } else {
      game.validCardIds = []
    }

    sendGameState(game, ws)

    // If next is AI, trigger their move
    if (game.currentPlayerId !== 'player-human-001') {
      const v = game._version
      setTimeout(() => makeAIMove(game, game.currentPlayerId, ws, v), 1000)
    }
  }
}

/**
 * Finish a trick: determine winner, update score, start new trick
 */
function finishTrick(game, ws, gameVersion) {
  // Skip if this is a stale callback from a previous game
  if (gameVersion !== undefined && game._version !== gameVersion) {
    console.log(`⏭ Skipping stale finishTrick (version mismatch)`)
    return
  }

  // Simple winner: random for mock (real implementation uses card ranking)
  const winnerCard = game.currentTrick.cards[Math.floor(Math.random() * 4)]
  game.currentTrick.winnerId = winnerCard.playerId
  game.currentTrick.points = calculateTrickPoints(game.currentTrick.cards)

  // Update score (random for mock)
  if (Math.random() > 0.5) {
    game.score.re += game.currentTrick.points
  } else {
    game.score.kontra += game.currentTrick.points
  }

  game.tricks.push(game.currentTrick)

  send(ws, {
    type: 'game:trick-won',
    payload: {
      winnerId: game.currentTrick.winnerId,
      trickId: game.currentTrick.id,
      points: game.currentTrick.points,
    },
  })

  // Start new trick
  game.currentTrick = {
    id: `trick-${game.tricks.length + 1}`,
    cards: [],
    points: 0,
  }

  // Winner starts next trick
  game.currentPlayerId = winnerCard.playerId
  game.currentPlayerPosition = game.players.find(
    (p) => p.id === winnerCard.playerId
  ).position

  // Check if game is over (all cards played)
  if (game._hands['player-human-001'].length === 0) {
    endGame(game, ws)
    return
  }

  // Update valid cards for human if it's their turn
  if (game.currentPlayerId === 'player-human-001') {
    game.validCardIds = game.hand.map((c) => c.id)
  } else {
    game.validCardIds = []
  }

  sendGameState(game, ws)

  // If next is AI, trigger their move
  if (game.currentPlayerId !== 'player-human-001') {
    const v = game._version
    setTimeout(() => makeAIMove(game, game.currentPlayerId, ws, v), 1000)
  }
}

/**
 * Calculate points for a trick (sum of eyes)
 */
function calculateTrickPoints(cards) {
  const eyes = { ace: 11, ten: 10, king: 4, queen: 3, jack: 2, nine: 0 }
  return cards.reduce((sum, tc) => sum + (eyes[tc.card.rank] || 0), 0)
}

/**
 * Move to next player in clockwise order
 */
function nextPlayer(game) {
  const currentPos = game.currentPlayerPosition
  const nextPos = currentPos === 4 ? 1 : currentPos + 1
  const nextPlayer = game.players.find((p) => p.position === nextPos)
  if (nextPlayer) {
    game.currentPlayerId = nextPlayer.id
    game.currentPlayerPosition = nextPlayer.position
  }
}

/**
 * End the game
 */
function endGame(game, ws) {
  game.isFinished = true
  game.phase = 'finished'
  const winner = game.score.re > game.score.kontra ? 're' : 'kontra'

  send(ws, {
    type: 'game:ended',
    payload: {
      gameId: game.gameId,
      winner,
      finalScore: Math.max(game.score.re, game.score.kontra),
      statistics: {
        re: { players: ['player-human-001'], score: game.score.re },
        kontra: { players: ['ai-1', 'ai-2', 'ai-3'], score: game.score.kontra },
        tricks: game.tricks.length,
        announcements: game.announcements,
      },
      playedAt: Date.now(),
    },
  })
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

function send(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

function sendGameState(game, ws) {
  send(ws, {
    type: 'game:state-updated',
    payload: stripPrivateFields(game),
  })
}

function handleMessage(ws, data) {
  let message
  try {
    message = JSON.parse(data)
  } catch (err) {
    console.error('Failed to parse message:', err)
    return
  }

  console.log('← Received:', message.type, message.payload)

  switch (message.type) {
    case 'game:join': {
      const { gameId, playerName } = message.payload
      // Always create a fresh game (no stale state from previous sessions)
      const game = createGameState(gameId, playerName)
      games.set(gameId, game)
      ws._gameId = gameId

      send(ws, {
        type: 'game:joined',
        payload: {
          playerId: 'player-human-001',
          gameState: stripPrivateFields(game),
        },
      })
      break
    }

    case 'game:play-card': {
      const game = games.get(ws._gameId)
      if (!game) return

      const { cardId } = message.payload
      const cardIndex = game.hand.findIndex((c) => c.id === cardId)
      if (cardIndex === -1) {
        send(ws, {
          type: 'game:error',
          payload: {
            code: 'invalid-card',
            message: 'Card not in your hand',
          },
        })
        return
      }

      const card = game.hand[cardIndex]
      game.hand.splice(cardIndex, 1)
      game._hands['player-human-001'].splice(cardIndex, 1)
      const humanPlayer = game.players.find((p) => p.id === 'player-human-001')
      if (humanPlayer) {
        humanPlayer.cardsRemaining = game.hand.length
      }

      game.currentTrick.cards.push({
        playerId: 'player-human-001',
        card,
        playedAt: Date.now(),
      })

      game.playHistory.push({
        playerId: 'player-human-001',
        card,
        playedAt: Date.now(),
      })

      console.log(`[Human] played ${card.suit} ${card.rank}`)

      send(ws, {
        type: 'game:card-played',
        payload: {
          playerId: 'player-human-001',
          card,
          timestamp: Date.now(),
        },
      })

      // Check if trick complete
      if (game.currentTrick.cards.length === 4) {
        const v = game._version
        setTimeout(() => finishTrick(game, ws, v), 1500) // Pause to show trick
      } else {
        nextPlayer(game)
        game.validCardIds = [] // Not your turn anymore
        sendGameState(game, ws)

        // Start AI chain
        const v = game._version
        setTimeout(() => makeAIMove(game, game.currentPlayerId, ws, v), 1000)
      }
      break
    }

    case 'game:announce': {
      const game = games.get(ws._gameId)
      if (!game) return

      const { announcementType } = message.payload
      const announcement = {
        id: `ann-${Date.now()}`,
        playerId: 'player-human-001',
        playerName: 'You',
        type: announcementType,
        timestamp: Date.now(),
      }

      game.announcements.push(announcement)
      const humanPlayer = game.players.find((p) => p.id === 'player-human-001')
      if (humanPlayer) {
        humanPlayer.announcements.push(announcement)
      }

      console.log(`[Human] announced: ${announcementType}`)

      send(ws, {
        type: 'game:announcement',
        payload: announcement,
      })

      sendGameState(game, ws)
      break
    }

    case 'game:state-request': {
      const game = games.get(ws._gameId)
      if (game) {
        sendGameState(game, ws)
      }
      break
    }

    default:
      console.warn('Unknown message type:', message.type)
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const wss = new WebSocketServer({ port: PORT })

console.log(`🎮 Doppelkopf Mock Server running on ws://localhost:${PORT}`)
console.log(`   Waiting for connections...`)

wss.on('connection', (ws) => {
  console.log('✓ Client connected')

  ws.on('message', (data) => handleMessage(ws, data.toString()))

  ws.on('close', () => {
    console.log('× Client disconnected')
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
  })
})

wss.on('error', (err) => {
  console.error('Server error:', err)
})
