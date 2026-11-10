export interface VirusTotalResult {
  ditemukan: boolean;
  jumlahVendorBerbahaya: number;
  totalVendor: number;
  status: 'ok' | 'gagal' | 'tidak_tersedia';
  keterangan?: string;
}

export interface VirusTotalOptions {
  apiKey?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  simulate?: boolean;
  now?: number;
  skipRateLimit?: boolean;
}

export const VIRUSTOTAL_API_BASE_URL = 'https://www.virustotal.com/api/v3/urls';

export const DEFAULT_VIRUSTOTAL_TIMEOUT_MS = 5000;

export const VIRUSTOTAL_RATE_LIMIT_PER_MINUTE = 4;
export const VIRUSTOTAL_RATE_LIMIT_PER_DAY = 500;
export const VIRUSTOTAL_WINDOW_MINUTE_MS = 60 * 1000;
export const VIRUSTOTAL_WINDOW_DAY_MS = 24 * 60 * 60 * 1000;

let requestTimestamps: number[] = [];

export function resetVirusTotalRateLimit(): void {
  requestTimestamps = [];
}

export function getVirusTotalTimestamps(): number[] {
  return [...requestTimestamps];
}

export function getVirusTotalUrlId(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  const cleanUrl = url.trim();
  return Buffer.from(cleanUrl)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function simulateVirusTotal(url: string): VirusTotalResult {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      ditemukan: false,
      jumlahVendorBerbahaya: 0,
      totalVendor: 0,
      status: 'gagal',
      keterangan: 'URL tidak valid atau kosong',
    };
  }

  const clean = url.toLowerCase().trim();
  const kataBahaya = [
    'phishing',
    'malware',
    'undian',
    'klaim',
    'hadiah',
    'login',
    'berbahaya',
    'virus',
    'suspicious',
    'sh0pee',
    'bca-klik',
  ];

  const terdeteksiBahaya = kataBahaya.some((kata) => clean.includes(kata));

  if (terdeteksiBahaya) {
    const jumlahVendorBerbahaya = 5;
    const totalVendor = 75;
    return {
      ditemukan: true,
      jumlahVendorBerbahaya,
      totalVendor,
      status: 'ok',
      keterangan: `Simulasi VirusTotal: ${jumlahVendorBerbahaya} dari ${totalVendor} vendor keamanan menandai URL ini sebagai berbahaya`,
    };
  }

  return {
    ditemukan: false,
    jumlahVendorBerbahaya: 0,
    totalVendor: 75,
    status: 'ok',
    keterangan:
      'Simulasi VirusTotal: Tidak ada vendor yang menandai berbahaya (0 dari 75 vendor)',
  };
}

