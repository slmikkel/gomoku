using AutoMapper;
using Game.Core.DTOs.Game;
using Game.Core.DTOs.Game.Requests;
using Game.Core.DTOs.Game.Responses;
using Game.Core.DTOs.Player;
using Game.Core.Entities;
using Game.Core.Enums;
using Game.Core.Interfaces;
using Game.Core.Settings;
using Game.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Game.Application.Services;

public class GameService : IGameService
{
    private readonly GameDbContext _dbContext;
    private readonly AISettings _aiSettings;
    private readonly IMapper _mapper;
    private readonly ICurrentUserService _currentUserService;
    private readonly IUserCacheService _userCacheService;

    // Define a constant for the AI user's ID
    private static readonly Guid AI_USER_ID = new Guid("11111111-1111-1111-1111-111111111111");
    // Define a constant for local player 2's ID
    private static readonly Guid LOCAL_PLAYER2_ID = new Guid("22222222-2222-2222-2222-222222222222");

    public GameService(GameDbContext dbContext, AISettings aiSettings, IMapper mapper, ICurrentUserService currentUserService, IUserCacheService userCacheService)
    {
        _dbContext = dbContext;
        _aiSettings = aiSettings;
        _mapper = mapper;
        _currentUserService = currentUserService;
        _userCacheService = userCacheService;
    }

