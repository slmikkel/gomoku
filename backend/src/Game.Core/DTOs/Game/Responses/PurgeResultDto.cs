namespace Game.Core.DTOs.Game.Responses;

public class PurgeResultDto
{
    public int DeletedCount { get; set; }
    public List<string> DeletedGameIds { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public class ClearResultDto
{
    public int DeletedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class PurgePreviewDto
{
    public int IncompleteGamesCount { get; set; }
    public int TotalGamesCount { get; set; }
    public List<GamePreviewDto> IncompleteGames { get; set; } = new();
}

public class GamePreviewDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string GameType { get; set; } = string.Empty;
    public int BoardSize { get; set; }
    public int MoveCount { get; set; }
}