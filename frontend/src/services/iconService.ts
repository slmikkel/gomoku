export interface PlayerIcon {
  id: string
  name: string
  player1: string
  player2: string
  category: 'classic' | 'symbols' | 'emojis' | 'rivals' | 'nature' | 'misc'
}

export const PLAYER_ICONS: PlayerIcon[] = [
  // Classic
  {
    id: 'classic',
    name: 'Classic X & O',
    player1: '✖',
    player2: '⭕',
    category: 'classic'
  },
  
  // Symbols
  {
    id: 'hearts',
    name: 'Blue & Red Hearts',
    player1: '💙',
    player2: '❤️',
    category: 'symbols'
  },
  {
    id: 'diamonds',
    name: 'Diamond & Ruby',
    player1: '💎',
    player2: '♦️',
    category: 'symbols'
  },
  {
    id: 'shields',
    name: 'Blue & Red Shields',
    player1: '🛡️',
    player2: '🔴',
    category: 'symbols'
  },
  
  // Emojis
  {
    id: 'happy-faces',
    name: 'Happy vs Angry',
    player1: '😊',
    player2: '😡',
    category: 'emojis'
  },
  {
    id: 'weathered-faces',
    name: 'Hot vs Frozen',
    player1: '🥵',
    player2: '🥶',
    category: 'emojis'
  },
  {
    id: 'animals',
    name: 'Cat vs Dog',
    player1: '🐱',
    player2: '🐶',
    category: 'emojis'
  },
  {
    id: 'food',
    name: 'Pizza vs Burger',
    player1: '🍕',
    player2: '🍔',
    category: 'emojis'
  },
  {
    id: 'sports',
    name: 'Soccer vs Basketball',
    player1: '⚽',
    player2: '🏀',
    category: 'emojis'
  },
  
  // Famous Rivals
  {
    id: 'good-evil',
    name: 'Angel vs Devil',
    player1: '😇',
    player2: "👹",
    category: 'rivals'
  },
  {
    id: 'cops-robbers',
    name: 'Police vs Thief',
    player1: '👮',
    player2: '🥷',
    category: 'rivals'
  },
  {
    id: 'pirates-navy',
    name: 'Pirate vs Navy',
    player1: '🏴‍☠️',
    player2: '⚓',
    category: 'rivals'
  },
  {
    id: 'wizards',
    name: 'Wizard vs Witch',
    player1: '🧙‍♂️',
    player2: '🧙‍♀️',
    category: 'rivals'
  },
  {
    id: 'superheroes',
    name: 'Hero vs Villain',
    player1: '🦸‍♂️',
    player2: '🦹‍♂️',
    category: 'rivals'
  },
  
  // Nature
  {
    id: 'sun-moon',
    name: 'Sun vs Moon',
    player1: '☀️',
    player2: '🌙',
    category: 'nature'
  },
  {
    id: 'fire-water',
    name: 'Fire vs Water',
    player1: '🔥',
    player2: '💧',
    category: 'nature'
  },
  {
    id: 'day-night',
    name: 'Day vs Night',
    player1: '🌅',
    player2: '🌃',
    category: 'nature'
  },
    
  // Miscellaneous
  {
    id: 'pumpkin-skull',
    name: 'Pumpkin vs Skull',
    player1: '🎃',
    player2: '☠️',
    category: 'misc'
  },
  {
    id: 'zombie-troll',
    name: 'Zombie vs Troll',
    player1: '🧟‍♂️',
    player2: '🧌',
    category: 'misc'
  },
  {
    id: 'horns-punch',
    name: 'Horns vs Punch',
    player1: "🤘",
    player2: "👊",
    category: 'misc'
  },
  {
    id: 'invader-ghost',
    name: 'Invader vs Ghost',
    player1: "👾",
    player2: "👻",
    category: 'misc'
  },
  {
    id: 'norway-sweden',
    name: 'Norway vs Sweden',
    player1: "🇳🇴",
    player2: "🇸🇪",
    category: 'misc'
  },
  {
    id: 'usa-china',
    name: 'USA vs China',
    player1: "🇺🇸",
    player2: "🇨🇳",
    category: 'misc'
  },
  {
    id: 'joystick-floppy',
    name: 'Joystick vs Floppy',
    player1: "🕹",
    player2: "💾",
    category: 'misc'
  },
  {
    id: 'recycle-nuclear',
    name: 'Recycle vs Nuclear',
    player1: "♻️",
    player2: "☢️",
    category: 'misc'
  },
]

export const getIconById = (id: string): PlayerIcon => {
  return PLAYER_ICONS.find(icon => icon.id === id) || PLAYER_ICONS[0]
}

export const getIconsByCategory = (category: string): PlayerIcon[] => {
  return PLAYER_ICONS.filter(icon => icon.category === category)
}

export const ICON_CATEGORIES = [
  { id: 'classic', name: 'Classic', icon: '✕' },
  { id: 'symbols', name: 'Symbols', icon: '⭐' },
  { id: 'emojis', name: 'Emojis', icon: '😊' },
  { id: 'rivals', name: 'Famous Rivals', icon: '😇' },
  { id: 'nature', name: 'Nature', icon: '☀️' },
  { id: 'misc', name: 'Miscellaneous', icon: '☠️' },
]

// Fun random start messages
export const RANDOM_START_MESSAGES = [
  "🎲 Rolling the cosmic dice...",
  "🔮 Consulting the magic 8-ball...",
  "🎯 Spinning the wheel of fate...",
  "⚡ Lightning has chosen...",
  "🎪 The circus master decides...",
  "🎭 The drama unfolds with...",
  "🎨 The artist's brush picks...",
  "🎵 The music starts with...",
  "🚀 Mission control selects...",
  "🏆 The champion coin flip says...",
  "🎊 Party time begins with...",
  "🌟 The stars align for...",
  "🎮 The game gods have spoken...",
  "🎯 Destiny has chosen...",
  "🎪 Ladies and gentlemen..."
]

export const getRandomStartMessage = (): string => {
  return RANDOM_START_MESSAGES[Math.floor(Math.random() * RANDOM_START_MESSAGES.length)]
}

export const getRandomStartPlayer = (): 'X' | 'O' => {
  return Math.random() < 0.5 ? 'X' : 'O'
}

// Extract all individual icons for 3rd player selection
export interface IndividualIcon {
  id: string
  icon: string
  name: string
  category: string
  source: string // which set it came from
}

export const getAllIndividualIcons = (): IndividualIcon[] => {
  const icons: IndividualIcon[] = []
  
  PLAYER_ICONS.forEach(iconSet => {
    // Add player1 icon
    icons.push({
      id: `${iconSet.id}-p1`,
      icon: iconSet.player1,
      name: `${iconSet.name} (Player 1)`,
      category: iconSet.category,
      source: iconSet.id
    })
    
    // Add player2 icon
    icons.push({
      id: `${iconSet.id}-p2`,
      icon: iconSet.player2,
      name: `${iconSet.name} (Player 2)`,
      category: iconSet.category,
      source: iconSet.id
    })
  })
  
  return icons
}

// Get available icons for 3rd player, excluding those used by players 1 & 2
export const getAvailableIconsForThirdPlayer = (excludedIcons: string[]): IndividualIcon[] => {
  const allIcons = getAllIndividualIcons()
  return allIcons.filter(icon => !excludedIcons.includes(icon.icon))
}

