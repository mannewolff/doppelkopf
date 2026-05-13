import type { GameState, GameHistoryEntry } from '../../types/game'
import './GameEndScreen.css'

interface GameEndScreenProps {
  gameState: GameState
  onNextGame: () => void
}

/**
 * Full-screen overlay shown when:
 *  - phase === 'finished' → "Nächstes Spiel" continues the round
 *  - phase === 'round-finished' → round is done, only summary shown
 *
 * Shows:
 *  - Sieger des aktuellen Spiels (winner party + point value)
 *  - Spielzettel: history of all played games in this round
 *  - Cumulative score per player
 *  - Pflichtsolo-Status (which players have played their mandatory solo)
 *  - "Nächstes Spiel" button (or round-finished message)
 */
export function GameEndScreen({ gameState, onNextGame }: GameEndScreenProps) {
  const isRoundFinished = gameState.phase === 'round-finished'
  const winner = gameState.gameEndResult?.winner
  const finalScore = gameState.gameEndResult?.finalScore

  return (
    <div className="game-board game-board--ended">
      <div className="game-end-screen">
        {!isRoundFinished ? (
          <>
            <h1 className="game-end-screen__title">🏆 Spiel beendet!</h1>
            {winner && (
              <div className={`game-end-screen__winner winner-${winner}`}>
                {winner === 're' ? 'RE' : 'KONTRA'} gewinnt
                {finalScore !== undefined ? ` (${finalScore} Punkte)` : ''}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="game-end-screen__title">🏁 Runde beendet!</h1>
            <div className="game-end-screen__round-info">
              Alle {gameState.totalGames} Spiele dieser Runde sind gespielt.
            </div>
          </>
        )}

        <div className="game-end-screen__progress">
          Spiel {gameState.gameNumber} von {gameState.totalGames}
        </div>

        {/* Spielzettel: cumulative scores per player */}
        <Spielzettel gameState={gameState} />

        {!isRoundFinished ? (
          <button
            type="button"
            className="game-end-screen__button"
            onClick={onNextGame}
            autoFocus
          >
            ⏭ Nächstes Spiel
          </button>
        ) : (
          <button
            type="button"
            className="game-end-screen__button game-end-screen__button--secondary"
            onClick={() => window.location.reload()}
            autoFocus
          >
            🔄 Neue Runde
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// SPIELZETTEL SUBCOMPONENT
// ============================================================================

interface SpielzettelProps {
  gameState: GameState
}

function Spielzettel({ gameState }: SpielzettelProps) {
  const players = [...gameState.players].sort((a, b) => a.position - b.position)
  const history = gameState.gameHistory

  return (
    <div className="spielzettel">
      <div className="spielzettel__title">Spielzettel</div>

      {/* Cumulative scores per player */}
      <table className="spielzettel__cumulative">
        <thead>
          <tr>
            {players.map((p) => (
              <th key={p.id}>
                <div className="spielzettel__player-name">{p.name}</div>
                <div className="spielzettel__pflichtsolo">
                  {gameState.pflichtsoloPlayed[p.id] ? '✓ Pflichtsolo' : '⚠ kein Solo'}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {players.map((p) => {
              const value = gameState.cumulativeScore[p.id] ?? 0
              return (
                <td
                  key={p.id}
                  className={`spielzettel__score ${
                    value > 0
                      ? 'spielzettel__score--positive'
                      : value < 0
                        ? 'spielzettel__score--negative'
                        : ''
                  }`}
                >
                  {formatScore(value)}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      {/* History of completed games */}
      {history.length > 0 && (
        <div className="spielzettel__history">
          <div className="spielzettel__history-title">Bisherige Spiele</div>
          <table className="spielzettel__history-table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Spiel</th>
                <th>Sieger</th>
                <th>Punkte</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <HistoryRow key={entry.gameNumber} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface HistoryRowProps {
  entry: GameHistoryEntry
}

function HistoryRow({ entry }: HistoryRowProps) {
  return (
    <tr>
      <td>{entry.gameNumber}</td>
      <td>{getGameTypeLabel(entry.gameType)}</td>
      <td className={`spielzettel__history-winner spielzettel__history-winner--${entry.winnerParty}`}>
        {entry.winnerParty === 're' ? 'RE' : 'KONTRA'}
      </td>
      <td>{entry.pointValue}</td>
    </tr>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatScore(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `${value}`
  return '0'
}

function getGameTypeLabel(gameType: GameHistoryEntry['gameType']): string {
  const labels: Record<GameHistoryEntry['gameType'], string> = {
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
