using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Game.Requests;

public class MakeMoveDto
{
    [Required]
    [Range(0, 14)]
    public int Row { get; set; }

    [Required]
    [Range(0, 14)]
    public int Column { get; set; }
}