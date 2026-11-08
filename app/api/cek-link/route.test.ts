import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { checkSafeBrowsing } from '@/lib/safe-browsing';
import { queryDomainAge } from '@/lib/rdap';
import { explainLink } from '@/lib/gemini';
import type { FormatDataHasil } from '@/lib/hasil';
import linkContohJson from '@/data/contoh/link-contoh.json';

vi.mock('@/lib/safe-browsing', () => ({
  checkSafeBrowsing: vi.fn(),
}));

vi.mock('@/lib/rdap', () => ({
  queryDomainAge: vi.fn(),
}));

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    explainLink: vi.fn(),
  };
});

describe('POST /api/cek-link Route Handler (Task 13.1)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };

    // Default mocks: Safe Browsing bersih, RDAP tidak ditemukan/netral, Gemini return null (fallback lokal)
    vi.mocked(checkSafeBrowsing).mockResolvedValue({
      ditemukan: false,
      ancaman: [],
      status: 'ok',
      keterangan: 'Tidak ada ancaman terdeteksi',
    });

    vi.mocked(queryDomainAge).mockResolvedValue({
      tersedia: false,
      status: 'tidak_tersedia',
      keterangan: 'Data RDAP tidak tersedia',
    });

    vi.mocked(explainLink).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // Helper untuk membuat Request objek
  const createRequest = (body: unknown): Request => {
    return new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  };

  describe('1. Validasi Request Body (Requirement 17.1)', () => {
    it('mengembalikan status 400 jika body request bukan JSON yang valid', async () => {
      const req = new Request('http://localhost:3000/api/cek-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-{broken',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/format permintaan tidak valid/i);
    });

    it('mengembalikan status 400 jika properti url tidak ada', async () => {
      const req = createRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/URL harus diisi/i);
    });

    it('mengembalikan status 400 jika url berupa string kosong atau hanya spasi', async () => {
      const req = createRequest({ url: '   ' });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/URL harus diisi/i);
    });

    it('mengembalikan status 400 jika panjang url melebihi 2.000 karakter', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2001);
      const req = createRequest({ url: longUrl });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toMatch(/maksimal 2\.000 karakter/i);
    });
  });

  describe('2. Sanitasi Parameter Sensitif (Requirement 17.3, 17.4)', () => {
    it('membuang parameter sensitif (email, token, otp, password) sebelum dikirim ke Safe Browsing dan RDAP', async () => {
      const dirtyUrl =
        'https://promo-spesial.com/klaim?email=user@test.com&token=secret123&otp=889900&id=admin&promo=merdeka';

      const req = createRequest({ url: dirtyUrl });
      const res = await POST(req);
      expect(res.status).toBe(200);

      // Verifikasi Safe Browsing dipanggil dengan URL yang parameter sensitifnya telah dibuang
      expect(checkSafeBrowsing).toHaveBeenCalled();
      const calledUrl = vi.mocked(checkSafeBrowsing).mock.calls[0][0];

      expect(calledUrl).not.toContain('user@test.com');
      expect(calledUrl).not.toContain('secret123');
      expect(calledUrl).not.toContain('889900');
      // Parameter non-sensitif 'promo' tetap dipertahankan
      expect(calledUrl).toContain('promo=merdeka');
    });

    it('mengirim URL bersih tanpa parameter sensitif ke Gemini explainLink', async () => {
      const dirtyUrl = 'https://phishing-site.test/login?password=rahasia123&token=xyz';

      const req = createRequest({ url: dirtyUrl });
      await POST(req);

      expect(explainLink).toHaveBeenCalled();
      const diagnostik = vi.mocked(explainLink).mock.calls[0][0];
      expect(diagnostik.url).not.toContain('rahasia123');
      expect(diagnostik.url).not.toContain('xyz');
    });
  });

  describe('3. Contoh Fiktif Tanpa Kuota API (Requirement 21.1)', () => {
    it('mengembalikan langsung respons simulasi untuk contoh link bank hadiah tanpa memanggil Safe Browsing / RDAP / Gemini', async () => {
      const contohSkenario = linkContohJson.skenario[0];
      const req = createRequest({ url: contohSkenario.url });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.halaman).toBe('link');
      expect(json.level).toBe(contohSkenario.hasilSimulasi.level);
      expect(json.ringkasan).toBe(contohSkenario.hasilSimulasi.ringkasan);

      // Pastikan TIDAK memanggil layanan eksternal
      expect(checkSafeBrowsing).not.toHaveBeenCalled();
      expect(queryDomainAge).not.toHaveBeenCalled();
      expect(explainLink).not.toHaveBeenCalled();
    });

    it('tetap mencocokkan contoh fiktif meskipun ada variasi trailing slash atau tanpa protokol', async () => {
      const contohSkenario = linkContohJson.skenario[1]; // sh0pee promo
      // Hilangkan https:// dan tambahkan trailing slash
      const urlVariant = contohSkenario.url.replace(/^https?:\/\//, '') + '/';

      const req = createRequest({ url: urlVariant });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.level).toBe(contohSkenario.hasilSimulasi.level);

      expect(checkSafeBrowsing).not.toHaveBeenCalled();
      expect(queryDomainAge).not.toHaveBeenCalled();
      expect(explainLink).not.toHaveBeenCalled();
    });
  });

  describe('4. Pemeriksaan Paralel & Layanan Pihak Ketiga (Requirements 18.1 - 18.4, 19.1, 19.3)', () => {
    it('menetapkan tingkat kewaspadaan tinggi jika Google Safe Browsing mendeteksi ancaman', async () => {
      vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
        ditemukan: true,
        ancaman: ['SOCIAL_ENGINEERING'],
        status: 'ok',
        keterangan: 'Ditemukan ancaman: SOCIAL_ENGINEERING',
      });

      const req = createRequest({ url: 'https://login-verifikasi-palsu.com' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.level).toBe('tinggi');
      expect(json.status_layanan.safe_browsing).toBe('ok');

      // Terdapat temuan dengan sumber safe_browsing
      const safeBrowsingTemuan = json.temuan.find((t) => t.sumber === 'safe_browsing');
      expect(safeBrowsingTemuan).toBeDefined();
      expect(safeBrowsingTemuan?.judul).toMatch(/Google Safe Browsing/i);
    });

    it('menambahkan skor dan temuan jika RDAP mendeteksi domain berumur < 30 hari', async () => {
      vi.mocked(queryDomainAge).mockResolvedValueOnce({
        tersedia: true,
        umurHari: 5,
        tanggalRegistrasi: '2025-02-15T00:00:00Z',
        status: 'ok',
        keterangan: 'Domain terdaftar sejak 5 hari yang lalu',
      });

      const req = createRequest({ url: 'https://situs-baru-kemarin.com' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.status_layanan.rdap).toBe('ok');

      const rdapTemuan = json.temuan.find((t) => t.sumber === 'rdap');
      expect(rdapTemuan).toBeDefined();
      expect(rdapTemuan?.judul).toMatch(/kurang dari 30 hari/i);
    });

    it('menangani kegagalan Safe Browsing (timeout / error) secara gracefully tanpa error 500', async () => {
      vi.mocked(checkSafeBrowsing).mockRejectedValueOnce(
        new Error('Safe Browsing API connection timeout')
      );

      const req = createRequest({ url: 'https://sh0pee-diskon-gede.com' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.status_layanan.safe_browsing).toBe('gagal');
      // Aturan leksikal tetap bekerja (nama merek sh0pee -> level sedang/tinggi)
      expect(json.level).not.toBe('tidak_ditemukan');
      expect(json.temuan.length).toBeGreaterThanOrEqual(1);
    });

    it('menangani kegagalan RDAP secara gracefully tanpa memutus alur pemeriksaan', async () => {
      vi.mocked(queryDomainAge).mockResolvedValueOnce({
        tersedia: false,
        status: 'gagal',
        keterangan: 'HTTP 500 error from RDAP',
      });

      const req = createRequest({ url: 'https://192.168.1.1/login' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.status_layanan.rdap).toBe('gagal');
      // Alamat IP numerik terdeteksi oleh aturan leksikal
      expect(json.temuan.some((t) => t.judul.includes('IP numerik'))).toBe(true);
    });
  });

  describe('5. Integrasi Gemini & Fallback Penjelasan (Requirements 20.1 - 20.3, 29.2)', () => {
    it('menggunakan respons edukatif dari Gemini jika pemanggilan explainLink sukses', async () => {
      const mockGeminiHasil: FormatDataHasil = {
        halaman: 'link',
        level: 'sedang',
        ringkasan: 'Tautan ini memiliki beberapa indikator mencurigakan yang perlu diteliti.',
        temuan: [
          {
            judul: 'Penggunaan domain pengganti merek',
            penjelasan: 'Domain meniru merek ternama untuk mengelabui pengunjung.',
            bukti: 'sh0pee-promo',
            sumber: 'aturan',
          },
        ],
        hal_wajar: ['Menggunakan sertifikat TLS aktif'],
        langkah: [
          'Jangan masukkan nomor akun atau PIN.',
          'Buka aplikasi resmi langsung dari ponsel kamu.',
        ],
        situasi_darurat: ['klik_link'],
        batasan: 'Analisis berbasis parameter URL dan reputasi domain.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      };

      vi.mocked(explainLink).mockResolvedValueOnce(mockGeminiHasil);

      const req = createRequest({ url: 'https://sh0pee-promo.xyz' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.ringkasan).toBe(mockGeminiHasil.ringkasan);
      expect(json.status_layanan.ai).toBe('ok');
      expect(json.pihak_ketiga).toContain('Google Gemini');
    });

    it('menggabungkan level minimum dari aturan lokal (prinsip rules-first / tidak boleh menurunkan level)', async () => {
      // Safe Browsing mendeteksi ancaman -> level lokal = 'tinggi'
      vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
        ditemukan: true,
        ancaman: ['MALWARE'],
        status: 'ok',
      });

      // Gemini mengembalikan level yang lebih rendah ('sedang')
      const mockGeminiHasil: FormatDataHasil = {
        halaman: 'link',
        level: 'sedang',
        ringkasan: 'Ada tanda mencurigakan.',
        temuan: [
          {
            judul: 'Tanda bahaya',
            penjelasan: 'Penjelasan AI',
            bukti: 'contoh',
            sumber: 'ai',
          },
        ],
        hal_wajar: [],
        langkah: ['Langkah 1', 'Langkah 2'],
        situasi_darurat: [],
        batasan: 'Batasan AI',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      };

      vi.mocked(explainLink).mockResolvedValueOnce(mockGeminiHasil);

      const req = createRequest({ url: 'https://malware-danger.test' });
      const res = await POST(req);
      const json: FormatDataHasil = await res.json();

      // Level akhir tetap 'tinggi' karena aturan Safe Browsing adalah 'tinggi'
      expect(json.level).toBe('tinggi');
    });

    it('menggunakan fallback teks penjelasan bawaan aturan lokal jika Gemini explainLink return null', async () => {
      vi.mocked(explainLink).mockResolvedValueOnce(null);

      const req = createRequest({ url: 'https://bca-klik-promo.top/hadiah' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.status_layanan.ai).toBe('gagal');
      // FormatDataHasil tetap valid dan lengkap
      expect(json.halaman).toBe('link');
      expect(json.ringkasan).toBeTruthy();
      expect(json.temuan.length).toBeGreaterThanOrEqual(1);
      expect(json.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('menggunakan fallback aturan lokal jika pemanggilan explainLink melempar exception', async () => {
      vi.mocked(explainLink).mockRejectedValueOnce(new Error('Gemini API 503 Overloaded'));

      const req = createRequest({ url: 'https://bit.ly/update-bank-2025' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.status_layanan.ai).toBe('gagal');
      expect(json.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('mempertahankan levelMinimum dan temuanAturan yang dikirimkan oleh klien', async () => {
      const clientTemuan = [
        {
          judul: 'Temuan khusus dari client',
          penjelasan: 'Penjelasan client',
          bukti: 'bukti-client',
          sumber: 'aturan' as const,
        },
      ];

      const req = createRequest({
        url: 'https://normal-domain.com',
        levelMinimum: 'sedang',
        temuanAturan: clientTemuan,
      });

      const res = await POST(req);
      const json: FormatDataHasil = await res.json();

      // Level minimal dari client ('sedang') tetap dijaga
      expect(['sedang', 'tinggi']).toContain(json.level);
      // Temuan client dimasukkan ke daftar temuan akhir
      expect(json.temuan.some((t) => t.judul === 'Temuan khusus dari client')).toBe(true);
    });
  });

  describe('6. Logging Aman (Requirement 31.1, 31.4)', () => {
    it('tidak mencatat isi URL pengguna yang mengandung parameter atau data sensitif di console log', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const sensitiveUrl = 'https://bank-palsu.com/login?token=supersecret123&phone=081234567890';
      const req = createRequest({ url: sensitiveUrl });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const allLogCalls = [...logSpy.mock.calls, ...warnSpy.mock.calls]
        .map((args) => args.join(' '))
        .join('\n');

      // Memastikan URL dan token tidak tercatat di output log
      expect(allLogCalls).not.toContain('supersecret123');
      expect(allLogCalls).not.toContain('081234567890');
      expect(allLogCalls).not.toContain(sensitiveUrl);
    });
  });

  describe('7. Kontrak FormatDataHasil dan Round-trip Serialisasi (Requirement 32.2, 32.5)', () => {
    it('mengembalikan objek FormatDataHasil yang konsisten dan lolos JSON round-trip', async () => {
      const req = createRequest({ url: 'https://undian-hadiah-klaim.online' });
      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();

      // Struktur FormatDataHasil lengkap
      expect(json.halaman).toBe('link');
      expect(['tinggi', 'sedang', 'tidak_ditemukan']).toContain(json.level);
      expect(typeof json.ringkasan).toBe('string');
      expect(Array.isArray(json.temuan)).toBe(true);
      expect(Array.isArray(json.hal_wajar)).toBe(true);
      expect(Array.isArray(json.langkah)).toBe(true);
      expect(json.langkah.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(json.situasi_darurat)).toBe(true);
      expect(typeof json.batasan).toBe('string');
      expect(Array.isArray(json.pihak_ketiga)).toBe(true);
      expect(typeof json.status_layanan).toBe('object');

      // Round-trip property (Requirement 32.5)
      const serialized = JSON.stringify(json);
      const parsedRoundTrip = JSON.parse(serialized);
      expect(parsedRoundTrip).toEqual(json);
    });
  });
});
