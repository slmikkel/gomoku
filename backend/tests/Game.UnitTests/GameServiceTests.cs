backend/tests/Game.UnitTests/Services/GameServiceTests.cs:

  using Xunit;
  using Moq;
  using Game.Application.Services;
  using Game.Core.Interfaces;

  namespace Game.UnitTests.Services;

  public class GameServiceTests
  {
      [Fact]
      public async Task CreateGameAsync_ValidInput_ReturnsGameSessionDto()
      {
          // Arrange
          var mockDbContext = new Mock<GameDbContext>();
          var mockMapper = new Mock<IMapper>();
          var gameService = new GameService(mockDbContext.Object, null, mockMapper.Object, null, null);

          // Act & Assert
          // Add your test logic here
      }

      [Fact]
      [Trait("Category", "CreatureTemplate")]
      public void CreatureTemplate_ValidStats_CreatesCorrectly()
      {
          // Test creature template creation
      }
  }

  5. Sample Integration Test

  backend/tests/Game.IntegrationTests/GameControllerTests.cs:

  using Microsoft.AspNetCore.Mvc.Testing;
  using Microsoft.Extensions.DependencyInjection;
  using Xunit;

  namespace Game.IntegrationTests;

  [Trait("Category", "Integration")]
  public class GameControllerTests : IClassFixture<WebApplicationFactory<Program>>
  {
      private readonly WebApplicationFactory<Program> _factory;

      public GameControllerTests(WebApplicationFactory<Program> factory)
      {
          _factory = factory;
      }

      [Fact]
      public async Task GetGame_ReturnsSuccessStatusCode()
      {
          // Arrange
          var client = _factory.CreateClient();

          // Act
          var response = await client.GetAsync("/api/game/test");

          // Assert
          response.EnsureSuccessStatusCode();
      }
  }