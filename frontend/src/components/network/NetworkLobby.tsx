import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNetworkGameStore } from '../../store/networkGameStore'
import { NetworkService } from '../../services/networkService'
import { NetworkGameStatus, CreateNetworkGameDto, NetworkGameDto } from '../../types/network'
import { useNetworkSignalR } from '../../hooks/use-network-signalr'
import BoardSizeSelector from '../ui/BoardSizeSelector'
import { getIconById, getIconsByCategory, ICON_CATEGORIES } from '../../services/iconService'

interface NetworkLobbyProps {
  onGameJoined: (networkGameId: string) => void
  onGameCreated: (networkGameId: string) => void
}

const NetworkLobby = ({ onGameJoined, onGameCreated }: NetworkLobbyProps) => {
  console.log('🚀 NetworkLobby component is rendering!')
  const { user } = useAuthStore()
  const {
    discoveredGames,
    isScanning,
    setDiscoveredGames,
    setScanning,
    addDiscoveredGame,
    removeDiscoveredGame
  } = useNetworkGameStore()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreateNetworkGameDto>({
    gameName: '',
    boardSize: 8,
    maxPlayers: 2
  })
  const [selectedIconSet, setSelectedIconSet] = useState('classic')
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [myGames, setMyGames] = useState<NetworkGameDto[]>([])
  const [loadingMyGames, setLoadingMyGames] = useState(false)
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null)

  const signalRCallbacks = {
    onNetworkGamePlayerJoined: (gameId: string, player: any) => {
      console.log('🚀 [NetworkLobby] Player joined game event received:', { gameId, player })
      console.log('🚀 [NetworkLobby] Current user:', user?.id)
      console.log('🚀 [NetworkLobby] Is this for my game?', myGames.some(g => g.id === gameId))
      
      // Refresh my games list to show updated player count
      loadMyGames()
      
      // Also refresh discovered games in case this affects available games
      if (!isScanning) {
        handleScanForGames()
      }
    },
    onPlayerConnectedToRoom: (networkGameId: string, userId: string) => {
      console.log('🔗 [NetworkLobby] Player connected to room:', { networkGameId, userId })
      loadMyGames()
    },
    onPlayerDisconnectedFromRoom: (networkGameId: string, userId: string) => {
      console.log('🔌 [NetworkLobby] Player disconnected from room:', { networkGameId, userId })
      loadMyGames()
    }
  }

  const { isConnected } = useNetworkSignalR(signalRCallbacks)

  // Auto-scan for games when component mounts
  useEffect(() => {
    handleScanForGames()
  }, [])

  const handleScanForGames = async () => {
    try {
      setScanning(true)
      setError(null)
      const games = await NetworkService.discoverGames(3)
      setDiscoveredGames(games)
    } catch (err) {
      setError('Failed to scan for games')
      console.error('Scan error:', err)
    } finally {
      setScanning(false)
    }
  }

  const handleCreateGame = async () => {
    if (!createForm.gameName.trim()) {
      setError('Game name is required')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      const iconSet = getIconById(selectedIconSet)
      const networkGame = await NetworkService.createNetworkGame({
        ...createForm,
        player1Icon: iconSet.player1,
        player2Icon: iconSet.player2
      })
      onGameCreated(networkGame.id)
      setShowCreateForm(false)
      setCreateForm({ gameName: '', boardSize: 8 })
      // Refresh my games list
      loadMyGames()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create game')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinGame = async (gameId: string) => {
    try {
      setIsJoining(gameId)
      setError(null)
      await NetworkService.joinNetworkGame({ networkGameId: gameId })
      onGameJoined(gameId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join game')
    } finally {
      setIsJoining(null)
    }
  }

  const getStatusBadge = (status: NetworkGameStatus) => {
    switch (status) {
      case NetworkGameStatus.Waiting:
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full">Waiting</span>
      case NetworkGameStatus.InProgress:
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">In Progress</span>
      case NetworkGameStatus.Completed:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 rounded-full">Completed</span>
      default:
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">Unavailable</span>
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const loadMyGames = async () => {
    try {
      setLoadingMyGames(true)
      setError(null)
      const games = await NetworkService.getMyNetworkGames()
      setMyGames(games)
    } catch (err) {
      setError('Failed to load your games')
      console.error('Load my games error:', err)
    } finally {
      setLoadingMyGames(false)
    }
  }

  const handleDeleteGame = async (gameId: string) => {
    try {
      setDeletingGameId(gameId)
      setError(null)
      await NetworkService.deleteNetworkGame(gameId)
      setMyGames(prev => prev.filter(game => game.id !== gameId))
    } catch (err) {
      setError('Failed to delete game')
      console.error('Delete game error:', err)
    } finally {
      setDeletingGameId(null)
    }
  }

  const handleStartGame = async (gameId: string) => {
    try {
      setError(null)
      await NetworkService.startNetworkGame(gameId)
      // Navigate to the game room
      onGameCreated(gameId)
    } catch (err) {
      setError('Failed to start game')
      console.error('Start game error:', err)
    }
  }

  const getGameStatusLabel = (status: NetworkGameStatus, lastActivity: string) => {
    const now = new Date()
    const lastActivityDate = new Date(lastActivity)
    const diffMins = Math.floor((now.getTime() - lastActivityDate.getTime()) / 60000)
    
    // Handle active games (Waiting/InProgress)
    if (status === NetworkGameStatus.Waiting || status === NetworkGameStatus.InProgress) {
      if (diffMins > 30) {
        return { label: 'Stale', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
      }
      return { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
    }
    
    // Handle other statuses with appropriate colors
    const statusConfig = {
      [NetworkGameStatus.Waiting]: { label: 'Waiting', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      [NetworkGameStatus.InProgress]: { label: 'In Progress', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      [NetworkGameStatus.Completed]: { label: 'Completed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
      [NetworkGameStatus.Cancelled]: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      [NetworkGameStatus.Expired]: { label: 'Expired', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
    }
    
    return statusConfig[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' }
  }

  // Load my games when component mounts
  useEffect(() => {
    loadMyGames()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🌐 Network Games
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            🎮 Host Game
          </button>
          <button
            onClick={handleScanForGames}
            disabled={isScanning}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {isScanning ? '🔄 Scanning...' : '🔍 Scan for Games'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Create Game Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 bg-accent/50 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Host New Game</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Game Name</label>
              <input
                type="text"
                value={createForm.gameName}
                onChange={(e) => setCreateForm({ ...createForm, gameName: e.target.value })}
                placeholder={`${user?.username}'s Game`}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Board Size</label>
              <BoardSizeSelector 
                value={createForm.boardSize} 
                onChange={(size) => setCreateForm({ ...createForm, boardSize: size })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                showDescriptions={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Players</label>
              <select
                value={createForm.maxPlayers}
                onChange={(e) => setCreateForm({ ...createForm, maxPlayers: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-md"
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
              </select>
            </div>
          </div>
          
          {/* Icon Selection */}
          <div className="mt-4">
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm font-medium">Player Icons:</label>
              <button
                onClick={() => setShowIconSelector(!showIconSelector)}
                className="w-full max-w-xs flex items-center justify-center gap-2 rounded-md bg-navbg px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <span className="text-lg">{getIconById(selectedIconSet).player1}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-lg">{getIconById(selectedIconSet).player2}</span>
              </button>
            </div>
          </div>
          
          {/* Icon Selector Modal */}
          {showIconSelector && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-6xl max-h-[95vh] bg-background border border-border rounded-lg flex flex-col">
                {/* Fixed header */}
                <div className="p-6 border-b border-border flex-shrink-0">
                  <h3 className="text-xl font-semibold text-center">Choose Icon Pair</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Select icons for Player 1 and Player 2
                  </p>
                </div>
                
                {/* Content masonry layout */}
                <div className="flex-1 p-6">
                  <div className="columns-4 gap-6 space-y-0">
                    {ICON_CATEGORIES.map(category => (
                      <div key={category.id} className="break-inside-avoid mb-6 bg-accent/10 rounded-lg p-4">
                        <h4 className="text-lg font-medium text-center flex items-center justify-center gap-2 pb-3 mb-3 border-b border-border">
                          <span className="text-xl">{category.icon}</span>
                          {category.name}
                        </h4>
                        <div className="space-y-2">
                          {getIconsByCategory(category.id).map(iconSet => (
                            <button
                              key={iconSet.id}
                              onClick={() => {
                                setSelectedIconSet(iconSet.id)
                                setShowIconSelector(false)
                              }}
                              className={`w-full flex flex-col items-center gap-2 p-3 rounded-lg text-sm transition-colors ${
                                selectedIconSet === iconSet.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-accent border border-border bg-background'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{iconSet.player1}</span>
                                <span className="text-xs text-muted-foreground">vs</span>
                                <span className="text-2xl">{iconSet.player2}</span>
                              </div>
                              <span className="text-xs font-medium">{iconSet.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Fixed footer */}
                <div className="p-6 border-t border-border flex-shrink-0">
                  <button
                    onClick={() => setShowIconSelector(false)}
                    className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateGame}
              disabled={isCreating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* My Games */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            My Games ({myGames.length})
          </h3>
          <button
            onClick={loadMyGames}
            disabled={loadingMyGames}
            className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {loadingMyGames ? '🔄' : '🔄'} Refresh
          </button>
        </div>

        {myGames.length === 0 ? (
          <div className="text-center py-6 bg-accent/20 rounded-lg">
            <p className="text-muted-foreground">You haven't created any games yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myGames.map((game) => {
              const statusInfo = getGameStatusLabel(game.status, game.lastActivity)
              return (
                <div key={game.id} className="p-4 bg-card rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{game.gameName}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Board: {game.boardSize}×{game.boardSize} | Players: {game.currentPlayers}/{game.maxPlayers}</p>
                        <p>Created: {formatTimeAgo(game.createdAt)} | Last activity: {formatTimeAgo(game.lastActivity)}</p>
                        {game.players.length > 1 && (
                          <p>Players: {game.players.map(p => p.username).join(', ')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {(game.status === NetworkGameStatus.Waiting || game.status === NetworkGameStatus.InProgress) && (
                        <button
                          onClick={() => onGameJoined(game.id)}
                          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                          🎮 Rejoin Game
                        </button>
                      )}
                      {(game.status !== NetworkGameStatus.Completed) && (
                        <button
                          onClick={() => handleDeleteGame(game.id)}
                          disabled={deletingGameId === game.id}
                          className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
                        >
                          {deletingGameId === game.id ? '⏳' : '🗑️'} Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Available Games */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Available Games ({discoveredGames.length})
        </h3>

        {discoveredGames.length === 0 ? (
          <div className="text-center py-8 bg-accent/20 rounded-lg">
            <div className="text-6xl mb-4">🔍</div>
            <h4 className="text-xl font-semibold mb-2">No Games Found</h4>
            <p className="text-muted-foreground mb-4">
              No network games are currently available on your local network.
            </p>
            <button
              onClick={handleScanForGames}
              disabled={isScanning}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {isScanning ? 'Scanning...' : 'Scan Again'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {discoveredGames.map((game) => (
              <div
                key={game.gameId}
                className="flex items-center justify-between p-4 bg-accent/50 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{game.gameName}</h4>
                    {getStatusBadge(game.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>👑 {game.hostUsername}</span>
                    <span>📏 {game.boardSize}×{game.boardSize}</span>
                    <span>👥 {game.currentPlayers}/{game.maxPlayers}</span>
                    <span>🕒 {formatTimeAgo(game.lastActivity)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {game.status === NetworkGameStatus.Waiting && game.currentPlayers < game.maxPlayers ? (
                    <button
                      onClick={() => handleJoinGame(game.gameId)}
                      disabled={isJoining === game.gameId}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isJoining === game.gameId ? 'Joining...' : 'Join Game'}
                    </button>
                  ) : game.status === NetworkGameStatus.Waiting ? (
                    <span className="px-4 py-2 text-sm text-muted-foreground">Game Full</span>
                  ) : (
                    <span className="px-4 py-2 text-sm text-muted-foreground">
                      {game.status === NetworkGameStatus.InProgress ? 'Game Started' : 'Unavailable'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default NetworkLobby