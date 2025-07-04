using Game.Core.DTOs.Network;
using Game.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Game.Infrastructure.Data;
using Game.Core.Enums;
using Microsoft.AspNetCore.SignalR;
using Game.API.Hubs;

namespace Game.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NetworkGameController : ControllerBase
{
    private readonly INetworkGameService _networkGameService;
    private readonly INetworkDiscoveryService _discoveryService;
    private readonly ILogger<NetworkGameController> _logger;
    private readonly GameDbContext _context;
    private readonly IHubContext<NetworkGameHub, INetworkGameHubClient> _hubContext;

    public NetworkGameController(
        INetworkGameService networkGameService,
        INetworkDiscoveryService discoveryService,
        ILogger<NetworkGameController> logger,
        GameDbContext context,
        IHubContext<NetworkGameHub, INetworkGameHubClient> hubContext)
    {
        _networkGameService = networkGameService;
        _discoveryService = discoveryService;
        _logger = logger;
        _context = context;
        _hubContext = hubContext;
    }

    [HttpPost("create")]
    public async Task<ActionResult<NetworkGameDto>> CreateNetworkGame([FromBody] CreateNetworkGameDto createDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var hostIpAddress = GetClientIpAddress();
            
            var networkGame = await _networkGameService.CreateNetworkGameAsync(createDto, userId, hostIpAddress);
            
            _logger.LogInformation("Network game created: {GameId} by user {UserId}", networkGame.Id, userId);
            return Ok(networkGame);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create network game");
            return StatusCode(500, new { error = "Failed to create network game" });
        }
    }

    [HttpPost("join")]
    public async Task<ActionResult<NetworkGameDto>> JoinNetworkGame([FromBody] JoinNetworkGameDto joinDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var networkGame = await _networkGameService.JoinNetworkGameAsync(joinDto, userId);
            
            // Notify existing players via SignalR (with small delay to ensure connections are stable)
            var player = networkGame.Players.FirstOrDefault(p => p.UserId == userId);
            if (player != null)
            {
                var groupName = $"NetworkGame_{networkGame.Id}";
                _logger.LogInformation("🔥 About to send NetworkGamePlayerJoined to group {GroupName} for player {Username} (ID: {UserId})", 
                    groupName, player.Username, userId);
                
                // Log all players in the game for debugging
                foreach (var gamePlayer in networkGame.Players)
                {
                    _logger.LogInformation("🎮 Player in game: {Username} (ID: {UserId}, IsHost: {IsHost})", 
                        gamePlayer.Username, gamePlayer.UserId, gamePlayer.IsHost);
                }
                
                // Small delay to ensure SignalR connections are established
                await Task.Delay(1000); // Increased delay
                
                // Log how many players should receive this notification
                var existingPlayers = networkGame.Players.Where(p => p.UserId != userId).ToList();
                _logger.LogInformation("🔔 Sending notification to {ExistingPlayerCount} existing players in game {GameId}", 
                    existingPlayers.Count, networkGame.Id);
                
                // Send to ALL clients first for debugging (this should definitely work)
                _logger.LogInformation("🌍 Sending NetworkGamePlayerJoined to ALL connected clients for debugging...");
                await _hubContext.Clients.All.NetworkGamePlayerJoined(networkGame.Id, player);
                
                _logger.LogInformation("🌍 Successfully sent to ALL clients");
                
                // Also send to the specific group
                _logger.LogInformation("🎯 Now sending NetworkGamePlayerJoined to group {GroupName}...", groupName);
                await _hubContext.Clients.Group(groupName).NetworkGamePlayerJoined(networkGame.Id, player);
                
                _logger.LogInformation("🎯 Successfully sent to group {GroupName}", groupName);
                
                _logger.LogInformation("✅ Successfully sent NetworkGamePlayerJoined notification for player {UserId} in game {GameId}", 
                    userId, networkGame.Id);
            }
            else
            {
                _logger.LogWarning("❌ Could not find joined player {UserId} in game {GameId} players list", userId, networkGame.Id);
            }
            
            _logger.LogInformation("User {UserId} joined network game {GameId}", userId, joinDto.NetworkGameId);
            return Ok(networkGame);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to join network game");
            return StatusCode(500, new { error = "Failed to join network game" });
        }
    }

    [HttpPost("{networkGameId}/leave")]
    public async Task<ActionResult<NetworkGameDto>> LeaveNetworkGame(Guid networkGameId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var networkGame = await _networkGameService.LeaveNetworkGameAsync(networkGameId, userId);
            
            _logger.LogInformation("User {UserId} left network game {GameId}", userId, networkGameId);
            return Ok(networkGame);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to leave network game");
            return StatusCode(500, new { error = "Failed to leave network game" });
        }
    }

    [HttpGet("{networkGameId}")]
    public async Task<ActionResult<NetworkGameDto>> GetNetworkGame(Guid networkGameId)
    {
        try
        {
            var networkGame = await _networkGameService.GetNetworkGameAsync(networkGameId);
            
            if (networkGame == null)
            {
                return NotFound(new { error = "Network game not found" });
            }

            return Ok(networkGame);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get network game {GameId}", networkGameId);
            return StatusCode(500, new { error = "Failed to get network game" });
        }
    }

    [HttpGet("active")]
    public async Task<ActionResult<List<NetworkGameDto>>> GetActiveNetworkGames()
    {
        try
        {
            var activeGames = await _networkGameService.GetActiveNetworkGamesAsync();
            return Ok(activeGames);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get active network games");
            return StatusCode(500, new { error = "Failed to get active network games" });
        }
    }

    [HttpPost("{networkGameId}/start")]
    public async Task<ActionResult<NetworkGameDto>> StartNetworkGame(Guid networkGameId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var networkGame = await _networkGameService.StartNetworkGameAsync(networkGameId, userId);
            
            _logger.LogInformation("Network game {GameId} started by user {UserId}", networkGameId, userId);
            return Ok(networkGame);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start network game");
            return StatusCode(500, new { error = "Failed to start network game" });
        }
    }

    [HttpPost("{networkGameId}/cancel")]
    public async Task<ActionResult> CancelNetworkGame(Guid networkGameId)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _networkGameService.CancelNetworkGameAsync(networkGameId, userId);
            
            _logger.LogInformation("Network game {GameId} cancelled by user {UserId}", networkGameId, userId);
            return Ok(new { message = "Network game cancelled successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel network game");
            return StatusCode(500, new { error = "Failed to cancel network game" });
        }
    }

    [HttpGet("discover")]
    public async Task<ActionResult<List<NetworkGameBroadcastDto>>> DiscoverGames([FromQuery] int timeoutSeconds = 10)
    {
        try
        {
            var timeout = TimeSpan.FromSeconds(Math.Min(Math.Max(timeoutSeconds, 1), 30)); // Limit between 1-30 seconds
            var discoveredGames = await _discoveryService.ScanForGamesAsync(timeout);
            
            _logger.LogInformation("Network discovery scan completed. Found {Count} games", discoveredGames.Count);
            return Ok(discoveredGames);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to discover network games");
            return StatusCode(500, new { error = "Failed to discover network games" });
        }
    }

    [HttpGet("user/status")]
    public async Task<ActionResult<object>> GetUserNetworkGameStatus()
    {
        try
        {
            var userId = GetCurrentUserId();
            var isInGame = await _networkGameService.IsPlayerInGameAsync(userId);
            
            return Ok(new { 
                isInNetworkGame = isInGame,
                userId = userId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user network game status");
            return StatusCode(500, new { error = "Failed to get user status" });
        }
    }

    [HttpPost("cleanup")]
    [AllowAnonymous] // This should be called by a background service, not user requests
    public async Task<ActionResult> CleanupExpiredGames()
    {
        try
        {
            // In production, this should be secured or called by a background service
            await _networkGameService.CleanupExpiredGamesAsync();
            return Ok(new { message = "Cleanup completed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup expired games");
            return StatusCode(500, new { error = "Failed to cleanup expired games" });
        }
    }

    [Authorize]
    [HttpPost("leave-current")]
    public async Task<ActionResult> LeaveCurrentGame()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _networkGameService.LeaveCurrentGameAsync(userId);
            return Ok(new { message = "Left current game successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to leave current game for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { error = "Failed to leave current game" });
        }
    }

    [HttpGet("my-games")]
    public async Task<ActionResult<List<NetworkGameDto>>> GetMyGames()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var myGames = await _context.NetworkGames
                .Include(ng => ng.Host)
                .Include(ng => ng.Players)
                    .ThenInclude(p => p.User)
                .Where(ng => ng.HostUserId == userId)
                .OrderByDescending(ng => ng.CreatedAt)
                .ToListAsync();

            var gameDtos = myGames.Select(ng => new NetworkGameDto
            {
                Id = ng.Id,
                GameName = ng.GameName,
                HostUsername = ng.Host.Username,
                HostIpAddress = ng.HostIpAddress,
                BoardSize = ng.BoardSize,
                CurrentPlayers = ng.CurrentPlayers,
                MaxPlayers = ng.MaxPlayers,
                Status = ng.Status,
                CreatedAt = ng.CreatedAt,
                LastActivity = ng.LastActivity,
                GameSessionId = ng.GameSessionId,
                Players = ng.Players.Select(p => new NetworkGamePlayerDto
                {
                    UserId = p.UserId,
                    Username = p.User.Username,
                    PlayerSymbol = p.PlayerSymbol,
                    JoinedAt = p.JoinedAt,
                    IsConnected = p.IsConnected,
                    IsHost = p.UserId == ng.HostUserId
                }).ToList()
            }).ToList();

            return Ok(gameDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user's games");
            return StatusCode(500, new { error = "Failed to get user's games" });
        }
    }

    [HttpDelete("{networkGameId}")]
    public async Task<ActionResult> DeleteNetworkGame(Guid networkGameId)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var networkGame = await _context.NetworkGames
                .Include(ng => ng.Players)
                .FirstOrDefaultAsync(ng => ng.Id == networkGameId);

            if (networkGame == null)
            {
                return NotFound(new { error = "Network game not found" });
            }

            // Only the host can delete the game
            if (networkGame.HostUserId != userId)
            {
                return Forbid("Only the host can delete this game");
            }

            // Stop broadcasting if still active (may already be stopped for expired/cancelled games)
            if (networkGame.Status == NetworkGameStatus.Waiting || networkGame.Status == NetworkGameStatus.InProgress)
            {
                await _discoveryService.StopBroadcastingAsync(networkGame.Id);
            }

            // Remove all players
            _context.NetworkGamePlayers.RemoveRange(networkGame.Players);
            
            // Remove the game
            _context.NetworkGames.Remove(networkGame);
            
            await _context.SaveChangesAsync();

            // Notify players via SignalR if they're connected
            await _hubContext.Clients.Group($"NetworkGame_{networkGameId}")
                .NetworkGameCancelled(networkGameId, "Game deleted by host");

            _logger.LogInformation("User {UserId} deleted network game {GameId}", userId, networkGameId);
            return Ok(new { message = "Game deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete network game {GameId}", networkGameId);
            return StatusCode(500, new { error = "Failed to delete game" });
        }
    }

    [HttpPost("force-cleanup-all")]
    [AllowAnonymous] // Debug endpoint - remove in production
    public async Task<ActionResult> ForceCleanupAllGames()
    {
        try
        {
            // Mark all active games as expired for debugging
            var allActiveGames = await _context.NetworkGames
                .Where(ng => ng.Status == NetworkGameStatus.Waiting || ng.Status == NetworkGameStatus.InProgress)
                .ToListAsync();

            foreach (var game in allActiveGames)
            {
                game.Status = NetworkGameStatus.Expired;
            }

            if (allActiveGames.Any())
            {
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = $"Force cleaned up {allActiveGames.Count} games" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to force cleanup all games");
            return StatusCode(500, new { error = "Failed to force cleanup all games" });
        }
    }

    [HttpPost("update-player-icon")]
    public async Task<ActionResult<NetworkGameDto>> UpdatePlayerIcon([FromBody] UpdatePlayerIconDto updateDto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var updatedGame = await _networkGameService.UpdatePlayerIconAsync(updateDto, userId);
            
            _logger.LogInformation("User {UserId} updated their icon in game {GameId} to {Icon}", 
                userId, updateDto.NetworkGameId, updateDto.PlayerIcon);
            
            return Ok(updatedGame);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to update player icon for user");
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error updating player icon");
            return StatusCode(500, new { error = "Failed to update player icon" });
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user token");
        }
        return userId;
    }

    private string GetClientIpAddress()
    {
        // Try to get the real IP address from headers (in case of proxy/load balancer)
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        // Fallback to connection remote IP
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}