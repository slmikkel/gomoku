export enum NetworkGameStatus {
  Waiting = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  Expired = 4
}

export enum PlayerSymbol {
  X = 0,
  O = 1,
  Triangle = 2
}

export interface NetworkGameBroadcastDto {
  gameId: string
  gameName: string
  hostUsername: string
  boardSize: number
  currentPlayers: number
  maxPlayers: number
  status: NetworkGameStatus
  createdAt: string
  lastActivity: string
  signalRPort: number
}

export interface NetworkGamePlayerDto {
  userId: string
  username: string
  playerSymbol: PlayerSymbol
  isHost: boolean
  isConnected: boolean
  joinedAt: string
  playerIcon?: string
}

export interface NetworkGameDto {
  id: string
  gameName: string
  hostUsername: string
  hostIpAddress: string
  boardSize: number
  currentPlayers: number
  maxPlayers: number
  status: NetworkGameStatus
  createdAt: string
  lastActivity: string
  players: NetworkGamePlayerDto[]
}

export interface CreateNetworkGameDto {
  gameName: string
  boardSize: number
  maxPlayers: number
  player1Icon?: string
  player2Icon?: string
  broadcastPort?: number
}

export interface JoinNetworkGameDto {
  networkGameId: string
}

export interface UpdatePlayerIconDto {
  networkGameId: string
  playerIcon: string
}

export interface NetworkGameState {
  networkGame: NetworkGameDto | null
  discoveredGames: NetworkGameBroadcastDto[]
  isScanning: boolean
  isConnected: boolean
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  currentGameSession: string | null
  chatMessages: NetworkChatMessage[]
}

export interface NetworkChatMessage {
  networkGameId: string
  senderId: string
  senderUsername: string
  message: string
  timestamp: string
}