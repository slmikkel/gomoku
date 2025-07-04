using AutoMapper;
using Game.Core.DTOs.Network;
using Game.Core.Entities;
using Game.Core.Enums;
using Game.Core.Interfaces;
using Game.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Game.Application.Services;

public class NetworkGameService : INetworkGameService
{
    private readonly GameDbContext _context;
    private readonly IMapper _mapper;
    private readonly INetworkDiscoveryService _discoveryService;
    private readonly ILogger<NetworkGameService> _logger;

    public NetworkGameService(
        GameDbContext context,
        IMapper mapper,
        INetworkDiscoveryService discoveryService,
        ILogger<NetworkGameService> logger)
    {
        _context = context;
        _mapper = mapper;
        _discoveryService = discoveryService;
        _logger = logger;
    }

    public async Task<NetworkGameDto> CreateNetworkGameAsync(CreateNetworkGameDto createDto, Guid hostUserId, string hostIpAddress)
    {
        // Check if user is already in a game
        if (await IsPlayerInGameAsync(hostUserId))
        {
            throw new InvalidOperationException("User is already in an active network game");
        }

        var networkGame = new NetworkGame
        {
            Id = Guid.NewGuid(),
            HostUserId = hostUserId,
            GameName = createDto.GameName,
            BoardSize = createDto.BoardSize,
            CurrentPlayers = 1,
            MaxPlayers = createDto.MaxPlayers, // Use the MaxPlayers from DTO
            Status = NetworkGameStatus.Waiting,
            CreatedAt = DateTime.UtcNow,
            LastActivity = DateTime.UtcNow,
            HostIpAddress = hostIpAddress,
            BroadcastPort = createDto.BroadcastPort,
            Player1Icon = createDto.Player1Icon,
            Player2Icon = createDto.Player2Icon
        };

        _context.NetworkGames.Add(networkGame);

        // Add host as first player
        var hostPlayer = new NetworkGamePlayer
        {
            Id = Guid.NewGuid(),
            NetworkGameId = networkGame.Id,
            UserId = hostUserId,
            PlayerSymbol = PlayerSymbol.X, // Host is always X
            JoinedAt = DateTime.UtcNow,
            IsHost = true,
            IsConnected = true,
            LastSeen = DateTime.UtcNow,
            PlayerIcon = createDto.Player1Icon
        };

        _context.NetworkGamePlayers.Add(hostPlayer);
        await _context.SaveChangesAsync();

        // Load the complete entity with navigation properties
        var createdGame = await GetNetworkGameByIdAsync(networkGame.Id);
        var gameDto = _mapper.Map<NetworkGameDto>(createdGame);

        // Start broadcasting
        var broadcastDto = new NetworkGameBroadcastDto
        {
            GameId = networkGame.Id,
            GameName = networkGame.GameName,
            HostUsername = createdGame!.Host.Username,
            BoardSize = networkGame.BoardSize,
            CurrentPlayers = networkGame.CurrentPlayers,
            MaxPlayers = networkGame.MaxPlayers,
            Status = networkGame.Status,
            CreatedAt = networkGame.CreatedAt,
            LastActivity = networkGame.LastActivity,
            SignalRPort = 5114 // Default API port
        };

        await _discoveryService.StartBroadcastingAsync(broadcastDto);

        _logger.LogInformation("Created network game {GameId} - {GameName} hosted by {Username}", 
            networkGame.Id, networkGame.GameName, createdGame.Host.Username);

        return gameDto;
    }

