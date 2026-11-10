import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from './lib/rate-limit';

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const ipBawaan = (req as NextRequest & { ip?: unknown }).ip;
  if (typeof ipBawaan === 'string' && ipBawaan) {
    return ipBawaan;
  }

  return '127.0.0.1';
}

export function getEndpointKey(pathname: string): string {
  const match = pathname.match(/^\/api\/([^/?#]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'default';
}

export async function middleware(req: NextRequest) {
  try {
    const pathname = req.nextUrl?.pathname ?? new URL(req.url).pathname;

    if (!pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    const ip = getClientIp(req);
    const endpointKey = getEndpointKey(pathname);

    const result = await checkRateLimit(ip, endpointKey);

    if (!result.success) {
      const pesan =
        result.limit >= 100
          ? 'Batas harian tercapai, coba lagi besok'
          : `Terlalu banyak permintaan. Silakan tunggu ${result.retryAfter} detik sebelum mencoba lagi.`;

      return NextResponse.json(
        {
          error: 'Batas permintaan terlampaui',
          pesan,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': result.retryAfter.toString(),
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    return response;
  } catch (error) {
    console.error('[Middleware] Unexpected error in rate limiting, failing open:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
