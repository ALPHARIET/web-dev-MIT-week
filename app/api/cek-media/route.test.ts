import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { checkMediaManipulation } from '@/lib/reality-defender';
import type { FormatDataHasil } from '@/lib/hasil';

const MAKS_PAYLOAD_BYTES = 4.5 * 1024 * 1024;

// Mock lib/reality-defender
vi.mock('@/lib/reality-defender', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/reality-defender')>();
  return {
    ...actual,
    checkMediaManipulation: vi.fn(),
  };
});

describe('POST /api/cek-media Route Handler (Task 20.2, Requirements VS-06, 32.3, 32.5)', () => {
  const originalEnv = process.env;

  const sampleFrameBase64 =
    'data:image/jpeg;base64,' +
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]).toString('base64');

  const sampleAudioBase64 =
    'data:audio/mp3;base64,' + Buffer.from('mock-audio-content').toString('base64');

  // Helper membuat Request objek
  const createRequest = (
    body: unknown,
    headers: Record<string, string> = {}
  ): Request => {
    return new Request('http://localhost:3000/api/cek-media', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Validasi Batas Ukuran Payload (Requirement 26.1)', () => {
    it('mengembalikan status 413 jika Content-Length melebihi 4.5 MB', async () => {
      const oversizedLength = MAKS_PAYLOAD_BYTES + 1024;
      const req = createRequest(
        { tipe: 'gambar', data: sampleFrameBase64 },
        { 'content-length': oversizedLength.toString() }
      );

      const res = await POST(req);
      expect(res.status).toBe(413);

      const data = await res.json();
      expect(data.error).toContain('melebihi batas maksimal 4.5 MB');
    });

    it('mengembalikan status 413 jika ukuran string body request melebihi 4.5 MB', async () => {
      const hugeData = 'x'.repeat(Math.ceil(MAKS_PAYLOAD_BYTES + 50));
      const req = createRequest({ tipe: 'gambar', data: hugeData });

      const res = await POST(req);
      expect(res.status).toBe(413);

      const data = await res.json();
      expect(data.error).toContain('melebihi batas maksimal 4.5 MB');
    });
  });

  describe('2. Validasi Format Request Body', () => {
    it('mengembalikan status 400 jika JSON tidak valid', async () => {
      const req = new Request('http://localhost:3000/api/cek-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json-{broken',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain('Format permintaan tidak valid');
    });

    it('mengembalikan status 400 jika tipe media tidak valid atau data kosong', async () => {
      const req1 = createRequest({ tipe: 'video', data: sampleFrameBase64 });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);

      const req2 = createRequest({ tipe: 'gambar', data: '' });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
    });
  });

  describe('3. Integrasi Reality Defender & Aturan Tampilan Sinyal Tambahan (Requirement VS-06)', () => {
    it('menggabungkan level menjadi "tinggi" saat Reality Defender mendeteksi manipulasi visual (deepfake)', async () => {
      vi.mocked(checkMediaManipulation).mockResolvedValueOnce({
        status: 'ok',
        ditemukan: true,
        skorManipulasi: 89,
        tipeMedia: 'gambar',
        keterangan: 'Terdeteksi indikasi manipulasi visual oleh Reality Defender (skor 89/100)',
      });

      const req = createRequest({
        tipe: 'gambar',
        data: sampleFrameBase64,
        levelMinimum: 'tidak_ditemukan',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as FormatDataHasil;
      expect(data.halaman).toBe('video');
      expect(data.level).toBe('tinggi');
      expect(data.pihak_ketiga).toContain('Reality Defender');
      expect(data.status_layanan.reality_defender).toBe('ok');

      // Memeriksa temuan sumber reality_defender
      const rdTemuan = data.temuan.find((t) => t.sumber === 'reality_defender');
      expect(rdTemuan).toBeDefined();
      expect(rdTemuan?.judul).toContain('manipulasi visual');
    });

    it('menggabungkan level menjadi "tinggi" saat Reality Defender mendeteksi voice clone pada audio', async () => {
      vi.mocked(checkMediaManipulation).mockResolvedValueOnce({
        status: 'ok',
        ditemukan: true,
        skorManipulasi: 92,
        tipeMedia: 'audio',
        keterangan: 'Terdeteksi indikasi manipulasi suara oleh Reality Defender (skor 92/100)',
      });

      const req = createRequest({
        tipe: 'audio',
        data: sampleAudioBase64,
        durasiDetik: 25,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as FormatDataHasil;
      expect(data.level).toBe('tinggi');

      const rdTemuan = data.temuan.find((t) => t.sumber === 'reality_defender');
      expect(rdTemuan).toBeDefined();
      expect(rdTemuan?.judul).toContain('manipulasi suara');
    });

    it('LEVEL KONTEKS TETAP LANTAI MINIMUM: level tetap "tinggi" meskipun Reality Defender menyatakan media asli (Requirement VS-06)', async () => {
      // AI mengembalikan authentic / tidak terdeteksi manipulasi
      vi.mocked(checkMediaManipulation).mockResolvedValueOnce({
        status: 'ok',
        ditemukan: false,
        skorManipulasi: 10,
        tipeMedia: 'gambar',
        keterangan: 'Tidak terdeteksi indikasi manipulasi',
      });

      // Konteks situasi: meminta transfer mendesak dari nomor baru (level konteks: tinggi)
      const req = createRequest({
        tipe: 'gambar',
        data: sampleFrameBase64,
        jawabanWizard: {
          situasi: 'video_call',
          apa_diminta: 'transfer',
          nomor_akun: 'nomor_baru',
          darurat_desakan: true,
          diminta_rahasiakan: true,
          bisa_telepon_balik: false,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as FormatDataHasil;
      // Tingkat level TIDAK BOLEH diturunkan ke sedang atau tidak_ditemukan!
      expect(data.level).toBe('tinggi');
      expect(data.status_layanan.reality_defender).toBe('ok');
    });

    it('mencatat batasan kuota gratis 50 scan dan ketiadaan dukungan bahasa Indonesia secara transparan', async () => {
      vi.mocked(checkMediaManipulation).mockResolvedValueOnce({
        status: 'ok',
        ditemukan: false,
        skorManipulasi: 20,
        tipeMedia: 'gambar',
        keterangan: 'Aman',
      });

      const req = createRequest({
        tipe: 'gambar',
        data: sampleFrameBase64,
      });

      const res = await POST(req);
      const data = (await res.json()) as FormatDataHasil;

      expect(data.batasan).toContain('50 scan/bulan');
      expect(data.batasan).toContain('bahasa Indonesia');
      expect(data.batasan).toContain('sinyal tambahan');
    });
  });

  describe('4. Penanganan Fallback Saat Reality Defender Tidak Tersedia atau Gagal (Requirement 29.1, 32.5)', () => {
    it('mengembalikan status_layanan="tidak_tersedia" dan mencatat catatan di batasan saat kuota habis', async () => {
      vi.mocked(checkMediaManipulation).mockResolvedValueOnce({
        status: 'tidak_tersedia',
        ditemukan: false,
        tipeMedia: 'audio',
        keterangan: 'Batas kuota Reality Defender tercapai (50 scan per bulan)',
      });

      const req = createRequest({
        tipe: 'audio',
        data: sampleAudioBase64,
        durasiDetik: 20,
        jawabanWizard: {
          situasi: 'rekaman',
          apa_diminta: 'voucher',
          darurat_desakan: true,
          bisa_telepon_balik: false,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as FormatDataHasil;
      expect(data.status_layanan.reality_defender).toBe('tidak_tersedia');
      expect(data.batasan).toContain('Analisis file media pihak ketiga sedang tidak tersedia');
      // Hasil konteks tetap ditampilkan (level tinggi dari aturan lokal)
      expect(data.level).toBe('tinggi');
    });

    it('tetap mengembalikan 200 OK dengan FormatDataHasil valid saat terjadi exception tak terduga', async () => {
      vi.mocked(checkMediaManipulation).mockRejectedValueOnce(
        new Error('Unexpected network catastrophe')
      );

      const req = createRequest({
        tipe: 'gambar',
        data: sampleFrameBase64,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = (await res.json()) as FormatDataHasil;
      expect(data.halaman).toBe('video');
      expect(data.status_layanan.reality_defender).toBe('gagal');
      expect(data.langkah.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('5. Round-trip Property Serialization (Requirement 32.5)', () => {
    it('respons memenuhi kontrak round-trip: JSON parse -> stringify -> parse menghasilkan objek setara', async () => {
      vi.mocked(checkMediaManipulation).mockResolvedValueOnce({
        status: 'ok',
        ditemukan: true,
        skorManipulasi: 85,
        tipeMedia: 'gambar',
        keterangan: 'Deepfake terdeteksi',
      });

      const req = createRequest({
        tipe: 'gambar',
        data: sampleFrameBase64,
      });

      const res = await POST(req);
      const data = (await res.json()) as FormatDataHasil;

      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(data);
    });
  });
});
