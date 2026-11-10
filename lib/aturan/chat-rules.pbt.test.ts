import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ATURAN_CHAT,
  evaluasiChat,
  evaluasiAturanChat,
} from './chat-rules';
import {
  arbitraryChatText,
  arbitraryChatTextDetail,
  FRASE_POLA_CHAT,
  KALIMAT_CHAT_NETRAL,
} from '../../test/arbitraries';
import type { Aturan } from './scoring';

function cariAturanCocok(teks: string): Aturan[] {
  return ATURAN_CHAT.filter((aturan) => {
    if (typeof aturan.pola === 'function') {
      return aturan.pola(teks);
    }
    if (aturan.pola instanceof RegExp) {
      aturan.pola.lastIndex = 0;
      const res = aturan.pola.test(teks);
      aturan.pola.lastIndex = 0;
      return res;
    }
    return false;
  });
}

describe('lib/aturan/chat-rules.pbt.test.ts', () => {
  describe('Property 4: Skor aturan chat aditif dan deterministik', () => {
    it('Feature: cek-penipuan-web, Property 4: Skor aturan chat aditif dan deterministik (**Validates: Requirements 13.2**)', () => {
      fc.assert(
        fc.property(arbitraryChatText(), (teks) => {
          const hasil1 = evaluasiChat(teks);
          const hasil2 = evaluasiChat(teks);

          const polaCocok = cariAturanCocok(teks);
          const bobotDiharapkan = polaCocok.reduce((sum, a) => sum + a.bobot, 0);
          expect(hasil1.skor).toBe(bobotDiharapkan);

          expect(hasil1.temuan.length).toBe(polaCocok.length);

          const aturanMap = new Map(ATURAN_CHAT.map((a) => [a.judul, a]));
          const totalBobotTemuan = hasil1.temuan.reduce(
            (sum, t) => sum + (aturanMap.get(t.judul)?.bobot ?? 0),
            0
          );
          expect(hasil1.skor).toBe(totalBobotTemuan);

          expect(hasil2.skor).toBe(hasil1.skor);
          expect(hasil2.level).toBe(hasil1.level);
          expect(hasil2.temuan).toEqual(hasil1.temuan);
          expect(hasil2.linkDitemukan).toEqual(hasil1.linkDitemukan);
          expect(hasil2.modusVideoDitemukan).toBe(hasil1.modusVideoDitemukan);
        }),
        { numRuns: 200 }
      );
    });

    it('memastikan sifat aditif: skor teks dengan kombinasi pola independen sama dengan jumlah bobot pola tersebut (**Validates: Requirements 13.2**)', () => {
      fc.assert(
        fc.property(arbitraryChatTextDetail(), (detail) => {
          const hasil = evaluasiChat(detail.teks);

          expect(hasil.skor).toBe(detail.expectedScore);

          const judulTemuan = hasil.temuan.map((t) => t.judul);
          const aturanMapById = new Map(ATURAN_CHAT.map((a) => [a.id, a]));

          for (const pid of detail.selectedPatternIds) {
            const aturan = aturanMapById.get(pid);
            if (aturan) {
              expect(judulTemuan).toContain(aturan.judul);
            }
          }

          expect(hasil.temuan.length).toBe(detail.selectedPatternIds.length);
        }),
        { numRuns: 200 }
      );
    });

    it('menjamin fungsi evaluasiChat deterministik dan idempoten untuk string teks acak apa pun (**Validates: Requirements 13.2**)', () => {
      fc.assert(
        fc.property(fc.string(), (teks) => {
          const run1 = evaluasiChat(teks);
          const run2 = evaluasiChat(teks);

          expect(run1.skor).toBe(run2.skor);
          expect(run1.level).toBe(run2.level);
          expect(run1.temuan).toEqual(run2.temuan);
          expect(run1.linkDitemukan).toEqual(run2.linkDitemukan);
          expect(run1.modusVideoDitemukan).toBe(run2.modusVideoDitemukan);

          const polaCocok = cariAturanCocok(teks);
          const bobotDiharapkan = polaCocok.reduce((sum, a) => sum + a.bobot, 0);
          expect(run1.skor).toBe(bobotDiharapkan);
        }),
        { numRuns: 100 }
      );
    });

    it('memastikan alias evaluasiAturanChat menghasilkan output identik dengan evaluasiChat (**Validates: Requirements 13.2**)', () => {
      fc.assert(
        fc.property(arbitraryChatText(), (teks) => {
          const hasilA = evaluasiChat(teks);
          const hasilB = evaluasiAturanChat(teks);

          expect(hasilA.skor).toBe(hasilB.skor);
          expect(hasilA.level).toBe(hasilB.level);
          expect(hasilA.temuan).toEqual(hasilB.temuan);
          expect(hasilA.linkDitemukan).toEqual(hasilB.linkDitemukan);
          expect(hasilA.modusVideoDitemukan).toBe(hasilB.modusVideoDitemukan);
        }),
        { numRuns: 100 }
      );
    });

    it('memastikan penambahan pola penipuan baru tidak pernah menurunkan skor (**Validates: Requirements 13.2**)', () => {
      const allPatternIds = Object.keys(FRASE_POLA_CHAT);

      fc.assert(
        fc.property(
          arbitraryChatText(),
          fc.constantFrom(...allPatternIds),
          (teksAwal, patternId) => {
            const hasilAwal = evaluasiChat(teksAwal);
            const fraseTambahan = FRASE_POLA_CHAT[patternId].contoh[0];
            const teksBaru = `${teksAwal} ${fraseTambahan}`;
            const hasilBaru = evaluasiChat(teksBaru);

            expect(hasilBaru.skor).toBeGreaterThanOrEqual(hasilAwal.skor);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('memverifikasi skor maksimal 21 saat seluruh 11 pola penipuan hadir bersamaan (**Validates: Requirements 13.2**)', () => {
      const allPhrases = Object.keys(FRASE_POLA_CHAT).map(
        (id) => FRASE_POLA_CHAT[id].contoh[0]
      );
      const teksLengkap = allPhrases.join('. ');
      const hasil = evaluasiChat(teksLengkap);

      expect(hasil.skor).toBe(21);
      expect(hasil.level).toBe('tinggi');
      expect(hasil.temuan.length).toBe(11);
    });

    it('memverifikasi skor 0 dan level "tidak_ditemukan" untuk teks netral tanpa pola penipuan (**Validates: Requirements 13.2**)', () => {
      fc.assert(
        fc.property(
          fc.subarray(KALIMAT_CHAT_NETRAL, { minLength: 1, maxLength: 5 }),
          (sentences) => {
            const teks = sentences.join(' ');
            const hasil = evaluasiChat(teks);

            expect(hasil.skor).toBe(0);
            expect(hasil.level).toBe('tidak_ditemukan');
            expect(hasil.temuan).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
