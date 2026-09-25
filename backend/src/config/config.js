require('dotenv').config();

const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',

  // Server
  port: parseInt(process.env.PORT) || 5000,
  host: process.env.HOST || '0.0.0.0',
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_rag',
    options: {
      autoIndex: process.env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'secure-rag',
    audience: process.env.JWT_AUDIENCE || 'secure-rag-users',
    algorithm: 'HS256'
  },

  // Encryption Configuration
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    keyDerivation: process.env.KEY_DERIVATION || 'PBKDF2',
    iterations: parseInt(process.env.ENCRYPTION_ITERATIONS) || 100000,
    keyLength: parseInt(process.env.ENCRYPTION_KEY_LENGTH) || 32,
    saltLength: parseInt(process.env.ENCRYPTION_SALT_LENGTH) || 16,
    ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH) || 16
  },

  // AI Service Configuration
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.AI_SERVICE_MAX_RETRIES) || 3,
    apiKey: process.env.AI_SERVICE_API_KEY || '',
    model: process.env.AI_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS) || 384
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-API-Key',
      'X-MFA-Token',
      'X-Session-ID'
    ]
  },

  // Security Configuration
  security: {
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*', process.env.AI_SERVICE_URL || 'http://localhost:8000', 'https:']
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    xss: true,
    mongoSanitize: true,
    hpp: true
  },

  // Audit Configuration
  audit: {
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 365,
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    enableDetailedLogs: process.env.AUDIT_DETAILED_LOGS === 'true',
    maxLogSize: parseInt(process.env.AUDIT_MAX_LOG_SIZE) || 10000,
    exportLimit: parseInt(process.env.AUDIT_EXPORT_LIMIT) || 10000
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json'
    ],
    uploadDir: process.env.UPLOAD_DIR || 'uploads/'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIR || 'logs/',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10
  },

  // Cache Configuration
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'session-secret-key',
    name: process.env.SESSION_NAME || 'secure_rag_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  },

  // External Services
  services: {
    ollama: {
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      enabled: process.env.REDIS_ENABLED === 'true'
    }
  },

  // API Keys (for service-to-service auth)
  apiKeys: [
    {
      name: 'ai-service',
      key: process.env.AI_SERVICE_API_KEY || 'ai-service-key',
      permissions: ['document:read', 'document:create'],
      isActive: true
    }
  ],

  // Feature Flags
  features: {
    enableMFA: process.env.ENABLE_MFA === 'true',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING === 'true',
    enableCaching: process.env.ENABLE_CACHING === 'true',
    enableStreaming: process.env.ENABLE_STREAMING === 'true'
  }
};

module.exports = config;