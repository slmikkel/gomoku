using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Game.Requests;

public class JoinGameDto
{
    [Required]
    public Guid GameId { get; set; }
}