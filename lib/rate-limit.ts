import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // timestamp dalam milidetik
  retryAfter: number; // dalam detik
}

export const RATE_LIMIT_PER_MINUTE = 10;
export const RATE_LIMIT_PER_DAY = 100;
export const WINDOW_MINUTE_MS = 60 * 1000;
export const WINDOW_DAY_MS = 24 * 60 * 60 * 1000;

interface InMemoryStoreEntry {
  timestamps: number[];
}

const inMemoryStore = new Map<string, InMemoryStoreEntry>();
let redisClient: Redis | null = null;
let customRedisClient: Redis | null | undefined = undefined;
const upstashLimiters = new Map<string, { minuteLimiter: Ratelimit; dayLimiter: Ratelimit }>();

/**
 * Memeriksa apakah kredensial Upstash Redis tersedia di environment variable
 */
export function isUpstashConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return Boolean(
    url &&
    token &&
    url.trim().length > 0 &&
    token.trim().length > 0 &&
    url.startsWith('http')
  );
}

/**
 * Mengatur client Redis kustom (terutama untuk keperluan mocking di unit test)
 */
export function setCustomRedisClient(client: Redis | null | undefined): void {
  customRedisClient = client;
  upstashLimiters.clear();
}

/**
 * Mereset cache rate limit in-memory dan instance limiter
 */
export function resetRateLimits(): void {
  inMemoryStore.clear();
  upstashLimiters.clear();
  redisClient = null;
  customRedisClient = undefined;
}

/**
 * Mendapatkan jumlah entri aktif di cache in-memory
 */
export function getInMemoryStoreSize(): number {
  return inMemoryStore.size;
}

function getRedisClient(): Redis | null {
  if (customRedisClient !== undefined) {
    return customRedisClient;
  }
  if (!isUpstashConfigured()) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

function getUpstashLimiters(endpointKey: string) {
  const redis = getRedisClient();
  if (!redis) return null;

  let limiters = upstashLimiters.get(endpointKey);
  if (!limiters) {
    limiters = {
      minuteLimiter: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_MINUTE, '1 m'),
        prefix: `rl:${endpointKey}:min`,
      }),
      dayLimiter: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_DAY, '1 d'),
        prefix: `rl:${endpointKey}:day`,
      }),
    };
    upstashLimiters.set(endpointKey, limiters);
  }
  return limiters;
}

function checkInMemoryRateLimit(
  ip: string,
  endpointKey: string,
  now: number
): RateLimitResult {
  const key = `${endpointKey}:${ip}`;

  // Pembersihan berkala jika store terlalu besar (> 5000 entri)
  if (inMemoryStore.size > 5000) {
    const dayThreshold = now - WINDOW_DAY_MS;
    for (const [k, v] of inMemoryStore.entries()) {
      const active = v.timestamps.filter((t) => t > dayThreshold);
      if (active.length === 0) {
        inMemoryStore.delete(k);
      } else {
        v.timestamps = active;
      }
    }
  }

  let entry = inMemoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    inMemoryStore.set(key, entry);
  }

  const dayWindowStart = now - WINDOW_DAY_MS;
  const minuteWindowStart = now - WINDOW_MINUTE_MS;

  // Hapus timestamp yang lebih tua dari 24 jam
  entry.timestamps = entry.timestamps.filter((t) => t > dayWindowStart);

  // Ambil timestamp dalam jendela 1 menit terakhir
  const minuteTimestamps = entry.timestamps.filter((t) => t > minuteWindowStart);

  // 1. Periksa batas 10 req/menit
  if (minuteTimestamps.length >= RATE_LIMIT_PER_MINUTE) {
    const oldestInMinute = minuteTimestamps[0];
    const reset = oldestInMinute + WINDOW_MINUTE_MS;
    const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
    return {
      success: false,
      limit: RATE_LIMIT_PER_MINUTE,
      remaining: 0,
      reset,
      retryAfter,
    };
  }

  // 2. Periksa batas 100 req/hari
  if (entry.timestamps.length >= RATE_LIMIT_PER_DAY) {
    const oldestInDay = entry.timestamps[0];
    const reset = oldestInDay + WINDOW_DAY_MS;
    const retryAfter = Math.max(1, Math.ceil((reset - now) / 1000));
    return {
      success: false,
      limit: RATE_LIMIT_PER_DAY,
      remaining: 0,
      reset,
      retryAfter,
    };
  }

  // Permintaan diizinkan: catat waktu permintaan sekarang
  entry.timestamps.push(now);

  const remainingInMinute = RATE_LIMIT_PER_MINUTE - (minuteTimestamps.length + 1);
  const remainingInDay = RATE_LIMIT_PER_DAY - entry.timestamps.length;
  const remaining = Math.max(0, Math.min(remainingInMinute, remainingInDay));

  const oldestInMinute = minuteTimestamps.length > 0 ? minuteTimestamps[0] : now;
  const reset = oldestInMinute + WINDOW_MINUTE_MS;

  return {
    success: true,
    limit: RATE_LIMIT_PER_MINUTE,
    remaining,
    reset,
    retryAfter: 0,
  };
}

