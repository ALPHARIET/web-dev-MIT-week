import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { analisisMediaGemini, type HasilAnalisisMediaGemini } from '@/lib/gemini-media';
import type { FormatDataHasil } from '@/lib/hasil';

vi.mock('@/lib/gemini-media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini-media')>();
  return { ...actual, analisisMediaGemini: vi.fn() };
});

const mockAi = vi.mocked(analisisMediaGemini);

const FRAME =
  'data:image/jpeg;base64,' +
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');
const AUDIO = 'data:audio/wav;base64,' + Buffer.from('RIFF....WAVEfmt ').toString('base64');

const createRequest = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/cek-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const aiDasar = (over: Partial<HasilAnalisisMediaGemini> = {}): HasilAnalisisMediaGemini => ({
  penilaian_manipulasi: 'lemah',
  skor_manipulasi: 12,
  alasan_penilaian: 'Wajah dan cahayanya terlihat wajar di semua gambar.',
  tanda_visual: [],
  tanda_audio: [],
  ada_ucapan: false,
  transkrip: '',
  pola_penipuan: [],
  level_penipuan: 'tidak_ditemukan',
  hal_wajar: ['Cahaya wajah cocok dengan latar.'],
  langkah: ['Telepon balik orangnya ke nomor yang kamu simpan.'],
  ...over,
});

async function kirim(body: unknown): Promise<{ status: number; data: FormatDataHasil & { error?: string } }> {
  const res = await POST(createRequest(body));
  return { status: res.status, data: await res.json() };
}

