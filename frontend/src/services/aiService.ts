export enum AIDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface AIMove {
  row: number
  col: number
  score: number
  reasoning: string
}

export class GomokuAI {
  private boardSize: number
  private difficulty: AIDifficulty
  private maxDepth: number
  private transpositionTable: Map<string, { score: number; depth: number; flag: 'exact' | 'lower' | 'upper' }>

  constructor(boardSize: number, difficulty: AIDifficulty = AIDifficulty.MEDIUM) {
    this.boardSize = boardSize
    this.difficulty = difficulty
    this.transpositionTable = new Map()
    
    // Set search depth based on difficulty
    switch (difficulty) {
      case AIDifficulty.EASY:
        this.maxDepth = 4
        break
      case AIDifficulty.MEDIUM:
        this.maxDepth = 6
        break
      case AIDifficulty.HARD:
        this.maxDepth = 10
        break
      default:
        this.maxDepth = 6
    }
  }

  // Main method to get AI move
  public getMove(board: string, aiSymbol: 'X' | 'O'): AIMove {
    const boardArray = board.split(',')
    const playerSymbol = aiSymbol === 'X' ? 'O' : 'X'
    
    // Clear transposition table for fresh calculation
    this.transpositionTable.clear()
    
    // If board is empty, place in center
    if (this.isEmpty(boardArray)) {
      const center = Math.floor(this.boardSize / 2)
      return {
        row: center,
        col: center,
        score: 100,
        reasoning: 'Opening move in center'
      }
    }

    // Get all possible moves (limited to relevant positions)
    const possibleMoves = this.getPossibleMoves(boardArray)
    if (possibleMoves.length === 0) {
      throw new Error('No possible moves available')
    }

    // Quick check for immediate wins or critical blocks
    for (const move of possibleMoves) {
      const testBoard = [...boardArray]
      testBoard[move.row * this.boardSize + move.col] = aiSymbol
      if (this.checkWinCondition(testBoard, move.row, move.col, aiSymbol)) {
        return {
          ...move,
          score: 10000,
          reasoning: 'Winning move!'
        }
      }
      
      // Check if we need to block opponent win
      testBoard[move.row * this.boardSize + move.col] = playerSymbol
      if (this.checkWinCondition(testBoard, move.row, move.col, playerSymbol)) {
        return {
          ...move,
          score: 9000,
          reasoning: 'Blocking opponent win'
        }
      }

      // CRITICAL: Check for 4-in-row threats (immediate win next turn - highest priority!)
      const fourInRowThreat = this.detectFourInRowThreat(boardArray, move, playerSymbol)
      if (fourInRowThreat) {
        console.log(`🚨 AI found 4-in-row threat to block at (${move.row}, ${move.col})`)
        return {
          ...move,
          score: 8800,
          reasoning: 'Blocking critical 4-in-row threat'
        }
      }

      // CRITICAL: Check for open three threats (must block immediately)
      const openThreeThreat = this.detectOpenThreeThreat(boardArray, move, playerSymbol)
      if (openThreeThreat) {
        console.log(`🛡️ AI found open three threat to block at (${move.row}, ${move.col})`)
        return {
          ...move,
          score: 8500,
          reasoning: 'Blocking critical open three threat'
        }
      }
    }

    // Use minimax for deeper analysis
    let bestMove = possibleMoves[0]
    let bestScore = -Infinity
    let bestReasoning = 'Strategic move'

    for (const move of possibleMoves) {
      const testBoard = [...boardArray]
      testBoard[move.row * this.boardSize + move.col] = aiSymbol
      
      const score = this.minimax(testBoard, this.maxDepth - 1, false, aiSymbol, playerSymbol, -Infinity, Infinity)
      
      if (score > bestScore) {
        bestScore = score
        bestMove = move
        bestReasoning = this.getMoveReasoningFromScore(score)
      }
    }

    return {
      ...bestMove,
      score: bestScore,
      reasoning: bestReasoning
    }
  }

