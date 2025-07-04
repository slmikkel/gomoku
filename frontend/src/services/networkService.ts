import { api } from '../lib/api'
import { 
  NetworkGameDto, 
  NetworkGameBroadcastDto, 
  CreateNetworkGameDto, 
  JoinNetworkGameDto,
  UpdatePlayerIconDto 
} from '../types/network'

export class NetworkService {
  static async createNetworkGame(createDto: CreateNetworkGameDto): Promise<NetworkGameDto> {
    const response = await api.post('/networkgame/create', createDto)
    return response.data
  }

  static async joinNetworkGame(joinDto: JoinNetworkGameDto): Promise<NetworkGameDto> {
    const response = await api.post('/networkgame/join', joinDto)
    return response.data
  }

  static async leaveNetworkGame(networkGameId: string): Promise<NetworkGameDto> {
    const response = await api.post(`/networkgame/${networkGameId}/leave`)
    return response.data
  }

  static async getNetworkGame(networkGameId: string): Promise<NetworkGameDto> {
    const response = await api.get(`/networkgame/${networkGameId}`)
    return response.data
  }

  static async getActiveNetworkGames(): Promise<NetworkGameDto[]> {
    const response = await api.get('/networkgame/active')
    return response.data
  }

  static async startNetworkGame(networkGameId: string): Promise<NetworkGameDto> {
    const response = await api.post(`/networkgame/${networkGameId}/start`)
    return response.data
  }

  static async cancelNetworkGame(networkGameId: string): Promise<void> {
    await api.post(`/networkgame/${networkGameId}/cancel`)
  }

  static async discoverGames(timeoutSeconds: number = 10): Promise<NetworkGameBroadcastDto[]> {
    const response = await api.get(`/networkgame/discover?timeoutSeconds=${timeoutSeconds}`)
    return response.data
  }

  static async getUserNetworkGameStatus(): Promise<{ isInNetworkGame: boolean; userId: string }> {
    const response = await api.get('/networkgame/user/status')
    return response.data
  }

  static async getMyNetworkGames(): Promise<NetworkGameDto[]> {
    const response = await api.get('/networkgame/my-games')
    return response.data
  }

  static async deleteNetworkGame(networkGameId: string): Promise<void> {
    await api.delete(`/networkgame/${networkGameId}`)
  }

  static async updatePlayerIcon(updateDto: UpdatePlayerIconDto): Promise<NetworkGameDto> {
    const response = await api.post('/networkgame/update-player-icon', updateDto)
    return response.data
  }
}