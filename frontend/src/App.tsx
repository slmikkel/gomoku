import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/toaster'
import Layout from './components/layout/Layout'
import Game from './components/game/Game'
import GameTest from './components/game/GameTest'
import NetworkGame from './components/network/NetworkGame'
import Home from './components/layout/Home'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ForgotPassword from './components/auth/ForgotPassword'
import ResetPassword from './components/auth/ResetPassword'
import ActivityTracker from './components/auth/ActivityTracker'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './contexts/ThemeContext'

const queryClient = new QueryClient()

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <ActivityTracker />
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/test" element={<GameTest />} />
              <Route
                path="/game"
                element={
                  <ProtectedRoute>
                    <Game />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/network"
                element={
                  <ProtectedRoute>
                    <NetworkGame />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/game" replace />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Layout>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
