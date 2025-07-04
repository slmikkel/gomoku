namespace Game.Core.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string username, string resetToken, string resetUrl);
    Task SendPasswordResetConfirmationAsync(string toEmail, string username);
}