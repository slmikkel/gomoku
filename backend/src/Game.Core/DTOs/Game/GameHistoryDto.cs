using Game.Core.DTOs.Player;
using Game.Core.Enums;

namespace Game.Core.DTOs.Game;

public class GameHistoryDto : GameSessionDto
{
    public PlayerInfoDto Player1Info { get; set; } = null!;
    public PlayerInfoDto? Player2Info { get; set; }
    public PlayerInfoDto? Player3Info { get; set; }
    public GameType GameType { get; set; }
    public string? AIDifficulty { get; set; } // For AI games: "Easy", "Medium", "Hard"
    public int PlayerCount { get; set; } // 2 or 3 players
}