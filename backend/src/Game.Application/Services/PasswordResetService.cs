using System.Security.Cryptography;
using Game.Core.DTOs.Auth;
using Game.Core.Entities;
using Game.Core.Interfaces;
using Game.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Game.Application.Services;

public class PasswordResetService : IPasswordResetService
{
    private readonly GameDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<PasswordResetService> _logger;
    
    private const int TOKEN_EXPIRY_MINUTES = 15;
    private const int MAX_TOKENS_PER_USER = 5;

    public PasswordResetService(
        GameDbContext context,
        IEmailService emailService,
        ILogger<PasswordResetService> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<bool> RequestPasswordResetAsync(ForgotPasswordDto request, string ipAddress, string? userAgent)
    {
        try
        {
            _logger.LogInformation("Processing password reset request for email: {Email} from IP: {IP}", 
                request.Email, ipAddress);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                // For security, we don't reveal whether the email exists
                // But we still log the attempt
                _logger.LogWarning("Password reset requested for non-existent email: {Email} from IP: {IP}", 
                    request.Email, ipAddress);
                return true; // Return true to prevent email enumeration
            }

            _logger.LogInformation("Found user {UserId} for email {Email}", user.Id, request.Email);

            // Invalidate existing tokens for this user
            var existingTokens = await _context.PasswordResetTokens
                .Where(t => t.UserId == user.Id && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
                .ToListAsync();

            foreach (var token in existingTokens)
            {
                token.IsUsed = true;
                token.UsedAt = DateTime.UtcNow;
            }

            // Clean up old tokens (keep only the most recent MAX_TOKENS_PER_USER)
            var allUserTokens = await _context.PasswordResetTokens
                .Where(t => t.UserId == user.Id)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            if (allUserTokens.Count >= MAX_TOKENS_PER_USER)
            {
                var tokensToRemove = allUserTokens.Skip(MAX_TOKENS_PER_USER - 1);
                _context.PasswordResetTokens.RemoveRange(tokensToRemove);
            }

            // Generate new reset token
            var resetToken = GenerateSecureToken();
            var passwordResetToken = new PasswordResetToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = resetToken,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(TOKEN_EXPIRY_MINUTES),
                IsUsed = false,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            _context.PasswordResetTokens.Add(passwordResetToken);
            _logger.LogInformation("About to save password reset token to database for user {UserId}", user.Id);
            
            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully saved password reset token to database for user {UserId}", user.Id);

            // Send reset email
            var resetUrl = $"http://localhost:5173/reset-password?token={resetToken}&email={Uri.EscapeDataString(user.Email)}";
            _logger.LogInformation("About to send password reset email to {Email} with URL: {ResetUrl}", user.Email, resetUrl);
            
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.Username, resetToken, resetUrl);
            _logger.LogInformation("Successfully sent password reset email to {Email}", user.Email);

            _logger.LogInformation("Password reset token generated for user {UserId} from IP {IP}", 
                user.Id, ipAddress);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting password reset for email {Email}", request.Email);
            return false;
        }
    }

    public async Task<bool> VerifyResetTokenAsync(VerifyResetTokenDto request)
    {
        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                return false;
            }

            var token = await _context.PasswordResetTokens
                .FirstOrDefaultAsync(t => t.UserId == user.Id && 
                                        t.Token == request.Token &&
                                        !t.IsUsed &&
                                        t.ExpiresAt > DateTime.UtcNow);

            return token != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying reset token for email {Email}", request.Email);
            return false;
        }
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto request, string ipAddress, string? userAgent)
    {
        try
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

            if (user == null)
            {
                _logger.LogWarning("Password reset attempted for non-existent email: {Email} from IP: {IP}", 
                    request.Email, ipAddress);
                return false;
            }

            var token = await _context.PasswordResetTokens
                .FirstOrDefaultAsync(t => t.UserId == user.Id && 
                                        t.Token == request.Token &&
                                        !t.IsUsed &&
                                        t.ExpiresAt > DateTime.UtcNow);

            if (token == null)
            {
                _logger.LogWarning("Invalid or expired reset token used for user {UserId} from IP {IP}", 
                    user.Id, ipAddress);
                return false;
            }

            // Hash the new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.LastLoginAt = null; // Force re-login

            // Mark token as used
            token.IsUsed = true;
            token.UsedAt = DateTime.UtcNow;

            // Invalidate all other tokens for this user
            var otherTokens = await _context.PasswordResetTokens
                .Where(t => t.UserId == user.Id && t.Id != token.Id && !t.IsUsed)
                .ToListAsync();

            foreach (var otherToken in otherTokens)
            {
                otherToken.IsUsed = true;
                otherToken.UsedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Send confirmation email
            await _emailService.SendPasswordResetConfirmationAsync(user.Email, user.Username);

            _logger.LogInformation("Password successfully reset for user {UserId} from IP {IP}", 
                user.Id, ipAddress);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for email {Email}", request.Email);
            return false;
        }
    }

    public async Task CleanupExpiredTokensAsync()
    {
        try
        {
            var expiredTokens = await _context.PasswordResetTokens
                .Where(t => t.ExpiresAt < DateTime.UtcNow || 
                           t.CreatedAt < DateTime.UtcNow.AddDays(-7)) // Remove tokens older than 7 days
                .ToListAsync();

            if (expiredTokens.Any())
            {
                _context.PasswordResetTokens.RemoveRange(expiredTokens);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Cleaned up {Count} expired password reset tokens", expiredTokens.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up expired password reset tokens");
        }
    }

    private static string GenerateSecureToken()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }
}