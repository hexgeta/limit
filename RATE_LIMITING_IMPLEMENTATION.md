# Rate Limiting Implementation

## Summary

Rate limiting has been implemented on all API routes to protect against abuse, DoS attacks, and to prevent excessive RPC/API usage.

## Files Created

### `/utils/rateLimit.ts`

Core rate limiting utility with:

- In-memory rate limit tracking
- Automatic cleanup of expired entries
- Flexible configuration per route
- Standard HTTP 429 responses with proper headers

## Files Modified

### `/app/api/validate-token-access/route.ts`

**Changes:**

- Added rate limiting import
- Applied `RATE_LIMITS.validation` (20 requests/minute)
- Rate limit check at beginning of POST handler

**Before:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    // ...
```

**After:**

```typescript
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.validation);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { address } = await request.json();
    // ...
```

### `/app/api/prices/historic/route.ts`

**Changes:**

- Fixed corrupted file
- Added rate limiting with `RATE_LIMITS.data` (60 requests/minute)
- Added proper error handling and validation
- Implemented GET handler for fetching historic prices from Supabase

## Rate Limit Configuration

### Predefined Limits

```typescript
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
};
```

### Applied Limits

| Route                        | Limit  | Reason                                              |
| ---------------------------- | ------ | --------------------------------------------------- |
| `/api/validate-token-access` | 20/min | Validation checks blockchain state, needs RPC calls |
| `/api/prices/historic`       | 60/min | Data fetching from database, less expensive         |

## How It Works

### 1. Client Identification

The rate limiter identifies clients by:

**Primary:** IP Address

- Checks `x-forwarded-for` (proxy/CDN)
- Checks `x-real-ip`
- Checks `cf-connecting-ip` (Cloudflare)

**Fallback:** User-Agent

- Used when IP is unavailable
- Less accurate but prevents complete bypass

### 2. Request Tracking

```typescript
interface RateLimitStore {
  count: number; // Request count in current window
  resetTime: number; // When the window resets (timestamp)
}
```

Each client gets an entry in the in-memory store:

- Increments count on each request
- Resets when time window expires
- Automatically cleaned up after expiration

### 3. Response When Limited

**Status:** 429 Too Many Requests

**Headers:**

```
Retry-After: 42
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696543210
```

**Body:**

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 42 seconds.",
  "retryAfter": 42
}
```

## Memory Management

### Automatic Cleanup

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute
```

**Why This Matters:**

- Prevents memory leaks
- Removes stale entries
- Keeps memory usage bounded

## Usage Examples

### Basic Rate Limiting

```typescript
import { rateLimit, RATE_LIMITS } from "@/utils/rateLimit";

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(request, RATE_LIMITS.validation);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Your endpoint logic here
}
```

### Custom Rate Limit

```typescript
const rateLimitResponse = rateLimit(request, {
  interval: 120000, // 2 minutes
  uniqueTokenPerInterval: 50, // 50 requests per 2 minutes
});
```

### Get Rate Limit Stats

```typescript
import { getRateLimitStats } from "@/utils/rateLimit";

const stats = getRateLimitStats();
console.log(`Total clients being tracked: ${stats.totalClients}`);
```

## Protection Against

✅ **Denial of Service (DoS)** - Limits rapid requests from single source  
✅ **API Abuse** - Prevents excessive calls to expensive operations  
✅ **RPC Quota Drain** - Limits blockchain queries  
✅ **Database Overload** - Protects Supabase from excessive reads  
✅ **Resource Exhaustion** - Prevents server resource depletion

## Testing

### Test Rate Limiting

```bash
# Send multiple rapid requests
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/validate-token-access \
    -H "Content-Type: application/json" \
    -d '{"address":"0x1234567890123456789012345678901234567890"}'
  echo ""
