import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNetworkGameStore } from '../../store/networkGameStore'
import { useNetworkSignalR } from '../../hooks/use-network-signalr'
import { NetworkGameDto, PlayerSymbol, NetworkGameStatus } from '../../types/network'
import GameBoard from '../game/GameBoard'
import CellSizeSelector from '../ui/CellSizeSelector'

interface NetworkGameBoardProps {
  networkGameId: string
  networkGame: NetworkGameDto
  onGameEnded: () => void
  onGameLeft: () => void
  cellSize: 'small' | 'medium' | 'large'
  onCellSizeChange: (size: 'small' | 'medium' | 'large') => void
  thirdPlayerIcon?: string
}

interface GameState {
  board: string
  status: number
  currentPlayerId: string | null
  lastUpdate: string
}

const NetworkGameBoard = ({ networkGameId, networkGame, onGameEnded, onGameLeft, cellSize, onCellSizeChange, thirdPlayerIcon }: NetworkGameBoardProps) => {
  const { user } = useAuthStore()
  const { chatMessages, addChatMessage } = useNetworkGameStore()
  
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [winner, setWinner] = useState<string | null>(null)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [boardArray, setBoardArray] = useState<string[]>([])
  const [winningCells, setWinningCells] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isProcessingMove, setIsProcessingMove] = useState(false)

  // Get current player info
  const currentPlayer = networkGame.players.find(p => p.userId === user?.id)
  const otherPlayers = networkGame.players.filter(p => p.userId !== user?.id)
  const mySymbol = currentPlayer?.playerSymbol === PlayerSymbol.X ? 'X' : 
                   currentPlayer?.playerSymbol === PlayerSymbol.O ? 'O' : 'Triangle'

  const signalRCallbacks = {
    onNetworkGameMoveMade: (gameId: string, newGameState: GameState, playerId: string, row: number, column: number) => {
      if (gameId === networkGameId) {
        setGameState(newGameState)
        updateGameUI(newGameState)
      }
    },
    onNetworkGameCompleted: (gameId: string, winnerId: string | null, finalStatus: any) => {
      if (gameId === networkGameId) {
        setWinner(winnerId)
        setGameEnded(true)
        setIsMyTurn(false)
      }
    },
    onNetworkGameStateSync: (gameId: string, syncedGameState: GameState) => {
      if (gameId === networkGameId) {
        setGameState(syncedGameState)
        updateGameUI(syncedGameState)
      }
    },
    onNetworkGameChatMessage: (message: any) => {
      if (message.networkGameId === networkGameId) {
        addChatMessage(message)
      }
    }
  }

  const { 
    isConnected, 
    sendNetworkGameMove, 
    sendNetworkGameChatMessage,
    requestNetworkGameReconnect 
  } = useNetworkSignalR(signalRCallbacks)

  // Request game state sync on mount
  useEffect(() => {
    if (isConnected) {
      requestNetworkGameReconnect(networkGameId)
    }
  }, [isConnected, networkGameId])

  const updateGameUI = useCallback((state: GameState) => {
    const board = state.board.split(',')
    setBoardArray(board)
    
    // Determine if it's current user's turn
    if (state.currentPlayerId && !gameEnded) {
      setIsMyTurn(state.currentPlayerId === user?.id)
    } else {
      setIsMyTurn(false)
    }

    // Check for win condition and highlight winning cells
    if (state.status === 2) { // GameStatus.Completed
      const winCells = checkForWin(board, networkGame.boardSize)
      setWinningCells(winCells)
      setGameEnded(true)
    }
  }, [user?.id, gameEnded, networkGame.boardSize])

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

  const handleCellClick = async (row: number, col: number) => {
    if (!isMyTurn || gameEnded || !isConnected || isProcessingMove) return

    const index = row * networkGame.boardSize + col
    if (boardArray[index]) return // Cell already occupied

    setIsProcessingMove(true)
    setError(null)

    try {
      await sendNetworkGameMove(networkGameId, row, col)
    } catch (error) {
      console.error('Failed to send move:', error)
      setError('Failed to make move. Please try again.')
    } finally {
      setIsProcessingMove(false)
    }
  }

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !isConnected) return

    try {
      await sendNetworkGameChatMessage(networkGameId, chatMessage)
      setChatMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleNewGame = () => {
    onGameEnded()
  }

  const getCurrentPlayerDisplay = () => {
    if (gameEnded) {
      if (winner) {
        const winnerPlayer = networkGame.players.find(p => p.userId === winner)
        const isWinner = winner === user?.id
        return isWinner ? '🎉 You Won!' : `🎉 ${winnerPlayer?.username} Won!`
      } else {
        return '🤝 Game Draw!'
      }
    }

    if (isMyTurn) {
      return `🎯 Your Turn (${mySymbol})`
    } else {
      // Find current player based on currentPlayerId from game state
      const currentTurnPlayer = networkGame.players.find(p => p.userId === gameState?.currentPlayerId)
      return `⏳ ${currentTurnPlayer?.username || 'Other Player'}'s Turn`
    }
  }

  if (!gameState && !gameEnded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">🎮</div>
          <p>Loading game...</p>
          {!isConnected && (
            <p className="text-sm text-muted-foreground mt-2">Connecting...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Game Area */}
        <div className="xl:col-span-3">
          {/* Game Status */}
          <div className="mb-6 p-4 bg-accent/50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold mb-2">{networkGame.gameName}</h2>
                <p className="text-lg font-medium">{getCurrentPlayerDisplay()}</p>
                {!isConnected && (
                  <p className="text-sm text-destructive mt-1">⚠️ Connection lost - attempting to reconnect...</p>
                )}
                {error && (
                  <p className="text-sm text-destructive mt-1">❌ {error}</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <div className="font-medium">{currentPlayer?.username} ({mySymbol}) - You</div>
                  {otherPlayers.length > 0 && (
                    <>
                      <span>vs</span>
                      <div className="flex gap-2">
                        {otherPlayers.map((player, index) => (
                          <span key={player.userId} className={!player.isConnected ? 'text-destructive' : ''}>
                            {player.username} ({player.playerSymbol === PlayerSymbol.X ? 'X' : 
                                               player.playerSymbol === PlayerSymbol.O ? 'O' : '△'})
                            {index < otherPlayers.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Game Settings */}
          <div className="mb-4 p-3 bg-accent/30 rounded-lg">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Cell Size:</label>
                <CellSizeSelector 
                  value={cellSize} 
                  onChange={onCellSizeChange}
                  className="w-32 px-2 py-1 text-sm border border-border rounded-md bg-background"
                />
              </div>
            </div>
          </div>

          {/* Game Board */}
          <div className="mb-6">
            <GameBoard
              board={boardArray.join(',')}
              boardSize={networkGame.boardSize}
              onMove={handleCellClick}
              slotSize={cellSize}
              winningCells={winningCells}
              playerIcons={(() => {
                // Get icons from actual player data
                const player1 = networkGame.players.find(p => p.playerSymbol === PlayerSymbol.X)
                const player2 = networkGame.players.find(p => p.playerSymbol === PlayerSymbol.O)
                const player3 = networkGame.players.find(p => p.playerSymbol === PlayerSymbol.Triangle)
                
                return { 
                  player1: player1?.playerIcon || '✖', 
                  player2: player2?.playerIcon || '⭕',
                  player3: player3?.playerIcon || thirdPlayerIcon || '▲'
                }
              })()}
              disabled={!isMyTurn || gameEnded || !isConnected}
              currentPlayer={mySymbol}
            />
          </div>

          {/* Game Controls */}
          {gameEnded && (
            <div className="text-center">
              <button
                onClick={handleNewGame}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors mr-4"
              >
                🔄 Back to Room
              </button>
              <button
                onClick={onGameLeft}
                className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                🚪 Leave Game
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Players */}
          <div className="bg-accent/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Players</h3>
            <div className="space-y-2">
              {networkGame.players.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-2 rounded-md ${
                    player.userId === user?.id ? 'bg-primary/10' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium">{player.username}</span>
                    {player.userId === user?.id && (
                      <span className="text-xs text-muted-foreground">(You)</span>
                    )}
                  </div>
                  <span className="text-lg">
                    {player.playerIcon || (player.playerSymbol === PlayerSymbol.X ? '✖' : 
                                           player.playerSymbol === PlayerSymbol.O ? '⭕' : 
                                           thirdPlayerIcon || '▲')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="bg-accent/50 rounded-lg p-4 flex flex-col h-[400px]">
            <h3 className="font-semibold mb-3">Chat</h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-2">
              {chatMessages.filter(msg => msg.networkGameId === networkGameId).map((message, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-xs">{message.senderUsername}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">{message.message}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Type message..."
                className="flex-1 px-2 py-1 border border-border rounded bg-background text-sm"
                maxLength={200}
              />
              <button
                onClick={handleSendChatMessage}
                disabled={!chatMessage.trim() || !isConnected}
                className="px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NetworkGameBoard