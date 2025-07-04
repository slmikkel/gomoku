using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using Game.Core.DTOs.Network;
using Game.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Game.Application.Services;

public class NetworkDiscoveryService : INetworkDiscoveryService, IDisposable
{
    private readonly ILogger<NetworkDiscoveryService> _logger;
    private readonly Dictionary<Guid, BroadcastInfo> _activeBroadcasts = new();
    private readonly Dictionary<Guid, Timer> _broadcastTimers = new();
    private readonly object _lock = new();
    private bool _disposed = false;

    public NetworkDiscoveryService(ILogger<NetworkDiscoveryService> logger)
    {
        _logger = logger;
    }

    public Task StartBroadcastingAsync(NetworkGameBroadcastDto gameInfo)
    {
        lock (_lock)
        {
            if (_activeBroadcasts.ContainsKey(gameInfo.GameId))
            {
                _logger.LogWarning("Game {GameId} is already broadcasting", gameInfo.GameId);
                return Task.CompletedTask;
            }

            var broadcastInfo = new BroadcastInfo
            {
                GameInfo = gameInfo,
                UdpClient = new UdpClient(),
                BroadcastEndPoint = new IPEndPoint(IPAddress.Broadcast, 7777)
            };

            broadcastInfo.UdpClient.EnableBroadcast = true;
            _activeBroadcasts[gameInfo.GameId] = broadcastInfo;

            // Start periodic broadcasting
            var timer = new Timer(BroadcastGame, gameInfo.GameId, TimeSpan.Zero, TimeSpan.FromSeconds(5));
            _broadcastTimers[gameInfo.GameId] = timer;
        }

        _logger.LogInformation("Started broadcasting for game {GameId} - {GameName}", gameInfo.GameId, gameInfo.GameName);
        return Task.CompletedTask;
    }

    public Task StopBroadcastingAsync(Guid gameId)
    {
        lock (_lock)
        {
            if (_broadcastTimers.TryGetValue(gameId, out var timer))
            {
                timer.Dispose();
                _broadcastTimers.Remove(gameId);
            }

            if (_activeBroadcasts.TryGetValue(gameId, out var broadcastInfo))
            {
                broadcastInfo.UdpClient.Dispose();
                _activeBroadcasts.Remove(gameId);
            }
        }

        _logger.LogInformation("Stopped broadcasting for game {GameId}", gameId);
        return Task.CompletedTask;
    }

    public async Task<List<NetworkGameBroadcastDto>> ScanForGamesAsync(TimeSpan timeout)
    {
        var discoveredGames = new List<NetworkGameBroadcastDto>();
        var endTime = DateTime.UtcNow.Add(timeout);

        try
        {
            // Create a UDP client for receiving broadcasts on port 7777
            using var client = new UdpClient();
            client.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            client.Client.Bind(new IPEndPoint(IPAddress.Any, 7777));
            client.Client.ReceiveTimeout = (int)timeout.TotalMilliseconds;

            _logger.LogDebug("Scanning for network games for {Timeout}ms", timeout.TotalMilliseconds);

            while (DateTime.UtcNow < endTime)
            {
                try
                {
                    var remainingTime = endTime - DateTime.UtcNow;
                    if (remainingTime.TotalMilliseconds <= 0) break;

                    client.Client.ReceiveTimeout = Math.Max(100, (int)remainingTime.TotalMilliseconds);
                    
                    var result = await client.ReceiveAsync();
                    var json = Encoding.UTF8.GetString(result.Buffer);
                    
                    var gameInfo = JsonSerializer.Deserialize<NetworkGameBroadcastDto>(json);
                    if (gameInfo != null)
                    {
                        // Avoid duplicates
                        if (!discoveredGames.Any(g => g.GameId == gameInfo.GameId))
                        {
                            discoveredGames.Add(gameInfo);
                            _logger.LogDebug("Discovered game: {GameName} from {IP}", gameInfo.GameName, result.RemoteEndPoint);
                        }
                    }
                }
                catch (SocketException ex) when (ex.SocketErrorCode == SocketError.TimedOut)
                {
                    // Timeout is expected, continue scanning
                    continue;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error during network scan");
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to scan for network games");
        }

        _logger.LogInformation("Network scan completed. Found {Count} games", discoveredGames.Count);
        return discoveredGames;
    }

    public Task UpdateGameInfoAsync(NetworkGameBroadcastDto gameInfo)
    {
        lock (_lock)
        {
            if (_activeBroadcasts.TryGetValue(gameInfo.GameId, out var broadcastInfo))
            {
                broadcastInfo.GameInfo = gameInfo;
                _logger.LogDebug("Updated broadcast info for game {GameId}", gameInfo.GameId);
            }
        }
        return Task.CompletedTask;
    }

    public bool IsBroadcasting(Guid gameId)
    {
        lock (_lock)
        {
            return _activeBroadcasts.ContainsKey(gameId);
        }
    }

    public Task CleanupAsync()
    {
        lock (_lock)
        {
            foreach (var timer in _broadcastTimers.Values)
            {
                timer.Dispose();
            }
            _broadcastTimers.Clear();

            foreach (var broadcastInfo in _activeBroadcasts.Values)
            {
                broadcastInfo.UdpClient.Dispose();
            }
            _activeBroadcasts.Clear();
        }

        _logger.LogInformation("Network discovery service cleaned up");
        return Task.CompletedTask;
    }

    private void BroadcastGame(object? state)
    {
        if (state is not Guid gameId) return;

        try
        {
            BroadcastInfo? broadcastInfo;
            lock (_lock)
            {
                if (!_activeBroadcasts.TryGetValue(gameId, out broadcastInfo))
                    return;
            }

            var json = JsonSerializer.Serialize(broadcastInfo.GameInfo);
            var data = Encoding.UTF8.GetBytes(json);

            broadcastInfo.UdpClient.SendAsync(data, data.Length, broadcastInfo.BroadcastEndPoint);
            
            _logger.LogTrace("Broadcast sent for game {GameId}", gameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast game {GameId}", gameId);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        CleanupAsync().Wait();
        _disposed = true;
    }

    private class BroadcastInfo
    {
        public NetworkGameBroadcastDto GameInfo { get; set; } = null!;
        public UdpClient UdpClient { get; set; } = null!;
        public IPEndPoint BroadcastEndPoint { get; set; } = null!;
    }
}