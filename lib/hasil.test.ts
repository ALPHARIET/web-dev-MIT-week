import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  hitungLevel,
  gabungLevel,
  AMBANG_TINGGI,
  AMBANG_SEDANG,
  URUTAN_LEVEL,
  type TingkatLevel,
  type FormatDataHasil,
  type Temuan,
} from './hasil';
import { arbitraryFormatDataHasil } from '../test/arbitraries';

describe('lib/hasil.ts', () => {
  describe('hitungLevel', () => {
    it('mengembalikan "tidak_ditemukan" jika skor < 3 dan adaLangsungTinggi bernilai false', () => {
      expect(hitungLevel(0)).toBe('tidak_ditemukan');
      expect(hitungLevel(1)).toBe('tidak_ditemukan');
      expect(hitungLevel(2)).toBe('tidak_ditemukan');
      expect(hitungLevel(2.9)).toBe('tidak_ditemukan');
      expect(hitungLevel(0, false)).toBe('tidak_ditemukan');
    });

    it('mengembalikan "sedang" jika skor antara 3 sampai 5 dan adaLangsungTinggi bernilai false', () => {
      expect(hitungLevel(AMBANG_SEDANG)).toBe('sedang');
      expect(hitungLevel(3)).toBe('sedang');
      expect(hitungLevel(4)).toBe('sedang');
      expect(hitungLevel(5)).toBe('sedang');
      expect(hitungLevel(5.9)).toBe('sedang');
      expect(hitungLevel(3, false)).toBe('sedang');
    });

    it('mengembalikan "tinggi" jika skor >= 6', () => {
      expect(hitungLevel(AMBANG_TINGGI)).toBe('tinggi');
      expect(hitungLevel(6)).toBe('tinggi');
      expect(hitungLevel(7)).toBe('tinggi');
      expect(hitungLevel(10)).toBe('tinggi');
    });

    it('mengembalikan "tinggi" jika adaLangsungTinggi bernilai true meskipun skor < 3 atau < 6', () => {
      expect(hitungLevel(0, true)).toBe('tinggi');
      expect(hitungLevel(1, true)).toBe('tinggi');
      expect(hitungLevel(2, true)).toBe('tinggi');
      expect(hitungLevel(3, true)).toBe('tinggi');
      expect(hitungLevel(5, true)).toBe('tinggi');
      expect(hitungLevel(10, true)).toBe('tinggi');
    });
  });

  describe('gabungLevel', () => {
    it('mengembalikan level tertinggi saat menggabungkan dua level', () => {
      expect(gabungLevel('tinggi', 'tinggi')).toBe('tinggi');
      expect(gabungLevel('tinggi', 'sedang')).toBe('tinggi');
      expect(gabungLevel('tinggi', 'tidak_ditemukan')).toBe('tinggi');

      expect(gabungLevel('sedang', 'tinggi')).toBe('tinggi');
      expect(gabungLevel('sedang', 'sedang')).toBe('sedang');
      expect(gabungLevel('sedang', 'tidak_ditemukan')).toBe('sedang');

      expect(gabungLevel('tidak_ditemukan', 'tinggi')).toBe('tinggi');
      expect(gabungLevel('tidak_ditemukan', 'sedang')).toBe('sedang');
      expect(gabungLevel('tidak_ditemukan', 'tidak_ditemukan')).toBe(
        'tidak_ditemukan'
      );
    });

    it('bersifat komutatif (gabungLevel(a, b) === gabungLevel(b, a))', () => {
      const levels: TingkatLevel[] = ['tinggi', 'sedang', 'tidak_ditemukan'];
      for (const a of levels) {
        for (const b of levels) {
          expect(gabungLevel(a, b)).toBe(gabungLevel(b, a));
        }
      }
    });

    it('selalu menghasilkan level yang lebih besar atau sama dengan level pertama (monotonisitas)', () => {
      const levels: TingkatLevel[] = ['tinggi', 'sedang', 'tidak_ditemukan'];
      for (const a of levels) {
        for (const b of levels) {
          const hasil = gabungLevel(a, b);
          expect(URUTAN_LEVEL[hasil]).toBeGreaterThanOrEqual(URUTAN_LEVEL[a]);
          expect(URUTAN_LEVEL[hasil]).toBeGreaterThanOrEqual(URUTAN_LEVEL[b]);
        }
      }
    });
  });

  describe('FormatDataHasil type conformity', () => {
    it('dapat membuat objek FormatDataHasil yang valid sesuai spesifikasi', () => {
      const temuan: Temuan = {
        judul: 'Meminta kode OTP',
        penjelasan: 'Pihak resmi tidak pernah meminta kode OTP melalui pesan.',
        bukti: 'Kirimkan kode OTP yang masuk ke SMS kamu',
        sumber: 'aturan',
      };

      const hasil: FormatDataHasil = {
        halaman: 'chat',
        level: 'tinggi',
        ringkasan: 'Ditemukan indikasi penipuan berupa permintaan kode OTP.',
        temuan: [temuan],
        hal_wajar: [],
        langkah: [
          'Jangan berikan kode OTP kepada siapa pun.',
          'Segera blokir nomor pengirim pesan.',
        ],
        situasi_darurat: ['kirim_otp'],
        batasan: 'Pemeriksaan berbasis pola teks dan analisis kata kunci.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: {
          aturan: 'ok',
          ai: 'ok',
        },
      };

      expect(hasil.halaman).toBe('chat');
      expect(hasil.level).toBe('tinggi');
      expect(hasil.temuan).toHaveLength(1);
      expect(hasil.langkah).toHaveLength(2);
      expect(hasil.situasi_darurat).toContain('kirim_otp');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: cek-penipuan-web, Property 1: Round-trip serialisasi FormatDataHasil
     * **Validates: Requirements 5.5, 32.5**
     */
    it('Feature: cek-penipuan-web, Property 1: Round-trip serialisasi FormatDataHasil (**Validates: Requirements 5.5, 32.5**)', () => {
      fc.assert(
        fc.property(arbitraryFormatDataHasil(), (hasil) => {
          const json = JSON.stringify(hasil);
          const parsed = JSON.parse(json);
          expect(parsed).toEqual(hasil);
        }),
        { numRuns: 100 }
      );
    });
  });
});

