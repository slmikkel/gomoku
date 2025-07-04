import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore, AIDifficulty } from '../../store/gameStore'
import { useAuthStore } from '../../store/authStore'
import { GameStatus } from '../../types/game'
import GameBoard from './GameBoard'
import GameControls from './GameControls'
import GameStatusComponent from './GameStatus'
import GameHistory from './GameHistory'
import ScoringSuggestions from './ScoringSuggestions'
import Leaderboard from './Leaderboard'
import { useToast } from '../../hooks/use-toast'
import { PLAYER_ICONS, getIconById, getRandomStartMessage, getRandomStartPlayer, ICON_CATEGORIES, getIconsByCategory } from '../../services/iconService'
import { ScoringService, GameScore, WinType, GameStats } from '../../services/scoringService'
import { LeaderboardService } from '../../services/leaderboardService'
import BoardSizeSelector from '../ui/BoardSizeSelector'
import CellSizeSelector from '../ui/CellSizeSelector'

const Game = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { token, logout, user } = useAuthStore()
  const {
    game,
    isLoading,
    error,
    isAiThinking,
    aiDifficulty,
    createGame,
    makeMove,
    makeAiMove,
    joinGame,
    leaveGame,
    setAiDifficulty,
  } = useGameStore()

  const [isConnecting, setIsConnecting] = useState(false)
  const [boardSize, setBoardSize] = useState(8)
  const [cellSize, setCellSize] = useState<'small' | 'medium' | 'large'>('large')
  const [isAiGame, setIsAiGame] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedIconSet, setSelectedIconSet] = useState('classic')
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [winningCells, setWinningCells] = useState<number[]>([])
  
  // New state for randomization and scoring
  const [isRandomizing, setIsRandomizing] = useState(false)
  const [randomMessage, setRandomMessage] = useState('')
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [gameScore, setGameScore] = useState<GameScore | null>(null)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const connectToGame = async () => {
      if (!game?.id) return

      setIsConnecting(true)
      try {
        if (game.player2Id === '11111111-1111-1111-1111-111111111111') {
          setGameStarted(true)
        } else if (game.player2Id === '22222222-2222-2222-2222-222222222222') {
          setGameStarted(true)
        } else {
          await joinGame(game.id)
          setGameStarted(true)
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } finally {
        setIsConnecting(false)
      }
    }

    connectToGame()

    return () => {
      if (game?.id) {
        leaveGame(game.id)
      }
    }
  }, [game?.id, token, navigate, joinGame, leaveGame, toast])

  // Handle AI moves
  useEffect(() => {
    if (!game || !isAiGame || game.status !== GameStatus.InProgress || isAiThinking) {
      return
    }

    // Check if it's AI's turn (AI is Player2 in AI games)
    const isAiTurn = game.currentPlayerId === game.player2Id
    
    if (isAiTurn && game.player2Id === '11111111-1111-1111-1111-111111111111') {
      // Trigger AI move after a short delay
      const timeoutId = setTimeout(() => {
        makeAiMove(game.id)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }, [game?.currentPlayerId, game?.status, isAiGame, isAiThinking, makeAiMove])

  // Function to check for winning cells
  const checkForWin = (board: string[], size: number): number[] => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // diagonal /
    ]

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const index = row * size + col
        const symbol = board[index]
        if (!symbol) continue

        for (const [dRow, dCol] of directions) {
          const cells = []
          let r = row, c = col

          // Check for 5 in a row
          for (let i = 0; i < 5; i++) {
            if (r < 0 || r >= size || c < 0 || c >= size) break
            const cellIndex = r * size + c
            if (board[cellIndex] !== symbol) break
            cells.push(cellIndex)
            r += dRow
            c += dCol
          }

          if (cells.length === 5) {
            return cells
          }

          // Check for 4 in a row with open ends
          if (cells.length === 4) {
            const beforeR = row - dRow
            const beforeC = col - dCol
            const afterR = row + 4 * dRow
            const afterC = col + 4 * dCol

            const beforeOpen = beforeR >= 0 && beforeR < size && beforeC >= 0 && beforeC < size && 
                              !board[beforeR * size + beforeC]
            const afterOpen = afterR >= 0 && afterR < size && afterC >= 0 && afterC < size && 
                             !board[afterR * size + afterC]

            if (beforeOpen && afterOpen) {
              return cells
            }
          }
        }
      }
    }

    return []
  }

  // Memoize values before useEffect that depends on them
  // Memoize the board string to prevent unnecessary re-renders
  const memoizedBoard = useMemo(() => {
    return game?.board || ''
  }, [game?.board])

  // Memoize the moves array to prevent unnecessary re-renders
  const memoizedMoves = useMemo(() => {
    return game?.moves || []
  }, [game?.moves])

  // Memoize the board size to prevent unnecessary re-renders
  const memoizedBoardSize = useMemo(() => {
    return game?.boardSize || boardSize
  }, [game?.boardSize, boardSize])

  // Memoize the winner ID to prevent unnecessary re-renders
  const memoizedWinnerId = useMemo(() => {
    return game?.winnerId || null
  }, [game?.winnerId])

  // Check for winning cells when game ends
  useEffect(() => {
    if (game && game.status === GameStatus.Completed && memoizedWinnerId) {
      const boardArray = memoizedBoard ? memoizedBoard.split(',') : []
      const winCells = checkForWin(boardArray, memoizedBoardSize)
      setWinningCells(winCells)
    } else {
      setWinningCells([])
    }
  }, [game?.status, memoizedWinnerId, memoizedBoard, memoizedBoardSize])

  // Calculate score when game ends
  useEffect(() => {
    if (game && game.status === GameStatus.Completed && gameStartTime > 0) {
      // Determine winning player symbol
      const winningSymbol = game.winnerId === game.player1Id ? 'X' : 
                           game.winnerId === game.player2Id ? 'O' : 'Draw'
      calculateFinalScore(winningSymbol)
    }
  }, [game?.status, game?.winnerId, gameStartTime])

  // Memoize the onMove function to prevent GameBoard re-renders
  const handleMove = useCallback((row: number, col: number) => {
    console.log('🎮 Game: handleMove called', { row, col, gameId: game?.id, isLoading })
    
    if (game?.id && !isLoading) {
      console.log('✅ Game: Calling makeMove API', { gameId: game.id, row, col })
      makeMove(game.id, row, col)
    } else {
      console.log('🚫 Game: makeMove blocked', { hasGameId: !!game?.id, isLoading })
    }
  }, [game?.id, makeMove, isLoading])

  // Simplified disabled state - only disable during AI thinking to prevent rapid state changes
  const isBoardDisabled = useMemo(() => {
    // Handle both string and enum values for game status
    const isInProgress = game?.status === GameStatus.InProgress || game?.status === 'InProgress'
    const disabled = !game || !isInProgress || isAiThinking
    console.log('🎮 Game: Board disabled state', { 
      disabled, 
      hasGame: !!game, 
      gameStatus: game?.status, 
      isAiThinking,
      isInProgress,
      winnerId: game?.winnerId,
      isGameCompleted: game?.status === 'Completed' || game?.status === 2
    })
    return disabled
  }, [game?.status, isAiThinking, !!game])

  // Memoize the player icons object
  const memoizedPlayerIcons = useMemo(() => {
    const iconSet = getIconById(selectedIconSet)
    return {
      player1: iconSet.player1,
      player2: iconSet.player2
    }
  }, [selectedIconSet])

  // Memoize the current player calculation
  const currentPlayerSymbol = useMemo(() => {
    return game?.currentPlayerId === game?.player1Id ? 'X' : 'O'
  }, [game?.currentPlayerId, game?.player1Id])

  // Function to randomize start player
  const randomizeStartPlayer = async (): Promise<string> => {
    setIsRandomizing(true)
    const message = getRandomStartMessage()
    setRandomMessage(message)
    
    // Add suspense with multiple message changes
    const messages = [
      "🎲 Preparing the dice...",
      "🔮 Gazing into the crystal ball...",
      "⚡ Channeling cosmic energy...",
      message
    ]
    
    for (let i = 0; i < messages.length; i++) {
      setRandomMessage(messages[i])
      await new Promise(resolve => setTimeout(resolve, 600))
    }
    
    const startPlayer = getRandomStartPlayer()
    
    // Start timing the game
    setGameStartTime(Date.now())
    
    // Show result
    setRandomMessage(`${message} Player ${startPlayer} goes first! 🎉`)
    
    return new Promise(resolve => {
      setTimeout(() => {
        setIsRandomizing(false)
        setRandomMessage('')
        resolve(startPlayer)
      }, 2000)
    })
  }

  // Function to calculate final score when game ends
  const calculateFinalScore = (winningPlayer: 'X' | 'O' | 'Draw') => {
    // Don't calculate score for draws
    if (winningPlayer === 'Draw' || !game) {
      return
    }
    
    const gameEndTime = Date.now()
    
    // Determine win type (simplified)
    let winType = WinType.FIVE_IN_ROW // Default
    
    const stats: GameStats = {
      gameStartTime,
      gameEndTime,
      moves: game.moves || [],
      boardSize: game.boardSize,
      aiDifficulty: isAiGame ? aiDifficulty : undefined,
      winType,
      opponentType: isAiGame ? 'ai' : 'human'
    }
    
    const score = ScoringService.calculateScore(stats)
    setGameScore(score)
    
    // Add to leaderboard (only for human players)
    const getPlayerName = (player: 'X' | 'O') => {
      if (!isAiGame) {
        // For human vs human games
        return player === 'X' ? (user?.username || 'Player X') : 'Player O'
      } else {
        // Human vs AI mode
        return player === 'X' ? (user?.username || 'Human Player') : 'AI Opponent'
      }
    }
    
    const playerName = getPlayerName(winningPlayer)
    const isHumanWin = !isAiGame || 
                      (isAiGame && winningPlayer === 'X')
    
    if (isHumanWin) {
      LeaderboardService.addGameResult(playerName, score, true, isAiGame ? 'human-vs-ai' : 'human-vs-human')
    }
  }

  const handleStartGame = async (withRandomization = false) => {
    try {
      setGameStarted(false)
      setGameScore(null)
      setShowScoreBreakdown(false)
      setWinningCells([])
      
      let startingPlayer: string | undefined = undefined
      
      if (withRandomization) {
        startingPlayer = await randomizeStartPlayer()
      } else {
        setGameStartTime(Date.now())
      }
      
      await createGame(isAiGame, boardSize, aiDifficulty, !isAiGame, startingPlayer)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleLeaveGame = async () => {
    try {
      await leaveGame(game?.id!)
      setGameStarted(false)
      navigate('/login')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (isLoading || isConnecting) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading game...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-8 p-4">
      <GameStatusComponent game={game} isAiThinking={isAiThinking} boardSize={boardSize} />
      
      {!game && (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold mb-2">Game Setup</h2>
          <div className="flex justify-around gap-4 w-full max-w-2xl">{/*grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3*/}
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm font-medium">Board Size:</label>
              <BoardSizeSelector 
                value={boardSize} 
                onChange={setBoardSize}
                showDescriptions={true}
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm font-medium">Game Type:</label>
              <select
                value={isAiGame.toString()}
                onChange={(e) => setIsAiGame(e.target.value === 'true')}
                className="w-full rounded-md px-3 py-2 text-sm"
              >
                <option value="false">vs Player</option>
                <option value="true">vs AI</option>
              </select>
            </div>
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm font-medium">Cell Size:</label>
              <CellSizeSelector 
                value={cellSize} 
                onChange={setCellSize}
              />
            </div>
            
            {isAiGame && (
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium">AI Difficulty:</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value as AIDifficulty)}
                  className="w-full rounded-md px-3 py-2 text-sm"
                >
                  <option value={AIDifficulty.EASY}>Easy</option>
                  <option value={AIDifficulty.MEDIUM}>Medium</option>
                  <option value={AIDifficulty.HARD}>Hard</option>
                </select>
              </div>
            )}

            {/* Icon Selection */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm font-medium">Player Icons:</label>
              <button
                onClick={() => setShowIconSelector(!showIconSelector)}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-navbg px-2 py-0.5 text-sm hover:bg-accent transition-colors"
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
              <div id="iconpair-selector-modal" className="w-full max-w-6xl max-h-[95vh] bg-background rounded-xl flex flex-col overflow-hidden">
                {/* Fixed header */}
                <div className="p-4 flex-shrink-0 relative">
                  <button
                    onClick={() => setShowIconSelector(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                  <h3 className="text-xl font-semibold text-center">Choose Icon Pair</h3>
                  <p className="text-sm text-muted-foreground text-center mt-1">
                    Select icons for Player 1 and Player 2
                  </p>
                </div>
                
                {/* Content masonry layout */}
                <div className="flex-1 p-2 bg-modalbg">
                  <div className="columns-4 gap-6 space-y-0">
                    {ICON_CATEGORIES.map(category => (
                      <div key={category.id} className="break-inside-avoid mb-2 bg-accent/10 rounded-lg p-4">
                        <h4 className="text-lg font-medium text-center flex items-center justify-center gap-2 pb-3 mb-1">
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
                              className={`w-full flex flex-col items-center gap-2 p-1 rounded-lg text-sm transition-colors ${
                                selectedIconSet === iconSet.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-accent border border-border bg-background'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{iconSet.player1}</span>
                                <span className="text-xs text-muted-foreground">vs</span>
                                <span className="text-xl">{iconSet.player2}</span>
                              </div>
                              <span className="text-xs font-medium">{iconSet.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Randomization Animation */}
          {isRandomizing && (
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="text-6xl animate-spin">🎲</div>
              <p className="text-lg font-medium text-primary animate-pulse">
                {randomMessage}
              </p>
            </div>
          )}
          
          {!isRandomizing && (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleStartGame(true)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                🎲 Start Random Game
              </button>
              <button
                onClick={() => handleStartGame(false)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-8 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Start Game
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                View History
              </button>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                🏆 Leaderboard
              </button>
            </div>
          )}
        </div>
      )}
      
      {game && gameStarted && (
        <>
          {/* Game Settings During Play */}
          <div className="mb-4 p-3 bg-accent/30 rounded-lg">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Cell Size:</label>
                <CellSizeSelector 
                  value={cellSize} 
                  onChange={setCellSize}
                  className="w-32 px-2 py-1 text-sm border border-border rounded-md bg-background"
                />
              </div>
            </div>
          </div>

          <GameBoard 
            board={memoizedBoard} 
            onMove={handleMove} 
            disabled={isBoardDisabled} 
            currentPlayer={currentPlayerSymbol} 
            boardSize={memoizedBoardSize}
            moves={memoizedMoves}
            winnerId={memoizedWinnerId}
            slotSize={cellSize}
            winningCells={winningCells}
            playerIcons={memoizedPlayerIcons}
          />

          {/* Score Display */}
          {game?.status === GameStatus.Completed && gameScore && (
            <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-primary mb-2">
                  {gameScore.totalScore.toLocaleString()} Points
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🏆</span>
                  <span className="text-lg font-semibold">{gameScore.rank}</span>
                </div>
              </div>

              {/* Quick Score Summary */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">⚡ {gameScore.breakdown.timeBonus}</div>
                  <div className="text-xs text-muted-foreground">Time Bonus</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">🎯 {gameScore.breakdown.moveEfficiency}</div>
                  <div className="text-xs text-muted-foreground">Move Efficiency</div>
                </div>
              </div>

              {/* Achievements */}
              {gameScore.achievements.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-center">🏅 Achievements Unlocked</h4>
                  <div className="flex flex-wrap justify-center gap-2">
                    {gameScore.achievements.map(achievement => (
                      <div
                        key={achievement.id}
                        className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs"
                        title={achievement.description}
                      >
                        <span>{achievement.icon}</span>
                        <span>{achievement.name}</span>
                        <span className="text-xs">+{achievement.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Breakdown Toggle */}
              <div className="text-center">
                <button
                  onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                  className="text-sm text-primary hover:underline"
                >
                  {showScoreBreakdown ? 'Hide' : 'Show'} Score Breakdown
                </button>
              </div>

              {/* Detailed Breakdown */}
              {showScoreBreakdown && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>⚡ Time Bonus:</span>
                    <span className="font-medium">{gameScore.breakdown.timeBonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🎯 Move Efficiency:</span>
                    <span className="font-medium">{gameScore.breakdown.moveEfficiency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🧠 Strategy Bonus:</span>
                    <span className="font-medium">{gameScore.breakdown.strategyBonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🎮 Win Type Bonus:</span>
                    <span className="font-medium">{gameScore.breakdown.winTypeBonus}</span>
                  </div>
                  {gameScore.breakdown.perfectGameBonus > 0 && (
                    <div className="flex justify-between text-gold-600">
                      <span>🏆 Perfect Game:</span>
                      <span className="font-medium">{gameScore.breakdown.perfectGameBonus}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span>🔥 Difficulty Multiplier:</span>
                      <span className="font-medium">×{gameScore.breakdown.difficultyMultiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📏 Board Size Multiplier:</span>
                      <span className="font-medium">×{gameScore.breakdown.boardSizeBonus}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleStartGame(true)}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              🎲 New Random Game
            </button>
            <button
              onClick={() => handleStartGame(false)}
              className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-8 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              New Game
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              History
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              🏆 Leaderboard
            </button>
            <button
              onClick={handleLeaveGame}
              className="inline-flex h-11 items-center justify-center rounded-md bg-destructive px-8 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Leave Game
            </button>
          </div>
        </>
      )}
      
      <GameHistory 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
      
      <ScoringSuggestions />
      
      <Leaderboard 
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </div>
  )
}

export default Game 