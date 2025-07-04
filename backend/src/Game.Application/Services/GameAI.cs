using Game.Core.Enums;
using Game.Core.Interfaces;
using Game.Core.Settings;

namespace Game.Application.Services;

public class GameAI : IGameAI
{
    private readonly int _boardSize;
    private readonly AISettings _aiSettings;
    private readonly Dictionary<long, int> _transpositionTable = new();
    private readonly long[,,] _zobristTable;

    public GameAI(int boardSize = 8, AISettings? aiSettings = null)
    {
        if (boardSize < 5)
        {
            throw new ArgumentException("Board size must be at least 5x5 for Five in a Row");
        }
        _boardSize = boardSize;
        _aiSettings = aiSettings ?? new AISettings();
        
        // Initialize Zobrist table for transposition table
        _zobristTable = new long[boardSize, boardSize, 2];
        var random = new Random(42); // Fixed seed for reproducibility
        for (int i = 0; i < boardSize; i++)
        {
            for (int j = 0; j < boardSize; j++)
            {
                for (int k = 0; k < 2; k++)
                {
                    _zobristTable[i, j, k] = random.NextInt64();
                }
            }
        }
    }

    public (int row, int column) CalculateBestMove(string board, PlayerSymbol aiSymbol)
    {
        var boardArray = board.Split(',');
        var boardSize = (int)Math.Sqrt(boardArray.Length);
        var moves = GetOrderedMoves(boardArray, boardSize);
        var opponentSymbol = aiSymbol == PlayerSymbol.X ? PlayerSymbol.O : PlayerSymbol.X;

        // PRIORITY 1: Check for immediate winning moves
        foreach (var (row, column) in moves)
        {
            boardArray[row * boardSize + column] = aiSymbol.ToString();
            if (HasWinningLine(boardArray, aiSymbol.ToString(), boardSize))
            {
                Console.WriteLine($"🎯 AI found winning move at ({row}, {column})");
                boardArray[row * boardSize + column] = "";
                return (row, column);
            }
            boardArray[row * boardSize + column] = "";
        }

        // PRIORITY 2: Check for critical blocks - opponent immediate win threats
        foreach (var (row, column) in moves)
        {
            boardArray[row * boardSize + column] = opponentSymbol.ToString();
            if (HasWinningLine(boardArray, opponentSymbol.ToString(), boardSize))
            {
                Console.WriteLine($"🛡️ AI blocking immediate win threat at ({row}, {column})");
                boardArray[row * boardSize + column] = "";
                return (row, column);
            }
            boardArray[row * boardSize + column] = "";
        }

        // PRIORITY 3: Use minimax for deeper strategic analysis
        var bestScore = int.MinValue;
        var bestMove = (row: 0, column: 0);

        foreach (var (row, column) in moves)
        {
            boardArray[row * boardSize + column] = aiSymbol.ToString();
            var score = Minimax(boardArray, 0, false, int.MinValue, int.MaxValue, aiSymbol, _aiSettings.MediumDepth, boardSize);
            boardArray[row * boardSize + column] = "";

            if (score > bestScore)
            {
                bestScore = score;
                bestMove = (row, column);
            }
        }

        Console.WriteLine($"🧠 AI chose strategic move at ({bestMove.row}, {bestMove.column}) with score {bestScore}");
        return bestMove;
    }

    private List<(int row, int column)> GetOrderedMoves(string[] board, int boardSize)
    {
        var moves = new List<(int row, int column)>();
        
        // If no pieces on board yet, prioritize center and adjacent positions
        if (!HasAnyPieces(board))
        {
            var center = boardSize / 2;
            for (int dr = -1; dr <= 1; dr++)
            {
                for (int dc = -1; dc <= 1; dc++)
                {
                    var row = center + dr;
                    var col = center + dc;
                    if (IsValidPosition(row, col, boardSize))
                    {
                        moves.Add((row, col));
                    }
                }
            }
            return moves;
        }

        // Find moves near existing pieces
        for (int row = 0; row < boardSize; row++)
        {
            for (int column = 0; column < boardSize; column++)
            {
                if (string.IsNullOrEmpty(board[row * boardSize + column]) && HasAdjacentPiece(board, row, column, boardSize))
                {
                    moves.Add((row, column));
                }
            }
        }

        // If no moves found near pieces, add any empty cell
        if (moves.Count == 0)
        {
            for (int row = 0; row < boardSize; row++)
            {
                for (int column = 0; column < boardSize; column++)
                {
                    if (string.IsNullOrEmpty(board[row * boardSize + column]))
                    {
                        moves.Add((row, column));
                    }
                }
            }
        }

        return moves;
    }

