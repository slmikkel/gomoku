using Game.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Game.Core.Enums;

namespace Game.Infrastructure.Data;

public class GameDbContext : DbContext
{
    // Define a constant for the AI user's ID
    private static readonly Guid AI_USER_ID = new Guid("11111111-1111-1111-1111-111111111111");

    public GameDbContext(DbContextOptions<GameDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<GameSession> GameSessions { get; set; }
    public DbSet<GameMove> GameMoves { get; set; }
    public DbSet<HighScore> HighScores { get; set; } = null!;
    public DbSet<NetworkGame> NetworkGames { get; set; } = null!;
    public DbSet<NetworkGamePlayer> NetworkGamePlayers { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Seed the AI user
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = AI_USER_ID,
            Username = "AI Player",
            Email = "ai@gomoku.com",
            PasswordHash = "AI_PLAYER",
            CreatedAt = DateTime.UtcNow
        });


        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();

            // Configure one-to-many relationships
            entity.HasMany(e => e.GameSessions)
                .WithOne(e => e.Player1)
                .HasForeignKey(e => e.Player1Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.OpponentGameSessions)
                .WithOne(e => e.Player2)
                .HasForeignKey(e => e.Player2Id)
                .OnDelete(DeleteBehavior.Restrict);
                
            entity.HasMany(e => e.Player3GameSessions)
                .WithOne(e => e.Player3)
                .HasForeignKey(e => e.Player3Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.HighScores)
                .WithOne(e => e.User)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GameSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Board).IsRequired();
            entity.Property(e => e.Player1Id).IsRequired();
            entity.Property(e => e.Player2Id).IsRequired(false);
            entity.Property(e => e.Player3Id).IsRequired(false);
            entity.Property(e => e.WinnerId).IsRequired(false);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.StartedAt).IsRequired(false);
            entity.Property(e => e.CompletedAt).IsRequired(false);

            // Configure one-to-many relationship with moves
            entity.HasMany(e => e.Moves)
                .WithOne()
                .HasForeignKey(e => e.GameId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GameMove>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GameId).IsRequired();
            entity.Property(e => e.PlayerId).IsRequired();
            entity.Property(e => e.Row).IsRequired();
            entity.Property(e => e.Column).IsRequired();
            entity.Property(e => e.Symbol)
                .IsRequired()
                .HasConversion<int>();
            entity.Property(e => e.CreatedAt).IsRequired();

            // Configure relationship with User
            entity.HasOne<User>()
                .WithMany()
                .HasForeignKey(e => e.PlayerId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<HighScore>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserId).IsRequired();
            entity.Property(e => e.Wins).IsRequired();
            entity.Property(e => e.Losses).IsRequired();
            entity.Property(e => e.Draws).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
        });

        modelBuilder.Entity<NetworkGame>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.GameName).HasMaxLength(50).IsRequired();
            entity.Property(e => e.HostIpAddress).HasMaxLength(45).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasConversion<int>();
            
            // Configure relationship with Host (User)
            entity.HasOne(e => e.Host)
                .WithMany()
                .HasForeignKey(e => e.HostUserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Configure relationship with GameSession
            entity.HasOne(e => e.GameSession)
                .WithMany()
                .HasForeignKey(e => e.GameSessionId)
                .OnDelete(DeleteBehavior.SetNull);
                
            // Configure one-to-many relationship with NetworkGamePlayer
            entity.HasMany(e => e.Players)
                .WithOne(e => e.NetworkGame)
                .HasForeignKey(e => e.NetworkGameId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NetworkGamePlayer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PlayerSymbol).IsRequired().HasConversion<int>();
            entity.Property(e => e.IsHost).IsRequired();
            entity.Property(e => e.IsConnected).IsRequired();
            
            // Configure relationship with User
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
                
            // Unique constraint: One user per network game
            entity.HasIndex(e => new { e.NetworkGameId, e.UserId }).IsUnique();
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).HasMaxLength(100).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            
            // Configure relationship with User
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
                
            // Index for efficient token lookups
            entity.HasIndex(e => new { e.Token, e.UserId });
            entity.HasIndex(e => e.ExpiresAt);
        });

    }
} 