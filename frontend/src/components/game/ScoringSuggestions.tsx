import { useState } from 'react'
import { ScoringService } from '../../services/scoringService'

const ScoringSuggestions = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  const suggestions = ScoringService.getScoringSuggestions()

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors z-50"
        title="View Scoring Ideas"
      >
        💡
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              💡 Scoring System Ideas
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Explore different ways to add depth and engagement to the scoring system
          </p>
        </div>
        
        <div className="flex h-[60vh]">
          {/* Category Sidebar */}
          <div className="w-1/3 border-r border-border p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
              Categories
            </h3>
            <div className="space-y-2">
              {suggestions.map((category, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCategory(selectedCategory === category.category ? null : category.category)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    selectedCategory === category.category
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{category.category}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {category.methods.length} methods
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedCategory ? (
              <div>
                <h3 className="text-xl font-bold mb-4">{selectedCategory}</h3>
                <div className="space-y-4">
                  {suggestions
                    .find(cat => cat.category === selectedCategory)
                    ?.methods.map((method, index) => (
                      <div
                        key={index}
                        className="bg-accent/50 rounded-lg p-4 border-l-4 border-primary"
                      >
                        <div className="font-medium text-foreground mb-2">
                          {method}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getMethodDescription(method)}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2">
                  Select a Category
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Choose a scoring category from the sidebar to explore different 
                  methods for making the game more engaging and competitive.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Implementation Status */}
        <div className="p-4 border-t border-border bg-accent/20">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            ✅ Currently Implemented
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• Time-based scoring with speed bonuses</div>
            <div>• Move efficiency calculations</div>
            <div>• Strategic play analysis (center control, threats, defense)</div>
            <div>• Difficulty and board size multipliers</div>
            <div>• Achievement system with unlockable rewards</div>
            <div>• Rank progression (Beginner → Legend)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    // Time-Based
    "Speed Bonus - Faster wins get higher scores": "Award bonus points for completing games quickly. Ideal time varies by board size and difficulty.",
    "Consistency Bonus - Maintaining steady pace": "Reward players who maintain consistent move timing throughout the game.",
    "Pressure Performance - Playing well under time pressure": "Bonus points for making good moves when time is running low.",
    "Comeback Speed - Quick recovery from disadvantage": "Extra points for rapid improvement after falling behind.",

    // Move Efficiency
    "Minimum Moves Challenge - Win in fewest moves possible": "Special scoring mode that rewards the absolute minimum number of moves to win.",
    "No Wasted Moves - Every move contributes to win": "Analyze each move's contribution to the final victory path.",
    "Threat Creation Rate - Moves that create multiple threats": "Award points for moves that create multiple ways to win simultaneously.",
    "Defense Efficiency - Blocking with minimal moves": "Bonus for defensive moves that block multiple opponent threats.",

    // Strategic Depth
    "Center Control - Dominating the board center": "Points for controlling key central positions that influence the entire board.",
    "Multiple Threat Creation - Setting up multiple win paths": "Advanced strategy bonus for creating simultaneous threats.",
    "Sacrifice Plays - Strategic sacrifices for advantage": "Recognize when players give up material for positional advantage.",
    "Endgame Precision - Perfect execution in final phase": "Bonus for flawless play in the final moves of the game.",

    // Difficulty & Challenge
    "AI Difficulty Multiplier - Higher AI levels = more points": "Scale scoring based on the challenge level of the AI opponent.",
    "Board Size Scaling - Larger boards = complexity bonus": "Larger boards require more strategic thinking and planning.",
    "Handicap Victories - Winning with disadvantages": "Extra points for winning while starting at a disadvantage.",
    "Consecutive Wins Streak - Maintaining win streaks": "Increasing bonuses for maintaining winning streaks over multiple games.",

    // Style & Creativity
    "Pattern Completion - Creating aesthetic patterns": "Bonus points for creating visually appealing winning patterns.",
    "Unique Win Conditions - Novel ways to achieve victory": "Recognition for creative or unusual approaches to winning.",
    "Risk Taking - Bold, aggressive play that pays off": "Reward aggressive strategies that lead to decisive victories.",
    "Comeback Victories - Winning from losing positions": "Major bonuses for dramatic comebacks from near-defeat.",

    // Statistical Performance
    "Win Rate Maintenance - Consistent performance over time": "Long-term scoring based on maintaining high win rates.",
    "Opponent Strength Rating - Beating stronger players": "Bonus points based on the relative skill of your opponent.",
    "Tournament Performance - Special event scoring": "Enhanced scoring during tournament or special event play.",
    "Historical Improvement - Showing growth over time": "Reward players who demonstrate skill improvement over time.",

    // Achievement System
    "Daily Challenges - Specific daily objectives": "Special scoring objectives that change daily to encourage varied play.",
    "Milestone Rewards - Reaching game count milestones": "Bonus points for reaching significant numbers of games played.",
    "Special Conditions - Unique game state achievements": "Rare achievements for unusual or difficult game conditions.",
    "Community Challenges - Server-wide objectives": "Global challenges that the entire player community works toward.",

    // Dynamic Scoring
    "Momentum Shifts - Scoring for dramatic reversals": "Points for dramatic changes in game momentum and position.",
    "Psychological Pressure - Performing in clutch moments": "Bonus for maintaining performance under pressure situations.",
    "Adaptation Bonus - Adjusting strategy mid-game": "Recognition for successfully changing strategy during play.",
    "Innovation Points - Using novel strategies successfully": "Reward creative approaches that haven't been seen before."
  }

  return descriptions[method] || "Innovative scoring method that adds depth and engagement to gameplay."
}

export default ScoringSuggestions