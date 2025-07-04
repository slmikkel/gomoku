import { useEffect, useState } from 'react'
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr'
import { useAuth } from './use-auth'

export const useSignalR = () => {
  const [connection, setConnection] = useState<HubConnection | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) {
      if (connection) {
        connection.stop()
        setConnection(null)
      }
      return
    }

    const newConnection = new HubConnectionBuilder()
      .withUrl('http://localhost:5114/gameHub', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build()

    setConnection(newConnection)

    newConnection.start()
      .catch(error => console.error('SignalR Connection Error: ', error))

    return () => {
      newConnection.stop()
    }
  }, [token])

  return { connection }
} 