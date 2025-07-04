using System.ComponentModel.DataAnnotations;

namespace Game.Core.Entities;

public class User
{
    public Guid Id { get; set; }
    
    [Required]
    [StringLength(50)]
    public string Username { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    
    // Navigation properties
    public virtual ICollection<GameSession> GameSessions { get; set; } = new List<GameSession>();
    public virtual ICollection<GameSession> OpponentGameSessions { get; set; } = new List<GameSession>();
    public virtual ICollection<GameSession> Player3GameSessions { get; set; } = new List<GameSession>();
    public virtual ICollection<HighScore> HighScores { get; set; } = new List<HighScore>();
} 