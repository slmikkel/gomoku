using System.ComponentModel.DataAnnotations;
using Game.Core.Enums;

namespace Game.Core.DTOs.Game.AI;

public class AIGameSettingsDto
{
    [Required]
    public AIDifficulty Difficulty { get; set; }
}