import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractDomain,
  calculateDomainAge,
  queryDomainAge,
  RDAP_BASE_URL,
  DEFAULT_RDAP_TIMEOUT_MS,
  type RdapResult,
} from './rdap';

describe('lib/rdap.ts', () => {
  describe('extractDomain()', () => {
    it('mengekstrak nama domain dari URL lengkap dengan protokol HTTPS', () => {
      expect(extractDomain('https://shopee.co.id/promo?item=123')).toBe(
        'shopee.co.id'
      );
      expect(extractDomain('https://example.com/path/to/page')).toBe(
        'example.com'
      );
    });

    it('mengekstrak nama domain utama dari URL dengan subdomain', () => {
      expect(extractDomain('https://sub.domain.example.com/test')).toBe(
        'example.com'
      );
      expect(extractDomain('https://promo.shopee.co.id')).toBe('shopee.co.id');
    });

    it('mengekstrak domain dari string domain biasa tanpa protokol', () => {
      expect(extractDomain('tokopedia.com')).toBe('tokopedia.com');
      expect(extractDomain('bca.co.id')).toBe('bca.co.id');
    });

    it('mengubah nama domain ke huruf kecil (lowercase)', () => {
      expect(extractDomain('https://SHOPEE.CO.ID/PROMO')).toBe('shopee.co.id');
      expect(extractDomain('EXAMPLE.COM')).toBe('example.com');
    });

    it('menangani port dan userinfo dalam URL', () => {
      expect(
        extractDomain('https://user:password@example.com:8080/path?id=1')
      ).toBe('example.com');
    });

    it('menghapus whitespace di awal dan akhir string', () => {
      expect(extractDomain('   example.org   ')).toBe('example.org');
    });

    it('mengembalikan null untuk alamat IP', () => {
      expect(extractDomain('192.168.1.1')).toBeNull();
      expect(extractDomain('https://192.168.1.1/test')).toBeNull();
      expect(extractDomain('http://127.0.0.1:3000')).toBeNull();
    });

    it('mengembalikan null untuk localhost atau domain tanpa TLD', () => {
      expect(extractDomain('localhost')).toBeNull();
      expect(extractDomain('http://localhost:3000')).toBeNull();
      expect(extractDomain('mycomputer')).toBeNull();
    });

    it('mengembalikan null untuk input kosong atau tidak valid', () => {
      expect(extractDomain('')).toBeNull();
      expect(extractDomain('   ')).toBeNull();
      expect(extractDomain('https://')).toBeNull();
      expect(extractDomain(null as unknown as string)).toBeNull();
      expect(extractDomain(undefined as unknown as string)).toBeNull();
    });
  });

  describe('calculateDomainAge()', () => {
    it('menghitung umur hari dengan tepat berdasarkan tanggal acuan', () => {
      const regDate = '2025-02-15T08:00:00Z';
      const now = new Date('2025-02-20T08:00:00Z');

      const result = calculateDomainAge(regDate, now);
      expect(result).not.toBeNull();
      expect(result?.umurHari).toBe(5);
      expect(result?.tanggalRegistrasi).toBe(new Date(regDate).toISOString());
    });

    it('menghitung umur hari = 0 untuk pendaftaran hari ini', () => {
      const regDate = '2025-02-20T02:00:00Z';
      const now = new Date('2025-02-20T10:00:00Z');

      const result = calculateDomainAge(regDate, now);
      expect(result?.umurHari).toBe(0);
    });

    it('menghitung umur ribuan hari untuk domain lama', () => {
      const regDate = '1995-08-14T04:00:00Z';
      const now = new Date('2025-02-20T00:00:00Z');

      const result = calculateDomainAge(regDate, now);
      expect(result).not.toBeNull();
      expect(result!.umurHari).toBeGreaterThan(10000);
    });

    it('tidak mengembalikan angka negatif jika tanggal registrasi sedikit di masa depan (clock skew)', () => {
      const regDate = '2025-02-20T12:00:00Z';
      const now = new Date('2025-02-20T11:59:00Z');

      const result = calculateDomainAge(regDate, now);
      expect(result?.umurHari).toBe(0);
    });

    it('mengembalikan null jika format tanggal registrasi tidak valid', () => {
      expect(calculateDomainAge('invalid-date')).toBeNull();
      expect(calculateDomainAge('')).toBeNull();
    });
  });

  describe('queryDomainAge()', () => {
    const fixedNow = new Date('2025-02-20T12:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('konstanta RDAP_BASE_URL dan DEFAULT_RDAP_TIMEOUT_MS sesuai spesifikasi', () => {
      expect(RDAP_BASE_URL).toBe('https://rdap.org/domain');
      expect(DEFAULT_RDAP_TIMEOUT_MS).toBe(5000);
    });

    it('berhasil mendapatkan umur domain yang valid (status ok, tersedia true) - Requirement 18.1, 19.3', async () => {
      const mockRdapResponse = {
        objectClassName: 'domain',
        handle: '12345_DOMAIN',
        ldhName: 'EXAMPLE.COM',
        events: [
          {
            eventAction: 'expiration',
            eventDate: '2026-02-15T08:00:00Z',
          },
          {
            eventAction: 'registration',
            eventDate: '2025-02-15T08:00:00Z',
          },
          {
            eventAction: 'last changed',
            eventDate: '2025-02-16T10:00:00Z',
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRdapResponse,
      });

      const res: RdapResult = await queryDomainAge('https://example.com/promo', {
        fetchFn: mockFetch as unknown as typeof fetch,
        now: fixedNow,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toBe('https://rdap.org/domain/example.com');
      const calledInit = mockFetch.mock.calls[0][1];
      expect(calledInit.headers.Accept).toContain('application/rdap+json');

      expect(res.tersedia).toBe(true);
      expect(res.status).toBe('ok');
      expect(res.umurHari).toBe(5);
      expect(res.tanggalRegistrasi).toBe('2025-02-15T08:00:00.000Z');
      expect(res.keterangan).toContain('5 hari');
    });

    it('menangani eventAction dengan huruf besar/kecil (Registration) secara case-insensitive', async () => {
      const mockRdapResponse = {
        events: [
          {
            eventAction: 'Registration',
            eventDate: '2025-02-18T10:00:00Z',
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRdapResponse,
      });

      const res = await queryDomainAge('sh0pee-promo.co.id', {
        fetchFn: mockFetch as unknown as typeof fetch,
        now: fixedNow,
      });

      expect(res.tersedia).toBe(true);
      expect(res.status).toBe('ok');
      expect(res.umurHari).toBe(2);
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika RDAP mengembalikan 404 (Domain tidak ditemukan) - Requirement 19.11', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorCode: 404, title: 'Not Found' }),
      });

      const res = await queryDomainAge('https://domain-palsu-tidak-ada.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('404');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika RDAP mengembalikan 501 (TLD tidak mendukung RDAP)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 501,
        json: async () => ({ errorCode: 501, title: 'Not Implemented' }),
      });

      const res = await queryDomainAge('https://contoh.tld-tanpa-rdap', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('501');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika RDAP mengembalikan 400 Bad Request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ errorCode: 400, title: 'Bad Request' }),
      });

      const res = await queryDomainAge('https://bad-input.org', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
    });

    it('mengembalikan { tersedia: false, status: gagal } jika server RDAP mengalami internal error (HTTP 500)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ errorCode: 500 }),
      });

      const res = await queryDomainAge('https://example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('gagal');
      expect(res.keterangan).toContain('500');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika tidak ada event registration dalam respons RDAP', async () => {
      const mockRdapResponse = {
        objectClassName: 'domain',
        events: [
          { eventAction: 'expiration', eventDate: '2026-01-01T00:00:00Z' },
          { eventAction: 'last changed', eventDate: '2024-01-01T00:00:00Z' },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockRdapResponse,
      });

      const res = await queryDomainAge('example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('registrasi tidak ditemukan');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika array events kosong', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ events: [] }),
      });

      const res = await queryDomainAge('example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika eventDate tidak valid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          events: [{ eventAction: 'registration', eventDate: 'bukan-tanggal' }],
        }),
      });

      const res = await queryDomainAge('example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('tidak valid');
    });

    it('mengembalikan { tersedia: false, status: gagal } jika respons bukan JSON valid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      });

      const res = await queryDomainAge('example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('gagal');
      expect(res.keterangan).toContain('JSON');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika terjadi network error tanpa crash', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Network connection refused (ECONNREFUSED)'));

      const res = await queryDomainAge('example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('Gagal menghubungi');
    });

    it('mengembalikan { tersedia: false, status: tidak_tersedia } jika permintaan melewati batas timeout (Requirement 18.2)', async () => {
      const timeoutError = new Error('Timeout setelah 5000ms');
      timeoutError.name = 'TimeoutError';

      const mockFetch = vi.fn().mockRejectedValue(timeoutError);

      const res = await queryDomainAge('example.com', {
        fetchFn: mockFetch as unknown as typeof fetch,
        timeoutMs: 5000,
      });

      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('batas waktu');
    });

    it('langsung mengembalikan status tidak_tersedia untuk input IP address tanpa memanggil fetch', async () => {
      const mockFetch = vi.fn();

      const res = await queryDomainAge('192.168.1.1', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
      expect(res.keterangan).toContain('IP');
    });

    it('langsung mengembalikan status tidak_tersedia untuk input kosong tanpa memanggil fetch', async () => {
      const mockFetch = vi.fn();

      const res = await queryDomainAge('', {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(res.tersedia).toBe(false);
      expect(res.status).toBe('tidak_tersedia');
    });

    it('bekerja dengan global fetch saat options.fetchFn tidak ditentukan', async () => {
      const mockRdapResponse = {
        events: [
          {
            eventAction: 'registration',
            eventDate: '2025-02-10T12:00:00Z',
          },
        ],
      };

      const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRdapResponse,
      } as unknown as Response);

      const res = await queryDomainAge('https://s.id-update-akun.invalid/dana-kaget', {
        now: fixedNow,
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(res.tersedia).toBe(true);
      expect(res.status).toBe('ok');
      expect(res.umurHari).toBe(10);
    });
  });
});
