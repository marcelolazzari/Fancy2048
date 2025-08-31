# 2048 AI Learning Data Format Specification

## Overview
The AI Learning System uses a structured JSON format to store game history, learned patterns, and strategic insights. This format is designed for incremental learning and long-term strategy evolution.

## File Format: `.2048brain`

### Structure
```json
{
  "version": "1.0.0",
  "created": "2025-08-31T10:30:00.000Z",
  "lastUpdated": "2025-08-31T10:45:00.000Z",
  "games": [...],
  "patterns": {...},
  "moveStats": {...},
  "positionWeights": {...},
  "performance": {...}
}
```

## Data Sections

### 1. Games Array
Stores complete game sessions with move-by-move data:

```json
{
  "id": "1gs7x8k9m2",
  "timestamp": "2025-08-31T10:30:00.000Z",
  "finalScore": 28456,
  "maxTile": 2048,
  "won": true,
  "totalMoves": 324,
  "duration": 180000,
  "efficiency": 87.8,
  "moves": [
    {
      "timestamp": 1725105000000,
      "boardHash": "0000200024000000",
      "move": "up",
      "boardState": [0,0,0,0,2,0,0,0,2,4,0,0,0,0,0,0],
      "resultState": [2,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      "scoreGained": 4,
      "emptyCells": 14,
      "maxTile": 4,
      "boardFillRatio": 0.125
    }
  ]
}
```

### 2. Patterns Object
Learned board patterns and their success rates:

```json
{
  "corners[0,0,0,2048]_maxPos0_empty4_up": {
    "pattern": {
      "corners": [0, 0, 0, 2048],
      "edges": [0, 0, 0, 0],
      "maxTilePosition": 0,
      "emptyCount": 4,
      "tileDensity": 8.2
    },
    "move": "up",
    "successCount": 45,
    "totalCount": 52,
    "averageSuccess": 0.865,
    "weight": 1.432
  }
}
```

### 3. Move Statistics Object
Success rates for specific board positions:

```json
{
  "0000200024000000_up": {
    "move": "up",
    "attempts": 127,
    "successSum": 89.4,
    "averageSuccess": 0.704,
    "confidence": 1.0
  }
}
```

### 4. Position Weights Object
Strategic weights for different board positions:

```json
{
  "pos_0_empty_8_move_left": {
    "position": 0,
    "emptyCount": 8,
    "move": "left",
    "weight": 1.85,
    "samples": 43
  }
}
```

### 5. Performance Metrics
Overall AI performance statistics:

```json
{
  "totalGames": 1247,
  "averageScore": 15643.2,
  "recentAverageScore": 18234.7,
  "maxTileAchieved": 4096,
  "winRate": 0.23,
  "recentWinRate": 0.31,
  "averageGameLength": 287.4,
  "bestGame": {
    "id": "1gs7x8k9m2",
    "finalScore": 85432,
    "maxTile": 4096
  }
}
```

## Learning Algorithms

### 1. Pattern Recognition
- Extracts board features (corners, edges, tile density)
- Creates weighted patterns based on success outcomes
- Updates weights using exponential moving average

### 2. Move Success Analysis
- Tracks success rates for move/board combinations
- Uses confidence intervals based on sample size
- Applies temporal weighting (recent games matter more)

### 3. Strategic Learning
- Analyzes position-based strategies
- Learns corner/edge preferences
- Adapts to different game phases (early/mid/late)

### 4. Performance Optimization
- Maintains rolling averages for recent performance
- Identifies improvement trends
- Balances exploration vs exploitation

## Usage Examples

### Initialize Learning System
```javascript
const learningSystem = new AILearningSystem();
```

### Record Game Moves
```javascript
// During gameplay
learningSystem.recordMove(boardState, 'up', resultState, scoreGained);

// At game end
learningSystem.recordGameEnd(finalScore, maxTile, won, totalMoves);
```

### Get AI Recommendations
```javascript
const recommendations = learningSystem.getLearnedMoveRecommendation(
  boardState, 
  ['up', 'down', 'left', 'right']
);

console.log('Best move:', recommendations[0].move);
console.log('Confidence:', recommendations[0].confidence);
```

### Export/Import Data
```javascript
// Export learning data
learningSystem.exportLearningData(); // Downloads JSON file

// Import learning data
const fileInput = document.getElementById('import-file');
learningSystem.importLearningData(fileInput.files[0]);
```

## Data Management

### Storage Limits
- Maximum 1000 stored games
- Keeps top 30% best games + 70% most recent
- Automatic cleanup of old transposition table entries

### Memory Efficiency
- Board states compressed using base-36 encoding
- Pattern hashing for fast lookups
- Lazy loading of historical data

### Backup & Restore
- JSON export for data portability
- Incremental learning from imported data
- Version compatibility checking

## Learning Metrics

### Success Evaluation Factors
- **Score Gain** (0-1): Points earned from move
- **Empty Cells** (0-1): Board space optimization
- **Max Tile Progress** (0-2): Advancement toward goal
- **Fill Efficiency** (0-1): Board organization improvement

### Weight Update Formula
```
new_weight = old_weight + learning_rate × (target_weight - old_weight)
target_weight = 0.5 + (success_rate × 0.5)
```

### Confidence Calculation
```
confidence = min(1.0, sample_count / 10)
```

## Integration Points

### With Advanced AI Solver
The learning system integrates with `advanced_ai_solver.js` to:
- Bias move selection toward learned patterns
- Adjust heuristic weights based on experience
- Provide confidence metrics for decisions

### With Game Engine
The system hooks into `game.js` to:
- Monitor all player/AI moves
- Track game outcomes and statistics
- Provide real-time learning feedback

### With UI Components
Learning statistics displayed through:
- Performance dashboard
- Strategy recommendations
- Historical game analysis

## File Extensions

### Primary Format: `.2048brain`
Complete learning data with full game history

### Compressed Format: `.2048brain.gz`
Gzipped version for large datasets

### Pattern Export: `.2048patterns.json`
Patterns-only export for strategy sharing

### Statistics Export: `.2048stats.csv`
Performance metrics in spreadsheet format

## Security & Privacy

### Local Storage Only
- No cloud synchronization by default
- User controls all data export/import
- No telemetry or analytics collection

### Data Validation
- JSON schema validation on import
- Sanitization of pattern data
- Version compatibility checks

### Performance Safeguards
- Storage size limits
- Memory usage monitoring  
- Graceful degradation on errors