export enum GameStatus {
  WaitingForPlayer = 0,
  InProgress = 1,
  Completed = 2,
  Draw = 3
}

export interface GameState {
  id: string
  board: string
  boardSize: number
  status: GameStatus
  player1Id: string
  player2Id: string
  player3Id?: string
  currentPlayerId: string | null
  winnerId: string | null
  moves: GameMove[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface GameMove {
  id: string
  gameId: string
  playerId: string
  row: number
  column: number
  symbol: 'X' | 'O' | 'Triangle'
  createdAt: string
}

export interface PlayerInfo {
  id: string
  username: string
  email?: string
}

export interface GameHistoryItem extends GameState {
  player1Info: PlayerInfo
  player2Info?: PlayerInfo
  player3Info?: PlayerInfo
  gameType: 'Local' | 'AI' | 'Network' | number // Support both string and numeric enum values
  aiDifficulty?: string // "Easy", "Medium", "Hard" for AI games
  playerCount: number // 2 or 3 players
}

export interface PurgeResult {
  deletedCount: number
  deletedGameIds: string[]
  message: string
}

export interface ClearResult {
  deletedCount: number
  message: string
}

export interface PurgePreview {
  incompleteGamesCount: number
  totalGamesCount: number
  incompleteGames: GamePreview[]
}

export interface GamePreview {
  id: string
  createdAt: string
  gameType: string
  boardSize: number
  moveCount: number
} 