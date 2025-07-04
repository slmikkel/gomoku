using Game.Core.DTOs.Game.Responses;

namespace Game.Core.Interfaces;

public interface IGameHubClient
{
    // Server to Client methods
    Task PlayerJoinedGame(Guid gameId, Guid playerId);
    Task PlayerLeftGame(Guid gameId, Guid playerId);
    Task MoveMade(Guid gameId, GameStateDto gameState);
    Task GameInvitationReceived(Guid gameId, Guid senderId);
    Task GameInvitationDeclined(Guid gameId, Guid playerId);
    Task ChatMessageReceived(Guid gameId, Guid senderId, string message);
    Task GameError(Guid gameId, string message);
} 