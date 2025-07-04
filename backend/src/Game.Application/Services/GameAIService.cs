using Game.Core.DTOs.Game;
using Game.Core.Entities;
using Game.Core.Interfaces;
using Game.Infrastructure.Data;

namespace Game.Application.Services;

public class GameAIService : IGameAIService
{
    private readonly GameDbContext _context;
    private readonly IGameService _gameService;
    private readonly IGameAI _gameAI;

    public GameAIService(GameDbContext context, IGameService gameService, IGameAI gameAI)
    {
        _context = context;
        _gameService = gameService;
        _gameAI = gameAI;
    }

    /// <summary>
    /// Creates a new game session against the AI
    /// </summary>
    public async Task<GameSessionDto> CreateAIGameAsync(Guid playerId)
    {
        // Create a new game with AI as player 2
        return await _gameService.CreateAIGameAsync(8);
    }

    /// <summary>
    /// Makes the AI's move in the current game
    /// </summary>
    public Task<GameSessionDto> MakeAIMoveAsync(Guid gameId)
    {
        // TODO: Implement AI move
        // 1. Get current game state
        // 2. Calculate best move using AI
        // 3. Apply move to game
        // 4. Update game state
        // 5. Return updated game
        throw new NotImplementedException();
    }
} 