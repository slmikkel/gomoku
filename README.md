# Gomoku Game

A real-time multiplayer Gomoku (Five in a Row) game built with .NET Core and React.

## Features

### Core Gameplay
- Real-time multiplayer gameplay using SignalR
- User authentication with JWT tokens
- Three game modes: Human vs Human, Human vs AI, AI vs AI
- Configurable board sizes (6×6 to 24×24)
- Two win conditions: 5-in-a-row OR 4-in-a-row with open ends
- Automatic draw detection when no winning moves possible
- Winning row highlighting

### AI System
- Three difficulty levels: Easy, Medium, Hard
- Strategic evaluation with pattern recognition
- Separate AI difficulty settings for AI vs AI mode
- AI reasoning display during gameplay

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
- Comprehensive scoring system with time bonuses, move efficiency, strategy analysis
- Achievement system with unlockable rewards
- Rank progression (Beginner to Legend)
- Fun randomized game starts with messages
- Game statistics and history tracking
- Responsive design for all devices

## Tech Stack

### Backend
- .NET Core 8.0
- Entity Framework Core
- SignalR for real-time communication
- JWT authentication
- SQLite database

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
- SQLite

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Restore dependencies:
   ```
   dotnet restore
   ```

3. Apply database migrations:
   ```
   dotnet run --project src/Game.API --migrate
   ```

4. Run the backend:
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

1. Users register or login to access the game
2. Choose game mode: Human vs Human, Human vs AI, or AI vs AI
3. Configure settings: board size (6×6 to 24×24), AI difficulty, player icons
4. Start game with random player selection or begin immediately
5. Players take turns placing pieces (humans or AIs based on mode)
6. Game ends with traditional win, open-4 win, or draw
7. View scoring breakdown, achievements, and statistics
8. Start new games or adjust settings

## Game Modes

### Human vs Human
Traditional two-player mode with manual piece placement.

### Human vs AI  
Single player against computer opponent with configurable difficulty.

### AI vs AI
Watch two AI opponents battle with separate difficulty settings. No manual input required.

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and receive JWT token

### Game
- `POST /game` - Create a new game (with board size, game mode, AI settings)
- `GET /game/{id}` - Get game details
- `POST /game/{id}/move` - Make a move
- `GET /game` - Get user's game history

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. # CI/CD Test
