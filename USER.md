# User Guide: Working with Claude on Game Development

## 🎯 **Optimal User-Claude Interaction Strategy**

This guide outlines how to work most effectively with Claude while developing the rogue-like game, maximizing productivity while minimizing token usage.

## **📋 Issue-Driven Development Workflow**

### **Issue Granularity (Sweet Spot)**
```bash
# ❌ Too Broad
"Implement combat system"

# ❌ Too Granular  
"Add Attack property to CreatureTemplate table"

# ✅ Just Right
"Implement stack-based combat damage calculation"
"Create creature template database schema"
"Add map generation with void cell patterns"
```

### **Phase-to-Issue Breakdown**

#### **Phase 1: Foundation Issues**
```bash
gh issue create --title "Create creature template database schema" --body "Implement CreatureTemplates and GameCreatureStacks tables with HOMM3 stats"
gh issue create --title "Implement map generation with void cell patterns" --body "20x20 grid with irregular shapes via void cells"
gh issue create --title "Add emoji-based asset system" --body "Theme configuration system starting with emojis"
gh issue create --title "Create basic game state management" --body "Extend GameSession for rogue-like mechanics"
gh issue create --title "Implement player movement with movement points" --body "Turn-based movement with point limits"
```

#### **Phase 2: Core Mechanics Issues**
```bash
gh issue create --title "Implement stack-based combat damage calculation" --body "Authentic HOMM3 damage formula with stack mechanics"
gh issue create --title "Add creature stack encounter system" --body "Combat initiation and resolution"
gh issue create --title "Create experience and leveling system" --body "Player progression with stat increases"
gh issue create --title "Implement A* pathfinding for movement" --body "Optimal route calculation for movement points"
gh issue create --title "Add basic AI player behavior" --body "Simple AI decision making and movement"
```

## **🔄 Interaction Efficiency Guide**

### **High Claude Value - Always Use**
- **Architecture decisions**: "How should we structure the combat service?"
- **Design validation**: "Is this approach sound for multiplayer?"
- **Problem-solving**: "Combat calculation giving unexpected results"
- **Technology choices**: "EF Core vs Dapper for this use case?"
- **C-O-D sessions**: Planning phases for complex features

### **Medium Claude Value - Use When Needed**
- **Code review**: "Check this implementation against requirements"
- **Testing strategy**: "How to test this game mechanic?"
- **Performance concerns**: "Will this scale for real-time gameplay?"
- **Integration issues**: "How to connect frontend and backend for this feature?"

### **Low Claude Value - Avoid**
- **Basic implementation**: Writing CRUD operations, simple components
- **Documentation lookup**: Framework-specific syntax questions
- **Repetitive tasks**: Creating similar entities, standard patterns
- **Simple debugging**: Console errors, missing imports

## **📝 Effective Communication Templates**

### **Planning Session Template**
```markdown
Plan: [Feature/Issue description]
Context: [Reference to CLAUDE-ROGUELIKE.md section]
Question: [Specific decision needed]
Constraints: [Technical limitations, game balance considerations]
```

### **Problem-Solving Template**
```markdown
Stuck: [Specific issue encountered]
Context: [What you were implementing]
Attempted: [What you've tried]
Expected: [What should happen]
Actual: [What's happening instead]
```

### **Review Request Template**
```markdown
Review: [Implementation description]
Code: [Key code snippets or file paths]
Concerns: [Specific areas you want validated]
Testing: [What tests you've added]
```

## **⚡ Optimal Weekly Workflow**

### **Monday: Planning & Architecture (High Claude Usage)**
- Review week's focus and upcoming issues
- C-O-D sessions for complex features
- Architecture decisions and design validation

**Example Session:**
```markdown
Plan: This week's focus is combat system. Review approach for issues #6-8.
Reference: CLAUDE-ROGUELIKE.md combat section.
Question: Best service architecture for combat calculations?
```

### **Tuesday-Thursday: Implementation (Low Claude Usage)**
- Implement features based on Monday's planning
- Work independently using agreed designs
- Only consult Claude for genuine blockers

**Workflow:**
```bash
gh issue develop 6
git checkout 6-combat-damage-calculation
# Implement based on agreed design
# Only ask Claude when genuinely stuck
```

