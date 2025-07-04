import { GameScore, ScoreRank } from './scoringService'

export interface LeaderboardEntry {
  id: string
  playerName: string
  totalScore: number
  rank: ScoreRank
  gamesPlayed: number
  gamesWon: number
  winRate: number
  averageScore: number
  bestScore: number
  lastPlayed: Date
  // Future: Add network game stats
  // networkGamesPlayed?: number
  // networkGamesWon?: number
  // opponentsDefeated?: string[]
}

export interface LeaderboardStats {
  totalPlayers: number
  totalGames: number
  averageWinRate: number
  topScore: number
}

export class LeaderboardService {
  private static readonly STORAGE_KEY = 'gomoku_leaderboard'
  private static readonly MAX_ENTRIES = 100

  static getLeaderboard(): LeaderboardEntry[] {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return []
    
    try {
      const entries: LeaderboardEntry[] = JSON.parse(stored)
      return entries.sort((a, b) => b.totalScore - a.totalScore)
    } catch {
      return []
    }
  }

  static addGameResult(playerName: string, gameScore: GameScore, won: boolean, gameMode: string): void {
    const leaderboard = this.getLeaderboard()
    let entry = leaderboard.find(e => e.playerName === playerName)

    if (!entry) {
      entry = {
        id: Date.now().toString(),
        playerName,
        totalScore: 0,
        rank: gameScore.rank,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        averageScore: 0,
        bestScore: 0,
        lastPlayed: new Date()
      }
      leaderboard.push(entry)
    }

    // Update stats
    entry.gamesPlayed++
    if (won) entry.gamesWon++
    entry.totalScore += gameScore.totalScore
    entry.winRate = (entry.gamesWon / entry.gamesPlayed) * 100
    entry.averageScore = entry.totalScore / entry.gamesPlayed
    entry.bestScore = Math.max(entry.bestScore, gameScore.totalScore)
    entry.rank = this.calculateOverallRank(entry.totalScore, entry.gamesPlayed)
    entry.lastPlayed = new Date()

    // Keep only top entries
    const sortedBoard = leaderboard
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, this.MAX_ENTRIES)

    this.saveLeaderboard(sortedBoard)
  }

  private static calculateOverallRank(totalScore: number, gamesPlayed: number): ScoreRank {
    const averageScore = totalScore / gamesPlayed
    
    if (averageScore >= 4000) return ScoreRank.LEGEND
    if (averageScore >= 3000) return ScoreRank.GRANDMASTER
    if (averageScore >= 2500) return ScoreRank.MASTER
    if (averageScore >= 2000) return ScoreRank.EXPERT
    if (averageScore >= 1500) return ScoreRank.ADVANCED
    if (averageScore >= 1000) return ScoreRank.INTERMEDIATE
    if (averageScore >= 500) return ScoreRank.NOVICE
    return ScoreRank.BEGINNER
  }

  private static saveLeaderboard(leaderboard: LeaderboardEntry[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(leaderboard))
  }

  static getPlayerStats(playerName: string): LeaderboardEntry | null {
    const leaderboard = this.getLeaderboard()
    return leaderboard.find(e => e.playerName === playerName) || null
  }

  static getPlayerRanking(playerName: string): number {
    const leaderboard = this.getLeaderboard()
    const index = leaderboard.findIndex(e => e.playerName === playerName)
    return index === -1 ? 0 : index + 1
  }

  static getLeaderboardStats(): LeaderboardStats {
    const leaderboard = this.getLeaderboard()
    
    if (leaderboard.length === 0) {
      return {
        totalPlayers: 0,
        totalGames: 0,
        averageWinRate: 0,
        topScore: 0
      }
    }

    const totalGames = leaderboard.reduce((sum, entry) => sum + entry.gamesPlayed, 0)
    const averageWinRate = leaderboard.reduce((sum, entry) => sum + entry.winRate, 0) / leaderboard.length
    const topScore = Math.max(...leaderboard.map(e => e.bestScore))

    return {
      totalPlayers: leaderboard.length,
      totalGames,
      averageWinRate,
      topScore
    }
  }

  static clearLeaderboard(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static exportLeaderboard(): string {
    return JSON.stringify(this.getLeaderboard(), null, 2)
  }

  static importLeaderboard(data: string): boolean {
    try {
      const entries = JSON.parse(data) as LeaderboardEntry[]
      this.saveLeaderboard(entries)
      return true
    } catch {
      return false
    }
  }
}