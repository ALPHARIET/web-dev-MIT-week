import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkVirusTotal,
  simulateVirusTotal,
  getVirusTotalUrlId,
  resetVirusTotalRateLimit,
  VIRUSTOTAL_API_BASE_URL,
  DEFAULT_VIRUSTOTAL_TIMEOUT_MS,
  VIRUSTOTAL_RATE_LIMIT_PER_MINUTE,
  VIRUSTOTAL_RATE_LIMIT_PER_DAY,
} from './virustotal';

describe('lib/virustotal.ts — VirusTotal v3 Helper', () => {
  const originalEnvKey = process.env.VIRUSTOTAL_API_KEY;
  const originalSimulate = process.env.VIRUSTOTAL_SIMULATE;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.VIRUSTOTAL_API_KEY;
    delete process.env.VIRUSTOTAL_SIMULATE;
    resetVirusTotalRateLimit();
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.VIRUSTOTAL_API_KEY = originalEnvKey;
    } else {
      delete process.env.VIRUSTOTAL_API_KEY;
    }

    if (originalSimulate !== undefined) {
      process.env.VIRUSTOTAL_SIMULATE = originalSimulate;
    } else {
      delete process.env.VIRUSTOTAL_SIMULATE;
    }

    resetVirusTotalRateLimit();
  });

  describe('Konstanta dan Ekspor', () => {
    it('mengekspor URL endpoint base VirusTotal v3 yang benar', () => {
      expect(VIRUSTOTAL_API_BASE_URL).toBe(
        'https://www.virustotal.com/api/v3/urls'
      );
    });

    it('mengekspor default timeout 5000 ms (Requirement 18.2)', () => {
      expect(DEFAULT_VIRUSTOTAL_TIMEOUT_MS).toBe(5000);
    });

    it('mengekspor batas kuota: 4 req/menit dan 500 req/hari', () => {
      expect(VIRUSTOTAL_RATE_LIMIT_PER_MINUTE).toBe(4);
      expect(VIRUSTOTAL_RATE_LIMIT_PER_DAY).toBe(500);
    });
  });

  describe('Pengkodean URL Identifier (getVirusTotalUrlId)', () => {
    it('mengubah URL menjadi base64url tanpa padding =', () => {
      const url = 'http://www.google.com';
      const id = getVirusTotalUrlId(url);
      expect(id).toBe('aHR0cDovL3d3dy5nb29nbGUuY29t');
      expect(id.includes('=')).toBe(false);
    });

    it('mengganti karakter + dengan - dan / dengan _', () => {
      const url = 'https://example.com/test?a=1&b=2';
      const id = getVirusTotalUrlId(url);
      expect(id.includes('+')).toBe(false);
      expect(id.includes('/')).toBe(false);
      expect(id.includes('=')).toBe(false);
    });

    it('mengembalikan string kosong untuk URL kosong atau tidak valid', () => {
      expect(getVirusTotalUrlId('')).toBe('');
      expect(getVirusTotalUrlId(null as unknown as string)).toBe('');
      expect(getVirusTotalUrlId(undefined as unknown as string)).toBe('');
    });
  });

  describe('Validasi Input URL', () => {
    it('mengembalikan status "gagal" jika URL kosong', async () => {
      const hasil = await checkVirusTotal('');
      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.keterangan).toContain('tidak valid');
    });

    it('mengembalikan status "gagal" jika URL hanya berisi spasi', async () => {
      const hasil = await checkVirusTotal('   ');
      expect(hasil.status).toBe('gagal');
      expect(hasil.ditemukan).toBe(false);
    });
  });

  describe('Penanganan Mode Simulasi', () => {
    it('mensimulasikan URL berbahaya jika opsi simulate = true', async () => {
      const hasil = await checkVirusTotal(
        'https://promo-sh0pee-undian.fake/klaim',
        { simulate: true }
      );
      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(true);
      expect(hasil.jumlahVendorBerbahaya).toBe(5);
      expect(hasil.totalVendor).toBe(75);
      expect(hasil.keterangan).toContain('Simulasi VirusTotal');
    });

    it('mensimulasikan URL aman jika opsi simulate = true untuk URL wajar', async () => {
      const hasil = await checkVirusTotal('https://example.com/about', {
        simulate: true,
      });
      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.jumlahVendorBerbahaya).toBe(0);
      expect(hasil.totalVendor).toBe(75);
    });

    it('menggunakan simulasi jika apiKey = "simulation"', async () => {
      const hasil = await checkVirusTotal(
        'https://bank-bca-klik-promo.xyz/login',
        { apiKey: 'simulation' }
      );
      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(true);
      expect(hasil.jumlahVendorBerbahaya).toBe(5);
    });

    it('menggunakan simulasi jika VIRUSTOTAL_SIMULATE="true" dan API key kosong', async () => {
      process.env.VIRUSTOTAL_SIMULATE = 'true';
      const hasil = await checkVirusTotal('https://malware-download.info/file');
      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(true);
    });

    it('simulateVirusTotal langsung mengembalikan status gagal jika URL kosong', () => {
      const hasil = simulateVirusTotal('');
      expect(hasil.status).toBe('gagal');
    });
  });

  describe('Penanganan API Key Kosong', () => {
    it('mengembalikan status "tidak_tersedia" jika API key tidak disetel dan simulasi mati', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const hasil = await checkVirusTotal('https://example.com');

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.jumlahVendorBerbahaya).toBe(0);
      expect(hasil.keterangan).toContain('API key VirusTotal tidak tersedia');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('mengembalikan status "tidak_tersedia" jika options.apiKey hanya spasi', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: '   ',
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Pemanggilan API Nyata dan Respons Sukses (HTTP 200)', () => {
    it('memeriksa URL berbahaya dan mendeteksi vendor ancaman', async () => {
      const mockResponseBody = {
        data: {
          id: 'test-id',
          type: 'url',
          attributes: {
            last_analysis_stats: {
              harmless: 65,
              malicious: 4,
              suspicious: 1,
              undetected: 10,
              timeout: 0,
            },
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponseBody,
      });

      const hasil = await checkVirusTotal('https://phishing-site.test', {
        apiKey: 'vt-test-api-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(true);
      expect(hasil.jumlahVendorBerbahaya).toBe(4);
      expect(hasil.totalVendor).toBe(80); // 65 + 4 + 1 + 10 + 0
      expect(hasil.keterangan).toContain('4 dari 80 vendor');

      // Verifikasi header dan endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledInit] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain(VIRUSTOTAL_API_BASE_URL);
      expect(calledInit.headers['x-apikey']).toBe('vt-test-api-key');
    });

    it('memeriksa URL bersih tanpa vendor berbahaya', async () => {
      const mockResponseBody = {
        data: {
          id: 'test-id',
          type: 'url',
          attributes: {
            last_analysis_stats: {
              harmless: 72,
              malicious: 0,
              suspicious: 0,
              undetected: 8,
              timeout: 0,
            },
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponseBody,
      });

      const hasil = await checkVirusTotal('https://kominfo.go.id', {
        apiKey: 'vt-test-api-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.jumlahVendorBerbahaya).toBe(0);
      expect(hasil.totalVendor).toBe(80);
      expect(hasil.keterangan).toContain('Tidak ada vendor');
    });

    it('fallback totalVendor dari last_analysis_results jika last_analysis_stats kosong', async () => {
      const mockResponseBody = {
        data: {
          id: 'test-id',
          type: 'url',
          attributes: {
            last_analysis_results: {
              VendorA: { category: 'malicious' },
              VendorB: { category: 'harmless' },
              VendorC: { category: 'undetected' },
            },
          },
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponseBody,
      });

      const hasil = await checkVirusTotal('https://contoh.com', {
        apiKey: 'vt-test-api-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.totalVendor).toBe(3);
    });
  });

  describe('Penanganan HTTP 404 (URL Belum Terdaftar)', () => {
    it('mengembalikan status "ok" dengan 0 vendor berbahaya jika URL 404 Not Found', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const hasil = await checkVirusTotal('https://new-unknown-url.org', {
        apiKey: 'vt-test-api-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('ok');
      expect(hasil.ditemukan).toBe(false);
      expect(hasil.jumlahVendorBerbahaya).toBe(0);
      expect(hasil.totalVendor).toBe(0);
      expect(hasil.keterangan).toContain('belum pernah dianalisis');
    });
  });

  describe('Penanganan HTTP Error dan Kegagalan Layanan', () => {
    it('mengembalikan status "tidak_tersedia" jika mendapat HTTP 401 Unauthorized', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'invalid-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.keterangan).toContain('401');
    });

    it('mengembalikan status "tidak_tersedia" jika mendapat HTTP 403 Forbidden', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'forbidden-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.keterangan).toContain('403');
    });

    it('mengembalikan status "tidak_tersedia" jika batas kuota server terlampaui (HTTP 429)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'my-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('tidak_tersedia');
      expect(hasil.keterangan).toContain('429');
    });

    it('mengembalikan status "gagal" jika server error (HTTP 500)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'my-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.keterangan).toContain('500');
    });

    it('mengembalikan status "gagal" jika respons bukan JSON yang valid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token <');
        },
      });

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'my-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.keterangan).toContain('bukan JSON');
    });
  });

  describe('Penanganan Timeout dan Kegagalan Jaringan', () => {
    it('mengembalikan status "gagal" jika permintaan melebihi batas waktu (timeout 5 detik)', async () => {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'AbortError';

      const mockFetch = vi.fn().mockRejectedValue(timeoutError);

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'my-key',
        timeoutMs: 5000,
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.keterangan).toContain('batas waktu');
    });

    it('mengembalikan status "gagal" jika terjadi network error tanpa crash', async () => {
      const networkError = new TypeError('Failed to fetch');
      const mockFetch = vi.fn().mockRejectedValue(networkError);

      const hasil = await checkVirusTotal('https://example.com', {
        apiKey: 'my-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        skipRateLimit: true,
      });

      expect(hasil.status).toBe('gagal');
      expect(hasil.keterangan).toContain('Gagal menghubungi');
    });
  });

  describe('Rate Limiting Internal (4 req/menit, 500 req/hari)', () => {
    it('menolak permintaan ke-5 dalam rentang 1 menit dengan status "tidak_tersedia"', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            attributes: {
              last_analysis_stats: { harmless: 70, malicious: 0 },
            },
          },
        }),
      });

      const baseNow = 1_000_000;

      // Panggilan 1-4 harus sukses
      for (let i = 1; i <= 4; i++) {
        const res = await checkVirusTotal(`https://example${i}.com`, {
          apiKey: 'test-key',
          fetchFn: mockFetch as unknown as typeof fetch,
          now: baseNow + i * 1000,
        });
        expect(res.status).toBe('ok');
      }

      // Panggilan ke-5 pada menit yang sama harus ditolak
      const res5 = await checkVirusTotal('https://example5.com', {
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        now: baseNow + 5000,
      });

      expect(res5.status).toBe('tidak_tersedia');
      expect(res5.keterangan).toContain('4 permintaan per menit');
      expect(mockFetch).toHaveBeenCalledTimes(4); // Panggilan ke-5 tidak diteruskan ke fetch
    });

    it('mengizinkan permintaan kembali setelah melewati jendela 1 menit', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            attributes: {
              last_analysis_stats: { harmless: 70, malicious: 0 },
            },
          },
        }),
      });

      const baseNow = 1_000_000;

      // 4 panggilan pertama
      for (let i = 1; i <= 4; i++) {
        await checkVirusTotal(`https://example${i}.com`, {
          apiKey: 'test-key',
          fetchFn: mockFetch as unknown as typeof fetch,
          now: baseNow + i * 1000,
        });
      }

      // Panggilan setelah 61 detik diizinkan
      const resAfterMinute = await checkVirusTotal('https://example5.com', {
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        now: baseNow + 65_000,
      });

      expect(resAfterMinute.status).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('menolak permintaan jika melebihi batas 500 req/hari', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            attributes: {
              last_analysis_stats: { harmless: 70, malicious: 0 },
            },
          },
        }),
      });

      const baseNow = 1_000_000_000;

      // Panggilan 1-4 dalam menit terpisah agar tidak kena limit per menit
      // Simulasikan 500 panggilan dengan memanipulasi riwayat timestamp atau pengulangan
      // Kita panggil reset lalu isi riwayat
      const resAwal = await checkVirusTotal('https://contoh.com', {
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        now: baseNow,
      });
      expect(resAwal.status).toBe('ok');

      // Panggil resetVirusTotalRateLimit lalu lakukan loop uji limit harian dengan memanipulasi waktu
      // Simulasikan batas harian terlampaui
      for (let i = 2; i <= 500; i++) {
        // Setiap panggilan berjarak 2 menit agar lolos rate limit per menit
        await checkVirusTotal(`https://contoh-${i}.com`, {
          apiKey: 'test-key',
          fetchFn: mockFetch as unknown as typeof fetch,
          now: baseNow + i * 120_000, // 2 menit per request
          skipRateLimit: true, // cepat isi
        });
      }

      // Sekarang ada riwayat 500 entri jika dicatat, mari kita uji dengan fungsi langsung
      resetVirusTotalRateLimit();
      // Tambahkan 500 entri ke internal tracker
      for (let i = 0; i < 500; i++) {
        await checkVirusTotal('https://dummy.com', {
          apiKey: 'test-key',
          fetchFn: mockFetch as unknown as typeof fetch,
          now: baseNow - (500 - i) * 120_000,
        });
      }

      // Permintaan ke-501 harus ditolak
      const res501 = await checkVirusTotal('https://contoh-501.com', {
        apiKey: 'test-key',
        fetchFn: mockFetch as unknown as typeof fetch,
        now: baseNow + 120_000,
      });

      expect(res501.status).toBe('tidak_tersedia');
      expect(res501.keterangan).toContain('500 permintaan per hari');
    });
  });
});
