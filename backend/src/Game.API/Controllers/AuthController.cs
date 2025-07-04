using Game.Core.DTOs.Auth;
using Game.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Game.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IPasswordResetService _passwordResetService;

    public AuthController(IAuthService authService, IPasswordResetService passwordResetService)
    {
        _authService = authService;
        _passwordResetService = passwordResetService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        var response = await _authService.LoginAsync(loginDto);
        
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        var response = await _authService.RegisterAsync(registerDto);
        
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken([FromBody] RefreshTokenDto refreshTokenDto)
    {
        var response = await _authService.RefreshTokenAsync(refreshTokenDto.RefreshToken);
        
        if (!response.Success)
        {
            return BadRequest(response);
        }

        return Ok(response);
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // In a real application, you might want to:
        // 1. Add the current token to a blacklist
        // 2. Clear any server-side session data
        // 3. Clear any client-side storage
        
        return Ok(new { message = "Successfully logged out" });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
    {
        try
        {
            var ipAddress = GetClientIpAddress();
            var userAgent = Request.Headers["User-Agent"].ToString();
            
            var result = await _passwordResetService.RequestPasswordResetAsync(request, ipAddress, userAgent);
            
            if (result)
            {
                return Ok(new { message = "If an account with that email exists, a password reset link has been sent." });
            }
            
            return BadRequest(new { error = "Unable to process password reset request. Please try again later." });
        }
        catch (Exception ex)
        {
            // Log the actual exception for debugging
            Console.WriteLine($"Password reset error: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { error = "An error occurred while processing your request." });
        }
    }

    [HttpPost("verify-reset-token")]
    public async Task<IActionResult> VerifyResetToken([FromBody] VerifyResetTokenDto request)
    {
        try
        {
            var isValid = await _passwordResetService.VerifyResetTokenAsync(request);
            
            if (isValid)
            {
                return Ok(new { valid = true, message = "Reset token is valid." });
            }
            
            return BadRequest(new { valid = false, error = "Invalid or expired reset token." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "An error occurred while verifying the reset token." });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var ipAddress = GetClientIpAddress();
            var userAgent = Request.Headers["User-Agent"].ToString();
            
            var result = await _passwordResetService.ResetPasswordAsync(request, ipAddress, userAgent);
            
            if (result)
            {
                return Ok(new { message = "Password has been reset successfully. You can now log in with your new password." });
            }
            
            return BadRequest(new { error = "Invalid or expired reset token. Please request a new password reset." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "An error occurred while resetting your password." });
        }
    }

    private string GetClientIpAddress()
    {
        // Try to get the real IP address from headers (in case of proxy/load balancer)
        var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        // Fallback to connection remote IP
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
} 