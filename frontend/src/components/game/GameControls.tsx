import { GameState } from '../../types/game'

interface GameControlsProps {
  game: GameState | null
  onStartGame: () => void
  onLeaveGame: () => void
}

const GameControls = ({ game, onStartGame, onLeaveGame }: GameControlsProps) => {
  const isPlaying = !!game

  return (
    <div className="flex items-center space-x-4">
      {!isPlaying ? (
        <button
          onClick={onStartGame}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Start New Game
        </button>
      ) : (
        <>
          <button
            onClick={onStartGame}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            New Game
          </button>
          <button
            onClick={onLeaveGame}
            className="inline-flex h-11 items-center justify-center rounded-md bg-destructive px-8 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Leave Game
          </button>
        </>
      )}
    </div>
  )
}

export default GameControls 