import { create } from 'zustand'

interface AuthState {
  token: string | null
  userId: string | null
  setAuth: (token: string, userId: string) => void
  clearAuth: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  
  setAuth: (token: string, userId: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('userId', userId)
    set({ token, userId })
  },
  
  clearAuth: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    set({ token: null, userId: null })
  }
})) 