using Game.Core.DTOs.Game;
using Game.Core.DTOs.Game.AI;
using Game.Core.DTOs.Game.Requests;
using Game.Core.DTOs.Game.Responses;
using Game.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Game.API.Controllers;

/**
Each endpoint:
- Is protected with [Authorize]
- Has proper error handling
- Returns appropriate HTTP status codes
- Uses DTOs for request/response
- Includes logging
- Validates input
- Extracts user ID from the JWT token
*/
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GameController : ControllerBase
{
    private readonly IGameService _gameService;
    private readonly ILogger<GameController> _logger;
    private readonly ICurrentUserService _currentUserService;

    public GameController(IGameService gameService, ILogger<GameController> logger, ICurrentUserService currentUserService)
    {
        _gameService = gameService;
        _logger = logger;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    public async Task<ActionResult<GameSessionDto>> CreateGame([FromBody] CreateGameDto request)
    {
        try
        {
            if (request.IsAIGame)
            {
                return Ok(await _gameService.CreateAIGameAsync(request.BoardSize, request.StartingPlayer));
            }

            var userId = _currentUserService.GetUserId();
            return Ok(await _gameService.CreateGameAsync(userId, request.BoardSize, request.IsLocalGame, request.StartingPlayer));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating game");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to create game",
                Details = ex.Message
            });
        }
    }

    [HttpPost("{gameId}/join")]
    public async Task<ActionResult<GameSessionDto>> JoinGame(Guid gameId)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var game = await _gameService.JoinGameAsync(gameId, userId);
            return Ok(game);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponseDto { Message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponseDto { Message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining game");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to join game",
                Details = ex.Message
            });
        }
    }

    [HttpGet("{gameId}")]
    public async Task<ActionResult<GameSessionDto>> GetGame(Guid gameId)
    {
        try
        {
            var game = await _gameService.GetGameAsync(gameId);
            return Ok(game);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponseDto { Message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting game");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to get game",
                Details = ex.Message
            });
        }
    }

    [HttpPost("{gameId}/move")]
    public async Task<ActionResult<GameSessionDto>> MakeMove(Guid gameId, [FromBody] MakeMoveDto request)
    {
        try
        {
            var userId = GetUserIdFromToken();
            var game = await _gameService.MakeMoveAsync(gameId, userId, request.Row, request.Column);
            
            // Debug logging to check if GameType is being returned
            _logger.LogInformation("Move API Response: GameType={GameType}, GameId={GameId}", 
                game.GameType, game.Id);
            
            return Ok(game);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponseDto { Message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponseDto { Message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error making move");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to make move",
                Details = ex.Message
            });
        }
    }

    [HttpPost("{gameId}/ai/move")]
    public async Task<ActionResult<GameSessionDto>> MakeAIMove(Guid gameId)
    {
        try
        {
            var game = await _gameService.MakeAIMoveAsync(gameId);
            
            // Debug logging for AI move API response
            _logger.LogInformation("AI Move API Response: Status={Status}, WinnerId={WinnerId}, GameId={GameId}", 
                game.Status, game.WinnerId, game.Id);
            
            return Ok(game);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponseDto { Message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ErrorResponseDto { Message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error making AI move");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to make AI move",
                Details = ex.Message
            });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameHistoryDto>>> GetCurrentUserGames()
    {
        try
        {
            var currentUserId = _currentUserService.GetUserId();
            var games = await _gameService.GetPlayerGameHistoryAsync(currentUserId);
            return Ok(games);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user games");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to get games",
                Details = ex.Message
            });
        }
    }

    [HttpGet("player/{playerId}")]
    public async Task<ActionResult<IEnumerable<GameSessionDto>>> GetPlayerGames(Guid playerId)
    {
        try
        {
            var games = await _gameService.GetPlayerGamesAsync(playerId);
            return Ok(games);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting player games");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to get player games",
                Details = ex.Message
            });
        }
    }

    [HttpDelete("purge-incomplete")]
    public async Task<ActionResult<PurgeResultDto>> PurgeIncompleteGames()
    {
        try
        {
            var currentUserId = _currentUserService.GetUserId();
            var result = await _gameService.PurgeIncompleteGamesAsync(currentUserId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error purging incomplete games");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to purge incomplete games",
                Details = ex.Message
            });
        }
    }

    [HttpDelete("clear-all")]
    public async Task<ActionResult<ClearResultDto>> ClearAllGames()
    {
        try
        {
            var currentUserId = _currentUserService.GetUserId();
            var result = await _gameService.ClearAllGamesAsync(currentUserId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing all games");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to clear all games",
                Details = ex.Message
            });
        }
    }

    [HttpGet("purge-preview")]
    public async Task<ActionResult<PurgePreviewDto>> GetPurgePreview()
    {
        try
        {
            var currentUserId = _currentUserService.GetUserId();
            var preview = await _gameService.GetPurgePreviewAsync(currentUserId);
            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting purge preview");
            return StatusCode(500, new ErrorResponseDto 
            { 
                Message = "Failed to get purge preview",
                Details = ex.Message
            });
        }
    }

    private Guid GetUserIdFromToken()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user token");
        }
        return userId;
    }
} 