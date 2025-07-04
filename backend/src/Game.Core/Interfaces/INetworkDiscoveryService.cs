using Game.Core.DTOs.Network;

namespace Game.Core.Interfaces;

public interface INetworkDiscoveryService
{
    Task StartBroadcastingAsync(NetworkGameBroadcastDto gameInfo);
    Task StopBroadcastingAsync(Guid gameId);
    Task<List<NetworkGameBroadcastDto>> ScanForGamesAsync(TimeSpan timeout);
    Task UpdateGameInfoAsync(NetworkGameBroadcastDto gameInfo);
    bool IsBroadcasting(Guid gameId);
    Task CleanupAsync();
}