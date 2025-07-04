using Game.Core.Enums;

namespace Game.Core.DTOs.Game.Responses;

public class GameListDto
{
    public Guid Id { get; set; }
    public GameStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public Guid? WinnerId { get; set; }
    public bool IsAIGame { get; set; }
}