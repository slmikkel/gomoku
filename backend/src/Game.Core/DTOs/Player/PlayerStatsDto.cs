namespace Game.Core.DTOs.Player;

public class PlayerStatsDto
{
    public int TotalGames { get; set; }
    public int Wins { get; set; }
    public int Losses { get; set; }
    public int Draws { get; set; }
    public double WinRate { get; set; }
    public int CurrentStreak { get; set; }
    public int BestStreak { get; set; }
}