    private bool HasAnyPieces(string[] board)
    {
        return board.Any(cell => !string.IsNullOrEmpty(cell));
    }

    private bool HasAdjacentPiece(string[] board, int row, int column, int boardSize)
    {
        for (int dr = -1; dr <= 1; dr++)
        {
            for (int dc = -1; dc <= 1; dc++)
            {
                if (dr == 0 && dc == 0) continue;
                
                var r = row + dr;
                var c = column + dc;
                if (IsValidPosition(r, c, boardSize) && !string.IsNullOrEmpty(board[r * boardSize + c]))
                {
                    return true;
                }
            }
        }
        return false;
    }

    private int Minimax(string[] board, int depth, bool isMaximizing, int alpha, int beta, PlayerSymbol aiSymbol, int maxDepth, int boardSize)
    {
        if (depth >= maxDepth)
        {
            return EvaluatePosition(board, aiSymbol, boardSize);
        }

        var hash = GetBoardHash(board);
        if (_aiSettings.UseTranspositionTable && _transpositionTable.TryGetValue(hash, out var cachedScore))
        {
            return cachedScore;
        }

        var score = EvaluateBoard(board, aiSymbol, boardSize);
        if (score != 0)
        {
            return score - depth;
        }

        if (isMaximizing)
        {
            var bestScore = int.MinValue;
            var moves = GetOrderedMoves(board, boardSize);

            foreach (var (row, column) in moves)
            {
                board[row * boardSize + column] = aiSymbol.ToString();
                var currentScore = Minimax(board, depth + 1, false, alpha, beta, aiSymbol, maxDepth, boardSize);
                board[row * boardSize + column] = "";

                bestScore = Math.Max(bestScore, currentScore);
                alpha = Math.Max(alpha, bestScore);

                if (beta <= alpha)
                {
                    break;
                }
            }

            if (_aiSettings.UseTranspositionTable)
            {
                _transpositionTable[hash] = bestScore;
            }

            return bestScore;
        }
        else
        {
            var bestScore = int.MaxValue;
            var opponentSymbol = aiSymbol == PlayerSymbol.X ? PlayerSymbol.O : PlayerSymbol.X;
            var moves = GetOrderedMoves(board, boardSize);

            foreach (var (row, column) in moves)
            {
                board[row * boardSize + column] = opponentSymbol.ToString();
                var currentScore = Minimax(board, depth + 1, true, alpha, beta, aiSymbol, maxDepth, boardSize);
                board[row * boardSize + column] = "";

                bestScore = Math.Min(bestScore, currentScore);
                beta = Math.Min(beta, bestScore);

                if (beta <= alpha)
                {
                    break;
                }
            }

            if (_aiSettings.UseTranspositionTable)
            {
                _transpositionTable[hash] = bestScore;
            }

            return bestScore;
        }
    }

    private int EvaluatePosition(string[] board, PlayerSymbol aiSymbol, int boardSize)
    {
        var score = 0;
        var opponentSymbol = aiSymbol == PlayerSymbol.X ? PlayerSymbol.O : PlayerSymbol.X;

        // Check rows
        for (int row = 0; row < boardSize; row++)
        {
            for (int col = 0; col <= boardSize - 5; col++)
            {
                var window = new string[5];
                for (int i = 0; i < 5; i++)
                {
                    window[i] = board[row * boardSize + col + i];
                }
                score += EvaluateWindow(window, aiSymbol, opponentSymbol);
            }
        }

        // Check columns
        for (int col = 0; col < boardSize; col++)
        {
            for (int row = 0; row <= boardSize - 5; row++)
            {
                var window = new string[5];
                for (int i = 0; i < 5; i++)
                {
                    window[i] = board[(row + i) * boardSize + col];
                }
                score += EvaluateWindow(window, aiSymbol, opponentSymbol);
            }
        }

        // Check diagonals (top-left to bottom-right)
        for (int row = 0; row <= boardSize - 5; row++)
        {
            for (int col = 0; col <= boardSize - 5; col++)
            {
                var window = new string[5];
                for (int i = 0; i < 5; i++)
                {
                    window[i] = board[(row + i) * boardSize + col + i];
                }
                score += EvaluateWindow(window, aiSymbol, opponentSymbol);
            }
        }

        // Check diagonals (top-right to bottom-left)
        for (int row = 0; row <= boardSize - 5; row++)
        {
            for (int col = 4; col < boardSize; col++)
            {
                var window = new string[5];
                for (int i = 0; i < 5; i++)
                {
                    window[i] = board[(row + i) * boardSize + col - i];
                }
                score += EvaluateWindow(window, aiSymbol, opponentSymbol);
            }
        }

        return score;
    }

