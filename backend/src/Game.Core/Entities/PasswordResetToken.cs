using System.ComponentModel.DataAnnotations.Schema;

namespace Game.Core.Entities;

public class PasswordResetToken
{
    public Guid Id { get; set; }
    
    [ForeignKey("User")]
    public Guid UserId { get; set; }
    
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime? UsedAt { get; set; }
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
    
    // Navigation property
    public virtual User User { get; set; } = null!;
}