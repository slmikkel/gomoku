using Game.Core.Enums;

namespace Game.Core.DTOs.Network;

public class NetworkGameBroadcastDto
{
    public Guid GameId { get; set; }
    public string GameName { get; set; } = string.Empty;
    public string HostUsername { get; set; } = string.Empty;
    public int BoardSize { get; set; }
    public int CurrentPlayers { get; set; }
    public int MaxPlayers { get; set; }
    public NetworkGameStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivity { get; set; }
    public int SignalRPort { get; set; } = 5114; // API port for SignalR connection
}