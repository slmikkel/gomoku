using System.Text.Json;
using Game.Core.Enums;
using System.ComponentModel.DataAnnotations.Schema;

namespace Game.Core.Entities;

public class GameSession
{
    public Guid Id { get; set; }
    
    [ForeignKey("Player1")]
    public Guid Player1Id { get; set; }
    
    [ForeignKey("Player2")]
    public Guid? Player2Id { get; set; }
    
    [ForeignKey("Player3")]
    public Guid? Player3Id { get; set; }
    
    [ForeignKey("Winner")]
    public Guid? WinnerId { get; set; }
    
    [ForeignKey("CurrentPlayer")]
    public Guid? CurrentPlayerId { get; set; }
    
    public string Board { get; set; } = string.Empty;
    public int BoardSize { get; set; } = 8; // Default to 8x8 board
    public GameStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    // Navigation properties
    public virtual User Player1 { get; set; } = null!;
    public virtual User? Player2 { get; set; }
    public virtual User? Player3 { get; set; }
    public virtual User? Winner { get; set; }
    public virtual ICollection<GameMove> Moves { get; set; } = new List<GameMove>();
    public GameType GameType { get; set; }        // Local/AI/Network

} 