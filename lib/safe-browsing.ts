/**
 * Helper untuk integrasi dengan Google Safe Browsing v4 Lookup API.
 * Digunakan untuk memeriksa apakah sebuah URL terdaftar dalam database ancaman (malware, phishing/social engineering, dll.)
 *
 * References:
 * - Requirements 18.1, 18.2, 25.1
 */

export interface SafeBrowsingResult {
  ditemukan: boolean;
  ancaman: string[];
  status: 'ok' | 'gagal' | 'tidak_tersedia';
  keterangan?: string;
}

export interface SafeBrowsingOptions {
  apiKey?: string;
  timeoutMs?: number;
}

export const SAFE_BROWSING_API_URL =
  'https://safebrowsing.googleapis.com/v4/threatMatches:find';

export const DEFAULT_SAFE_BROWSING_TIMEOUT_MS = 5000;

export const SAFE_BROWSING_THREAT_TYPES = [
  'MALWARE',
  'SOCIAL_ENGINEERING',
  'UNWANTED_SOFTWARE',
  'POTENTIALLY_HARMFUL_APPLICATION',
] as const;

export const SAFE_BROWSING_PLATFORM_TYPES = ['ANY_PLATFORM'] as const;

export const SAFE_BROWSING_THREAT_ENTRY_TYPES = ['URL'] as const;

/**
 * Memeriksa URL menggunakan Google Safe Browsing v4 Lookup API.
 *
 * @param url Alamat URL yang akan diperiksa
 * @param options Opsi opsional (apiKey, timeoutMs)
 * @returns SafeBrowsingResult dengan status 'ok', 'gagal', atau 'tidak_tersedia'
 */
export async function checkSafeBrowsing(
  url: string,
  options?: SafeBrowsingOptions
): Promise<SafeBrowsingResult> {
  const apiKey = (options?.apiKey ?? process.env.SAFE_BROWSING_API_KEY ?? '').trim();

  if (!apiKey) {
    return {
      ditemukan: false,
      ancaman: [],
      status: 'tidak_tersedia',
      keterangan: 'API key Google Safe Browsing tidak tersedia',
    };
  }

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      ditemukan: false,
      ancaman: [],
      status: 'gagal',
      keterangan: 'URL tidak valid atau kosong',
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_SAFE_BROWSING_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const endpoint = `${SAFE_BROWSING_API_URL}?key=${encodeURIComponent(apiKey)}`;

  const requestPayload = {
    client: {
      clientId: 'cek-penipuan-web',
      clientVersion: '1.0.0',
    },
    threatInfo: {
      threatTypes: [...SAFE_BROWSING_THREAT_TYPES],
      platformTypes: [...SAFE_BROWSING_PLATFORM_TYPES],
      threatEntryTypes: [...SAFE_BROWSING_THREAT_ENTRY_TYPES],
      threatEntries: [{ url: url.trim() }],
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          ditemukan: false,
          ancaman: [],
          status: 'tidak_tersedia',
          keterangan: `Layanan Google Safe Browsing tidak tersedia (HTTP ${response.status})`,
        };
      }

      return {
        ditemukan: false,
        ancaman: [],
        status: 'gagal',
        keterangan: `Permintaan ke Google Safe Browsing API gagal (HTTP ${response.status})`,
      };
    }

    const data = await response.json();

    if (data && Array.isArray(data.matches) && data.matches.length > 0) {
      const ancamanUnik = Array.from<string>(
        new Set(
          data.matches
            .map((item: { threatType?: string }) => item.threatType)
            .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0)
        )
      );

      return {
        ditemukan: ancamanUnik.length > 0,
        ancaman: ancamanUnik,
        status: 'ok',
        keterangan:
          ancamanUnik.length > 0
            ? `Ditemukan ancaman: ${ancamanUnik.join(', ')}`
            : 'Tidak ada ancaman terdeteksi',
      };
    }

    return {
      ditemukan: false,
      ancaman: [],
      status: 'ok',
      keterangan: 'Tidak ada di daftar ancaman Google Safe Browsing (bukan jaminan aman)',
    };
  } catch (error: unknown) {
    if (
      (error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
      controller.signal.aborted
    ) {
      return {
        ditemukan: false,
        ancaman: [],
        status: 'gagal',
        keterangan: 'Pemeriksaan Google Safe Browsing melebihi batas waktu (timeout)',
      };
    }

    const pesanError =
      error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga';
    return {
      ditemukan: false,
      ancaman: [],
      status: 'gagal',
      keterangan: `Gagal menghubungi Google Safe Browsing API: ${pesanError}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Alias untuk checkSafeBrowsing
 */
export const checkUrl = checkSafeBrowsing;
