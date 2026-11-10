/**
 * lib/rdap.ts
 *
 * Helper pengecekan umur domain via Registration Data Access Protocol (RDAP).
 * Menghubungi https://rdap.org/domain/{domain} dengan batas timeout 5 detik (default).
 * Ekstrak domain dari URL menggunakan parseUrl dari lib/sanitasi-url.
 *
 * References: Requirements 18.1, 18.2, 19.3, 19.11
 */

import { parseUrl } from './sanitasi-url';

/**
 * Interface hasil pengecekan RDAP sesuai spesifikasi tugas
 */
export interface RdapResult {
  tersedia: boolean;
  tanggalRegistrasi?: string; // ISO string
  umurHari?: number;
  status: 'ok' | 'gagal' | 'tidak_tersedia';
  keterangan?: string;
}

/**
 * Opsi tambahan untuk fungsi queryDomainAge
 */
export interface QueryDomainAgeOptions {
  /** Batas waktu permintaan dalam milidetik (default: 5.000 ms) */
  timeoutMs?: number;
  /** Implementasi fetch kustom (berguna untuk pengujian atau interceptor) */
  fetchFn?: typeof fetch;
  /** Waktu acuan saat ini untuk menghitung umur (Date atau timestamp ms) */
  now?: Date | number;
}

/** Base URL untuk bootstrap query RDAP domain */
export const RDAP_BASE_URL = 'https://rdap.org/domain';

/** Timeout default untuk panggilan RDAP: 5.000 ms (Requirement 18.2) */
export const DEFAULT_RDAP_TIMEOUT_MS = 5000;

/**
 * Mengekstrak nama domain terdaftar dari URL atau string nama domain
 * menggunakan parseUrl dari lib/sanitasi-url.
 *
 * Mengembalikan nama domain (misal: "example.com" atau "shopee.co.id") dalam huruf kecil,
 * atau null jika tidak valid, tidak memiliki TLD, atau berupa alamat IP.
 *
 * @param domainOrUrl String URL lengkap atau nama domain
 * @returns Nama domain bersih atau null
 */
export function extractDomain(domainOrUrl: string): string | null {
  if (!domainOrUrl || typeof domainOrUrl !== 'string') {
    return null;
  }

  const trimmed = domainOrUrl.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parseUrl(trimmed);
  // Domain harus memiliki domainUtama dan tld yang valid (bukan IP dan bukan tanpa TLD)
  if (parsed.domainUtama && parsed.tld) {
    return `${parsed.domainUtama}.${parsed.tld}`.toLowerCase();
  }

  return null;
}

/**
 * Menghitung umur domain dalam satuan hari berdasarkan tanggal registrasi RDAP.
 *
 * @param eventDateStr String tanggal registrasi ISO dari response RDAP
 * @param now Waktu acuan saat ini (Date atau number)
 * @returns Objek berisi tanggal registrasi ISO string dan umur dalam hari
 */
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

/**
 * Memeriksa umur domain melalui RDAP service.
 *
 * Alur pemeriksaan:
 * 1. Ekstrak nama domain dari URL menggunakan parseUrl dari lib/sanitasi-url.
 * 2. Panggil RDAP service: `https://rdap.org/domain/{domain}` dengan batas waktu 5 detik.
 * 3. Cari event "registration" di array events response RDAP JSON.
 * 4. Hitung selisih hari dari eventDate ke hari ini.
 * 5. Jika RDAP mengembalikan 404 / 501 / network error / TLD tidak mendukung:
 *    return `{ tersedia: false, status: 'tidak_tersedia' }` tanpa crash.
 *
 * @param domainOrUrl Nama domain atau URL lengkap yang ingin diperiksa
 * @param options Opsi timeout dan kustomisasi lainnya
 * @returns Objek RdapResult
 */
export async function queryDomainAge(
  domainOrUrl: string,
  options?: QueryDomainAgeOptions
): Promise<RdapResult> {
  // 1. Ekstrak nama domain dari input
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

    // 2. Tangani status HTTP error
    if (!response.ok) {
      // 404 = Domain tidak ditemukan
      // 501 = Not Implemented (TLD tidak mendukung RDAP)
      // 400 / 422 = Bad request / parameter tidak didukung
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

      // Kesalahan server lainnya (HTTP 500, 502, 503, dll.)
      return {
        tersedia: false,
        status: 'gagal',
        keterangan: `Layanan RDAP mengalami kesalahan (HTTP ${response.status})`,
      };
    }

    // 3. Parse JSON body
    let data: any;
    try {
      data = await response.json();
    } catch {
      return {
        tersedia: false,
        status: 'gagal',
        keterangan: 'Format respons RDAP bukan JSON yang valid',
      };
    }

    // 4. Cari event 'registration' di array events
    const events = Array.isArray(data?.events) ? data.events : [];
    const regEvent = events.find(
      (e: any) =>
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

    // 5. Hitung selisih hari dari eventDate ke hari ini
    const calculated = calculateDomainAge(regEvent.eventDate, options?.now);
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
    // 6. Tangani network error, timeout, dan exception lainnya tanpa crash
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
