import { useEffect, useState } from 'react'
import { useGameWebSocket } from '../../hooks/useGameWebSocket'
import { useViewport } from '../../hooks/useViewport'
import type { Player } from '../../types/game'
import { Card } from './Card'
import './GameBoard.css'

interface GameBoardProps {
  gameId: string
  playerId: string
  playerName: string
}

/**
 * Main Game Container
 * Responsive Layout for Landscape-only gameplay
 *
 * Layout structure:
 *   ┌─────────────────────────────┐
 *   │           P1 (oben)         │
 *   ├──────┬──────────────┬───────┤
 *   │ P3   │   TISCH      │  P2   │
 *   │(links)│              │(rechts)│
 *   ├──────┴──────────────┴───────┤
 *   │     HUMAN HAND (P4)         │
 *   │  [Buttons] [Score]          │
 *   └─────────────────────────────┘
 */
export function GameBoard({ gameId, playerId, playerName }: GameBoardProps) {
  const viewport = useViewport()
  const { gameState, connected, error, sendPlayCard, sendAnnounce } = useGameWebSocket({
    gameId,
    playerId,
    playerName,
  })

  const [isLoading, setIsLoading] = useState(!connected)

  useEffect(() => {
    setIsLoading(!connected)
  }, [connected])

  // Loading / Waiting States
  if (isLoading) {
    return (
      <div className="game-board game-board--loading">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Connecting to game...</p>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    )
  }

  if (!gameState || gameState.gameId !== gameId) {
    return (
      <div className="game-board game-board--waiting">
        <div className="waiting-screen">
          <p>Waiting for game to start...</p>
        </div>
      </div>
    )
  }

  // Players: 4 in fixed positions
  const player1 = gameState.players.find((p) => p.position === 1) // oben
  const player2 = gameState.players.find((p) => p.position === 2) // rechts
  const player3 = gameState.players.find((p) => p.position === 3) // links
  const playerHuman = gameState.players.find((p) => p.id === playerId) // unten

  const isYourTurn = gameState.currentPlayerId === playerId

  // Game End State
  if (gameState.isFinished && gameState.gameEndResult) {
    return (
      <GameEndScreen
        winner={gameState.gameEndResult.winner}
        finalScore={gameState.score}
        onNewGame={() => {
          // Reload page to start fresh game
          window.location.reload()
        }}
      />
    )
  }

  return (
    <div className={`game-board game-board--${viewport}`}>
      {/* ================================================================
          TOP ROW: Player 1 (oben/gegenüber)
          ================================================================ */}
      <div className="game-board__top">
        {player1 && (
          <PlayerInfo
            player={player1}
            position="top"
            isActive={gameState.currentPlayerId === player1.id}
          />
        )}
      </div>

      {/* ================================================================
          MIDDLE ROW: Player 3 (links) | Tisch | Player 2 (rechts)
          ================================================================ */}
      <div className="game-board__middle">
        {/* Player 3 (links) */}
        <div className="game-board__side game-board__side--left">
          {player3 && (
            <PlayerInfo
              player={player3}
              position="left"
              isActive={gameState.currentPlayerId === player3.id}
            />
          )}
        </div>

        {/* Tisch (Mittlere Stich-Karten) */}
        <div className="game-board__tisch">
          <div className="tisch__current-trick">
            {gameState.currentTrick?.cards.length === 0 ? (
              <div className="tisch__placeholder">
                {isYourTurn ? '🎴 Du bist am Zug!' : 'Warten...'}
              </div>
            ) : (
              gameState.currentTrick?.cards.map((tc) => (
                <Card
                  key={`${tc.playerId}-${tc.card.id}`}
                  card={tc.card}
                  isInTrick
                  size="small"
                />
              ))
            )}
          </div>
        </div>

        {/* Player 2 (rechts) */}
        <div className="game-board__side game-board__side--right">
          {player2 && (
            <PlayerInfo
              player={player2}
              position="right"
              isActive={gameState.currentPlayerId === player2.id}
            />
          )}
        </div>
      </div>

      {/* ================================================================
          HAND AREA: Your Cards (Player 4)
          ================================================================ */}
      <div className="game-board__hand-area">
        {playerHuman && (
          <div className="hand-area__header">
            <span className="hand-area__name">{playerHuman.name}</span>
            {playerHuman.party && (
              <span className={`hand-area__party party-${playerHuman.party}`}>
                {playerHuman.party.toUpperCase()}
              </span>
            )}
            {isYourTurn && <span className="hand-area__turn-indicator">👈 DU BIST AM ZUG</span>}
          </div>
        )}
        <div className={`game-board__hand game-board__hand--${viewport}`}>
          {gameState.hand.map((card) => {
            const isValid = gameState.validCardIds.includes(card.id)
            return (
              <Card
                key={card.id}
                card={card}
                isValid={isValid}
                disabled={!isValid}
                size="medium"
                onClick={() => isValid && sendPlayCard(card.id)}
              />
            )
          })}
        </div>
      </div>

      {/* ================================================================
          FOOTER: Announcement Buttons + Score Panel
          ================================================================ */}
      <div className="game-board__footer">
        <div className="game-board__announcements">
          <AnnouncementButton
            type="re"
            active={gameState.announcements.some((a) => a.type === 're')}
            disabled={!isYourTurn}
            onClick={() => sendAnnounce('re')}
          />
          <AnnouncementButton
            type="kontra"
            active={gameState.announcements.some((a) => a.type === 'kontra')}
            disabled={!isYourTurn}
            onClick={() => sendAnnounce('kontra')}
          />
          <AnnouncementButton
            type="90"
            active={gameState.announcements.some((a) => a.type === '90')}
            disabled={!isYourTurn}
            onClick={() => sendAnnounce('90')}
          />
          <AnnouncementButton
            type="60"
            active={gameState.announcements.some((a) => a.type === '60')}
            disabled={!isYourTurn}
            onClick={() => sendAnnounce('60')}
          />
          <AnnouncementButton
            type="30"
            active={gameState.announcements.some((a) => a.type === '30')}
            disabled={!isYourTurn}
            onClick={() => sendAnnounce('30')}
          />
          <AnnouncementButton
            type="schwarz"
            active={gameState.announcements.some((a) => a.type === 'schwarz')}
            disabled={!isYourTurn}
            onClick={() => sendAnnounce('schwarz')}
          />
        </div>

        <div className="game-board__score-panel">
          <div className="score-panel__header">Score</div>
          <div className="score-panel__row">
            <div className="score-panel__points score-re">
              <span className="score-label">RE</span>
              <span className="score-value">{gameState.score.re}</span>
            </div>
            <div className="score-panel__points score-kontra">
              <span className="score-label">KO</span>
              <span className="score-value">{gameState.score.kontra}</span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="game-board__error">{error}</div>}
    </div>
  )
}

