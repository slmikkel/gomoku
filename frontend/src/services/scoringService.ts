import { GameMove } from '../types/game'

export interface GameScore {
  totalScore: number
  breakdown: ScoreBreakdown
  rank: ScoreRank
  achievements: Achievement[]
}

export interface ScoreBreakdown {
  timeBonus: number
  moveEfficiency: number
  strategyBonus: number
  difficultyMultiplier: number
  boardSizeBonus: number
  winTypeBonus: number
  consecutiveWins: number
  perfectGameBonus: number
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  unlockedAt: Date
}

export enum ScoreRank {
  BEGINNER = 'Beginner',
  NOVICE = 'Novice', 
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  EXPERT = 'Expert',
  MASTER = 'Master',
  GRANDMASTER = 'Grandmaster',
  LEGEND = 'Legend'
}

export enum WinType {
  FIVE_IN_ROW = 'five_in_row',
  FOUR_OPEN_ENDS = 'four_open_ends',
  FORCED_WIN = 'forced_win',
  TIMEOUT_WIN = 'timeout_win'
}

export interface GameStats {
  gameStartTime: number
  gameEndTime: number
  moves: GameMove[]
  boardSize: number
  aiDifficulty?: string
  winType: WinType
  opponentType: 'human' | 'ai'
}

export class ScoringService {
  private static readonly TIME_BONUS_MAX = 1000
  private static readonly MOVE_EFFICIENCY_MAX = 800
  private static readonly STRATEGY_BONUS_MAX = 600
  private static readonly PERFECT_GAME_BONUS = 500
  
  // Base scoring multipliers
  private static readonly DIFFICULTY_MULTIPLIERS = {
    'easy': 1.0,
    'medium': 1.5,
    'hard': 2.0
  }
  
  private static readonly BOARD_SIZE_MULTIPLIERS = {
    5: 0.8,
    6: 0.9,
    7: 0.95,
    8: 1.0,
    9: 1.1,
    10: 1.2,
    11: 1.3,
    12: 1.4,
    13: 1.5,
    14: 1.6,
    15: 1.7
  }

  static calculateScore(stats: GameStats): GameScore {
    const breakdown: ScoreBreakdown = {
      timeBonus: this.calculateTimeBonus(stats),
      moveEfficiency: this.calculateMoveEfficiency(stats),
      strategyBonus: this.calculateStrategyBonus(stats),
      difficultyMultiplier: this.getDifficultyMultiplier(stats),
      boardSizeBonus: this.getBoardSizeBonus(stats),
      winTypeBonus: this.getWinTypeBonus(stats),
      consecutiveWins: 0, // This would come from game history
      perfectGameBonus: this.calculatePerfectGameBonus(stats)
    }

    const baseScore = breakdown.timeBonus + breakdown.moveEfficiency + 
                     breakdown.strategyBonus + breakdown.perfectGameBonus
    
    const multiplier = breakdown.difficultyMultiplier * breakdown.boardSizeBonus
    const totalScore = Math.round((baseScore + breakdown.winTypeBonus) * multiplier)

    const rank = this.getRank(totalScore)
    const achievements = this.checkAchievements(stats, breakdown)

    return {
      totalScore,
      breakdown,
      rank,
      achievements
    }
  }

  private static calculateTimeBonus(stats: GameStats): number {
    const gameDurationMs = stats.gameEndTime - stats.gameStartTime
    const gameDurationMinutes = gameDurationMs / (1000 * 60)
    
    // Ideal game time varies by board size
    const idealTimeMinutes = stats.boardSize * 0.5 // 0.5 minutes per board size unit
    
    if (gameDurationMinutes <= idealTimeMinutes) {
      return this.TIME_BONUS_MAX
    }
    
    // Exponential decay for longer games
    const timeRatio = idealTimeMinutes / gameDurationMinutes
    return Math.round(this.TIME_BONUS_MAX * Math.pow(timeRatio, 2))
  }

  private static calculateMoveEfficiency(stats: GameStats): number {
    const totalMoves = stats.moves.length
    const minPossibleMoves = 9 // Minimum moves to win (5 for player + 4 for opponent)
    const maxReasonableMoves = stats.boardSize * 2 // Reasonable maximum
    
    if (totalMoves <= minPossibleMoves) {
      return this.MOVE_EFFICIENCY_MAX
    }
    
    const efficiency = Math.max(0, (maxReasonableMoves - totalMoves) / (maxReasonableMoves - minPossibleMoves))
    return Math.round(this.MOVE_EFFICIENCY_MAX * efficiency)
  }

