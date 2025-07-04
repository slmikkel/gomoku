namespace Game.Core.Entities;

public class HighScore
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation property
    public virtual User User { get; set; } = null!;
} 