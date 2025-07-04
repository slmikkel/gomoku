using Game.Core.DTOs.Game;
using Game.Core.DTOs.Game.Responses;
using Game.Core.Entities;

namespace Game.Core.Interfaces;

public interface IGameService
{
    Task<GameSessionDto> CreateGameAsync(Guid playerId, int boardSize = 8, bool isLocalGame = false, string? startingPlayer = null);
    Task<GameSessionDto> JoinGameAsync(Guid gameId, Guid playerId);
    Task<GameSessionDto> MakeMoveAsync(Guid gameId, Guid playerId, int row, int column);
    Task<GameSessionDto> GetGameAsync(Guid gameId);
    Task<IEnumerable<GameSessionDto>> GetPlayerGamesAsync(Guid playerId);
    Task<IEnumerable<GameHistoryDto>> GetPlayerGameHistoryAsync(Guid playerId);
    
    // Game management methods
    Task<PurgeResultDto> PurgeIncompleteGamesAsync(Guid playerId);
    Task<ClearResultDto> ClearAllGamesAsync(Guid playerId);
    Task<PurgePreviewDto> GetPurgePreviewAsync(Guid playerId);
    
    // AI-specific methods
    Task<GameSessionDto> CreateAIGameAsync(int boardSize = 8, string? startingPlayer = null);
    Task<GameSessionDto> MakeAIMoveAsync(Guid gameId);
} 