  private static calculateStrategyBonus(stats: GameStats): number {
    let strategyScore = 0
    
    // Analyze move patterns for strategic play
    const centerBonus = this.analyzeCenterControl(stats)
    const threatBonus = this.analyzeThreatCreation(stats)
    const defenseBonus = this.analyzeDefensivePlay(stats)
    
    strategyScore = centerBonus + threatBonus + defenseBonus
    
    return Math.min(strategyScore, this.STRATEGY_BONUS_MAX)
  }

  private static analyzeCenterControl(stats: GameStats): number {
    const center = Math.floor(stats.boardSize / 2)
    const centerMoves = stats.moves.filter(move => 
      Math.abs(move.row - center) <= 1 && Math.abs(move.column - center) <= 1
    )
    
    return Math.min(centerMoves.length * 50, 200)
  }

  private static analyzeThreatCreation(stats: GameStats): number {
    // This would analyze consecutive moves that create threats
    // Simplified version - count moves that extend sequences
    let threatScore = 0
    
    // Award points for building sequences
    for (let i = 1; i < stats.moves.length; i++) {
      const currentMove = stats.moves[i]
      const previousMoves = stats.moves.slice(0, i).filter(m => m.symbol === currentMove.symbol)
      
      // Check if current move extends a line from previous moves
      const extendsLine = this.checkLineExtension(currentMove, previousMoves, stats.boardSize)
      if (extendsLine) {
        threatScore += 30
      }
    }
    
    return Math.min(threatScore, 200)
  }

  private static analyzeDefensivePlay(stats: GameStats): number {
    // Award points for blocking opponent threats
    let defenseScore = 0
    
    for (let i = 1; i < stats.moves.length; i++) {
      const currentMove = stats.moves[i]
      const opponentMoves = stats.moves.slice(0, i).filter(m => m.symbol !== currentMove.symbol)
      
      // Check if current move blocks an opponent line
      const blocksLine = this.checkLineBlocking(currentMove, opponentMoves, stats.boardSize)
      if (blocksLine) {
        defenseScore += 40
      }
    }
    
    return Math.min(defenseScore, 200)
  }

  private static checkLineExtension(move: GameMove, previousMoves: GameMove[], boardSize: number): boolean {
    // Simplified check - look for moves that are adjacent to previous moves of same symbol
    return previousMoves.some(prevMove => {
      const rowDiff = Math.abs(move.row - prevMove.row)
      const colDiff = Math.abs(move.column - prevMove.column)
      return (rowDiff <= 1 && colDiff <= 1) && (rowDiff + colDiff > 0)
    })
  }

  private static checkLineBlocking(move: GameMove, opponentMoves: GameMove[], boardSize: number): boolean {
    // Simplified check - see if move is adjacent to opponent moves
    return opponentMoves.some(oppMove => {
      const rowDiff = Math.abs(move.row - oppMove.row)
      const colDiff = Math.abs(move.column - oppMove.column)
      return (rowDiff <= 1 && colDiff <= 1) && (rowDiff + colDiff > 0)
    })
  }

  private static calculatePerfectGameBonus(stats: GameStats): number {
    // Perfect game: win in minimum moves with optimal strategy
    const totalMoves = stats.moves.length
    const minMovesToWin = 9
    
    if (totalMoves === minMovesToWin && stats.winType === WinType.FIVE_IN_ROW) {
      return this.PERFECT_GAME_BONUS
    }
    
    return 0
  }

  private static getDifficultyMultiplier(stats: GameStats): number {
    if (!stats.aiDifficulty) return 1.0 // Human vs human
    return this.DIFFICULTY_MULTIPLIERS[stats.aiDifficulty as keyof typeof this.DIFFICULTY_MULTIPLIERS] || 1.0
  }

  private static getBoardSizeBonus(stats: GameStats): number {
    return this.BOARD_SIZE_MULTIPLIERS[stats.boardSize as keyof typeof this.BOARD_SIZE_MULTIPLIERS] || 1.0
  }

  private static getWinTypeBonus(stats: GameStats): number {
    switch (stats.winType) {
      case WinType.FIVE_IN_ROW:
        return 100
      case WinType.FOUR_OPEN_ENDS:
        return 150 // More strategic
      case WinType.FORCED_WIN:
        return 200 // Most strategic
      case WinType.TIMEOUT_WIN:
        return 50  // Less impressive
      default:
        return 0
    }
  }

  private static getRank(totalScore: number): ScoreRank {
    if (totalScore >= 5000) return ScoreRank.LEGEND
    if (totalScore >= 4000) return ScoreRank.GRANDMASTER
    if (totalScore >= 3000) return ScoreRank.MASTER
    if (totalScore >= 2000) return ScoreRank.EXPERT
    if (totalScore >= 1500) return ScoreRank.ADVANCED
    if (totalScore >= 1000) return ScoreRank.INTERMEDIATE
    if (totalScore >= 500) return ScoreRank.NOVICE
    return ScoreRank.BEGINNER
  }

