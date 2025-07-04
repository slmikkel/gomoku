using Game.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Game.Core.Settings;
using Game.Core.Interfaces;
using Game.Application.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.SignalR;
using Game.API.Hubs;
using AutoMapper;
using DotNetEnv;

// Load environment variables from .env file
Console.WriteLine($"Current directory: {Directory.GetCurrentDirectory()}");
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
Console.WriteLine($"Looking for .env file at: {envPath}");
Console.WriteLine($".env file exists: {File.Exists(envPath)}");

// Try loading from multiple possible paths
var possiblePaths = new[]
{
    ".env",
    "../.env", 
    "../../.env"
};

foreach (var path in possiblePaths)
{
    var fullPath = Path.GetFullPath(path);
    Console.WriteLine($"Trying .env at: {fullPath} - Exists: {File.Exists(fullPath)}");
    if (File.Exists(fullPath))
    {
        Env.Load(fullPath);
        Console.WriteLine($"Loaded .env from: {fullPath}");
        break;
    }
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add DbContext
builder.Services.AddDbContext<GameDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        builder =>
        {
            builder.WithOrigins("http://localhost:3000", "http://localhost:5173")
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials();
        });
});

// Add AutoMapper
builder.Services.AddAutoMapper(typeof(Game.Application.Mapping.GameMappingProfile).Assembly);

// Add settings
var aiSettings = builder.Configuration.GetSection("AI").Get<AISettings>();
builder.Services.AddSingleton(aiSettings!);

var emailSettings = builder.Configuration.GetSection("Email").Get<EmailSettings>();
// Override with environment variables if they exist
var envPassword = Environment.GetEnvironmentVariable("EMAIL_PASSWORD");
var envUsername = Environment.GetEnvironmentVariable("EMAIL_USERNAME");
var envFromEmail = Environment.GetEnvironmentVariable("EMAIL_FROM_EMAIL");
var envFromName = Environment.GetEnvironmentVariable("EMAIL_FROM_NAME");

Console.WriteLine($"Environment variables - PASSWORD: {(string.IsNullOrEmpty(envPassword) ? "EMPTY" : "SET")}, USERNAME: {envUsername}, FROM_EMAIL: {envFromEmail}");

emailSettings!.FromEmail = envFromEmail ?? emailSettings.FromEmail;
emailSettings.FromName = envFromName ?? emailSettings.FromName;
emailSettings.Username = envUsername ?? emailSettings.Username;
emailSettings.Password = envPassword ?? emailSettings.Password;

Console.WriteLine($"Final email settings - PASSWORD: {(string.IsNullOrEmpty(emailSettings.Password) ? "EMPTY" : "SET")}");
builder.Services.AddSingleton(emailSettings);

// Add memory cache
builder.Services.AddMemoryCache();

// Add services to the container
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IGameService, GameService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IUserCacheService, UserCacheService>();
builder.Services.AddScoped<INetworkGameService, NetworkGameService>();
builder.Services.AddSingleton<INetworkDiscoveryService, NetworkDiscoveryService>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpContextAccessor();

// Configure JWT
var jwtSettings = builder.Configuration.GetSection("JWT").Get<JwtSettings>();
builder.Services.AddSingleton(jwtSettings!);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings!.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
            ClockSkew = TimeSpan.Zero
        };
        
        // Configure JWT for SignalR
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var path = context.HttpContext.Request.Path;
                
                if (path.StartsWithSegments("/gameHub") || path.StartsWithSegments("/networkGameHub"))
                {
                    // First try query parameter
                    var accessToken = context.Request.Query["access_token"];
                    
                    // If not found in query, try Authorization header
                    if (string.IsNullOrEmpty(accessToken))
                    {
                        var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();
                        if (authHeader != null && authHeader.StartsWith("Bearer "))
                        {
                            accessToken = authHeader.Substring("Bearer ".Length).Trim();
                        }
                    }
                    
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        context.Token = accessToken;
                    }
                }
                
                return Task.CompletedTask;
            }
        };
    });

// Add rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.Name ?? context.Request.Headers.Host.ToString(),
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// Add SignalR
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Configure SignalR
app.MapHub<GameHub>("/gameHub");
app.MapHub<NetworkGameHub>("/networkGameHub");

app.Run();