  // Minimax algorithm with alpha-beta pruning
  private minimax(
    boardArray: string[], 
    depth: number, 
    isMaximizing: boolean, 
    aiSymbol: string, 
    playerSymbol: string,
    alpha: number,
    beta: number
  ): number {
    // Terminal conditions
    if (depth === 0) {
      return this.evaluateBoardState(boardArray, aiSymbol, playerSymbol)
    }

    // Check for game ending conditions
    const gameResult = this.checkGameEnd(boardArray, aiSymbol, playerSymbol)
    if (gameResult !== null) {
      return gameResult
    }

    // Get possible moves (limited for performance)
    const moves = this.getPossibleMovesLimited(boardArray, Math.min(15, 25 - depth * 2))
    
    if (isMaximizing) {
      let maxScore = -Infinity
      
      for (const move of moves) {
        const testBoard = [...boardArray]
        testBoard[move.row * this.boardSize + move.col] = aiSymbol
        
        const score = this.minimax(testBoard, depth - 1, false, aiSymbol, playerSymbol, alpha, beta)
        maxScore = Math.max(maxScore, score)
        alpha = Math.max(alpha, score)
        
        if (beta <= alpha) {
          break // Alpha-beta pruning
        }
      }
      
      return maxScore
    } else {
      let minScore = Infinity
      
      for (const move of moves) {
        const testBoard = [...boardArray]
        testBoard[move.row * this.boardSize + move.col] = playerSymbol
        
        const score = this.minimax(testBoard, depth - 1, true, aiSymbol, playerSymbol, alpha, beta)
        minScore = Math.min(minScore, score)
        beta = Math.min(beta, score)
        
        if (beta <= alpha) {
          break // Alpha-beta pruning
        }
      }
      
      return minScore
    }
  }

