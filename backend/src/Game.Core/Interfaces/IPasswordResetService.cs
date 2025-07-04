using Game.Core.DTOs.Auth;

namespace Game.Core.Interfaces;

public interface IPasswordResetService
{
    Task<bool> RequestPasswordResetAsync(ForgotPasswordDto request, string ipAddress, string? userAgent);
    Task<bool> VerifyResetTokenAsync(VerifyResetTokenDto request);
    Task<bool> ResetPasswordAsync(ResetPasswordDto request, string ipAddress, string? userAgent);
    Task CleanupExpiredTokensAsync();
}