    public async Task<GameSessionDto> CreateGameAsync(Guid playerId, int boardSize = 8, bool isLocalGame = false, string? startingPlayer = null)
    {
        // Determine starting player based on startingPlayer parameter
        Guid? currentPlayerToStart = null;
        if (isLocalGame)
        {
            if (startingPlayer == "O")
            {
                // O starts, which is Player2 (LOCAL_PLAYER2_ID)
                currentPlayerToStart = LOCAL_PLAYER2_ID;
            }
            else
            {
                // Default: X starts, which is Player1 (playerId)
                currentPlayerToStart = playerId;
            }
        }

        var game = new GameSession
        {
            Player1Id = playerId,
            Player2Id = isLocalGame ? LOCAL_PLAYER2_ID : null,
            Status = isLocalGame ? GameStatus.InProgress : GameStatus.WaitingForPlayer,
            CreatedAt = DateTime.UtcNow,
            StartedAt = isLocalGame ? DateTime.UtcNow : null,
            BoardSize = boardSize,
            Board = string.Join(",", Enumerable.Repeat("", boardSize * boardSize)),
            CurrentPlayerId = currentPlayerToStart, // Set current player based on starting player selection
            GameType = GameType.Local,
        };

        // Ensure the local player 2 user exists if this is a local game
        if (isLocalGame)
        {
            var localPlayer2 = await _dbContext.Users.FindAsync(LOCAL_PLAYER2_ID);
            if (localPlayer2 == null)
            {
                localPlayer2 = new User
                {
                    Id = LOCAL_PLAYER2_ID,
                    Username = "Local Player 2",
                    Email = "localplayer2@game.com",
                    PasswordHash = "LOCAL_PLAYER",
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.Users.Add(localPlayer2);
            }
        }

        _dbContext.GameSessions.Add(game);
        await _dbContext.SaveChangesAsync();

        return _mapper.Map<GameSessionDto>(game);
    }

    public async Task<GameSessionDto> CreateAIGameAsync(int boardSize = 8, string? startingPlayer = null)
    {
        var currentUserId = _currentUserService.GetUserId();

        // Ensure the AI user exists in the database
        var aiUser = await _dbContext.Users.FindAsync(AI_USER_ID);
        if (aiUser == null)
        {
            try
            {
                aiUser = new User
                {
                    Id = AI_USER_ID,
                    Username = "AI Player",
                    Email = "ai@game.com",
                    PasswordHash = "AI_PLAYER",
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.Users.Add(aiUser);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception)
            {
                // If we failed to create the AI user, try to fetch it again
                // This handles race conditions where another request might have created it
                aiUser = await _dbContext.Users.FindAsync(AI_USER_ID);
                if (aiUser == null)
                {
                    throw new InvalidOperationException("Failed to create or find AI user");
                }
            }
        }

        // Determine starting player based on startingPlayer parameter
        Console.WriteLine($"=== AI GAME CREATION DEBUG ===");
        Console.WriteLine($"StartingPlayer parameter: '{startingPlayer}'");
        Console.WriteLine($"Player1 (Human): {currentUserId}");
        Console.WriteLine($"Player2 (AI): {AI_USER_ID}");
        
        Guid currentPlayerToStart;
        if (startingPlayer == "O")
        {
            // O starts, which is Player2 (AI_USER_ID)
            currentPlayerToStart = AI_USER_ID;
            Console.WriteLine($"AI (O) will start first");
        }
        else
        {
            // Default: X starts, which is Player1 (currentUserId)
            currentPlayerToStart = currentUserId;
            Console.WriteLine($"Human (X) will start first");
        }
        Console.WriteLine($"CurrentPlayerId set to: {currentPlayerToStart}");
        Console.WriteLine($"=== END DEBUG ===");

        var gameSession = new GameSession
        {
            Player1Id = currentUserId,
            Player2Id = AI_USER_ID,
            Board = string.Join(",", Enumerable.Repeat("", boardSize * boardSize)),
            Status = GameStatus.InProgress,
            CreatedAt = DateTime.UtcNow,
            StartedAt = DateTime.UtcNow,
            BoardSize = boardSize,
            CurrentPlayerId = currentPlayerToStart, // Set current player based on starting player selection
            GameType = GameType.AI,
        };

        _dbContext.GameSessions.Add(gameSession);
        await _dbContext.SaveChangesAsync();

        // If AI is starting player, make the first AI move automatically
        if (currentPlayerToStart == AI_USER_ID)
        {
            Console.WriteLine($"AI is starting player - making initial AI move for game {gameSession.Id}");
            return await MakeAIMoveAsync(gameSession.Id);
        }

        return _mapper.Map<GameSessionDto>(gameSession);
    }

    public async Task<GameSessionDto> GetGameAsync(Guid gameId)
    {
        var game = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .FirstOrDefaultAsync(g => g.Id == gameId);

        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        return _mapper.Map<GameSessionDto>(game);
    }

    public async Task<GameSessionDto> JoinGameAsync(Guid gameId, Guid playerId)
    {
        var game = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .FirstOrDefaultAsync(g => g.Id == gameId);

        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        if (game.Status != GameStatus.WaitingForPlayer)
        {
            throw new InvalidOperationException("Game is not in waiting state");
        }

        if (game.Player1Id == playerId)
        {
            throw new InvalidOperationException("Player is already in the game");
        }

        game.Player2Id = playerId;
        game.Status = GameStatus.InProgress;
        game.StartedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return _mapper.Map<GameSessionDto>(game);
    }

    public async Task<GameSessionDto> MakeMoveAsync(Guid gameId, Guid playerId, int row, int column)
    {
        var game = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .FirstOrDefaultAsync(g => g.Id == gameId);

        // Validate game exists
        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        // Validate game state
        if (game.Status != GameStatus.InProgress)
        {
            throw new InvalidOperationException("Game is not in progress");
        }

        // Validate player's turn
        if (!IsPlayerTurn(game, playerId))
        {
            throw new InvalidOperationException("It's not your turn");
        }

        // Validate move position
        if (!IsValidPosition(row, column))
        {
            throw new InvalidOperationException("Invalid move position");
        }

        // Validate position is empty
        if (!IsPositionEmpty(game.Board, row, column))
        {
            throw new InvalidOperationException("Position is already occupied");
        }

        // Validate move is within board bounds
        if (!IsWithinBoardBounds(row, column, game.BoardSize))
        {
            throw new InvalidOperationException("Move is outside board bounds");
        }

        // For Gomoku, players can place pieces anywhere on the board
        // This adjacency check is not needed for standard Gomoku rules
        // Only validate adjacency if there are existing pieces and we want to enforce it
        var hasExistingPieces = game.Board.Split(',').Any(cell => !string.IsNullOrEmpty(cell));
        if (hasExistingPieces)
        {
            // For now, allow moves anywhere on the board (standard Gomoku rules)
            // Future: Could add a game mode setting to enforce adjacency rules
            // if (!IsMoveNearExistingPiece(game.Board, row, column, game.BoardSize))
            // {
            //     throw new InvalidOperationException("Move must be adjacent to existing pieces");
            // }
        }

        var playerSymbol = GetPlayerSymbol(game, playerId);

        // For local games, determine the correct player ID for move recording
        var movePlayerId = playerId;
        var isLocalGame = game.Player2Id == LOCAL_PLAYER2_ID;
        if (isLocalGame && game.Player1Id == playerId)
        {
            // In local games, record moves with the appropriate player ID based on the symbol
            movePlayerId = playerSymbol == PlayerSymbol.X ? game.Player1Id : LOCAL_PLAYER2_ID;
        }

        var move = new GameMove
        {
            GameId = gameId,
            PlayerId = movePlayerId,
            Row = row,
            Column = column,
            Symbol = playerSymbol,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.GameMoves.Add(move);
        await _dbContext.SaveChangesAsync();

        // Update game board
        var updatedBoardArray = game.Board.Split(',');
        var index = row * game.BoardSize + column;
        updatedBoardArray[index] = move.Symbol.ToString();
        game.Board = string.Join(",", updatedBoardArray);

        // Check for game end
        if (IsWinningMove(game.Board, row, column, move.Symbol, game.BoardSize))
        {
            game.Status = GameStatus.Completed;
            game.WinnerId = playerId;
            game.CompletedAt = DateTime.UtcNow;
        }
        // Check for guaranteed wins (4 in a row with both ends empty) ONLY if opponent has no immediate win
        else if (HasGuaranteedWin(game.Board, game.BoardSize, move.Symbol))
        {
            // Log current board state for debugging
            Console.WriteLine($"=== OPEN FOUR DETECTION DEBUG ===");
            Console.WriteLine($"Current board state:");
            var debugBoard = game.Board.Split(',');
            for (int r = 0; r < game.BoardSize; r++)
            {
                var rowStr = "";
                for (int c = 0; c < game.BoardSize; c++)
                {
                    var cell = debugBoard[r * game.BoardSize + c];
                    rowStr += (string.IsNullOrEmpty(cell) ? "." : cell) + " ";
                }
                Console.WriteLine($"Row {r}: {rowStr}");
            }
            Console.WriteLine($"=== END BOARD STATE ===");
            
            // Before declaring guaranteed win, check if opponent can win on their next turn
            var opponentHasThreat = OpponentHasImmediateWinThreat(game.Board, game.BoardSize, move.Symbol);
            
            // Log for debugging
            Console.WriteLine($"Player {move.Symbol} has guaranteed win (open four)");
            Console.WriteLine($"Opponent has immediate win threat: {opponentHasThreat}");
            
            if (!opponentHasThreat)
            {
                Console.WriteLine($"Declaring {move.Symbol} as winner due to open four with no opponent threat");
                game.Status = GameStatus.Completed;
                game.WinnerId = playerId;
                game.CompletedAt = DateTime.UtcNow;
            }
            else
            {
                Console.WriteLine($"Game continues - opponent has counter-threat despite {move.Symbol}'s open four");
            }
        }
        // Check for draw conditions
        else if (IsBoardFull(game.Board) || IsDrawCondition(game.Board, game.BoardSize))
        {
            game.Status = GameStatus.Draw;
            game.CompletedAt = DateTime.UtcNow;
        }

        // Update current player for next turn
        game.CurrentPlayerId = GetCurrentPlayerId(game);

        await _dbContext.SaveChangesAsync();
        
        // Debug logging for game completion
        if (game.Status == GameStatus.Completed)
        {
            Console.WriteLine($"=== GAME COMPLETED ===");
            Console.WriteLine($"Status: {game.Status}");
            Console.WriteLine($"Winner ID: {game.WinnerId}");
            Console.WriteLine($"Player1 ID: {game.Player1Id}");
            Console.WriteLine($"Player2 ID: {game.Player2Id}");
            Console.WriteLine($"AI_USER_ID: {AI_USER_ID}");
            Console.WriteLine($"=== END GAME STATE ===");
        }
        
        return _mapper.Map<GameSessionDto>(game);
    }

    public async Task<GameSessionDto> MakeAIMoveAsync(Guid gameId)
    {
        var game = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .FirstOrDefaultAsync(g => g.Id == gameId);

        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        if (game.Status != GameStatus.InProgress)
        {
            throw new InvalidOperationException("Game is not in progress");
        }

        if (!IsPlayerTurn(game, AI_USER_ID))
        {
            throw new InvalidOperationException("It's not AI's turn");
        }

        var aiSymbol = GetPlayerSymbol(game, AI_USER_ID);
        
        // Create AI instance with the correct board size for this game
        var gameAI = new GameAI(game.BoardSize, _aiSettings);
        var (row, column) = gameAI.CalculateBestMove(game.Board, aiSymbol);

        await MakeMoveAsync(gameId, AI_USER_ID, row, column);
        return _mapper.Map<GameSessionDto>(game);
    }

    public async Task<IEnumerable<GameSessionDto>> GetPlayerGamesAsync(Guid playerId)
    {
        var games = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .Where(g => g.Player1Id == playerId || g.Player2Id == playerId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<GameSessionDto>>(games);
    }

    public async Task<IEnumerable<GameHistoryDto>> GetPlayerGameHistoryAsync(Guid playerId)
    {
        var games = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .Where(g => g.Player1Id == playerId || g.Player2Id == playerId || g.Player3Id == playerId)
            .OrderByDescending(g => g.CreatedAt)
            .ToListAsync();

        var result = new List<GameHistoryDto>();

        // Collect all unique user IDs from the games
        var userIds = new HashSet<Guid>();
        foreach (var game in games)
        {
            userIds.Add(game.Player1Id);
            if (game.Player2Id.HasValue) userIds.Add(game.Player2Id.Value);
            if (game.Player3Id.HasValue) userIds.Add(game.Player3Id.Value);
        }

        // Get all user information with caching
        var usersInfo = await _userCacheService.GetUsersInfoAsync(userIds);

        // Map games to GameHistoryDto with user information
        foreach (var game in games)
        {
            var gameHistory = _mapper.Map<GameHistoryDto>(game);
            
            // Set user information
            usersInfo.TryGetValue(game.Player1Id, out var player1Info);
            gameHistory.Player1Info = player1Info ?? new PlayerInfoDto { Id = game.Player1Id, Username = "Unknown User" };

            if (game.Player2Id.HasValue)
            {
                usersInfo.TryGetValue(game.Player2Id.Value, out var player2Info);
                gameHistory.Player2Info = player2Info;
            }

            if (game.Player3Id.HasValue)
            {
                usersInfo.TryGetValue(game.Player3Id.Value, out var player3Info);
                gameHistory.Player3Info = player3Info;
            }

            // Determine game type and additional info
            gameHistory.GameType = DetermineGameType(game);
            gameHistory.PlayerCount = GetPlayerCount(game);
            gameHistory.AIDifficulty = GetAIDifficulty(game);

            result.Add(gameHistory);
        }

        return result;
    }

    private static GameType DetermineGameType(GameSession game)
    {
        if (game.Player2Id == LOCAL_PLAYER2_ID) return GameType.Local;
        if (game.Player2Id == AI_USER_ID) return GameType.AI;
        return GameType.Network;
    }

    private static int GetPlayerCount(GameSession game)
    {
        if (game.Player3Id.HasValue) return 3;
        return 2;
    }

    private static string? GetAIDifficulty(GameSession game)
    {
        // If it's not an AI game, return null
        if (game.Player2Id != AI_USER_ID) return null;

        // For now, we'll analyze the game to estimate difficulty
        // This could be enhanced by storing difficulty in the database
        return EstimateAIDifficulty(game);
    }

    private static string EstimateAIDifficulty(GameSession game)
    {
        // Basic heuristic based on game characteristics
        // In a real implementation, you'd store the actual difficulty used
        
        var moveCount = game.Moves?.Count ?? 0;
        var boardSize = game.BoardSize;
        
        // Larger boards and longer games might indicate higher difficulty
        if (boardSize >= 15 && moveCount > 30)
        {
            return "Hard";
        }
        else if (boardSize >= 10 && moveCount > 15)
        {
            return "Medium";
        }
        else
        {
            return "Easy";
        }
    }

    private bool IsPlayerTurn(GameSession game, Guid playerId)
    {
        // Check if this is a local game (Player2 is the special local player ID)
        var isLocalGame = game.Player2Id == LOCAL_PLAYER2_ID;
        
        var lastMove = game.Moves.LastOrDefault();
        if (lastMove == null)
        {
            // First move - use CurrentPlayerId to determine who starts (supports random starting player)
            return game.CurrentPlayerId == playerId;
        }

        // For local games, allow the real user to control both players
        if (isLocalGame)
        {
            // In local games, the real user (Player1Id) can make moves for both sides
            // We just need to ensure moves alternate between the two players
            return game.Player1Id == playerId;
        }

        // For 3-player games, determine turn based on move count and rotation
        if (game.Player3Id.HasValue)
        {
            var moveCount = game.Moves.Count;
            var currentPlayerIndex = moveCount % 3;
            
            return currentPlayerIndex switch
            {
                0 => game.Player1Id == playerId,
                1 => game.Player2Id == playerId,
                2 => game.Player3Id == playerId,
                _ => false
            };
        }

        // For 2-player games, use alternating logic
        return lastMove.PlayerId != playerId;
    }

    private Guid? GetCurrentPlayerId(GameSession game)
    {
        if (game.Status != GameStatus.InProgress)
        {
            return null;
        }

        var lastMove = game.Moves.LastOrDefault();
        if (lastMove == null)
        {
            // First move - use CurrentPlayerId to determine who starts (supports random starting player)
            return game.CurrentPlayerId ?? game.Player1Id;
        }

        // Check if this is a local game
        var isLocalGame = game.Player2Id == LOCAL_PLAYER2_ID;
        if (isLocalGame)
        {
            // In local games, alternate between Player1 and LOCAL_PLAYER2_ID for turn tracking
            // but the real user (Player1) can make moves for both
            var moveCount = game.Moves.Count;
            
            // Determine who started the game (CurrentPlayerId should be set for the first player)
            var startingPlayer = game.CurrentPlayerId ?? game.Player1Id;
            
            // If Player1 started, then even moves = Player1, odd moves = LOCAL_PLAYER2_ID
            // If LOCAL_PLAYER2_ID started, then even moves = LOCAL_PLAYER2_ID, odd moves = Player1
            if (startingPlayer == game.Player1Id)
            {
                return moveCount % 2 == 0 ? game.Player1Id : LOCAL_PLAYER2_ID;
            }
            else
            {
                return moveCount % 2 == 0 ? LOCAL_PLAYER2_ID : game.Player1Id;
            }
        }

        // For 3-player games, determine turn based on move count and rotation
        if (game.Player3Id.HasValue)
        {
            var moveCount = game.Moves.Count;
            var currentPlayerIndex = moveCount % 3;
            
            return currentPlayerIndex switch
            {
                0 => game.Player1Id,
                1 => game.Player2Id,
                2 => game.Player3Id,
                _ => game.Player1Id
            };
        }

        // For 2-player games (including AI), use alternating logic
        return lastMove.PlayerId == game.Player1Id ? game.Player2Id : game.Player1Id;
    }

    private PlayerSymbol GetPlayerSymbol(GameSession game, Guid playerId)
    {
        // Check if this is a local game
        var isLocalGame = game.Player2Id == LOCAL_PLAYER2_ID;
        
        if (isLocalGame && game.Player1Id == playerId)
        {
            // In local games, determine symbol based on whose turn it is
            var moveCount = game.Moves.Count;
            // Even moves (0, 2, 4...) = Player1 (X), Odd moves (1, 3, 5...) = Player2 (O)
            return moveCount % 2 == 0 ? PlayerSymbol.X : PlayerSymbol.O;
        }
        
        // Standard logic for non-local games
        if (game.Player1Id == playerId) return PlayerSymbol.X;
        if (game.Player2Id == playerId) return PlayerSymbol.O;
        if (game.Player3Id == playerId) return PlayerSymbol.Triangle;
        
        throw new InvalidOperationException("Player is not in this game");
    }

    private bool IsWinningMove(string board, int row, int column, PlayerSymbol symbol, int boardSize)
    {
        var boardArray = board.Split(',');
        var directions = new[] { (1, 0), (0, 1), (1, 1), (1, -1) }; // horizontal, vertical, diagonal

        foreach (var (dx, dy) in directions)
        {
            var count = 1; // Count the current move

            // Check in one direction
            for (var i = 1; i < 5; i++)
            {
                var newRow = row + dx * i;
                var newCol = column + dy * i;
                if (!IsWithinBoardBounds(newRow, newCol, boardSize))
                    break;
                var index = newRow * boardSize + newCol;
                if (boardArray[index] != symbol.ToString())
                    break;
                count++;
            }

            // Check in opposite direction
            for (var i = 1; i < 5; i++)
            {
                var newRow = row - dx * i;
                var newCol = column - dy * i;
                if (!IsWithinBoardBounds(newRow, newCol, boardSize))
                    break;
                var index = newRow * boardSize + newCol;
                if (boardArray[index] != symbol.ToString())
                    break;
                count++;
            }

            if (count >= 5)
                return true;
        }

        return false;
    }

    private bool IsValidPosition(int row, int column)
    {
        return row >= 0 && column >= 0;
    }

    private bool IsPositionEmpty(string board, int row, int column)
    {
        var boardArray = board.Split(',');
        var boardSize = (int)Math.Sqrt(boardArray.Length);
        var index = row * boardSize + column;
        return string.IsNullOrEmpty(boardArray[index]);
    }

    private bool IsWithinBoardBounds(int row, int column, int boardSize)
    {
        return row >= 0 && row < boardSize && column >= 0 && column < boardSize;
    }

    private bool IsMoveNearExistingPiece(string board, int row, int column, int boardSize)
    {
        var boardArray = board.Split(',');
        var directions = new[] { (-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1) };

        foreach (var (dx, dy) in directions)
        {
            var newRow = row + dx;
            var newCol = column + dy;

            if (IsWithinBoardBounds(newRow, newCol, boardSize))
            {
                var index = newRow * boardSize + newCol;
                if (!string.IsNullOrEmpty(boardArray[index]))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private bool IsBoardFull(string board)
    {
        return !board.Split(',').Contains("");
    }

    /// <summary>
    /// Checks if a player has a guaranteed win (4 in a row with both ends empty)
    /// </summary>
    private bool HasGuaranteedWin(string board, int boardSize, PlayerSymbol playerSymbol)
    {
        var boardArray = board.Split(',');
        var symbol = playerSymbol.ToString();
        
        Console.WriteLine($"Checking for guaranteed win (open four) for player {playerSymbol}");
        
        // Check all directions: horizontal, vertical, diagonal
        var directions = new[] { (0, 1), (1, 0), (1, 1), (1, -1) };
        
        foreach (var (dx, dy) in directions)
        {
            for (int row = 0; row < boardSize; row++)
            {
                for (int col = 0; col < boardSize; col++)
                {
                    if (HasFourInRowWithBothEndsEmpty(boardArray, boardSize, row, col, dx, dy, symbol))
                    {
                        Console.WriteLine($"Found guaranteed win (open four) for {playerSymbol} at ({row},{col}) direction ({dx},{dy})");
                        return true;
                    }
                }
            }
        }
        
        Console.WriteLine($"No guaranteed win found for {playerSymbol}");
        return false;
    }

    /// <summary>
    /// Checks if there are 4 consecutive pieces with both ends empty in a specific direction
    /// </summary>
    private bool HasFourInRowWithBothEndsEmpty(string[] boardArray, int boardSize, int startRow, int startCol, int dx, int dy, string symbol)
    {
        // Check if we can fit a sequence of 6 (empty + 4 pieces + empty)
        if (!IsWithinBoardBounds(startRow + 5 * dx, startCol + 5 * dy, boardSize))
        {
            return false;
        }
        
        // Check pattern: empty, symbol, symbol, symbol, symbol, empty
        var positions = new List<(int row, int col)>();
        for (int i = 0; i < 6; i++)
        {
            positions.Add((startRow + i * dx, startCol + i * dy));
        }
        
        // First and last must be empty
        var firstIndex = positions[0].row * boardSize + positions[0].col;
        var lastIndex = positions[5].row * boardSize + positions[5].col;
        
        if (!string.IsNullOrEmpty(boardArray[firstIndex]) || !string.IsNullOrEmpty(boardArray[lastIndex]))
        {
            return false;
        }
        
        // Middle 4 must be the player's symbol
        for (int i = 1; i <= 4; i++)
        {
            var index = positions[i].row * boardSize + positions[i].col;
            if (boardArray[index] != symbol)
            {
                return false;
            }
        }
        
        return true;
    }

    /// <summary>
    /// Checks if the opponent has an immediate winning threat (4 in a row that can become 5)
    /// </summary>
    private bool OpponentHasImmediateWinThreat(string board, int boardSize, PlayerSymbol currentPlayerSymbol)
    {
        // Get opponent's symbol
        var opponentSymbol = currentPlayerSymbol == PlayerSymbol.X ? PlayerSymbol.O : 
                           currentPlayerSymbol == PlayerSymbol.O ? PlayerSymbol.X : PlayerSymbol.Triangle;
        
        var boardArray = board.Split(',');
        var symbol = opponentSymbol.ToString();
        
        Console.WriteLine($"Checking for opponent ({opponentSymbol}) immediate win threats against current player ({currentPlayerSymbol})");
        
        // Check all directions: horizontal, vertical, diagonal
        var directions = new[] { (0, 1), (1, 0), (1, 1), (1, -1) };
        
        foreach (var (dx, dy) in directions)
        {
            for (int row = 0; row < boardSize; row++)
            {
                for (int col = 0; col < boardSize; col++)
                {
                    // Check if opponent has 4 in a row with at least one empty end
                    if (HasFourInRowWithEmptyEnd(boardArray, boardSize, row, col, dx, dy, symbol))
                    {
                        Console.WriteLine($"Found opponent threat at ({row},{col}) direction ({dx},{dy}) for symbol {symbol}");
                        return true;
                    }
                }
            }
        }
        
        Console.WriteLine("No opponent immediate win threats found");
        return false;
    }

    /// <summary>
    /// Checks if there are 4 consecutive pieces with at least one empty end (immediate win threat)
    /// </summary>
    private bool HasFourInRowWithEmptyEnd(string[] boardArray, int boardSize, int startRow, int startCol, int dx, int dy, string symbol)
    {
        // Check if we can fit a sequence of 4 pieces
        if (!IsWithinBoardBounds(startRow + 3 * dx, startCol + 3 * dy, boardSize))
        {
            return false;
        }
        
        // Check if all 4 positions have the player's symbol
        for (int i = 0; i < 4; i++)
        {
            var row = startRow + i * dx;
            var col = startCol + i * dy;
            var index = row * boardSize + col;
            
            if (boardArray[index] != symbol)
            {
                return false;
            }
        }
        
        // Check if either end is empty (can extend to 5)
        bool hasEmptyStart = false;
        bool hasEmptyEnd = false;
        
        // Check before the 4 pieces
        var beforeRow = startRow - dx;
        var beforeCol = startCol - dy;
        if (IsWithinBoardBounds(beforeRow, beforeCol, boardSize))
        {
            var beforeIndex = beforeRow * boardSize + beforeCol;
            hasEmptyStart = string.IsNullOrEmpty(boardArray[beforeIndex]);
        }
        
        // Check after the 4 pieces
        var afterRow = startRow + 3 * dx + dx;
        var afterCol = startCol + 3 * dy + dy;
        if (IsWithinBoardBounds(afterRow, afterCol, boardSize))
        {
            var afterIndex = afterRow * boardSize + afterCol;
            hasEmptyEnd = string.IsNullOrEmpty(boardArray[afterIndex]);
        }
        
        var hasThreat = hasEmptyStart || hasEmptyEnd;
        if (hasThreat)
        {
            Console.WriteLine($"Found 4-in-row threat for {symbol} at ({startRow},{startCol}) direction ({dx},{dy})");
            Console.WriteLine($"  Empty start: {hasEmptyStart}, Empty end: {hasEmptyEnd}");
            Console.WriteLine($"  Sequence: ({startRow},{startCol}) to ({startRow + 3*dx},{startCol + 3*dy})");
        }
        
        return hasThreat;
    }

    /// <summary>
    /// Checks for advanced draw conditions beyond just a full board
    /// </summary>
    private bool IsDrawCondition(string board, int boardSize)
    {
        var boardArray = board.Split(',');
        var emptyPositions = new List<(int row, int col)>();
        
        // Find all empty positions
        for (int row = 0; row < boardSize; row++)
        {
            for (int col = 0; col < boardSize; col++)
            {
                var index = row * boardSize + col;
                if (string.IsNullOrEmpty(boardArray[index]))
                {
                    emptyPositions.Add((row, col));
                }
            }
        }
        
        // If too few empty positions, it might be a draw
        if (emptyPositions.Count < 10) // Threshold for potential draw analysis
        {
            return IsImpossibleToWin(boardArray, boardSize, emptyPositions);
        }
        
        return false;
    }

    /// <summary>
    /// Determines if it's impossible for either player to win given the current board state
    /// </summary>
    private bool IsImpossibleToWin(string[] boardArray, int boardSize, List<(int row, int col)> emptyPositions)
    {
        // Check if either player can still create a winning line
        var playerSymbols = new[] { PlayerSymbol.X, PlayerSymbol.O };
        
        foreach (var playerSymbol in playerSymbols)
        {
            if (CanPlayerWin(boardArray, boardSize, emptyPositions, playerSymbol.ToString()))
            {
                return false; // At least one player can still win
            }
        }
        
        return true; // Neither player can win - it's a draw
    }

    /// <summary>
    /// Checks if a specific player can still achieve 5 in a row given the current board state
    /// </summary>
    private bool CanPlayerWin(string[] boardArray, int boardSize, List<(int row, int col)> emptyPositions, string symbol)
    {
        var directions = new[] { (0, 1), (1, 0), (1, 1), (1, -1) };
        
        foreach (var (dx, dy) in directions)
        {
            for (int row = 0; row < boardSize; row++)
            {
                for (int col = 0; col < boardSize; col++)
                {
                    if (CanCreateWinningLine(boardArray, boardSize, row, col, dx, dy, symbol, emptyPositions))
                    {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /// <summary>
    /// Checks if a winning line of 5 can be created starting from a position in a direction
    /// </summary>
    private bool CanCreateWinningLine(string[] boardArray, int boardSize, int startRow, int startCol, int dx, int dy, string symbol, List<(int row, int col)> emptyPositions)
    {
        // Check if we can fit 5 consecutive positions
        if (!IsWithinBoardBounds(startRow + 4 * dx, startCol + 4 * dy, boardSize))
        {
            return false;
        }
        
        var requiredEmptyPositions = new List<(int row, int col)>();
        var conflictingPieces = 0;
        
        for (int i = 0; i < 5; i++)
        {
            var row = startRow + i * dx;
            var col = startCol + i * dy;
            var index = row * boardSize + col;
            var cellValue = boardArray[index];
            
            if (string.IsNullOrEmpty(cellValue))
            {
                requiredEmptyPositions.Add((row, col));
            }
            else if (cellValue != symbol)
            {
                conflictingPieces++;
            }
        }
        
        // If there are conflicting pieces (opponent pieces), this line is blocked
        if (conflictingPieces > 0)
        {
            return false;
        }
        
        // Check if all required empty positions are available
        foreach (var requiredPos in requiredEmptyPositions)
        {
            if (!emptyPositions.Contains(requiredPos))
            {
                return false;
            }
        }
        
        return true;
    }

    public async Task<PurgeResultDto> PurgeIncompleteGamesAsync(Guid playerId)
    {
        var incompleteGames = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .Where(g => (g.Player1Id == playerId || g.Player2Id == playerId || g.Player3Id == playerId) &&
                       g.Moves.Count == 0 &&
                       g.Status != GameStatus.InProgress &&
                       g.Status != GameStatus.WaitingForPlayer)
            .ToListAsync();

        _dbContext.GameSessions.RemoveRange(incompleteGames);
        await _dbContext.SaveChangesAsync();

        return new PurgeResultDto
        {
            DeletedCount = incompleteGames.Count,
            DeletedGameIds = incompleteGames.Select(g => g.Id.ToString()).ToList(),
            Message = $"Purged {incompleteGames.Count} incomplete games"
        };
    }

    public async Task<ClearResultDto> ClearAllGamesAsync(Guid playerId)
    {
        var playerGames = await _dbContext.GameSessions
            .Where(g => g.Player1Id == playerId || g.Player2Id == playerId || g.Player3Id == playerId)
            .Where(g => g.Status != GameStatus.InProgress && g.Status != GameStatus.WaitingForPlayer)
            .ToListAsync();

        _dbContext.GameSessions.RemoveRange(playerGames);
        await _dbContext.SaveChangesAsync();

        return new ClearResultDto
        {
            DeletedCount = playerGames.Count,
            Message = $"Cleared {playerGames.Count} games from history"
        };
    }

    public async Task<PurgePreviewDto> GetPurgePreviewAsync(Guid playerId)
    {
        var allGames = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .Where(g => g.Player1Id == playerId || g.Player2Id == playerId || g.Player3Id == playerId)
            .ToListAsync();

        var incompleteGames = allGames
            .Where(g => g.Moves.Count == 0 && 
                       g.Status != GameStatus.InProgress && 
                       g.Status != GameStatus.WaitingForPlayer)
            .ToList();

        return new PurgePreviewDto
        {
            IncompleteGamesCount = incompleteGames.Count,
            TotalGamesCount = allGames.Count,
            IncompleteGames = incompleteGames.Select(g => new GamePreviewDto
            {
                Id = g.Id,
                CreatedAt = g.CreatedAt,
                GameType = DetermineGameType(g).ToString(),
                BoardSize = g.BoardSize,
                MoveCount = g.Moves.Count
            }).ToList()
        };
    }

    private async Task<GameSessionDto> GetGameSessionDtoAsync(Guid gameId)
    {
        var game = await _dbContext.GameSessions
            .Include(g => g.Moves)
            .FirstOrDefaultAsync(g => g.Id == gameId);

        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        return _mapper.Map<GameSessionDto>(game);
    }
} 