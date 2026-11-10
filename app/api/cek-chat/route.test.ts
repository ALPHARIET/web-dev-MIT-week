import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { analyzeChat } from '@/lib/gemini';
import type { FormatDataHasil } from '@/lib/hasil';

const MAKS_PAYLOAD_BYTES = 4 * 1024 * 1024;

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    analyzeChat: vi.fn(),
  };
});

describe('POST /api/cek-chat Route Handler (Task 12.1)', () => {
  const originalEnv = process.env;

  const sampleJpgBase64 =
    'data:image/jpeg;base64,' +
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]).toString('base64');

  const samplePngBase64 =
    'data:image/png;base64,' +
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]).toString('base64');

  const sampleWebpBase64 =
    'data:image/webp;base64,' +
    Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x18, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      0x56, 0x50, 0x38,
    ]).toString('base64');

  const sampleGifBase64 =
    'data:image/gif;base64,' +
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]).toString('base64');

  const sampleTextFileBase64 =
    'data:text/plain;base64,' + Buffer.from('Halo ini bukan gambar').toString('base64');

  const createRequest = (
    body: unknown,
    headers: Record<string, string> = {}
  ): Request => {
    return new Request('http://localhost:3000/api/cek-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  };

  const createGeminiResult = (
    overrides?: Partial<FormatDataHasil>
  ): FormatDataHasil => ({
    halaman: 'chat',
    level: 'sedang',
    ringkasan: 'Ada indikasi yang perlu kamu waspadai dalam pesan ini.',
    temuan: [
      {
        judul: 'Pola permintaan transfer mencurigakan',
        penjelasan: 'Pesan meminta transfer uang tanpa alasan yang jelas.',
        bukti: 'Tolong transfer segera ya.',
        sumber: 'ai',
      },
    ],
    hal_wajar: ['Pengirim menyapa dengan sopan'],
    langkah: [
      'Jangan transfer uang ke pihak yang belum diverifikasi.',
      'Konfirmasi nomor pengirim melalui kontak resmi.',
    ],
    situasi_darurat: [],
    batasan: 'Analisis berbasis isi pesan yang dikirimkan.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: { ai: 'ok' },
    ...overrides,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(analyzeChat).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Validasi Batas Ukuran Payload (Requirement 26.1)', () => {
    it('mengembalikan status 413 jika header Content-Length melebihi 4 MB', async () => {
      const oversizedLength = MAKS_PAYLOAD_BYTES + 1024;
      const req = createRequest(
        { mode: 'teks', teks: 'Halo' },
        { 'content-length': oversizedLength.toString() }
      );

      const res = await POST(req);
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.error).toBe('Payload Too Large');
      expect(json.pesan).toMatch(/melebihi batas/i);
    });

    it('mengembalikan status 413 jika ukuran teks body request melebihi 4 MB', async () => {
      const bigText = 'a'.repeat(MAKS_PAYLOAD_BYTES + 50);
      const req = createRequest({ mode: 'teks', teks: bigText });

      const res = await POST(req);
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.error).toBe('Payload Too Large');
    });

    it('mengembalikan status 413 jika total ukuran data gambar melebihi 4 MB', async () => {
      const bigBuffer = Buffer.alloc(MAKS_PAYLOAD_BYTES + 100);
      bigBuffer[0] = 0xff;
      bigBuffer[1] = 0xd8;
      bigBuffer[2] = 0xff;
      bigBuffer[3] = 0xe0;

      const bigImageBase64 =
        'data:image/jpeg;base64,' + bigBuffer.toString('base64');

      const req = createRequest({
        mode: 'screenshot',
        gambar: [bigImageBase64],
      });

      const res = await POST(req);
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.error).toBe('Payload Too Large');
      expect(json.pesan).toMatch(/melebihi batas (?:maksimal )?4 MB/i);
    });
  });

  describe('2. Validasi Format JSON & Body (Requirement 26.4)', () => {
    it('mengembalikan status 400 jika body bukan JSON yang valid', async () => {
      const req = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-{broken',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe('Bad Request');
      expect(json.pesan).toMatch(/bukan JSON yang valid/i);
    });

    it('mengembalikan status 400 jika body berupa array bukan object', async () => {
      const req = createRequest([1, 2, 3]);

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/harus berupa objek/i);
    });

    it('mengembalikan status 400 jika mode bukan "teks" atau "screenshot"', async () => {
      const req = createRequest({ mode: 'audio' });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/Mode harus berupa 'teks' atau 'screenshot'/i);
    });
  });

  describe('3. Validasi Mode "teks" (Requirements 11.2, 26.4)', () => {
    it('mengembalikan status 400 jika teks kosong atau hanya whitespace', async () => {
      const req = createRequest({ mode: 'teks', teks: '   ' });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/Teks percakapan tidak boleh kosong/i);
    });

    it('mengembalikan status 400 jika panjang teks melebihi 4.000 karakter', async () => {
      const longText = 'a'.repeat(4001);
      const req = createRequest({ mode: 'teks', teks: longText });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/melebihi batas maksimal 4.000 karakter/i);
    });
  });

  describe('4. Validasi Mode "screenshot" & Magic Bytes (Requirements 26.2, 26.3, 26.4)', () => {
    it('mengembalikan status 400 jika array gambar kosong', async () => {
      const req = createRequest({ mode: 'screenshot', gambar: [] });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/Gambar tidak boleh kosong/i);
    });

    it('mengembalikan status 400 jika jumlah gambar melebihi 5', async () => {
      const req = createRequest({
        mode: 'screenshot',
        gambar: [
          sampleJpgBase64,
          sampleJpgBase64,
          sampleJpgBase64,
          sampleJpgBase64,
          sampleJpgBase64,
          sampleJpgBase64,
        ],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/melebihi batas maksimal 5 gambar/i);
    });

    it('mengembalikan status 400 jika salah satu gambar berupa string kosong', async () => {
      const req = createRequest({
        mode: 'screenshot',
        gambar: ['   '],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/Data gambar ke-1 tidak valid atau kosong/i);
    });

    it('mengembalikan status 400 jika tipe file bukan JPG, PNG, atau WebP (misal GIF)', async () => {
      const req = createRequest({
        mode: 'screenshot',
        gambar: [sampleGifBase64],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/Format file gambar ke-1 tidak didukung/i);
      expect(json.pesan).toMatch(/Hanya file JPG, PNG, dan WebP/i);
    });

    it('mengembalikan status 400 jika file teks disamarkan sebagai base64 gambar', async () => {
      const req = createRequest({
        mode: 'screenshot',
        gambar: [sampleTextFileBase64],
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.pesan).toMatch(/Format file gambar ke-1 tidak didukung/i);
    });

    it('menerima format JPG, PNG, dan WebP yang valid', async () => {
      vi.mocked(analyzeChat).mockResolvedValue(createGeminiResult());

      const req = createRequest({
        mode: 'screenshot',
        gambar: [sampleJpgBase64, samplePngBase64, sampleWebpBase64],
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.halaman).toBe('chat');
    });
  });

  describe('5. Mode "teks" dengan Analisis Gemini Sukses (Requirements 14.1, 14.4)', () => {
    it('memanggil analyzeChat dan mengembalikan 200 OK dengan FormatDataHasil', async () => {
      const mockResult = createGeminiResult({
        level: 'sedang',
        ringkasan: 'Ditemukan indikasi penipuan lowongan kerja palsu.',
      });
      vi.mocked(analyzeChat).mockResolvedValue(mockResult);

      const req = createRequest({
        mode: 'teks',
        teks: 'Tawaran kerja like dan review gaji 2 juta sehari',
        konteks: 'Dikirim dari nomor tidak dikenal',
        levelMinimum: 'sedang',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.halaman).toBe('chat');
      expect(json.level).toBe('sedang');
      expect(json.ringkasan).toBe('Ditemukan indikasi penipuan lowongan kerja palsu.');
      expect(json.status_layanan.ai).toBe('ok');
      expect(json.pihak_ketiga).toContain('Google Gemini');

      expect(analyzeChat).toHaveBeenCalledWith({
        mode: 'teks',
        teks: 'Tawaran kerja like dan review gaji 2 juta sehari',
        gambar: undefined,
        konteks: 'Dikirim dari nomor tidak dikenal',
        levelMinimum: 'sedang',
      });
    });

    it('gabungLevel: menjamin level lokal dari client tidak pernah turun (Requirement 14.4)', async () => {
      const mockGemini = createGeminiResult({
        level: 'sedang',
      });
      vi.mocked(analyzeChat).mockResolvedValue(mockGemini);

      const req = createRequest({
        mode: 'teks',
        teks: 'Kirimkan kode OTP 6 digit yang masuk ke SMS kamu',
        levelMinimum: 'tinggi',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.level).toBe('tinggi');
    });

    it('menggabungkan temuanAturan yang dikirim oleh client', async () => {
      const mockGemini = createGeminiResult({
        temuan: [
          {
            judul: 'Temuan dari AI',
            penjelasan: 'Analisis model AI',
            bukti: 'Bukti AI',
            sumber: 'ai',
          },
        ],
      });
      vi.mocked(analyzeChat).mockResolvedValue(mockGemini);

      const req = createRequest({
        mode: 'teks',
        teks: 'Pesan mencurigakan',
        temuanAturan: [
          {
            judul: 'Permintaan kode OTP, PIN, atau kata sandi',
            penjelasan: 'Pihak resmi tidak pernah meminta OTP.',
            bukti: 'minta OTP',
            sumber: 'aturan',
          },
        ],
      });

      const res = await POST(req);
      const json: FormatDataHasil = await res.json();

      expect(json.temuan.some((t) => t.judul === 'Temuan dari AI')).toBe(true);
      expect(
        json.temuan.some((t) =>
          t.judul.includes('Permintaan kode OTP, PIN, atau kata sandi')
        )
      ).toBe(true);
    });
  });

  describe('6. Mode "screenshot" & Evaluasi Transkrip Server (Requirement 14.3)', () => {
    it('menjalankan evaluasiChat atas transkrip Gemini dan menggabungkan temuan aturan lokal', async () => {
      const mockGemini = createGeminiResult({
        level: 'sedang',
        transkrip:
          'Halo kak, tolong kirimkan kode OTP 6 digit yang baru saja masuk ke SMS sekarang juga ya atau akun kamu kami blokir dalam 24 jam.',
        temuan: [
          {
            judul: 'Ajakan memberikan informasi verifikasi',
            penjelasan: 'Pengirim meminta kode otentikasi',
            bukti: 'kode OTP 6 digit',
            sumber: 'ai',
          },
        ],
      });
      vi.mocked(analyzeChat).mockResolvedValue(mockGemini);

      const req = createRequest({
        mode: 'screenshot',
        gambar: [sampleJpgBase64],
        levelMinimum: 'tidak_ditemukan',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.level).toBe('tinggi');

      expect(
        json.temuan.some((t) =>
          t.judul.toLowerCase().includes('otp') || t.sumber === 'aturan'
        )
      ).toBe(true);
    });
  });

  describe('7. Fallback saat Gemini Error / Timeout / API Key Tidak Disetel (Requirements 15.1, 15.3, 29.1, 29.2)', () => {
    it('mengembalikan status 200 OK (bukan 500) dengan hasil aturan lokal saat analyzeChat return null', async () => {
      vi.mocked(analyzeChat).mockResolvedValue(null);

      const req = createRequest({
        mode: 'teks',
        teks: 'Transfer uang 500 ribu sekarang atau akun akan diblokir dalam 24 jam!',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.halaman).toBe('chat');
      expect(json.status_layanan.ai).toBe('gagal');
      expect(json.pihak_ketiga).toContain('Google Gemini');
      expect(json.batasan).toMatch(/analisis AI sedang tidak tersedia/i);

      expect(json.level).toBe('tinggi');
      expect(json.temuan.length).toBeGreaterThanOrEqual(1);
      expect(json.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('fallback untuk mode screenshot saat Gemini gagal: mengembalikan 200 OK', async () => {
      vi.mocked(analyzeChat).mockResolvedValue(null);

      const req = createRequest({
        mode: 'screenshot',
        gambar: [samplePngBase64],
        konteks: 'Pesan dari nomor tak dikenal meminta uang',
        levelMinimum: 'sedang',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.level).toBe('sedang');
      expect(json.status_layanan.ai).toBe('gagal');
      expect(json.batasan).toMatch(/analisis AI sedang tidak tersedia/i);
    });

    it('fallback saat teks sangat pendek (< 20 karakter) memuat catatan teks singkat (Requirement 16.3)', async () => {
      vi.mocked(analyzeChat).mockResolvedValue(null);

      const req = createRequest({
        mode: 'teks',
        teks: 'Pagi kak',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.batasan).toMatch(/Teks chat sangat singkat/i);
    });

    it('menangani exception tak terduga dengan tetap mengembalikan 200 OK fallback', async () => {
      vi.mocked(analyzeChat).mockRejectedValue(new Error('Koneksi terputus tiba-tiba'));

      const req = createRequest({
        mode: 'teks',
        teks: 'Tolong transfer uang sekarang',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json: FormatDataHasil = await res.json();
      expect(json.status_layanan.ai).toBe('gagal');
    });
  });

  describe('8. Keamanan Logging (Requirement 25.4)', () => {
    it('tidak mencatat isi pesan chat, gambar, atau data pengguna di log console', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const secretText = 'RAHASIA_SUPER_PRIBADI_JANGAN_LOG_INI_123456';
      vi.mocked(analyzeChat).mockResolvedValue(
        createGeminiResult({
          ringkasan: 'Hasil pemeriksaan rahasia',
        })
      );

      const req = createRequest({
        mode: 'teks',
        teks: secretText,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const allLogMessages = [
        ...consoleLogSpy.mock.calls.flat(),
        ...consoleWarnSpy.mock.calls.flat(),
        ...consoleErrorSpy.mock.calls.flat(),
      ].map((msg) => (typeof msg === 'string' ? msg : JSON.stringify(msg)));

      for (const logMsg of allLogMessages) {
        expect(logMsg).not.toContain(secretText);
      }
    });

    it('tidak mencatat isi teks saat terjadi error atau fallback', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const sensitiveText = 'SENSITIVE_TEXT_FALLBACK_TEST_999';
      vi.mocked(analyzeChat).mockResolvedValue(null);

      const req = createRequest({
        mode: 'teks',
        teks: sensitiveText,
      });

      await POST(req);

      const allWarnMessages = consoleWarnSpy.mock.calls
        .flat()
        .map((msg) => (typeof msg === 'string' ? msg : JSON.stringify(msg)));

      for (const warnMsg of allWarnMessages) {
        expect(warnMsg).not.toContain(sensitiveText);
      }
    });
  });

  describe('9. Format Hasil Bersama & Kontrak Serialisasi (Requirements 5.1, 30.1, 32.5)', () => {
    it('round-trip serialisasi FormatDataHasil dari respons endpoint (Requirement 32.5)', async () => {
      vi.mocked(analyzeChat).mockResolvedValue(createGeminiResult());

      const req = createRequest({
        mode: 'teks',
        teks: 'Pesan chat normal untuk pengujian serialisasi',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data1: FormatDataHasil = await res.json();
      const stringified = JSON.stringify(data1);
      const data2: FormatDataHasil = JSON.parse(stringified);

      expect(data2).toEqual(data1);
      expect(data2.halaman).toBe('chat');
      expect(['tinggi', 'sedang', 'tidak_ditemukan']).toContain(data2.level);
      expect(Array.isArray(data2.temuan)).toBe(true);
      expect(Array.isArray(data2.langkah)).toBe(true);
      expect(data2.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('kata terlarang tidak lolos sebagai kesimpulan (Requirements 30.1, 30.3)', async () => {
      const mockGeminiWithForbiddenWords = createGeminiResult({
        ringkasan: 'Pesan ini pasti penipuan dan 100% scam.',
        temuan: [
          {
            judul: 'Toko ini pasti penipuan',
            penjelasan: 'Sudah terbukti penipuan di berbagai tempat.',
            bukti: 'Transfer sekarang',
            sumber: 'ai',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan percaya karena belum pasti benar.',
          'Hubungi pihak berwenang.',
        ],
      });
      vi.mocked(analyzeChat).mockResolvedValue(mockGeminiWithForbiddenWords);

      const req = createRequest({
        mode: 'teks',
        teks: 'Pesan dengan klaim tertentu',
      });

      const res = await POST(req);
      const json: FormatDataHasil = await res.json();

      expect(json.ringkasan).not.toMatch(/\bpasti penipuan\b/i);
      expect(json.ringkasan).not.toMatch(/\b100%\b/i);
      expect(json.temuan[0].judul).not.toMatch(/\bpasti penipuan\b/i);
      expect(json.temuan[0].penjelasan).not.toMatch(/\bterbukti penipuan\b/i);
    });
  });
});
