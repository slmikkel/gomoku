import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GameBoard from "../game/GameBoard.tsx";

describe('GameBoard', () => {
    it('renders board with correct size', () => {
        const mockOnMove = vi.fn()

        render(
            <GameBoard
                board=""
                onMove={mockOnMove}
                disabled={false}
                boardSize={8}
                moves={[]}
                playerIcons={{player1: 'X', player2: 'O'}} currentPlayer={'X'}            
            />
        )

        const cells = screen.getAllByRole('button')
        expect(cells).toHaveLength(64) // 8x8 board
    })

    it('calls onMove when cell is clicked', () => {
        const mockOnMove = vi.fn()

        render(
            <GameBoard
                board=""
                onMove={mockOnMove}
                disabled={false}
                boardSize={3}
                moves={[]}
                playerIcons={{player1: 'X', player2: 'O'}} currentPlayer={'X'}            
            />
        )

        const firstCell = screen.getAllByRole('button')[0]
        fireEvent.click(firstCell)

        expect(mockOnMove).toHaveBeenCalledWith(0, 0)
    })
})