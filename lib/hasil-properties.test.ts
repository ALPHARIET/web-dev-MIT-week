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

const arbitraryTingkatLevel = fc.constantFrom<TingkatLevel>(
  'tinggi',
  'sedang',
  'tidak_ditemukan'
);

describe('lib/hasil-properties.test.ts', () => {
  describe('Property 2: Monotonisitas level — AI tidak pernah menurunkan', () => {
    it('Feature: cek-penipuan-web, Property 2: Monotonisitas level — AI tidak pernah menurunkan (**Validates: Requirements 10.5, 14.4, 20.2**)', () => {
      fc.assert(
        fc.property(
          arbitraryTingkatLevel,
          arbitraryTingkatLevel,
          (levelAturanLokal, levelAI) => {
            const hasil = gabungLevel(levelAturanLokal, levelAI);

            expect(URUTAN_LEVEL[hasil]).toBeGreaterThanOrEqual(
              URUTAN_LEVEL[levelAturanLokal]
            );

            expect(URUTAN_LEVEL[hasil]).toBeGreaterThanOrEqual(
              URUTAN_LEVEL[levelAI]
            );

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
            expect(gabungLevel(a, a)).toBe(a);

            expect(gabungLevel(a, b)).toBe(gabungLevel(b, a));

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
    it('Feature: cek-penipuan-web, Property 3: Determinisme penghitungan skor → level (**Validates: Requirements 10.1, 10.2, 10.3, 10.4**)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.boolean(),
          (skor, adaLangsungTinggi) => {
            const hasil1 = hitungLevel(skor, adaLangsungTinggi);
            const hasil2 = hitungLevel(skor, adaLangsungTinggi);

            expect(hasil1).toBe(hasil2);

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
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 2 }), (skor) => {
          expect(hitungLevel(skor, false)).toBe('tidak_ditemukan');
          expect(hitungLevel(skor)).toBe('tidak_ditemukan');
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(fc.integer({ min: 3, max: 5 }), (skor) => {
          expect(hitungLevel(skor, false)).toBe('sedang');
          expect(hitungLevel(skor)).toBe('sedang');
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(fc.integer({ min: 6, max: 1000 }), (skor) => {
          expect(hitungLevel(skor, false)).toBe('tinggi');
          expect(hitungLevel(skor)).toBe('tinggi');
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
