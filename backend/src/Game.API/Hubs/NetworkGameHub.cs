using Game.Core.DTOs.Network;
using Game.Core.DTOs.Game.Responses;
using Game.Core.Interfaces;
using Game.Core.Enums;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Game.Infrastructure.Data;

namespace Game.API.Hubs;

public class NetworkGameHub : Hub<INetworkGameHubClient>
{
    private readonly ILogger<NetworkGameHub> _logger;
    private readonly INetworkGameService _networkGameService;
    private readonly IGameService _gameService;
    private readonly GameDbContext _context;
    private static readonly Dictionary<Guid, HashSet<string>> _networkGameConnections = new();
    private static readonly Dictionary<string, Guid> _userConnections = new();

    public NetworkGameHub(
        ILogger<NetworkGameHub> logger, 
        INetworkGameService networkGameService,
        IGameService gameService,
        GameDbContext context)
    {
        _logger = logger;
        _networkGameService = networkGameService;
        _gameService = gameService;
        _context = context;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserIdFromToken();
        
        // Clean up any existing connections for this user
        var existingConnections = _userConnections.Where(kv => kv.Value == userId).ToList();
        _logger.LogInformation("🔌 User {UserId} connecting with connection {ConnectionId}. Found {ExistingCount} existing connections", 
            userId, Context.ConnectionId, existingConnections.Count);
        
        _userConnections[Context.ConnectionId] = userId;
        
        // Auto-join user to their active network game groups
        await AutoJoinActiveGameGroups(userId);
        
        // Update player connection status
        await UpdatePlayerConnectionStatus(userId, true);
        
        _logger.LogInformation("✅ User {UserId} fully connected to NetworkGameHub with connection {ConnectionId}", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_userConnections.TryGetValue(Context.ConnectionId, out var userId))
        {
            _userConnections.Remove(Context.ConnectionId);
            
            // Update player connection status
            await UpdatePlayerConnectionStatus(userId, false);
            
            _logger.LogInformation("User {UserId} disconnected from NetworkGameHub connection {ConnectionId}", userId, Context.ConnectionId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinNetworkGameRoom(Guid networkGameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var networkGame = await _networkGameService.GetNetworkGameAsync(networkGameId);
            
            if (networkGame == null)
            {
                throw new InvalidOperationException("Network game not found");
            }

            // Check if user is a player in this game
            if (!networkGame.Players.Any(p => p.UserId == userId))
            {
                throw new InvalidOperationException("User is not a player in this network game");
            }

            if (!_networkGameConnections.ContainsKey(networkGameId))
            {
                _networkGameConnections[networkGameId] = new HashSet<string>();
            }
            
            _networkGameConnections[networkGameId].Add(Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, $"NetworkGame_{networkGameId}");
            
            // Update connection status
            await _networkGameService.UpdatePlayerConnectionAsync(networkGameId, userId, true);
            
            // Notify other players in the room
            await Clients.Group($"NetworkGame_{networkGameId}").PlayerConnectedToRoom(networkGameId, userId);
            
            _logger.LogInformation("User {UserId} joined network game room {NetworkGameId}", userId, networkGameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining network game room {NetworkGameId}", networkGameId);
            throw;
        }
    }

    public async Task LeaveNetworkGameRoom(Guid networkGameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            
            if (_networkGameConnections.ContainsKey(networkGameId))
            {
                _networkGameConnections[networkGameId].Remove(Context.ConnectionId);
            }
            
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"NetworkGame_{networkGameId}");
            
            // Update connection status
            await _networkGameService.UpdatePlayerConnectionAsync(networkGameId, userId, false);
            
            // Notify remaining players
            await Clients.Group($"NetworkGame_{networkGameId}").PlayerDisconnectedFromRoom(networkGameId, userId);
            
            _logger.LogInformation("User {UserId} left network game room {NetworkGameId}", userId, networkGameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving network game room {NetworkGameId}", networkGameId);
            throw;
        }
    }

    public async Task StartNetworkGame(Guid networkGameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var networkGame = await _networkGameService.StartNetworkGameAsync(networkGameId, userId);
            
            // Notify all players that the game has started
            await Clients.Group($"NetworkGame_{networkGameId}").NetworkGameStarted(networkGame);
            
            _logger.LogInformation("Network game {NetworkGameId} started by host {UserId}", networkGameId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting network game {NetworkGameId}", networkGameId);
            throw;
        }
    }

    public async Task SendNetworkGameMove(Guid networkGameId, int row, int column)
    {
        try
        {
            var userId = GetUserIdFromToken();
            _logger.LogInformation("🎯 User {UserId} attempting move at ({Row}, {Column}) in game {NetworkGameId}", userId, row, column, networkGameId);
            
            var networkGame = await _networkGameService.GetNetworkGameByIdAsync(networkGameId);
            
            if (networkGame == null)
            {
                _logger.LogError("❌ Network game {NetworkGameId} not found", networkGameId);
                throw new InvalidOperationException("Network game not found");
            }
            
            _logger.LogInformation("🎮 Network game found. Status: {Status}, GameSessionId: {GameSessionId}", networkGame.Status, networkGame.GameSessionId);
            
            if (networkGame.GameSessionId == null)
            {
                _logger.LogError("❌ Network game {NetworkGameId} has no game session ID", networkGameId);
                throw new InvalidOperationException("Network game session not found");
            }

            // Make the move in the actual game session
            _logger.LogInformation("🎯 Making move in game session {GameSessionId}", networkGame.GameSessionId.Value);
            var gameState = await _gameService.MakeMoveAsync(networkGame.GameSessionId.Value, userId, row, column);
            
            // Determine current player based on game type and move count
            Guid? currentPlayerId = null;
            if (gameState.Status == GameStatus.InProgress)
            {
                if (gameState.Player3Id.HasValue)
                {
                    // 3-player game: rotate through all three players
                    var currentPlayerIndex = gameState.Moves.Count % 3;
                    currentPlayerId = currentPlayerIndex switch
                    {
                        0 => gameState.Player1Id,
                        1 => gameState.Player2Id,
                        2 => gameState.Player3Id,
                        _ => null
                    };
                }
                else
                {
                    // 2-player game: alternate between players
                    currentPlayerId = gameState.Moves.Count % 2 == 0 ? gameState.Player1Id : gameState.Player2Id;
                }
            }

            // Broadcast the move to all players in the network game
            await Clients.Group($"NetworkGame_{networkGameId}").NetworkGameMoveMade(networkGameId, new GameStateDto
            {
                Board = gameState.Board,
                Status = gameState.Status,
                CurrentPlayerId = currentPlayerId,
                LastUpdate = DateTime.UtcNow
            }, userId, row, column);
            
            // Check if game ended
            if (gameState.Status == GameStatus.Completed)
            {
                await HandleNetworkGameCompleted(networkGameId, gameState);
            }
            
            _logger.LogInformation("Network game move made in {NetworkGameId} by user {UserId} at ({Row}, {Column})", 
                networkGameId, userId, row, column);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error making network game move");
            throw;
        }
    }

    public async Task SendNetworkGameChatMessage(Guid networkGameId, string message)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var networkGame = await _networkGameService.GetNetworkGameByIdAsync(networkGameId);
            
            if (networkGame == null || !networkGame.Players.Any(p => p.UserId == userId))
            {
                throw new InvalidOperationException("User is not a player in this network game");
            }

            var player = networkGame.Players.First(p => p.UserId == userId);
            
            // Broadcast chat message to all players in the network game
            await Clients.Group($"NetworkGame_{networkGameId}").NetworkGameChatMessage(
                networkGameId, userId, player.User.Username, message, DateTime.UtcNow);
            
            _logger.LogInformation("Chat message sent in network game {NetworkGameId} by user {UserId}", 
                networkGameId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending network game chat message");
            throw;
        }
    }

    public async Task RequestNetworkGameReconnect(Guid networkGameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var networkGame = await _networkGameService.GetNetworkGameByIdAsync(networkGameId);
            
            if (networkGame == null || !networkGame.Players.Any(p => p.UserId == userId))
            {
                throw new InvalidOperationException("User is not a player in this network game");
            }

            // Send current game state to reconnecting player
            if (networkGame.GameSessionId.HasValue)
            {
                var gameState = await _gameService.GetGameAsync(networkGame.GameSessionId.Value);
                
                // Determine current player based on game type and move count
                Guid? currentPlayerId = null;
                if (gameState.Status == GameStatus.InProgress)
                {
                    if (gameState.Player3Id.HasValue)
                    {
                        // 3-player game: rotate through all three players
                        var currentPlayerIndex = gameState.Moves.Count % 3;
                        currentPlayerId = currentPlayerIndex switch
                        {
                            0 => gameState.Player1Id,
                            1 => gameState.Player2Id,
                            2 => gameState.Player3Id,
                            _ => null
                        };
                    }
                    else
                    {
                        // 2-player game: alternate between players
                        currentPlayerId = gameState.Moves.Count % 2 == 0 ? gameState.Player1Id : gameState.Player2Id;
                    }
                }
                
                await Clients.Caller.NetworkGameStateSync(networkGameId, new GameStateDto
                {
                    Board = gameState.Board,
                    Status = gameState.Status,
                    CurrentPlayerId = currentPlayerId,
                    LastUpdate = DateTime.UtcNow
                });
            }

            // Update connection status
            await _networkGameService.UpdatePlayerConnectionAsync(networkGameId, userId, true);
            
            // Notify other players of reconnection
            await Clients.Group($"NetworkGame_{networkGameId}").PlayerReconnectedToRoom(networkGameId, userId);
            
            _logger.LogInformation("User {UserId} requested reconnect to network game {NetworkGameId}", 
                userId, networkGameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling network game reconnect request");
            throw;
        }
    }

    private async Task HandleNetworkGameCompleted(Guid networkGameId, Game.Core.DTOs.Game.GameSessionDto gameState)
    {
        try
        {
            // Update network game status
            var networkGame = await _networkGameService.GetNetworkGameAsync(networkGameId);
            if (networkGame != null)
            {
                // Notify all players that the game has ended
                await Clients.Group($"NetworkGame_{networkGameId}").NetworkGameCompleted(
                    networkGameId, 
                    gameState.WinnerId,
                    gameState.Status);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling network game completion for {NetworkGameId}", networkGameId);
        }
    }

    private async Task UpdatePlayerConnectionStatus(Guid userId, bool isConnected)
    {
        try
        {
            // Find any active network games for this user and update connection status
            var activeGames = await _networkGameService.GetActiveNetworkGamesAsync();
            var userGames = activeGames.Where(g => g.Players.Any(p => p.UserId == userId));

            foreach (var game in userGames)
            {
                await _networkGameService.UpdatePlayerConnectionAsync(game.Id, userId, isConnected);
                
                // Notify other players in the game about connection status change
                var groupName = $"NetworkGame_{game.Id}";
                if (isConnected)
                {
                    await Clients.Group(groupName).PlayerConnectedToRoom(game.Id, userId);
                }
                else
                {
                    await Clients.Group(groupName).PlayerDisconnectedFromRoom(game.Id, userId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating player connection status for user {UserId}", userId);
        }
    }

    public async Task NotifyPlayerJoined(Guid networkGameId, NetworkGamePlayerDto player)
    {
        try
        {
            await Clients.Group($"NetworkGame_{networkGameId}")
                .NetworkGamePlayerJoined(networkGameId, player);
            
            _logger.LogInformation("Notified group NetworkGame_{NetworkGameId} that player {PlayerId} joined", 
                networkGameId, player.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying player joined for game {NetworkGameId}", networkGameId);
        }
    }

    private async Task AutoJoinActiveGameGroups(Guid userId)
    {
        try
        {
            _logger.LogInformation("🔍 Looking for active games for user {UserId}...", userId);
            
            // Find all active network games where this user is a player
            var activeGames = await _context.NetworkGamePlayers
                .Include(p => p.NetworkGame)
                .Include(p => p.User)
                .Where(p => p.UserId == userId && 
                           (p.NetworkGame.Status == NetworkGameStatus.Waiting || 
                            p.NetworkGame.Status == NetworkGameStatus.InProgress))
                .Select(p => p.NetworkGame)
                .ToListAsync();

            _logger.LogInformation("🎮 Found {GameCount} active games for user {UserId}", activeGames.Count, userId);

            foreach (var game in activeGames)
            {
                var groupName = $"NetworkGame_{game.Id}";
                await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
                
                // Add to connection tracking
                if (!_networkGameConnections.ContainsKey(game.Id))
                {
                    _networkGameConnections[game.Id] = new HashSet<string>();
                }
                _networkGameConnections[game.Id].Add(Context.ConnectionId);
                
                _logger.LogInformation("🚀 Auto-joined user {UserId} to network game group {GroupName} (Game: {GameName}, Status: {Status})", 
                    userId, groupName, game.GameName, game.Status);
                
                // Log current group membership for debugging
                var currentConnections = _networkGameConnections.GetValueOrDefault(game.Id, new HashSet<string>());
                _logger.LogInformation("📊 Group {GroupName} now has {ConnectionCount} connections", groupName, currentConnections.Count);
                
                // Log all group members
                foreach (var connId in currentConnections)
                {
                    var connUserId = _userConnections.GetValueOrDefault(connId, Guid.Empty);
                    _logger.LogInformation("   📱 Connection {ConnectionId} -> User {ConnUserId}", connId, connUserId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ Error auto-joining user {UserId} to active game groups", userId);
        }
    }

    private Guid GetUserIdFromToken()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user token");
        }
        return userId;
    }
}