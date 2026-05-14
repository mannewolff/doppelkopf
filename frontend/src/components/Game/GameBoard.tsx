import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameWebSocket } from '../../hooks/useGameWebSocket'
import { useViewport } from '../../hooks/useViewport'
import type { Player, Trick, Card as CardType } from '../../types/game'
import { Card } from './Card'
import { VorbehaltPhase } from './VorbehaltPhase'
import { GameStartOverlay } from './GameStartOverlay'
import { GameEndScreen } from './GameEndScreen'
import { getRevealedParties, getValidCardIds, sortHandByGameType } from '../../lib/cardLogic'
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
   * Stable seat assignment: which playerId is shown on which visual seat
   * (1=top, 2=right, 3=left, 4=bottom). Locked in on first game state and
   * NOT changed when the server rotates `position` between games (dealer
   * rotation). The human is always at seat 4.
   */
  const [seatMap, setSeatMap] = useState<Record<1 | 2 | 3 | 4, string> | null>(null)

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

  // Revealed parties: who's Re / Kontra has been clarified by Kreuz-Damen plays?
  const revealedParties = useMemo(
    () => (gameState ? getRevealedParties(gameState) : {}),
    [gameState]
  )

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

  // When a new game starts (gameId changes, e.g. after game:next-game),
  // wipe local trick state so we don't show the last trick of the previous game.
  const currentGameId = gameState?.gameId
  useEffect(() => {
    setFrozenTrick(null)
    lastSeenTrickIdRef.current = null
    setShowLastTrick(false)
  }, [currentGameId])

  // Lock in the seat assignment on first load. Doppelkopf plays
  // **clockwise** around the table. From the human's point of view:
  //   linker Nachbar (next position) → sits on the LEFT  (seat 3)
  //   gegenüber                       → sits at the TOP   (seat 1)
  //   rechter Nachbar (prev position) → sits on the RIGHT (seat 2)
  //   self                            → sits at the BOTTOM (seat 4)
  //
  // We compute these relative to the human's initial `position` so it
  // works regardless of whether the human starts as dealer (pos 4) or
  // any other position.
  useEffect(() => {
    if (seatMap) return
    if (!gameState || gameState.players.length !== 4) return

    const human = gameState.players.find((p) => p.id === playerId)
    if (!human) {
      // eslint-disable-next-line no-console
      console.warn(
        '[seatMap-init] playerId not found in players, skipping init',
        { playerId, players: gameState.players.map((p) => p.id) }
      )
      return
    }

    const humanPos = human.position
    // Positions clockwise after the human
    const leftPos = ((humanPos % 4) + 1) as 1 | 2 | 3 | 4 // linker Nachbar
    const oppositePos = ((leftPos % 4) + 1) as 1 | 2 | 3 | 4 // gegenüber
    const rightPos = ((oppositePos % 4) + 1) as 1 | 2 | 3 | 4 // rechter Nachbar

    const findId = (pos: number) =>
      gameState.players.find((p) => p.position === pos)?.id

    const oppositeId = findId(oppositePos)
    const rightId = findId(rightPos)
    const leftId = findId(leftPos)
    if (!oppositeId || !rightId || !leftId) {
      // eslint-disable-next-line no-console
      console.warn('[seatMap-init] could not resolve seat occupants', {
        humanPos,
        leftPos,
        oppositePos,
        rightPos,
        players: gameState.players,
      })
      return
    }

    const map: Record<1 | 2 | 3 | 4, string> = {
      1: oppositeId, // top = gegenüber
      2: rightId, // right = rechter Nachbar
      3: leftId, // left = linker Nachbar
      4: playerId, // bottom = Mensch
    }

    // eslint-disable-next-line no-console
    console.log('[seatMap-init]', {
      playerId,
      humanPos,
      players: gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        isAI: p.isAI,
      })),
      mapping: {
        seat1_top_gegenüber: `${oppositeId} (pos ${oppositePos})`,
        seat2_right_rechterNachbar: `${rightId} (pos ${rightPos})`,
        seat3_left_linkerNachbar: `${leftId} (pos ${leftPos})`,
        seat4_bottom_selbst: `${playerId} (pos ${humanPos})`,
      },
    })

    setSeatMap(map)
  }, [gameState, playerId, seatMap])

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

  // Players at stable visual seats (1=top, 2=right, 3=left, 4=bottom).
  // Falls back to the server's `position` field on the very first render
  // before the seatMap has been initialized.
  const findById = (id: string | undefined) =>
    id ? gameState.players.find((p) => p.id === id) : undefined
  const player1 =
    findById(seatMap?.[1]) ?? gameState.players.find((p) => p.position === 1)
  const player2 =
    findById(seatMap?.[2]) ?? gameState.players.find((p) => p.position === 2)
  const player3 =
    findById(seatMap?.[3]) ?? gameState.players.find((p) => p.position === 3)
  const playerHuman = gameState.players.find((p) => p.id === playerId) // unten

  const isYourTurn = gameState.currentPlayerId === playerId

  // Determine which trick to show on the table:
  //  1. If showLastTrick is on → last completed trick (peek)
  //  2. Else if current trick has cards → the running trick wins
  //     (otherwise the frozen old trick would hide the new cards)
  //  3. Else if frozenTrick is set → the just-finished trick (2 s hold)
  //  4. Else → the empty current trick from server state
  const lastCompletedTrick: Trick | null =
    gameState.tricks.length > 0 ? gameState.tricks[gameState.tricks.length - 1] : null

  const hasRunningTrick = (gameState.currentTrick?.cards.length ?? 0) > 0
  let displayedTrick: Trick | null
  if (showLastTrick) {
    displayedTrick = lastCompletedTrick
  } else if (hasRunningTrick) {
    displayedTrick = gameState.currentTrick
  } else if (frozenTrick) {
    displayedTrick = frozenTrick
  } else {
    displayedTrick = gameState.currentTrick
  }

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
            revealedParty={revealedParties[player1.id]}
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
              revealedParty={revealedParties[player3.id]}
            />
          )}
        </div>

        {/* Tisch (Mittlere Stich-Karten — räumlich zugeordnet zu Spielerpositionen) */}
        <div className={`game-board__tisch ${showLastTrick ? 'game-board__tisch--peek' : ''}`}>
          {showLastTrick && (
            <div className="tisch__peek-label">
              👁 Letzter Stich (gewonnen von{' '}
              {gameState.players.find((p) => p.id === lastCompletedTrick?.winnerId)?.name ?? '?'})
            </div>
          )}
          <div className="tisch__current-trick">
            {/* Always render 4 positioned slots; cards appear in the slot of the
                player who played them, looked up via the stable seatMap. */}
            {([1, 2, 3, 4] as const).map((seat) => {
              const seatPlayerId =
                seatMap?.[seat] ??
                gameState.players.find((p) => p.position === seat)?.id
              const trickCard = seatPlayerId
                ? displayedTrick?.cards.find((tc) => tc.playerId === seatPlayerId)
                : undefined
              return (
                <div key={seat} className={`tisch__slot tisch__slot--pos${seat}`}>
                  {trickCard && (
                    <Card card={trickCard.card} isInTrick size="medium" />
                  )}
                </div>
              )
            })}
            {(displayedTrick === null || displayedTrick.cards.length === 0) && (
              <div className="tisch__placeholder">
                {isYourTurn ? '🎴 Du bist am Zug!' : 'Warten…'}
              </div>
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
              revealedParty={revealedParties[player2.id]}
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
            {revealedParties[playerHuman.id] && (
              <span className={`hand-area__party party-${revealedParties[playerHuman.id]}`}>
                {revealedParties[playerHuman.id] === 're' ? 'RE-Partei' : 'KONTRA-Partei'}
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
  /** Party shown to the human (Re/Kontra), or undefined if still hidden. */
  revealedParty?: 're' | 'kontra'
}

function PlayerInfo({ player, position, isActive, revealedParty }: PlayerInfoProps) {
  const vorbehaltBadge = renderVorbehaltBadge(player.vorbehaltDecision)
  return (
    <div
      className={`player-info player-info--${position} ${isActive ? 'player-info--active' : ''}`}
    >
      <div className="player-info__name">
        {isActive && <span className="player-info__active-icon">👉</span>}
        {player.name}
      </div>
      {revealedParty && (
        <div className={`player-info__party party-${revealedParty}`}>
          {revealedParty === 're' ? 'RE-Partei' : 'KONTRA-Partei'}
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

