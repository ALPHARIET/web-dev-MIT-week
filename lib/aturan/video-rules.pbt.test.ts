import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  BOBOT_VIDEO,
  evaluasiVideo,
  evaluasiAturanVideo,
  type JawabanWizardVideo,
  type ApaDimintaVideo,
  type NomorAkunVideo,
  type SiapaTampilVideo,
} from './video-rules';
import {
  arbitraryWizardAnswers,
  arbitraryNonTriggeringAnswers,
  arbitrarySituasiVideo,
} from '../../test/arbitraries';

function hitungBobotEkspektasi(jawaban: JawabanWizardVideo): number {
  let expected = 0;

  if (jawaban.apa_diminta && jawaban.apa_diminta in BOBOT_VIDEO.apa_diminta) {
    expected +=
      BOBOT_VIDEO.apa_diminta[
        jawaban.apa_diminta as keyof typeof BOBOT_VIDEO.apa_diminta
      ];
  }

  if (jawaban.nomor_akun && jawaban.nomor_akun in BOBOT_VIDEO.nomor_akun) {
    expected +=
      BOBOT_VIDEO.nomor_akun[
        jawaban.nomor_akun as keyof typeof BOBOT_VIDEO.nomor_akun
      ];
  }

  if (jawaban.darurat_desakan === true) {
    expected += BOBOT_VIDEO.darurat_desakan;
  }

  if (jawaban.diminta_rahasiakan === true) {
    expected += BOBOT_VIDEO.diminta_rahasiakan;
  }

  if (jawaban.bisa_telepon_balik === false) {
    expected += BOBOT_VIDEO.menolak_telepon_balik;
  }

  if (jawaban.siapa_tampil === 'tokoh_publik') {
    expected += BOBOT_VIDEO.siapa_tampil_tokoh_publik;
  }

  if (jawaban.janji_untung_ajakan === true) {
    expected += BOBOT_VIDEO.janji_untung_ajakan;
  }

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
    it('Feature: cek-penipuan-web, Property 5: Skor aturan video & suara sesuai bobot jawaban (**Validates: Requirements 23.1**)', () => {
      fc.assert(
        fc.property(arbitraryWizardAnswers(), (jawaban) => {
          const hasil1 = evaluasiVideo(jawaban);
          const hasil2 = evaluasiVideo(jawaban);

          const skorEkspektasi = hitungBobotEkspektasi(jawaban);
          expect(hasil1.skor).toBe(skorEkspektasi);

          expect(hasil1.skor).toBe(hasil2.skor);
          expect(hasil1.level).toBe(hasil2.level);
          expect(hasil1.temuan).toEqual(hasil2.temuan);
          expect(hasil1.linkDitemukan).toEqual(hasil2.linkDitemukan);
          expect(hasil1.modusVideoDitemukan).toBe(hasil2.modusVideoDitemukan);

          const hasilAlias = evaluasiAturanVideo(jawaban);
          expect(hasilAlias).toEqual(hasil1);
        }),
        { numRuns: 200 }
      );
    });

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

            const variasi1: JawabanWizardVideo = {
              ...baseJawaban,
              situasi: newSituasi,
              masih_tersambung: newMasihTersambung,
              ...extraMetadata,
            };

            expect(evaluasiVideo(variasi1).skor).toBe(skorAwal);

            if (!baseJawaban.apa_diminta || baseJawaban.apa_diminta === 'tidak_ada') {
              const variasiTidakAda = { ...baseJawaban, apa_diminta: 'tidak_ada' as const };
              const variasiKosong = { ...baseJawaban, apa_diminta: undefined };
              expect(evaluasiVideo(variasiTidakAda).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiKosong).skor).toBe(skorAwal);
            }

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

            if (!baseJawaban.darurat_desakan) {
              const variasiFalse = { ...baseJawaban, darurat_desakan: false };
              const variasiUndefined = { ...baseJawaban, darurat_desakan: undefined };
              expect(evaluasiVideo(variasiFalse).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }

            if (!baseJawaban.diminta_rahasiakan) {
              const variasiFalse = { ...baseJawaban, diminta_rahasiakan: false };
              const variasiUndefined = { ...baseJawaban, diminta_rahasiakan: undefined };
              expect(evaluasiVideo(variasiFalse).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }

            if (baseJawaban.bisa_telepon_balik !== false) {
              const variasiTrue = { ...baseJawaban, bisa_telepon_balik: true };
              const variasiUndefined = { ...baseJawaban, bisa_telepon_balik: undefined };
              expect(evaluasiVideo(variasiTrue).skor).toBe(skorAwal);
              expect(evaluasiVideo(variasiUndefined).skor).toBe(skorAwal);
            }

            if (baseJawaban.siapa_tampil !== 'tokoh_publik') {
              for (const nonTokoh of ['keluarga', 'atasan', 'lainnya', undefined] as const) {
                const variasiNetral = { ...baseJawaban, siapa_tampil: nonTokoh };
                expect(evaluasiVideo(variasiNetral).skor).toBe(skorAwal);
              }
            }

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

    it('setiap jawaban pemicu berkontribusi tepat sesuai bobot spesifikasi Requirement 23.1 (**Validates: Requirements 23.1**)', () => {
      expect(evaluasiVideo({ apa_diminta: 'otp_pin' }).skor).toBe(4);

      expect(evaluasiVideo({ apa_diminta: 'transfer' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'voucher' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'pulsa' }).skor).toBe(3);

      expect(evaluasiVideo({ apa_diminta: 'investasi' }).skor).toBe(3);

      expect(evaluasiVideo({ bisa_telepon_balik: false }).skor).toBe(3);

      expect(evaluasiVideo({ janji_untung_ajakan: true }).skor).toBe(3);

      expect(evaluasiVideo({ apa_diminta: 'link_apk' }).skor).toBe(2);

      expect(evaluasiVideo({ nomor_akun: 'nomor_baru' }).skor).toBe(2);

      expect(evaluasiVideo({ darurat_desakan: true }).skor).toBe(2);

      expect(evaluasiVideo({ diminta_rahasiakan: true }).skor).toBe(2);

      expect(evaluasiVideo({ nomor_akun: 'akun_tidak_dikenal' }).skor).toBe(1);

      expect(evaluasiVideo({ siapa_tampil: 'tokoh_publik' }).skor).toBe(1);

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
