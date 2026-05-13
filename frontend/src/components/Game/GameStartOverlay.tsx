import type { GameState, Card as CardType } from '../../types/game'
import { Card } from './Card'
import './GameStartOverlay.css'

interface GameStartOverlayProps {
  gameState: GameState
  sortedHand: CardType[]
  playerId: string
  onStartPlaying: () => void
}

/**
 * Full-screen overlay shown in phase 'ready-to-play':
 *  - Game type headline (Normalspiel, Hochzeit, …)
 *  - Who plays first
 *  - Read-only preview of the player's sorted hand
 *  - Big green "Spiel starten" button → sends game:start-playing
 *
 * Only the human can confirm — even if the first player is an AI.
 */
export function GameStartOverlay({
  gameState,
  sortedHand,
  playerId,
  onStartPlaying,
}: GameStartOverlayProps) {
  const ausspielSpieler = gameState.players.find((p) => p.id === gameState.currentPlayerId)
  const humanIsAusspiel = gameState.currentPlayerId === playerId
  const totalGames = gameState.totalGames
  const gameNumber = gameState.gameNumber

  return (
    <div className="game-start-overlay">
      <div className="game-start-overlay__panel">
        <div className="game-start-overlay__progress">
          Spiel {gameNumber} von {totalGames}
        </div>

        <h1 className="game-start-overlay__title">
          🎴 {getGameTypeLabel(gameState.gameType)}
        </h1>

        <div className="game-start-overlay__ausspiel">
          {humanIsAusspiel ? (
            <strong>Du spielst aus.</strong>
          ) : (
            <>
              <strong>{ausspielSpieler?.name ?? 'Spieler'}</strong> spielt aus.
            </>
          )}
        </div>

        <div className="game-start-overlay__hand-label">Deine Hand:</div>
        <div className="game-start-overlay__hand">
          {sortedHand.map((card) => (
            <Card key={card.id} card={card} size="small" />
          ))}
        </div>

        <button
          type="button"
          className="game-start-overlay__button"
          onClick={onStartPlaying}
          autoFocus
        >
          🎴 Spiel starten
        </button>

        <div className="game-start-overlay__hint">
          Klick auf den Button — die Karten werden erst dann gespielt.
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function getGameTypeLabel(gameType: GameState['gameType']): string {
  const labels: Record<GameState['gameType'], string> = {
    normalspiel: 'Normalspiel',
    hochzeit: 'Hochzeit',
    'damen-solo': 'Damen-Solo',
    'buben-solo': 'Buben-Solo',
    fleischlos: 'Fleischlos',
    'farbsolo-clubs': 'Kreuz-Solo',
    'farbsolo-spades': 'Pik-Solo',
    'farbsolo-hearts': 'Herz-Solo',
    'farbsolo-diamonds': 'Karo-Solo',
  }
  return labels[gameType] ?? gameType
}