    private int EvaluateBoard(string[] board, PlayerSymbol aiSymbol, int boardSize)
    {
        // Check for win
        if (HasWinningLine(board, aiSymbol.ToString(), boardSize))
        {
            return 10000;
        }

        var opponentSymbol = aiSymbol == PlayerSymbol.X ? PlayerSymbol.O : PlayerSymbol.X;
        if (HasWinningLine(board, opponentSymbol.ToString(), boardSize))
        {
            return -10000;
        }

        // Check for draw
        if (IsBoardFull(board))
        {
            return 0;
        }

        // Evaluate position
        return EvaluatePosition(board, aiSymbol, boardSize);
    }

    private bool HasWinningLine(string[] board, string symbol, int boardSize)
    {
        // Check rows
        for (int row = 0; row < boardSize; row++)
        {
            for (int col = 0; col <= boardSize - 5; col++)
            {
                var count = 0;
                for (int i = 0; i < 5; i++)
                {
                    if (board[row * boardSize + col + i] == symbol)
                    {
                        count++;
                    }
                }
                if (count == 5)
                {
                    return true;
                }
            }
        }

        // Check columns
        for (int col = 0; col < boardSize; col++)
        {
            for (int row = 0; row <= boardSize - 5; row++)
            {
                var count = 0;
                for (int i = 0; i < 5; i++)
                {
                    if (board[(row + i) * boardSize + col] == symbol)
                    {
                        count++;
                    }
                }
                if (count == 5)
                {
                    return true;
                }
            }
        }

        // Check diagonals (top-left to bottom-right)
        for (int row = 0; row <= boardSize - 5; row++)
        {
            for (int col = 0; col <= boardSize - 5; col++)
            {
                var count = 0;
                for (int i = 0; i < 5; i++)
                {
                    if (board[(row + i) * boardSize + col + i] == symbol)
                    {
                        count++;
                    }
                }
                if (count == 5)
                {
                    return true;
                }
            }
        }

        // Check diagonals (top-right to bottom-left)
        for (int row = 0; row <= boardSize - 5; row++)
        {
            for (int col = 4; col < boardSize; col++)
            {
                var count = 0;
                for (int i = 0; i < 5; i++)
                {
                    if (board[(row + i) * boardSize + col - i] == symbol)
                    {
                        count++;
                    }
                }
                if (count == 5)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private bool IsBoardFull(string[] board)
    {
        return !board.Contains("");
    }

    private bool IsValidPosition(int row, int column, int boardSize)
    {
        return row >= 0 && row < boardSize && column >= 0 && column < boardSize;
    }

    private int EvaluateWindow(string[] window, PlayerSymbol aiSymbol, PlayerSymbol opponentSymbol)
    {
        var aiCount = window.Count(cell => cell == aiSymbol.ToString());
        var opponentCount = window.Count(cell => cell == opponentSymbol.ToString());
        var emptyCount = window.Count(cell => string.IsNullOrEmpty(cell));

        // Don't score mixed windows (both players have pieces)
        if (aiCount > 0 && opponentCount > 0)
        {
            return 0;
        }

        if (aiCount == 5)
        {
            return 10000; // Winning
        }
        else if (opponentCount == 5)
        {
            return -10000; // Opponent wins
        }
        else if (aiCount == 4 && emptyCount == 1)
        {
            return 5000; // AI has immediate win threat
        }
        else if (opponentCount == 4 && emptyCount == 1)
        {
            return -8000; // CRITICAL: Opponent has immediate win threat - must block!
        }
        else if (aiCount == 3 && emptyCount == 2)
        {
            return 500; // AI has open three
        }
        else if (opponentCount == 3 && emptyCount == 2)
        {
            return -2000; // IMPORTANT: Opponent has open three - high priority to block
        }
        else if (aiCount == 2 && emptyCount == 3)
        {
            return 50; // AI has open two
        }
        else if (opponentCount == 2 && emptyCount == 3)
        {
            return -100; // Opponent has open two - moderate concern
        }
        else if (aiCount == 1 && emptyCount == 4)
        {
            return 5; // Single piece
        }
        else if (opponentCount == 1 && emptyCount == 4)
        {
            return -10; // Opponent single piece
        }

        return 0;
    }

    private long GetBoardHash(string[] board)
    {
        var hash = 0L;
        for (int i = 0; i < board.Length; i++)
        {
            if (!string.IsNullOrEmpty(board[i]))
            {
                var symbol = board[i] == PlayerSymbol.X.ToString() ? 0 : 1;
                hash ^= _zobristTable[i % _boardSize, i / _boardSize, symbol];
            }
        }
        return hash;
    }
} 