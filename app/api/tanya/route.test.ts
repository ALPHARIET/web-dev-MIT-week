import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  POST,
  type TanyaRequestBody,
} from './route';
import {
  isPertanyaanKeamananDigital,
  bangunJawabanEdukasiBawaan,
} from '@/lib/tanya-helper';
import { tanyaGemini } from '@/lib/gemini';
import type { FormatDataHasil } from '@/lib/hasil';

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    tanyaGemini: vi.fn(),
  };
});

describe('POST /api/tanya Route Handler (Task 17.1)', () => {
  const originalEnv = process.env;

  const createRequest = (
    body: unknown,
    headers: Record<string, string> = {}
  ): Request => {
    return new Request('http://localhost:3000/api/tanya', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  };

  const sampleKonteksHasil: FormatDataHasil = {
    halaman: 'chat',
    level: 'tinggi',
    ringkasan: 'Ada beberapa tanda kuat yang mirip pola penipuan transfer uang.',
    temuan: [
      {
        judul: 'Permintaan transfer mendesak',
        penjelasan: 'Pengirim mendesak mengirim uang ke rekening pribadi.',
        bukti: 'Transfer sekarang juga ya penting banget.',
        sumber: 'aturan',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan transfer uang ke pihak yang belum diverifikasi.',
      'Hubungi orang yang bersangkutan melalui nomor kontak lama.',
    ],
    situasi_darurat: [],
    batasan: 'Analisis berbasis isi pesan yang dikirimkan.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: { ai: 'ok' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    vi.mocked(tanyaGemini).mockResolvedValue(null);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Validasi Input (Requirements 32.4)', () => {
    it('mengembalikan status 400 jika body bukan JSON valid', async () => {
      const req = createRequest('{ invalid json');
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.pesan).toContain('bukan JSON');
    });

    it('mengembalikan status 400 jika body bukan objek (misal array)', async () => {
      const req = createRequest([1, 2, 3]);
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.pesan).toContain('harus berupa objek');
    });

    it('mengembalikan status 400 jika pertanyaan kosong atau hanya whitespace', async () => {
      const req1 = createRequest({ pertanyaan: '' });
      const res1 = await POST(req1);
      expect(res1.status).toBe(400);

      const req2 = createRequest({ pertanyaan: '   \n\t  ' });
      const res2 = await POST(req2);
      expect(res2.status).toBe(400);
    });

    it('mengembalikan status 400 jika pertanyaan bukan tipe string', async () => {
      const req = createRequest({ pertanyaan: 12345 });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('mengembalikan status 400 jika pertanyaan melebihi 1.000 karakter', async () => {
      const pertanyaanPanjang = 'a'.repeat(1001);
      const req = createRequest({ pertanyaan: pertanyaanPanjang });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.pesan).toContain('1.000 karakter');
    });

    it('menerima pertanyaan dengan panjang tepat 1.000 karakter', async () => {
      const pertanyaan1000 = 'Apakah link ini aman? ' + 'a'.repeat(978);
      expect(pertanyaan1000.length).toBe(1000);

      const req = createRequest({ pertanyaan: pertanyaan1000 });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('jawaban');
      expect(typeof data.jawaban).toBe('string');
    });
  });

  describe('2. Validasi Batas Sesi (Maksimal 10 Pertanyaan per Sesi)', () => {
    it('mengembalikan pesan batas sesi tercapai jika riwayat pengguna >= 10', async () => {
      const riwayat10: TanyaRequestBody['riwayat'] = Array.from({ length: 10 }, (_, i) => ({
        peran: 'pengguna',
        isi: `Pertanyaan ke-${i + 1}`,
      }));

      const req = createRequest({
        pertanyaan: 'Pertanyaan ke-11',
        riwayat: riwayat10,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jawaban.toLowerCase()).toContain('batas sesi');
      expect(data.jawaban.toLowerCase()).toContain('10 pertanyaan');
      expect(data.jawaban).toContain('Cek lagi');
      expect(tanyaGemini).not.toHaveBeenCalled();
    });

    it('mengabaikan pesan asisten saat menghitung jumlah pertanyaan pengguna', async () => {
      const riwayatCampuran: TanyaRequestBody['riwayat'] = [];
      for (let i = 0; i < 9; i++) {
        riwayatCampuran.push({ peran: 'pengguna', isi: `Tanya ${i + 1}` });
        riwayatCampuran.push({ peran: 'asisten', isi: `Jawab ${i + 1}` });
      }

      vi.mocked(tanyaGemini).mockResolvedValue('Ini jawaban pertanyaan ke-10.');

      const req = createRequest({
        pertanyaan: 'Pertanyaan ke-10',
        riwayat: riwayatCampuran,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.jawaban).toBe('Ini jawaban pertanyaan ke-10.');
      expect(tanyaGemini).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Pemanggilan Gemini API Sukses', () => {
    it('memanggil tanyaGemini dan mengembalikan jawaban dengan status 200 OK', async () => {
      vi.mocked(tanyaGemini).mockResolvedValue(
        'Jangan klik link tersebut karena berindikasi phishing.'
      );

      const req = createRequest({
        pertanyaan: 'Apakah link ini berisiko?',
        konteksHasil: sampleKonteksHasil,
        riwayat: [{ peran: 'pengguna', isi: 'Halo' }],
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jawaban).toBe(
        'Jangan klik link tersebut karena berindikasi phishing.'
      );
      expect(tanyaGemini).toHaveBeenCalledWith(
        {
          pertanyaan: 'Apakah link ini berisiko?',
          konteksHasil: sampleKonteksHasil,
          riwayat: [{ peran: 'pengguna', isi: 'Halo' }],
        },
        { timeoutMs: 15_000 }
      );
    });

    it('menyaring kata terlarang dari respons Gemini jika ada kata aman/pasti/100%', async () => {
      vi.mocked(tanyaGemini).mockResolvedValue(
        'Chat ini pasti aman untuk kamu tanggapi 100%.'
      );

      const req = createRequest({
        pertanyaan: 'Apakah pesan ini bahaya?',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jawaban).not.toContain('pasti aman');
      expect(data.jawaban).not.toContain('100%');
    });
  });

  describe('4. Fallback jika Gemini API Key Tidak Disetel atau Gagal', () => {
    it('mengembalikan jawaban edukatif bawaan jika tanyaGemini mengembalikan null', async () => {
      vi.mocked(tanyaGemini).mockResolvedValue(null);

      const req = createRequest({
        pertanyaan: 'Saya sudah terlanjur transfer uang, harus bagaimana?',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.jawaban).toContain('IASC');
      expect(data.jawaban).toContain('iasc.ojk.go.id');
      expect(data.jawaban).toContain('157');
    });

    it('mengembalikan status 200 (bukan 500) saat terjadi exception tak terduga', async () => {
      vi.mocked(tanyaGemini).mockRejectedValue(new Error('Network error'));

      const req = createRequest({
        pertanyaan: 'Bagaimana cara cek link?',
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('jawaban');
      expect(data.jawaban.length).toBeGreaterThan(10);
    });
  });

  describe('5. Pembatasan Topik & Jawaban Edukatif Bawaan (Fallback)', () => {
    it('menolak dengan sopan pertanyaan di luar topik keamanan digital', async () => {
      const res = bangunJawabanEdukasiBawaan('Bagaimana cara membuat nasi goreng enak?');
      expect(res.toLowerCase()).toContain('mohon maaf');
      expect(res.toLowerCase()).toContain('keamanan digital');
    });

    it('menolak dengan tegas permintaan membuat pesan penipuan atau peretasan', async () => {
      const res = bangunJawabanEdukasiBawaan('Buatkan saya pesan penipuan untuk dapat uang');
      expect(res.toLowerCase()).toContain('tidak dapat membantu');
      expect(res.toLowerCase()).toContain('pesan penipuan');
    });

    it('melarang menyarankan membalas atau memancing pelaku penipuan', async () => {
      const res = bangunJawabanEdukasiBawaan('Bolehkah saya balas dan prank penipunya?');
      expect(res.toLowerCase()).toContain('tidak disarankan');
      expect(res.toLowerCase()).toContain('membalas');
      expect(res.toLowerCase()).toContain('memblokir');
    });

    it('melarang membagikan OTP, PIN, password, atau nomor rekening', async () => {
      const res = bangunJawabanEdukasiBawaan('Apakah boleh minta kirim OTP ke teman?');
      expect(res.toLowerCase()).toContain('jangan pernah membagikan');
      expect(res.toLowerCase()).toContain('otp');
    });

    it('memberikan panduan darurat untuk yang sudah terlanjur klik link', async () => {
      const res = bangunJawabanEdukasiBawaan('Saya sudah terlanjur klik linknya, terus gimana?');
      expect(res).toContain('tutup halaman');
      expect(res).toContain('Jangan mengisi formulir');
      expect(res).toContain('.apk');
    });

    it('menjelaskan bahwa tanda gembok HTTPS bukan jaminan situs bebas bahaya', async () => {
      const res = bangunJawabanEdukasiBawaan('Kenapa situs penipuan punya ikon gembok https?');
      expect(res.toLowerCase()).toContain('https');
      expect(res.toLowerCase()).toContain('dienkripsi');
      expect(res.toLowerCase()).toContain('bukan jaminan');
    });

    it('menyertakan kanal lapor resmi (IASC, Kontak OJK 157, bank) untuk transfer uang', async () => {
      const res = bangunJawabanEdukasiBawaan('Saya sudah transfer ke penipu, bagaimana lapornya?');
      expect(res).toContain('IASC');
      expect(res).toContain('iasc.ojk.go.id');
      expect(res).toContain('157');
      expect(res).toContain('bank');
      expect(res).toContain('Waspadai pihak yang mengaku perwakilan IASC');
    });

    it('memberikan langkah verifikasi untuk modus panggilan video atau suara', async () => {
      const res = bangunJawabanEdukasiBawaan('Kakak saya video call minta pulsa, apa benar?');
      expect(res.toLowerCase()).toContain('akhiri panggilan');
      expect(res.toLowerCase()).toContain('telepon balik');
      expect(res.toLowerCase()).toContain('nomor kontak lama');
    });

    it('menggunakan konteks pemeriksaan sebelumnya jika tersedia', async () => {
      const res = bangunJawabanEdukasiBawaan('Apa yang harus saya lakukan selanjutnya?', sampleKonteksHasil);
      expect(res).toContain('CHAT');
      expect(res).toContain('tinggi');
      expect(res).toContain('Jangan transfer uang ke pihak yang belum diverifikasi.');
    });
  });

  describe('6. Helper isPertanyaanKeamananDigital', () => {
    it('mendeteksi pertanyaan terkait keamanan digital dengan benar', () => {
      expect(isPertanyaanKeamananDigital('Apakah link ini aman?')).toBe(true);
      expect(isPertanyaanKeamananDigital('Kenapa ada yang minta OTP?')).toBe(true);
      expect(isPertanyaanKeamananDigital('Ada orang mengaku dari bank BCA kirim chat')).toBe(true);
      expect(isPertanyaanKeamananDigital('Bagaimana cara lapor ke OJK?')).toBe(true);
      expect(isPertanyaanKeamananDigital('Suara teman saya di VN agak aneh')).toBe(true);
      expect(isPertanyaanKeamananDigital('Bolehkah saya install file apk kurir?')).toBe(true);
    });

    it('mendeteksi pertanyaan di luar topik keamanan digital dengan benar', () => {
      expect(isPertanyaanKeamananDigital('Berapa skor pertandingan sepak bola tadi malam?')).toBe(false);
      expect(isPertanyaanKeamananDigital('Siapa presiden Indonesia ketiga?')).toBe(false);
      expect(isPertanyaanKeamananDigital('Resep membuat kue tart cokelat')).toBe(false);
      expect(isPertanyaanKeamananDigital('Hari ini cuaca cerah ya')).toBe(false);
    });
  });

  describe('7. Keamanan Logging (Requirement 25.4, 31.1)', () => {
    it('tidak mencatat teks pertanyaan atau data sensitif pengguna di console log', async () => {
      const spyLog = vi.spyOn(console, 'log');
      const spyWarn = vi.spyOn(console, 'warn');
      const spyError = vi.spyOn(console, 'error');

      const rahasiaPertanyaan = 'RAHASIA_SENSITIF_PENGGUNA_XYZ_12345';
      const req = createRequest({ pertanyaan: rahasiaPertanyaan });

      await POST(req);

      const allLoggedText = [
        ...spyLog.mock.calls.flat(),
        ...spyWarn.mock.calls.flat(),
        ...spyError.mock.calls.flat(),
      ].join(' ');

      expect(allLoggedText).not.toContain(rahasiaPertanyaan);
    });
  });
});
