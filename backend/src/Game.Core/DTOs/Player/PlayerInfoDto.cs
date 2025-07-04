namespace Game.Core.DTOs.Player;

public class PlayerInfoDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
}