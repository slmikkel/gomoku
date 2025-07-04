import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'

interface User {
  id: string
  username: string
  email: string
  createdAt: string
  lastLoginAt: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  lastActivity: number | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  setError: (error: string | null) => void
  updateActivity: () => void
  checkInactivityTimeout: () => void
}

// 1 hour in milliseconds
const INACTIVITY_TIMEOUT = 60 * 60 * 1000

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      lastActivity: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null })
          const response = await api.post('/auth/login', { email, password })
          const { token, user } = response.data
          const now = Date.now()
          set({ user, token, lastActivity: now })
          localStorage.setItem('token', token)
        } catch (error: any) {
          const message = error.response?.data?.error || 'Failed to login'
          set({ error: message })
          throw new Error(message)
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (username: string, email: string, password: string) => {
        try {
          set({ isLoading: true, error: null })
          const response = await api.post('/auth/register', {
            username,
            email,
            password,
            confirmPassword: password,
          })
          const { token, user } = response.data
          const now = Date.now()
          set({ user, token, lastActivity: now })
          localStorage.setItem('token', token)
        } catch (error: any) {
          const message = error.response?.data?.error || 'Failed to register'
          set({ error: message })
          throw new Error(message)
        } finally {
          set({ isLoading: false })
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null, lastActivity: null })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      updateActivity: () => {
        const state = get()
        if (state.token) {
          set({ lastActivity: Date.now() })
        }
      },

      checkInactivityTimeout: () => {
        const state = get()
        if (state.token && state.lastActivity) {
          const now = Date.now()
          const timeSinceLastActivity = now - state.lastActivity
          if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
            // Auto-logout due to inactivity
            localStorage.removeItem('token')
            set({ user: null, token: null, lastActivity: null, error: 'Session expired due to inactivity' })
          }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
) 