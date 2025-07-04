using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Network;

public class CreateNetworkGameDto
{
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string GameName { get; set; } = string.Empty;
    
    [Range(6, 24)]
    public int BoardSize { get; set; } = 8;
    
    [Range(2, 3)]
    public int MaxPlayers { get; set; } = 2; // Default to 2 players for backward compatibility
    
    [Range(7777, 8777)]
    public int BroadcastPort { get; set; } = 7777;
    
    [StringLength(10)]
    public string? Player1Icon { get; set; }
    
    [StringLength(10)]
    public string? Player2Icon { get; set; }
}