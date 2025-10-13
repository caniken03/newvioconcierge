import { createClient } from 'redis';
import type { IStorage } from '../storage';

export interface LoginAttempt {
  timestamp: number;
  ip: string;
  userAgent?: string;
}

export interface AccountLockout {
  lockedUntil: number;
  attemptCount: number;
  lastAttemptIp: string;
}

export interface RateLimitResult {
  allowed: boolean;
  attemptsRemaining?: number;
  resetTime?: number;
  lockoutUntil?: number;
}

interface RateLimitConfig {
  MAX_ATTEMPTS_PER_EMAIL: number;
  MAX_ATTEMPTS_PER_IP: number;
  TIME_WINDOW_MS: number;
  LOCKOUT_DURATION_MS: number;
  MAX_LOCKOUT_DURATION_MS: number;
}

class RedisRateLimiter {
  private client;
  private isConnected = false;
  private storage: IStorage | null = null;
  
  // Default security configuration (used as fallback)
  private config: RateLimitConfig = {
    MAX_ATTEMPTS_PER_EMAIL: 5,
    MAX_ATTEMPTS_PER_IP: 10,
    TIME_WINDOW_MS: 15 * 60 * 1000,
    LOCKOUT_DURATION_MS: 30 * 60 * 1000,
    MAX_LOCKOUT_DURATION_MS: 24 * 60 * 60 * 1000,
  };

