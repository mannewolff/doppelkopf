import type { GameState, VorbehaltDecision } from '../../types/game'

interface VorbehaltPhaseProps {
  gameState: GameState
  playerId: string
  onDeclareVorbehalt: (decision: 'gesund' | 'vorbehalt') => void
  onChooseVorbehaltType: (type: VorbehaltDecision) => void
}

/**
 * Inline UI for the Vorbehalt phase before the game starts.
 *
 * Phase 'finding':
 *   - Player at turn: shown "GESUND" / "VORBEHALT" buttons
 *   - Other players: shown waiting indicator
 *
 * Phase 'finding-vorbehalt-type':
 *   - Player who declared Vorbehalt picks the concrete type
 *   - MVP: only "Hochzeit" available
 *   - Other types are visible but disabled (coming soon)
 */
export function VorbehaltPhase({
  gameState,
  playerId,
  onDeclareVorbehalt,
  onChooseVorbehaltType,
}: VorbehaltPhaseProps) {
  const isYourTurn = gameState.currentPlayerId === playerId
  const isYourVorbehalt = gameState.vorbehaltActivePlayerId === playerId

  // Phase 1: Vorbehalt-Frage
  if (gameState.phase === 'finding') {
    return (
      <div className="vorbehalt-phase">
        <div className="vorbehalt-phase__label">
          {isYourTurn ? (
            <span className="vorbehalt-phase__prompt">Vorbehalt?</span>
          ) : (
            <span className="vorbehalt-phase__waiting">
              ⏳ Warten auf {getCurrentPlayerName(gameState)}…
            </span>
          )}
        </div>
        <div className="vorbehalt-phase__buttons">
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--gesund"
            disabled={!isYourTurn}
            onClick={() => onDeclareVorbehalt('gesund')}
          >
            ✓ Gesund
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--vorbehalt"
            disabled={!isYourTurn}
            onClick={() => onDeclareVorbehalt('vorbehalt')}
          >
            ⚠ Vorbehalt
          </button>
        </div>
      </div>
    )
  }

  // Phase 2: Vorbehalt-Typ wählen
  if (gameState.phase === 'finding-vorbehalt-type') {
    if (!isYourVorbehalt) {
      return (
        <div className="vorbehalt-phase">
          <div className="vorbehalt-phase__waiting">
            ⏳ {getVorbehaltPlayerName(gameState)} wählt den Vorbehalt…
          </div>
        </div>
      )
    }
    return (
      <div className="vorbehalt-phase">
        <div className="vorbehalt-phase__label">
          <span className="vorbehalt-phase__prompt">Welcher Vorbehalt?</span>
        </div>
        <div className="vorbehalt-phase__buttons vorbehalt-phase__buttons--types">
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            onClick={() => onChooseVorbehaltType('hochzeit')}
          >
            💍 Hochzeit
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            👑 Damen­solo
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            🃏 Buben­solo
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            🚫 Fleischlos
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            ♣ Kreuz-Solo
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            ♠ Pik-Solo
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            ♥ Herz-Solo
          </button>
          <button
            type="button"
            className="vorbehalt-button vorbehalt-button--type"
            disabled
            title="Kommt in einer späteren Iteration"
          >
            ♦ Karo-Solo
          </button>
        </div>
      </div>
    )
  }

  return null
}

function getCurrentPlayerName(gameState: GameState): string {
  const player = gameState.players.find((p) => p.id === gameState.currentPlayerId)
  return player?.name ?? 'Spieler'
}

function getVorbehaltPlayerName(gameState: GameState): string {
  const player = gameState.players.find((p) => p.id === gameState.vorbehaltActivePlayerId)
  return player?.name ?? 'Spieler'
}
