import { create } from 'zustand'
import { gameApi } from '../lib/api'
import { GameState, GameStatus } from '../types/game'
import { GomokuAI, AIDifficulty } from '../services/aiService'

export { AIDifficulty }

interface GameStore {
  game: GameState | null
  isLoading: boolean
  error: string | null
  ai: GomokuAI | null
  isAiThinking: boolean
  aiDifficulty: AIDifficulty
  createGame: (isAiGame: boolean, boardSize?: number, difficulty?: AIDifficulty, isLocalGame?: boolean, startingPlayer?: string) => Promise<GameState>
  makeMove: (gameId: string, row: number, col: number) => Promise<void>
  makeAiMove: (gameId: string) => Promise<void>
  joinGame: (gameId: string) => Promise<void>
  leaveGame: (gameId: string) => Promise<void>
  updateGameState: (newState: GameState) => void
  setError: (error: string) => void
  resetGame: () => void
  setAiDifficulty: (difficulty: AIDifficulty) => void
  checkWinCondition: (board: string, boardSize: number, lastMove: { row: number, col: number, symbol: string }) => boolean
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  isLoading: false,
  error: null,
  ai: null,
  isAiThinking: false,
  aiDifficulty: AIDifficulty.MEDIUM,

  createGame: async (isAiGame: boolean, boardSize: number = 8, difficulty: AIDifficulty = AIDifficulty.MEDIUM, isLocalGame: boolean = false, startingPlayer?: string) => {
    try {
      set({ isLoading: true, error: null })
      
      // Initialize AI if it's an AI game
      if (isAiGame) {
        const ai = new GomokuAI(boardSize, difficulty)
        set({ ai, aiDifficulty: difficulty })
      }
      
      const response = await gameApi.createGame(isAiGame, boardSize, isLocalGame, startingPlayer)
      const gameState = response.data
      set({ game: gameState })
      return gameState
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create game'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ isLoading: false })
    }
  },

  makeMove: async (gameId: string, row: number, col: number) => {
    console.log('🏪 GameStore: makeMove called', { gameId, row, col })
    
    try {
      set({ isLoading: true, error: null })
      console.log('🌐 GameStore: Calling API...')
      const response = await gameApi.makeMove(gameId, row, col)
      console.log('✅ GameStore: API response received', response.data)
      const updatedState = response.data
      set({ game: updatedState })

      // Check if this is an AI game and AI should move next
      const isAIGame = updatedState.gameType === 'AI' || updatedState.gameType === 1 // Handle both string and numeric
      const gameStillInProgress = updatedState.status === 'InProgress' || updatedState.status === 1
      const isAITurn = isAIGame && gameStillInProgress && updatedState.currentPlayerId !== updatedState.player1Id

      console.log('🤖 GameStore: AI check', { isAIGame, gameStillInProgress, isAITurn, currentPlayerId: updatedState.currentPlayerId, player1Id: updatedState.player1Id })

      if (isAITurn) {
        console.log('🎯 GameStore: Triggering AI move...')
        
        // Show human move immediately, then trigger AI with minimal delay
        set({ isLoading: false }) // Release loading immediately after human move
        
        setTimeout(async () => {
          try {
            // Brief loading state for AI move only
            set({ isLoading: true })
            const aiResponse = await gameApi.makeAiMove(gameId)
            console.log('🤖 GameStore: AI move completed', aiResponse.data)
            console.log('🔍 GameStore: AI response detailed', {
              status: aiResponse.data.status,
              statusType: typeof aiResponse.data.status,
              winnerId: aiResponse.data.winnerId,
              player1Id: aiResponse.data.player1Id,
              player2Id: aiResponse.data.player2Id,
              gameId: aiResponse.data.id
            })
            
            // Check if AI won the game
            if (aiResponse.data.status === 'Completed' || aiResponse.data.status === 2) {
              console.log('🏆 GameStore: AI won the game!', { 
                status: aiResponse.data.status, 
                winnerId: aiResponse.data.winnerId,
                player2Id: aiResponse.data.player2Id 
              })
            } else {
              console.log('🔄 GameStore: Game continues', { status: aiResponse.data.status })
            }
            
            set({ game: aiResponse.data })
          } catch (aiError: any) {
            console.error('❌ GameStore: AI move failed', aiError)
            const message = aiError.response?.data?.message || 'AI move failed'
            set({ error: message })
          } finally {
            set({ isLoading: false })
          }
        }, 300) // Reduced delay for faster AI response
      } else {
        // For non-AI games, release loading immediately
        set({ isLoading: false })
      }
    } catch (error: any) {
      console.error('❌ GameStore: API error', error)
      const message = error.response?.data?.message || 'Failed to make move'
      set({ error: message })
      throw new Error(message)
    } finally {
      // Loading state is now handled explicitly in the success path
      // Only set to false on error cases
      if (get().error) {
        set({ isLoading: false })
      }
    }
  },

  joinGame: async (gameId: string) => {
    try {
      set({ isLoading: true, error: null })
      const response = await gameApi.joinGame(gameId)
      const gameState = response.data
      set({ game: gameState })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to join game'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ isLoading: false })
    }
  },

  makeAiMove: async (gameId: string) => {
    const state = get()
    const { game } = state
    
    if (!game || game.status !== GameStatus.InProgress) {
      return
    }

    try {
      set({ isAiThinking: true, error: null })
      
      // Add delay for better UX
      await new Promise(resolve => 
        setTimeout(resolve, state.aiDifficulty === AIDifficulty.EASY ? 500 : 
                            state.aiDifficulty === AIDifficulty.MEDIUM ? 1000 : 1500)
      )
      
      // Use the backend AI move endpoint
      const response = await gameApi.makeAiMove(gameId)
      const updatedState = response.data
      set({ game: updatedState })
    } catch (error: any) {
      const message = error.response?.data?.message || 'AI move failed'
      set({ error: message })
      throw new Error(message)
    } finally {
      set({ isAiThinking: false })
    }
  },

  leaveGame: async (gameId: string) => {
    try {
      set({ game: null, error: null, ai: null, isAiThinking: false })
    } catch (error: any) {
      const message = 'Failed to leave game'
      set({ error: message })
      throw new Error(message)
    }
  },

  updateGameState: (newState: GameState) => {
    set({ game: newState })
  },

  setError: (error: string) => {
    set({ error })
  },

  resetGame: () => {
    set({ game: null, error: null, ai: null, isAiThinking: false })
  },

  setAiDifficulty: (difficulty: AIDifficulty) => {
    const state = get()
    if (state.game && state.ai) {
      const newAi = new GomokuAI(state.game.boardSize, difficulty)
      set({ ai: newAi, aiDifficulty: difficulty })
    } else {
      set({ aiDifficulty: difficulty })
    }
  },

  checkWinCondition: (board: string, boardSize: number, lastMove: { row: number, col: number, symbol: string }) => {
    const boardArray = board.split(',')
    const { row, col, symbol } = lastMove
    
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
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
          if (boardArray[newRow * boardSize + newCol] === symbol) {
            count++
          } else {
            leftEnd = newRow * boardSize + newCol
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
        if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize) {
          if (boardArray[newRow * boardSize + newCol] === symbol) {
            count++
          } else {
            rightEnd = newRow * boardSize + newCol
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
  },
})) 