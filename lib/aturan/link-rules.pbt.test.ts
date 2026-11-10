import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  deteksiMerek,
  evaluasiLeksikalUrl,
} from './link-rules';
import {
  arbitraryBrandVariant,
  arbitraryUrlWithSignals,
  arbitraryUrlSignalPair,
  CONTOH_MEREK_URL,
  CONTOH_KATA_PEMICU,
  CONTOH_TLD_BERISIKO,
  buildDomainUrlWithSignals,
} from '../../test/arbitraries';
import daftarMerekJson from '../../data/merek.json';

describe('lib/aturan/link-rules.pbt.test.ts', () => {
  describe('Property 8: Deteksi kemiripan merek mencakup substitusi karakter', () => {
    it('Feature: cek-penipuan-web, Property 8: Deteksi kemiripan merek mencakup substitusi karakter (**Validates: Requirements 19.2**)', () => {
      fc.assert(
        fc.property(arbitraryBrandVariant(), ({ merek, domain }) => {
          const res = deteksiMerek(domain);

          expect(res.cocok).toBe(true);

          expect(res.merek).toBe(merek);

          expect(res.skor).toBe(3);

          expect(res.variasiCocok).toBeTruthy();
          expect(res.kategori).toBeTruthy();
        }),
        { numRuns: 200 }
      );
    });

    it('memastikan seluruh 14 merek Indonesia terdeteksi dengan substitusi karakter leetspeak (**Validates: Requirements 19.2**)', () => {
      const allBrands = daftarMerekJson.merek || [];

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

    it('evaluasiLeksikalUrl menghasilkan skor >= 3 dan temuan merek resmi untuk variasi domain merek (**Validates: Requirements 19.2**)', () => {
      fc.assert(
        fc.property(arbitraryBrandVariant(), ({ merek, domain }) => {
          const hasil = evaluasiLeksikalUrl(domain);

          expect(hasil.skor).toBeGreaterThanOrEqual(3);

          expect(['sedang', 'tinggi']).toContain(hasil.level);

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
    it('Feature: cek-penipuan-web, Property 11: Deteksi pola leksikal URL bersifat aditif — skor sama dengan jumlah bobot semua sinyal (**Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSignals(), (item) => {
          const res = evaluasiLeksikalUrl(item.url);

          expect(res.skor).toBe(item.expectedScore);

          const sumBobotTemuan = res.temuan.reduce((acc, t) => {
            if (t.sumber === 'safe_browsing') return acc;
            if (t.judul.includes('merek resmi')) return acc + 3;
            if (t.judul.includes('Punycode') || t.judul.includes('homograf')) return acc + 3;
            if (t.judul.includes('IP numerik')) return acc + 3;
            if (t.judul.includes('kurang dari 30 hari')) return acc + 3;
            if (t.judul.includes('kata pemicu')) return acc + 2;
            if (t.judul.includes('subdomain')) return acc + 2;
            if (t.judul.includes('TLD berisiko')) return acc + 1;
            if (t.judul.includes('pemendek link')) return acc + 1;
            if (t.judul.includes('@') || t.judul.includes('panjang URL')) return acc + 1;
            return acc;
          }, 0);

          expect(res.skor).toBe(sumBobotTemuan);

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

    it('Feature: cek-penipuan-web, Property 11: Deteksi pola leksikal URL bersifat aditif — penambahan sinyal baru menaikkan skor dan tidak pernah menurunkannya (**Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**)', () => {
      fc.assert(
        fc.property(arbitraryUrlSignalPair(), ({ before, after, addedWeight }) => {
          const resBefore = evaluasiLeksikalUrl(before.url);
          const resAfter = evaluasiLeksikalUrl(after.url);

          expect(resAfter.skor).toBeGreaterThanOrEqual(resBefore.skor);

          expect(resAfter.skor).toBe(resBefore.skor + addedWeight);

          expect(resAfter.temuan.length).toBe(resBefore.temuan.length + 1);

          const levelOrder = { tidak_ditemukan: 0, sedang: 1, tinggi: 2 };
          expect(levelOrder[resAfter.level]).toBeGreaterThanOrEqual(levelOrder[resBefore.level]);
        }),
        { numRuns: 200 }
      );
    });

    it('memverifikasi bobot pasti masing-masing sinyal leksikal individual (**Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**)', () => {
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

      const resIp = evaluasiLeksikalUrl('http://192.168.1.1');
      expect(resIp.skor).toBe(3);
      expect(resIp.level).toBe('sedang');

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
          expect(res.level).toBe('tidak_ditemukan');
        }),
        { numRuns: 50 }
      );

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
          expect(res.level).toBe('tidak_ditemukan');
        }),
        { numRuns: 50 }
      );

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

    it('skor bertambah secara kumulatif dan deterministik dari 0 hingga 12 saat sinyal ditambahkan bertahap (**Validates: Requirements 19.2, 19.4, 19.6, 19.8, 19.10**)', () => {
      const u0 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: false,
        at_atau_panjang: false,
      });
      expect(evaluasiLeksikalUrl(u0.url).skor).toBe(0);

      const u1 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: true,
        at_atau_panjang: false,
      });
      expect(evaluasiLeksikalUrl(u1.url).skor).toBe(1);

      const u2 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: false,
        subdomain: false,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u2.url).skor).toBe(2);

      const u3 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: true,
        subdomain: false,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u3.url).skor).toBe(4);

      const u4 = buildDomainUrlWithSignals({
        merek: false,
        punycode: false,
        kata_pemicu: true,
        subdomain: true,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u4.url).skor).toBe(6);

      const u5 = buildDomainUrlWithSignals({
        merek: false,
        punycode: true,
        kata_pemicu: true,
        subdomain: true,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u5.url).skor).toBe(9);

      const u6 = buildDomainUrlWithSignals({
        merek: true,
        punycode: true,
        kata_pemicu: true,
        subdomain: true,
        tld_berisiko: true,
        at_atau_panjang: true,
      });
      expect(evaluasiLeksikalUrl(u6.url).skor).toBe(12);

      const scores = [u0, u1, u2, u3, u4, u5, u6].map((u) => evaluasiLeksikalUrl(u.url).skor);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThan(scores[i - 1]);
      }
    });
  });
});
