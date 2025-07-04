using Game.Core.Enums;

namespace Game.Core.DTOs.Game;

public class GameSessionDto
{
    public Guid Id { get; set; }
    public Guid Player1Id { get; set; }
    public Guid? Player2Id { get; set; }
    public Guid? Player3Id { get; set; }
    public Guid? WinnerId { get; set; }
    public Guid? CurrentPlayerId { get; set; }
    public string Board { get; set; } = string.Empty;
    public int BoardSize { get; set; } = 8;
    public GameStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public ICollection<GameMoveDto> Moves { get; set; } = new List<GameMoveDto>();
    
    public GameType GameType { get; set; }
} 