import { create } from 'zustand'
import { 
  NetworkGameDto, 
  NetworkGameBroadcastDto, 
  NetworkGameState, 
  NetworkChatMessage,
  NetworkGameStatus 
} from '../types/network'

interface NetworkGameStore extends NetworkGameState {
  // Actions
  setNetworkGame: (game: NetworkGameDto | null) => void
  setDiscoveredGames: (games: NetworkGameBroadcastDto[]) => void
  addDiscoveredGame: (game: NetworkGameBroadcastDto) => void
  removeDiscoveredGame: (gameId: string) => void
  setScanning: (isScanning: boolean) => void
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => void
  setCurrentGameSession: (sessionId: string | null) => void
  addChatMessage: (message: NetworkChatMessage) => void
  clearChatMessages: () => void
  updatePlayerConnection: (userId: string, isConnected: boolean) => void
  updateNetworkGameStatus: (status: NetworkGameStatus) => void
  reset: () => void
}

const initialState: NetworkGameState = {
  networkGame: null,
  discoveredGames: [],
  isScanning: false,
  isConnected: false,
  connectionStatus: 'disconnected',
  currentGameSession: null,
  chatMessages: []
}

export const useNetworkGameStore = create<NetworkGameStore>((set, get) => ({
  ...initialState,

  setNetworkGame: (game) => set({ networkGame: game }),

  setDiscoveredGames: (games) => set({ discoveredGames: games }),

  addDiscoveredGame: (game) => set((state) => {
    const existing = state.discoveredGames.find(g => g.gameId === game.gameId)
    if (existing) {
      // Update existing game
      return {
        discoveredGames: state.discoveredGames.map(g => 
          g.gameId === game.gameId ? game : g
        )
      }
    } else {
      // Add new game
      return {
        discoveredGames: [...state.discoveredGames, game]
      }
    }
  }),

  removeDiscoveredGame: (gameId) => set((state) => ({
    discoveredGames: state.discoveredGames.filter(g => g.gameId !== gameId)
  })),

  setScanning: (isScanning) => set({ isScanning }),

  setConnectionStatus: (status) => set({ 
    connectionStatus: status,
    isConnected: status === 'connected'
  }),

  setCurrentGameSession: (sessionId) => set({ currentGameSession: sessionId }),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),

  clearChatMessages: () => set({ chatMessages: [] }),

  updatePlayerConnection: (userId, isConnected) => set((state) => {
    if (!state.networkGame) return state
    
    return {
      networkGame: {
        ...state.networkGame,
        players: state.networkGame.players.map(player =>
          player.userId === userId
            ? { ...player, isConnected }
            : player
        )
      }
    }
  }),

  updateNetworkGameStatus: (status) => set((state) => {
    if (!state.networkGame) return state
    
    return {
      networkGame: {
        ...state.networkGame,
        status
      }
    }
  }),

  reset: () => set(initialState)
}))