    public async Task<NetworkGameDto> JoinNetworkGameAsync(JoinNetworkGameDto joinDto, Guid userId)
    {
        var networkGame = await GetNetworkGameByIdAsync(joinDto.NetworkGameId);
        if (networkGame == null)
        {
            throw new InvalidOperationException("Network game not found");
        }

        if (networkGame.Status != NetworkGameStatus.Waiting)
        {
            throw new InvalidOperationException("Game is not accepting new players");
        }

        if (networkGame.CurrentPlayers >= networkGame.MaxPlayers)
        {
            throw new InvalidOperationException("Game is full");
        }

        if (await IsPlayerInGameAsync(userId))
        {
            throw new InvalidOperationException("User is already in an active network game");
        }

        // Determine player symbol based on existing players
        var existingSymbols = networkGame.Players.Select(p => p.PlayerSymbol).ToHashSet();
        PlayerSymbol playerSymbol;
        
        if (!existingSymbols.Contains(PlayerSymbol.O))
        {
            playerSymbol = PlayerSymbol.O; // Second player gets O
        }
        else if (!existingSymbols.Contains(PlayerSymbol.Triangle))
        {
            playerSymbol = PlayerSymbol.Triangle; // Third player gets Triangle
        }
        else
        {
            throw new InvalidOperationException("All player symbols are already assigned");
        }

        // Determine player icon based on symbol
        string? playerIcon = playerSymbol switch
        {
            PlayerSymbol.O => networkGame.Player2Icon,
            PlayerSymbol.Triangle => null, // Third player will set their own icon
            _ => null
        };

        // Add player
        var player = new NetworkGamePlayer
        {
            Id = Guid.NewGuid(),
            NetworkGameId = networkGame.Id,
            UserId = userId,
            PlayerSymbol = playerSymbol,
            JoinedAt = DateTime.UtcNow,
            IsHost = false,
            IsConnected = true,
            LastSeen = DateTime.UtcNow,
            PlayerIcon = playerIcon
        };

        _context.NetworkGamePlayers.Add(player);
        
        networkGame.CurrentPlayers++;
        networkGame.LastActivity = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        // Update broadcast info
        var user = await _context.Users.FindAsync(userId);
        var broadcastDto = new NetworkGameBroadcastDto
        {
            GameId = networkGame.Id,
            GameName = networkGame.GameName,
            HostUsername = networkGame.Host.Username,
            BoardSize = networkGame.BoardSize,
            CurrentPlayers = networkGame.CurrentPlayers,
            MaxPlayers = networkGame.MaxPlayers,
            Status = networkGame.Status,
            CreatedAt = networkGame.CreatedAt,
            LastActivity = networkGame.LastActivity,
            SignalRPort = 5114
        };

        await _discoveryService.UpdateGameInfoAsync(broadcastDto);

        _logger.LogInformation("User {Username} joined network game {GameId}", user?.Username, networkGame.Id);

        var updatedGame = await GetNetworkGameByIdAsync(networkGame.Id);
        return _mapper.Map<NetworkGameDto>(updatedGame);
    }

    public async Task<NetworkGameDto> LeaveNetworkGameAsync(Guid networkGameId, Guid userId)
    {
        var networkGame = await GetNetworkGameByIdAsync(networkGameId);
        if (networkGame == null)
        {
            throw new InvalidOperationException("Network game not found");
        }

        var player = networkGame.Players.FirstOrDefault(p => p.UserId == userId);
        if (player == null)
        {
            throw new InvalidOperationException("User is not in this game");
        }

        _context.NetworkGamePlayers.Remove(player);
        networkGame.CurrentPlayers--;
        networkGame.LastActivity = DateTime.UtcNow;

        // If host leaves, cancel the game
        if (player.IsHost)
        {
            networkGame.Status = NetworkGameStatus.Cancelled;
            await _discoveryService.StopBroadcastingAsync(networkGameId);
            _logger.LogInformation("Network game {GameId} cancelled - host left", networkGameId);
        }
        else
        {
            // Update broadcast info
            var broadcastDto = new NetworkGameBroadcastDto
            {
                GameId = networkGame.Id,
                GameName = networkGame.GameName,
                HostUsername = networkGame.Host.Username,
                BoardSize = networkGame.BoardSize,
                CurrentPlayers = networkGame.CurrentPlayers,
                MaxPlayers = networkGame.MaxPlayers,
                Status = networkGame.Status,
                CreatedAt = networkGame.CreatedAt,
                LastActivity = networkGame.LastActivity,
                SignalRPort = 5114
            };

            await _discoveryService.UpdateGameInfoAsync(broadcastDto);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} left network game {GameId}", userId, networkGameId);

        var updatedGame = await GetNetworkGameByIdAsync(networkGame.Id);
        return _mapper.Map<NetworkGameDto>(updatedGame);
    }