/**
 * Memeriksa rate limit untuk IP tertentu pada halaman/endpoint tertentu.
 * Menggunakan Upstash Redis jika dikonfigurasi, atau fallback in-memory jika belum.
 * Menerapkan prinsip fail-open jika terjadi error koneksi ke Redis.
 */
export async function checkRateLimit(
  ip: string,
  endpointKey?: string,
  options?: { now?: number }
): Promise<RateLimitResult> {
  const cleanIp = ip && ip.trim().length > 0 ? ip.trim() : '127.0.0.1';
  const cleanEndpoint = endpointKey && endpointKey.trim().length > 0 ? endpointKey.trim() : 'default';
  const now = options?.now ?? Date.now();

  const redis = getRedisClient();
  if (!redis) {
    return checkInMemoryRateLimit(cleanIp, cleanEndpoint, now);
  }

  const limiters = getUpstashLimiters(cleanEndpoint);
  if (!limiters) {
    return checkInMemoryRateLimit(cleanIp, cleanEndpoint, now);
  }

  try {
    const minRes = await limiters.minuteLimiter.limit(cleanIp);
    if (!minRes.success) {
      const retryAfter = Math.max(1, Math.ceil((minRes.reset - now) / 1000));
      return {
        success: false,
        limit: minRes.limit,
        remaining: minRes.remaining,
        reset: minRes.reset,
        retryAfter,
      };
    }

    const dayRes = await limiters.dayLimiter.limit(cleanIp);
    if (!dayRes.success) {
      const retryAfter = Math.max(1, Math.ceil((dayRes.reset - now) / 1000));
      return {
        success: false,
        limit: dayRes.limit,
        remaining: dayRes.remaining,
        reset: dayRes.reset,
        retryAfter,
      };
    }

    return {
      success: true,
      limit: minRes.limit,
      remaining: Math.min(minRes.remaining, dayRes.remaining),
      reset: minRes.reset,
      retryAfter: 0,
    };
  } catch (error) {
    // Fail-open jika Redis error agar demo dan pengalaman pengguna tidak terganggu
    console.warn('[RateLimit] Upstash Redis error, failing open:', error);
    return {
      success: true,
      limit: RATE_LIMIT_PER_MINUTE,
      remaining: RATE_LIMIT_PER_MINUTE,
      reset: now + WINDOW_MINUTE_MS,
      retryAfter: 0,
    };
  }
}

/**
 * Objek helper untuk kompatibilitas dengan desain middleware
 */
export const rateLimitPerMinute = {
  limit: async (identifier: string) => {
    const res = await checkRateLimit(identifier, 'default');
    return {
      success: res.success,
      limit: RATE_LIMIT_PER_MINUTE,
      remaining: res.remaining,
      reset: res.reset,
      pending: Promise.resolve(),
    };
  },
};

export const rateLimitPerDay = {
  limit: async (identifier: string) => {
    const res = await checkRateLimit(identifier, 'default');
    return {
      success: res.success,
      limit: RATE_LIMIT_PER_DAY,
      remaining: res.remaining,
      reset: res.reset,
      pending: Promise.resolve(),
    };
  },
};
