import { describe, it, expect, vi } from 'vitest';
import {
  analisisMediaGemini,
  normalisasiHasilMedia,
  susunPartsMedia,
  SKEMA_ANALISIS_MEDIA,
} from './gemini-media';

const FRAME = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff]).toString('base64');
const AUDIO = 'data:audio/wav;base64,' + Buffer.from('RIFFWAVE').toString('base64');

const jawabanValid = {
  penilaian_manipulasi: 'sedang',
  skor_manipulasi: 48,
  alasan_penilaian: 'Tepi rambut sedikit blur di frame 3.',
  tanda_visual: [{ judul: 'Tepi rambut blur', penjelasan: 'Bisa dari face swap.', bukti: 'Frame 3 (detik 6,0)' }],
  tanda_audio: [],
  ada_ucapan: true,
  transkrip: 'Halo dek, ini kakak.',
  pola_penipuan: [],
  level_penipuan: 'sedang',
  hal_wajar: ['Cahaya cocok.'],
  langkah: ['Telepon balik.', 'Tanya hal pribadi.'],
};

const resGemini = (obj: unknown, status = 200) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );

describe('lib/gemini-media.ts', () => {
  describe('normalisasiHasilMedia', () => {
    it('menerima jawaban valid', () => {
      const h = normalisasiHasilMedia(jawabanValid);
      expect(h?.penilaian_manipulasi).toBe('sedang');
      expect(h?.tanda_visual).toHaveLength(1);
    });

    it('menolak penilaian di luar enum', () => {
      expect(normalisasiHasilMedia({ ...jawabanValid, penilaian_manipulasi: 'asli' })).toBeNull();
      expect(normalisasiHasilMedia(null)).toBeNull();
      expect(normalisasiHasilMedia([])).toBeNull();
    });

    it('membatasi skor 0-100 dan mengubah skala 0-1', () => {
      expect(normalisasiHasilMedia({ ...jawabanValid, skor_manipulasi: 250 })?.skor_manipulasi).toBe(100);
      expect(normalisasiHasilMedia({ ...jawabanValid, skor_manipulasi: 0.7 })?.skor_manipulasi).toBe(70);
    });

    it('membuang tanda tanpa judul dan menyaring kata terlarang', () => {
      const h = normalisasiHasilMedia({
        ...jawabanValid,
        tanda_visual: [{ judul: '', penjelasan: 'x', bukti: '' }],
        alasan_penilaian: 'Video ini pasti palsu.',
      });
      expect(h?.tanda_visual).toHaveLength(0);
      expect(h?.alasan_penilaian).not.toMatch(/\bpasti\b/);
    });
  });

  describe('susunPartsMedia', () => {
    it('memberi label frame dengan detik dan menyertakan audio', () => {
      const parts = susunPartsMedia({
        jenis: 'video',
        frames: [{ data: FRAME, detik: 2.5 }],
        audio: AUDIO,
        durasiDetik: 30,
      });
      expect(parts[0].text).toBe('Gambar ke-1 (detik 2.5)');
      expect(parts[1].inlineData?.mimeType).toBe('image/jpeg');
      expect(parts.some((p) => p.inlineData?.mimeType === 'audio/wav')).toBe(true);
    });

    it('mengabaikan data yang bukan gambar/audio', () => {
      const parts = susunPartsMedia({ jenis: 'gambar', frames: [{ data: 'data:text/html;base64,PGI+' }] });
      expect(parts.some((p) => p.inlineData)).toBe(false);
    });
  });

  it('skema mewajibkan transkrip dan pola penipuan', () => {
    expect(SKEMA_ANALISIS_MEDIA.required).toContain('transkrip');
    expect(SKEMA_ANALISIS_MEDIA.required).toContain('pola_penipuan');
  });

  describe('analisisMediaGemini', () => {
    it('tidak_tersedia tanpa API key', async () => {
      const fetchFn = vi.fn();
      const r = await analisisMediaGemini(
        { jenis: 'gambar', frames: [{ data: FRAME }] },
        { apiKey: '', fetchFn: fetchFn as unknown as typeof fetch }
      );
      expect(r.status).toBe('tidak_tersedia');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('mengirim frame + audio dengan skema JSON dan mengembalikan hasil', async () => {
      const fetchFn = vi.fn(async () => resGemini(jawabanValid));
      const r = await analisisMediaGemini(
        { jenis: 'video', frames: [{ data: FRAME }], audio: AUDIO },
        { apiKey: 'k', fetchFn: fetchFn as unknown as typeof fetch }
      );
      expect(r.status).toBe('ok');
      const body = JSON.parse(String((fetchFn.mock.calls[0] as unknown[])[1] && ((fetchFn.mock.calls[0] as unknown[])[1] as RequestInit).body));
      expect(body.generationConfig.responseSchema).toEqual(SKEMA_ANALISIS_MEDIA);
      const parts = body.contents[0].parts;
      expect(parts.filter((p: { inlineData?: unknown }) => p.inlineData)).toHaveLength(2);
    });

    it('gagal dengan alasan jika jawaban tidak sesuai skema', async () => {
      const fetchFn = vi.fn(async () => resGemini({ halo: 'dunia' }));
      const r = await analisisMediaGemini(
        { jenis: 'gambar', frames: [{ data: FRAME }] },
        { apiKey: 'k', fetchFn: fetchFn as unknown as typeof fetch }
      );
      expect(r.status).toBe('gagal');
    });

    it('berhenti mencoba model lain saat API key ditolak (403)', async () => {
      const fetchFn = vi.fn(async () => new Response('forbidden', { status: 403 }));
      const r = await analisisMediaGemini(
        { jenis: 'gambar', frames: [{ data: FRAME }] },
        { apiKey: 'k', model: 'gemini-2.5-pro', fetchFn: fetchFn as unknown as typeof fetch }
      );
      expect(r.status).toBe('gagal');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('tidak melempar saat koneksi gagal', async () => {
      const fetchFn = vi.fn(async () => {
        throw new TypeError('fetch failed');
      });
      const r = await analisisMediaGemini(
        { jenis: 'gambar', frames: [{ data: FRAME }] },
        { apiKey: 'k', fetchFn: fetchFn as unknown as typeof fetch }
      );
      expect(r.status).toBe('gagal');
    });
  });
});

describe('coba ulang saat semua model sibuk', () => {
  it('mencoba ulang sekali jika semua model membalas 503, lalu berhasil', async () => {
    const { resetModelSibuk } = await import('./gemini');
    resetModelSibuk();
    let panggilan = 0;
    const fetchFn = vi.fn(async () => {
      panggilan++;
      if (panggilan <= 4) return new Response('{"error":{"message":"high demand"}}', { status: 503 });
      return resGemini(jawabanValid);
    });
    const r = await analisisMediaGemini(
      { jenis: 'gambar', frames: [{ data: FRAME }] },
      { apiKey: 'k', model: 'gemini-3.8-flash', fetchFn: fetchFn as unknown as typeof fetch }
    );
    expect(r.status).toBe('ok');
    expect(fetchFn.mock.calls.length).toBe(5);
    resetModelSibuk();
  });

  it('tidak mencoba ulang jika kegagalannya bukan karena sibuk', async () => {
    const { resetModelSibuk } = await import('./gemini');
    resetModelSibuk();
    const fetchFn = vi.fn(async () => new Response('bad', { status: 400 }));
    const r = await analisisMediaGemini(
      { jenis: 'gambar', frames: [{ data: FRAME }] },
      { apiKey: 'k', model: 'gemini-3.8-flash', fetchFn: fetchFn as unknown as typeof fetch }
    );
    expect(r.status).toBe('gagal');
    expect(fetchFn.mock.calls.length).toBe(4);
  });
});