    public async Task<NetworkGameDto?> GetNetworkGameAsync(Guid networkGameId)
    {
        var networkGame = await GetNetworkGameByIdAsync(networkGameId);
        return networkGame != null ? _mapper.Map<NetworkGameDto>(networkGame) : null;
    }

    public async Task<List<NetworkGameDto>> GetActiveNetworkGamesAsync()
    {
        var activeGames = await _context.NetworkGames
            .Include(ng => ng.Host)
            .Include(ng => ng.Players)
                .ThenInclude(p => p.User)
            .Where(ng => ng.Status == NetworkGameStatus.Waiting || ng.Status == NetworkGameStatus.InProgress)
            .OrderByDescending(ng => ng.LastActivity)
            .ToListAsync();

        return _mapper.Map<List<NetworkGameDto>>(activeGames);
    }

    public async Task<NetworkGameDto> StartNetworkGameAsync(Guid networkGameId, Guid hostUserId)
    {
        var networkGame = await GetNetworkGameByIdAsync(networkGameId);
        if (networkGame == null)
        {
            throw new InvalidOperationException("Network game not found");
        }

        if (networkGame.HostUserId != hostUserId)
        {
            throw new InvalidOperationException("Only the host can start the game");
        }

        if (networkGame.Status != NetworkGameStatus.Waiting)
        {
            throw new InvalidOperationException("Game cannot be started");
        }

        if (networkGame.CurrentPlayers < 2)
        {
            throw new InvalidOperationException("Need at least 2 players to start");
        }

        // Create actual game session
        var players = networkGame.Players.ToList();
        var gameSession = new GameSession
        {
            Id = Guid.NewGuid(),
            Player1Id = players.First(p => p.PlayerSymbol == PlayerSymbol.X).UserId,
            Player2Id = players.FirstOrDefault(p => p.PlayerSymbol == PlayerSymbol.O)?.UserId,
            Player3Id = players.FirstOrDefault(p => p.PlayerSymbol == PlayerSymbol.Triangle)?.UserId,
            Board = string.Join(",", Enumerable.Repeat("", networkGame.BoardSize * networkGame.BoardSize)),
            BoardSize = networkGame.BoardSize,
            Status = GameStatus.InProgress,
            CreatedAt = DateTime.UtcNow,
            StartedAt = DateTime.UtcNow
        };

        _context.GameSessions.Add(gameSession);

        networkGame.Status = NetworkGameStatus.InProgress;
        networkGame.GameSessionId = gameSession.Id;
        networkGame.LastActivity = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Stop broadcasting since game started
        await _discoveryService.StopBroadcastingAsync(networkGameId);

        _logger.LogInformation("Network game {GameId} started with session {SessionId}", networkGameId, gameSession.Id);

        var updatedGame = await GetNetworkGameByIdAsync(networkGame.Id);
        return _mapper.Map<NetworkGameDto>(updatedGame);
    }

    public async Task CancelNetworkGameAsync(Guid networkGameId, Guid hostUserId)
    {
        var networkGame = await GetNetworkGameByIdAsync(networkGameId);
        if (networkGame == null)
        {
            throw new InvalidOperationException("Network game not found");
        }

        if (networkGame.HostUserId != hostUserId)
        {
            throw new InvalidOperationException("Only the host can cancel the game");
        }

        networkGame.Status = NetworkGameStatus.Cancelled;
        networkGame.LastActivity = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _discoveryService.StopBroadcastingAsync(networkGameId);

        _logger.LogInformation("Network game {GameId} cancelled by host", networkGameId);
    }

    public async Task UpdatePlayerConnectionAsync(Guid networkGameId, Guid userId, bool isConnected)
    {
        var player = await _context.NetworkGamePlayers
            .FirstOrDefaultAsync(p => p.NetworkGameId == networkGameId && p.UserId == userId);

        if (player != null)
        {
            player.IsConnected = isConnected;
            player.LastSeen = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task CleanupExpiredGamesAsync()
    {
        var expiredTime = DateTime.UtcNow.AddMinutes(-30); // 30 minutes timeout

        var expiredGames = await _context.NetworkGames
            .Where(ng => ng.LastActivity < expiredTime && 
                        (ng.Status == NetworkGameStatus.Waiting || ng.Status == NetworkGameStatus.InProgress))
            .ToListAsync();

        foreach (var game in expiredGames)
        {
            game.Status = NetworkGameStatus.Expired;
            await _discoveryService.StopBroadcastingAsync(game.Id);
        }

        if (expiredGames.Any())
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleaned up {Count} expired network games", expiredGames.Count);
        }
    }

    public async Task<bool> IsPlayerInGameAsync(Guid userId)
    {
        return await _context.NetworkGamePlayers
            .AnyAsync(p => p.UserId == userId && 
                          (p.NetworkGame.Status == NetworkGameStatus.Waiting || 
                           p.NetworkGame.Status == NetworkGameStatus.InProgress));
    }

    public async Task<NetworkGame?> GetNetworkGameByIdAsync(Guid networkGameId)
    {
        return await _context.NetworkGames
            .Include(ng => ng.Host)
            .Include(ng => ng.Players)
                .ThenInclude(p => p.User)
            .Include(ng => ng.GameSession)
            .FirstOrDefaultAsync(ng => ng.Id == networkGameId);
    }

    public async Task LeaveCurrentGameAsync(Guid userId)
    {
        // Find the user's current active network game
        var activeGamePlayer = await _context.NetworkGamePlayers
            .Include(p => p.NetworkGame)
            .FirstOrDefaultAsync(p => p.UserId == userId && 
                                    (p.NetworkGame.Status == NetworkGameStatus.Waiting || 
                                     p.NetworkGame.Status == NetworkGameStatus.InProgress));

        if (activeGamePlayer == null)
        {
            return; // User is not in any active game
        }

        var networkGame = activeGamePlayer.NetworkGame;

        // Remove the player from the game
        _context.NetworkGamePlayers.Remove(activeGamePlayer);

        // If the user was the host and the game hasn't started, cancel the game
        if (networkGame.HostUserId == userId && networkGame.Status == NetworkGameStatus.Waiting)
        {
            networkGame.Status = NetworkGameStatus.Cancelled;
            await _discoveryService.StopBroadcastingAsync(networkGame.Id);
            _logger.LogInformation("Cancelled network game {GameId} as host left", networkGame.Id);
        }
        // If the game was in progress, end it
        else if (networkGame.Status == NetworkGameStatus.InProgress)
        {
            networkGame.Status = NetworkGameStatus.Completed;
            await _discoveryService.StopBroadcastingAsync(networkGame.Id);
            _logger.LogInformation("Completed network game {GameId} as player left", networkGame.Id);
        }

        networkGame.LastActivity = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} left network game {GameId}", userId, networkGame.Id);
    }

    public async Task<NetworkGameDto> UpdatePlayerIconAsync(UpdatePlayerIconDto updateDto, Guid userId)
    {
        var networkGame = await GetNetworkGameByIdAsync(updateDto.NetworkGameId);
        if (networkGame == null)
        {
            throw new InvalidOperationException("Network game not found");
        }

        var player = networkGame.Players.FirstOrDefault(p => p.UserId == userId);
        if (player == null)
        {
            throw new InvalidOperationException("Player not found in this game");
        }

        if (networkGame.Status != NetworkGameStatus.Waiting)
        {
            throw new InvalidOperationException("Cannot update icon after game has started");
        }

        // Update player icon
        var playerEntity = await _context.NetworkGamePlayers
            .FirstOrDefaultAsync(p => p.UserId == userId && p.NetworkGameId == updateDto.NetworkGameId);
        
        if (playerEntity != null)
        {
            playerEntity.PlayerIcon = updateDto.PlayerIcon;
            networkGame.LastActivity = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        // Return updated game data
        var updatedGame = await GetNetworkGameByIdAsync(updateDto.NetworkGameId);
        return _mapper.Map<NetworkGameDto>(updatedGame);
    }
}