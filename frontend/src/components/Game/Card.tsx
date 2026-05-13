import type { Card as CardType } from '../../types/game'
import './Card.css'

interface CardProps {
  card: CardType
  isValid?: boolean
  isSelected?: boolean
  isInTrick?: boolean
  isFaceDown?: boolean
  onClick?: () => void
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

/**
 * Card Component using htdebeer/SVG-cards PNG images
 *
 * Maps card data to image filenames:
 * - clubs → club
 * - spades → spade
 * - hearts → heart
 * - diamonds → diamond
 * - ace → 1
 * - ten → 10
 * - nine → 9
 * - king, queen, jack → unchanged
 */
export function Card({
  card,
  isValid = false,
  isSelected = false,
  isInTrick = false,
  isFaceDown = false,
  onClick,
  disabled = false,
  size = 'medium',
}: CardProps) {
  const imagePath = isFaceDown ? '/cards/back.png' : getCardImagePath(card)
  const altText = isFaceDown ? 'Verdeckte Karte' : getCardAltText(card)

  const className = [
    'playing-card',
    `playing-card--${size}`,
    isValid && 'playing-card--valid',
    isSelected && 'playing-card--selected',
    isInTrick && 'playing-card--in-trick',
    disabled && 'playing-card--disabled',
    onClick && !disabled && 'playing-card--clickable',
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        disabled={disabled}
        title={altText}
      >
        <img src={imagePath} alt={altText} draggable={false} />
      </button>
    )
  }

  return (
    <div className={className} title={altText}>
      <img src={imagePath} alt={altText} draggable={false} />
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const SUIT_MAP: Record<string, string> = {
  clubs: 'club',
  spades: 'spade',
  hearts: 'heart',
  diamonds: 'diamond',
}

const RANK_MAP: Record<string, string> = {
  ace: '1',
  ten: '10',
  king: 'king',
  queen: 'queen',
  jack: 'jack',
  nine: '9',
}

function getCardImagePath(card: CardType): string {
  const suit = SUIT_MAP[card.suit]
  const rank = RANK_MAP[card.rank]
  return `/cards/${suit}_${rank}.png`
}

const SUIT_NAMES: Record<string, string> = {
  clubs: 'Kreuz',
  spades: 'Pik',
  hearts: 'Herz',
  diamonds: 'Karo',
}

const RANK_NAMES: Record<string, string> = {
  ace: 'Ass',
  ten: 'Zehn',
  king: 'König',
  queen: 'Dame',
  jack: 'Bube',
  nine: 'Neun',
}

function getCardAltText(card: CardType): string {
  return `${SUIT_NAMES[card.suit] ?? card.suit} ${RANK_NAMES[card.rank] ?? card.rank}`
}
