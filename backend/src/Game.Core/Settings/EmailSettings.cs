namespace Game.Core.Settings;

public class EmailSettings
{
    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; }
    public bool EnableSsl { get; set; } = true;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = "Gomoku Game";
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}