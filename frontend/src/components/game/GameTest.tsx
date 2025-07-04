import { useState, useEffect } from 'react'
import GameBoard from './GameBoard'
import { GameMove } from '../../types/game'
import { GomokuAI, AIDifficulty } from '../../services/aiService'
import { PLAYER_ICONS, getIconById, getRandomStartMessage, getRandomStartPlayer, ICON_CATEGORIES, getIconsByCategory } from '../../services/iconService'
import { ScoringService, GameScore, WinType, GameStats } from '../../services/scoringService'
import { LeaderboardService } from '../../services/leaderboardService'
import { useAuthStore } from '../../store/authStore'
import ScoringSuggestions from './ScoringSuggestions'
import Leaderboard from './Leaderboard'

const GameTest = () => {
  const { user } = useAuthStore()
  const [boardSize, setBoardSize] = useState(8)
  const [board, setBoard] = useState<string>('')
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X')
  const [moves, setMoves] = useState<GameMove[]>([])
  const [gameEnded, setGameEnded] = useState(false)
  const [winner, setWinner] = useState<'X' | 'O' | 'Draw' | null>(null)
  const [gameMode, setGameMode] = useState<'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai'>('human-vs-human')
  const [aiDifficultyX, setAiDifficultyX] = useState<AIDifficulty>(AIDifficulty.MEDIUM)
  const [aiDifficultyO, setAiDifficultyO] = useState<AIDifficulty>(AIDifficulty.MEDIUM)
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [aiReasoning, setAiReasoning] = useState<string>('')
  const [aiX, setAiX] = useState<GomokuAI | null>(null)
  const [aiO, setAiO] = useState<GomokuAI | null>(null)
  const [selectedIconSet, setSelectedIconSet] = useState('classic')
  const [isRandomizing, setIsRandomizing] = useState(false)
  const [randomMessage, setRandomMessage] = useState('')
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [gameScore, setGameScore] = useState<GameScore | null>(null)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [winReason, setWinReason] = useState<string>('')
  const [slotSize, setSlotSize] = useState<'small' | 'medium' | 'large'>('small')
  const [winningCells, setWinningCells] = useState<number[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  
  // Future: Network multiplayer state
  // const [isNetworkGame, setIsNetworkGame] = useState(false)
  // const [opponentName, setOpponentName] = useState<string>('')
  // const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')

  // Initialize board when size changes
  useEffect(() => {
    const emptyBoard = Array(boardSize * boardSize).fill('').join(',')
    setBoard(emptyBoard)
    setMoves([])
    setGameEnded(false)
    setWinner(null)
    setCurrentPlayer('X')
    setIsAiThinking(false)
    setAiReasoning('')
    setGameStarted(false)
  }, [boardSize])

  // Initialize AIs when game settings change
  useEffect(() => {
    if (gameMode === 'human-vs-ai' || gameMode === 'ai-vs-ai') {
      setAiO(new GomokuAI(boardSize, aiDifficultyO))
    } else {
      setAiO(null)
    }
    
    if (gameMode === 'ai-vs-ai') {
      setAiX(new GomokuAI(boardSize, aiDifficultyX))
    } else {
      setAiX(null)
    }
  }, [gameMode, aiDifficultyX, aiDifficultyO, boardSize])

  // Handle AI moves
  useEffect(() => {
    const shouldMakeAiMove = (
      (gameMode === 'human-vs-ai' && currentPlayer === 'O') ||
      (gameMode === 'ai-vs-ai' && (currentPlayer === 'X' || currentPlayer === 'O'))
    ) && !gameEnded && !isAiThinking && gameStarted
    
    if (shouldMakeAiMove) {
      makeAiMove()
    }
  }, [currentPlayer, gameMode, gameEnded, board, isAiThinking, gameStarted])

  const handleMove = (row: number, col: number) => {
    if (gameEnded || isAiThinking) return
    
    // Prevent manual moves for AI players
    if (gameMode === 'human-vs-ai' && currentPlayer === 'O') return
    if (gameMode === 'ai-vs-ai') return // No manual moves in AI vs AI
    
    makeMove(row, col, currentPlayer)
  }

  const makeMove = (row: number, col: number, player: 'X' | 'O') => {
    const boardArray = board.split(',')
    const index = row * boardSize + col
    
    if (boardArray[index]) return // Cell already occupied
    
    // Start timing on first move if not already started
    if (moves.length === 0 && gameStartTime === 0) {
      setGameStartTime(Date.now())
      setGameStarted(true)
    }
    
    boardArray[index] = player
    const newBoard = boardArray.join(',')
    
    const newMove: GameMove = {
      id: Date.now().toString(),
      gameId: 'test',
      playerId: player === 'X' ? 'player1' : 'player2',
      row,
      column: col,
      symbol: player,
      createdAt: new Date().toISOString()
    }
    
    setBoard(newBoard)
    setMoves([...moves, newMove])
    
    // Check win condition
    const winResult = checkWin(newBoard, row, col, player)
    if (winResult.hasWon) {
      setGameEnded(true)
      setWinner(player)
      setWinReason(winResult.reason)
      setWinningCells(winResult.winningCells)
      
      // Calculate score when game ends
      if (gameStartTime > 0) {
        calculateFinalScore(player, [...moves, newMove])
      } else {
        // Fallback if gameStartTime wasn't set - use a default duration
        console.warn('Game start time not set, using fallback for scoring')
        const fallbackStartTime = Date.now() - (moves.length + 1) * 30000 // Estimate 30s per move
        setGameStartTime(fallbackStartTime)
        calculateFinalScore(player, [...moves, newMove])
      }
    } else {
      // Check if win is still possible for either player
      const gameState = checkGameState(newBoard)
      
      if (gameState.gameOver) {
        setGameEnded(true)
        setWinner(gameState.winner)
        setWinReason(gameState.reason)
        
        // Don't calculate score for draws - only for actual wins
        if (gameState.winner !== 'Draw') {
          if (gameStartTime > 0) {
            calculateFinalScore(gameState.winner, [...moves, newMove])
          } else {
            const fallbackStartTime = Date.now() - (moves.length + 1) * 30000
            setGameStartTime(fallbackStartTime)
            calculateFinalScore(gameState.winner, [...moves, newMove])
          }
        }
      } else {
        // Switch player
        setCurrentPlayer(player === 'X' ? 'O' : 'X')
      }
    }
  }

  const makeAiMove = async () => {
    if (gameEnded) return

    const currentAi = currentPlayer === 'X' ? aiX : aiO
    if (!currentAi) return

    setIsAiThinking(true)
    setAiReasoning('')

    // Get difficulty for timing delay
    const currentDifficulty = currentPlayer === 'X' ? aiDifficultyX : aiDifficultyO
    const delay = currentDifficulty === AIDifficulty.EASY ? 500 : 
                  currentDifficulty === AIDifficulty.MEDIUM ? 1000 : 1500

    // Add thinking delay for better UX
    setTimeout(() => {
      try {
        const aiMove = currentAi.getMove(board, currentPlayer)
        setAiReasoning(`AI ${currentPlayer}: ${aiMove.reasoning}`)
        makeMove(aiMove.row, aiMove.col, currentPlayer)
      } catch (error) {
        console.error('AI move error:', error)
      } finally {
        setIsAiThinking(false)
      }
    }, delay)
  }

  const calculateFinalScore = (winningPlayer: 'X' | 'O' | 'Draw', finalMoves: GameMove[]) => {
    // Don't calculate score for draws
    if (winningPlayer === 'Draw') {
      return
    }
    
    const gameEndTime = Date.now()
    
    // Determine win type (simplified)
    let winType = WinType.FIVE_IN_ROW // Default
    
    const stats: GameStats = {
      gameStartTime,
      gameEndTime,
      moves: finalMoves,
      boardSize,
      aiDifficulty: gameMode !== 'human-vs-human' ? (winningPlayer === 'X' ? aiDifficultyX : aiDifficultyO) : undefined,
      winType,
      opponentType: gameMode === 'human-vs-human' ? 'human' : 'ai'
    }
    
    const score = ScoringService.calculateScore(stats)
    setGameScore(score)
    
    // Add to leaderboard (only for human players)
    if (gameMode !== 'ai-vs-ai') {
      const getPlayerName = (player: 'X' | 'O') => {
        if (gameMode === 'human-vs-human') {
          // For network play preparation: Player X is always the logged-in user
          return player === 'X' ? (user?.username || 'Player X') : 'Player O'
        } else {
          // Human vs AI mode
          return player === 'X' ? (user?.username || 'Human Player') : 'AI Opponent'
        }
      }
      
      const playerName = getPlayerName(winningPlayer)
      const isHumanWin = gameMode === 'human-vs-human' || 
                        (gameMode === 'human-vs-ai' && winningPlayer === 'X')
      
      if (isHumanWin) {
        LeaderboardService.addGameResult(playerName, score, true, gameMode)
      }
    }
  }

  const checkGameState = (boardString: string): { gameOver: boolean; winner: 'X' | 'O' | 'Draw' | null; reason: string } => {
    const boardArray = boardString.split(',')
    
    // Check if board is full
    const isBoardFull = boardArray.every(cell => cell !== '')
    
    if (isBoardFull) {
      return { 
        gameOver: true, 
        winner: 'Draw',
        reason: 'Board is full with no winner. Game ends in a draw.'
      }
    }
    
    // Check if either player can still achieve a win
    const canXWin = canPlayerWin(boardArray, 'X')
    const canOWin = canPlayerWin(boardArray, 'O')
    
    // Only end in draw if neither player can win AND there are no more moves
    if (!canXWin && !canOWin) {
      return { 
        gameOver: true, 
        winner: 'Draw',
        reason: 'Neither player can achieve a winning position. Game ends in a draw.'
      }
    }
    
    return { gameOver: false, winner: null, reason: '' }
  }

  const canPlayerWin = (boardArray: string[], symbol: string): boolean => {
    const currentBoardSize = boardSize
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal top-left to bottom-right
      [1, -1]   // diagonal top-right to bottom-left
    ]
    
    // Check every position on the board
    for (let row = 0; row < currentBoardSize; row++) {
      for (let col = 0; col < currentBoardSize; col++) {
        // For each direction, check if a winning line is possible
        for (const [dRow, dCol] of directions) {
          if (canFormWinningLine(boardArray, row, col, dRow, dCol, symbol, currentBoardSize)) {
            return true
          }
        }
      }
    }
    
    return false
  }

  const canFormWinningLine = (
    boardArray: string[], 
    startRow: number, 
    startCol: number, 
    dRow: number, 
    dCol: number, 
    symbol: string, 
    currentBoardSize: number
  ): boolean => {
    // Check if we can form a 5-in-a-row from this position in this direction
    let ownCount = 0
    let emptyCount = 0
    let opponentCount = 0
    const opponentSymbol = symbol === 'X' ? 'O' : 'X'
    
    // Check 5 consecutive positions
    for (let i = 0; i < 5; i++) {
      const row = startRow + i * dRow
      const col = startCol + i * dCol
      
      // Check bounds
      if (row < 0 || row >= currentBoardSize || col < 0 || col >= currentBoardSize) {
        return false
      }
      
      const cellValue = boardArray[row * currentBoardSize + col]
      
      if (cellValue === symbol) {
        ownCount++
      } else if (cellValue === opponentSymbol) {
        opponentCount++
      } else {
        emptyCount++
      }
    }
    
    // Can win if no opponent pieces block this line
    if (opponentCount === 0) {
      return true
    }
    
    // Also check for 4-in-a-row with open ends (need to check 6 positions for open ends)
    if (canForm4WithOpenEnds(boardArray, startRow, startCol, dRow, dCol, symbol, currentBoardSize)) {
      return true
    }
    
    return false
  }

  const canForm4WithOpenEnds = (
    boardArray: string[], 
    startRow: number, 
    startCol: number, 
    dRow: number, 
    dCol: number, 
    symbol: string, 
    currentBoardSize: number
  ): boolean => {
    const opponentSymbol = symbol === 'X' ? 'O' : 'X'
    
    // Check if we can form 4 in a row with empty spaces on both ends
    // We need to check a 6-cell window for this pattern: EMPTY + 4 symbols + EMPTY
    for (let offset = -1; offset <= 1; offset++) {
      let ownCount = 0
      let opponentCount = 0
      let validPattern = true
      
      // Check the 6-cell window
      for (let i = 0; i < 6; i++) {
        const row = startRow + (i + offset) * dRow
        const col = startCol + (i + offset) * dCol
        
        // Check bounds
        if (row < 0 || row >= currentBoardSize || col < 0 || col >= currentBoardSize) {
          validPattern = false
          break
        }
        
        const cellValue = boardArray[row * currentBoardSize + col]
        
        if (i === 0 || i === 5) {
          // First and last positions should be empty or available
          if (cellValue === opponentSymbol) {
            validPattern = false
            break
          }
        } else {
          // Middle 4 positions
          if (cellValue === symbol) {
            ownCount++
          } else if (cellValue === opponentSymbol) {
            opponentCount++
          }
        }
      }
      
      // Valid if pattern is intact and no opponent pieces in the middle 4
      if (validPattern && opponentCount === 0) {
        return true
      }
    }
    
    return false
  }

  const checkWin = (boardString: string, row: number, col: number, symbol: string): { hasWon: boolean; reason: string; winningCells: number[] } => {
    const boardArray = boardString.split(',')
    const currentBoardSize = boardSize
    
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal top-left to bottom-right
      [1, -1]   // diagonal top-right to bottom-left
    ]
    
    for (const [dRow, dCol] of directions) {
      let count = 1
      let leftEnd = -1
      let rightEnd = -1
      let winningPositions = [row * currentBoardSize + col] // Start with the current move
      
      // Count in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dRow
        const newCol = col - i * dCol
        if (newRow >= 0 && newRow < currentBoardSize && newCol >= 0 && newCol < currentBoardSize) {
          if (boardArray[newRow * currentBoardSize + newCol] === symbol) {
            count++
            winningPositions.push(newRow * currentBoardSize + newCol)
          } else {
            leftEnd = newRow * currentBoardSize + newCol
            break
          }
        } else {
          break
        }
      }
      
      // Count in positive direction
      for (let i = 1; i < 5; i++) {
        const newRow = row + i * dRow
        const newCol = col + i * dCol
        if (newRow >= 0 && newRow < currentBoardSize && newCol >= 0 && newCol < currentBoardSize) {
          if (boardArray[newRow * currentBoardSize + newCol] === symbol) {
            count++
            winningPositions.push(newRow * currentBoardSize + newCol)
          } else {
            rightEnd = newRow * currentBoardSize + newCol
            break
          }
        } else {
          break
        }
      }
      
      // Check for 5 in a row
      if (count >= 5) {
        const directionName = dRow === 0 ? 'horizontal' : 
                            dCol === 0 ? 'vertical' : 
                            (dRow === dCol ? 'diagonal (↘)' : 'diagonal (↙)')
        return { 
          hasWon: true, 
          reason: `Achieved ${count} in a row ${directionName}!`,
          winningCells: winningPositions
        }
      }
      
      // Check for 4 in a row with open ends (empty spaces on both sides)
      if (count === 4) {
        const leftEmpty = leftEnd !== -1 && boardArray[leftEnd] === ''
        const rightEmpty = rightEnd !== -1 && boardArray[rightEnd] === ''
        if (leftEmpty && rightEmpty) {
          const directionName = dRow === 0 ? 'horizontal' : 
                              dCol === 0 ? 'vertical' : 
                              (dRow === dCol ? 'diagonal (↘)' : 'diagonal (↙)')
          return { 
            hasWon: true, 
            reason: `Achieved 4 in a row with open ends ${directionName}!`,
            winningCells: winningPositions
          }
        }
      }
    }
    
    return { hasWon: false, reason: '', winningCells: [] }
  }

  const randomizeStartPlayer = async () => {
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
    setCurrentPlayer(startPlayer)
    
    // Start timing the game
    setGameStartTime(Date.now())
    setGameStarted(true)
    
    // Show result
    setRandomMessage(`${message} Player ${startPlayer} goes first! 🎉`)
    
    setTimeout(() => {
      setIsRandomizing(false)
      setRandomMessage('')
    }, 2000)
  }

  const resetGame = () => {
    const emptyBoard = Array(boardSize * boardSize).fill('').join(',')
    setBoard(emptyBoard)
    setCurrentPlayer('X')
    setMoves([])
    setGameEnded(false)
    setWinner(null)
    setIsAiThinking(false)
    setAiReasoning('')
    setIsRandomizing(false)
    setRandomMessage('')
    setGameStartTime(0)
    setGameScore(null)
    setShowScoreBreakdown(false)
    setWinReason('')
    setWinningCells([])
    setGameStarted(false)
  }

  const startNewGame = async () => {
    resetGame()
    if (moves.length === 0) {
      await randomizeStartPlayer()
    } else {
      // If not randomizing, still set start time
      setGameStartTime(Date.now())
    }
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Gomoku Game Test</h1>
        <p className="text-lg font-medium text-primary mb-2">{boardSize}x{boardSize} Board</p>
        <p className="text-sm text-muted-foreground mb-4">
          Win by getting 5 in a row OR 4 in a row with empty spaces on both ends. Game ends in draw if board fills without a winner.
        </p>
        
        {/* Game Settings */}
        {!gameEnded && moves.length === 0 && !isRandomizing && (
          <div className="flex flex-col items-center gap-6 mb-6 w-full max-w-2xl">
            <div className={`grid gap-4 w-full ${
              gameMode === 'ai-vs-ai' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium">Board Size:</label>
                <select
                  value={boardSize}
                  onChange={(e) => setBoardSize(Number(e.target.value))}
                  className="w-full rounded-md px-3 py-2 text-sm"
                >
                  {[
                    { size: 6, desc: '6x6 (Mini)' },
                    { size: 7, desc: '7x7 (Small)' },
                    { size: 8, desc: '8x8 (Standard)' },
                    { size: 10, desc: '10x10 (Medium)' },
                    { size: 12, desc: '12x12 (Large)' },
                    { size: 14, desc: '14x14 (Extra Large)' },
                    { size: 16, desc: '16x16 (Huge)' },
                    { size: 20, desc: '20x20 (Giant)' },
                    { size: 24, desc: '24x24 (Maximum)' }
                  ].map(({ size, desc }) => (
                    <option key={size} value={size}>
                      {desc}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium">Game Mode:</label>
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value as 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai')}
                  className="w-full rounded-md px-3 py-2 text-sm"
                >
                  <option value="human-vs-human">Human vs Human</option>
                  <option value="human-vs-ai">Human vs AI</option>
                  <option value="ai-vs-ai">AI vs AI</option>
                </select>
              </div>
              
              {gameMode === 'human-vs-ai' && (
                <div className="flex flex-col items-center gap-2">
                  <label className="text-sm font-medium">AI Difficulty:</label>
                  <select
                    value={aiDifficultyO}
                    onChange={(e) => setAiDifficultyO(e.target.value as AIDifficulty)}
                    className="w-full rounded-md px-3 py-2 text-sm"
                  >
                    <option value={AIDifficulty.EASY}>Easy</option>
                    <option value={AIDifficulty.MEDIUM}>Medium</option>
                    <option value={AIDifficulty.HARD}>Hard</option>
                  </select>
                </div>
              )}
              
              {gameMode === 'ai-vs-ai' && (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-sm font-medium">AI X Difficulty:</label>
                    <select
                      value={aiDifficultyX}
                      onChange={(e) => setAiDifficultyX(e.target.value as AIDifficulty)}
                      className="w-full rounded-md px-3 py-2 text-sm"
                    >
                      <option value={AIDifficulty.EASY}>Easy</option>
                      <option value={AIDifficulty.MEDIUM}>Medium</option>
                      <option value={AIDifficulty.HARD}>Hard</option>
                    </select>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <label className="text-sm font-medium">AI O Difficulty:</label>
                    <select
                      value={aiDifficultyO}
                      onChange={(e) => setAiDifficultyO(e.target.value as AIDifficulty)}
                      className="w-full rounded-md px-3 py-2 text-sm"
                    >
                      <option value={AIDifficulty.EASY}>Easy</option>
                      <option value={AIDifficulty.MEDIUM}>Medium</option>
                      <option value={AIDifficulty.HARD}>Hard</option>
                    </select>
                  </div>
                </>
              )}
              
            </div>

            {/* Icon Selection */}
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Player Icons:</label>
                <button
                  onClick={() => setShowIconSelector(!showIconSelector)}
                  className="flex items-center gap-2 rounded-md bg-navbg px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <span className="text-lg">{getIconById(selectedIconSet).player1}</span>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <span className="text-lg">{getIconById(selectedIconSet).player2}</span>
                  <span className="ml-2">{getIconById(selectedIconSet).name}</span>
                </button>
              </div>

              {showIconSelector && (
                <div className="w-full max-w-md bg-background border border-border rounded-lg p-4">
                  <div className="space-y-4">
                    {ICON_CATEGORIES.map(category => (
                      <div key={category.id}>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          {category.name}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {getIconsByCategory(category.id).map(iconSet => (
                            <button
                              key={iconSet.id}
                              onClick={() => {
                                setSelectedIconSet(iconSet.id)
                                setShowIconSelector(false)
                              }}
                              className={`flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${
                                selectedIconSet === iconSet.id 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-accent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{iconSet.player1}</span>
                                <span className="text-xs text-muted-foreground">vs</span>
                                <span className="text-lg">{iconSet.player2}</span>
                              </div>
                              <span>{iconSet.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Start Game Button */}
            <div className="flex gap-4">
              <button
                onClick={startNewGame}
                className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                🎲 Start Random Game
              </button>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-6 text-base font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                🏆 Leaderboard
              </button>
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

        {/* Game Status */}
        {!gameEnded && !isRandomizing ? (
          <div>
            <div className="flex items-center justify-center gap-2 text-lg">
              <span>Current Turn:</span>
              <span className="text-2xl">
                {currentPlayer === 'X' ? getIconById(selectedIconSet).player1 : getIconById(selectedIconSet).player2}
              </span>
              <span>
                {gameMode === 'human-vs-human' 
                  ? currentPlayer === 'X' 
                    ? (user?.username || 'Player X')
                    : 'Player O'
                  : gameMode === 'human-vs-ai'
                    ? currentPlayer === 'X' 
                      ? (user?.username || 'Human')
                      : 'AI'
                    : `AI ${currentPlayer}`
                }
              </span>
              {gameMode === 'human-vs-ai' && currentPlayer === 'O' && <span className="text-sm text-muted-foreground">(Computer)</span>}
              {gameMode === 'ai-vs-ai' && <span className="text-sm text-muted-foreground">(Computer)</span>}
            </div>
            {isAiThinking && (
              <div className="mt-2 flex justify-center">
                <div className="inline-flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            )}
            {aiReasoning && (
              <p className="text-sm text-blue-600 mt-2 text-center">AI: {aiReasoning}</p>
            )}
          </div>
        ) : !isRandomizing ? (
          <div className="flex flex-col items-center gap-4">
            {winner === 'Draw' ? (
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-2 mb-2">
                  🤝 It's a Draw!
                </p>
                {winReason && (
                  <p className="text-sm text-muted-foreground">
                    {winReason}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-2 mb-2">
                  🎉 
                  <span className="text-2xl">
                    {winner === 'X' ? getIconById(selectedIconSet).player1 : getIconById(selectedIconSet).player2}
                  </span>
                  {gameMode === 'human-vs-human' 
                    ? winner === 'X' 
                      ? (user?.username || 'Player X')
                      : 'Player O'
                    : gameMode === 'human-vs-ai'
                      ? winner === 'X' 
                        ? (user?.username || 'Human')
                        : 'AI'
                      : `AI ${winner}`
                  } Wins!
                </p>
                {winReason && (
                  <p className="text-sm text-muted-foreground">
                    {winReason}
                  </p>
                )}
              </div>
            )}

            {/* Score Display */}
            {gameScore && (
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

            <div className="flex justify-center gap-4">
              <button
                onClick={startNewGame}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
              >
                🎲 New Random Game
              </button>
              <button
                onClick={resetGame}
                className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-8 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80"
              >
                Same Settings
              </button>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-accent-foreground ring-offset-background transition-colors hover:bg-accent/80"
              >
                🏆 Leaderboard
              </button>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Always visible cell size adjuster */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <label className="text-sm font-medium text-muted-foreground">Cell Size:</label>
        <select
          value={slotSize}
          onChange={(e) => setSlotSize(e.target.value as 'small' | 'medium' | 'large')}
          className="rounded-md px-3 py-1 text-sm w-24"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
      
      <GameBoard
        board={board}
        onMove={handleMove}
        disabled={gameEnded || isAiThinking}
        currentPlayer={currentPlayer}
        boardSize={boardSize}
        moves={moves}
        winnerId={winner}
        slotSize={slotSize}
        winningCells={winningCells}
        playerIcons={{
          player1: getIconById(selectedIconSet).player1,
          player2: getIconById(selectedIconSet).player2
        }}
      />
      
      {!gameEnded && (
        <button
          onClick={resetGame}
          className="inline-flex h-11 items-center justify-center rounded-md bg-secondary px-8 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80"
        >
          Reset Game
        </button>
      )}
      
      <ScoringSuggestions />
      
      <Leaderboard 
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </div>
  )
}

export default GameTest