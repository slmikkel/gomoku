using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Auth;

public class RefreshTokenDto
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
} 