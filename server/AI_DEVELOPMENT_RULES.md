# 🤖 AI Development Rules - Roblox Multi-Game-Management-System

## 📋 **Purpose & Scope**

Diese Dokumentation definiert die **AI Development Rules** für das Roblox Multi-Game-Management-System. Sie richtet sich an:
- **AI-Assistenten** (wie ChatGPT, Claude, etc.)
- **Entwickler** die AI-Tools verwenden
- **Code Review Teams**
- **DevOps Engineers**

## 🎯 **Kern-Prinzipien**

### 1. **Security First**
```javascript
// ✅ CORRECT: Environment-based secrets
const config = {
  db: {
    password: process.env.DB_PASSWORD  // From environment
  },
  jwt: {
    secret: process.env.JWT_SECRET     // Never hardcoded
  }
};

// ❌ WRONG: Hardcoded credentials
const config = {
  db: { password: 'hardcoded-password' }
};
```

### 2. **Production Readiness**
```javascript
// ✅ CORRECT: Production checks
if (process.env.NODE_ENV === 'production') {
  require('dotenv').config();
  validateProductionConfig();
} else {
  // Development defaults
}

// ❌ WRONG: Development-only code in production
const config = {
  debug: true  // Should be environment-specific
};
```

### 3. **Error Handling**
```javascript
// ✅ CORRECT: Structured error handling
class RobloxGameError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'RobloxGameError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ✅ CORRECT: Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

---

## 🏗️ **Code Structure Rules**

### **File Organization**
```
src/
├── config/              # Configuration management
│   ├── index.js         # Main config export
│   ├── database.js      # DB-specific config
│   └── security.js      # Security settings
├── controllers/         # Route handlers
├── services/           # Business logic
├── middleware/         # Express middleware
├── models/             # Data models
├── utils/              # Helper functions
├── tests/              # Test files
└── docs/               # Documentation
```

### **Naming Conventions**
```javascript
// ✅ CORRECT: CamelCase for variables/functions
const gameManager = new GameManager();
const playerCount = getPlayerCount();

// ✅ CORRECT: PascalCase for classes
class GameManager {}
class PlayerSession {}

// ✅ CORRECT: SCREAMING_SNAKE_CASE for constants
const MAX_PLAYERS = 50;
const SESSION_TIMEOUT = 3600000;

// ✅ CORRECT: kebab-case for file names
// game-manager.js, player-session.js, database-connection.js
```

### **Module Structure**
```javascript
// ✅ CORRECT: Clear module exports
class GameManager {
  constructor(config) {
    this.config = config;
    this.games = new Map();
  }

  async startGame(gameId) {
    // Implementation
  }
}

// Named exports
module.exports = {
  GameManager,
  validateGameConfig
};

// ✅ CORRECT: Default exports
module.exports = GameManager;
```

---

## 🔐 **Security Rules**

### **Input Validation**
```javascript
// ✅ CORRECT: Comprehensive validation
const Joi = require('joi');

const gameSchema = Joi.object({
  id: Joi.string().alphanum().min(3).max(30).required(),
  name: Joi.string().min(1).max(100).required(),
  maxPlayers: Joi.number().integer().min(1).max(100).default(50),
  category: Joi.string().valid('game', 'educational', 'strategy').required()
});

const validateGameInput = (req, res, next) => {
  const { error, value } = gameSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  req.validatedData = value;
  next();
};
```

### **Authentication & Authorization**
```javascript
// ✅ CORRECT: JWT-based authentication
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Token required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    next(new AuthenticationError('Invalid token'));
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AuthorizationError('Insufficient permissions');
    }
    next();
  };
};
```

### **Rate Limiting**
```javascript
// ✅ CORRECT: Rate limiting for all endpoints
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false
  });
};

app.use('/api/auth', createRateLimiter(15 * 60 * 1000, 5)); // 5 requests per 15 min
app.use('/api/games', createRateLimiter(15 * 60 * 1000, 100)); // 100 requests per 15 min
```

---

## ⚡ **Performance Rules**

### **Database Optimization**
```javascript
// ✅ CORRECT: Connection pooling
const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      max: 20,
      idleTimeoutMillis: 30000
    });
  }

  async query(text, params) {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('Slow query detected', { text, duration });
    }

    return result;
  }
}

