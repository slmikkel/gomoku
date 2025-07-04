import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNetworkGameStore } from '../../store/networkGameStore'
import { NetworkService } from '../../services/networkService'
import { useNetworkSignalR } from '../../hooks/use-network-signalr'
import { NetworkGameStatus, PlayerSymbol } from '../../types/network'
import CellSizeSelector from '../ui/CellSizeSelector'
import IconSelectionModal from '../ui/IconSelectionModal'
import { getIconById } from '../../services/iconService'

interface NetworkGameRoomProps {
  networkGameId: string
  onGameStarted: () => void
  onGameLeft: () => void
  cellSize: 'small' | 'medium' | 'large'
  onCellSizeChange: (size: 'small' | 'medium' | 'large') => void
}

const NetworkGameRoom = ({ networkGameId, onGameStarted, onGameLeft, cellSize, onCellSizeChange }: NetworkGameRoomProps) => {
  const { user } = useAuthStore()
  const { 
    networkGame, 
    setNetworkGame, 
    chatMessages, 
    addChatMessage, 
    updatePlayerConnection,
    updateNetworkGameStatus 
  } = useNetworkGameStore()
  
  const [chatMessage, setChatMessage] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showIconModal, setShowIconModal] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<string>('🔺') // Default for 3rd player

  // Function to reload network game data
  const loadNetworkGame = async () => {
    try {
      const game = await NetworkService.getNetworkGame(networkGameId)
      setNetworkGame(game)
    } catch (err: any) {
      console.error('Failed to reload network game:', err)
      setError(err.response?.data?.error || 'Failed to reload game data')
    }
  }

  const signalRCallbacks = {
    onPlayerConnected: (gameId: string, userId: string) => {
      if (gameId === networkGameId) {
        updatePlayerConnection(userId, true)
      }
    },
    onPlayerDisconnected: (gameId: string, userId: string) => {
      if (gameId === networkGameId) {
        updatePlayerConnection(userId, false)
      }
    },
    onNetworkGameStarted: (game: any) => {
      if (game.id === networkGameId) {
        setNetworkGame(game)
        onGameStarted()
      }
    },
    onNetworkGameChatMessage: (message: any) => {
      if (message.networkGameId === networkGameId) {
        addChatMessage(message)
      }
    },
    onNetworkGameCancelled: (gameId: string, reason: string) => {
      if (gameId === networkGameId) {
        setError(`Game cancelled: ${reason}`)
        setTimeout(() => onGameLeft(), 2000)
      }
    },
    onNetworkGamePlayerJoined: (gameId: string, player: any) => {
      if (gameId === networkGameId) {
        console.log('Player joined:', player)
        // Refresh the game data to get updated player list
        loadNetworkGame()
      }
    }
  }

  const { 
    isConnected, 
    joinNetworkGameRoom, 
    leaveNetworkGameRoom, 
    startNetworkGame,
    sendNetworkGameChatMessage 
  } = useNetworkSignalR(signalRCallbacks)

  // Load game data and join room
  useEffect(() => {
    const initializeRoom = async () => {
      try {
        const game = await NetworkService.getNetworkGame(networkGameId)
        setNetworkGame(game)
        
        // Check if current user is 3rd player and show icon modal
        const currentUserPlayer = game.players.find(p => p.userId === user?.id)
        if (currentUserPlayer && currentUserPlayer.playerSymbol === PlayerSymbol.Triangle && game.maxPlayers === 3) {
          setShowIconModal(true)
        }
        
        if (isConnected) {
          await joinNetworkGameRoom(networkGameId)
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load game')
      }
    }

    initializeRoom()

    return () => {
      if (isConnected) {
        leaveNetworkGameRoom(networkGameId)
      }
    }
  }, [networkGameId, isConnected, user?.id])

  const handleStartGame = async () => {
    if (!networkGame || !isHost) return

    try {
      setIsStarting(true)
      setError(null)
      await startNetworkGame(networkGameId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start game')
    } finally {
      setIsStarting(false)
    }
  }

  const handleLeaveGame = async () => {
    try {
      setIsLeaving(true)
      await NetworkService.leaveNetworkGame(networkGameId)
      onGameLeft()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to leave game')
      setIsLeaving(false)
    }
  }

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !isConnected) return

    try {
      await sendNetworkGameChatMessage(networkGameId, chatMessage)
      setChatMessage('')
    } catch (err) {
      setError('Failed to send message')
    }
  }

  // Get icons used by existing players (for exclusion)
  const getUsedIcons = (): string[] => {
    const usedIcons: string[] = []
    
    // Use actual player icons from network game data
    networkGame.players.forEach(player => {
      if (player.playerIcon) {
        usedIcons.push(player.playerIcon)
      }
    })
    
    return usedIcons
  }

  const handleIconSelect = async (icon: string) => {
    try {
      setSelectedIcon(icon)
      setShowIconModal(false)
      
      // Send the selected icon to the backend
      await NetworkService.updatePlayerIcon({
        networkGameId: networkGameId,
        playerIcon: icon
      })
      
      // Reload game data to get updated player info
      await loadNetworkGame()
    } catch (err: any) {
      console.error('Failed to update icon:', err)
      setError(err.response?.data?.error || 'Failed to update icon')
    }
  }

  const handleCloseIconModal = () => {
    setShowIconModal(false)
  }

  const currentUserPlayer = networkGame?.players.find(p => p.userId === user?.id)
  const isHost = currentUserPlayer?.isHost
  const canStartGame = isHost && networkGame?.status === NetworkGameStatus.Waiting && networkGame?.currentPlayers >= 2

  if (!networkGame) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p>Loading game room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-accent/50 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{networkGame.gameName}</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>👑 Host: {networkGame.hostUsername}</span>
                  <span>📏 Board: {networkGame.boardSize}×{networkGame.boardSize}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    networkGame.status === NetworkGameStatus.Waiting 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {networkGame.status === NetworkGameStatus.Waiting ? 'Waiting for Players' : 'In Progress'}
                  </span>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            {/* Game Settings */}
            <div className="mb-4 p-4 bg-accent/30 rounded-lg">
              <h4 className="text-sm font-medium mb-3">Game Settings</h4>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Cell Size:</label>
                  <CellSizeSelector 
                    value={cellSize} 
                    onChange={onCellSizeChange}
                    className="w-32 px-2 py-1 text-xs border border-border rounded-md bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Game Controls */}
            <div className="flex gap-3">
              {canStartGame && (
                <button
                  onClick={handleStartGame}
                  disabled={isStarting}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isStarting ? 'Starting...' : 
                    networkGame.currentPlayers === networkGame.maxPlayers 
                      ? '🚀 Start Game' 
                      : `🚀 Start Game (${networkGame.currentPlayers}/${networkGame.maxPlayers})`
                  }
                </button>
              )}
              {currentUserPlayer?.playerSymbol === PlayerSymbol.Triangle && (
                <button
                  onClick={() => setShowIconModal(true)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  🎨 Choose Icon ({selectedIcon})
                </button>
              )}
              <button
                onClick={handleLeaveGame}
                disabled={isLeaving}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isLeaving ? 'Leaving...' : (isHost ? '❌ Quit Game' : '🚪 Leave Game')}
              </button>
            </div>
          </div>

          {/* Players */}
          <div className="bg-accent/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Players ({networkGame.currentPlayers}/{networkGame.maxPlayers})</h3>
            <div className="space-y-3">
              {networkGame.players.map((player) => (
                <div
                  key={player.userId}
                  className="flex items-center justify-between p-3 bg-background rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="font-medium">{player.username}</span>
                    {player.isHost && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">
                        Host
                      </span>
                    )}
                    {player.userId === user?.id && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {player.playerIcon || (player.playerSymbol === PlayerSymbol.X ? '✖' : 
                                                       player.playerSymbol === PlayerSymbol.O ? '⭕' : 
                                                       (player.userId === user?.id ? selectedIcon : '▲'))}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {player.playerSymbol === PlayerSymbol.X ? 'Player X' : 
                       player.playerSymbol === PlayerSymbol.O ? 'Player O' : 'Player △'}
                    </span>
                  </div>
                </div>
              ))}
              
              {networkGame.currentPlayers < networkGame.maxPlayers && (
                <div className="p-3 bg-accent/50 rounded-md border-2 border-dashed border-border text-center text-muted-foreground">
                  Waiting for another player...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="bg-accent/50 rounded-lg p-4 flex flex-col h-[500px]">
          <h3 className="text-lg font-semibold mb-4">Chat</h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm">
                No messages yet. Say hello! 👋
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{message.senderUsername}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{message.message}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
              maxLength={200}
            />
            <button
              onClick={handleSendChatMessage}
              disabled={!chatMessage.trim() || !isConnected}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
      
      {/* Icon Selection Modal */}
      <IconSelectionModal
        isOpen={showIconModal}
        onClose={handleCloseIconModal}
        onIconSelect={handleIconSelect}
        excludedIcons={getUsedIcons()}
        preSelectedIcon={selectedIcon}
      />
    </div>
  )
}

export default NetworkGameRoom