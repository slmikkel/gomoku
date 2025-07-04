using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Game.Core.Enums;

namespace Game.Core.Entities;

public class NetworkGamePlayer
{
    public Guid Id { get; set; }
    
    [ForeignKey("NetworkGame")]
    public Guid NetworkGameId { get; set; }
    
    [ForeignKey("User")]
    public Guid UserId { get; set; }
    
    public PlayerSymbol PlayerSymbol { get; set; }
    public DateTime JoinedAt { get; set; }
    public bool IsHost { get; set; }
    public bool IsConnected { get; set; } = true;
    public DateTime LastSeen { get; set; }
    
    [MaxLength(10)]
    public string? PlayerIcon { get; set; }
    
    // Navigation properties
    public virtual NetworkGame NetworkGame { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}