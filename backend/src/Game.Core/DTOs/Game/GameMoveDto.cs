using Game.Core.Enums;

namespace Game.Core.DTOs.Game;

public class GameMoveDto
{
    public Guid Id { get; set; }
    public Guid GameId { get; set; }
    public Guid PlayerId { get; set; }
    public int Row { get; set; }
    public int Column { get; set; }
    public PlayerSymbol Symbol { get; set; }
    public DateTime CreatedAt { get; set; }
} 