  private static checkAchievements(stats: GameStats, breakdown: ScoreBreakdown): Achievement[] {
    const achievements: Achievement[] = []
    
    // Speed achievements
    if (breakdown.timeBonus >= this.TIME_BONUS_MAX * 0.9) {
      achievements.push({
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Complete a game in record time',
        icon: '⚡',
        points: 100,
        unlockedAt: new Date()
      })
    }

    // Efficiency achievements
    if (breakdown.moveEfficiency >= this.MOVE_EFFICIENCY_MAX * 0.9) {
      achievements.push({
        id: 'efficient_winner',
        name: 'Efficient Winner',
        description: 'Win with minimal moves',
        icon: '🎯',
        points: 100,
        unlockedAt: new Date()
      })
    }

    // Strategy achievements
    if (breakdown.strategyBonus >= this.STRATEGY_BONUS_MAX * 0.8) {
      achievements.push({
        id: 'strategic_master',
        name: 'Strategic Master',
        description: 'Demonstrate excellent strategic play',
        icon: '🧠',
        points: 150,
        unlockedAt: new Date()
      })
    }

    // Perfect game achievement
    if (breakdown.perfectGameBonus > 0) {
      achievements.push({
        id: 'perfect_game',
        name: 'Perfect Game',
        description: 'Win in minimum moves with optimal play',
        icon: '🏆',
        points: 500,
        unlockedAt: new Date()
      })
    }

    // Board size achievements
    if (stats.boardSize >= 13) {
      achievements.push({
        id: 'big_board_master',
        name: 'Big Board Master',
        description: 'Win on a 13x13 or larger board',
        icon: '🗺️',
        points: 200,
        unlockedAt: new Date()
      })
    }

    return achievements
  }

  // Additional scoring suggestions
  static getScoringSuggestions(): Array<{category: string, methods: string[]}> {
    return [
      {
        category: "⏱️ Time-Based Scoring",
        methods: [
          "Speed Bonus - Faster wins get higher scores",
          "Consistency Bonus - Maintaining steady pace",
          "Pressure Performance - Playing well under time pressure",
          "Comeback Speed - Quick recovery from disadvantage"
        ]
      },
      {
        category: "🎯 Move Efficiency", 
        methods: [
          "Minimum Moves Challenge - Win in fewest moves possible",
          "No Wasted Moves - Every move contributes to win",
          "Threat Creation Rate - Moves that create multiple threats",
          "Defense Efficiency - Blocking with minimal moves"
        ]
      },
      {
        category: "🧠 Strategic Depth",
        methods: [
          "Center Control - Dominating the board center",
          "Multiple Threat Creation - Setting up multiple win paths",
          "Sacrifice Plays - Strategic sacrifices for advantage", 
          "Endgame Precision - Perfect execution in final phase"
        ]
      },
      {
        category: "💪 Difficulty & Challenge",
        methods: [
          "AI Difficulty Multiplier - Higher AI levels = more points",
          "Board Size Scaling - Larger boards = complexity bonus",
          "Handicap Victories - Winning with disadvantages",
          "Consecutive Wins Streak - Maintaining win streaks"
        ]
      },
      {
        category: "🎨 Style & Creativity",
        methods: [
          "Pattern Completion - Creating aesthetic patterns",
          "Unique Win Conditions - Novel ways to achieve victory",
          "Risk Taking - Bold, aggressive play that pays off",
          "Comeback Victories - Winning from losing positions"
        ]
      },
      {
        category: "📊 Statistical Performance",
        methods: [
          "Win Rate Maintenance - Consistent performance over time",
          "Opponent Strength Rating - Beating stronger players",
          "Tournament Performance - Special event scoring",
          "Historical Improvement - Showing growth over time"
        ]
      },
      {
        category: "🏆 Achievement System",
        methods: [
          "Daily Challenges - Specific daily objectives",
          "Milestone Rewards - Reaching game count milestones",
          "Special Conditions - Unique game state achievements",
          "Community Challenges - Server-wide objectives"
        ]
      },
      {
        category: "⚡ Dynamic Scoring",
        methods: [
          "Momentum Shifts - Scoring for dramatic reversals", 
          "Psychological Pressure - Performing in clutch moments",
          "Adaptation Bonus - Adjusting strategy mid-game",
          "Innovation Points - Using novel strategies successfully"
        ]
      }
    ]
  }
}