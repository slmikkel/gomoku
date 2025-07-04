using Game.Core.DTOs.Game;
using Game.Core.Entities;

namespace Game.Core.Interfaces;

public interface IGameAIService
{
    /// <summary>
    /// Creates a new game session against the AI
    /// </summary>
    /// <param name="playerId">ID of the human player</param>
    /// <returns>New game session with AI as opponent</returns>
    Task<GameSessionDto> CreateAIGameAsync(Guid playerId);

    /// <summary>
    /// Makes the AI's move in the current game
    /// </summary>
    /// <param name="gameId">ID of the current game</param>
    /// <returns>Updated game session after AI's move</returns>
    Task<GameSessionDto> MakeAIMoveAsync(Guid gameId);
} 