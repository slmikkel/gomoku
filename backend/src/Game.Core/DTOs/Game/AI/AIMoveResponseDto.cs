namespace Game.Core.DTOs.Game.AI;

public class AIMoveResponseDto
{
    public int Row { get; set; }
    public int Column { get; set; }
    public double Evaluation { get; set; }
    public int SearchDepth { get; set; }
    public TimeSpan SearchTime { get; set; }
}