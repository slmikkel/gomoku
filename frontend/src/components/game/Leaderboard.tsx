import { useState, useEffect } from 'react'
import { LeaderboardService, LeaderboardEntry, LeaderboardStats } from '../../services/leaderboardService'

interface LeaderboardProps {
  isOpen: boolean
  onClose: () => void
}

const Leaderboard = ({ isOpen, onClose }: LeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'stats'>('leaderboard')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLeaderboard(LeaderboardService.getLeaderboard())
      setStats(LeaderboardService.getLeaderboardStats())
    }
  }, [isOpen])

  const handleClearLeaderboard = () => {
    LeaderboardService.clearLeaderboard()
    setLeaderboard([])
    setStats(LeaderboardService.getLeaderboardStats())
    setShowClearConfirm(false)
  }

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Legend': return '👑'
      case 'Grandmaster': return '🏆'
      case 'Master': return '🥇'
      case 'Expert': return '🥈'
      case 'Advanced': return '🥉'
      case 'Intermediate': return '⭐'
      case 'Novice': return '🌟'
      default: return '🎯'
    }
  }

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Legend': return 'text-purple-600 dark:text-purple-400'
      case 'Grandmaster': return 'text-yellow-600 dark:text-yellow-400'
      case 'Master': return 'text-orange-600 dark:text-orange-400'
      case 'Expert': return 'text-blue-600 dark:text-blue-400'
      case 'Advanced': return 'text-green-600 dark:text-green-400'
      case 'Intermediate': return 'text-indigo-600 dark:text-indigo-400'
      case 'Novice': return 'text-gray-600 dark:text-gray-400'
      default: return 'text-gray-500 dark:text-gray-500'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              🏆 Leaderboard
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors text-xl"
            >
              ✕
            </button>
          </div>
          
          <div className="flex gap-4 mt-4 justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'leaderboard'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Top Players
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'stats'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Statistics
              </button>
            </div>
            
            {leaderboard.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1 rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'leaderboard' ? (
            <div>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎮</div>
                  <h3 className="text-xl font-semibold mb-2">No Players Yet</h3>
                  <p className="text-muted-foreground">
                    Play some games to appear on the leaderboard!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 50).map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                        index < 3
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-accent/50 border-border hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-[60px]">
                        {index === 0 && <span className="text-2xl">🥇</span>}
                        {index === 1 && <span className="text-2xl">🥈</span>}
                        {index === 2 && <span className="text-2xl">🥉</span>}
                        {index >= 3 && (
                          <span className="text-lg font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{entry.playerName}</span>
                          <span className={`text-sm ${getRankColor(entry.rank)}`}>
                            {getRankIcon(entry.rank)} {entry.rank}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.gamesPlayed} games • {entry.winRate.toFixed(1)}% win rate
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {entry.totalScore.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Best: {entry.bestScore.toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right text-sm text-muted-foreground min-w-[80px]">
                        {formatDate(entry.lastPlayed)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Overall Statistics</h3>
                
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👥</span>
                    <span className="font-medium">Total Players</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {stats?.totalPlayers || 0}
                  </div>
                </div>

                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎮</span>
                    <span className="font-medium">Games Played</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {stats?.totalGames.toLocaleString() || 0}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">Records</h3>
                
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏆</span>
                    <span className="font-medium">Highest Score</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {stats?.topScore.toLocaleString() || 0}
                  </div>
                </div>

                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📊</span>
                    <span className="font-medium">Average Win Rate</span>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {stats?.averageWinRate.toFixed(1) || 0}%
                  </div>
                </div>
              </div>

              {leaderboard.length > 0 && (
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Rank Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['Legend', 'Grandmaster', 'Master', 'Expert', 'Advanced', 'Intermediate', 'Novice', 'Beginner'].map(rank => {
                      const count = leaderboard.filter(entry => entry.rank === rank).length
                      const percentage = ((count / leaderboard.length) * 100).toFixed(1)
                      
                      return (
                        <div key={rank} className="bg-accent/50 rounded-lg p-3 text-center">
                          <div className={`text-lg ${getRankColor(rank)}`}>
                            {getRankIcon(rank)}
                          </div>
                          <div className="text-sm font-medium">{rank}</div>
                          <div className="text-xs text-muted-foreground">
                            {count} ({percentage}%)
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold mb-2">Clear Leaderboard?</h3>
                <p className="text-muted-foreground mb-6">
                  This will permanently delete all player scores and statistics. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-6 py-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearLeaderboard}
                    className="px-6 py-2 rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Leaderboard