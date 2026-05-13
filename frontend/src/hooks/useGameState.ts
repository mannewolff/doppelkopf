import { useReducer, useCallback } from 'react'
import type { GameState, Trick, Announcement, GameError, GameEndResult } from '../types/game'

// ============================================================================
// ACTIONS
// ============================================================================

type GameAction =
  | { type: 'SET_STATE'; payload: GameState }
  | { type: 'UPDATE_CURRENT_TRICK'; payload: Trick }
  | { type: 'ADD_ANNOUNCEMENT'; payload: Announcement }
  | { type: 'FINISH_GAME'; payload: GameEndResult }
  | { type: 'ERROR'; payload: GameError }
  | { type: 'RESET' }

// ============================================================================
// REDUCER
// ============================================================================

const initialGameState: GameState = {
  gameId: '',
  phase: 'waiting',
  gameType: 'normalspiel',
  round: 0,
  players: [],
  currentPlayerId: '',
  currentPlayerPosition: 1,
  hand: [],
  validCardIds: [],
  tricks: [],
  currentTrick: null,
  playHistory: [],
  announcements: [],
  score: { re: 0, kontra: 0 },
  isFinished: false,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload

    case 'UPDATE_CURRENT_TRICK':
      return {
        ...state,
        currentTrick: action.payload,
        tricks: [...state.tricks, action.payload],
      }

    case 'ADD_ANNOUNCEMENT': {
      const announcement = action.payload
      const updatedAnnouncements = [...state.announcements, announcement]
      return {
        ...state,
        announcements: updatedAnnouncements,
        players: state.players.map((p) =>
          p.id === announcement.playerId
            ? { ...p, announcements: [...p.announcements, announcement] }
            : p
        ),
      }
    }

    case 'FINISH_GAME': {
      const result = action.payload
      return {
        ...state,
        isFinished: true,
        gameEndResult: result,
        phase: 'finished',
      }
    }

    case 'ERROR':
      console.error(`Game Error [${action.payload.code}]:`, action.payload.message)
      return state

    case 'RESET':
      return initialGameState

    default:
      return state
  }
}

// ============================================================================
// HOOK
// ============================================================================

interface UseGameStateReturn {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
  // Convenience actions
  setState: (state: GameState) => void
  updateTrick: (trick: Trick) => void
  addAnnouncement: (announcement: Announcement) => void
  finishGame: (result: GameEndResult) => void
  setError: (error: GameError) => void
  reset: () => void
}

export function useGameState(initialState?: GameState): UseGameStateReturn {
  const [gameState, dispatch] = useReducer(gameReducer, initialState || initialGameState)

  const setState = useCallback((state: GameState) => {
    dispatch({ type: 'SET_STATE', payload: state })
  }, [])

  const updateTrick = useCallback((trick: Trick) => {
    dispatch({ type: 'UPDATE_CURRENT_TRICK', payload: trick })
  }, [])

  const addAnnouncement = useCallback((announcement: Announcement) => {
    dispatch({ type: 'ADD_ANNOUNCEMENT', payload: announcement })
  }, [])

  const finishGame = useCallback((result: GameEndResult) => {
    dispatch({ type: 'FINISH_GAME', payload: result })
  }, [])

  const setError = useCallback((error: GameError) => {
    dispatch({ type: 'ERROR', payload: error })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    gameState,
    dispatch,
    setState,
    updateTrick,
    addAnnouncement,
    finishGame,
    setError,
    reset,
  }
}
