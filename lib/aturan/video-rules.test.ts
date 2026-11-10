import { describe, it, expect } from 'vitest';
import {
  BOBOT_VIDEO,
  evaluasiVideo,
  evaluasiAturanVideo,
  tentukanLangkahVideo,
  tentukanSituasiDaruratVideo,
  generateHasilVideoLokal,
  type JawabanWizardVideo,
} from './video-rules';
import videoContohData from '../../data/contoh/video-contoh.json';

describe('lib/aturan/video-rules.ts', () => {
  describe('Bobot per Jawaban Wizard (Requirement 23.1)', () => {
    it('memiliki bobot nilai sesuai spesifikasi Requirement 23.1', () => {
      expect(BOBOT_VIDEO.apa_diminta.otp_pin).toBe(4);
      expect(BOBOT_VIDEO.apa_diminta.transfer).toBe(3);
      expect(BOBOT_VIDEO.apa_diminta.voucher).toBe(3);
      expect(BOBOT_VIDEO.apa_diminta.pulsa).toBe(3);
      expect(BOBOT_VIDEO.apa_diminta.investasi).toBe(3);
      expect(BOBOT_VIDEO.apa_diminta.link_apk).toBe(2);
      expect(BOBOT_VIDEO.apa_diminta.tidak_ada).toBe(0);

      expect(BOBOT_VIDEO.nomor_akun.nomor_baru).toBe(2);
      expect(BOBOT_VIDEO.nomor_akun.akun_tidak_dikenal).toBe(1);
      expect(BOBOT_VIDEO.nomor_akun.nomor_lama_tersimpan).toBe(0);

      expect(BOBOT_VIDEO.darurat_desakan).toBe(2);
      expect(BOBOT_VIDEO.diminta_rahasiakan).toBe(2);
      expect(BOBOT_VIDEO.menolak_telepon_balik).toBe(3);
      expect(BOBOT_VIDEO.siapa_tampil_tokoh_publik).toBe(1);
      expect(BOBOT_VIDEO.janji_untung_ajakan).toBe(3);
      expect(BOBOT_VIDEO.per_checklist).toBe(1);
    });

    it('menghitung bobot apa_diminta secara tepat', () => {
      expect(evaluasiVideo({ apa_diminta: 'otp_pin' }).skor).toBe(4);
      expect(evaluasiVideo({ apa_diminta: 'transfer' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'voucher' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'pulsa' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'investasi' }).skor).toBe(3);
      expect(evaluasiVideo({ apa_diminta: 'link_apk' }).skor).toBe(2);
      expect(evaluasiVideo({ apa_diminta: 'tidak_ada' }).skor).toBe(0);
    });

    it('menghitung bobot nomor_akun secara tepat', () => {
      expect(evaluasiVideo({ nomor_akun: 'nomor_baru' }).skor).toBe(2);
      expect(evaluasiVideo({ nomor_akun: 'akun_tidak_dikenal' }).skor).toBe(1);
      expect(evaluasiVideo({ nomor_akun: 'nomor_lama_tersimpan' }).skor).toBe(0);
      expect(evaluasiVideo({ nomor_akun: 'nomor_lama' }).skor).toBe(0);
    });

    it('menghitung bobot darurat_desakan secara tepat (+2 jika true)', () => {
      expect(evaluasiVideo({ darurat_desakan: true }).skor).toBe(2);
      expect(evaluasiVideo({ darurat_desakan: false }).skor).toBe(0);
      expect(evaluasiVideo({}).skor).toBe(0);
    });

    it('menghitung bobot diminta_rahasiakan secara tepat (+2 jika true)', () => {
      expect(evaluasiVideo({ diminta_rahasiakan: true }).skor).toBe(2);
      expect(evaluasiVideo({ diminta_rahasiakan: false }).skor).toBe(0);
    });

    it('menghitung bobot bisa_telepon_balik secara tepat (+3 jika false/menolak)', () => {
      expect(evaluasiVideo({ bisa_telepon_balik: false }).skor).toBe(3);
      expect(evaluasiVideo({ bisa_telepon_balik: true }).skor).toBe(0);
    });

    it('menghitung bobot siapa_tampil secara tepat (+1 jika tokoh_publik)', () => {
      expect(evaluasiVideo({ siapa_tampil: 'tokoh_publik' }).skor).toBe(1);
      expect(evaluasiVideo({ siapa_tampil: 'keluarga' }).skor).toBe(0);
      expect(evaluasiVideo({ siapa_tampil: 'atasan' }).skor).toBe(0);
      expect(evaluasiVideo({ siapa_tampil: 'lainnya' }).skor).toBe(0);
    });

    it('menghitung bobot janji_untung_ajakan secara tepat (+3 jika true)', () => {
      expect(evaluasiVideo({ janji_untung_ajakan: true }).skor).toBe(3);
      expect(evaluasiVideo({ janji_untung_ajakan: false }).skor).toBe(0);
    });

    it('menghitung bobot tanda_checklist dan checklist (+1 per tanda)', () => {
      expect(
        evaluasiVideo({
          tanda_checklist: ['bibir tidak sinkron', 'kedipan aneh'],
        }).skor
      ).toBe(2);

      expect(
        evaluasiVideo({
          checklist: ['wajah rusak', 'suara datar', 'tepi wajah blur'],
        }).skor
      ).toBe(3);
    });

    it('menjumlahkan bobot beberapa jawaban secara aditif', () => {
      const jawaban: JawabanWizardVideo = {
        apa_diminta: 'transfer',
        nomor_akun: 'nomor_baru',
        bisa_telepon_balik: false,
        tanda_checklist: ['bibir tidak sinkron'],
      };
      expect(evaluasiVideo(jawaban).skor).toBe(9);
    });
  });

  describe('Kombinasi Khusus Langsung Tinggi (Requirement 23.2)', () => {
    it('menetapkan level "tinggi" pada kombinasi: (minta uang/transfer/OTP) AND (darurat/desakan)', () => {
      const res1 = evaluasiVideo({
        apa_diminta: 'transfer',
        darurat_desakan: true,
      });
      expect(res1.skor).toBe(5);
      expect(res1.level).toBe('tinggi');

      const res2 = evaluasiVideo({
        apa_diminta: 'voucher',
        darurat_desakan: true,
      });
      expect(res2.skor).toBe(5);
      expect(res2.level).toBe('tinggi');

      const res3 = evaluasiVideo({
        apa_diminta: 'pulsa',
        darurat_desakan: true,
      });
      expect(res3.skor).toBe(5);
      expect(res3.level).toBe('tinggi');
    });

    it('menetapkan level "tinggi" pada kombinasi: (minta uang/transfer/OTP) AND (diminta_rahasiakan)', () => {
      const res = evaluasiVideo({
        apa_diminta: 'transfer',
        diminta_rahasiakan: true,
      });
      expect(res.skor).toBe(5);
      expect(res.level).toBe('tinggi');
    });

    it('menetapkan level "tinggi" pada kombinasi: (tokoh_publik) AND (janji_untung_ajakan)', () => {
      const res = evaluasiVideo({
        siapa_tampil: 'tokoh_publik',
        janji_untung_ajakan: true,
      });
      expect(res.skor).toBe(4);
      expect(res.level).toBe('tinggi');
    });

    it('menetapkan level "tinggi" pada kombinasi: (tokoh_publik) AND (apa_diminta === "investasi")', () => {
      const res = evaluasiVideo({
        siapa_tampil: 'tokoh_publik',
        apa_diminta: 'investasi',
      });
      expect(res.skor).toBe(4);
      expect(res.level).toBe('tinggi');
    });

    it('menetapkan level "tinggi" pada kombinasi: (situasi === "tokoh") AND (janji_untung_ajakan)', () => {
      const res = evaluasiVideo({
        situasi: 'tokoh',
        janji_untung_ajakan: true,
      });
      expect(res.skor).toBe(3);
      expect(res.level).toBe('tinggi');
    });

    it('menetapkan level "tinggi" pada kombinasi: (situasi === "tokoh") AND (apa_diminta === "investasi")', () => {
      const res = evaluasiVideo({
        situasi: 'tokoh',
        apa_diminta: 'investasi',
      });
      expect(res.skor).toBe(3);
      expect(res.level).toBe('tinggi');
    });
  });

  describe('Ambang Batas Skor (Requirement 23.2)', () => {
    it('mengembalikan "tidak_ditemukan" jika skor < 3 dan bukan kombinasi khusus', () => {
      expect(evaluasiVideo({}).level).toBe('tidak_ditemukan');
      expect(evaluasiVideo({ nomor_akun: 'akun_tidak_dikenal' }).level).toBe(
        'tidak_ditemukan'
      );
      expect(evaluasiVideo({ apa_diminta: 'link_apk' }).level).toBe(
        'tidak_ditemukan'
      );
    });

    it('mengembalikan "sedang" jika skor 3 sampai 5 dan bukan kombinasi khusus', () => {
      expect(
        evaluasiVideo({
          apa_diminta: 'link_apk',
          nomor_akun: 'akun_tidak_dikenal',
        }).level
      ).toBe('sedang');

      expect(
        evaluasiVideo({
          bisa_telepon_balik: false,
          nomor_akun: 'nomor_baru',
        }).level
      ).toBe('sedang');
    });

    it('mengembalikan "tinggi" jika skor >= 6', () => {
      expect(
        evaluasiVideo({
          apa_diminta: 'otp_pin',
          nomor_akun: 'nomor_baru',
        }).level
      ).toBe('tinggi');

      expect(
        evaluasiVideo({
          bisa_telepon_balik: false,
          checklist: ['a', 'b', 'c', 'd'],
        }).level
      ).toBe('tinggi');
    });
  });

  describe('Temuan dan Nilai Tambahan HasilAturan', () => {
    it('menyediakan temuan edukatif untuk setiap kondisi yang terpicu', () => {
      const res = evaluasiVideo({
        apa_diminta: 'otp_pin',
        nomor_akun: 'nomor_baru',
        darurat_desakan: true,
        diminta_rahasiakan: true,
        bisa_telepon_balik: false,
        siapa_tampil: 'tokoh_publik',
        janji_untung_ajakan: true,
        tanda_checklist: ['bibir tidak sinkron'],
      });

      expect(res.temuan.length).toBe(8);
      res.temuan.forEach((t) => {
        expect(t.judul).toBeTypeOf('string');
        expect(t.penjelasan).toBeTypeOf('string');
        expect(t.bukti).toBeTypeOf('string');
        expect(t.sumber).toBe('aturan');
      });
    });

    it('selalu menetapkan linkDitemukan kosong dan modusVideoDitemukan bernilai true', () => {
      const res = evaluasiVideo({});
      expect(res.linkDitemukan).toEqual([]);
      expect(res.modusVideoDitemukan).toBe(true);
    });

    it('menyediakan alias evaluasiAturanVideo yang identik dengan evaluasiVideo', () => {
      const j: JawabanWizardVideo = { apa_diminta: 'transfer' };
      expect(evaluasiAturanVideo(j)).toEqual(evaluasiVideo(j));
    });
  });

  describe('Langkah Verifikasi per Situasi (Requirement 24.1-24.4)', () => {
    it('menyertakan langkah keluarga/teman saat situasi melibatkan keluarga atau teman (Requirement 24.1)', () => {
      const langkah = tentukanLangkahVideo({
        siapa_tampil: 'keluarga',
        apa_diminta: 'transfer',
        nomor_akun: 'nomor_baru',
      });

      expect(langkah.length).toBeGreaterThanOrEqual(2);
      expect(
        langkah.some((l) => l.toLowerCase().includes('nomor lama'))
      ).toBe(true);
      expect(
        langkah.some((l) => l.toLowerCase().includes('kode rahasia'))
      ).toBe(true);
      expect(
        langkah.some((l) => l.toLowerCase().includes('anggota keluarga'))
      ).toBe(true);
    });

    it('menyertakan langkah atasan/instansi saat situasi melibatkan atasan (Requirement 24.2)', () => {
      const langkah = tentukanLangkahVideo({
        siapa_tampil: 'atasan',
        apa_diminta: 'voucher',
      });

      expect(langkah.length).toBeGreaterThanOrEqual(2);
      expect(
        langkah.some((l) => l.toLowerCase().includes('jalur resmi kantor'))
      ).toBe(true);
      expect(
        langkah.some((l) => l.toLowerCase().includes('temui langsung'))
      ).toBe(true);
    });

    it('menyertakan langkah tokoh publik / investasi saat situasi melibatkan tokoh publik (Requirement 24.3)', () => {
      const langkah = tentukanLangkahVideo({
        siapa_tampil: 'tokoh_publik',
        apa_diminta: 'investasi',
        janji_untung_ajakan: true,
      });

      expect(langkah.length).toBeGreaterThanOrEqual(2);
      expect(
        langkah.some((l) => l.toLowerCase().includes('ojk 157'))
      ).toBe(true);
      expect(
        langkah.some((l) => l.toLowerCase().includes('akun media sosial'))
      ).toBe(true);
    });

    it('menyertakan instruksi uji fisik saat pengguna masih tersambung (Requirement 24.4)', () => {
      const langkah = tentukanLangkahVideo({
        masih_tersambung: true,
      });

      expect(langkah.length).toBeGreaterThanOrEqual(2);
      expect(
        langkah.some((l) => l.toLowerCase().includes('menoleh'))
      ).toBe(true);
    });

    it('selalu menghasilkan minimal 2 langkah tindakan untuk input kosong', () => {
      const langkah = tentukanLangkahVideo({});
      expect(langkah.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Deteksi Situasi Darurat', () => {
    it('mendeteksi transfer untuk permintaan transfer, voucher, pulsa, atau investasi', () => {
      expect(tentukanSituasiDaruratVideo({ apa_diminta: 'transfer' })).toContain(
        'transfer'
      );
      expect(tentukanSituasiDaruratVideo({ apa_diminta: 'voucher' })).toContain(
        'transfer'
      );
      expect(tentukanSituasiDaruratVideo({ apa_diminta: 'investasi' })).toContain(
        'transfer'
      );
    });

    it('mendeteksi kirim_otp untuk permintaan otp_pin', () => {
      expect(tentukanSituasiDaruratVideo({ apa_diminta: 'otp_pin' })).toContain(
        'kirim_otp'
      );
    });

    it('mendeteksi klik_link untuk permintaan link_apk atau janji_untung_ajakan', () => {
      expect(tentukanSituasiDaruratVideo({ apa_diminta: 'link_apk' })).toContain(
        'klik_link'
      );
      expect(
        tentukanSituasiDaruratVideo({ janji_untung_ajakan: true })
      ).toContain('klik_link');
    });
  });

  describe('generateHasilVideoLokal (Requirement 23.3)', () => {
    it('menghasilkan FormatDataHasil lengkap langsung di browser tanpa API eksternal', () => {
      const hasil = generateHasilVideoLokal({
        situasi: 'video_call',
        apa_diminta: 'transfer',
        nomor_akun: 'nomor_baru',
        darurat_desakan: true,
        bisa_telepon_balik: false,
      });

      expect(hasil.halaman).toBe('video');
      expect(hasil.level).toBe('tinggi');
      expect(hasil.ringkasan).toBeTypeOf('string');
      expect(hasil.ringkasan.length).toBeGreaterThan(0);
      expect(hasil.temuan.length).toBeGreaterThan(0);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasil.situasi_darurat).toContain('transfer');
      expect(hasil.batasan).toBeTypeOf('string');
      expect(hasil.pihak_ketiga).toEqual([]);
      expect(hasil.status_layanan.ai).toBe('tidak_dipakai');
    });

    it('menyesuaikan ringkasan dan hal_wajar sesuai situasi yang dipilih', () => {
      const hasilCall = generateHasilVideoLokal({
        situasi: 'video_call',
        apa_diminta: 'transfer',
      });
      expect(hasilCall.hal_wajar.length).toBeGreaterThan(0);

      const hasilRekaman = generateHasilVideoLokal({
        situasi: 'rekaman',
        apa_diminta: 'voucher',
      });
      expect(hasilRekaman.hal_wajar.length).toBeGreaterThan(0);

      const hasilTokoh = generateHasilVideoLokal({
        situasi: 'tokoh',
        siapa_tampil: 'tokoh_publik',
        apa_diminta: 'investasi',
      });
      expect(hasilTokoh.hal_wajar.length).toBeGreaterThan(0);
    });
  });

  describe('Kesesuaian dengan Skenario Contoh data/contoh/video-contoh.json', () => {
    it('mengevaluasi skenario video-call-kakak dengan tingkat kewaspadaan tinggi', () => {
      const skenario = videoContohData.skenario.find(
        (s) => s.id === 'video-call-kakak'
      );
      expect(skenario).toBeDefined();
      if (!skenario) return;

      const hasil = generateHasilVideoLokal(skenario.jawaban as JawabanWizardVideo);
      expect(hasil.level).toBe('tinggi');
      expect(hasil.situasi_darurat).toContain('transfer');
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('mengevaluasi skenario voice-note-atasan dengan tingkat kewaspadaan tinggi', () => {
      const skenario = videoContohData.skenario.find(
        (s) => s.id === 'voice-note-atasan'
      );
      expect(skenario).toBeDefined();
      if (!skenario) return;

      const hasil = generateHasilVideoLokal(skenario.jawaban as JawabanWizardVideo);
      expect(hasil.level).toBe('tinggi');
      expect(hasil.situasi_darurat).toContain('transfer');
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('mengevaluasi skenario video-tokoh-investasi dengan tingkat kewaspadaan tinggi', () => {
      const skenario = videoContohData.skenario.find(
        (s) => s.id === 'video-tokoh-investasi'
      );
      expect(skenario).toBeDefined();
      if (!skenario) return;

      const hasil = generateHasilVideoLokal(skenario.jawaban as JawabanWizardVideo);
      expect(hasil.level).toBe('tinggi');
      expect(hasil.situasi_darurat).toContain('transfer');
      expect(hasil.situasi_darurat).toContain('klik_link');
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
    });
  });
});