// ============================================================================
// PLAYER INFO COMPONENT
// ============================================================================

interface PlayerInfoProps {
  player: Player
  position: 'top' | 'left' | 'right'
  isActive: boolean
}

function PlayerInfo({ player, position, isActive }: PlayerInfoProps) {
  return (
    <div
      className={`player-info player-info--${position} ${isActive ? 'player-info--active' : ''}`}
    >
      <div className="player-info__name">
        {isActive && <span className="player-info__active-icon">👉</span>}
        {player.name}
      </div>
      {player.party && (
        <div className={`player-info__party party-${player.party}`}>
          {player.party.toUpperCase()}
        </div>
      )}
      <div className="player-info__cards">
        🂠 {player.cardsRemaining}
      </div>
      {player.announcements.length > 0 && (
        <div className="player-info__announcements">
          {player.announcements.slice(-2).map((a) => (
            <span key={a.id} className="announcement-badge">
              {a.type}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// GAME END SCREEN
// ============================================================================

interface GameEndScreenProps {
  winner: 're' | 'kontra'
  finalScore: { re: number; kontra: number }
  onNewGame: () => void
}

function GameEndScreen({ winner, finalScore, onNewGame }: GameEndScreenProps) {
  return (
    <div className="game-board game-board--ended">
      <div className="game-end-screen">
        <h1 className="game-end-screen__title">🏆 Spiel beendet!</h1>
        <div className={`game-end-screen__winner winner-${winner}`}>
          {winner === 're' ? 'RE' : 'KONTRA'} hat gewonnen!
        </div>
        <div className="game-end-screen__scores">
          <div className="game-end-screen__score">
            <div className="score-label">RE</div>
            <div className="score-value">{finalScore.re}</div>
          </div>
          <div className="game-end-screen__separator">vs</div>
          <div className="game-end-screen__score">
            <div className="score-label">KONTRA</div>
            <div className="score-value">{finalScore.kontra}</div>
          </div>
        </div>
        <button className="game-end-screen__button" onClick={onNewGame}>
          🔄 Neues Spiel
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// ANNOUNCEMENT BUTTON
// ============================================================================

interface AnnouncementButtonProps {
  type: string
  active: boolean
  disabled: boolean
  onClick: () => void
}

function AnnouncementButton({ type, active, disabled, onClick }: AnnouncementButtonProps) {
  return (
    <button
      className={`announcement-button announcement-button--${type} ${active ? 'announcement-button--active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={`Announce ${type}`}
    >
      {type}
    </button>
  )
}

