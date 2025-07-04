using Game.Core.Enums;

namespace Game.Core.DTOs.Network;

public class NetworkGameDto
{
    public Guid Id { get; set; }
    public string GameName { get; set; } = string.Empty;
    public string HostUsername { get; set; } = string.Empty;
    public string HostIpAddress { get; set; } = string.Empty;
    public int BoardSize { get; set; }
    public int CurrentPlayers { get; set; }
    public int MaxPlayers { get; set; }
    public NetworkGameStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivity { get; set; }
    public Guid? GameSessionId { get; set; }
    public List<NetworkGamePlayerDto> Players { get; set; } = new();
}

public class NetworkGamePlayerDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public PlayerSymbol PlayerSymbol { get; set; }
    public bool IsHost { get; set; }
    public bool IsConnected { get; set; }
    public DateTime JoinedAt { get; set; }
    public string? PlayerIcon { get; set; }
}