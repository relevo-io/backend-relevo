import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

/**
 * API CONFIGURATION
 */

export const apiPort = process.env.PORT || 4000;

/**
 * MONGO CONFIGURATION
 */
export const config = {
  mongoUri: process.env.MONGO_URI,
  logLevel: process.env.LOG_LEVEL || 'info',
  frontendUrl: process.env.FRONTEND_URL,
  apiUrl: process.env.API_URL,
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'LlaveSecretaDefault',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'LlaveRefreshDefault',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '12h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  cookies: {
    refreshName: 'refreshToken',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/'
    }
  },
  pythonService: {
    url: process.env.PYTHON_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.PYTHON_SERVICE_API_KEY || 'default_secret_key'
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  }
};

/**
 * AWS S3 CONFIGURATION
 */
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  bucketName: process.env.AWS_S3_BUCKET_NAME || ''
};

/**
 * PINO LOGGER CONFIGURATION
 * We use 'pino-pretty' in development for readable logs,
 * but in production, it sends structured JSON.
 */

export const logger = pino({
  level: config.logLevel,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  })
});
