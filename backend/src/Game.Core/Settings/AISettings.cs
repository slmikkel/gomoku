namespace Game.Core.Settings;

public class AISettings
{
    public int EasyDepth { get; set; } = 2;
    public int MediumDepth { get; set; } = 3;
    public int HardDepth { get; set; } = 4;
    public int ExpertTimeLimitMs { get; set; } = 5000; // 5 seconds
    public bool UseMoveOrdering { get; set; } = true;
    public bool UseTranspositionTable { get; set; } = true;
} 