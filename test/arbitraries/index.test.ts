import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  arbitraryTemuan,
  arbitraryFormatDataHasil,
  arbitraryTingkatLevel,
  arbitraryUrlWithSensitiveParams,
  arbitraryTeksWithSensitif,
  arbitraryTeksWithSensitifDetail,
  arbitraryTeksWithMultipleSensitif,
  arbitraryNomorHp,
  arbitraryNomorRekening,
  arbitraryEmail,
  arbitraryOtpPin,
  arbitraryTeksNonSensitif,
  arbitraryWizardAnswers,
  arbitraryNonTriggeringAnswers,
  arbitraryChatText,
  arbitraryChatTextDetail,
  FRASE_POLA_CHAT,
  KALIMAT_CHAT_NETRAL,
  arbitraryBrandVariant,
  arbitraryUrlWithSignals,
  arbitraryUrlSignalPair,
  BOBOT_SINYAL_LEKSIKAL,
} from './index';
import type { SumberTemuan, TingkatLevel, SituasiDarurat, StatusLayanan } from '../../lib/hasil';
import { isSensitiveParam } from '../../lib/sanitasi-url';

describe('test/arbitraries/index.ts', () => {
  const validSumber: SumberTemuan[] = [
    'aturan',
    'ai',
    'safe_browsing',
    'rdap',
    'virustotal',
    'reality_defender',
  ];

  const validLevels: TingkatLevel[] = ['tinggi', 'sedang', 'tidak_ditemukan'];

  const validSituasi: SituasiDarurat[] = [
    'klik_link',
    'isi_data',
    'kirim_otp',
    'transfer',
    'akun_diambil',
  ];

  const validStatusLayanan: StatusLayanan[] = [
    'ok',
    'gagal',
    'tidak_dipakai',
    'tidak_tersedia',
  ];

  describe('arbitraryTemuan', () => {
    it('menghasilkan objek Temuan dengan tipe dan struktur yang valid', () => {
      const samples = fc.sample(arbitraryTemuan(), 20);
      expect(samples.length).toBe(20);

      for (const temuan of samples) {
        expect(typeof temuan.judul).toBe('string');
        expect(temuan.judul.length).toBeGreaterThanOrEqual(1);
        expect(temuan.judul.length).toBeLessThanOrEqual(100);

        expect(typeof temuan.penjelasan).toBe('string');
        expect(temuan.penjelasan.length).toBeGreaterThanOrEqual(1);
        expect(temuan.penjelasan.length).toBeLessThanOrEqual(500);

        expect(typeof temuan.bukti).toBe('string');
        expect(temuan.bukti.length).toBeGreaterThanOrEqual(1);
        expect(temuan.bukti.length).toBeLessThanOrEqual(200);

        expect(validSumber).toContain(temuan.sumber);
      }
    });
  });

  describe('arbitraryTingkatLevel', () => {
    it('menghasilkan TingkatLevel yang valid', () => {
      const samples = fc.sample(arbitraryTingkatLevel(), 20);
      for (const level of samples) {
        expect(validLevels).toContain(level);
      }
    });
  });

  describe('arbitraryFormatDataHasil', () => {
    it('menghasilkan objek FormatDataHasil yang lengkap dan valid', () => {
      const samples = fc.sample(arbitraryFormatDataHasil(), 20);
      expect(samples.length).toBe(20);

      for (const hasil of samples) {
        expect(['chat', 'link', 'video']).toContain(hasil.halaman);
        expect(validLevels).toContain(hasil.level);

        expect(typeof hasil.ringkasan).toBe('string');
        expect(hasil.ringkasan.length).toBeGreaterThanOrEqual(1);
        expect(hasil.ringkasan.length).toBeLessThanOrEqual(200);

        expect(Array.isArray(hasil.temuan)).toBe(true);
        expect(hasil.temuan.length).toBeLessThanOrEqual(5);
        for (const t of hasil.temuan) {
          expect(typeof t.judul).toBe('string');
          expect(validSumber).toContain(t.sumber);
        }

        expect(Array.isArray(hasil.hal_wajar)).toBe(true);
        expect(hasil.hal_wajar.length).toBeLessThanOrEqual(3);

        expect(Array.isArray(hasil.langkah)).toBe(true);
        expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
        expect(hasil.langkah.length).toBeLessThanOrEqual(5);

        expect(Array.isArray(hasil.situasi_darurat)).toBe(true);
        expect(hasil.situasi_darurat.length).toBeLessThanOrEqual(5);
        for (const s of hasil.situasi_darurat) {
          expect(validSituasi).toContain(s);
        }

        expect(typeof hasil.batasan).toBe('string');
        expect(hasil.batasan.length).toBeGreaterThanOrEqual(1);

        expect(Array.isArray(hasil.pihak_ketiga)).toBe(true);

        expect(typeof hasil.status_layanan).toBe('object');
        expect(hasil.status_layanan).not.toBeNull();
        for (const [key, status] of Object.entries(hasil.status_layanan)) {
          expect(typeof key).toBe('string');
          expect(validStatusLayanan).toContain(status);
        }
      }
    });
  });

  describe('arbitraryUrlWithSensitiveParams', () => {
    it('menghasilkan URL yang memuat setidaknya satu parameter sensitif dan parameter non-sensitif', () => {
      const samples = fc.sample(arbitraryUrlWithSensitiveParams(), 20);
      expect(samples.length).toBe(20);

      for (const url of samples) {
        expect(typeof url).toBe('string');
        expect(url).toContain('?');

        const qIndex = url.indexOf('?');
        const afterQ = url.slice(qIndex + 1);
        const queryPart = afterQ.split('#')[0];
        const searchParams = new URLSearchParams(queryPart);

        let hasSensitive = false;
        let hasNonSensitive = false;

        searchParams.forEach((_, key) => {
          if (isSensitiveParam(key)) {
            hasSensitive = true;
          } else {
            hasNonSensitive = true;
          }
        });

        expect(hasSensitive).toBe(true);
        expect(hasNonSensitive).toBe(true);
      }
    });
  });

  describe('arbitraryTeksWithSensitif and related generators', () => {
    it('arbitraryNomorHp menghasilkan format nomor HP yang valid', () => {
      const samples = fc.sample(arbitraryNomorHp(), 20);
      for (const hp of samples) {
        expect(typeof hp).toBe('string');
        expect(hp.length).toBeGreaterThanOrEqual(9);
        expect(hp.length).toBeLessThanOrEqual(15);
        expect(/^(?:\+?62|0)\d{8,12}$/.test(hp)).toBe(true);
      }
    });

    it('arbitraryNomorRekening menghasilkan deretan 10-16 digit angka', () => {
      const samples = fc.sample(arbitraryNomorRekening(), 20);
      for (const rek of samples) {
        expect(typeof rek).toBe('string');
        expect(rek.length).toBeGreaterThanOrEqual(10);
        expect(rek.length).toBeLessThanOrEqual(16);
        expect(/^\d{10,16}$/.test(rek)).toBe(true);
      }
    });

    it('arbitraryEmail menghasilkan format email yang valid', () => {
      const samples = fc.sample(arbitraryEmail(), 20);
      for (const email of samples) {
        expect(typeof email).toBe('string');
        expect(email).toContain('@');
        expect(/^[\w.-]+@[\w.-]+\.\w+$/.test(email)).toBe(true);
      }
    });

    it('arbitraryOtpPin menghasilkan deretan 4-8 digit angka', () => {
      const samples = fc.sample(arbitraryOtpPin(), 20);
      for (const pin of samples) {
        expect(typeof pin).toBe('string');
        expect(pin.length).toBeGreaterThanOrEqual(4);
        expect(pin.length).toBeLessThanOrEqual(8);
        expect(/^\d{4,8}$/.test(pin)).toBe(true);
      }
    });

    it('arbitraryTeksNonSensitif tidak menghasilkan pola sensitif (@ atau deretan 4+ digit)', () => {
      const samples = fc.sample(arbitraryTeksNonSensitif(), 20);
      for (const teks of samples) {
        expect(typeof teks).toBe('string');
        expect(teks).not.toContain('@');
        expect(/\b\d{4,}\b/.test(teks)).toBe(false);
      }
    });

    it('arbitraryTeksWithSensitifDetail menghasilkan struktur yang konsisten', () => {
      const samples = fc.sample(arbitraryTeksWithSensitifDetail(), 20);
      for (const detail of samples) {
        expect(detail.teks).toContain(detail.sensitive);
        expect(['hp', 'rekening', 'email', 'otp_pin']).toContain(detail.tipe);
        expect(detail.expected).toContain('[disensor]');
        expect(detail.expected.startsWith(detail.prefix)).toBe(true);
        expect(detail.expected.endsWith(detail.suffix)).toBe(true);
      }
    });

    it('arbitraryTeksWithMultipleSensitif menghasilkan teks dengan jumlah sensitif yang sesuai', () => {
      const samples = fc.sample(arbitraryTeksWithMultipleSensitif(), 20);
      for (const multi of samples) {
        expect(multi.count).toBeGreaterThanOrEqual(1);
        expect(multi.sensitives.length).toBe(multi.count);
        for (const sens of multi.sensitives) {
          expect(multi.teks).toContain(sens);
        }
      }
    });

    it('arbitraryTeksWithSensitif menghasilkan string teks non-kosong', () => {
      const samples = fc.sample(arbitraryTeksWithSensitif(), 20);
      for (const teks of samples) {
        expect(typeof teks).toBe('string');
        expect(teks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('arbitraryWizardAnswers and arbitraryNonTriggeringAnswers', () => {
    it('arbitraryWizardAnswers menghasilkan objek JawabanWizardVideo yang valid', () => {
      const samples = fc.sample(arbitraryWizardAnswers(), 50);
      for (const ans of samples) {
        expect(typeof ans).toBe('object');
        expect(ans).not.toBeNull();
        if (ans.situasi !== undefined && ans.situasi !== null) {
          expect(['video_call', 'rekaman', 'tokoh']).toContain(ans.situasi);
        }
        if (ans.apa_diminta !== undefined) {
          expect([
            'otp_pin',
            'transfer',
            'voucher',
            'pulsa',
            'investasi',
            'link_apk',
            'tidak_ada',
          ]).toContain(ans.apa_diminta);
        }
        if (ans.nomor_akun !== undefined) {
          expect([
            'nomor_baru',
            'akun_tidak_dikenal',
            'nomor_lama_tersimpan',
            'nomor_lama',
          ]).toContain(ans.nomor_akun);
        }
        if (ans.siapa_tampil !== undefined) {
          expect(['tokoh_publik', 'keluarga', 'atasan', 'lainnya']).toContain(
            ans.siapa_tampil
          );
        }
        if (ans.darurat_desakan !== undefined) {
          expect(typeof ans.darurat_desakan).toBe('boolean');
        }
        if (ans.diminta_rahasiakan !== undefined) {
          expect(typeof ans.diminta_rahasiakan).toBe('boolean');
        }
        if (ans.bisa_telepon_balik !== undefined) {
          expect(typeof ans.bisa_telepon_balik).toBe('boolean');
        }
        if (ans.janji_untung_ajakan !== undefined) {
          expect(typeof ans.janji_untung_ajakan).toBe('boolean');
        }
        if (ans.checklist !== undefined) {
          expect(Array.isArray(ans.checklist)).toBe(true);
        }
        if (ans.tanda_checklist !== undefined) {
          expect(Array.isArray(ans.tanda_checklist)).toBe(true);
        }
      }
    });

    it('arbitraryNonTriggeringAnswers menghasilkan jawaban yang tidak memicu skor', () => {
      const samples = fc.sample(arbitraryNonTriggeringAnswers(), 50);
      for (const ans of samples) {
        if (ans.apa_diminta !== undefined) {
          expect(ans.apa_diminta).toBe('tidak_ada');
        }
        if (ans.nomor_akun !== undefined) {
          expect(['nomor_lama_tersimpan', 'nomor_lama']).toContain(ans.nomor_akun);
        }
        if (ans.darurat_desakan !== undefined) {
          expect(ans.darurat_desakan).toBe(false);
        }
        if (ans.diminta_rahasiakan !== undefined) {
          expect(ans.diminta_rahasiakan).toBe(false);
        }
        if (ans.bisa_telepon_balik !== undefined) {
          expect(ans.bisa_telepon_balik).toBe(true);
        }
        if (ans.siapa_tampil !== undefined) {
          expect(['keluarga', 'atasan', 'lainnya']).toContain(ans.siapa_tampil);
        }
        if (ans.janji_untung_ajakan !== undefined) {
          expect(ans.janji_untung_ajakan).toBe(false);
        }
      }
    });
  });

  describe('arbitraryChatText and related generators', () => {
    it('arbitraryChatTextDetail menghasilkan detail teks, selectedPatternIds, dan expectedScore yang konsisten', () => {
      const samples = fc.sample(arbitraryChatTextDetail(), 50);
      expect(samples.length).toBe(50);

      const allIds = Object.keys(FRASE_POLA_CHAT);

      for (const sample of samples) {
        expect(typeof sample.teks).toBe('string');
        expect(Array.isArray(sample.selectedPatternIds)).toBe(true);
        expect(typeof sample.expectedScore).toBe('number');
        expect(sample.expectedScore).toBeGreaterThanOrEqual(0);

        for (const pid of sample.selectedPatternIds) {
          expect(allIds).toContain(pid);
        }

        let computed = 0;
        for (const pid of sample.selectedPatternIds) {
          computed += FRASE_POLA_CHAT[pid].bobot;
        }
        expect(sample.expectedScore).toBe(computed);
      }
    });

    it('arbitraryChatText menghasilkan string yang valid', () => {
      const samples = fc.sample(arbitraryChatText(), 50);
      expect(samples.length).toBe(50);
      for (const text of samples) {
        expect(typeof text).toBe('string');
      }
    });

    it('setiap contoh frase di FRASE_POLA_CHAT memiliki teks non-kosong', () => {
      for (const [id, config] of Object.entries(FRASE_POLA_CHAT)) {
        expect(config.contoh.length).toBeGreaterThan(0);
        for (const phrase of config.contoh) {
          expect(typeof phrase).toBe('string');
          expect(phrase.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('arbitraryBrandVariant', () => {
    it('menghasilkan objek dengan merek resmi terdaftar dan domain non-kosong', () => {
      const samples = fc.sample(arbitraryBrandVariant(), 50);
      expect(samples.length).toBe(50);

      for (const sample of samples) {
        expect(typeof sample.merek).toBe('string');
        expect(sample.merek.length).toBeGreaterThan(0);
        expect(typeof sample.domain).toBe('string');
        expect(sample.domain.length).toBeGreaterThan(0);
      }
    });
  });

  describe('arbitraryUrlWithSignals and arbitraryUrlSignalPair', () => {
    it('arbitraryUrlWithSignals menghasilkan URL dengan sinyal dan expectedScore yang konsisten', () => {
      const samples = fc.sample(arbitraryUrlWithSignals(), 50);
      expect(samples.length).toBe(50);

      for (const sample of samples) {
        expect(typeof sample.url).toBe('string');
        expect(sample.url.length).toBeGreaterThan(0);
        expect(Array.isArray(sample.signals)).toBe(true);
        expect(typeof sample.expectedScore).toBe('number');
        expect(sample.expectedScore).toBeGreaterThanOrEqual(0);

        let computed = 0;
        for (const s of sample.signals) {
          computed += BOBOT_SINYAL_LEKSIKAL[s];
        }
        expect(sample.expectedScore).toBe(computed);
      }
    });

    it('arbitraryUrlSignalPair menghasilkan pasangan before & after dengan kenaikan skor tepat', () => {
      const samples = fc.sample(arbitraryUrlSignalPair(), 50);
      expect(samples.length).toBe(50);

      for (const pair of samples) {
        expect(pair.after.expectedScore).toBe(
          pair.before.expectedScore + pair.addedWeight
        );
        expect(pair.after.expectedScore).toBeGreaterThanOrEqual(
          pair.before.expectedScore
        );
        expect(pair.after.signals).toContain(pair.addedSignal);
        expect(pair.before.signals).not.toContain(pair.addedSignal);
      }
    });
  });
});


