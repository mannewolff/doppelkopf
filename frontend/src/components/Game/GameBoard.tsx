import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameWebSocket } from '../../hooks/useGameWebSocket'
import { useViewport } from '../../hooks/useViewport'
import type { Player, Trick, Card as CardType } from '../../types/game'
import { Card } from './Card'
import { VorbehaltPhase } from './VorbehaltPhase'
import { GameStartOverlay } from './GameStartOverlay'
import { GameEndScreen } from './GameEndScreen'
import { getValidCardIds, sortHandByGameType } from '../../lib/cardLogic'
import './GameBoard.css'

/** Time (ms) the finished trick stays visible on the table before being cleared. */
const TRICK_HOLD_MS = 2000

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
  const {
    gameState,
    connected,
    error,
    sendPlayCard,
    sendAnnounce,
    sendDeclareVorbehalt,
    sendChooseVorbehaltType,
    sendStartPlaying,
    sendNextGame,
  } = useGameWebSocket({
    gameId,
    playerId,
    playerName,
  })

  const [isLoading, setIsLoading] = useState(!connected)
  const [showLastTrick, setShowLastTrick] = useState(false)

  /**
   * Frozen trick: when a trick completes, we hold it on the table for
   * TRICK_HOLD_MS so the player sees the 4th card. We trigger this off the
   * `tricks` array growing (most reliable signal) rather than off the
   * currentTrick reaching 4 cards (which the server may overwrite instantly).
   */
  const [frozenTrick, setFrozenTrick] = useState<Trick | null>(null)
  const lastSeenTrickIdRef = useRef<string | null>(null)

  useEffect(() => {
    setIsLoading(!connected)
  }, [connected])

  // Client-side sorted hand (trumps left → fail suits right)
  const sortedHand: CardType[] = useMemo(() => {
    if (!gameState?.hand) return []
    return sortHandByGameType(gameState.hand, gameState.gameType)
  }, [gameState?.hand, gameState?.gameType])

  const isYourTurnEarly = gameState?.currentPlayerId === playerId

  // Client-side validity (we ignore server's validCardIds and compute our own)
  const validCardIds: string[] = useMemo(() => {
    if (!gameState) return []
    return getValidCardIds(
      gameState.hand,
      gameState.currentTrick,
      gameState.gameType,
      isYourTurnEarly
    )
  }, [gameState, isYourTurnEarly])

  // Track trick completion: whenever a NEW trick lands in tricks[], freeze it
  // for TRICK_HOLD_MS so the player sees all 4 cards (especially the 4th).
  const tricksLength = gameState?.tricks?.length ?? 0
  useEffect(() => {
    if (!gameState || tricksLength === 0) return
    const lastTrick = gameState.tricks[tricksLength - 1]
    if (!lastTrick || lastTrick.id === lastSeenTrickIdRef.current) return
    lastSeenTrickIdRef.current = lastTrick.id
    setFrozenTrick(lastTrick)
    setShowLastTrick(false) // close peek if open
    const timer = setTimeout(() => setFrozenTrick(null), TRICK_HOLD_MS)
    return () => clearTimeout(timer)
  }, [tricksLength, gameState])

  // ESC closes last-trick overlay
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowLastTrick(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  /**
   * Single-click card play: a click immediately plays the card.
   * Optimized for mobile (one tap = play).
   * Invalid cards are not clickable (disabled) so misclicks are blocked.
   */
  const handleCardClick = (cardId: string) => {
    if (!validCardIds.includes(cardId)) return
    setShowLastTrick(false)
    sendPlayCard(cardId)
  }

  /** Toggle "show last trick" overlay */
  const handleToggleLastTrick = () => {
    setShowLastTrick((prev) => !prev)
  }

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

  // Match base gameId — the server appends "::g{N}" for follow-up games
  // within a Spielzettel round, so we compare the prefix only.
  const gameIdMatches =
    !!gameState && (gameState.gameId === gameId || gameState.gameId.startsWith(`${gameId}::`))
  if (!gameState || !gameIdMatches) {
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

  // Determine which trick to show on the table:
  //  1. If showLastTrick is on → last completed trick (peek)
  //  2. Else if frozenTrick is set → the trick we're holding to show 4th card
  //  3. Else → the current trick from server state
  const lastCompletedTrick: Trick | null =
    gameState.tricks.length > 0 ? gameState.tricks[gameState.tricks.length - 1] : null

  const displayedTrick: Trick | null = showLastTrick
    ? lastCompletedTrick
    : frozenTrick ?? gameState.currentTrick

  // "Last trick" button is enabled whenever a completed trick exists.
  // Peeking is allowed even mid-trick - it just overlays the table.
  const canShowLastTrick = lastCompletedTrick !== null

  // Game End / Round End → show summary screen with Spielzettel
  if (gameState.phase === 'finished' || gameState.phase === 'round-finished') {
    return <GameEndScreen gameState={gameState} onNextGame={sendNextGame} />
  }

  // Ready-to-play: human must click "Spiel starten" before AI starts moving
  const showStartOverlay = gameState.phase === 'ready-to-play'

  return (
    <div className={`game-board game-board--${viewport}`}>
      {showStartOverlay && (
        <GameStartOverlay
          gameState={gameState}
          sortedHand={sortedHand}
          playerId={playerId}
          onStartPlaying={sendStartPlaying}
        />
      )}
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
        <div className={`game-board__tisch ${showLastTrick ? 'game-board__tisch--peek' : ''}`}>
          {showLastTrick && (
            <div className="tisch__peek-label">
              👁 Letzter Stich (gewonnen von{' '}
              {gameState.players.find((p) => p.id === lastCompletedTrick?.winnerId)?.name ?? '?'})
            </div>
          )}
          <div className="tisch__current-trick">
            {displayedTrick === null || displayedTrick.cards.length === 0 ? (
              <div className="tisch__placeholder">
                {isYourTurn ? '🎴 Du bist am Zug!' : 'Warten...'}
              </div>
            ) : (
              displayedTrick.cards.map((tc) => (
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
            <button
              type="button"
              className="last-trick-button"
              disabled={!canShowLastTrick}
              onClick={handleToggleLastTrick}
              title={
                canShowLastTrick
                  ? 'Letzten Stich anzeigen (Klick wieder = schließen, ESC schließt)'
                  : 'Noch kein abgeschlossener Stich vorhanden'
              }
            >
              {showLastTrick ? '✕ Schließen' : '👁 Letzter Stich'}
            </button>
          </div>
        )}
        <div className={`game-board__hand game-board__hand--${viewport}`}>
          {sortedHand.map((card) => {
            const isValid = validCardIds.includes(card.id)
            return (
              <Card
                key={card.id}
                card={card}
                isValid={isValid}
                disabled={!isValid}
                size="medium"
                onClick={() => handleCardClick(card.id)}
              />
            )
          })}
        </div>
      </div>

      {/* ================================================================
          FOOTER: Vorbehalt-Phase (Finding) ODER Announcement Buttons (Playing)
          ================================================================ */}
      <div className="game-board__footer">
        {gameState.phase === 'finding' || gameState.phase === 'finding-vorbehalt-type' ? (
          <VorbehaltPhase
            gameState={gameState}
            playerId={playerId}
            onDeclareVorbehalt={sendDeclareVorbehalt}
            onChooseVorbehaltType={sendChooseVorbehaltType}
          />
        ) : (
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
        )}

        <div className="game-board__score-panel">
          <div className="score-panel__header">Score</div>
          <div className="score-panel__row">
            <div className="score-panel__points score-re">
              <span className="score-label">RE</span>
              <span className="score-value">{formatScore(gameState.score.re)}</span>
            </div>
            <div className="score-panel__points score-kontra">
              <span className="score-label">KO</span>
              <span className="score-value">{formatScore(gameState.score.kontra)}</span>
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
  const vorbehaltBadge = renderVorbehaltBadge(player.vorbehaltDecision)
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
      {vorbehaltBadge && (
        <div className="player-info__vorbehalt-status">{vorbehaltBadge}</div>
      )}
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

/**
 * Returns a small badge label for the player's Vorbehalt decision.
 * Returns null if no decision yet or in playing phase (already cleared).
 */
function renderVorbehaltBadge(decision: Player['vorbehaltDecision']): string | null {
  if (!decision) return null
  if (decision === 'gesund') return '✓ Gesund'
  if (decision === 'hochzeit') return '💍 Hochzeit'
  return '⚠ Vorbehalt'
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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Render a score value, or "?" if it's null (Spoiler-Schutz pre-clarification).
 */
function formatScore(value: number | null): string {
  if (value === null) return '?'
  return String(value)
}

