using Game.Core.DTOs.Network;
using Game.Core.DTOs.Game.Responses;
using Game.Core.Enums;

namespace Game.Core.Interfaces;

public interface INetworkGameHubClient
{
    Task PlayerConnectedToRoom(Guid networkGameId, Guid userId);
    Task PlayerDisconnectedFromRoom(Guid networkGameId, Guid userId);
    Task PlayerReconnectedToRoom(Guid networkGameId, Guid userId);
    Task NetworkGameStarted(NetworkGameDto networkGame);
    Task NetworkGameMoveMade(Guid networkGameId, GameStateDto gameState, Guid playerId, int row, int column);
    Task NetworkGameCompleted(Guid networkGameId, Guid? winnerId, GameStatus finalStatus);
    Task NetworkGameChatMessage(Guid networkGameId, Guid senderId, string senderUsername, string message, DateTime timestamp);
    Task NetworkGameStateSync(Guid networkGameId, GameStateDto gameState);
    Task NetworkGamePlayerJoined(Guid networkGameId, NetworkGamePlayerDto player);
    Task NetworkGamePlayerLeft(Guid networkGameId, Guid userId);
    Task NetworkGameCancelled(Guid networkGameId, string reason);
}