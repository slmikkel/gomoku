import { useEffect, useState } from 'react'
import { gameApi } from '../../lib/api'
import { GameHistoryItem, GameStatus, PurgeResult, ClearResult } from '../../types/game'
import { useToast } from '../../hooks/use-toast'

interface GameHistoryProps {
  isOpen: boolean
  onClose: () => void
}

const GameHistory = ({ isOpen, onClose }: GameHistoryProps) => {
  const [games, setGames] = useState<GameHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPurging, setIsPurging] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [purgePreview, setPurgePreview] = useState<{ incompleteGamesCount: number } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchGameHistory()
    }
  }, [isOpen])

  const fetchGameHistory = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch both games and purge preview in parallel
      const [gamesResponse, previewResponse] = await Promise.all([
        gameApi.getGames(),
        gameApi.getPurgePreview().catch(() => null) // Don't fail if preview fails
      ])
      
      setGames(gamesResponse.data)
      
      if (previewResponse) {
        setPurgePreview(previewResponse.data)
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch game history')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurgeIncomplete = async () => {
    // Use same logic as backend: 0 moves AND not InProgress/WaitingForPlayer
    const incompleteGames = games.filter(g => 
      g.moves.length === 0 && 
      g.status !== GameStatus.InProgress && 
      g.status !== GameStatus.WaitingForPlayer
    )
    
    if (incompleteGames.length === 0) {
      toast({
        title: 'No Incomplete Games',
        description: 'There are no completed games with 0 moves to purge.',
        variant: 'default',
      })
      return
    }

    if (!window.confirm(`Remove ${incompleteGames.length} incomplete games?\n\nThese are completed games with 0 moves that were likely cancelled or abandoned.`)) {
      return
    }

    try {
      setIsPurging(true)
      const response = await gameApi.purgeIncompleteGames()
      const result: PurgeResult = response.data
      
      toast({
        title: 'Games Purged',
        description: result.message,
        variant: 'default',
      })
      
      // Remove purged games from UI
      setGames(prevGames => prevGames.filter(g => !result.deletedGameIds.includes(g.id)))
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to purge incomplete games',
        variant: 'destructive',
      })
    } finally {
      setIsPurging(false)
    }
  }

  const handleClearAll = async () => {
    if (games.length === 0) {
      toast({
        title: 'No Games',
        description: 'There are no games in your history to clear.',
        variant: 'default',
      })
      return
    }

    const confirmText = `DELETE ALL ${games.length} GAMES`
    const userInput = window.prompt(
      `⚠️ PERMANENTLY DELETE ALL GAME HISTORY?\n\nThis will delete all ${games.length} games and cannot be undone.\n\nType "${confirmText}" to confirm:`
    )

    if (userInput !== confirmText) {
      return
    }

    try {
      setIsClearing(true)
      const response = await gameApi.clearAllGames()
      const result: ClearResult = response.data
      
      toast({
        title: 'History Cleared',
        description: result.message,
        variant: 'default',
      })
      
      // Clear all games from UI
      setGames([])
      onClose() // Close modal after clearing all
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to clear game history',
        variant: 'destructive',
      })
    } finally {
      setIsClearing(false)
    }
  }

  const getGameStatusDisplay = (game: GameHistoryItem) => {
    switch (game.status) {
      case GameStatus.Completed:
        if (game.winnerId) {
          // Find the winner's username
          let winnerName = 'Unknown'
          if (game.winnerId === game.player1Id) {
            winnerName = game.player1Info.username
          } else if (game.winnerId === game.player2Id && game.player2Info) {
            winnerName = game.player2Info.username
          } else if (game.winnerId === game.player3Id && game.player3Info) {
            winnerName = game.player3Info.username
          }
          return `${winnerName} Won`
        }
        return 'Draw'
      case GameStatus.Draw:
        return 'Draw'
      case GameStatus.InProgress:
        return 'In Progress'
      case GameStatus.WaitingForPlayer:
        return 'Waiting for Player'
      default:
        return 'Unknown'
    }
  }

  // Helper function to normalize game type from backend (handles both string and numeric enum values)
  const normalizeGameType = (gameType: 'Local' | 'AI' | 'Network' | number): 'Local' | 'AI' | 'Network' => {
    if (typeof gameType === 'number') {
      switch (gameType) {
        case 0: return 'Local'
        case 1: return 'AI'
        case 2: return 'Network'
        default: return 'Network'
      }
    }
    return gameType
  }

  // Helper to get count of actually purgeable games (matches backend logic)
  const getPurgeableGamesCount = () => {
    // Use server-side count if available, otherwise calculate locally
    if (purgePreview) {
      return purgePreview.incompleteGamesCount
    }
    
    return games.filter(g => 
      g.moves.length === 0 && 
      g.status !== GameStatus.InProgress && 
      g.status !== GameStatus.WaitingForPlayer
    ).length
  }

  const getGameTypeIcon = (gameType: 'Local' | 'AI' | 'Network' | number) => {
    const normalizedType = normalizeGameType(gameType)
    switch (normalizedType) {
      case 'Local':
        return '🏠'
      case 'AI':
        return '🤖'
      case 'Network':
        return '🌐'
      default:
        return '🎮'
    }
  }

  const getOpponentDisplay = (game: GameHistoryItem) => {
    const gameType = normalizeGameType(game.gameType)
    
    switch (gameType) {
      case 'Local':
        return `Human vs Human (Same Device)`
      case 'AI':
        const difficulty = game.aiDifficulty ? ` (${game.aiDifficulty})` : ''
        return `Human vs AI${difficulty}`
      case 'Network':
        if (game.playerCount === 3) {
          return '3-Player Online Game'
        }
        if (game.player2Info) {
          return `You vs ${game.player2Info.username} (Online)`
        }
        return 'You vs Unknown Player (Online)'
      default:
        return 'Unknown Game Type'
    }
  }

  const getGameTypeDisplayName = (game: GameHistoryItem) => {
    const gameType = normalizeGameType(game.gameType)
    
    switch (gameType) {
      case 'Local':
        return 'Local'
      case 'AI':
        return game.aiDifficulty ? `AI - ${game.aiDifficulty}` : 'AI'
      case 'Network':
        return game.playerCount === 3 ? 'Network (3P)' : 'Network'
      default:
        return 'Unknown'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Game History</h2>
              <p className="text-sm text-muted-foreground">
                {games.length} games total
                {getPurgeableGamesCount() > 0 && 
                  ` • ${getPurgeableGamesCount()} purgeable`
                }
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {getPurgeableGamesCount() > 0 && (
                <button
                  onClick={handlePurgeIncomplete}
                  disabled={isPurging}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                  title="Remove completed games with 0 moves (abandoned games)"
                >
                  🗑️ {isPurging ? 'Purging...' : `Purge (${getPurgeableGamesCount()})`}
                </button>
              )}
              
              {games.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                  title="Clear all game history permanently"
                >
                  🧹 {isClearing ? 'Clearing...' : 'Clear All'}
                </button>
              )}
              
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">{error}</p>
              <button
                onClick={fetchGameHistory}
                className="mt-4 text-primary hover:underline"
              >
                Try Again
              </button>
            </div>
          )}
          
          {!isLoading && !error && games.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No games played yet</p>
            </div>
          )}
          
          {!isLoading && !error && games.length > 0 && (
            <div className="space-y-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getGameTypeIcon(game.gameType)}</span>
                        <h3 className="font-semibold">
                          {game.boardSize}x{game.boardSize} Board
                        </h3>
                        <span className="text-xs bg-accent px-2 py-1 rounded-full">
                          {getGameTypeDisplayName(game)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getOpponentDisplay(game)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {game.moves.length} moves • {getGameStatusDisplay(game)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(game.createdAt)}
                      </p>
                      {game.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          Completed: {formatDate(game.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {game.status === GameStatus.Completed && game.winnerId && (
                    <div className="mt-2 p-2 bg-primary/10 rounded-md">
                      <p className="text-sm font-medium text-primary">
                        🎉 Winner: {(() => {
                          if (game.winnerId === game.player1Id) {
                            return game.player1Info.username
                          } else if (game.winnerId === game.player2Id && game.player2Info) {
                            return game.player2Info.username
                          } else if (game.winnerId === game.player3Id && game.player3Info) {
                            return game.player3Info.username
                          }
                          return 'Unknown'
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameHistory