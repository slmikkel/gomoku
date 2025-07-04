using Game.Core.DTOs.Network;
using Game.Core.Entities;

namespace Game.Core.Interfaces;

public interface INetworkGameService
{
    Task<NetworkGameDto> CreateNetworkGameAsync(CreateNetworkGameDto createDto, Guid hostUserId, string hostIpAddress);
    Task<NetworkGameDto> JoinNetworkGameAsync(JoinNetworkGameDto joinDto, Guid userId);
    Task<NetworkGameDto> LeaveNetworkGameAsync(Guid networkGameId, Guid userId);
    Task<NetworkGameDto?> GetNetworkGameAsync(Guid networkGameId);
    Task<List<NetworkGameDto>> GetActiveNetworkGamesAsync();
    Task<NetworkGameDto> StartNetworkGameAsync(Guid networkGameId, Guid hostUserId);
    Task CancelNetworkGameAsync(Guid networkGameId, Guid hostUserId);
    Task UpdatePlayerConnectionAsync(Guid networkGameId, Guid userId, bool isConnected);
    Task CleanupExpiredGamesAsync();
    Task<bool> IsPlayerInGameAsync(Guid userId);
    Task<NetworkGame?> GetNetworkGameByIdAsync(Guid networkGameId);
    Task LeaveCurrentGameAsync(Guid userId);
    Task<NetworkGameDto> UpdatePlayerIconAsync(UpdatePlayerIconDto updateDto, Guid userId);
}