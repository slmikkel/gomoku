using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Game.Core.Enums;

namespace Game.Core.Entities;

public class NetworkGame
{
    public Guid Id { get; set; }
    
    [ForeignKey("Host")]
    public Guid HostUserId { get; set; }
    
    public string GameName { get; set; } = string.Empty;
    public int BoardSize { get; set; } = 8;
    public int CurrentPlayers { get; set; } = 1;
    public int MaxPlayers { get; set; } = 2;
    public NetworkGameStatus Status { get; set; } = NetworkGameStatus.Waiting;
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivity { get; set; }
    
    // Network discovery info
    public string HostIpAddress { get; set; } = string.Empty;
    public int BroadcastPort { get; set; } = 7777;
    
    // Player icons for assignment
    [MaxLength(10)]
    public string? Player1Icon { get; set; }
    
    [MaxLength(10)]
    public string? Player2Icon { get; set; }
    
    // Game session reference when game starts
    [ForeignKey("GameSession")]
    public Guid? GameSessionId { get; set; }
    
    // Navigation properties
    public virtual User Host { get; set; } = null!;
    public virtual GameSession? GameSession { get; set; }
    public virtual ICollection<NetworkGamePlayer> Players { get; set; } = new List<NetworkGamePlayer>();
}