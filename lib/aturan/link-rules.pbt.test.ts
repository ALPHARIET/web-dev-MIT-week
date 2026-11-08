/**
 * lib/aturan/link-rules.pbt.test.ts
 *
 * Property-based tests untuk analisis leksikal URL dan deteksi merek:
 * - Property 8: Deteksi kemiripan merek mencakup substitusi karakter (Requirement 19.2)
 * - Property 11: Deteksi pola leksikal URL bersifat aditif (Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10)
 *
 * References: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10, and design.md
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  deteksiMerek,
  evaluasiLeksikalUrl,
  generateHasilLinkLokal,
  normalizeLeetspeak,
} from './link-rules';
import {
  arbitraryBrandVariant,
  arbitraryUrlWithSignals,
  arbitraryUrlSignalPair,
  BOBOT_SINYAL_LEKSIKAL,
  CONTOH_MEREK_URL,
  CONTOH_KATA_PEMICU,
  CONTOH_TLD_BERISIKO,
  buildDomainUrlWithSignals,
} from '../../test/arbitraries';
import daftarMerekJson from '../../data/merek.json';

describe('lib/aturan/link-rules.pbt.test.ts', () => {
  describe('Property 8: Deteksi kemiripan merek mencakup substitusi karakter', () => {
    /**
     * Feature: cek-penipuan-web, Property 8: Deteksi kemiripan merek mencakup substitusi karakter
     * **Validates: Requirements 19.2**
     *
     * Invariant: Untuk semua string domain yang merupakan variasi dari merek Indonesia
     * di data/merek.json (termasuk leetspeak 0->o, 1->i, 3->e, 4->a, 5->s):
     * 1. fungsi `deteksiMerek(domain)` mengembalikan cocok === true
     * 2. nama merek yang sesuai terdeteksi
     * 3. skor aturan adalah +3
     * 4. kategori industri merek terdefinisi
     */
    it('Feature: cek-penipuan-web, Property 8: Deteksi kemiripan merek mencakup substitusi karakter (**Validates: Requirements 19.2**)', () => {
      fc.assert(
        fc.property(arbitraryBrandVariant(), ({ merek, domain }) => {
          const res = deteksiMerek(domain);

          // 1. Verifikasi kecocokan terdeteksi
          expect(res.cocok).toBe(true);

          // 2. Verifikasi nama merek sesuai
          expect(res.merek).toBe(merek);

          // 3. Verifikasi bobot skor selalu +3
          expect(res.skor).toBe(3);

          // 4. Verifikasi variasi yang cocok dan kategori terisi
          expect(res.variasiCocok).toBeTruthy();
          expect(res.kategori).toBeTruthy();
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Verifikasi bahwa setiap merek dari 14 merek di data/merek.json selalu terdeteksi
     * dengan skor +3 ketika disubstitusi karakter leetspeak (0->o, 1->i, 3->e, 4->a, 5->s).
     * **Validates: Requirements 19.2**
     */
    it('memastikan seluruh 14 merek Indonesia terdeteksi dengan substitusi karakter leetspeak (**Validates: Requirements 19.2**)', () => {
      const allBrands = daftarMerekJson.merek || [];

      // Arbitrary yang memilih masing-masing dari 14 merek secara merata
      const arbitrarySpecificBrandVariant = fc.constantFrom(...allBrands).chain((brand) => {
        const baseWords = [
          brand.nama.toLowerCase(),
          ...(brand.variasi || []).map((v: string) => v.toLowerCase()),
        ];

        return fc.constantFrom(...baseWords).chain((baseWord) => {
          const charArbs: fc.Arbitrary<string>[] = [];
          for (let i = 0; i < baseWord.length; i++) {
            const char = baseWord[i];
            const lower = char.toLowerCase();
            if (lower === 'o') charArbs.push(fc.constantFrom('o', '0'));
            else if (lower === 'i') charArbs.push(fc.constantFrom('i', '1'));
            else if (lower === 'e') charArbs.push(fc.constantFrom('e', '3'));
            else if (lower === 'a') charArbs.push(fc.constantFrom('a', '4'));
            else if (lower === 's') charArbs.push(fc.constantFrom('s', '5'));
            else charArbs.push(fc.constant(char));
          }

          const mutatedArb =
            charArbs.length > 0 ? fc.tuple(...charArbs).map((c) => c.join('')) : fc.constant(baseWord);
          const tldArb = fc.constantFrom('.com', '.co.id', '.id', '.net');

          return fc.tuple(mutatedArb, tldArb).map(([mutated, tld]) => ({
            merek: brand.nama,
            domain: `${mutated}${tld}`,
          }));
        });
      });

      fc.assert(
        fc.property(arbitrarySpecificBrandVariant, ({ merek, domain }) => {
          const res = deteksiMerek(domain);
          expect(res.cocok).toBe(true);
          expect(res.merek).toBe(merek);
          expect(res.skor).toBe(3);
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Verifikasi integrasi deteksi merek ke dalam evaluasiLeksikalUrl:
     * Domain variasi merek selalu memicu temuan aturan merek dengan skor minimal 3 dan level >= 'sedang'.
     * **Validates: Requirements 19.2**
     */
    it('evaluasiLeksikalUrl menghasilkan skor >= 3 dan temuan merek resmi untuk variasi domain merek (**Validates: Requirements 19.2**)', () => {
      fc.assert(
        fc.property(arbitraryBrandVariant(), ({ merek, domain }) => {
          const hasil = evaluasiLeksikalUrl(domain);

          // Skor harus minimal 3 (bisa lebih jika TLD berisiko atau path pemicu ada)
          expect(hasil.skor).toBeGreaterThanOrEqual(3);

          // Level minimal 'sedang' (skor >= 3)
          expect(['sedang', 'tinggi']).toContain(hasil.level);

          // Harus ada temuan dengan judul mencantumkan nama merek
          const temuanMerek = hasil.temuan.find((t) => t.judul.includes(merek));
          expect(temuanMerek).toBeDefined();
          expect(temuanMerek?.sumber).toBe('aturan');
          expect(temuanMerek?.penjelasan).toContain(merek);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Deteksi pola leksikal URL bersifat aditif', () => {
    /**
     * Feature: cek-penipuan-web, Property 11: Deteksi pola leksikal URL bersifat aditif
     * **Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**
     *
     * Invariant: Untuk setiap URL yang dianalisis:
     * 1. Skor analisis leksikal sama dengan jumlah bobot semua sinyal yang terdeteksi
     * 2. Skor analisis leksikal sama dengan jumlah bobot per temuan yang dihasilkan
     */
    it('Feature: cek-penipuan-web, Property 11: Deteksi pola leksikal URL bersifat aditif — skor sama dengan jumlah bobot semua sinyal (**Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSignals(), (item) => {
          const res = evaluasiLeksikalUrl(item.url);

          // 1. Skor harus tepat sama dengan expectedScore yang dihitung dari bobot sinyal aktif
          expect(res.skor).toBe(item.expectedScore);

          // 2. Hitung jumlah bobot dari setiap temuan yang dihasilkan
          const sumBobotTemuan = res.temuan.reduce((acc, t) => {
            if (t.sumber === 'safe_browsing') return acc; // Safe browsing tidak menambah skor numerik
            if (t.judul.includes('merek resmi')) return acc + 3; // Req 19.2
            if (t.judul.includes('Punycode') || t.judul.includes('homograf')) return acc + 3; // Req 19.4
            if (t.judul.includes('IP numerik')) return acc + 3; // Req 19.5
            if (t.judul.includes('kurang dari 30 hari')) return acc + 3; // Req 19.3
            if (t.judul.includes('kata pemicu')) return acc + 2; // Req 19.6
            if (t.judul.includes('subdomain')) return acc + 2; // Req 19.7
            if (t.judul.includes('TLD berisiko')) return acc + 1; // Req 19.8
            if (t.judul.includes('pemendek link')) return acc + 1; // Req 19.9
            if (t.judul.includes('@') || t.judul.includes('panjang URL')) return acc + 1; // Req 19.10
            return acc;
          }, 0);

          // 3. Verifikasi sifat aditif: skor evaluasi tepat sama dengan total bobot temuan
          expect(res.skor).toBe(sumBobotTemuan);

          // 4. Verifikasi bahwa setiap sinyal yang aktif menghasilkan temuan yang sesuai
          for (const signal of item.signals) {
            if (signal === 'merek') {
              expect(res.temuan.some((t) => t.judul.includes('merek resmi'))).toBe(true);
            } else if (signal === 'punycode') {
              expect(res.temuan.some((t) => t.judul.includes('Punycode'))).toBe(true);
            } else if (signal === 'ip') {
              expect(res.temuan.some((t) => t.judul.includes('IP numerik'))).toBe(true);
            } else if (signal === 'kata_pemicu') {
              expect(res.temuan.some((t) => t.judul.includes('kata pemicu'))).toBe(true);
            } else if (signal === 'subdomain') {
              expect(res.temuan.some((t) => t.judul.includes('subdomain'))).toBe(true);
            } else if (signal === 'tld_berisiko') {
              expect(res.temuan.some((t) => t.judul.includes('TLD berisiko'))).toBe(true);
            } else if (signal === 'at_atau_panjang') {
              expect(
                res.temuan.some((t) => t.judul.includes('@') || t.judul.includes('panjang URL'))
              ).toBe(true);
            }
          }
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Feature: cek-penipuan-web, Property 11: Deteksi pola leksikal URL bersifat aditif
     * **Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**
     *
     * Invariant: Penambahan sinyal baru ke URL selalu menaikkan atau mempertahankan skor
     * (tidak pernah menurunkannya / monotonisitas dan aditivitas).
     */
    it('Feature: cek-penipuan-web, Property 11: Deteksi pola leksikal URL bersifat aditif — penambahan sinyal baru menaikkan skor dan tidak pernah menurunkannya (**Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**)', () => {
      fc.assert(
        fc.property(arbitraryUrlSignalPair(), ({ before, after, addedSignal, addedWeight }) => {
          const resBefore = evaluasiLeksikalUrl(before.url);
          const resAfter = evaluasiLeksikalUrl(after.url);

          // 1. Monotonisitas: skor setelah penambahan sinyal tidak pernah lebih kecil
          expect(resAfter.skor).toBeGreaterThanOrEqual(resBefore.skor);

          // 2. Aditivitas: skor bertambah tepat sebesar bobot sinyal yang ditambahkan
          expect(resAfter.skor).toBe(resBefore.skor + addedWeight);

          // 3. Jumlah temuan setelah penambahan sinyal bertambah tepat 1
          expect(resAfter.temuan.length).toBe(resBefore.temuan.length + 1);

          // 4. Monotonisitas tingkat level risiko (tinggi >= sedang >= tidak_ditemukan)
          const levelOrder = { tidak_ditemukan: 0, sedang: 1, tinggi: 2 };
          expect(levelOrder[resAfter.level]).toBeGreaterThanOrEqual(levelOrder[resBefore.level]);
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Verifikasi bahwa setiap aturan leksikal individual menyumbangkan skor tepat sesuai spesifikasi:
     * - Merek: +3 (Req 19.2)
     * - Punycode: +3 (Req 19.4)
     * - IP numerik: +3 (Req 19.5)
     * - Kata pemicu: +2 (Req 19.6)
     * - TLD berisiko: +1 (Req 19.8)
     * - Karakter @: +1 (Req 19.10)
     * **Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**
     */
    it('memverifikasi bobot pasti masing-masing sinyal leksikal individual (**Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**)', () => {
      // 1. Merek (+3) — Req 19.2
      fc.assert(
        fc.property(fc.constantFrom(...CONTOH_MEREK_URL), (merekToken) => {
          const item = buildDomainUrlWithSignals({
            merek: true,
            punycode: false,
            kata_pemicu: false,
            subdomain: false,
            tld_berisiko: false,
            at_atau_panjang: false,
            brandChoice: merekToken,
          });
          const res = evaluasiLeksikalUrl(item.url);
          expect(res.skor).toBe(3);
          expect(res.level).toBe('sedang');
        }),
        { numRuns: 50 }
      );

      // 2. Punycode (+3) — Req 19.4
      const punyItem = buildDomainUrlWithSignals({
        merek: false,
        punycode: true,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: false,
        at_atau_panjang: false,
      });
      const resPuny = evaluasiLeksikalUrl(punyItem.url);
      expect(resPuny.skor).toBe(3);
      expect(resPuny.level).toBe('sedang');

      // 3. IP numerik (+3) — Req 19.5
      const resIp = evaluasiLeksikalUrl('http://192.168.1.1');
      expect(resIp.skor).toBe(3);
      expect(resIp.level).toBe('sedang');

      // 4. Kata pemicu (+2) — Req 19.6
      fc.assert(
        fc.property(fc.constantFrom(...CONTOH_KATA_PEMICU), (kata) => {
          const item = buildDomainUrlWithSignals({
            merek: false,
            punycode: false,
            kata_pemicu: true,
            subdomain: false,
            tld_berisiko: false,
            at_atau_panjang: false,
            triggerChoice: kata,
          });
          const res = evaluasiLeksikalUrl(item.url);
          expect(res.skor).toBe(2);
          expect(res.level).toBe('tidak_ditemukan'); // 2 < AMBANG_SEDANG (3)
        }),
        { numRuns: 50 }
      );

      // 5. TLD berisiko (+1) — Req 19.8
      fc.assert(
        fc.property(fc.constantFrom(...CONTOH_TLD_BERISIKO), (tld) => {
          const item = buildDomainUrlWithSignals({
            merek: false,
            punycode: false,
            kata_pemicu: false,
            subdomain: false,
            tld_berisiko: true,
            at_atau_panjang: false,
            riskyTldChoice: tld,
          });
          const res = evaluasiLeksikalUrl(item.url);
          expect(res.skor).toBe(1);
          expect(res.level).toBe('tidak_ditemukan'); // 1 < AMBANG_SEDANG (3)
        }),
        { numRuns: 50 }
      );

      // 6. Karakter @ di URL (+1) — Req 19.10
      const itemAt = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: false,
        at_atau_panjang: true,
      });
      const resAt = evaluasiLeksikalUrl(itemAt.url);
      expect(resAt.skor).toBe(1);
      expect(resAt.level).toBe('tidak_ditemukan');
    });

    /**
     * Verifikasi bahwa penambahan sinyal baru secara bertahap (kumulatif)
     * menghasilkan skor yang meningkat secara monoton pada setiap langkah.
     * **Validates: Requirements 19.2, 19.4, 19.6, 19.8, 19.10**
     */
    it('skor bertambah secara kumulatif dan deterministik dari 0 hingga 12 saat sinyal ditambahkan bertahap (**Validates: Requirements 19.2, 19.4, 19.6, 19.8, 19.10**)', () => {
      // Step 0: URL bersih tanpa sinyal (skor = 0)
      const u0 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: false,
        at_atau_panjang: false,
      });
      expect(evaluasiLeksikalUrl(u0.url).skor).toBe(0);

      // Step 1: Tambah TLD berisiko (+1) -> skor = 1
      const u1 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: true,
        at_atau_panjang: false,
      });
      expect(evaluasiLeksikalUrl(u1.url).skor).toBe(1);

      // Step 2: Tambah Karakter @ (+1) -> skor = 2
      const u2 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u2.url).skor).toBe(2);

      // Step 3: Tambah Kata pemicu (+2) -> skor = 4
      const u3 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: true,
        subdomain: false,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u3.url).skor).toBe(4);

      // Step 4: Tambah Subdomain bertingkat (+2) -> skor = 6
      const u4 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: true,
        subdomain: true,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u4.url).skor).toBe(6);

      // Step 5: Tambah Punycode (+3) -> skor = 9
      const u5 = buildDomainUrlWithSignals({
        merek: false,
        punycode: true,
        kata_pemicu: true,
        subdomain: true,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u5.url).skor).toBe(9);

      // Step 6: Tambah Merek (+3) -> skor = 12
      const u6 = buildDomainUrlWithSignals({
        merek: true,
        punycode: true,
        kata_pemicu: true,
        subdomain: true,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u6.url).skor).toBe(12);

      // Verifikasi urutan monotonisitas
      const scores = [u0, u1, u2, u3, u4, u5, u6].map((u) => evaluasiLeksikalUrl(u.url).skor);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThan(scores[i - 1]);
      }
    });
  });
});
