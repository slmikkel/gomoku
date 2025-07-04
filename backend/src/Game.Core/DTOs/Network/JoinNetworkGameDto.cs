using System.ComponentModel.DataAnnotations;

namespace Game.Core.DTOs.Network;

public class JoinNetworkGameDto
{
    [Required]
    public Guid NetworkGameId { get; set; }
}