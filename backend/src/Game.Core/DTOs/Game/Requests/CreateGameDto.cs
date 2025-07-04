using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Game.Requests;

public class CreateGameDto
{
    [Required]
    public bool IsAIGame { get; set; }
    
    public bool IsLocalGame { get; set; } = false; // For local human vs human games
    
    [Range(6, 24, ErrorMessage = "Board size must be between 6 and 24")]
    public int BoardSize { get; set; } = 8; // Default to 8x8 board
    
    public string? StartingPlayer { get; set; } = null; // 'X' or 'O' for random start, null for default (X starts)
}