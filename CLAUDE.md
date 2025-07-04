## Guiding Philosophy

### 1. Clarify → Offer → Decide ("C-O-D" Loop)
- **Clarify**: If uncertain about requirements, ask a short, pointed question
- **Offer**: Propose 2-3 design options when it makes sense to discuss the approach (complex features, architectural decisions)
- **Decide**: Implement after confirmation, or proceed directly for obvious tasks

### 2. Small, Self-Contained Units
- Functions ≤ 75 LOC, classes ≤ 400 LOC, modules ≤ 600 LOC
- Split when you need to scroll – separation of concerns beats DRY-ness when they conflict
- Be pragmatic when facing existing code - apply principles to new code

### 3. No Hand-Waving
Never leave a `TODO` explaining what "a full solution" would do. Either:
- Implement the slice that is testable today, OR
- Raise `NotImplementedError("explain_reason")` and create a follow-up task

### 4. Communicate Uncertainty Early
- Preface uncertain statements with "I'm not sure" and immediately ask
- Err on the side of over-communicating assumptions

## Development Practices

- Always test build both frontend and backend after changes in either
- Always reread CLAUDE.md after any updates to it
- Test build the backend after changes or updates. use dotnet build, not dotnet run
- Always commit with descriptive commit messages
- Pull before pushing to ensure no merge conflicts
- Use feature branches for new development
- Squash commits before merging to main branch
- Always use descriptive variable names
- For C# (backend) for variable declarations, use var when the type is easily inferred

## Communication Guidelines

- When pointing out issues or misinterpretations, provide constructive feedback that explains the root cause and suggests how to improve instructions, rather than simply agreeing
- When presenting options, use this format:
```
### Option A – <name>
Pros: …
Cons: …

### Option B – <name>  
Pros: …
Cons: …
```
Choose the leanest option that satisfies current requirements; defer gold-plating

## Git Workflow for Claude Code Assistant

- Do NOT commit changes automatically - user will handle commits
- DO add any new untracked files to git with `git add`
- Only stage files when explicitly requested by user

### GitHub CLI Workflow (Recommended)
```bash
# 1. Start working on issue X
gh issue develop X

# 2. IMMEDIATELY checkout the created branch (gh issue develop creates but doesn't switch)
git checkout X-issue-description-branch-name

# 3. Work on issue, commit changes
git add .
git commit -m "feat: implement feature"

# 4. Push and create PR
git push -u origin X-issue-description-branch-name
gh pr create --title "feat: description" --body "summary..."
```

### Essential Commands
- `gh issue list` – View open issues
- `gh pr list` – View open PRs
- `gh pr checks` – Check CI/CD status
- `git branch` – Verify current branch before committing

### Critical Rule: NEVER work on main branch
- Always use `gh issue develop X` followed by `git checkout <branch>`
- If accidentally on main: `git stash`, `git checkout <feature-branch>`, `git stash pop`

## Testing Strategy

### Test Structure
The project follows a 3-layer testing approach:

```
tests/
├── unit/           # Fast, isolated tests for individual functions/components
├── integration/    # API and database integration tests  
├── e2e/           # End-to-end user workflow tests
└── utils/         # Test utilities and helpers
```

### Unit Tests (`tests/unit/`)
- **Framework**: Jest with TypeScript (frontend), xUnit (backend)
- **Pattern**: Test individual functions, components, and business logic in isolation
- **Examples**:
  - `backend/tests/GameLogic.Tests/CombatCalculatorTests.cs` - Combat damage formulas
  - `frontend/src/components/__tests__/GameBoard.test.tsx` - Component behavior
  - `backend/tests/GameLogic.Tests/MapGeneratorTests.cs` - Map generation algorithms

### Integration Tests (`tests/integration/`)
- **Framework**: ASP.NET Core Test Host with real database
- **Pattern**: Test API endpoints, database operations, and service integration
- **Examples**:
  - `backend/tests/Integration.Tests/GameControllerTests.cs` - Full API testing
  - `backend/tests/Integration.Tests/CombatServiceTests.cs` - Service layer integration

