using Game.Core.DTOs.Player;

namespace Game.Core.Interfaces;

public interface IUserCacheService
{
    Task<PlayerInfoDto?> GetUserInfoAsync(Guid userId);
    Task<Dictionary<Guid, PlayerInfoDto>> GetUsersInfoAsync(IEnumerable<Guid> userIds);
    void ClearUserCache(Guid userId);
    void ClearAllCache();
}