  // Cache for settings with TTL
  private settingsCache: RateLimitConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 60 * 1000; // 1 minute cache
  private lastKnownGoodConfig: RateLimitConfig | null = null;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected for distributed rate limiting');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
    });

    this.client.on('end', () => {
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  setStorage(storage: IStorage): void {
    this.storage = storage;
  }

  invalidateCache(): void {
    this.settingsCache = null;
    this.cacheTimestamp = 0;
  }

  private async loadSettings(): Promise<void> {
    // Check if cache is still valid
    const now = Date.now();
    if (this.settingsCache && (now - this.cacheTimestamp) < this.CACHE_TTL_MS) {
      this.config = this.settingsCache;
      return;
    }

    if (!this.storage) {
      return; // Use default config
    }

    try {
      const settings = await this.storage.getAbuseProtectionSettings();
      if (settings) {
        const newConfig: RateLimitConfig = {
          MAX_ATTEMPTS_PER_EMAIL: settings.maxAttemptsEmail,
          MAX_ATTEMPTS_PER_IP: settings.maxAttemptsIP,
          TIME_WINDOW_MS: settings.timeWindowMinutes * 60 * 1000,
          LOCKOUT_DURATION_MS: settings.lockoutDurationMinutes * 60 * 1000,
          MAX_LOCKOUT_DURATION_MS: 24 * 60 * 60 * 1000, // Keep max at 24 hours
        };
        
        // Update config and cache
        this.config = newConfig;
        this.settingsCache = newConfig;
        this.cacheTimestamp = now;
        this.lastKnownGoodConfig = newConfig;
      }
    } catch (error) {
      console.error('Failed to load abuse protection settings:', error);
      
      // Use last known good config as fallback
      if (this.lastKnownGoodConfig) {
        console.log('Using last known good configuration');
        this.config = this.lastKnownGoodConfig;
        this.settingsCache = this.lastKnownGoodConfig;
        this.cacheTimestamp = now;
      } else {
        console.log('Using default configuration');
        // Keep default config
      }
    }
  }

  private getKeys(identifier: string, type: 'email' | 'ip') {
    return {
      attempts: `rate_limit:${type}:${identifier}:attempts`,
      lockout: `rate_limit:${type}:${identifier}:lockout`,
    };
  }

  async checkAndRecordAttempt(
    email: string,
    ip: string,
    userAgent?: string
  ): Promise<RateLimitResult> {
    if (!this.isConnected) {
      // Fallback: allow the request if Redis is down (fail open for availability)
      console.warn('Redis not connected, allowing request (fail-open)');
      return { allowed: true };
    }

    // Load latest settings from database
    await this.loadSettings();

    try {
      const now = Date.now();
      const emailKeys = this.getKeys(email, 'email');
      const ipKeys = this.getKeys(ip, 'ip');

      // Check if account is locked
      const lockoutData = await this.client.get(emailKeys.lockout);
      if (lockoutData) {
        const lockout: AccountLockout = JSON.parse(lockoutData);
        if (lockout.lockedUntil > now) {
          return {
            allowed: false,
            lockoutUntil: lockout.lockedUntil,
          };
        } else {
          // Lockout expired, clean it up
          await this.client.del(emailKeys.lockout);
        }
      }

      // Get recent attempts for both email and IP
      const [emailAttemptsData, ipAttemptsData] = await Promise.all([
        this.client.get(emailKeys.attempts),
        this.client.get(ipKeys.attempts),
      ]);

      let emailAttempts: LoginAttempt[] = emailAttemptsData ? JSON.parse(emailAttemptsData) : [];
      let ipAttempts: LoginAttempt[] = ipAttemptsData ? JSON.parse(ipAttemptsData) : [];

      // Clean old attempts
      const cutoff = now - this.config.TIME_WINDOW_MS;
      emailAttempts = emailAttempts.filter(attempt => attempt.timestamp > cutoff);
      ipAttempts = ipAttempts.filter(attempt => attempt.timestamp > cutoff);

      // Check rate limits
      const emailLimitReached = emailAttempts.length >= this.config.MAX_ATTEMPTS_PER_EMAIL;
      const ipLimitReached = ipAttempts.length >= this.config.MAX_ATTEMPTS_PER_IP;

      if (emailLimitReached || ipLimitReached) {
        // Create lockout for email-based limit
        if (emailLimitReached) {
          const lockoutDuration = this.calculateLockoutDuration(emailAttempts.length);
          const lockout: AccountLockout = {
            lockedUntil: now + lockoutDuration,
            attemptCount: emailAttempts.length,
            lastAttemptIp: ip,
          };

          await this.client.setEx(
            emailKeys.lockout,
            Math.ceil(lockoutDuration / 1000),
            JSON.stringify(lockout)
          );

          return {
            allowed: false,
            lockoutUntil: lockout.lockedUntil,
          };
        }

        // IP limit reached
        return {
          allowed: false,
          attemptsRemaining: 0,
          resetTime: now + this.config.TIME_WINDOW_MS,
        };
      }

      // Record the attempt
      const newAttempt: LoginAttempt = {
        timestamp: now,
        ip,
        userAgent,
      };

      emailAttempts.push(newAttempt);
      ipAttempts.push(newAttempt);

      // Store updated attempts with TTL
      const ttlSeconds = Math.ceil(this.config.TIME_WINDOW_MS / 1000);
      await Promise.all([
        this.client.setEx(emailKeys.attempts, ttlSeconds, JSON.stringify(emailAttempts)),
        this.client.setEx(ipKeys.attempts, ttlSeconds, JSON.stringify(ipAttempts)),
      ]);

      return {
        allowed: true,
        attemptsRemaining: Math.min(
          this.config.MAX_ATTEMPTS_PER_EMAIL - emailAttempts.length,
          this.config.MAX_ATTEMPTS_PER_IP - ipAttempts.length
        ),
      };

    } catch (error) {
      console.error('Redis rate limiting error:', error);
      // Fail open for availability
      return { allowed: true };
    }
  }

  async clearAttempts(email: string, ip: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      const emailKeys = this.getKeys(email, 'email');
      const ipKeys = this.getKeys(ip, 'ip');

      await Promise.all([
        this.client.del(emailKeys.attempts),
        this.client.del(emailKeys.lockout),
        this.client.del(ipKeys.attempts),
      ]);
    } catch (error) {
      console.error('Error clearing rate limit attempts:', error);
    }
  }

  async getLockoutInfo(email: string): Promise<AccountLockout | null> {
    if (!this.isConnected) return null;

    try {
      const emailKeys = this.getKeys(email, 'email');
      const lockoutData = await this.client.get(emailKeys.lockout);
      
      if (lockoutData) {
        const lockout: AccountLockout = JSON.parse(lockoutData);
        if (lockout.lockedUntil > Date.now()) {
          return lockout;
        } else {
          // Clean up expired lockout
          await this.client.del(emailKeys.lockout);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting lockout info:', error);
      return null;
    }
  }

  private calculateLockoutDuration(attemptCount: number): number {
    // Exponential backoff: 30min, 1hr, 2hr, 4hr, 8hr, 24hr (max)
    const baseDuration = this.config.LOCKOUT_DURATION_MS;
    const multiplier = Math.pow(2, attemptCount - this.config.MAX_ATTEMPTS_PER_EMAIL);
    const duration = baseDuration * multiplier;
    
    return Math.min(duration, this.config.MAX_LOCKOUT_DURATION_MS);
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const redisRateLimiter = new RedisRateLimiter();