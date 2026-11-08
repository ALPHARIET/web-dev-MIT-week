/**
 * lib/aturan/video-rules.pbt.test.ts
 *
 * Property-based tests untuk aturan skor video & suara:
 * - Property 5: Skor aturan video & suara sesuai bobot jawaban
 *
 * References: Requirements 23.1, and design.md
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  BOBOT_VIDEO,
  evaluasiVideo,
  evaluasiAturanVideo,
  type JawabanWizardVideo,
  type SituasiVideo,
  type ApaDimintaVideo,
  type NomorAkunVideo,
  type SiapaTampilVideo,
} from './video-rules';
import {
  arbitraryWizardAnswers,
  arbitraryNonTriggeringAnswers,
  arbitrarySituasiVideo,
} from '../../test/arbitraries';

/**
 * Menghitung jumlah bobot ekspektasi dari seluruh jawaban yang memicu skor
 * sesuai dengan spesifikasi Requirement 23.1.
 */
function hitungBobotEkspektasi(jawaban: JawabanWizardVideo): number {
  let expected = 0;

  // 1. apa_diminta
  if (jawaban.apa_diminta && jawaban.apa_diminta in BOBOT_VIDEO.apa_diminta) {
    expected +=
      BOBOT_VIDEO.apa_diminta[
        jawaban.apa_diminta as keyof typeof BOBOT_VIDEO.apa_diminta
      ];
  }

  // 2. nomor_akun
  if (jawaban.nomor_akun && jawaban.nomor_akun in BOBOT_VIDEO.nomor_akun) {
    expected +=
      BOBOT_VIDEO.nomor_akun[
        jawaban.nomor_akun as keyof typeof BOBOT_VIDEO.nomor_akun
      ];
  }

  // 3. darurat_desakan (+2 jika true)
  if (jawaban.darurat_desakan === true) {
    expected += BOBOT_VIDEO.darurat_desakan;
  }

  // 4. diminta_rahasiakan (+2 jika true)
  if (jawaban.diminta_rahasiakan === true) {
    expected += BOBOT_VIDEO.diminta_rahasiakan;
  }

  // 5. bisa_telepon_balik (+3 jika false/menolak)
  if (jawaban.bisa_telepon_balik === false) {
    expected += BOBOT_VIDEO.menolak_telepon_balik;
  }

  // 6. siapa_tampil (+1 jika tokoh_publik)
  if (jawaban.siapa_tampil === 'tokoh_publik') {
    expected += BOBOT_VIDEO.siapa_tampil_tokoh_publik;
  }

  // 7. janji_untung_ajakan (+3 jika true)
  if (jawaban.janji_untung_ajakan === true) {
    expected += BOBOT_VIDEO.janji_untung_ajakan;
  }

  // 8. checklist / tanda_checklist (+1 per tanda)
  const checklist = Array.isArray(jawaban.tanda_checklist)
    ? jawaban.tanda_checklist
    : Array.isArray(jawaban.checklist)
    ? jawaban.checklist
    : [];

  expected += checklist.length * BOBOT_VIDEO.per_checklist;

  return expected;
}