### **Friday: Review & Integration (Medium Claude Usage)**
- Code review sessions with Claude
- Integration testing and validation
- Planning next week's priorities

**Example Session:**
```markdown
Review: Combat system implementation complete.
Testing: Unit tests pass, integration tests added.
Question: Ready for PR or any concerns with approach?
```

## **🎮 Game Development Specific Guidelines**

### **Issue Templates to Use**

#### **Combat System Features**
```markdown
## Combat Feature: [Feature Name]

### Context
- Related to HOMM3 combat system
- Stack-based mechanics required
- Must integrate with existing player system

### Acceptance Criteria
- [ ] Authentic HOMM3 damage formula implemented
- [ ] Unit tests cover edge cases
- [ ] Integration tests with game state
- [ ] Performance acceptable for real-time play

### Game Balance Considerations
- How does this affect difficulty progression?
- What are the min/max damage ranges?
- Does this maintain strategic depth?

### Testing Requirements
- Unit tests for damage calculations
- Integration tests with creature stacks
- E2E tests for complete combat flow
```

### **Balance Validation Checklist**
Before completing any combat/progression feature:
- [ ] Damage ranges feel appropriate for game stage
- [ ] Experience gains create meaningful progression
- [ ] AI difficulty scales appropriately
- [ ] Performance maintains real-time responsiveness

## **📊 Success Metrics Per Issue**

### **Definition of Done**
- [ ] **Builds successfully**: Both frontend and backend
- [ ] **Tests pass**: Unit + integration tests
- [ ] **Game balance**: Doesn't break progression
- [ ] **Performance**: Maintains real-time responsiveness
- [ ] **Code quality**: Follows LOC limits (≤75 per function)
- [ ] **Documentation**: Updates CLAUDE-ROGUELIKE.md if needed

### **Quality Gates**
```bash
# Before every commit
npm run build     # Frontend builds
dotnet build      # Backend builds
dotnet test       # All tests pass
```

## **🔄 Issue Development Cycle**

### **1. Issue Creation**
```bash
gh issue create --title "Clear, specific feature" --body "Detailed requirements"
```

### **2. Planning (Claude C-O-D Session)**
```markdown
Plan: Approach for issue #X
Context: [Reference relevant documentation]
Question: [Specific architectural decision needed]
```

### **3. Development Branch**
```bash
gh issue develop X
git checkout X-feature-branch
```

### **4. Implementation (Independent)**
- Code based on agreed design
- Write tests as you go
- Only consult Claude for genuine blockers

### **5. Testing & Review**
```bash
dotnet test                    # Backend tests
npm run test:unit             # Frontend tests
# Optional: Claude review for complex logic
```

### **6. PR Creation**
```bash
gh pr create --title "feat: implement X" --body "Summary of implementation"
```

### **7. Integration & Merge**
- Final integration testing
- Merge to main
- Update documentation if needed

## **💡 Token Optimization Tips**

### **Do This:**
- **Batch questions** into single sessions
- **Reference documentation** (CLAUDE-ROGUELIKE.md) instead of re-explaining context
- **Ask specific questions** rather than open-ended requests
- **Plan thoroughly** upfront to reduce mid-development questions

### **Avoid This:**
- **One-off questions** scattered throughout the day
- **Code generation requests** when you can implement yourself
- **Basic syntax questions** that documentation can answer
- **Repeated context explanations** - use file references

## **🚀 Getting Started Checklist**

### **Week 1 Setup**
- [ ] Read CLAUDE-ROGUELIKE.md completely
- [ ] Create first 3-5 GitHub issues for Phase 1
- [ ] Have initial architecture planning session with Claude
- [ ] Set up development branch workflow
- [ ] Establish testing patterns

### **Ongoing Workflow**
- [ ] Weekly planning sessions (Mondays)
- [ ] Independent implementation (Tue-Thu)
- [ ] Review sessions (Fridays)
- [ ] Document architectural decisions
- [ ] Update CLAUDE-ROGUELIKE.md with changes

---

**Remember: Claude is most valuable for architecture, design decisions, and problem-solving. Use it strategically to maximize development efficiency while maintaining code quality.**