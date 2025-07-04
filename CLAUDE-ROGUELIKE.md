# Rogue-like Game Design Documentation

## Project Overview
HOMM3-style turn-based rogue-like game built on existing Gomoku infrastructure.
- **Style**: Heroes of Might & Magic 3 aesthetic and mechanics
- **Gameplay**: Turn-based exploration with stack-based combat
- **Architecture**: Reuses existing .NET backend + React frontend + PostgreSQL + SignalR

## Core Architecture Decisions

### 1. Database Schema (Hybrid Approach)
- **Map Storage**: JSON blob for terrain grid + void pattern (~2KB per map)
- **Entities**: Separate tables for queryable data (creatures, items, combat logs)
- **Backward Compatibility**: Existing Gomoku games unaffected
- **Performance**: Single read for map, efficient queries for entities

### 2. Map Generation (Server-Side Cached)
- **Grid**: 32x32 base with void cells creating irregular shapes. Larger grid size choices: 48x48, 64x64
- **Storage**: Base64 encoded void pattern (~50 bytes) + RLE compressed terrain
- **Caching**: Pre-generated void patterns + terrain templates
- **Reproducible**: Seed-based generation for consistency

### 3. Asset System (Configuration-Driven)
- **Progression**: Emoji → SVG → Sprites
- **Client-Side**: Instant theme switching with server preference storage
- **Fallback**: Always degrades gracefully to emoji
- **Extensible**: Easy to add new themes via configuration

## Combat System (HOMM3 Stack-Based)

### Core Mechanics
- **Stacks**: Creatures exist in groups (e.g., "6 Centaurs", "2 Dragons")
- **Authentic Formula**: Exact HOMM3 damage calculation
- **Initiative**: Speed-based turn order with variance
- **Stack Damage**: Damage kills whole creatures, remainder damages next

### HOMM3 Creature Stats Research
```
Primary: Attack, Defense, Min/Max Damage, Health, Speed
Special: Flying, Magic Resistance, Regeneration, Double Strike, No Retaliation
Secondary: Morale (-3 to +3), Luck (-3 to +3)
Advanced: Shots (ranged), Mana Points, Spell Power
```

### Damage Formula (Authentic HOMM3)
```
BaseDamage = Random(MinDamage, MaxDamage)
AttackDefenseRatio = Attacker.Attack / Defender.Defense

If Ratio >= 1:
  FinalDamage = BaseDamage * (1 + 0.05 * (Attack - Defense))
Else:
  FinalDamage = BaseDamage * (1 - 0.025 * (Defense - Attack))

Plus Luck chance for 2x damage
Plus Morale chance for extra turn
```

### Stack-Based Combat Advantages
- **Simpler Implementation**: No individual creature leveling/AI
- **Authentic HOMM3**: True to source material
- **Balanced Encounters**: Stack size determines difficulty
- **Clear Progression**: Player faces larger/stronger stacks as they advance
- **75% Fewer Database Records**: 1 stack vs N individual creatures
- **Strategic Depth**: Commit to full stack combat or retreat
- **Visual Clarity**: "5 Centaurs remaining" vs complex health tracking

### Stack Combat Flow
```typescript
// Combat resolution per stack
function applyStackDamage(stack: CreatureStack, damage: number) {
  const template = stack.template
  const creaturesKilled = Math.floor(damage / template.health)
  const remainderDamage = damage % template.health
  
  stack.currentQuantity -= creaturesKilled
  return creaturesKilled * template.experienceReward
}

// Stack retaliation (all creatures attack)
function calculateStackAttack(stack: CreatureStack, defender: PlayerCharacter): number {
  let totalDamage = 0
  for (let i = 0; i < stack.currentQuantity; i++) {
    totalDamage += calculateDamage(stack.template, defender)
  }
  return totalDamage
}
```

## Database Schema

### Creature Templates
```sql
CREATE TABLE CreatureTemplates (
    Id UUID PRIMARY KEY,
    Name VARCHAR(50),
    Tier INTEGER,                    -- 1-7 (HOMM3 tiers)
    Attack INTEGER,
    Defense INTEGER,
    MinDamage INTEGER,
    MaxDamage INTEGER,
    Health INTEGER,
    Speed INTEGER,
    IsFlying BOOLEAN DEFAULT FALSE,
    MagicResistance INTEGER DEFAULT 0,
    HasRegeneration BOOLEAN DEFAULT FALSE,
    HasDoubleStrike BOOLEAN DEFAULT FALSE,
    HasNoRetaliation BOOLEAN DEFAULT FALSE,
    EmojiIcon VARCHAR(10),
    ExperienceReward INTEGER,
    SpawnWeight INTEGER
);
```

