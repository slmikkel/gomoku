# Gomoku Game

A pure 3-player Gomoku (Five in a Row) game built with .NET Core and React with AI opponents and multiplayer support.

## Features

### Core Gameplay
- **3-player Gomoku**: Unique three-player variation of the classic game
- Real-time multiplayer gameplay using SignalR
- User authentication with JWT tokens
- Multiple game modes: Local multiplayer, AI opponents, Network games
- Configurable board sizes (6×6 to 24×24) 
- Classic win condition: 5-in-a-row
- Automatic draw detection when no winning moves possible
- Winning row highlighting with visual feedback

### AI System
- **Advanced AI opponents** with multiple difficulty levels
- Minimax algorithm with alpha-beta pruning
- Strategic evaluation with threat detection and pattern recognition
- Dynamic move ordering and position evaluation
- Configurable AI difficulty settings

### Visual Customization
- Light/dark theme switcher
- Three cell size options (Small, Medium, Large)
- 20+ player icon sets across 5 categories:
  - Classic (X & O variants)
  - Symbols (stars, hearts, shields)
  - Emojis (faces, animals, food, sports)
  - Famous Rivals (angel vs devil, hero vs villain, etc.)
  - Nature (sun vs moon, fire vs water)
- Dynamic icon scaling with cell size

### Game Features
- **Random game start**: Fair play with randomized first player selection
- Game history and statistics tracking
- High scores and leaderboards
- Network game lobby system
- Clean, responsive design for all devices
- Real-time game state synchronization

## Tech Stack

### Backend
- .NET Core 8.0
- Entity Framework Core with PostgreSQL
- SignalR for real-time communication  
- JWT authentication with refresh tokens
- Clean architecture with repository pattern
- AutoMapper for object mapping

### Frontend
- React with TypeScript
- Vite for fast development
- Zustand for state management
- Axios for API communication
- Tailwind CSS for styling with dark mode support
- React Router for navigation
- Theme context for light/dark mode switching

## Getting Started

### Prerequisites
- .NET Core 8.0 SDK
- Node.js 18+ and npm
- PostgreSQL 14+

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Restore dependencies:
   ```
   dotnet restore
   ```

3. Set up PostgreSQL database and update connection string in `appsettings.json`

4. Apply database migrations:
   ```
   dotnet ef database update --project src/Game.Infrastructure --startup-project src/Game.API
   ```

5. Run the backend:
   ```
   dotnet run --project src/Game.API
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following content:
   ```
   VITE_API_URL=http://localhost:5114/api
   ```

4. Run the frontend:
   ```
   npm run dev
   ```

## Authentication

The application now includes a complete authentication system:

- User registration with username, email, and password
- User login with email and password
- JWT token-based authentication
- Protected routes that require authentication
- Automatic token handling in API requests
- Session persistence with Zustand's persist middleware

## Game Flow

1. **Authentication**: Users register or login to access the game
2. **Game Creation**: Create local games with AI opponents or join network games
3. **Configuration**: Choose board size (6×6 to 24×24) and AI difficulty settings
4. **Gameplay**: Take turns placing pieces with random starting player selection
5. **Victory**: Game ends when a player achieves 5-in-a-row or board is full (draw)
6. **Statistics**: View game history, scores, and player statistics

## Game Modes

### Local Games
- **Human vs AI**: Play against intelligent computer opponents
- **Local Multiplayer**: Multiple players on the same device

### Network Games  
- **Real-time multiplayer**: Join or host games with other players online
- **Game lobby system**: Browse and join available games

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and receive JWT token

### Game
- `POST /game` - Create a new game (local/AI games)
- `GET /game/{id}` - Get game details
- `POST /game/{id}/move` - Make a move
- `POST /game/{id}/ai/move` - Trigger AI move
- `GET /game` - Get user's game history

### Network Games
- `GET /network` - Get available network games
- `POST /network` - Create a network game
- `POST /network/{id}/join` - Join a network game

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. # CI/CD Test
