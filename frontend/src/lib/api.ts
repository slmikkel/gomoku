import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5114/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add a response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const gameApi = {
  createGame: (isAiGame: boolean, boardSize: number = 8, isLocalGame: boolean = false, startingPlayer?: string) => 
    api.post('/game', { isAiGame, boardSize, isLocalGame, startingPlayer }),
  makeMove: (gameId: string, row: number, col: number) =>
    api.post(`/game/${gameId}/move`, { row, column: col }),
  makeAiMove: (gameId: string) => api.post(`/game/${gameId}/ai/move`),
  getGame: (gameId: string) => api.get(`/game/${gameId}`),
  getGames: () => api.get('/game'),
  joinGame: (gameId: string) => api.post(`/game/${gameId}/join`),
  
  // Game management endpoints
  purgeIncompleteGames: () => api.delete('/game/purge-incomplete'),
  clearAllGames: () => api.delete('/game/clear-all'),
  getPurgePreview: () => api.get('/game/purge-preview'),
}

export { api } 