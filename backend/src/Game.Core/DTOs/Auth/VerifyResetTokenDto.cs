using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Auth;

public class VerifyResetTokenDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}