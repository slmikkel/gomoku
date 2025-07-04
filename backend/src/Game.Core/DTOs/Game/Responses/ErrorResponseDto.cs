namespace Game.Core.DTOs.Game.Responses;

public class ErrorResponseDto
{
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string? Code { get; set; }
}