describe('POST /api/cek-media', () => {
  beforeEach(() => {
    mockAi.mockReset();
    mockAi.mockResolvedValue({ status: 'ok', hasil: aiDasar(), model: 'gemini-3.8-flash' });
  });

  describe('validasi', () => {
    it('413 jika Content-Length melebihi batas', async () => {
      const res = await POST(
        createRequest({ frames: [{ data: FRAME }] }, { 'content-length': String(5 * 1024 * 1024) })
      );
      expect(res.status).toBe(413);
    });

    it('400 jika JSON rusak', async () => {
      const res = await POST(createRequest('{bukan json'));
      expect(res.status).toBe(400);
    });

    it('400 jika tidak ada gambar atau audio yang valid', async () => {
      const { status } = await kirim({ frames: [{ data: 'data:text/plain;base64,aGFp' }] });
      expect(status).toBe(400);
      expect(mockAi).not.toHaveBeenCalled();
    });

    it('menerima format lama {tipe, data}', async () => {
      const { status, data } = await kirim({ tipe: 'gambar', data: FRAME });
      expect(status).toBe(200);
      expect(data.analisis_media?.jenis).toBe('gambar');
    });
  });

  describe('pemanggilan AI', () => {
    it('mengirim semua gambar + audio ke AI', async () => {
      const frames = [0, 1, 2, 3, 4].map((i) => ({ data: FRAME, detik: i * 2 }));
      await kirim({ jenis: 'video', frames, audio: AUDIO, durasiDetik: 40 });
      const arg = mockAi.mock.calls[0][0];
      expect(arg.frames).toHaveLength(5);
      expect(arg.audio).toBe(AUDIO);
    });

    it('menyensor catatan pengguna sebelum diteruskan ke AI', async () => {
      await kirim({ frames: [{ data: FRAME }], catatan: 'transfer ke 1234567890 sekarang' });
      expect(mockAi.mock.calls[0][0].catatan).toContain('[disensor]');
      expect(mockAi.mock.calls[0][0].catatan).not.toContain('1234567890');
    });
  });

  describe('tampilan untuk orang awam', () => {
    it('hanya satu kartu "Analisis AI" tanpa nama layanan', async () => {
      const { data } = await kirim({ frames: [{ data: FRAME }] });
      expect(data.analisis_media?.detektor).toHaveLength(1);
      expect(data.analisis_media?.detektor[0].nama).toBe('Analisis AI');
      expect(data.pihak_ketiga).toEqual(['Analisis AI']);
      const teks = JSON.stringify(data);
      expect(teks).not.toMatch(/Gemini|Reality Defender|gemini-3/);
    });

    it('cerita pengguna digabung jadi satu kartu dengan bahasa sehari-hari', async () => {
      const { data } = await kirim({
        frames: [{ data: FRAME }],
        jawabanWizard: {
          situasi: 'video_call',
          apa_diminta: 'transfer',
          nomor_akun: 'nomor_baru',
          darurat_desakan: true,
          diminta_rahasiakan: true,
          bisa_telepon_balik: false,
        },
      });
      const kartuCerita = data.temuan.filter((t) => t.sumber === 'aturan');
      expect(kartuCerita).toHaveLength(1);
      expect(kartuCerita[0].bukti).toContain('Kamu bilang dia');
      expect(JSON.stringify(data.temuan)).not.toMatch(/wizard|\(\+\d\)/i);
      expect(data.langkah.length).toBeLessThanOrEqual(4);
    });

    it('membatasi temuan dari AI', async () => {
      const tanda = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ judul: `Tanda ${i}`, penjelasan: 'janggal', bukti: `Gambar ke-${i}` }));
      mockAi.mockResolvedValue({
        status: 'ok',
        model: 'gemini-3.8-flash',
        hasil: aiDasar({ penilaian_manipulasi: 'kuat', tanda_visual: tanda(5), pola_penipuan: tanda(5).map((t) => ({ ...t, judul: `Pola ${t.judul}` })) }),
      });
      const { data } = await kirim({ frames: [{ data: FRAME }] });
      expect(data.temuan.length).toBeLessThanOrEqual(6);
    });
  });

  describe('penggabungan level', () => {
    it('tidak_ditemukan jika AI tidak menemukan apa pun', async () => {
      const { data } = await kirim({ frames: [{ data: FRAME }] });
      expect(data.level).toBe('tidak_ditemukan');
    });

    it('AI "kuat" + cerita video call minta transfer menaikkan ke tinggi', async () => {
      mockAi.mockResolvedValue({
        status: 'ok',
        model: 'gemini-3.8-flash',
        hasil: aiDasar({
          penilaian_manipulasi: 'kuat',
          skor_manipulasi: 85,
          tanda_visual: [{ judul: 'Wajah seperti ditempel', penjelasan: 'Pinggir dagu menyatu dengan latar.', bukti: 'Gambar ke-2' }],
        }),
      });
      const { data } = await kirim({
        frames: [{ data: FRAME }, { data: FRAME }],
        jawabanWizard: { situasi: 'video_call', apa_diminta: 'transfer' },
      });
      expect(data.level).toBe('tinggi');
      expect(data.ringkasan).toContain('dibuat AI');
      const d = data.analisis_media!.detektor[0];
      expect(d.sinyal).toBe('tinggi');
      expect(d.skor).toBe(85);
    });

    it('transkrip ucapan diperiksa aturan chat (minta OTP -> tinggi)', async () => {
      mockAi.mockResolvedValue({
        status: 'ok',
        model: 'gemini-3.8-flash',
        hasil: aiDasar({
          ada_ucapan: true,
          transkrip: 'Dek, ini kakak. Tolong sebutkan kode OTP yang masuk ke HP kamu sekarang ya.',
        }),
      });
      const { data } = await kirim({ jenis: 'audio', audio: AUDIO, durasiDetik: 20 });
      expect(data.level).toBe('tinggi');
      expect(data.transkrip).toContain('OTP');
      expect(data.situasi_darurat).toContain('kirim_otp');
    });

    it('cerita pengguna menjadi level minimum yang tidak diturunkan AI', async () => {
      const { data } = await kirim({
        frames: [{ data: FRAME }],
        jawabanWizard: { situasi: 'video_call', apa_diminta: 'transfer', darurat_desakan: true },
      });
      expect(data.level).toBe('tinggi');
    });
  });

  describe('ketahanan saat AI gagal', () => {
    it('tetap 200 dengan pesan sederhana jika AI tidak tersedia', async () => {
      mockAi.mockResolvedValue({ status: 'gagal', alasan: 'Gemini menolak permintaan (HTTP 503)' });
      const { status, data } = await kirim({ frames: [{ data: FRAME }] });
      expect(status).toBe(200);
      expect(data.status_layanan.ai).toBe('gagal');
      expect(data.analisis_media?.detektor[0].label).toBe('Sedang tidak tersedia');
      expect(JSON.stringify(data)).not.toMatch(/HTTP 503|Gemini/);
      expect(data.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('tetap 200 jika AI melempar error', async () => {
      mockAi.mockRejectedValue(new Error('boom'));
      const { status, data } = await kirim({ frames: [{ data: FRAME }] });
      expect(status).toBe(200);
      expect(data.status_layanan.ai).toBe('gagal');
    });

    it('tidak memakai kata terlarang sebagai kesimpulan', async () => {
      mockAi.mockResolvedValue({
        status: 'ok',
        model: 'gemini-3.8-flash',
        hasil: aiDasar({ langkah: ['Video ini aman untuk dipercaya.'] }),
      });
      const { data } = await kirim({ frames: [{ data: FRAME }] });
      expect(data.langkah.join(' ')).not.toMatch(/\baman untuk\b/);
    });
  });
});

describe('tidak menumpuk temuan', () => {
  beforeEach(() => mockAi.mockReset());

  it('tanpa ucapan, pola penipuan dari AI tidak diulang (cukup kartu cerita)', async () => {
    mockAi.mockResolvedValue({
      status: 'ok',
      model: 'gemini-3.8-flash',
      hasil: aiDasar({
        penilaian_manipulasi: 'tidak_bisa_dinilai',
        tanda_visual: [{ judul: 'Bukan wajah manusia', penjelasan: 'Hanya gambar sederhana.', bukti: 'Gambar ke-1' }],
        pola_penipuan: [{ judul: 'Pola penipuan terdeteksi', penjelasan: 'Konteks yang kamu berikan...', bukti: '' }],
        level_penipuan: 'tinggi',
      }),
    });
    const { data } = await kirim({
      frames: [{ data: FRAME }],
      jawabanWizard: { situasi: 'video_call', apa_diminta: 'transfer', darurat_desakan: true },
    });
    expect(data.temuan.map((t) => t.judul)).toEqual(['Ceritamu cocok dengan modus penipuan']);
    expect(data.ringkasan).not.toContain('omongannya');
  });
});

describe('rekomendasi sesuai isi video', () => {
  beforeEach(() => mockAi.mockReset());

  it('video buatan AI tanpa ajakan penipuan: perlu hati-hati, langkah soal hoaks, tanpa panel darurat', async () => {
    mockAi.mockResolvedValue({
      status: 'ok',
      model: 'gemini-3.8-flash',
      hasil: aiDasar({
        penilaian_manipulasi: 'kuat',
        skor_manipulasi: 88,
        tanda_visual: [{ judul: 'Gerakan fisika mustahil', penjelasan: 'Badan melayang.', bukti: 'Gambar ke-4' }],
        ada_ucapan: false,
        langkah: ['Perhatikan label atau watermark AI pada video.'],
      }),
    });
    const { data } = await kirim({ jenis: 'video', frames: [{ data: FRAME }, { data: FRAME }] });
    expect(data.analisis_media?.kategori).toBe('konten_ai');
    expect(data.level).toBe('sedang');
    expect(data.situasi_darurat).toEqual([]);
    expect(data.ringkasan).toContain('Tidak terlihat ajakan penipuan');
    const semuaLangkah = data.langkah.join(' ').toLowerCase();
    expect(semuaLangkah).not.toMatch(/telepon balik|transfer|otp/);
    expect(semuaLangkah).toContain('kejadian nyata');
    expect(data.batasan).not.toContain('telepon balik');
  });

  it('video buatan AI + ucapan minta transfer: kategori penipuan, waspada tinggi', async () => {
    mockAi.mockResolvedValue({
      status: 'ok',
      model: 'gemini-3.8-flash',
      hasil: aiDasar({
        penilaian_manipulasi: 'kuat',
        ada_ucapan: true,
        transkrip: 'Ini bapak, cepat transfer sekarang ya, jangan bilang siapa-siapa.',
        level_penipuan: 'tinggi',
        pola_penipuan: [{ judul: 'Minta transfer', penjelasan: 'Modus umum.', bukti: '"cepat transfer sekarang"' }],
      }),
    });
    const { data } = await kirim({ jenis: 'video', frames: [{ data: FRAME }], audio: AUDIO, durasiDetik: 20 });
    expect(data.analisis_media?.kategori).toBe('penipuan');
    expect(data.level).toBe('tinggi');
    expect(data.langkah.join(' ').toLowerCase()).toMatch(/telepon balik|transfer/);
  });

  it('video asli tanpa ajakan: kategori wajar', async () => {
    mockAi.mockResolvedValue({ status: 'ok', model: 'gemini-3.8-flash', hasil: aiDasar() });
    const { data } = await kirim({ frames: [{ data: FRAME }] });
    expect(data.analisis_media?.kategori).toBe('wajar');
    expect(data.level).toBe('tidak_ditemukan');
  });
});
