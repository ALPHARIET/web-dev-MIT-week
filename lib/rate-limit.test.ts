import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimits,
  isUpstashConfigured,
  setCustomRedisClient,
  RATE_LIMIT_PER_MINUTE,
  RATE_LIMIT_PER_DAY,
  rateLimitPerMinute,
  rateLimitPerDay,
} from './rate-limit';

describe('lib/rate-limit.ts - In-Memory Fallback & Rate Limiting', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  describe('In-Memory Rate Limiting (Requirements 25.2, 25.3)', () => {
    it('mengizinkan permintaan pertama dengan remaining yang sesuai', async () => {
      const res = await checkRateLimit('192.168.1.1', 'cek-chat');

      expect(res.success).toBe(true);
      expect(res.limit).toBe(RATE_LIMIT_PER_MINUTE);
      expect(res.remaining).toBe(RATE_LIMIT_PER_MINUTE - 1);
      expect(res.retryAfter).toBe(0);
      expect(res.reset).toBeGreaterThan(Date.now());
    });

    it('mengizinkan hingga 10 permintaan per menit untuk IP yang sama', async () => {
      const ip = '192.168.1.2';
      const endpoint = 'cek-chat';
      const now = 1000000;

      for (let i = 1; i <= 10; i++) {
        const res = await checkRateLimit(ip, endpoint, { now });
        expect(res.success).toBe(true);
        expect(res.limit).toBe(10);
        expect(res.remaining).toBe(10 - i);
        expect(res.retryAfter).toBe(0);
      }
    });

    it('menolak permintaan ke-11 dalam jendela 1 menit (429 condition)', async () => {
      const ip = '192.168.1.3';
      const endpoint = 'cek-chat';
      const now = 1000000;

      for (let i = 0; i < 10; i++) {
        await checkRateLimit(ip, endpoint, { now });
      }

      const res11 = await checkRateLimit(ip, endpoint, { now });
      expect(res11.success).toBe(false);
      expect(res11.limit).toBe(10);
      expect(res11.remaining).toBe(0);
      expect(res11.retryAfter).toBeGreaterThan(0);
      expect(res11.reset).toBe(now + 60 * 1000);
    });

    it('mengizinkan kembali setelah jendela 1 menit berlalu (sliding window)', async () => {
      const ip = '192.168.1.4';
      const endpoint = 'cek-chat';
      const t0 = 1000000;

      for (let i = 0; i < 10; i++) {
        await checkRateLimit(ip, endpoint, { now: t0 });
      }

      const blocked = await checkRateLimit(ip, endpoint, { now: t0 });
      expect(blocked.success).toBe(false);

      const t1 = t0 + 61000;
      const allowedAgain = await checkRateLimit(ip, endpoint, { now: t1 });
      expect(allowedAgain.success).toBe(true);
      expect(allowedAgain.remaining).toBe(9);
    });

    it('menegakkan batas harian 100 permintaan per hari', async () => {
      const ip = '192.168.1.5';
      const endpoint = 'cek-link';
      let currentTime = 1000000;

      for (let batch = 0; batch < 10; batch++) {
        for (let req = 0; req < 10; req++) {
          const res = await checkRateLimit(ip, endpoint, { now: currentTime });
          expect(res.success).toBe(true);
        }
        currentTime += 120 * 1000;
      }

      const res101 = await checkRateLimit(ip, endpoint, { now: currentTime });
      expect(res101.success).toBe(false);
      expect(res101.limit).toBe(RATE_LIMIT_PER_DAY);
      expect(res101.remaining).toBe(0);
      expect(res101.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Isolasi IP dan Endpoint (Per Halaman Cek)', () => {
    it('mengisolasi batas antar IP yang berbeda', async () => {
      const ip1 = '10.0.0.1';
      const ip2 = '10.0.0.2';
      const endpoint = 'cek-chat';
      const now = 1000000;

      for (let i = 0; i < 10; i++) {
        await checkRateLimit(ip1, endpoint, { now });
      }
      const resIp1 = await checkRateLimit(ip1, endpoint, { now });
      expect(resIp1.success).toBe(false);

      const resIp2 = await checkRateLimit(ip2, endpoint, { now });
      expect(resIp2.success).toBe(true);
      expect(resIp2.remaining).toBe(9);
    });

    it('mengisolasi batas antar halaman cek untuk IP yang sama (per halaman)', async () => {
      const ip = '10.0.0.3';
      const now = 1000000;

      for (let i = 0; i < 10; i++) {
        await checkRateLimit(ip, 'cek-chat', { now });
      }
      const chatBlocked = await checkRateLimit(ip, 'cek-chat', { now });
      expect(chatBlocked.success).toBe(false);

      const linkAllowed = await checkRateLimit(ip, 'cek-link', { now });
      expect(linkAllowed.success).toBe(true);
      expect(linkAllowed.remaining).toBe(9);

      const videoAllowed = await checkRateLimit(ip, 'cek-video-suara', { now });
      expect(videoAllowed.success).toBe(true);
      expect(videoAllowed.remaining).toBe(9);
    });
  });

  describe('Penanganan Input dan Default', () => {
    it('menggunakan default IP 127.0.0.1 jika IP kosong atau hanya whitespace', async () => {
      const res1 = await checkRateLimit('');
      expect(res1.success).toBe(true);

      const res2 = await checkRateLimit('   ');
      expect(res2.success).toBe(true);
      expect(res2.remaining).toBe(8);
    });

    it('menggunakan default endpoint jika endpointKey tidak disediakan', async () => {
      const res = await checkRateLimit('192.168.1.10');
      expect(res.success).toBe(true);
      expect(res.limit).toBe(RATE_LIMIT_PER_MINUTE);
    });
  });

  describe('Fail-Open dan Penanganan Error Redis', () => {
    it('menerapkan fail-open jika Upstash Redis melempar error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const mockFailingRedis = {
        eval: vi.fn().mockRejectedValue(new Error('Connection timeout to Redis cluster')),
      } as any;

      setCustomRedisClient(mockFailingRedis);

      const res = await checkRateLimit('192.168.1.99', 'cek-chat');

      expect(res.success).toBe(true);
      expect(res.limit).toBe(RATE_LIMIT_PER_MINUTE);
      expect(res.remaining).toBe(RATE_LIMIT_PER_MINUTE);
      expect(res.retryAfter).toBe(0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit] Upstash Redis error, failing open:'),
        expect.any(Error)
      );
    });

    it('mendukung helper rateLimitPerMinute dan rateLimitPerDay', async () => {
      const minRes = await rateLimitPerMinute.limit('192.168.1.100');
      expect(minRes.success).toBe(true);
      expect(minRes.limit).toBe(RATE_LIMIT_PER_MINUTE);

      const dayRes = await rateLimitPerDay.limit('192.168.1.100');
      expect(dayRes.success).toBe(true);
      expect(dayRes.limit).toBe(RATE_LIMIT_PER_DAY);
    });

    it('mendeteksi status konfigurasi Upstash dengan isUpstashConfigured', () => {
      const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
      const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      try {
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        expect(isUpstashConfigured()).toBe(false);

        process.env.UPSTASH_REDIS_REST_URL = 'https://fake-redis.upstash.io';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'fake_token';
        expect(isUpstashConfigured()).toBe(true);
      } finally {
        if (originalUrl !== undefined) {
          process.env.UPSTASH_REDIS_REST_URL = originalUrl;
        } else {
          delete process.env.UPSTASH_REDIS_REST_URL;
        }
        if (originalToken !== undefined) {
          process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
        } else {
          delete process.env.UPSTASH_REDIS_REST_TOKEN;
        }
      }
    });
  });
});