### Game Creature Stacks (Updated for Stack-Based)
```sql
CREATE TABLE GameCreatureStacks (
    Id UUID PRIMARY KEY,
    GameId UUID REFERENCES GameSessions(Id),
    TemplateId UUID REFERENCES CreatureTemplates(Id),
    Position_X INTEGER,
    Position_Y INTEGER,
    
    -- Stack Management
    InitialQuantity INTEGER,         -- Started with
    CurrentQuantity INTEGER,         -- Remaining after damage
    IsDefeated BOOLEAN DEFAULT FALSE,
    
    -- Combat State
    HasActedThisTurn BOOLEAN DEFAULT FALSE,
    MoraleBonus INTEGER DEFAULT 0,
    LuckBonus INTEGER DEFAULT 0,
    
    CreatedAt TIMESTAMP DEFAULT NOW()
);

-- Simplified Combat Logging for Stacks
CREATE TABLE StackCombatLogs (
    Id UUID PRIMARY KEY,
    GameId UUID,
    PlayerCharacterId UUID,
    CreatureStackId UUID,
    
    TurnNumber INTEGER,
    AttackerType VARCHAR(20),        -- 'player' | 'stack'
    Damage INTEGER,
    CreaturesKilled INTEGER,         -- Key metric for stacks
    RemainingInStack INTEGER,
    
    CreatedAt TIMESTAMP DEFAULT NOW()
);
```

### Player Characters
```sql
CREATE TABLE PlayerCharacters (
    Id UUID PRIMARY KEY,
    UserId VARCHAR(450) REFERENCES AspNetUsers(Id),
    GameId UUID REFERENCES GameSessions(Id),
    Level INTEGER DEFAULT 1,
    Experience INTEGER DEFAULT 0,
    Attack INTEGER DEFAULT 5,
    Defense INTEGER DEFAULT 5,
    MinDamage INTEGER DEFAULT 1,
    MaxDamage INTEGER DEFAULT 2,
    MaxHealth INTEGER DEFAULT 25,
    CurrentHealth INTEGER DEFAULT 25,
    Speed INTEGER DEFAULT 10,
    Position_X INTEGER,
    Position_Y INTEGER,
    MovementPointsRemaining INTEGER DEFAULT 3,
    InventoryData JSONB
);
```

## Implementation Strategy

### Phase 1: Foundation (Week 1)
- Database migration with creature templates and stack system
- Basic map generation with void cells
- Emoji-based rendering system

### Phase 2: Core Gameplay (Week 2)
- Stack-based combat implementation
- Player movement with movement points
- Basic creature encounters and experience gain

### Phase 3: Enhancement (Week 3)
- SVG asset system with theme switching
- Advanced creature abilities (flying, regeneration, etc.)
- Inventory and item system

### Phase 4: Polish (Week 4+)
- AI opponent implementation
- Advanced map generation with varied terrain
- Sprite-based graphics and animations

## Technical Notes

### Stack Combat Implementation
```typescript
interface CreatureStack {
  templateId: string
  initialQuantity: number
  currentQuantity: number
  position: { x: number, y: number }
  template: CreatureTemplate
}

// Enhanced stack combat resolution
async function resolveStackCombat(
  player: PlayerCharacter,
  stack: CreatureStack
): Promise<CombatResult> {
  
  while (player.currentHealth > 0 && stack.currentQuantity > 0) {
    // Player attacks stack
    const playerDamage = calculateDamage(player, stack.template)
    const creaturesKilled = applyStackDamage(stack, playerDamage)
    
    if (stack.currentQuantity <= 0) {
      return { 
        winner: 'player', 
        experienceGained: stack.initialQuantity * stack.template.experienceReward,
        creaturesDefeated: stack.initialQuantity
      }
    }
    
    // Stack retaliates (only remaining creatures attack)
    const stackDamage = calculateStackAttack(stack, player)
    player.currentHealth -= stackDamage
    
    if (player.currentHealth <= 0) {
      return { winner: 'stack', experienceGained: 0 }
    }
  }
}

// Stack encounter scaling
const encounterTemplates = {
  early: { type: 'Pixies', quantity: [8, 12] },
  mid: { type: 'Centaurs', quantity: [4, 8] },
  late: { type: 'Dragons', quantity: [1, 3] }
}
```

### Map Void Pattern
```typescript
// 20x20 grid with irregular shape via void cells
interface MapCell {
  x: number
  y: number
  terrain: 'grass' | 'dirt' | 'swamp' | 'rock' | 'water' | 'void'
  isVoid: boolean  // invisible/impassable
  creatureStack?: CreatureStack
  item?: Item
}
```

## Development Guidelines

### Token Optimization
- **Focus**: Architecture decisions and design validation
- **Avoid**: Code generation (implement yourself)
- **Reference**: This document for context instead of re-explaining

### Quality Standards
- **Authenticity**: Stay true to HOMM3 mechanics where possible
- **Simplicity**: Prefer simpler solutions that maintain gameplay quality
- **Extensibility**: Design for future enhancement (graphics, features)
- **Performance**: Optimize for real-time multiplayer experience

---

*This document serves as the authoritative design reference for the rogue-like game project.*