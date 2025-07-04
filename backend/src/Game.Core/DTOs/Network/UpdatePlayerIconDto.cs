using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Network;

public class UpdatePlayerIconDto
{
    [Required]
    public Guid NetworkGameId { get; set; }
    
    [Required]
    [StringLength(10)]
    public string PlayerIcon { get; set; } = string.Empty;
}