done
```

**Expected Result:**

- First 20 requests: Success (200)
- Requests 21-25: Rate limited (429)
- Response includes `Retry-After` header

### Test Rate Limit Reset

```bash
# Wait 60 seconds, then try again
sleep 60
curl -X POST http://localhost:3000/api/validate-token-access \
  -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}'
```

**Expected Result:**

- Request succeeds (200)
- Rate limit counter has reset

## Client-Side Handling

### Recommended Approach

```typescript
async function makeApiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    const data = await response.json();

    console.warn(`Rate limited. Retry after ${retryAfter}s`);
    console.warn(data.message);

    // Option 1: Wait and retry
    await new Promise((resolve) =>
      setTimeout(resolve, parseInt(retryAfter!) * 1000)
    );
    return makeApiCall(url, options);

    // Option 2: Show user error
    throw new Error(data.message);
  }

  return response;
}
```

### Using Rate Limit Headers

```typescript
const response = await fetch("/api/validate-token-access", {
  method: "POST",
  body: JSON.stringify({ address }),
});

const limit = response.headers.get("X-RateLimit-Limit");
const remaining = response.headers.get("X-RateLimit-Remaining");
const reset = response.headers.get("X-RateLimit-Reset");

console.log(`${remaining}/${limit} requests remaining`);
console.log(`Resets at: ${new Date(parseInt(reset!) * 1000)}`);
```

## Production Considerations

### Current Implementation

**Type:** In-memory (single server)

**Pros:**

- No external dependencies
- Zero latency
- No additional costs
- Simple to implement

**Cons:**

- Resets on server restart
- Doesn't work across multiple servers
- Lost on deployment

### For Production at Scale

If you deploy with multiple servers or serverless, consider upgrading to:

#### 1. **Upstash Ratelimit** (Recommended)

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});

const { success } = await ratelimit.limit(identifier);
```

**Benefits:**

- Works across all servers
- Persists between deployments
- Edge-compatible
- Free tier available

#### 2. **Redis**

```bash
npm install ioredis
```

Use Redis for distributed rate limiting with the same logic but Redis as storage.

#### 3. **Cloudflare Rate Limiting**

Configure rate limiting at the CDN level for additional protection.

### Monitoring

Consider adding:

- Metrics tracking (how many requests hit limit)
- Alerts when rate limits are frequently hit
- Dashboard showing top offenders
- Logging for security analysis

## Configuration Tuning

### Adjust Limits Based on Usage

Monitor your API usage and adjust limits:

```typescript
// Too strict? Users complaining?
validation: {
  uniqueTokenPerInterval: 30, // Increased from 20
}

// Being abused? Seeing attacks?
data: {
  uniqueTokenPerInterval: 30, // Decreased from 60
}
```

### Different Limits by Authentication

```typescript
// Example: Higher limits for authenticated users
const limit = isAuthenticated
  ? RATE_LIMITS_AUTHENTICATED.validation
  : RATE_LIMITS.validation;
```

## Security Best Practices

1. **Always return 429**, never different status codes
2. **Include Retry-After** header for good UX
3. **Log rate limit hits** for security monitoring
4. **Use IP + User-Agent** combination for better tracking
5. **Clean up old entries** to prevent memory leaks
6. **Test thoroughly** before deploying
7. **Monitor metrics** to tune limits

## Troubleshooting

### Issue: Rate limit too strict

**Solution:** Increase `uniqueTokenPerInterval` or `interval`

### Issue: Memory usage growing

**Solution:** Check cleanup interval is running (should be automatic)

### Issue: Legitimate users getting blocked

**Solution:**

- Implement authentication-based rate limiting
- Use longer time windows
- Add whitelist for trusted IPs

### Issue: Rate limit not working

**Check:**

- Rate limit function is called before endpoint logic
- Response is returned if rate limited
- IP headers are being passed through proxies

---

**Implementation Date:** October 10, 2025  
**Status:** ✅ Complete  
**Security Issue Addressed:** #6 (MEDIUM Severity) - Missing Rate Limiting on API Routes
