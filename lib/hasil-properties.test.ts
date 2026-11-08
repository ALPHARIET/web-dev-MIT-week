/**
 * lib/hasil-properties.test.ts
 *
 * Property-based tests untuk fungsi penentuan dan penggabungan tingkat level:
 * - Property 2: Monotonisitas level — AI tidak pernah menurunkan
 * - Property 3: Determinisme penghitungan skor → level
 *
 * References: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 14.4, 20.2, and design.md
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  hitungLevel,
  gabungLevel,
  URUTAN_LEVEL,
  AMBANG_TINGGI,
  AMBANG_SEDANG,
  type TingkatLevel,
} from './hasil';

/** Generator untuk nilai TingkatLevel yang valid */
const arbitraryTingkatLevel = fc.constantFrom<TingkatLevel>(
  'tinggi',
  'sedang',
  'tidak_ditemukan'
);

describe('lib/hasil-properties.test.ts', () => {
  describe('Property 2: Monotonisitas level — AI tidak pernah menurunkan', () => {
    /**
     * Feature: cek-penipuan-web, Property 2: Monotonisitas level — AI tidak pernah menurunkan
     * **Validates: Requirements 10.5, 14.4, 20.2**
     *
     * Invariant: Untuk setiap pasangan (levelAturanLokal, levelAI),
     * hasil gabungLevel(levelAturanLokal, levelAI) selalu >= levelAturanLokal.
     * AI hanya boleh menaikkan tingkat kewaspadaan, tidak pernah menurunkan.
     */
    it('Feature: cek-penipuan-web, Property 2: Monotonisitas level — AI tidak pernah menurunkan (**Validates: Requirements 10.5, 14.4, 20.2**)', () => {
      fc.assert(
        fc.property(
          arbitraryTingkatLevel,
          arbitraryTingkatLevel,
          (levelAturanLokal, levelAI) => {
            const hasil = gabungLevel(levelAturanLokal, levelAI);

            // gabungLevel(a, b) >= a (AI tidak pernah menurunkan level aturan lokal)
            expect(URUTAN_LEVEL[hasil]).toBeGreaterThanOrEqual(
              URUTAN_LEVEL[levelAturanLokal]
            );

            // gabungLevel(a, b) >= b (hasil penggabungan selalu mengambil level tertinggi)
            expect(URUTAN_LEVEL[hasil]).toBeGreaterThanOrEqual(
              URUTAN_LEVEL[levelAI]
            );

            // Hasil harus tepat sama dengan level dengan bobot lebih tinggi
            const expectedLevel =
              URUTAN_LEVEL[levelAturanLokal] >= URUTAN_LEVEL[levelAI]
                ? levelAturanLokal
                : levelAI;
            expect(hasil).toBe(expectedLevel);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('memenuhi sifat aljabar: idempoten, komutatif, dan asosiatif (**Validates: Requirements 10.5, 14.4, 20.2**)', () => {
      fc.assert(
        fc.property(
          arbitraryTingkatLevel,
          arbitraryTingkatLevel,
          arbitraryTingkatLevel,
          (a, b, c) => {
            // Idempoten: gabungLevel(a, a) === a
            expect(gabungLevel(a, a)).toBe(a);

            // Komutatif: gabungLevel(a, b) === gabungLevel(b, a)
            expect(gabungLevel(a, b)).toBe(gabungLevel(b, a));

            // Asosiatif: gabungLevel(gabungLevel(a, b), c) === gabungLevel(a, gabungLevel(b, c))
            expect(gabungLevel(gabungLevel(a, b), c)).toBe(
              gabungLevel(a, gabungLevel(b, c))
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('memastikan jika level aturan lokal sudah "tinggi", AI tidak dapat menurunkannya (**Validates: Requirements 10.5, 14.4, 20.2**)', () => {
      fc.assert(
        fc.property(arbitraryTingkatLevel, (levelAI) => {
          expect(gabungLevel('tinggi', levelAI)).toBe('tinggi');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Determinisme penghitungan skor → level', () => {
    /**
     * Feature: cek-penipuan-web, Property 3: Determinisme penghitungan skor → level
     * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
     *
     * Invariant: Untuk setiap nilai skor integer non-negatif:
     * - "tinggi" jika skor >= 6 atau ada flag langsungTinggi
     * - "sedang" jika 3 <= skor <= 5 dan tidak ada flag langsungTinggi
     * - "tidak_ditemukan" jika skor < 3 dan tidak ada flag langsungTinggi
     * Dan fungsi bersifat deterministik (menghasilkan output yang sama untuk input yang sama).
     */
    it('Feature: cek-penipuan-web, Property 3: Determinisme penghitungan skor → level (**Validates: Requirements 10.1, 10.2, 10.3, 10.4**)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.boolean(),
          (skor, adaLangsungTinggi) => {
            const hasil1 = hitungLevel(skor, adaLangsungTinggi);
            const hasil2 = hitungLevel(skor, adaLangsungTinggi);

            // Deterministik: dua pemanggilan dengan input identik menghasilkan output sama
            expect(hasil1).toBe(hasil2);

            // Kesesuaian ambang batas (>= 6 -> tinggi, 3..5 -> sedang, < 3 -> tidak_ditemukan, langsungTinggi -> tinggi)
            if (adaLangsungTinggi || skor >= AMBANG_TINGGI) {
              expect(hasil1).toBe('tinggi');
            } else if (skor >= AMBANG_SEDANG) {
              expect(hasil1).toBe('sedang');
            } else {
              expect(hasil1).toBe('tidak_ditemukan');
            }
          }
        ),
        { numRuns: 200 }
      );
    });

    it('memverifikasi partisi ambang batas skor tanpa flag langsungTinggi (**Validates: Requirements 10.2, 10.3, 10.4**)', () => {
      // Partisi 1: skor < 3 -> tidak_ditemukan (Requirement 10.4)
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 }), (skor) => {
          expect(hitungLevel(skor, false)).toBe('tidak_ditemukan');
          expect(hitungLevel(skor)).toBe('tidak_ditemukan'); // default argumen false
        }),
        { numRuns: 100 }
      );

      // Partisi 2: 3 <= skor <= 5 -> sedang (Requirement 10.3)
      fc.assert(
        fc.property(fc.integer({ min: 3, max: 5 }), (skor) => {
          expect(hitungLevel(skor, false)).toBe('sedang');
          expect(hitungLevel(skor)).toBe('sedang'); // default argumen false
        }),
        { numRuns: 100 }
      );

      // Partisi 3: skor >= 6 -> tinggi (Requirement 10.2)
      fc.assert(
        fc.property(fc.integer({ min: 6, max: 1000 }), (skor) => {
          expect(hitungLevel(skor, false)).toBe('tinggi');
          expect(hitungLevel(skor)).toBe('tinggi'); // default argumen false
        }),
        { numRuns: 100 }
      );
    });

    it('memverifikasi flag langsungTinggi selalu menghasilkan "tinggi" untuk sembarang skor non-negatif (**Validates: Requirements 10.1, 10.2**)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000 }), (skor) => {
          expect(hitungLevel(skor, true)).toBe('tinggi');
        }),
        { numRuns: 100 }
      );
    });
  });
});
