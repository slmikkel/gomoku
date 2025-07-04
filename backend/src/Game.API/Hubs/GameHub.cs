using Game.Core.DTOs.Game.Responses;
using Game.Core.Interfaces;
using Game.Core.Enums;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Game.API.Hubs;

public class GameHub : Hub<IGameHubClient>
{
    private readonly ILogger<GameHub> _logger;
    private readonly IGameService _gameService;
    private static readonly Dictionary<Guid, HashSet<string>> _gameConnections = new();
    private static readonly Dictionary<string, Guid> _userConnections = new();

    public GameHub(ILogger<GameHub> logger, IGameService gameService)
    {
        _logger = logger;
        _gameService = gameService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserIdFromToken();
        _userConnections[Context.ConnectionId] = userId;
        _logger.LogInformation("User {UserId} connected with connection {ConnectionId}", userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (_userConnections.TryGetValue(Context.ConnectionId, out var userId))
        {
            _userConnections.Remove(Context.ConnectionId);
            _logger.LogInformation("User {UserId} disconnected from connection {ConnectionId}", userId, Context.ConnectionId);
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinGame(Guid gameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var game = await _gameService.GetGameAsync(gameId);
            
            if (!_gameConnections.ContainsKey(gameId))
            {
                _gameConnections[gameId] = new HashSet<string>();
            }
            
            _gameConnections[gameId].Add(Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId.ToString());
            
            // Notify all players in the game about the new player
            await Clients.Group(gameId.ToString()).PlayerJoinedGame(gameId, userId);
            
            _logger.LogInformation("User {UserId} joined game {GameId}", userId, gameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining game {GameId}", gameId);
            throw;
        }
    }

    public async Task LeaveGame(Guid gameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            
            if (_gameConnections.ContainsKey(gameId))
            {
                _gameConnections[gameId].Remove(Context.ConnectionId);
            }
            
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, gameId.ToString());
            
            // Notify remaining players
            await Clients.Group(gameId.ToString()).PlayerLeftGame(gameId, userId);
            
            _logger.LogInformation("User {UserId} left game {GameId}", userId, gameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving game {GameId}", gameId);
            throw;
        }
    }

    public async Task SendMove(Guid gameId, int row, int column)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var game = await _gameService.MakeMoveAsync(gameId, userId, row, column);
            
            // Broadcast the move to all players in the game
            await Clients.Group(gameId.ToString()).MoveMade(gameId, new GameStateDto
            {
                Board = game.Board,
                Status = game.Status,
                CurrentPlayerId = game.Status == GameStatus.InProgress 
                    ? (game.Moves.Count % 2 == 0 ? game.Player1Id : game.Player2Id)
                    : null,
                LastUpdate = DateTime.UtcNow
            });
            
            _logger.LogInformation("Move made in game {GameId} by user {UserId}", gameId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error making move in game {GameId}", gameId);
            throw;
        }
    }

    public async Task SendGameInvitation(Guid targetUserId, Guid gameId)
    {
        try
        {
            var senderId = GetUserIdFromToken();
            var game = await _gameService.GetGameAsync(gameId);
            
            // Find the target user's connection ID
            var targetConnectionId = _userConnections
                .FirstOrDefault(x => x.Value == targetUserId)
                .Key;
            
            if (string.IsNullOrEmpty(targetConnectionId))
            {
                throw new InvalidOperationException("Target user is not connected");
            }
            
            // Send invitation to the target user
            await Clients.Client(targetConnectionId).GameInvitationReceived(gameId, senderId);
            
            _logger.LogInformation("Game invitation sent from {SenderId} to {TargetUserId} for game {GameId}", 
                senderId, targetUserId, gameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending game invitation");
            throw;
        }
    }

    public async Task AcceptGameInvitation(Guid gameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var game = await _gameService.JoinGameAsync(gameId, userId);
            
            // Notify all players in the game
            await Clients.Group(gameId.ToString()).PlayerJoinedGame(gameId, userId);
            
            _logger.LogInformation("Game invitation accepted by {UserId} for game {GameId}", userId, gameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting game invitation");
            throw;
        }
    }

    public async Task DeclineGameInvitation(Guid gameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var game = await _gameService.GetGameAsync(gameId);
            
            // Notify the game creator
            await Clients.User(game.Player1Id.ToString()).GameInvitationDeclined(gameId, userId);
            
            _logger.LogInformation("Game invitation declined by {UserId} for game {GameId}", userId, gameId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error declining game invitation");
            throw;
        }
    }

    public async Task SendChatMessage(Guid gameId, string message)
    {
        try
        {
            var userId = GetUserIdFromToken();
            
            // Broadcast the chat message to all players in the game
            await Clients.Group(gameId.ToString()).ChatMessageReceived(gameId, userId, message);
            
            _logger.LogInformation("Chat message sent in game {GameId} by user {UserId}", gameId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending chat message");
            throw;
        }
    }

    private Guid GetUserIdFromToken()
    {
        var userIdClaim = Context.User?.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user token");
        }
        return userId;
    }
} 