describe('lib/aturan/video-rules.pbt.test.ts', () => {
  describe('Property 5: Skor aturan video & suara sesuai bobot jawaban', () => {
    /**
     * Feature: cek-penipuan-web, Property 5: Skor aturan video & suara sesuai bobot jawaban
     * **Validates: Requirements 23.1**
     *
     * Invariant: Untuk setiap kombinasi jawaban wizard yang valid:
     * 1. Skor yang dihasilkan oleh evaluasiVideo(jawaban) sama dengan jumlah bobot dari seluruh jawaban yang memicu skor
     * 2. Jawaban non-pemicu tidak mengubah skor
     * 3. Menjalankan fungsi dua kali dengan jawaban identik menghasilkan skor dan level yang identik (deterministik)
     */
    it('Feature: cek-penipuan-web, Property 5: Skor aturan video & suara sesuai bobot jawaban (**Validates: Requirements 23.1**)', () => {
      fc.assert(
        fc.property(arbitraryWizardAnswers(), (jawaban) => {
          const hasil1 = evaluasiVideo(jawaban);
          const hasil2 = evaluasiVideo(jawaban);

          // 1. Skor sama persis dengan jumlah bobot jawaban yang memicu skor
          const skorEkspektasi = hitungBobotEkspektasi(jawaban);
          expect(hasil1.skor).toBe(skorEkspektasi);

          // 2. Deterministik: dua pemanggilan dengan input identik menghasilkan hasil identik
          expect(hasil1.skor).toBe(hasil2.skor);
          expect(hasil1.level).toBe(hasil2.level);
          expect(hasil1.temuan).toEqual(hasil2.temuan);
          expect(hasil1.linkDitemukan).toEqual(hasil2.linkDitemukan);
          expect(hasil1.modusVideoDitemukan).toBe(hasil2.modusVideoDitemukan);

          // Alias evaluasiAturanVideo juga menghasilkan hasil yang sama
          const hasilAlias = evaluasiAturanVideo(jawaban);
          expect(hasilAlias).toEqual(hasil1);
        }),
        { numRuns: 200 }
      );
    });

    /**
     * Memverifikasi bahwa setiap jawaban non-pemicu secara murni menghasilkan skor 0.
     * Termasuk: apa_diminta: 'tidak_ada', nomor_akun: 'nomor_lama_tersimpan'/'nomor_lama',
     * darurat: false, rahasia: false, bisa_telepon_balik: true, siapa_tampil: 'keluarga'/'atasan'/'lainnya',
     * janji_untung: false, checklist: [], situasi apapun, dan field kustom lainnya.
     * **Validates: Requirements 23.1**
     */
    it('jawaban non-pemicu selalu menghasilkan skor 0 (**Validates: Requirements 23.1**)', () => {
      fc.assert(
        fc.property(arbitraryNonTriggeringAnswers(), (nonTriggering) => {
          const res = evaluasiVideo(nonTriggering);
          expect(res.skor).toBe(0);
          expect(res.temuan).toEqual([]);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Memverifikasi bahwa menambahkan atau mengubah jawaban non-pemicu pada kombinasi jawaban acak
     * tidak pernah mengubah skor yang dihasilkan.
     * **Validates: Requirements 23.1**
     */
    it('menambahkan atau mengubah jawaban non-pemicu tidak mengubah total skor (**Validates: Requirements 23.1**)', () => {
      fc.assert(
        fc.property(
          arbitraryWizardAnswers(),
          arbitrarySituasiVideo(),
          fc.constantFrom<boolean | undefined>(true, false, undefined),
          fc.dictionary(
            fc.constantFrom('keterangan', 'durasi_menit', 'info_tambahan', 'tag'),
            fc.string({ minLength: 1, maxLength: 20 }),
            { maxKeys: 3, noNullPrototype: true }
          ),
          (baseJawaban, newSituasi, newMasihTersambung, extraMetadata) => {
            const skorAwal = evaluasiVideo(baseJawaban).skor;

            // Variasikan field-field non-pemicu: situasi, masih_tersambung, dan metadata tambahan
            const variasi1: JawabanWizardVideo = {
              ...baseJawaban,
              situasi: newSituasi,
              masih_tersambung: newMasihTersambung,
              ...extraMetadata,
            };

            expect(evaluasiVideo(variasi1).skor).toBe(skorAwal);

            // Jika baseJawaban tidak memiliki apa_diminta atau bernilai 'tidak_ada', skor tidak berubah
            if (!baseJawaban.apa_diminta || baseJawaban.apa_diminta === 'tidak_ada') {
              const variasiTidakAda = { ...baseJawaban, apa_diminta: 'tidak_ada' as const };
              const variasiKosong = { ...baseJawaban, apa_diminta: undefined };
              expect(evaluasiVideo(variasiTidakAda).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiKosong).skor).toBe(skorAwal);
            }

            // Jika baseJawaban tidak memiliki nomor_akun atau nomor_lama, skor tidak berubah
            if (
              !baseJawaban.nomor_akun ||
              baseJawaban.nomor_akun === 'nomor_lama' ||
              baseJawaban.nomor_akun === 'nomor_lama_tersimpan'
            ) {
              const variasiNomorLama = {
                ...baseJawaban,
                nomor_akun: 'nomor_lama_tersimpan' as const,
              };
              const variasiNomorLama2 = {
                ...baseJawaban,
                nomor_akun: 'nomor_lama' as const,
              };
              const variasiKosong = { ...baseJawaban, nomor_akun: undefined };
              expect(evaluasiVideo(variasiNomorLama).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiNomorLama2).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiKosong).skor).toBe(skorAwal);
            }

            // Jika baseJawaban tidak memiliki darurat_desakan atau bernilai false, skor tidak berubah
            if (!baseJawaban.darurat_desakan) {
              const variasiFalse = { ...baseJawaban, darurat_desakan: false };
              const variasiUndefined = { ...baseJawaban, darurat_desakan: undefined };
              expect(evaluasiVideo(variasiFalse).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }

            // Jika baseJawaban tidak memiliki diminta_rahasiakan atau bernilai false, skor tidak berubah
            if (!baseJawaban.diminta_rahasiakan) {
              const variasiFalse = { ...baseJawaban, diminta_rahasiakan: false };
              const variasiUndefined = { ...baseJawaban, diminta_rahasiakan: undefined };
              expect(evaluasiVideo(variasiFalse).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }

            // Jika baseJawaban bisa_telepon_balik bernilai true atau undefined, skor tidak berubah
            if (baseJawaban.bisa_telepon_balik !== false) {
              const variasiTrue = { ...baseJawaban, bisa_telepon_balik: true };
              const variasiUndefined = { ...baseJawaban, bisa_telepon_balik: undefined };
              expect(evaluasiVideo(variasiTrue).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }

            // Jika baseJawaban siapa_tampil bukan tokoh_publik, pilihan netral lainnya tidak mengubah skor
            if (baseJawaban.siapa_tampil !== 'tokoh_publik') {
              for (const nonTokoh of ['keluarga', 'atasan', 'lainnya', undefined] as const) {
                const variasiNetral = { ...baseJawaban, siapa_tampil: nonTokoh };
                expect(evaluasiVideo(variasiNetral).skor).toBe(skorAwal);
              }
            }

            // Jika baseJawaban janji_untung_ajakan bernilai false atau undefined, skor tidak berubah
            if (!baseJawaban.janji_untung_ajakan) {
              const variasiFalse = { ...baseJawaban, janji_untung_ajakan: false };
              const variasiUndefined = { ...baseJawaban, janji_untung_ajakan: undefined };
              expect(evaluasiVideo(variasiFalse).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Memverifikasi masing-masing dari 12 komponen jawaban pemicu memberikan bobot yang tepat secara aditif
     * sesuai spesifikasi Requirement 23.1:
     * - OTP/PIN/data akun (+4)
     * - Permintaan transfer/pulsa/voucher (+3)
     * - Ajakan investasi/janji untung (+3)
     * - Menolak ditelepon balik (+3)
     * - Tokoh publik + janji untung + link WA/TG (+3)
     * - Klik link atau instal APK (+2)
     * - Nomor baru dalih ganti nomor (+2)
     * - Keadaan darurat/desakan (+2)
     * - Diminta merahasiakan (+2)
     * - Akun medsos tidak dikenal (+1)
     * - Tokoh publik (+1)
     * - Tanda checklist (+1 per tanda)
     * **Validates: Requirements 23.1**
     */
    it('setiap jawaban pemicu berkontribusi tepat sesuai bobot spesifikasi Requirement 23.1 (**Validates: Requirements 23.1**)', () => {
      // 1. apa_diminta: otp_pin -> +4
      expect(evaluasiVideo({ apa_diminta: 'otp_pin' }).skor).toBe(4);

      // 2. apa_diminta: transfer, voucher, pulsa -> +3
      expect(evaluasiVideo({ apa_diminta: 'transfer' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'voucher' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'pulsa' }).skor).toBe(3);

      // 3. apa_diminta: investasi -> +3
      expect(evaluasiVideo({ apa_diminta: 'investasi' }).skor).toBe(3);

      // 4. bisa_telepon_balik: false (menolak telepon balik) -> +3
      expect(evaluasiVideo({ bisa_telepon_balik: false }).skor).toBe(3);

      // 5. janji_untung_ajakan: true -> +3
      expect(evaluasiVideo({ janji_untung_ajakan: true }).skor).toBe(3);

      // 6. apa_diminta: link_apk -> +2
      expect(evaluasiVideo({ apa_diminta: 'link_apk' }).skor).toBe(2);

      // 7. nomor_akun: nomor_baru -> +2
      expect(evaluasiVideo({ nomor_akun: 'nomor_baru' }).skor).toBe(2);

      // 8. darurat_desakan: true -> +2
      expect(evaluasiVideo({ darurat_desakan: true }).skor).toBe(2);

      // 9. diminta_rahasiakan: true -> +2
      expect(evaluasiVideo({ diminta_rahasiakan: true }).skor).toBe(2);

      // 10. nomor_akun: akun_tidak_dikenal -> +1
      expect(evaluasiVideo({ nomor_akun: 'akun_tidak_dikenal' }).skor).toBe(1);

      // 11. siapa_tampil: tokoh_publik -> +1
      expect(evaluasiVideo({ siapa_tampil: 'tokoh_publik' }).skor).toBe(1);

      // 12. checklist / tanda_checklist: +1 per tanda
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
            minLength: 1,
            maxLength: 10,
          }),
          (items) => {
            const resTanda = evaluasiVideo({ tanda_checklist: items });
            expect(resTanda.skor).toBe(items.length);

            const resChecklist = evaluasiVideo({ checklist: items });
            expect(resChecklist.skor).toBe(items.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Memverifikasi sifat aditif: jika jawaban A dan B tidak saling menimpa field,
     * skor(A + B) = skor(A) + skor(B).
     * **Validates: Requirements 23.1**
     */
    it('memenuhi sifat aditif penjumlahan bobot independen (**Validates: Requirements 23.1**)', () => {
      const arbitraryPemicuIndependen = fc.record({
        apa_diminta: fc.constantFrom<ApaDimintaVideo | undefined>(
          'otp_pin',
          'transfer',
          'voucher',
          'pulsa',
          'investasi',
          'link_apk',
          undefined
        ),
        nomor_akun: fc.constantFrom<NomorAkunVideo | undefined>(
          'nomor_baru',
          'akun_tidak_dikenal',
          undefined
        ),
        darurat_desakan: fc.constantFrom<boolean | undefined>(true, undefined),
        diminta_rahasiakan: fc.constantFrom<boolean | undefined>(true, undefined),
        bisa_telepon_balik: fc.constantFrom<boolean | undefined>(false, undefined),
        siapa_tampil: fc.constantFrom<SiapaTampilVideo | undefined>('tokoh_publik', undefined),
        janji_untung_ajakan: fc.constantFrom<boolean | undefined>(true, undefined),
      });

      fc.assert(
        fc.property(arbitraryPemicuIndependen, (pemicu) => {
          let expectedSkor = 0;
          if (pemicu.apa_diminta) expectedSkor += BOBOT_VIDEO.apa_diminta[pemicu.apa_diminta];
          if (pemicu.nomor_akun) expectedSkor += BOBOT_VIDEO.nomor_akun[pemicu.nomor_akun];
          if (pemicu.darurat_desakan === true) expectedSkor += BOBOT_VIDEO.darurat_desakan;
          if (pemicu.diminta_rahasiakan === true) expectedSkor += BOBOT_VIDEO.diminta_rahasiakan;
          if (pemicu.bisa_telepon_balik === false) expectedSkor += BOBOT_VIDEO.menolak_telepon_balik;
          if (pemicu.siapa_tampil === 'tokoh_publik')
            expectedSkor += BOBOT_VIDEO.siapa_tampil_tokoh_publik;
          if (pemicu.janji_untung_ajakan === true) expectedSkor += BOBOT_VIDEO.janji_untung_ajakan;

          const res = evaluasiVideo(pemicu);
          expect(res.skor).toBe(expectedSkor);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Memverifikasi immutability: evaluasiVideo tidak memutasi objek input.
     * **Validates: Requirements 23.1**
     */
    it('tidak memutasi objek jawaban input (**Validates: Requirements 23.1**)', () => {
      fc.assert(
        fc.property(arbitraryWizardAnswers(), (jawaban) => {
          const salinanAwal = JSON.parse(JSON.stringify(jawaban));
          evaluasiVideo(jawaban);
          expect(jawaban).toEqual(salinanAwal);
        }),
        { numRuns: 100 }
      );
    });
  });
});