export async function checkVirusTotal(
  url: string,
  options?: VirusTotalOptions
): Promise<VirusTotalResult> {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      ditemukan: false,
      jumlahVendorBerbahaya: 0,
      totalVendor: 0,
      status: 'gagal',
      keterangan: 'URL tidak valid atau kosong',
    };
  }

  const apiKey = (options?.apiKey ?? process.env.VIRUSTOTAL_API_KEY ?? '').trim();
  const shouldSimulate =
    options?.simulate === true ||
    apiKey === 'simulation' ||
    (!apiKey && process.env.VIRUSTOTAL_SIMULATE === 'true');

  if (shouldSimulate) {
    return simulateVirusTotal(url);
  }

  if (!apiKey) {
    return {
      ditemukan: false,
      jumlahVendorBerbahaya: 0,
      totalVendor: 0,
      status: 'tidak_tersedia',
      keterangan: 'API key VirusTotal tidak tersedia',
    };
  }

  const now = options?.now ?? Date.now();
  if (!options?.skipRateLimit) {
    const dayThreshold = now - VIRUSTOTAL_WINDOW_DAY_MS;
    const minuteThreshold = now - VIRUSTOTAL_WINDOW_MINUTE_MS;

    requestTimestamps = requestTimestamps.filter((t) => t > dayThreshold);

    const minuteCount = requestTimestamps.filter((t) => t > minuteThreshold).length;
    if (minuteCount >= VIRUSTOTAL_RATE_LIMIT_PER_MINUTE) {
      return {
        ditemukan: false,
        jumlahVendorBerbahaya: 0,
        totalVendor: 0,
        status: 'tidak_tersedia',
        keterangan:
          'Batas kuota VirusTotal tercapai (maksimal 4 permintaan per menit)',
      };
    }

    if (requestTimestamps.length >= VIRUSTOTAL_RATE_LIMIT_PER_DAY) {
      return {
        ditemukan: false,
        jumlahVendorBerbahaya: 0,
        totalVendor: 0,
        status: 'tidak_tersedia',
        keterangan:
          'Batas kuota harian VirusTotal tercapai (maksimal 500 permintaan per hari)',
      };
    }

    requestTimestamps.push(now);
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_VIRUSTOTAL_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout setelah ${timeoutMs}ms`));
  }, timeoutMs);

  const fetchImpl = options?.fetchFn ?? fetch;
  const urlId = getVirusTotalUrlId(url);
  const endpoint = `${VIRUSTOTAL_API_BASE_URL}/${urlId}`;

  try {
    const response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          ditemukan: false,
          jumlahVendorBerbahaya: 0,
          totalVendor: 0,
          status: 'tidak_tersedia',
          keterangan: `Layanan VirusTotal tidak tersedia (HTTP ${response.status})`,
        };
      }

      if (response.status === 429) {
        return {
          ditemukan: false,
          jumlahVendorBerbahaya: 0,
          totalVendor: 0,
          status: 'tidak_tersedia',
          keterangan: 'Batas kuota VirusTotal terlampaui (HTTP 429)',
        };
      }

      if (response.status === 404) {
        return {
          ditemukan: false,
          jumlahVendorBerbahaya: 0,
          totalVendor: 0,
          status: 'ok',
          keterangan: 'URL belum pernah dianalisis di VirusTotal',
        };
      }

      return {
        ditemukan: false,
        jumlahVendorBerbahaya: 0,
        totalVendor: 0,
        status: 'gagal',
        keterangan: `Permintaan ke VirusTotal API gagal (HTTP ${response.status})`,
      };
    }

interface VirusTotalApiResponse {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      last_analysis_stats?: {
        harmless?: number;
        malicious?: number;
        suspicious?: number;
        undetected?: number;
        timeout?: number;
      };
      last_analysis_results?: Record<string, { category?: string }>;
    };
  };
}

    let data: VirusTotalApiResponse;
    try {
      data = (await response.json()) as VirusTotalApiResponse;
    } catch {
      return {
        ditemukan: false,
        jumlahVendorBerbahaya: 0,
        totalVendor: 0,
        status: 'gagal',
        keterangan: 'Format respons VirusTotal bukan JSON yang valid',
      };
    }

    const attributes = data?.data?.attributes;
    const stats = attributes?.last_analysis_stats || {};
    const malicious = typeof stats.malicious === 'number' ? stats.malicious : 0;
    const suspicious = typeof stats.suspicious === 'number' ? stats.suspicious : 0;
    const harmless = typeof stats.harmless === 'number' ? stats.harmless : 0;
    const undetected = typeof stats.undetected === 'number' ? stats.undetected : 0;
    const timeoutCount = typeof stats.timeout === 'number' ? stats.timeout : 0;

    let totalVendor =
      malicious + suspicious + harmless + undetected + timeoutCount;

    if (
      totalVendor === 0 &&
      attributes?.last_analysis_results &&
      typeof attributes.last_analysis_results === 'object'
    ) {
      totalVendor = Object.keys(attributes.last_analysis_results).length;
    }

    const jumlahVendorBerbahaya = malicious;
    const ditemukan = jumlahVendorBerbahaya > 0;

    let keterangan: string;
    if (jumlahVendorBerbahaya > 0) {
      keterangan = `${jumlahVendorBerbahaya} dari ${totalVendor} vendor keamanan menandai URL ini sebagai berbahaya`;
    } else if (totalVendor > 0) {
      keterangan = `Tidak ada vendor yang menandai berbahaya (0 dari ${totalVendor} vendor)`;
    } else {
      keterangan = 'Tidak ada ancaman terdeteksi di VirusTotal';
    }

    return {
      ditemukan,
      jumlahVendorBerbahaya,
      totalVendor,
      status: 'ok',
      keterangan,
    };
  } catch (error: unknown) {
    if (
      (error instanceof Error &&
        (error.name === 'AbortError' ||
          error.name === 'TimeoutError' ||
          error.message.includes('Timeout'))) ||
      controller.signal.aborted
    ) {
      return {
        ditemukan: false,
        jumlahVendorBerbahaya: 0,
        totalVendor: 0,
        status: 'gagal',
        keterangan: `Pemeriksaan VirusTotal melebihi batas waktu (${timeoutMs} ms)`,
      };
    }

    const pesanError =
      error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga';
    return {
      ditemukan: false,
      jumlahVendorBerbahaya: 0,
      totalVendor: 0,
      status: 'gagal',
      keterangan: `Gagal menghubungi VirusTotal API: ${pesanError}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
