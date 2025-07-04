import { useMemo, memo, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { GameMove } from '../../types/game'

interface GameBoardProps {
  board: string
  onMove: (row: number, col: number) => void
  disabled: boolean
  currentPlayer: 'X' | 'O' | 'Triangle'
  boardSize?: number
  moves?: GameMove[]
  winnerId?: string | null
  slotSize?: 'small' | 'medium' | 'large'
  winningCells?: number[]
  playerIcons?: {
    player1: string
    player2: string
    player3?: string
  }
}

const GameBoard = ({ board, onMove, disabled, currentPlayer, boardSize: propBoardSize, moves, winnerId, slotSize = 'large', winningCells = [], playerIcons }: GameBoardProps) => {
  console.log('🎯 GameBoard: Component rendered', { board: board?.length, disabled, boardSize: propBoardSize });
  
  const boardArray = useMemo(() => {
    if (!board) return []
    return board.split(',')
  }, [board])

  const boardSize = useMemo(() => {
    if (propBoardSize) return propBoardSize
    if (!boardArray.length) return 8
    return Math.sqrt(boardArray.length)
  }, [boardArray, propBoardSize])

  const lastMove = useMemo(() => {
    if (!moves || moves.length === 0) return null
    return moves[moves.length - 1]
  }, [moves])

  const isLastMove = (index: number) => {
    if (!lastMove) return false
    const row = Math.floor(index / boardSize)
    const col = index % boardSize
    return lastMove.row === row && lastMove.column === col
  }

  const isWinningCell = (index: number) => {
    return winningCells.includes(index)
  }

  const gameEnded = winnerId !== null

  // Calculate slot dimensions based on size and board size
  const getSlotDimensions = () => {
    const sizeMultipliers = {
      small: 1,
      medium: 1.33, // 33% larger
      large: 1.67   // 67% larger
    }
    
    const multiplier = sizeMultipliers[slotSize]
    
    if (boardSize <= 8) {
      return {
        cellSize: Math.round(30 * multiplier),
        gap: 6,
        padding: Math.round(24 * multiplier),
        fontSize: 'text-base'
      }
    } else if (boardSize >= 10 && boardSize <= 14) {
      return {
        cellSize: Math.round(22 * multiplier),
        gap: 4,
        padding: Math.round(16 * multiplier),
        fontSize: 'text-sm'
      }
    } else {
      // For sizes 16, 20, 24
      return {
        cellSize: Math.round(18 * multiplier),
        gap: 4,
        padding: Math.round(8 * multiplier),
        fontSize: 'text-xs'
      }
    }
  }

  const { cellSize, gap, padding, fontSize } = getSlotDimensions()
  
  // Calculate icon size based on cell size
  const getIconSize = () => {
    // Icon should be about 60-70% of cell size for good proportion
    const iconSize = Math.round(cellSize * 0.65)
    return Math.max(12, Math.min(iconSize, 48)) // Min 12px, max 48px
  }

  const iconSize = getIconSize()

  const handleCellClick = useCallback((index: number) => {
    console.log('🔍 GameBoard: Cell clicked', { index, disabled, cellValue: boardArray[index], boardSize })
    
    if (disabled || boardArray[index]) {
      console.log('🚫 GameBoard: Click blocked', { disabled, cellOccupied: !!boardArray[index] })
      return;
    }
    
    const row = Math.floor(index / boardSize)
    const col = index % boardSize
    console.log('✅ GameBoard: Calling onMove', { row, col, index })
    onMove(row, col)
  }, [disabled, boardArray, boardSize, onMove])

  // Create a grid of cells based on boardSize (memoized to prevent re-rendering)
  const cells = useMemo(() => {
    const cellArray = []
    for (let i = 0; i < boardSize * boardSize; i++) {
      const cellValue = boardArray[i] || ''
      const isLastMoveCell = isLastMove(i)
      const isWinningCellValue = isWinningCell(i)
      
      // Get display symbol
      let displaySymbol = ''
      if (cellValue === 'X') {
        displaySymbol = playerIcons?.player1 || '✖'
      } else if (cellValue === 'O') {
        displaySymbol = playerIcons?.player2 || '⭕'
      } else if (cellValue === 'Triangle') {
        displaySymbol = playerIcons?.player3 || '▲'
      }
      
      cellArray.push(
        <button
          key={i}
          onClick={() => {
            console.log('🔥 DIRECT: Button clicked!', i)
            handleCellClick(i)
          }}
          disabled={disabled || !!cellValue}
          className={cn(
            'rounded-md border border-border bg-background font-bold transition-all duration-200 hover:bg-accent relative flex items-center justify-center',
            fontSize,
            // Enhanced styling for custom icons
            !cellValue && !disabled && 'hover:scale-110 cursor-pointer',
            isLastMoveCell && !isWinningCellValue && 'ring-2 ring-primary ring-offset-1 bg-primary/10',
            isWinningCellValue && 'bg-green-200 dark:bg-green-800 ring-2 ring-green-500',
            gameEnded && cellValue && !isWinningCellValue && 'opacity-80',
            // Add shadow for better icon visibility
            cellValue && 'shadow-md'
          )}
          style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`
          }}
        >
          <span className="select-none" style={{ 
            filter: 'drop-shadow(0 3px 1px rgba(0, 0, 0, 0.3))',
            fontSize: `${iconSize}px`,
            lineHeight: '1'
          }}>
            {displaySymbol}
          </span>
          {isLastMoveCell && cellValue && (
            <div className="absolute inset-0 rounded-md bg-primary/20 animate-ping" />
          )}
        </button>
      )
    }
    return cellArray
  }, [boardArray, boardSize, disabled, fontSize, cellSize, iconSize, gameEnded, winningCells, lastMove, playerIcons, handleCellClick])

  return (
    <div className="flex justify-center items-center w-full">
      <div 
        className="grid rounded-lg border-4 border-border bg-board-background shadow-[0px_10px_20px_2px_rgba(0,0,0,0.4)]"
        style={{ 
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
          gap: `${gap}px`,
          padding: `${padding}px`,
          // Calculate fixed board size based on cell size + gaps + padding
          width: `${boardSize * cellSize + (boardSize - 1) * gap + padding * 2}px`,
          height: `${boardSize * cellSize + (boardSize - 1) * gap + padding * 2}px`
        }}
      >
        {cells}
      </div>
    </div>
  )
}

export default memo(GameBoard) 