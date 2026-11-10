import { describe, it, expect } from 'vitest';
import langkahDarurat from '../data/langkah-darurat.json';
import daftarMerek from '../data/merek.json';
import tldBerisiko from '../data/tld-berisiko.json';
import type { SituasiDarurat } from '../lib/hasil';

describe('File Data Bersama (Task 1.5)', () => {
  describe('data/langkah-darurat.json', () => {
    const situasiDibutuhkan: SituasiDarurat[] = [
      'klik_link',
      'isi_data',
      'kirim_otp',
      'transfer',
      'akun_diambil',
    ];

    it('memiliki struktur lengkap: situasi, kanal_lapor, peringatan', () => {
      expect(langkahDarurat).toHaveProperty('situasi');
      expect(langkahDarurat).toHaveProperty('kanal_lapor');
      expect(langkahDarurat).toHaveProperty('peringatan');
      expect(Array.isArray(langkahDarurat.situasi)).toBe(true);
      expect(Array.isArray(langkahDarurat.kanal_lapor)).toBe(true);
      expect(typeof langkahDarurat.peringatan).toBe('string');
      expect(langkahDarurat.peringatan.length).toBeGreaterThan(0);
    });

    it('memuat tepat 5 situasi darurat sesuai PRD dan design.md', () => {
      expect(langkahDarurat.situasi).toHaveLength(5);
      const ids = langkahDarurat.situasi.map((s) => s.id);
      for (const reqId of situasiDibutuhkan) {
        expect(ids).toContain(reqId);
      }
    });

    it('setiap situasi memiliki label dan minimal 2 langkah yang jelas', () => {
      for (const sit of langkahDarurat.situasi) {
        expect(sit.id).toBeTruthy();
        expect(sit.label).toBeTruthy();
        expect(sit.label.trim().length).toBeGreaterThan(0);
        expect(Array.isArray(sit.langkah)).toBe(true);
        expect(sit.langkah.length).toBeGreaterThanOrEqual(2);
        for (const l of sit.langkah) {
          expect(typeof l).toBe('string');
          expect(l.trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('memuat kanal lapor resmi yang disyaratkan (IASC, OJK, Bank, Platform)', () => {
      expect(langkahDarurat.kanal_lapor.length).toBeGreaterThanOrEqual(4);
      const namaKanal = langkahDarurat.kanal_lapor.map((k) => k.nama.toLowerCase());
      const kontakKanal = langkahDarurat.kanal_lapor.map((k) => k.kontak.toLowerCase());

      // ===== IASC =====
      expect(
        namaKanal.some((n) => n.includes('iasc')) || kontakKanal.some((k) => k.includes('iasc.ojk.go.id'))
      ).toBe(true);

      // ===== OJK 157 =====
      expect(
        namaKanal.some((n) => n.includes('ojk')) || kontakKanal.some((k) => k.includes('157'))
      ).toBe(true);

      expect(namaKanal.some((n) => n.includes('bank'))).toBe(true);

      expect(
        namaKanal.some((n) => n.includes('platform') || n.includes('pesan'))
      ).toBe(true);

      for (const k of langkahDarurat.kanal_lapor) {
        expect(k.nama).toBeTruthy();
        expect(k.kontak).toBeTruthy();
        expect(k.keterangan).toBeTruthy();
      }
    });

    it('peringatan memuat pesan tentang pihak yang mengaku IASC', () => {
      expect(langkahDarurat.peringatan.toLowerCase()).toContain('iasc');
    });

    it('tidak memuat kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan/klaim', () => {
      const forbiddenRegex = /\b(pasti|terbukti|100%)\b/i;
      const textToCheck: string[] = [
        langkahDarurat.peringatan,
        ...langkahDarurat.situasi.map((s) => s.label),
        ...langkahDarurat.situasi.flatMap((s) => s.langkah),
        ...langkahDarurat.kanal_lapor.map((k) => `${k.nama} ${k.keterangan}`),
      ];

      for (const text of textToCheck) {
        expect(text).not.toMatch(forbiddenRegex);
      }
    });
  });

  describe('data/merek.json', () => {
    const requiredBrands = [
      'BCA',
      'BRI',
      'BNI',
      'Mandiri',
      'BSI',
      'DANA',
      'OVO',
      'GoPay',
      'Shopee',
      'Tokopedia',
      'BPJS',
      'JNE',
      'J&T',
      'Pos Indonesia',
    ];

    const validCategories = [
      'bank',
      'ewallet',
      'marketplace',
      'ekspedisi',
      'instansi',
    ];

    it('memiliki array merek', () => {
      expect(daftarMerek).toHaveProperty('merek');
      expect(Array.isArray(daftarMerek.merek)).toBe(true);
    });

    it('memuat seluruh 14 merek Indonesia yang disyaratkan', () => {
      const brandNames = daftarMerek.merek.map((m) => m.nama);
      for (const required of requiredBrands) {
        expect(brandNames).toContain(required);
      }
    });

    it('setiap merek memiliki variasi yang valid dan kategori yang benar', () => {
      for (const brand of daftarMerek.merek) {
        expect(brand.nama).toBeTruthy();
        expect(validCategories).toContain(brand.kategori);
        expect(Array.isArray(brand.variasi)).toBe(true);
        expect(brand.variasi.length).toBeGreaterThan(0);
        for (const v of brand.variasi) {
          expect(typeof v).toBe('string');
          expect(v.length).toBeGreaterThan(0);
        }
      }
    });

    it('memuat variasi substitusi karakter umum (leetspeak)', () => {
      const allVariations = daftarMerek.merek.flatMap((m) => m.variasi);
      expect(allVariations.some((v) => v.includes('0') || v.includes('1') || v.includes('4') || v.includes('5'))).toBe(true);
    });
  });

  describe('data/tld-berisiko.json', () => {
    it('memiliki array tld dan deskripsi', () => {
      expect(tldBerisiko).toHaveProperty('tld');
      expect(Array.isArray(tldBerisiko.tld)).toBe(true);
      expect(tldBerisiko.tld.length).toBeGreaterThan(10);
      expect(typeof tldBerisiko.deskripsi).toBe('string');
    });

    it('memuat TLD yang sering disalahgunakan (top, xyz, cfd, icu, tk, dll.)', () => {
      const tldList = tldBerisiko.tld;
      expect(tldList).toContain('top');
      expect(tldList).toContain('xyz');
      expect(tldList).toContain('cfd');
      expect(tldList).toContain('icu');
      expect(tldList).toContain('tk');
      expect(tldList).toContain('click');
    });

    it('setiap TLD adalah string bersih tanpa leading dot', () => {
      for (const t of tldBerisiko.tld) {
        expect(t.startsWith('.')).toBe(false);
        expect(t).toBe(t.toLowerCase());
      }
    });
  });
});
