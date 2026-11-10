import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, getClientIp, getEndpointKey, config } from './middleware';
import { resetRateLimits } from './lib/rate-limit';
import * as rateLimitModule from './lib/rate-limit';

describe('middleware.ts — Edge Middleware Rate Limiting (Requirements 25.2, 25.3)', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  describe('Config Matcher', () => {
    it('mengonfigurasi matcher untuk mencocokkan endpoint /api/:path*', () => {
      expect(config).toBeDefined();
      expect(config.matcher).toEqual(['/api/:path*']);
    });
  });

  describe('getClientIp() — Ekstraksi IP Klien', () => {
    it('mengambil IP tunggal dari header x-forwarded-for', () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': '203.0.113.1' },
      });
      expect(getClientIp(req)).toBe('203.0.113.1');
    });

    it('mengambil IP pertama dari deretan proxy pada x-forwarded-for', () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      });
      expect(getClientIp(req)).toBe('203.0.113.195');
    });

    it('mengambil IP dari x-real-ip jika x-forwarded-for tidak ada', () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-real-ip': '198.51.100.42' },
      });
      expect(getClientIp(req)).toBe('198.51.100.42');
    });

    it('memprioritaskan x-forwarded-for di atas x-real-ip jika keduanya ada', () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: {
          'x-forwarded-for': '198.51.100.1, 10.0.0.1',
          'x-real-ip': '10.0.0.2',
        },
      });
      expect(getClientIp(req)).toBe('198.51.100.1');
    });

    it('fallback ke 127.0.0.1 jika tidak ada header IP', () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat');
      expect(getClientIp(req)).toBe('127.0.0.1');
    });

    it('fallback ke 127.0.0.1 jika header hanya berisi spasi kosong', () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': '   ' },
      });
      expect(getClientIp(req)).toBe('127.0.0.1');
    });
  });

  describe('getEndpointKey() — Ekstraksi Endpoint Key', () => {
    it('mengekstrak cek-chat dari /api/cek-chat', () => {
      expect(getEndpointKey('/api/cek-chat')).toBe('cek-chat');
    });

    it('mengekstrak cek-link dari /api/cek-link', () => {
      expect(getEndpointKey('/api/cek-link')).toBe('cek-link');
    });

    it('mengekstrak cek-media dari /api/cek-media', () => {
      expect(getEndpointKey('/api/cek-media')).toBe('cek-media');
    });

    it('mengekstrak tanya dari /api/tanya', () => {
      expect(getEndpointKey('/api/tanya')).toBe('tanya');
    });

    it('mengekstrak segmen pertama setelah /api/ untuk nested path', () => {
      expect(getEndpointKey('/api/cek-chat/extra/subpath')).toBe('cek-chat');
    });

    it('mengembalikan default untuk path /api atau /api/', () => {
      expect(getEndpointKey('/api')).toBe('default');
      expect(getEndpointKey('/api/')).toBe('default');
    });

    it('mengembalikan default untuk path non-api', () => {
      expect(getEndpointKey('/cek-chat')).toBe('default');
    });
  });

  describe('middleware() — Alur Rate Limiting', () => {
    it('mengizinkan request pertama dan menyertakan header rate limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': '192.168.1.10' },
      });

      const response = await middleware(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('mengizinkan hingga 10 request dalam 1 menit dengan sisa kuota yang berkurang bertahap', async () => {
      const ip = '192.168.1.11';

      for (let i = 1; i <= 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/cek-chat', {
          headers: { 'x-forwarded-for': ip },
        });

        const res = await middleware(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
        expect(res.headers.get('X-RateLimit-Remaining')).toBe(String(10 - i));
      }
    });

    it('menolak request ke-11 dengan HTTP 429 Too Many Requests dan Retry-After header', async () => {
      const ip = '192.168.1.12';

      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/cek-chat', {
          headers: { 'x-forwarded-for': ip },
        });
        const res = await middleware(req);
        expect(res.status).toBe(200);
      }

      const blockedReq = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': ip },
      });
      const blockedRes = await middleware(blockedReq);

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get('Retry-After')).toBeDefined();
      expect(Number(blockedRes.headers.get('Retry-After'))).toBeGreaterThan(0);
      expect(blockedRes.headers.get('Content-Type')).toContain('application/json');
      expect(blockedRes.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(blockedRes.headers.get('X-RateLimit-Remaining')).toBe('0');

      const body = await blockedRes.json();
      expect(body.error).toBe('Batas permintaan terlampaui');
      expect(body.pesan).toBeDefined();
      expect(typeof body.pesan).toBe('string');
      expect(body.retryAfter).toBeGreaterThan(0);

      const kataTerlarang = ['pasti', 'terbukti', '100%'];
      for (const kata of kataTerlarang) {
        expect(body.pesan.toLowerCase()).not.toContain(kata);
      }
    });

    it('menolak dengan pesan batas harian saat limit 100 req/hari terlampaui', async () => {
      vi.spyOn(rateLimitModule, 'checkRateLimit').mockResolvedValueOnce({
        success: false,
        limit: 100,
        remaining: 0,
        reset: Date.now() + 86400000,
        retryAfter: 86400,
      });

      const req = new NextRequest('http://localhost:3000/api/cek-link', {
        headers: { 'x-forwarded-for': '192.168.1.13' },
      });

      const res = await middleware(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('86400');
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');

      const body = await res.json();
      expect(body.error).toBe('Batas permintaan terlampaui');
      expect(body.pesan).toBe('Batas harian tercapai, coba lagi besok');
      expect(body.retryAfter).toBe(86400);
    });

    it('mengisolasi rate limit antar endpoint berbeda untuk IP yang sama', async () => {
      const ip = '192.168.1.14';

      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/cek-chat', {
          headers: { 'x-forwarded-for': ip },
        });
        await middleware(req);
      }

      const chatReq = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': ip },
      });
      const chatRes = await middleware(chatReq);
      expect(chatRes.status).toBe(429);

      const linkReq = new NextRequest('http://localhost:3000/api/cek-link', {
        headers: { 'x-forwarded-for': ip },
      });
      const linkRes = await middleware(linkReq);
      expect(linkRes.status).toBe(200);
      expect(linkRes.headers.get('X-RateLimit-Remaining')).toBe('9');
    });

    it('mengisolasi rate limit antar IP berbeda untuk endpoint yang sama', async () => {
      const ip1 = '192.168.1.15';
      const ip2 = '192.168.1.16';

      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/cek-chat', {
          headers: { 'x-forwarded-for': ip1 },
        });
        await middleware(req);
      }

      const blockedRes = await middleware(
        new NextRequest('http://localhost:3000/api/cek-chat', {
          headers: { 'x-forwarded-for': ip1 },
        })
      );
      expect(blockedRes.status).toBe(429);

      const allowedRes = await middleware(
        new NextRequest('http://localhost:3000/api/cek-chat', {
          headers: { 'x-forwarded-for': ip2 },
        })
      );
      expect(allowedRes.status).toBe(200);
      expect(allowedRes.headers.get('X-RateLimit-Remaining')).toBe('9');
    });

    it('langsung melanjutkan request jika bukan endpoint /api', async () => {
      const req = new NextRequest('http://localhost:3000/cek-chat');
      const res = await middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
    });

    it('menerapkan fail-open jika terjadi exception tak terduga', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(rateLimitModule, 'checkRateLimit').mockRejectedValueOnce(
        new Error('Unexpected network catastrophe')
      );

      const req = new NextRequest('http://localhost:3000/api/cek-chat', {
        headers: { 'x-forwarded-for': '192.168.1.99' },
      });

      const res = await middleware(req);
      expect(res.status).toBe(200);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Middleware] Unexpected error in rate limiting, failing open:'),
        expect.any(Error)
      );
    });
  });
});
