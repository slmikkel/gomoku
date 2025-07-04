namespace Game.Core.Enums;

public enum AIDifficulty
{
    Easy = 0,    // Depth: 2, no time limit
    Medium = 1,  // Depth: 3, no time limit
    Hard = 2,    // Depth: 4, no time limit
    Expert = 3   // Progressive deepening, 5s time limit
} 