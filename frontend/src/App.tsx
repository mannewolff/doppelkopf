import { useState, useEffect } from 'react'
import { GameBoard } from './components/Game/GameBoard'
import './styles/theme.css'
import './styles/layout.css'
import './styles/animations.css'

function App() {
  // Mock values for development
  // TODO: Replace with real game initialization
  const [gameId] = useState('game-demo-001')
  const [playerId] = useState('player-human-001')
  const [playerName] = useState('You')
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    // Simulate game starting after a brief delay
    const timer = setTimeout(() => {
      setGameStarted(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (!gameStarted) {
    return (
      <div className="app app--loading">
        <div className="start-screen">
          <h1>Doppelkopf</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <GameBoard gameId={gameId} playerId={playerId} playerName={playerName} />
    </div>
  )
}

export default App
