import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkMediaManipulation,
  simulateRealityDefender,
  resetRealityDefenderRateLimit,
  getRealityDefenderTimestamps,
  CATATAN_BAHASA_INDONESIA,
  BATASAN_AUDIO_DETIK,
  REALITY_DEFENDER_RATE_LIMIT_PER_MONTH,
} from './reality-defender';

describe('lib/reality-defender.ts — Integrasi Reality Defender (Fitur P1)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    resetRealityDefenderRateLimit();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetRealityDefenderRateLimit();
  });

  describe('1. Validasi Input Data Media', () => {
    it('mengembalikan status "gagal" jika input data kosong', async () => {
      const res = await checkMediaManipulation({
        tipe: 'gambar',
        data: '',
      });

      expect(res.status).toBe('gagal');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('Data media tidak valid atau kosong');
    });

    it('mengembalikan status "gagal" jika tipe media bukan "gambar" atau "audio"', async () => {
      const res = await checkMediaManipulation({
        tipe: 'dokumen' as any,
        data: 'base64data',
      });

      expect(res.status).toBe('gagal');
      expect(res.ditemukan).toBe(false);
    });
  });

  describe('2. Validasi Batasan Durasi Audio (12 detik - 5 menit)', () => {
    it('mengembalikan status "gagal" jika durasi audio kurang dari 12 detik', async () => {
      const res = await checkMediaManipulation({
        tipe: 'audio',
        data: 'sample-audio-base64',
        durasiDetik: 8,
      });

      expect(res.status).toBe('gagal');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('terlalu pendek');
      expect(res.keterangan).toContain('12 detik');
      // Catatan transparansi bahasa Indonesia wajib disertakan
      expect(res.peringatan).toBe(CATATAN_BAHASA_INDONESIA);
    });

    it('mengembalikan status "gagal" jika durasi audio lebih dari 300 detik (5 menit)', async () => {
      const res = await checkMediaManipulation({
        tipe: 'audio',
        data: 'sample-audio-base64',
        durasiDetik: 360,
      });

      expect(res.status).toBe('gagal');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('melebihi batas');
      expect(res.keterangan).toContain('5 menit');
      expect(res.peringatan).toBe(CATATAN_BAHASA_INDONESIA);
    });

    it('mencatat peringatan transparansi bahwa bahasa Indonesia tidak didukung resmi pada audio yang valid', async () => {
      const res = await checkMediaManipulation(
        {
          tipe: 'audio',
          data: 'sample-audio-base64',
          durasiDetik: 45,
        },
        { simulate: true }
      );

      expect(res.peringatan).toBe(CATATAN_BAHASA_INDONESIA);
      expect(res.detail?.keterbatasanBahasa).toBe(CATATAN_BAHASA_INDONESIA);
    });
  });

  describe('3. Ketiadaan API Key & Mode Simulasi', () => {
    it('mengembalikan status "tidak_tersedia" jika REALITY_DEFENDER_API_KEY tidak disetel', async () => {
      delete process.env.REALITY_DEFENDER_API_KEY;

      const res = await checkMediaManipulation({
        tipe: 'gambar',
        data: 'base64-image-sample',
      });

      expect(res.status).toBe('tidak_tersedia');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('API key Reality Defender tidak tersedia');
    });

    it('menggunakan mode simulasi jika simulate=true pada opsi', async () => {
      delete process.env.REALITY_DEFENDER_API_KEY;

      const res = await checkMediaManipulation(
        {
          tipe: 'gambar',
          data: 'sample-normal-data',
        },
        { simulate: true }
      );

      expect(res.status).toBe('ok');
      expect(res.keterangan).toContain('Simulasi Reality Defender');
    });

    it('mendeteksi manipulasi pada mode simulasi jika data memuat kata kunci deepfake/manipulated', () => {
      const res = simulateRealityDefender({
        tipe: 'gambar',
        data: 'sample-deepfake-face-image',
      });

      expect(res.status).toBe('ok');
      expect(res.ditemukan).toBe(true);
      expect(res.skorManipulasi).toBeGreaterThanOrEqual(80);
      expect(res.keterangan).toContain('Terdeteksi indikasi manipulasi');
    });
  });

  describe('4. Batasan Kuota Bulanan (Maksimal 50 scan per bulan)', () => {
    it('mengembalikan status "tidak_tersedia" jika kuota 50 scan per bulan telah tercapai', async () => {
      process.env.REALITY_DEFENDER_API_KEY = 'rd-test-key-123';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ score: 0.1, prediction: 'authentic' }),
      });

      // Simulasikan 50 panggilan berhasil
      for (let i = 0; i < REALITY_DEFENDER_RATE_LIMIT_PER_MONTH; i++) {
        const res = await checkMediaManipulation(
          { tipe: 'gambar', data: `data-${i}` },
          { fetchFn: mockFetch as any }
        );
        expect(res.status).toBe('ok');
      }

      expect(getRealityDefenderTimestamps().length).toBe(50);

      // Panggilan ke-51 harus ditolak karena mencapai batas kuota bulanan
      const call51 = await checkMediaManipulation(
        { tipe: 'gambar', data: 'data-51' },
        { fetchFn: mockFetch as any }
      );

      expect(call51.status).toBe('tidak_tersedia');
      expect(call51.ditemukan).toBe(false);
      expect(call51.keterangan).toContain('Batas kuota Reality Defender tercapai');
      expect(call51.keterangan).toContain('50 scan per bulan');
    });

    it('resetRealityDefenderRateLimit mengosongkan riwayat kuota', async () => {
      process.env.REALITY_DEFENDER_API_KEY = 'rd-test-key-123';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ score: 0.1 }),
      });

      await checkMediaManipulation(
        { tipe: 'gambar', data: 'data-1' },
        { fetchFn: mockFetch as any }
      );
      expect(getRealityDefenderTimestamps().length).toBe(1);

      resetRealityDefenderRateLimit();
      expect(getRealityDefenderTimestamps().length).toBe(0);
    });
  });

  describe('5. Penanganan Respons HTTP API Reality Defender', () => {
    it('mengembalikan status "ok" dan ditemukan=true saat skor manipulasi tinggi (>= 50)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'COMPLETE',
          score: 0.88,
          prediction: 'manipulated',
        }),
      });

      const res = await checkMediaManipulation(
        { tipe: 'gambar', data: 'image-data' },
        { apiKey: 'valid-rd-key', fetchFn: mockFetch as any }
      );

      expect(res.status).toBe('ok');
      expect(res.ditemukan).toBe(true);
      expect(res.skorManipulasi).toBe(88);
      expect(res.keterangan).toContain('Terdeteksi indikasi manipulasi');
    });

    it('mengembalikan status "ok" dan ditemukan=false saat skor manipulasi rendah (< 50)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'COMPLETE',
          score: 0.15,
          prediction: 'authentic',
        }),
      });

      const res = await checkMediaManipulation(
        { tipe: 'gambar', data: 'image-data' },
        { apiKey: 'valid-rd-key', fetchFn: mockFetch as any }
      );

      expect(res.status).toBe('ok');
      expect(res.ditemukan).toBe(false);
      expect(res.skorManipulasi).toBe(15);
      expect(res.keterangan).toContain('Tidak terdeteksi indikasi manipulasi media yang signifikan');
    });

    it('mengembalikan status "tidak_tersedia" jika API mengembalikan HTTP 401 / 403', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const res = await checkMediaManipulation(
        { tipe: 'gambar', data: 'image-data' },
        { apiKey: 'invalid-rd-key', fetchFn: mockFetch as any }
      );

      expect(res.status).toBe('tidak_tersedia');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('Layanan Reality Defender tidak tersedia (HTTP 401)');
    });

    it('mengembalikan status "tidak_tersedia" jika API mengembalikan HTTP 429 (kuota habis)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
      });

      const res = await checkMediaManipulation(
        { tipe: 'gambar', data: 'image-data' },
        { apiKey: 'valid-key', fetchFn: mockFetch as any }
      );

      expect(res.status).toBe('tidak_tersedia');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('Batas kuota Reality Defender terlampaui (HTTP 429)');
    });

    it('mengembalikan status "gagal" jika respons status HTTP 500', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const res = await checkMediaManipulation(
        { tipe: 'gambar', data: 'image-data' },
        { apiKey: 'valid-key', fetchFn: mockFetch as any }
      );

      expect(res.status).toBe('gagal');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('Permintaan ke Reality Defender API gagal (HTTP 500)');
    });

    it('mengembalikan status "gagal" saat permintaan mengalami timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const mockFetch = vi.fn().mockRejectedValue(abortError);

      const res = await checkMediaManipulation(
        { tipe: 'gambar', data: 'image-data' },
        { apiKey: 'valid-key', fetchFn: mockFetch as any, timeoutMs: 200 }
      );

      expect(res.status).toBe('gagal');
      expect(res.ditemukan).toBe(false);
      expect(res.keterangan).toContain('melebihi batas waktu');
    });
  });
});
