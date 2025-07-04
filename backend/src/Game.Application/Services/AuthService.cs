using Game.Core.DTOs.Auth;
using Game.Core.Entities;
using Game.Core.Interfaces;
using Game.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BC = BCrypt.Net.BCrypt;
using System.IdentityModel.Tokens.Jwt;

namespace Game.Application.Services;

public class AuthService : IAuthService
{
    private readonly GameDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _configuration;

    public AuthService(GameDbContext context, ITokenService tokenService, IConfiguration configuration)
    {
        _context = context;
        _tokenService = tokenService;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

        if (user == null || !await ValidateUserAsync(loginDto.Email, loginDto.Password))
        {
            return new AuthResponseDto 
            { 
                Success = false, 
                Error = "Invalid email or password" 
            };
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            RefreshToken = refreshToken,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }
        };
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        if (!IsPasswordValid(registerDto.Password))
        {
            return new AuthResponseDto 
            { 
                Success = false, 
                Error = "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
            };
        }

        if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
        {
            return new AuthResponseDto 
            { 
                Success = false, 
                Error = "Email already exists" 
            };
        }

        if (await _context.Users.AnyAsync(u => u.Username == registerDto.Username))
        {
            return new AuthResponseDto 
            { 
                Success = false, 
                Error = "Username already exists" 
            };
        }

        if (registerDto.Password != registerDto.ConfirmPassword)
        {
            return new AuthResponseDto { Success = false, Error = "Passwords do not match" };
        }

        var user = new User
        {
            Username = registerDto.Username,
            Email = registerDto.Email,
            PasswordHash = HashPassword(registerDto.Password),
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateJwtToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            RefreshToken = refreshToken,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }
        };
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);
        if (user == null)
        {
            return new AuthResponseDto { Success = false, Error = "Invalid refresh token" };
        }

        if (user.RefreshTokenExpiryTime <= DateTime.UtcNow)
        {
            return new AuthResponseDto { Success = false, Error = "Refresh token expired" };
        }

        var token = _tokenService.GenerateJwtToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            RefreshToken = newRefreshToken,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }
        };
    }

    public async Task<bool> ValidateUserAsync(string email, string password)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null) return false;

        return VerifyPassword(password, user.PasswordHash);
    }

    private string HashPassword(string password)
    {
        return BC.HashPassword(password);
    }

    private bool VerifyPassword(string password, string hash)
    {
        return BC.Verify(password, hash);
    }

    private bool IsPasswordValid(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            return false;

        // Password must be at least 8 characters long
        if (password.Length < 8)
            return false;

        // Password must contain at least one uppercase letter
        if (!password.Any(char.IsUpper))
            return false;

        // Password must contain at least one lowercase letter
        if (!password.Any(char.IsLower))
            return false;

        // Password must contain at least one number
        if (!password.Any(char.IsDigit))
            return false;

        // Password must contain at least one special character
        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
            return false;

        return true;
    }
} 