// ✅ CORRECT: Efficient queries
async function getPlayerStats(playerId) {
  // Bad: Multiple queries
  // const player = await db.query('SELECT * FROM players WHERE id = ?', [playerId]);
  // const stats = await db.query('SELECT * FROM stats WHERE player_id = ?', [playerId]);

  // Good: Single optimized query
  return await db.query(`
    SELECT
      p.*,
      s.total_games,
      s.wins,
      s.losses,
      s.total_score
    FROM players p
    LEFT JOIN stats s ON p.id = s.player_id
    WHERE p.id = $1
  `, [playerId]);
}
```

### **Caching Strategy**
```javascript
// ✅ CORRECT: Multi-level caching
class CacheManager {
  async get(key) {
    // L1: In-memory cache
    let value = this.l1Cache.get(key);
    if (value) return value;

    // L2: Redis cache
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        value = JSON.parse(cached);
        this.l1Cache.set(key, value, 300); // 5 min
        return value;
      }
    } catch (error) {
      logger.warn('Redis cache error', error);
    }

    return null;
  }
}
```

### **Memory Management**
```javascript
// ✅ CORRECT: Proactive memory management
class MemoryManager {
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (heapUsedMB > 400) {
      logger.warn('High memory usage', { heapUsedMB });
      // Trigger cleanup
      this.cleanup();
    }
  }

  cleanup() {
    // Clear caches
    cacheManager.clearExpired();
    // Close old connections
    connectionManager.cleanupIdle();
    // Force GC
    if (global.gc) global.gc();
  }
}
```

---

## 🧪 **Testing Rules**

### **Test Structure**
```javascript
// ✅ CORRECT: Comprehensive test structure
describe('GameManager', () => {
  let gameManager;

  beforeEach(() => {
    gameManager = new GameManager(testConfig);
  });

  describe('startGame', () => {
    it('should start a valid game', async () => {
      // Arrange
      const gameId = 'test-game';
      const gameConfig = { name: 'Test Game', maxPlayers: 10 };

      // Act
      const result = await gameManager.startGame(gameId, gameConfig);

      // Assert
      expect(result).toBeDefined();
      expect(result.gameId).toBe(gameId);
      expect(gameManager.getGame(gameId)).toBeDefined();
    });

    it('should throw error for invalid game config', async () => {
      // Test error cases
      await expect(
        gameManager.startGame('invalid-id', {})
      ).rejects.toThrow(RobloxGameError);
    });
  });
});
```

### **Mocking & Stubbing**
```javascript
// ✅ CORRECT: Proper mocking
const mockDatabase = {
  query: jest.fn(),
  transaction: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDatabase.query.mockResolvedValue({ rows: [] });
});

it('should handle database errors', async () => {
  mockDatabase.query.mockRejectedValue(new Error('Database connection failed'));

  await expect(gameManager.getGameStats('123'))
    .rejects.toThrow('Database connection failed');
});
```

---

## 📊 **Logging Rules**

### **Structured Logging**
```javascript
// ✅ CORRECT: Structured logging
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.metadata()
  ),
  defaultMeta: {
    service: 'roblox-game-system',
    environment: config.server.env
  }
});

// ✅ CORRECT: Contextual logging
const contextualLogger = new ContextualLogger(logger);
contextualLogger.setContext({ gameId: '123', userId: '456' });
contextualLogger.info('Game started', { action: 'start_game' });
```

### **Log Levels**
```javascript
// ✅ CORRECT: Appropriate log levels
logger.error('Critical system error', { error: error.message, stack: error.stack });
logger.warn('High memory usage detected', { heapUsed: '450MB' });
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.debug('Database query executed', { query: 'SELECT * FROM users', duration: '45ms' });
```

---

## 🔧 **Configuration Management**

### **Environment Variables**
```javascript
// ✅ CORRECT: Environment-based configuration
const config = {
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true'
  }
};

