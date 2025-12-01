/**
 * Roblox Game Manager - Centralized Configuration
 * Provides secure, environment-based configuration management
 */

require('dotenv').config();

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.GAME_MANAGER_PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 min
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      message: 'Too many requests from this IP'
    }
  },

  // Security Configuration
  security: {
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'roblox-game-system',
      algorithm: 'HS256'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },
    session: {
      secret: process.env.SESSION_SECRET || 'change-this-secret',
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // Database Configuration
  database: {
    postgres: {
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'roblox_game',
      user: process.env.DB_USER || 'roblox_user',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 5,
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        idle: parseInt(process.env.DB_POOL_IDLE) || 30000,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      keyPrefix: process.env.REDIS_PREFIX || 'roblox:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    }
  },

  // Game Management Configuration
  games: {
    directory: process.env.GAMES_DIRECTORY || './games',
    pluginsDirectory: process.env.PLUGINS_DIRECTORY || './plugins',
    assetsDirectory: process.env.ASSETS_DIRECTORY || './assets',
    uploadsDirectory: process.env.UPLOADS_DIRECTORY || './uploads',
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_GAMES) || 10,
    maxPlayersPerGame: parseInt(process.env.MAX_PLAYERS_PER_GAME) || 50,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30 sec
    autoRestart: process.env.AUTO_RESTART === 'true',
    restartDelay: parseInt(process.env.RESTART_DELAY) || 5000
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    directory: process.env.LOG_DIRECTORY || './logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple'
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/json',
      'text/plain'
    ],
    uploadPath: process.env.UPLOAD_PATH || './uploads'
  },

  // Cache Configuration
  cache: {
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL) || 300, // 5 minutes
    checkPeriod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // 10 minutes
    strategies: {
      gameList: { l1: 30, l2: 300 },     // 30s L1, 5min L2
      gameStats: { l1: 60, l2: 600 },    // 1min L1, 10min L2
      playerData: { l1: 120, l2: 3600 }, // 2min L1, 1hour L2
      leaderboard: { l1: 300, l2: 1800 } // 5min L1, 30min L2
    }
  },

  // Monitoring Configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED === 'true',
      port: parseInt(process.env.PROMETHEUS_PORT) || 9090,
      path: process.env.PROMETHEUS_PATH || '/metrics'
    },
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      path: '/health',
      detailed: process.env.DETAILED_HEALTH_CHECK === 'true'
    }
  }
};

// Validate critical configuration
const validateConfig = () => {
  const required = [
    'database.postgres.password',
    'database.redis.password',
    'security.jwt.secret'
  ];

  const warnings = [];

  for (const key of required) {
    const keys = key.split('.');
    let value = config;

    for (const k of keys) {
      value = value[k];
      if (value === undefined || value === null || value === '') {
        warnings.push(`Missing required configuration: ${key}`);
      }
    }
  }

  // Security warnings
  if (config.security.jwt.secret === 'dev-secret-change-in-production') {
    warnings.push('JWT secret is still default - change in production!');
  }

  if (config.server.env === 'production' && config.logging.level === 'debug') {
    warnings.push('Debug logging enabled in production!');
  }

  if (warnings.length > 0) {
    if (config.server.env === 'production') {
      throw new Error(`Configuration validation failed:\n${warnings.join('\n')}`);
    } else {
      console.warn('Configuration warnings:', warnings);
    }
  }
};

// Environment-specific adjustments
const applyEnvironmentAdjustments = () => {
  if (config.server.env === 'production') {
    // Production optimizations
    config.logging.format = 'json';
    config.cache.defaultTTL = 600; // 10 minutes
    config.games.healthCheckInterval = 60000; // 1 minute
  } else if (config.server.env === 'test') {
    // Test optimizations
    config.logging.level = 'error';
    config.database.postgres.pool.max = 2;
    config.cache.defaultTTL = 1;
    config.games.maxConcurrent = 1;
  }
};

// Initialize configuration
applyEnvironmentAdjustments();
validateConfig();

// Export configuration
module.exports = {
  config,
  validateConfig,
  applyEnvironmentAdjustments
};