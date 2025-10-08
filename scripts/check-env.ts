#!/usr/bin/env tsx

/**
 * Environment variable validation script
 * Ensures all required environment variables are present and valid
 */

const requiredVars = {
  // Database
  DATABASE_URL: 'PostgreSQL connection string',
  
  // JWT
  JWT_ACCESS_SECRET: 'JWT access token secret (min 32 chars)',
  JWT_REFRESH_SECRET: 'JWT refresh token secret (min 32 chars)',
  
  // Redis
  REDIS_URL: 'Redis connection string',
  
  // S3/MinIO
  S3_ENDPOINT: 'S3 endpoint URL',
  S3_ACCESS_KEY: 'S3 access key',
  S3_SECRET_KEY: 'S3 secret key',
  S3_BUCKET: 'S3 bucket name',
  S3_REGION: 'S3 region',
  
  // Optional but recommended
  NODE_ENV: 'Node environment (development/production)',
  LOG_LEVEL: 'Log level (debug/info/warn/error)',
  CORS_ORIGINS: 'Comma-separated CORS origins',
} as const;

const optionalVars = {
  // Security
  SENTRY_DSN: 'Sentry DSN for error tracking',
  
  // Monitoring
  METRICS_ENDPOINT: 'Metrics collection endpoint',
  
  // External services
  EMAIL_SERVICE_URL: 'Email service endpoint',
  PUSH_NOTIFICATION_URL: 'Push notification service endpoint',
} as const;

function validateEnv() {
  console.log('🔍 Checking environment variables...\n');
  
  let hasErrors = false;
  
  // Check required variables
  for (const [key, description] of Object.entries(requiredVars)) {
    const value = process.env[key];
    
    if (!value) {
      console.error(`❌ Missing required environment variable: ${key}`);
      console.error(`   Description: ${description}`);
      hasErrors = true;
    } else {
      // Additional validation for specific variables
      if (key === 'JWT_ACCESS_SECRET' || key === 'JWT_REFRESH_SECRET') {
        if (value.length < 32) {
          console.error(`❌ ${key} must be at least 32 characters long`);
          hasErrors = true;
        } else {
          console.log(`✅ ${key} (${value.length} chars)`);
        }
      } else if (key === 'DATABASE_URL') {
        if (!value.startsWith('postgresql://')) {
          console.error(`❌ ${key} must be a valid PostgreSQL URL`);
          hasErrors = true;
        } else {
          console.log(`✅ ${key}`);
        }
      } else if (key === 'REDIS_URL') {
        if (!value.startsWith('redis://')) {
          console.error(`❌ ${key} must be a valid Redis URL`);
          hasErrors = true;
        } else {
          console.log(`✅ ${key}`);
        }
      } else {
        console.log(`✅ ${key}`);
      }
    }
  }
  
  // Check optional variables
  console.log('\n📋 Optional variables:');
  for (const [key, description] of Object.entries(optionalVars)) {
    const value = process.env[key];
    if (value) {
      console.log(`✅ ${key} (set)`);
    } else {
      console.log(`⚪ ${key} (not set) - ${description}`);
    }
  }
  
  // Security recommendations
  console.log('\n🔒 Security recommendations:');
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_ACCESS_SECRET === 'dev_secret') {
      console.error('❌ Using default JWT secret in production!');
      hasErrors = true;
    }
    
    if (process.env.JWT_REFRESH_SECRET === 'dev_refresh_secret') {
      console.error('❌ Using default refresh secret in production!');
      hasErrors = true;
    }
    
    if (!process.env.SENTRY_DSN) {
      console.log('⚠️  Consider setting SENTRY_DSN for error tracking in production');
    }
  }
  
  // CORS validation
  if (process.env.CORS_ORIGINS) {
    const origins = process.env.CORS_ORIGINS.split(',');
    const hasWildcard = origins.some(origin => origin.includes('*'));
    if (hasWildcard && process.env.NODE_ENV === 'production') {
      console.log('⚠️  Wildcard CORS origins detected in production - consider specific domains');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (hasErrors) {
    console.error('❌ Environment validation failed!');
    console.error('\nPlease fix the errors above and run again.');
    process.exit(1);
  } else {
    console.log('✅ All environment variables are valid!');
    console.log('\n🚀 Ready to start the application.');
  }
}

// Run validation
validateEnv();
