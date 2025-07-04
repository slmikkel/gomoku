using Game.Core.Enums;

namespace Game.Core.Interfaces;

public interface IGameAI
{
    /// <summary>
    /// Calculates the best move for the AI player using the minimax algorithm
    /// </summary>
    /// <param name="board">Current game board state</param>
    /// <param name="aiSymbol">Symbol (X or O) that the AI is playing as</param>
    /// <returns>Tuple containing (row, column) of the best move</returns>
    (int row, int column) CalculateBestMove(string board, PlayerSymbol aiSymbol);
} 