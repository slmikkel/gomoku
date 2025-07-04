using System.Net;
using System.Net.Mail;
using Game.Core.Interfaces;
using Game.Core.Settings;
using Microsoft.Extensions.Logging;

namespace Game.Application.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly EmailSettings _emailSettings;

    public EmailService(ILogger<EmailService> logger, EmailSettings emailSettings)
    {
        _logger = logger;
        _emailSettings = emailSettings;
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string username, string resetToken, string resetUrl)
    {
        try
        {
            _logger.LogInformation("Email settings - SmtpHost: '{SmtpHost}', FromEmail: '{FromEmail}', Username: '{Username}', Password: '{PasswordStatus}'", 
                _emailSettings.SmtpHost, 
                _emailSettings.FromEmail, 
                _emailSettings.Username, 
                string.IsNullOrEmpty(_emailSettings.Password) ? "EMPTY" : "SET");

            // Check if email settings are configured
            if (string.IsNullOrEmpty(_emailSettings.SmtpHost) || string.IsNullOrEmpty(_emailSettings.FromEmail))
            {
                _logger.LogWarning("Email settings not configured. Falling back to development mode.");
                await LogEmailForDevelopment(toEmail, username, resetToken, resetUrl, "password reset");
                return;
            }

            var subject = "Reset Your Gomoku Game Password";
            var htmlBody = CreatePasswordResetHtmlEmail(username, resetUrl, resetToken);
            var textBody = CreatePasswordResetTextEmail(username, resetUrl, resetToken);

            await SendEmailAsync(toEmail, subject, htmlBody, textBody);
            
            _logger.LogInformation("Password reset email sent successfully to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email to {Email}", toEmail);
            
            // Fallback to development mode if email sending fails
            _logger.LogWarning("Falling back to development mode due to email sending failure");
            await LogEmailForDevelopment(toEmail, username, resetToken, resetUrl, "password reset");
        }
    }

    public async Task SendPasswordResetConfirmationAsync(string toEmail, string username)
    {
        try
        {
            // Check if email settings are configured
            if (string.IsNullOrEmpty(_emailSettings.SmtpHost) || string.IsNullOrEmpty(_emailSettings.FromEmail))
            {
                _logger.LogWarning("Email settings not configured. Falling back to development mode.");
                await LogEmailForDevelopment(toEmail, username, "", "", "password reset confirmation");
                return;
            }

            var subject = "Password Reset Confirmation - Gomoku Game";
            var htmlBody = CreatePasswordResetConfirmationHtmlEmail(username);
            var textBody = CreatePasswordResetConfirmationTextEmail(username);

            await SendEmailAsync(toEmail, subject, htmlBody, textBody);
            
            _logger.LogInformation("Password reset confirmation email sent successfully to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset confirmation email to {Email}", toEmail);
            
            // Fallback to development mode if email sending fails
            _logger.LogWarning("Falling back to development mode due to email sending failure");
            await LogEmailForDevelopment(toEmail, username, "", "", "password reset confirmation");
        }
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody, string textBody)
    {
        using var client = new SmtpClient(_emailSettings.SmtpHost, _emailSettings.SmtpPort);
        client.EnableSsl = _emailSettings.EnableSsl;
        client.UseDefaultCredentials = false;
        client.Credentials = new NetworkCredential(_emailSettings.Username, _emailSettings.Password);

        using var message = new MailMessage();
        message.From = new MailAddress(_emailSettings.FromEmail, _emailSettings.FromName);
        message.To.Add(new MailAddress(toEmail));
        message.Subject = subject;
        message.IsBodyHtml = true;
        message.Body = htmlBody;

        // Add plain text alternative
        var textView = AlternateView.CreateAlternateViewFromString(textBody, null, "text/plain");
        var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
        message.AlternateViews.Add(textView);
        message.AlternateViews.Add(htmlView);

        await client.SendMailAsync(message);
    }

    private string CreatePasswordResetHtmlEmail(string username, string resetUrl, string resetToken)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Reset Your Password</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }}
        .footer {{ background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }}
        .button {{ display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0; }}
        .token {{ background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }}
        .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; color: #856404; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🎮 Gomoku Game</h1>
            <h2>Password Reset Request</h2>
        </div>
        <div class='content'>
            <p>Hello <strong>{username}</strong>,</p>
            
            <p>You have requested to reset your password for your Gomoku game account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style='text-align: center;'>
                <a href='{resetUrl}' class='button'>Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <div class='token'>{resetUrl}</div>
            
            <div class='warning'>
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This link will expire in <strong>15 minutes</strong></li>
                    <li>If you did not request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                </ul>
            </div>
        </div>
        <div class='footer'>
            <p>This email was sent automatically. Please do not reply.</p>
            <p>© 2024 Gomoku Game. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }

    private string CreatePasswordResetTextEmail(string username, string resetUrl, string resetToken)
    {
        return $@"
Hello {username},

You have requested to reset your password for your Gomoku game account.

Please click the following link to reset your password:
{resetUrl}

Or use the following reset code: {resetToken}

SECURITY NOTICE:
- This link will expire in 15 minutes for security reasons
- If you did not request this password reset, please ignore this email
- Never share this link with anyone

Best regards,
The Gomoku Team

---
This email was sent automatically. Please do not reply.
© 2024 Gomoku Game. All rights reserved.
";
    }

    private string CreatePasswordResetConfirmationHtmlEmail(string username)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Password Reset Successful</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #d4edda; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }}
        .footer {{ background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6c757d; }}
        .success {{ color: #155724; }}
        .warning {{ background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; color: #856404; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1 class='success'>✅ Password Reset Successful</h1>
        </div>
        <div class='content'>
            <p>Hello <strong>{username}</strong>,</p>
            
            <p>Your password has been successfully reset for your Gomoku game account.</p>
            
            <p>You can now log in with your new password.</p>
            
            <div class='warning'>
                <strong>⚠️ Security Notice:</strong><br>
                If you did not make this change, please contact support immediately and consider changing your password again.
            </div>
        </div>
        <div class='footer'>
            <p>This email was sent automatically. Please do not reply.</p>
            <p>© 2024 Gomoku Game. All rights reserved.</p>
        </div>
    </div>
</body>
</html>";
    }

    private string CreatePasswordResetConfirmationTextEmail(string username)
    {
        return $@"
Hello {username},

Your password has been successfully reset for your Gomoku game account.

You can now log in with your new password.

SECURITY NOTICE:
If you did not make this change, please contact support immediately and consider changing your password again.

Best regards,
The Gomoku Team

---
This email was sent automatically. Please do not reply.
© 2024 Gomoku Game. All rights reserved.
";
    }

    private async Task LogEmailForDevelopment(string toEmail, string username, string resetToken, string resetUrl, string emailType)
    {
        _logger.LogInformation("=== DEVELOPMENT MODE EMAIL ===");
        _logger.LogInformation("Email Type: {EmailType}", emailType);
        _logger.LogInformation("To: {Email}", toEmail);
        _logger.LogInformation("Username: {Username}", username);
        
        if (!string.IsNullOrEmpty(resetToken))
        {
            _logger.LogInformation("Reset Token: {Token}", resetToken);
        }
        
        if (!string.IsNullOrEmpty(resetUrl))
        {
            _logger.LogWarning("🔗 COPY THIS URL TO RESET PASSWORD: {ResetUrl}", resetUrl);
        }
        
        _logger.LogInformation("===============================");
        
        // Simulate email sending delay
        await Task.Delay(100);
    }
}