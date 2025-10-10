/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiter for API routes.
 * For production with multiple servers, consider using @upstash/ratelimit
 * or a distributed solution like Redis.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitStore>();

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Get client identifier from request
 * Uses IP address or falls back to user-agent + other headers
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (for proxies/CDNs)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
  
  // If IP is unknown, create identifier from user-agent
  if (ip === 'unknown') {
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return `ua:${userAgent}`;
  }
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns null if allowed, NextResponse with 429 if rate limited
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  }
): NextResponse | null {
  const identifier = getClientIdentifier(request);
  const now = Date.now();
  
  // Get or create rate limit entry
  let limitData = rateLimitStore.get(identifier);
  
  if (!limitData || now > limitData.resetTime) {
    // Create new entry or reset expired entry
    limitData = {
      count: 0,
      resetTime: now + config.interval,
    };
    rateLimitStore.set(identifier, limitData);
  }
  
  // Increment request count
  limitData.count++;
  
  // Check if rate limit exceeded
  if (limitData.count > config.uniqueTokenPerInterval) {
    const resetIn = Math.ceil((limitData.resetTime - now) / 1000);
    
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetIn.toString(),
          'X-RateLimit-Limit': config.uniqueTokenPerInterval.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(limitData.resetTime / 1000).toString(),
        },
      }
    );
  }
  
  // Return null if allowed (not rate limited)
  return null;
}

/**
 * Rate limit configurations for different routes
 */
export const RATE_LIMITS = {
  // Strict limit for validation endpoints
  validation: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 20, // 20 requests per minute
  },
  
  // More relaxed for data fetching
  data: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 60, // 60 requests per minute
  },
  
  // Very strict for write operations
  write: {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 10, // 10 requests per minute
  },
} as const;

/**
 * Helper to get rate limit stats for monitoring
 */
export function getRateLimitStats() {
  return {
    totalClients: rateLimitStore.size,
    clients: Array.from(rateLimitStore.entries()).map(([key, value]) => ({
      identifier: key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
    })),
  };
}