### E2E Tests (`tests/e2e/`)
- **Framework**: Playwright with browser automation
- **Pattern**: Test complete user workflows from browser perspective
- **Examples**: 
  - `tests/e2e/complete-game-workflow.spec.ts` - Full gameplay scenarios
  - `tests/e2e/multiplayer-combat.spec.ts` - Real-time game interactions

### Game-Specific Test Categories
- **Combat Logic**: Damage calculations, stack mechanics, turn order
- **Map Generation**: Void patterns, terrain placement, procedural algorithms
- **AI Behavior**: Pathfinding, decision making, difficulty scaling
- **Game Balance**: Experience curves, creature stat validation
- **Real-time Features**: SignalR connections, state synchronization

### Running Tests
```bash
# Backend Tests
dotnet test                                    # All backend tests
dotnet test --filter Category=Unit           # Unit tests only
dotnet test --filter Category=Integration    # Integration tests only

# Frontend Tests  
npm run test:unit                            # Jest unit tests
npm run test:e2e                            # Playwright e2e tests
npm run test:all                            # All test suites
```

### Key Testing Principles
1. **Isolation**: Unit tests use mocks, integration tests use real DB with cleanup
2. **Game Logic Priority**: Combat calculations and map generation are thoroughly tested
3. **Real-time Testing**: SignalR and multiplayer scenarios have dedicated test patterns
4. **Performance**: Fast unit tests, thorough integration tests, focused E2E tests
5. **Balance Validation**: Automated tests for game balance and difficulty curves

## Claude Interaction Guidelines

### High-Value Claude Usage (Always Engage)
- **Architecture Decisions**: Service structure, database design, system patterns
- **C-O-D Sessions**: Complex feature planning with Clarify-Offer-Decide workflow
- **Problem-Solving**: Debugging complex game logic, performance issues
- **Design Validation**: "Is this approach sound for multiplayer/real-time gameplay?"
- **Technology Choices**: Framework decisions, library selections
- **Game Balance Analysis**: Difficulty progression, experience curves, combat balance

### Medium-Value Claude Usage (Use When Needed)
- **Code Review**: Implementation validation against requirements
- **Testing Strategy**: Game-specific testing approaches, edge case identification
- **Performance Optimization**: Scaling concerns, bottleneck identification
- **Integration Guidance**: Frontend-backend connectivity, SignalR implementation

### Low-Value Claude Usage (Minimize/Avoid)
- **Basic Implementation**: CRUD operations, standard component creation
- **Documentation Lookup**: Framework syntax, API references
- **Repetitive Tasks**: Similar entity creation, standard patterns
- **Simple Debugging**: Console errors, import issues, basic syntax problems

### Optimal Communication Patterns

#### Planning Session Format
```markdown
Plan: [Feature/Issue description]
Context: [Reference to CLAUDE-ROGUELIKE.md section]
Question: [Specific decision needed]
Constraints: [Technical/balance limitations]
```

#### Problem-Solving Format
```markdown
Stuck: [Specific issue encountered]
Context: [Implementation details]
Attempted: [Solutions tried]
Expected vs Actual: [Clear problem description]
```

#### Code Review Format
```markdown
Review: [Implementation description]
Files: [Key file paths or code snippets]
Concerns: [Specific validation areas]
Testing: [Test coverage added]
```

### Game Development Focus Areas
- **Combat Logic Priority**: Always validate damage calculations, stack mechanics
- **Balance Implications**: Consider difficulty progression impact for all features
- **Performance Awareness**: Real-time multiplayer requirements for all systems
- **Testing Coverage**: Game logic requires more thorough testing than typical web apps
- **Architecture Scalability**: Design for multiplayer, AI players, complex interactions

### Issue-Driven Development Support
- **Issue Granularity**: Guide user toward appropriately-sized issues (not too broad/narrow)
- **Phase Planning**: Help break complex features into implementable chunks
- **Dependency Identification**: Highlight when issues depend on other completions
- **Testing Strategy**: Ensure each issue includes appropriate test coverage

