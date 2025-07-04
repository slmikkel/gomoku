import { useState, useEffect } from 'react'
import { useNetworkGameStore } from '../../store/networkGameStore'
import { useAuthStore } from '../../store/authStore'
import NetworkLobby from './NetworkLobby'
import NetworkGameRoom from './NetworkGameRoom'
import NetworkGameBoard from './NetworkGameBoard'
import { NetworkGameStatus } from '../../types/network'

type GamePhase = 'lobby' | 'room' | 'playing'

const NetworkGame = () => {
  const { user } = useAuthStore()
  const { networkGame, reset } = useNetworkGameStore()
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('lobby')
  const [currentNetworkGameId, setCurrentNetworkGameId] = useState<string | null>(null)
  const [cellSize, setCellSize] = useState<'small' | 'medium' | 'large'>('large')

  // Redirect to appropriate phase based on game state
  useEffect(() => {
    if (!networkGame) {
      setCurrentPhase('lobby')
      setCurrentNetworkGameId(null)
    } else if (networkGame.status === NetworkGameStatus.Waiting) {
      setCurrentPhase('room')
      setCurrentNetworkGameId(networkGame.id)
    } else if (networkGame.status === NetworkGameStatus.InProgress) {
      setCurrentPhase('playing')
      setCurrentNetworkGameId(networkGame.id)
    }
  }, [networkGame])

  const handleGameJoined = (networkGameId: string) => {
    setCurrentNetworkGameId(networkGameId)
    setCurrentPhase('room')
  }

  const handleGameCreated = (networkGameId: string) => {
    setCurrentNetworkGameId(networkGameId)
    setCurrentPhase('room')
  }

  const handleGameStarted = () => {
    setCurrentPhase('playing')
  }

  const handleGameLeft = () => {
    reset()
    setCurrentPhase('lobby')
    setCurrentNetworkGameId(null)
  }

  const handleGameEnded = () => {
    setCurrentPhase('room')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">
            Please log in to access network multiplayer games.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Network Multiplayer</h1>
              {currentPhase !== 'lobby' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>•</span>
                  <span>{currentPhase === 'room' ? 'Game Room' : 'Playing'}</span>
                  {networkGame && (
                    <>
                      <span>•</span>
                      <span>{networkGame.gameName}</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                👤 {user.username}
              </div>
              {currentPhase !== 'lobby' && (
                <button
                  onClick={handleGameLeft}
                  className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  ← Back to Lobby
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {currentPhase === 'lobby' && (
          <NetworkLobby
            onGameJoined={handleGameJoined}
            onGameCreated={handleGameCreated}
          />
        )}

        {currentPhase === 'room' && currentNetworkGameId && (
          <NetworkGameRoom
            networkGameId={currentNetworkGameId}
            onGameStarted={handleGameStarted}
            onGameLeft={handleGameLeft}
            cellSize={cellSize}
            onCellSizeChange={setCellSize}
          />
        )}

        {currentPhase === 'playing' && currentNetworkGameId && networkGame && (
          <NetworkGameBoard
            networkGameId={currentNetworkGameId}
            networkGame={networkGame}
            onGameEnded={handleGameEnded}
            onGameLeft={handleGameLeft}
            cellSize={cellSize}
            onCellSizeChange={setCellSize}
            thirdPlayerIcon="🔺"
          />
        )}
      </div>
    </div>
  )
}

export default NetworkGame