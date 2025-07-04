using System;

namespace Game.Core.Interfaces;

public interface ICurrentUserService
{
    Guid GetUserId();
} 