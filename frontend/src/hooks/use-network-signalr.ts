import { useEffect, useRef, useState } from 'react'
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useAuthStore } from '../store/authStore'
import { NetworkGameDto, NetworkChatMessage } from '../types/network'

interface NetworkSignalRCallbacks {
  onPlayerConnected?: (networkGameId: string, userId: string) => void
  onPlayerDisconnected?: (networkGameId: string, userId: string) => void
  onPlayerReconnected?: (networkGameId: string, userId: string) => void
  onNetworkGameStarted?: (networkGame: NetworkGameDto) => void
  onNetworkGameMoveMade?: (networkGameId: string, gameState: any, playerId: string, row: number, column: number) => void
  onNetworkGameCompleted?: (networkGameId: string, winnerId: string | null, finalStatus: any) => void
  onNetworkGameChatMessage?: (message: NetworkChatMessage) => void
  onNetworkGameStateSync?: (networkGameId: string, gameState: any) => void
  onNetworkGamePlayerJoined?: (networkGameId: string, player: any) => void
  onNetworkGamePlayerLeft?: (networkGameId: string, userId: string) => void
  onNetworkGameCancelled?: (networkGameId: string, reason: string) => void
}

export const useNetworkSignalR = (callbacks: NetworkSignalRCallbacks = {}) => {
  const [connection, setConnection] = useState<HubConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token } = useAuthStore()
  const callbacksRef = useRef(callbacks)

  // Update callbacks ref when callbacks change
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!token) return

    // Close existing connection if any
    if (connection) {
      console.log('🔌 [SignalR] Closing existing connection before creating new one')
      connection.stop()
      setConnection(null)
      setIsConnected(false)
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5114'}/networkGameHub`, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000]) // Custom retry delays
      .configureLogging(LogLevel.Warning) // Reduce log noise
      .build()

    // Set up event listeners
    newConnection.on('PlayerConnectedToRoom', (networkGameId: string, userId: string) => {
      console.log('🔗 [SignalR] PlayerConnectedToRoom event received:', { networkGameId, userId })
      callbacksRef.current.onPlayerConnected?.(networkGameId, userId)
    })

    newConnection.on('PlayerDisconnectedFromRoom', (networkGameId: string, userId: string) => {
      console.log('🔌 [SignalR] PlayerDisconnectedFromRoom event received:', { networkGameId, userId })
      callbacksRef.current.onPlayerDisconnected?.(networkGameId, userId)
    })

    newConnection.on('PlayerReconnectedToRoom', (networkGameId: string, userId: string) => {
      callbacksRef.current.onPlayerReconnected?.(networkGameId, userId)
    })

    newConnection.on('NetworkGameStarted', (networkGame: NetworkGameDto) => {
      callbacksRef.current.onNetworkGameStarted?.(networkGame)
    })

    newConnection.on('NetworkGameMoveMade', (networkGameId: string, gameState: any, playerId: string, row: number, column: number) => {
      callbacksRef.current.onNetworkGameMoveMade?.(networkGameId, gameState, playerId, row, column)
    })

    newConnection.on('NetworkGameCompleted', (networkGameId: string, winnerId: string | null, finalStatus: any) => {
      callbacksRef.current.onNetworkGameCompleted?.(networkGameId, winnerId, finalStatus)
    })

    newConnection.on('NetworkGameChatMessage', (networkGameId: string, senderId: string, senderUsername: string, message: string, timestamp: string) => {
      const chatMessage: NetworkChatMessage = {
        networkGameId,
        senderId,
        senderUsername,
        message,
        timestamp
      }
      callbacksRef.current.onNetworkGameChatMessage?.(chatMessage)
    })

    newConnection.on('NetworkGameStateSync', (networkGameId: string, gameState: any) => {
      callbacksRef.current.onNetworkGameStateSync?.(networkGameId, gameState)
    })

    newConnection.on('NetworkGamePlayerJoined', (networkGameId: string, player: any) => {
      console.log('🎯 [SignalR] NetworkGamePlayerJoined event received:', { networkGameId, player })
      console.log('🎯 [SignalR] Available callback:', !!callbacksRef.current.onNetworkGamePlayerJoined)
      callbacksRef.current.onNetworkGamePlayerJoined?.(networkGameId, player)
    })

    newConnection.on('NetworkGamePlayerLeft', (networkGameId: string, userId: string) => {
      callbacksRef.current.onNetworkGamePlayerLeft?.(networkGameId, userId)
    })

    newConnection.on('NetworkGameCancelled', (networkGameId: string, reason: string) => {
      callbacksRef.current.onNetworkGameCancelled?.(networkGameId, reason)
    })

    newConnection.start()
      .then(() => {
        console.log('🔌 [SignalR] Connected to NetworkGameHub')
        console.log('🔌 [SignalR] Connection ID:', newConnection.connectionId)
        console.log('🔌 [SignalR] User token present:', !!token)
        setIsConnected(true)
      })
      .catch((error) => {
        console.error('❌ [SignalR] Failed to connect to NetworkGameHub:', error)
        setIsConnected(false)
        // Don't manually retry - let withAutomaticReconnect handle it
      })

    newConnection.onreconnected(() => {
      console.log('🔄 [SignalR] Reconnected to NetworkGameHub')
      setIsConnected(true)
    })

    newConnection.onreconnecting(() => {
      console.log('🔄 [SignalR] Reconnecting to NetworkGameHub...')
      setIsConnected(false)
    })

    newConnection.onclose((error) => {
      console.log('🔌 [SignalR] Disconnected from NetworkGameHub', error ? `Error: ${error}` : '')
      setIsConnected(false)
    })

    setConnection(newConnection)

    return () => {
      console.log('🔌 [SignalR] Cleaning up connection')
      newConnection.stop()
    }
  }, [token])

  const joinNetworkGameRoom = async (networkGameId: string) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('JoinNetworkGameRoom', networkGameId)
      } catch (error) {
        console.error('Failed to join network game room:', error)
        throw error
      }
    }
  }

  const leaveNetworkGameRoom = async (networkGameId: string) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('LeaveNetworkGameRoom', networkGameId)
      } catch (error) {
        console.error('Failed to leave network game room:', error)
      }
    }
  }

  const startNetworkGame = async (networkGameId: string) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('StartNetworkGame', networkGameId)
      } catch (error) {
        console.error('Failed to start network game:', error)
        throw error
      }
    }
  }

  const sendNetworkGameMove = async (networkGameId: string, row: number, column: number) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('SendNetworkGameMove', networkGameId, row, column)
      } catch (error) {
        console.error('Failed to send network game move:', error)
        throw error
      }
    }
  }

  const sendNetworkGameChatMessage = async (networkGameId: string, message: string) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('SendNetworkGameChatMessage', networkGameId, message)
      } catch (error) {
        console.error('Failed to send chat message:', error)
        throw error
      }
    }
  }

  const requestNetworkGameReconnect = async (networkGameId: string) => {
    if (connection && isConnected) {
      try {
        await connection.invoke('RequestNetworkGameReconnect', networkGameId)
      } catch (error) {
        console.error('Failed to request reconnect:', error)
        throw error
      }
    }
  }

  return {
    connection,
    isConnected,
    joinNetworkGameRoom,
    leaveNetworkGameRoom,
    startNetworkGame,
    sendNetworkGameMove,
    sendNetworkGameChatMessage,
    requestNetworkGameReconnect
  }
}