using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Auth;

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}