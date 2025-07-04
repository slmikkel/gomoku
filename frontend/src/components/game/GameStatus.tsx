import { GameState, GameStatus as GameStatusEnum } from '../../types/game'

interface GameStatusProps {
  game: GameState | null
  isAiThinking?: boolean
  boardSize?: number
}

const GameStatus = ({ game, isAiThinking = false, boardSize }: GameStatusProps) => {
  const isPlaying = !!game
  const status = game?.status
  const currentPlayer = game?.currentPlayerId === game?.player1Id ? 'X' : 'O'
  const winnerId = game?.winnerId

  if (!isPlaying) {
    return (
      <div className="text-center">
        <h2 className="text-navbg text-5xl font-bold text-shadow-lg mb-4">Welcome to Gomoku</h2>
        {/*<p className="text-foreground">Start a new game to begin playing</p>*/}
      </div>
    )
  }

  const getStatusMessage = () => {
    // Handle both string and enum values for status
    const isWaitingForPlayer = status === GameStatusEnum.WaitingForPlayer || status === 'WaitingForPlayer'
    const isInProgress = status === GameStatusEnum.InProgress || status === 'InProgress' 
    const isCompleted = status === GameStatusEnum.Completed || status === 'Completed'
    const isDraw = status === GameStatusEnum.Draw || status === 'Draw'
    
    if (isWaitingForPlayer) {
      return "Waiting for opponent to join..."
    } else if (isInProgress) {
      if (isAiThinking && currentPlayer === 'O') {
        return 'AI is thinking...'
      }
      return `Current Turn: Player ${currentPlayer}`
    } else if (isCompleted) {
      if (winnerId) {
        const winnerSymbol = winnerId === game?.player1Id ? 'X (You)' : 'O (AI)'
        return `🎉 Game Over - ${winnerSymbol} Wins!`
      }
      return "Game Over - It's a Draw!"
    } else if (isDraw) {
      return "Game Over - It's a Draw!"
    } else {
      return "Loading..."
    }
  }

  return (
    <div className="text-center space-y-2">
      <h2 className="text-2xl font-bold">Game in Progress</h2>
      {game && (boardSize || game.boardSize) && (
        <p className="text-sm font-medium text-primary">
          {(boardSize || game.boardSize)}x{(boardSize || game.boardSize)} Board
        </p>
      )}
      <div className="flex flex-col items-center gap-2">
        <p className={`text-lg ${status === GameStatusEnum.InProgress || status === 'InProgress' ? 'text-primary' : 'text-muted-foreground'}`}>
          {getStatusMessage()}
        </p>
        <div className="h-6 flex items-center justify-center">
          {isAiThinking && (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Processing move...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameStatus 