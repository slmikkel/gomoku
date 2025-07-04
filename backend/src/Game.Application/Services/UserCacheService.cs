using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Game.Core.Interfaces;
using Game.Core.DTOs.Player;
using Game.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace Game.Application.Services;

public class UserCacheService : IUserCacheService
{
    private readonly IMemoryCache _cache;
    private readonly GameDbContext _dbContext;
    private readonly IMapper _mapper;
    private readonly ILogger<UserCacheService> _logger;
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);

    // Special user IDs for AI and local players
    private static readonly Guid AI_USER_ID = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid LOCAL_PLAYER2_ID = new("22222222-2222-2222-2222-222222222222");

    public UserCacheService(
        IMemoryCache cache,
        GameDbContext dbContext,
        IMapper mapper,
        ILogger<UserCacheService> logger)
    {
        _cache = cache;
        _dbContext = dbContext;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<PlayerInfoDto?> GetUserInfoAsync(Guid userId)
    {
        // Handle special user IDs
        if (userId == AI_USER_ID)
        {
            return new PlayerInfoDto
            {
                Id = AI_USER_ID,
                Username = "AI Player",
                Email = null
            };
        }

        if (userId == LOCAL_PLAYER2_ID)
        {
            return new PlayerInfoDto
            {
                Id = LOCAL_PLAYER2_ID,
                Username = "Local Player 2",
                Email = null
            };
        }

        // Check cache first
        var cacheKey = $"user_info_{userId}";
        if (_cache.TryGetValue(cacheKey, out PlayerInfoDto? cachedUser))
        {
            _logger.LogDebug("Retrieved user {UserId} from cache", userId);
            return cachedUser;
        }

        // Load from database
        try
        {
            var user = await _dbContext.Users
                .Where(u => u.Id == userId)
                .Select(u => new PlayerInfoDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email
                })
                .FirstOrDefaultAsync();

            if (user != null)
            {
                // Cache the result
                _cache.Set(cacheKey, user, _cacheExpiration);
                _logger.LogDebug("Cached user {UserId} for {Expiration} minutes", userId, _cacheExpiration.TotalMinutes);
            }

            return user;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading user {UserId} from database", userId);
            return null;
        }
    }

    public async Task<Dictionary<Guid, PlayerInfoDto>> GetUsersInfoAsync(IEnumerable<Guid> userIds)
    {
        var result = new Dictionary<Guid, PlayerInfoDto>();
        var uncachedUserIds = new List<Guid>();

        // Check cache for each user
        foreach (var userId in userIds.Distinct())
        {
            var userInfo = await GetCachedUserInfo(userId);
            if (userInfo != null)
            {
                result[userId] = userInfo;
            }
            else if (!IsSpecialUserId(userId))
            {
                uncachedUserIds.Add(userId);
            }
        }

        // Load uncached users from database in batch
        if (uncachedUserIds.Any())
        {
            try
            {
                var dbUsers = await _dbContext.Users
                    .Where(u => uncachedUserIds.Contains(u.Id))
                    .Select(u => new PlayerInfoDto
                    {
                        Id = u.Id,
                        Username = u.Username,
                        Email = u.Email
                    })
                    .ToListAsync();

                // Cache and add to result
                foreach (var user in dbUsers)
                {
                    var cacheKey = $"user_info_{user.Id}";
                    _cache.Set(cacheKey, user, _cacheExpiration);
                    result[user.Id] = user;
                }

                _logger.LogDebug("Loaded and cached {Count} users from database", dbUsers.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading users from database");
            }
        }

        return result;
    }

    public void ClearUserCache(Guid userId)
    {
        var cacheKey = $"user_info_{userId}";
        _cache.Remove(cacheKey);
        _logger.LogDebug("Cleared cache for user {UserId}", userId);
    }

    public void ClearAllCache()
    {
        // Note: IMemoryCache doesn't have a clear all method
        // In production, consider using a distributed cache or implementing cache key tracking
        _logger.LogWarning("ClearAllCache called - consider implementing cache key tracking for production use");
    }

    private async Task<PlayerInfoDto?> GetCachedUserInfo(Guid userId)
    {
        // Handle special user IDs
        if (userId == AI_USER_ID)
        {
            return new PlayerInfoDto
            {
                Id = AI_USER_ID,
                Username = "AI Player",
                Email = null
            };
        }

        if (userId == LOCAL_PLAYER2_ID)
        {
            return new PlayerInfoDto
            {
                Id = LOCAL_PLAYER2_ID,
                Username = "Local Player 2",
                Email = null
            };
        }

        // Check cache
        var cacheKey = $"user_info_{userId}";
        if (_cache.TryGetValue(cacheKey, out PlayerInfoDto? cachedUser))
        {
            return cachedUser;
        }

        return null;
    }

    private static bool IsSpecialUserId(Guid userId)
    {
        return userId == AI_USER_ID || userId == LOCAL_PLAYER2_ID;
    }
}