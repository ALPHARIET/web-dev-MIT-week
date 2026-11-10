import { parseUrl } from './sanitasi-url';

export interface RdapResult {
  tersedia: boolean;
  tanggalRegistrasi?: string;
  umurHari?: number;
  status: 'ok' | 'gagal' | 'tidak_tersedia';
  keterangan?: string;
}

interface EventRdap {
  eventAction?: unknown;
  eventDate?: unknown;
}

interface RdapRespons {
  events?: EventRdap[];
}

export interface QueryDomainAgeOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  now?: Date | number;
}

export const RDAP_BASE_URL = 'https://rdap.org/domain';

export const DEFAULT_RDAP_TIMEOUT_MS = 5000;

export function extractDomain(domainOrUrl: string): string | null {
  if (!domainOrUrl || typeof domainOrUrl !== 'string') {
    return null;
  }

  const trimmed = domainOrUrl.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseUrl(trimmed);
  if (parsed.domainUtama && parsed.tld) {
    return `${parsed.domainUtama}.${parsed.tld}`.toLowerCase();
  }

  return null;
}

export function calculateDomainAge(
  eventDateStr: string,
  now?: Date | number
): { tanggalRegistrasi: string; umurHari: number } | null {
  const regDate = new Date(eventDateStr);
  if (isNaN(regDate.getTime())) {
    return null;
  }

  const nowMs =
    typeof now === 'number'
      ? now
      : now instanceof Date
      ? now.getTime()
      : Date.now();

  const diffMs = nowMs - regDate.getTime();
  const umurHari = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return {
    tanggalRegistrasi: regDate.toISOString(),
    umurHari,
  };
}

export async function queryDomainAge(
  domainOrUrl: string,
  options?: QueryDomainAgeOptions
): Promise<RdapResult> {
  const domain = extractDomain(domainOrUrl);

  if (!domain) {
    return {
      tersedia: false,
      status: 'tidak_tersedia',
      keterangan: 'Nama domain tidak valid atau berupa alamat IP',
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_RDAP_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout setelah ${timeoutMs}ms`));
  }, timeoutMs);

  const fetchImpl = options?.fetchFn ?? fetch;

  try {
    const url = `${RDAP_BASE_URL}/${encodeURIComponent(domain)}`;
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/rdap+json, application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (
        response.status === 404 ||
        response.status === 501 ||
        response.status === 400 ||
        response.status === 422
      ) {
        return {
          tersedia: false,
          status: 'tidak_tersedia',
          keterangan:
            response.status === 404
              ? 'Domain tidak ditemukan dalam basis data RDAP (404)'
              : response.status === 501
              ? 'TLD domain tidak mendukung layanan RDAP (501)'
              : `Layanan RDAP mengembalikan status ${response.status}`,
        };
      }

      return {
        tersedia: false,
        status: 'gagal',
        keterangan: `Layanan RDAP mengalami kesalahan (HTTP ${response.status})`,
      };
    }

    let data: RdapRespons | null;
    try {
      data = (await response.json()) as RdapRespons | null;
    } catch {
      return {
        tersedia: false,
        status: 'gagal',
        keterangan: 'Format respons RDAP bukan JSON yang valid',
      };
    }

    const events: EventRdap[] = Array.isArray(data?.events) ? data.events : [];
    const regEvent = events.find(
      (e) =>
        typeof e?.eventAction === 'string' &&
        e.eventAction.trim().toLowerCase() === 'registration'
    );

    if (!regEvent || !regEvent.eventDate) {
      return {
        tersedia: false,
        status: 'tidak_tersedia',
        keterangan: 'Tanggal registrasi tidak ditemukan dalam data RDAP',
      };
    }

    const calculated = calculateDomainAge(regEvent.eventDate as string, options?.now);
    if (!calculated) {
      return {
        tersedia: false,
        status: 'tidak_tersedia',
        keterangan: 'Format tanggal registrasi RDAP tidak valid',
      };
    }

    return {
      tersedia: true,
      tanggalRegistrasi: calculated.tanggalRegistrasi,
      umurHari: calculated.umurHari,
      status: 'ok',
      keterangan: `Domain terdaftar sejak ${calculated.tanggalRegistrasi.slice(0, 10)} (umur: ${calculated.umurHari} hari)`,
    };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.name === 'TimeoutError' ||
        err.message.includes('Timeout'));

    return {
      tersedia: false,
      status: 'tidak_tersedia',
      keterangan: isTimeout
        ? `Pengecekan RDAP melebihi batas waktu (${timeoutMs} ms)`
        : `Gagal menghubungi layanan RDAP: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
