using AutoMapper;
using Game.Core.DTOs.Game;
using Game.Core.DTOs.Network;
using Game.Core.DTOs.Player;
using Game.Core.Entities;

namespace Game.Application.Mapping;

public class GameMappingProfile : Profile
{
    public GameMappingProfile()
    {
        CreateMap<GameSession, GameSessionDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Player1Id, opt => opt.MapFrom(src => src.Player1Id))
            .ForMember(dest => dest.Player2Id, opt => opt.MapFrom(src => src.Player2Id))
            .ForMember(dest => dest.Player3Id, opt => opt.MapFrom(src => src.Player3Id))
            .ForMember(dest => dest.WinnerId, opt => opt.MapFrom(src => src.WinnerId))
            .ForMember(dest => dest.CurrentPlayerId, opt => opt.MapFrom(src => src.CurrentPlayerId))
            .ForMember(dest => dest.Board, opt => opt.MapFrom(src => src.Board))
            .ForMember(dest => dest.BoardSize, opt => opt.MapFrom(src => src.BoardSize))
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt))
            .ForMember(dest => dest.StartedAt, opt => opt.MapFrom(src => src.StartedAt))
            .ForMember(dest => dest.CompletedAt, opt => opt.MapFrom(src => src.CompletedAt))
            .ForMember(dest => dest.Moves, opt => opt.MapFrom(src => src.Moves))
            .ForMember(dest => dest.GameType, opt => opt.MapFrom(src => src.GameType));

        CreateMap<GameMove, GameMoveDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.GameId, opt => opt.MapFrom(src => src.GameId))
            .ForMember(dest => dest.PlayerId, opt => opt.MapFrom(src => src.PlayerId))
            .ForMember(dest => dest.Row, opt => opt.MapFrom(src => src.Row))
            .ForMember(dest => dest.Column, opt => opt.MapFrom(src => src.Column))
            .ForMember(dest => dest.Symbol, opt => opt.MapFrom(src => src.Symbol))
            .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt));

        // GameHistory mapping
        CreateMap<GameSession, GameHistoryDto>()
            .IncludeBase<GameSession, GameSessionDto>()
            .ForMember(dest => dest.Player1Info, opt => opt.Ignore()) // Set manually in service
            .ForMember(dest => dest.Player2Info, opt => opt.Ignore()) // Set manually in service  
            .ForMember(dest => dest.Player3Info, opt => opt.Ignore()) // Set manually in service
            .ForMember(dest => dest.GameType, opt => opt.Ignore());   // Set manually in service

        // User to PlayerInfo mapping
        CreateMap<User, PlayerInfoDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.Id))
            .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.Username))
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email));

        // Network game mappings
        CreateMap<NetworkGame, NetworkGameDto>()
            .ForMember(dest => dest.HostUsername, opt => opt.MapFrom(src => src.Host.Username))
            .ForMember(dest => dest.Players, opt => opt.MapFrom(src => src.Players));

        CreateMap<NetworkGamePlayer, NetworkGamePlayerDto>()
            .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User.Username));

    }
} 