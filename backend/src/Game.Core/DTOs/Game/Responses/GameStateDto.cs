using Game.Core.Enums;

namespace Game.Core.DTOs.Game.Responses;

public class GameStateDto
{
    public string Board { get; set; } = string.Empty;
    public GameStatus Status { get; set; }
    public Guid? CurrentPlayerId { get; set; }
    public DateTime LastUpdate { get; set; }
}