  // Check if game has ended and return score
  private checkGameEnd(boardArray: string[], aiSymbol: string, playerSymbol: string): number | null {
    // Check for AI win
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (boardArray[row * this.boardSize + col] === aiSymbol) {
          if (this.checkWinCondition(boardArray, row, col, aiSymbol)) {
            return 10000
          }
        } else if (boardArray[row * this.boardSize + col] === playerSymbol) {
          if (this.checkWinCondition(boardArray, row, col, playerSymbol)) {
            return -10000
          }
        }
      }
    }
    
    // Check for draw (board full)
    if (boardArray.every(cell => cell !== '')) {
      return 0
    }
    
    return null // Game continues
  }

  // Comprehensive board state evaluation
  private evaluateBoardState(boardArray: string[], aiSymbol: string, playerSymbol: string): number {
    let score = 0
    
    // Evaluate all positions for both players
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const index = row * this.boardSize + col
        if (boardArray[index] === aiSymbol) {
          score += this.evaluatePositionAdvanced(boardArray, row, col, aiSymbol, true)
        } else if (boardArray[index] === playerSymbol) {
          score -= this.evaluatePositionAdvanced(boardArray, row, col, playerSymbol, false)
        }
      }
    }
    
    return score
  }

  // Advanced position evaluation with threat detection
  private evaluatePositionAdvanced(boardArray: string[], row: number, col: number, symbol: string, isAI: boolean): number {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // diagonal /
    ]

    let totalScore = 0

    for (const [dRow, dCol] of directions) {
      const pattern = this.analyzePattern(boardArray, row, col, dRow, dCol, symbol)
      totalScore += this.scoreAdvancedPattern(pattern, isAI)
    }

    return totalScore
  }

  // Analyze pattern in a specific direction
  private analyzePattern(boardArray: string[], row: number, col: number, dRow: number, dCol: number, symbol: string): {
    count: number
    leftOpen: boolean
    rightOpen: boolean
    leftBlocked: boolean
    rightBlocked: boolean
  } {
    let count = 1
    let leftOpen = false
    let rightOpen = false
    let leftBlocked = false
    let rightBlocked = false

    // Analyze negative direction
    let i = 1
    while (i <= 4) {
      const newRow = row - i * dRow
      const newCol = col - i * dCol
      
      if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
        const cell = boardArray[newRow * this.boardSize + newCol]
        if (cell === symbol) {
          count++
        } else if (cell === '') {
          leftOpen = true
          break
        } else {
          leftBlocked = true
          break
        }
      } else {
        leftBlocked = true
        break
      }
      i++
    }

    // Analyze positive direction
    i = 1
    while (i <= 4) {
      const newRow = row + i * dRow
      const newCol = col + i * dCol
      
      if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
        const cell = boardArray[newRow * this.boardSize + newCol]
        if (cell === symbol) {
          count++
        } else if (cell === '') {
          rightOpen = true
          break
        } else {
          rightBlocked = true
          break
        }
      } else {
        rightBlocked = true
        break
      }
      i++
    }

    return { count, leftOpen, rightOpen, leftBlocked, rightBlocked }
  }

  // Advanced pattern scoring with threat recognition
  private scoreAdvancedPattern(pattern: {
    count: number
    leftOpen: boolean
    rightOpen: boolean
    leftBlocked: boolean
    rightBlocked: boolean
  }, isAI: boolean): number {
    const { count, leftOpen, rightOpen } = pattern
    const openEnds = (leftOpen ? 1 : 0) + (rightOpen ? 1 : 0)
    const multiplier = isAI ? 1 : 1.5 // Heavily favor defense

    // Winning patterns
    if (count >= 5) {
      return 10000 * multiplier
    }

    // Critical threats - much higher defensive scoring
    if (count === 4) {
      if (openEnds === 2) {
        // Open four is unblockable - game over
        return isAI ? 8000 : -15000  // AI: create own threats, Human: game lost
      }
      if (openEnds === 1) return 3000 * multiplier  // Can be blocked but critical
    }

    // Open three is EXTREMELY dangerous - must block!
    if (count === 3) {
      if (openEnds === 2) return 2000 * multiplier  // Open three - creates double threat!
      if (openEnds === 1) return 300 * multiplier   // Semi-open three - still dangerous
    }

    // Building patterns
    if (count === 2) {
      if (openEnds === 2) return 80 * multiplier    // Open two - potential threat
      if (openEnds === 1) return 20 * multiplier    // Semi-open two
    }

    return Math.max(0, count * 3) * multiplier
  }

  // Get limited set of best moves for performance
  private getPossibleMovesLimited(boardArray: string[], maxMoves: number): { row: number; col: number }[] {
    const allMoves = this.getPossibleMoves(boardArray)
    
    if (allMoves.length <= maxMoves) {
      return allMoves
    }

    // Score moves quickly and take the best ones
    const scoredMoves = allMoves.map(move => ({
      ...move,
      quickScore: this.quickEvaluateMove(boardArray, move)
    }))

    scoredMoves.sort((a, b) => b.quickScore - a.quickScore)
    return scoredMoves.slice(0, maxMoves).map(({ row, col }) => ({ row, col }))
  }

  // Quick move evaluation for move ordering
  private quickEvaluateMove(boardArray: string[], move: { row: number; col: number }): number {
    const { row, col } = move
    let score = 0

    // Distance from center bonus
    const center = Math.floor(this.boardSize / 2)
    const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center)
    score += Math.max(0, 10 - distanceFromCenter)

    // Adjacent to existing pieces bonus
    if (this.isAdjacentToExistingPiece(boardArray, row, col)) {
      score += 20
    }

    // Count nearby pieces
    let nearbyPieces = 0
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = row + dr
        const nc = col + dc
        if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize) {
          if (boardArray[nr * this.boardSize + nc] !== '') {
            nearbyPieces++
          }
        }
      }
    }
    score += nearbyPieces * 5

    return score
  }

  // Detect if a move blocks a critical 4-in-row threat (immediate win next turn)
  private detectFourInRowThreat(boardArray: string[], move: { row: number; col: number }, playerSymbol: string): boolean {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // diagonal /
    ]

    // Scan the entire board for 4-in-row threats and see if this move blocks any
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const index = row * this.boardSize + col
        if (boardArray[index] === playerSymbol) {
          // Found a player piece, check if it's part of a 4-in-row
          for (const [dRow, dCol] of directions) {
            if (this.isFourInRowAt(boardArray, row, col, dRow, dCol, playerSymbol)) {
              // Found a 4-in-row, check if our move would block it
              if (this.moveBlocksFourInRow(boardArray, row, col, dRow, dCol, move, playerSymbol)) {
                console.log(`🔍 Found 4-in-row at (${row}, ${col}) direction (${dRow}, ${dCol}) - move (${move.row}, ${move.col}) blocks it`)
                return true
              }
            }
          }
        }
      }
    }

    return false
  }

  // Check if there's a 4-in-row starting at a specific position and direction
  private isFourInRowAt(boardArray: string[], row: number, col: number, dRow: number, dCol: number, playerSymbol: string): boolean {
    // Check if we have exactly 4 consecutive pieces in this direction
    let count = 0
    for (let i = 0; i < 4; i++) {
      const checkRow = row + i * dRow
      const checkCol = col + i * dCol
      
      if (checkRow < 0 || checkRow >= this.boardSize || checkCol < 0 || checkCol >= this.boardSize) {
        return false
      }
      
      const cellIndex = checkRow * this.boardSize + checkCol
      if (boardArray[cellIndex] === playerSymbol) {
        count++
      } else {
        return false
      }
    }
    
    if (count !== 4) return false
    
    // Check if at least one end is open (can extend to 5)
    const beforeRow = row - dRow
    const beforeCol = col - dCol
    const afterRow = row + 4 * dRow
    const afterCol = col + 4 * dCol
    
    let openEnds = 0
    
    // Check before
    if (beforeRow >= 0 && beforeRow < this.boardSize && beforeCol >= 0 && beforeCol < this.boardSize) {
      const beforeIndex = beforeRow * this.boardSize + beforeCol
      if (boardArray[beforeIndex] === '') openEnds++
    }
    
    // Check after
    if (afterRow >= 0 && afterRow < this.boardSize && afterCol >= 0 && afterCol < this.boardSize) {
      const afterIndex = afterRow * this.boardSize + afterCol
      if (boardArray[afterIndex] === '') openEnds++
    }
    
    return openEnds >= 1 // 4-in-row threat requires at least one open end
  }

  // Check if a move would block a specific 4-in-row
  private moveBlocksFourInRow(boardArray: string[], fourRow: number, fourCol: number, dRow: number, dCol: number, move: { row: number; col: number }, playerSymbol: string): boolean {
    // Check if the move is at either end of the 4-in-row
    const beforeRow = fourRow - dRow
    const beforeCol = fourCol - dCol
    const afterRow = fourRow + 4 * dRow
    const afterCol = fourCol + 4 * dCol
    
    return (move.row === beforeRow && move.col === beforeCol) || (move.row === afterRow && move.col === afterCol)
  }

  // Detect if a move blocks a critical open three threat
  private detectOpenThreeThreat(boardArray: string[], move: { row: number; col: number }, playerSymbol: string): boolean {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal \
      [1, -1]   // diagonal /
    ]

    // Scan the entire board for open three threats and see if this move blocks any
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const index = row * this.boardSize + col
        if (boardArray[index] === playerSymbol) {
          // Found a player piece, check if it's part of an open three
          for (const [dRow, dCol] of directions) {
            if (this.isOpenThreeAt(boardArray, row, col, dRow, dCol, playerSymbol)) {
              // Found an open three, check if our move would block it
              if (this.moveBlocksOpenThree(boardArray, row, col, dRow, dCol, move, playerSymbol)) {
                console.log(`🔍 Found open three at (${row}, ${col}) direction (${dRow}, ${dCol}) - move (${move.row}, ${move.col}) blocks it`)
                return true
              }
            }
          }
        }
      }
    }

    return false
  }

  // Check if there's an open three starting at a specific position and direction
  private isOpenThreeAt(boardArray: string[], row: number, col: number, dRow: number, dCol: number, playerSymbol: string): boolean {
    // Check if we have exactly 3 consecutive pieces in this direction
    let count = 0
    for (let i = 0; i < 3; i++) {
      const checkRow = row + i * dRow
      const checkCol = col + i * dCol
      
      if (checkRow < 0 || checkRow >= this.boardSize || checkCol < 0 || checkCol >= this.boardSize) {
        return false
      }
      
      const cellIndex = checkRow * this.boardSize + checkCol
      if (boardArray[cellIndex] === playerSymbol) {
        count++
      } else {
        return false
      }
    }
    
    if (count !== 3) return false
    
    // Check if both ends are open
    const beforeRow = row - dRow
    const beforeCol = col - dCol
    const afterRow = row + 3 * dRow
    const afterCol = col + 3 * dCol
    
    let openEnds = 0
    
    // Check before
    if (beforeRow >= 0 && beforeRow < this.boardSize && beforeCol >= 0 && beforeCol < this.boardSize) {
      const beforeIndex = beforeRow * this.boardSize + beforeCol
      if (boardArray[beforeIndex] === '') openEnds++
    }
    
    // Check after
    if (afterRow >= 0 && afterRow < this.boardSize && afterCol >= 0 && afterCol < this.boardSize) {
      const afterIndex = afterRow * this.boardSize + afterCol
      if (boardArray[afterIndex] === '') openEnds++
    }
    
    return openEnds >= 2 // Open three requires both ends open
  }

  // Check if a move would block a specific open three
  private moveBlocksOpenThree(boardArray: string[], threeRow: number, threeCol: number, dRow: number, dCol: number, move: { row: number; col: number }, playerSymbol: string): boolean {
    // Check if the move is at either end of the open three
    const beforeRow = threeRow - dRow
    const beforeCol = threeCol - dCol
    const afterRow = threeRow + 3 * dRow
    const afterCol = threeCol + 3 * dCol
    
    return (move.row === beforeRow && move.col === beforeCol) || (move.row === afterRow && move.col === afterCol)
  }

  // Check if a move would block an open three in a specific direction
  private wouldBlockOpenThree(boardArray: string[], row: number, col: number, dRow: number, dCol: number, playerSymbol: string): boolean {
    // Simplified approach: check if placing AI piece at (row, col) would be adjacent to a 3-in-a-row
    // and block an open three threat
    
    // Look in both directions along the line
    for (let direction = -1; direction <= 1; direction += 2) {
      let consecutiveCount = 0
      let positions = []
      
      // Count consecutive pieces in this direction
      for (let i = 1; i <= 4; i++) {
        const checkRow = row + (direction * i * dRow)
        const checkCol = col + (direction * i * dCol)
        
        if (checkRow < 0 || checkRow >= this.boardSize || checkCol < 0 || checkCol >= this.boardSize) {
          break
        }
        
        const cellIndex = checkRow * this.boardSize + checkCol
        if (boardArray[cellIndex] === playerSymbol) {
          consecutiveCount++
          positions.push({ row: checkRow, col: checkCol })
        } else {
          break
        }
      }
      
      // If we found exactly 3 consecutive pieces, check if it's an open three
      if (consecutiveCount === 3) {
        // Check the other end of the three-in-a-row for openness
        const otherEndRow = positions[2].row + (direction * dRow)
        const otherEndCol = positions[2].col + (direction * dCol)
        
        if (otherEndRow >= 0 && otherEndRow < this.boardSize && 
            otherEndCol >= 0 && otherEndCol < this.boardSize) {
          const otherEndIndex = otherEndRow * this.boardSize + otherEndCol
          if (boardArray[otherEndIndex] === '') {
            // This is an open three - blocking it would prevent a dangerous threat
            return true
          }
        }
      }
    }

    return false
  }

  // Get reasoning from minimax score
  private getMoveReasoningFromScore(score: number): string {
    if (score >= 8000) return 'Creating winning threats'
    if (score >= 5000) return 'Winning attack sequence'
    if (score >= 1000) return 'Strong tactical advantage'
    if (score >= 500) return 'Building winning position'
    if (score >= 100) return 'Good strategic move'
    if (score >= 0) return 'Solid positional play'
    if (score >= -100) return 'Defensive consolidation'
    if (score >= -500) return 'Damage control'
    if (score >= -10000) return 'Facing inevitable defeat'
    return 'Best available option'
  }

  private isEmpty(boardArray: string[]): boolean {
    return boardArray.every(cell => cell === '')
  }

  private getPossibleMoves(boardArray: string[]): { row: number; col: number }[] {
    const moves: { row: number; col: number }[] = []
    
    // Check if board is truly empty
    const hasAnyPieces = boardArray.some(cell => cell !== '')
    
    if (!hasAnyPieces) {
      // Empty board - return center
      const center = Math.floor(this.boardSize / 2)
      moves.push({ row: center, col: center })
      return moves
    }
    
    // Find all empty cells that are adjacent to existing pieces
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const index = row * this.boardSize + col
        if (boardArray[index] === '' && this.isAdjacentToExistingPiece(boardArray, row, col)) {
          moves.push({ row, col })
        }
      }
    }

    // Fallback: if no adjacent moves found but board has pieces, add all empty cells
    if (moves.length === 0) {
      for (let row = 0; row < this.boardSize; row++) {
        for (let col = 0; col < this.boardSize; col++) {
          const index = row * this.boardSize + col
          if (boardArray[index] === '') {
            moves.push({ row, col })
          }
        }
      }
    }

    return moves
  }

  private isAdjacentToExistingPiece(boardArray: string[], row: number, col: number): boolean {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]

    for (const [dRow, dCol] of directions) {
      const newRow = row + dRow
      const newCol = col + dCol
      if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
        const index = newRow * this.boardSize + newCol
        if (boardArray[index] !== '') {
          return true
        }
      }
    }
    return false
  }


  private checkWinCondition(boardArray: string[], row: number, col: number, symbol: string): boolean {
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
      
      // Count in negative direction
      for (let i = 1; i < 5; i++) {
        const newRow = row - i * dRow
        const newCol = col - i * dCol
        if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
          if (boardArray[newRow * this.boardSize + newCol] === symbol) {
            count++
          } else {
            leftEnd = newRow * this.boardSize + newCol
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
        if (newRow >= 0 && newRow < this.boardSize && newCol >= 0 && newCol < this.boardSize) {
          if (boardArray[newRow * this.boardSize + newCol] === symbol) {
            count++
          } else {
            rightEnd = newRow * this.boardSize + newCol
            break
          }
        } else {
          break
        }
      }
      
      // Check for 5 in a row
      if (count >= 5) return true
      
      // Check for 4 in a row with open ends (empty spaces on both sides)
      if (count === 4) {
        const leftEmpty = leftEnd !== -1 && boardArray[leftEnd] === ''
        const rightEmpty = rightEnd !== -1 && boardArray[rightEnd] === ''
        if (leftEmpty && rightEmpty) return true
      }
    }
    
    return false
  }

}