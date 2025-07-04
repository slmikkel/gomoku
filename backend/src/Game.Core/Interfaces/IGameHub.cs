using Game.Core.DTOs.Game.Responses;

namespace Game.Core.Interfaces;

public interface IGameHub
{
    // Client to Server methods
    Task JoinGame(Guid gameId);
    Task LeaveGame(Guid gameId);
    Task SendMove(Guid gameId, int row, int column);
    Task SendGameInvitation(Guid targetUserId, Guid gameId);
    Task AcceptGameInvitation(Guid gameId);
    Task DeclineGameInvitation(Guid gameId);
    Task SendChatMessage(Guid gameId, string message);
} 