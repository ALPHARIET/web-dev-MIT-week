import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSafeBrowsing,
  checkUrl,
  SAFE_BROWSING_API_URL,
  DEFAULT_SAFE_BROWSING_TIMEOUT_MS,
  SAFE_BROWSING_THREAT_TYPES,
  SAFE_BROWSING_PLATFORM_TYPES,
  SAFE_BROWSING_THREAT_ENTRY_TYPES,
} from './safe-browsing';

describe('lib/safe-browsing.ts — Google Safe Browsing Helper', () => {
  const originalEnvKey = process.env.SAFE_BROWSING_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.SAFE_BROWSING_API_KEY;
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.SAFE_BROWSING_API_KEY = originalEnvKey;
    } else {
      delete process.env.SAFE_BROWSING_API_KEY;
    }
  });

  describe('Konstanta dan Ekspor', () => {
    it('mengekspor URL endpoint Google Safe Browsing v4 yang benar', () => {
      expect(SAFE_BROWSING_API_URL).toBe(
        'https://safebrowsing.googleapis.com/v4/threatMatches:find'
      );
    });

    it('mengekspor default timeout 5000 ms', () => {
      expect(DEFAULT_SAFE_BROWSING_TIMEOUT_MS).toBe(5000);
    });

    it('mengekspor daftar threat types lengkap', () => {
      expect(SAFE_BROWSING_THREAT_TYPES).toEqual([
        'MALWARE',
        'SOCIAL_ENGINEERING',
        'UNWANTED_SOFTWARE',
        'POTENTIALLY_HARMFUL_APPLICATION',
      ]);
    });

    it('mengekspor platform types dan threat entry types', () => {
      expect(SAFE_BROWSING_PLATFORM_TYPES).toEqual(['ANY_PLATFORM']);
      expect(SAFE_BROWSING_THREAT_ENTRY_TYPES).toEqual(['URL']);
    });

    it('mengekspor checkUrl sebagai alias untuk checkSafeBrowsing', () => {
      expect(checkUrl).toBe(checkSafeBrowsing);
    });
  });

  describe('Penanganan API Key', () => {
    it('mengembalikan status "tidak_tersedia" jika tidak ada API key di env maupun options', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const hasil = await checkSafeBrowsing('https://contoh-link.com');

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('tidak tersedia');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('mengembalikan status "tidak_tersedia" jika API key hanya berisi spasi kosong', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const hasil = await checkSafeBrowsing('https://contoh-link.com', {
        apiKey: '   ',
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('menggunakan API key dari environment variable jika tidak diberikan di options', async () => {
      process.env.SAFE_BROWSING_API_KEY = 'env-api-key-123';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await checkSafeBrowsing('https://aman.com');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const urlDipanggil = fetchSpy.mock.calls[0][0] as string;
      expect(urlDipanggil).toContain('key=env-api-key-123');
    });

    it('memprioritaskan API key dari options dibanding environment variable', async () => {
      process.env.SAFE_BROWSING_API_KEY = 'env-api-key-123';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await checkSafeBrowsing('https://aman.com', {
        apiKey: 'custom-api-key-456',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const urlDipanggil = fetchSpy.mock.calls[0][0] as string;
      expect(urlDipanggil).toContain('key=custom-api-key-456');
    });
  });

  describe('Validasi Input URL', () => {
    it('mengembalikan status "gagal" tanpa fetch jika URL kosong', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const hasil = await checkSafeBrowsing('', { apiKey: 'dummy-key' });

      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('mengembalikan status "gagal" tanpa fetch jika URL hanya berupa whitespace', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const hasil = await checkSafeBrowsing('   ', { apiKey: 'dummy-key' });

      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Format Permintaan API', () => {
    it('mengirim request POST dengan payload sesuai standar Safe Browsing v4', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await checkSafeBrowsing('https://cek-ini.com/login', {
        apiKey: 'secret-key',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [endpoint, reqOptions] = fetchSpy.mock.calls[0];

      expect(endpoint).toBe(
        'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=secret-key'
      );
      expect(reqOptions?.method).toBe('POST');
      expect(reqOptions?.headers).toEqual({
        'Content-Type': 'application/json',
      });

      const body = JSON.parse(reqOptions?.body as string);
      expect(body).toEqual({
        client: {
          clientId: 'cek-penipuan-web',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: 'https://cek-ini.com/login' }],
        },
      });
    });
  });

  describe('Pendeteksian Ancaman', () => {
    it('mengembalikan ditemukan=true dan jenis ancaman saat API menemukan kecocokan', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [
            {
              threatType: 'SOCIAL_ENGINEERING',
              platformType: 'ANY_PLATFORM',
              threat: { url: 'https://phishing-site.test' },
            },
          ],
        }),
      } as Response);

      const hasil = await checkSafeBrowsing('https://phishing-site.test', {
        apiKey: 'test-key',
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(true);
      expect(hasil.ancaman).toEqual(['SOCIAL_ENGINEERING']);
      expect(hasil.keterangan).toContain('SOCIAL_ENGINEERING');
    });

    it('mendeduplikasi ancaman jika terdapat beberapa entri dengan tipe yang sama', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [
            { threatType: 'MALWARE' },
            { threatType: 'SOCIAL_ENGINEERING' },
            { threatType: 'MALWARE' },
          ],
        }),
      } as Response);

      const hasil = await checkSafeBrowsing('https://harmful-site.test', {
        apiKey: 'test-key',
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(true);
      expect(hasil.ancaman).toEqual(['MALWARE', 'SOCIAL_ENGINEERING']);
    });

    it('mengembalikan ditemukan=false jika respons API berupa objek kosong {}', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const hasil = await checkSafeBrowsing('https://situs-aman.com', {
        apiKey: 'test-key',
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('Tidak ada di daftar ancaman');
    });

    it('mengembalikan ditemukan=false jika respons API berisi matches kosong []', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [] }),
      } as Response);

      const hasil = await checkSafeBrowsing('https://situs-aman.com', {
        apiKey: 'test-key',
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
    });
  });

  describe('Penanganan Error dan Ketidaktersediaan', () => {
    it('mengembalikan status "tidak_tersedia" jika API merespons dengan HTTP 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const hasil = await checkSafeBrowsing('https://situs.com', {
        apiKey: 'invalid-key',
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('401');
    });

    it('mengembalikan status "tidak_tersedia" jika API merespons dengan HTTP 403', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      const hasil = await checkSafeBrowsing('https://situs.com', {
        apiKey: 'forbidden-key',
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('403');
    });

    it('mengembalikan status "gagal" jika API merespons dengan HTTP 500', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const hasil = await checkSafeBrowsing('https://situs.com', {
        apiKey: 'key',
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('500');
    });

    it('mengembalikan status "gagal" saat terjadi network error tanpa crash', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const hasil = await checkSafeBrowsing('https://situs.com', {
        apiKey: 'key',
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('Failed to fetch');
    });

    it('mengembalikan status "gagal" saat terjadi timeout (AbortError) tanpa crash', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

      const hasil = await checkSafeBrowsing('https://situs.com', {
        apiKey: 'key',
        timeoutMs: 100,
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.ancaman).toEqual([]);
      expect(hasil.keterangan).toContain('timeout');
    });
  });
});