// ✅ CORRECT: Configuration validation
const validateConfig = () => {
  const required = ['database.password', 'jwt.secret'];
  for (const key of required) {
    if (!getNestedValue(config, key)) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
};
```

### **Secrets Management**
```javascript
// ✅ CORRECT: Secure secret handling
const fs = require('fs');

// Load from secure storage in production
if (process.env.NODE_ENV === 'production') {
  config.jwt.secret = fs.readFileSync('/secrets/jwt-secret', 'utf8').trim();
} else {
  config.jwt.secret = process.env.JWT_SECRET || 'dev-secret';
}
```

---

## 🐳 **Docker Rules**

### **Multi-stage Builds**
```dockerfile
# ✅ CORRECT: Multi-stage build for security
FROM node:18-alpine AS builder

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Runtime stage
FROM node:18-alpine AS runtime

# Security: Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

### **Security Best Practices**
```dockerfile
# ✅ CORRECT: Security-hardened container
FROM node:18-alpine

# Security: No unnecessary packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Security: Read-only filesystem
COPY --chown=nodejs:nodejs app/ /app/
USER nodejs

# Security: Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "app/index.js"]
```

---

## 🚀 **Deployment Rules**

### **CI/CD Pipeline**
```yaml
# ✅ CORRECT: Comprehensive CI/CD
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
```

### **Environment-Specific Configs**
```bash
# ✅ CORRECT: Environment-specific deployments
# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Development
docker-compose up -d
```

---

## 📝 **Documentation Rules**

### **Code Comments**
```javascript
// ✅ CORRECT: Meaningful comments
/**
 * Starts a game instance with the given configuration
 * @param {string} gameId - Unique identifier for the game
 * @param {Object} gameConfig - Game configuration object
 * @param {string} gameConfig.name - Display name of the game
 * @param {number} gameConfig.maxPlayers - Maximum number of players
 * @returns {Promise<GameInstance>} Resolves with game instance
 * @throws {ValidationError} If game configuration is invalid
 */
async startGame(gameId, gameConfig) {
  // Implementation
}
```

### **README Structure**
```markdown
# ✅ CORRECT: Comprehensive README
## Overview
Brief description of the system

## Features
- Feature 1 with description
- Feature 2 with description

## Installation
```bash
# Step-by-step installation
```

## Configuration
```bash
# Environment configuration
```

## API Documentation
```javascript
// API endpoint examples
```

## Development
```bash
# Development setup
```

## Deployment
```bash
# Production deployment
```

## Testing
```bash
# Running tests
```
```

---

## ⚠️ **Anti-Patterns to Avoid**

### **Security Anti-Patterns**
```javascript
// ❌ WRONG: Hardcoded secrets
const jwtSecret = 'super-secret-key';

// ❌ WRONG: No input validation
app.post('/games', (req, res) => {
  const game = req.body; // No validation!
  // Process game...
});

// ❌ WRONG: SQL injection vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

### **Performance Anti-Patterns**
```javascript
// ❌ WRONG: N+1 query problem
for (const player of players) {
  const stats = await db.query('SELECT * FROM stats WHERE player_id = ?', [player.id]);
  player.stats = stats;
}

// ❌ WRONG: Blocking operations
const data = fs.readFileSync('/large/file.json'); // Blocks event loop
```

### **Error Handling Anti-Patterns**
```javascript
// ❌ WRONG: Silent failures
try {
  await someOperation();
} catch (error) {
  // No error handling!
}

// ❌ WRONG: Generic error handling
catch (error) {
  console.log('Error!'); // Not specific enough
}
```

---

## 🔄 **Review Process**

### **Code Review Checklist**
- [ ] **Security**: No hardcoded secrets, proper validation
- [ ] **Performance**: Efficient queries, proper caching
- [ ] **Error Handling**: Comprehensive error handling
- [ ] **Testing**: Unit tests for new functionality
- [ ] **Documentation**: Code comments and README updates
- [ ] **Standards**: Follows established conventions
- [ ] **Monitoring**: Proper logging and metrics

### **AI-Assist Guidelines**
```markdown
# When AI provides code, verify:
1. Security best practices are followed
2. Error handling is comprehensive
3. Performance optimizations are implemented
4. Tests are included
5. Documentation is updated
6. Configuration is environment-based
```

---

**📅 Last Updated**: 2025-12-01
**📋 Version**: 1.0.0
**👥 Maintained By**: Roblox Game Development Team