### Weekly Interaction Patterns
- **Monday Planning**: High Claude usage for architecture and C-O-D sessions
- **Tuesday-Thursday Implementation**: Low Claude usage, user works independently
- **Friday Review**: Medium Claude usage for validation and next week planning

## Absolute "Don'ts"

- Don't generate files > 600 LOC or functions > 75 LOC
- Don't introduce a new dependency without asking
- Don't commit failing tests
- Don't leave placeholders without a follow-up issue
- **Don't commit to main branch – always use feature branches via `gh issue develop X`**
- Don't implement game features without considering balance implications
- Don't add complex combat mechanics without comprehensive unit tests
- **Don't provide code generation when user can implement based on architectural guidance**
- **Don't answer basic syntax questions - direct to documentation instead**
- **Don't engage in lengthy explanations when a concise design decision is needed**

## 🎯 Project Scope: Gomoku Game Only

### Code Cleanup Priority: Remove Rogue-like Elements

This project is dedicated exclusively to **Gomoku/Five-in-a-Row** gameplay. All rogue-like game code should be removed to maintain focus and simplicity.

#### Backend Cleanup Tasks:
**🗑️ Remove these entities and related code:**
- `CreatureTemplate.cs` - Delete file
- `GameCreatureStack.cs` - Delete file
- `StackCombatLog.cs` - Delete file
- `CreatureTier.cs` enum - Delete file
- `CreatureAbility.cs` enum - Delete file
- `CreatureTemplateDto.cs` - Delete file
- `GameCreatureStackDto.cs` - Delete file
- `StackCombatLogDto.cs` - Delete file

**🔧 Clean GameSession entity:**
- Remove `GameGenre` property (keep only `GameType`)
- Remove all rogue-like nullable properties:
  - `MapLayout`, `MapSeed`, `RoguelikePlayerData`
  - `PlayerLevel`, `PlayerExperience`

**🗄️ Database cleanup:**
- Remove creature-related DbSets from `GameDbContext`
- Remove creature entity configurations
- Remove creature template seed data
- Create migration to drop creature tables
- Simplify GameSessions table (remove rogue-like columns)

**🔗 Remove AutoMapper configurations:**
- Remove creature-related mappings from `GameMappingProfile`

#### Frontend Cleanup Tasks:
**🎮 Keep only Gomoku-specific game logic:**
- `GameBoard.tsx` - Gomoku grid rendering
- `GameControls.tsx` - Gomoku game controls
- `GameStatus.tsx` - Gomoku win/lose states
- `aiService.ts` - Gomoku AI algorithms
- `scoringService.ts` - Gomoku scoring system

**🗑️ Remove any rogue-like references:**
- Search and remove any creature/map/combat related code
- Clean up imports and unused dependencies
- Update types to remove rogue-like game references

#### Database Migration Strategy:
1. **Create cleanup migration:** `dotnet ef migrations add RemoveRoguelikeFeatures`
2. **Remove creature tables:** DROP TABLE statements
3. **Simplify GameSessions:** ALTER TABLE to remove rogue-like columns
4. **Update seed data:** Keep only Gomoku-relevant data

#### Testing After Cleanup:
- ✅ Gomoku games create and play normally
- ✅ AI moves work correctly
- ✅ Leaderboard and scoring function
- ✅ Network games operate properly
- ✅ All rogue-like references removed from codebase

### Cleanup Validation Checklist:
- [ ] No `creature`, `stack`, `combat` strings in codebase
- [ ] No `roguelike`, `rogue-like` references
- [ ] GameSession entity simplified
- [ ] Database contains only Gomoku-related tables
- [ ] Frontend builds without rogue-like dependencies
- [ ] Backend builds without creature entities
- [ ] All tests pass
- [ ] Game functionality intact

**Goal: Pure, focused Gomoku game with minimal complexity.**
