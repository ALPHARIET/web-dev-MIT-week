/**
 * lib/aturan/index.test.ts
 *
 * Test suite untuk memastikan kelengkapan ekspor lib/aturan/index.ts
 * dan memverifikasi bahwa semua tipe, konstanta, dan fungsi dari
 * scoring, chat-rules, link-rules, dan video-rules dapat di-import
 * dan dieksekusi dengan bersih (isomorphic).
 *
 * References: Requirement 33.1, and design.md
 */

import { describe, it, expect } from 'vitest';
import * as AturanModul from './index';

import {
  // 1. Scoring & Utilitas Umum
  AMBANG_TINGGI,
  AMBANG_SEDANG,
  hitungLevel,
  gabungLevel,
  ekstrakUrl,
  deteksiModusVideo,
  evaluasiAturan,
  type TingkatLevel,
  type Temuan,
  type Aturan,
  type HasilAturan,
  type EvaluasiOpsi,

  // 2. Chat Rules
  ATURAN_CHAT,
  evaluasiChat,
  evaluasiAturanChat,
  generateHasilChatLokal,

  // 3. Link Rules
  KATA_PEMICU_LINK,
  PEMENDEK_LINK_DOMAINS,
  TLD_BERISIKO_SET,
  isIpAddress,
  normalizeLeetspeak,
  deteksiMerek,
  evaluasiLeksikalUrl,
  generateHasilLinkLokal,
  type EvaluasiLinkOptions,
  type HasilDeteksiMerek,

  // 4. Video & Suara Rules
  BOBOT_VIDEO,
  evaluasiVideo,
  evaluasiAturanVideo,
  tentukanLangkahVideo,
  tentukanSituasiDaruratVideo,
  generateHasilVideoLokal,
  type SituasiVideo,
  type ApaDimintaVideo,
  type NomorAkunVideo,
  type SiapaTampilVideo,
  type JawabanWizardVideo,
} from './index';

describe('lib/aturan/index.ts — Ekspor Lengkap dan Bersih (Requirement 33.1)', () => {
  describe('Kelengkapan Ekspor Modul Scoring', () => {
    it('mengekspor konstanta ambang batas scoring dengan benar', () => {
      expect(AMBANG_TINGGI).toBe(6);
      expect(AMBANG_SEDANG).toBe(3);
      expect(AturanModul.AMBANG_TINGGI).toBe(6);
      expect(AturanModul.AMBANG_SEDANG).toBe(3);
    });

    it('mengekspor fungsi hitungLevel dan gabungLevel', () => {
      expect(typeof hitungLevel).toBe('function');
      expect(typeof gabungLevel).toBe('function');
      expect(typeof AturanModul.hitungLevel).toBe('function');
      expect(typeof AturanModul.gabungLevel).toBe('function');

      expect(hitungLevel(6)).toBe('tinggi');
      expect(hitungLevel(4)).toBe('sedang');
      expect(hitungLevel(1)).toBe('tidak_ditemukan');
      expect(gabungLevel('sedang', 'tinggi')).toBe('tinggi');
    });

    it('mengekspor fungsi ekstrakUrl dan deteksiModusVideo', () => {
      expect(typeof ekstrakUrl).toBe('function');
      expect(typeof deteksiModusVideo).toBe('function');
      expect(typeof AturanModul.ekstrakUrl).toBe('function');
      expect(typeof AturanModul.deteksiModusVideo).toBe('function');

      const links = ekstrakUrl('Silakan cek di https://contoh-link.com/promo sekarang');
      expect(links).toContain('https://contoh-link.com/promo');

      expect(deteksiModusVideo('Tadi kita sempat video call ya kak')).toBe(true);
      expect(deteksiModusVideo('Pesan teks biasa saja')).toBe(false);
    });

    it('mengekspor fungsi evaluasiAturan umum', () => {
      expect(typeof evaluasiAturan).toBe('function');
      expect(typeof AturanModul.evaluasiAturan).toBe('function');

      const dummyAturan: Aturan[] = [
        {
          id: 'test_rule',
          pola: /rahasia/i,
          bobot: 3,
          langsung_tinggi: false,
          judul: 'Uji Rahasia',
          penjelasan: 'Penjelasan uji',
          buktiExtractor: (_input, match) => (match ? match[0] : ''),
        },
      ];

      const hasil = evaluasiAturan('Ini pesan rahasia', dummyAturan);
      expect(hasil.skor).toBe(3);
      expect(hasil.level).toBe('sedang');
      expect(hasil.temuan).toHaveLength(1);
    });
  });

  describe('Kelengkapan Ekspor Modul Chat Rules', () => {
    it('mengekspor array ATURAN_CHAT dengan 11 pola aturan', () => {
      expect(Array.isArray(ATURAN_CHAT)).toBe(true);
      expect(ATURAN_CHAT).toHaveLength(11);
      expect(Array.isArray(AturanModul.ATURAN_CHAT)).toBe(true);
      expect(AturanModul.ATURAN_CHAT).toHaveLength(11);
    });

    it('mengekspor fungsi evaluasiChat dan alias evaluasiAturanChat', () => {
      expect(typeof evaluasiChat).toBe('function');
      expect(typeof evaluasiAturanChat).toBe('function');
      expect(evaluasiChat).toBe(evaluasiAturanChat);

      const hasil = evaluasiChat('Bagi kode OTP dong kak segera');
      expect(hasil.level).toBe('tinggi');
      expect(hasil.skor).toBeGreaterThanOrEqual(0);
      expect(hasil.temuan.length).toBeGreaterThan(0);
    });

    it('mengekspor fungsi generateHasilChatLokal', () => {
      expect(typeof generateHasilChatLokal).toBe('function');
      expect(typeof AturanModul.generateHasilChatLokal).toBe('function');

      const hasilFormat = generateHasilChatLokal('Minta transfer dana ke rekening ini');
      expect(hasilFormat.halaman).toBe('chat');
      expect(hasilFormat.level).toBe('sedang');
      expect(hasilFormat.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasilFormat.status_layanan.ai).toBe('tidak_dipakai');
    });
  });

  describe('Kelengkapan Ekspor Modul Link Rules', () => {
    it('mengekspor konstanta KATA_PEMICU_LINK, PEMENDEK_LINK_DOMAINS, dan TLD_BERISIKO_SET', () => {
      expect(Array.isArray(KATA_PEMICU_LINK)).toBe(true);
      expect(KATA_PEMICU_LINK.length).toBeGreaterThan(0);
      expect(PEMENDEK_LINK_DOMAINS instanceof Set).toBe(true);
      expect(PEMENDEK_LINK_DOMAINS.has('bit.ly')).toBe(true);
      expect(TLD_BERISIKO_SET instanceof Set).toBe(true);
      expect(TLD_BERISIKO_SET.has('xyz')).toBe(true);
    });

    it('mengekspor fungsi utilitas link: isIpAddress, normalizeLeetspeak, deteksiMerek', () => {
      expect(typeof isIpAddress).toBe('function');
      expect(typeof normalizeLeetspeak).toBe('function');
      expect(typeof deteksiMerek).toBe('function');

      expect(isIpAddress('192.168.1.1')).toBe(true);
      expect(isIpAddress('contoh.com')).toBe(false);

      expect(normalizeLeetspeak('sh0p33')).toBe('shopee');

      const brandMatch = deteksiMerek('klik-bca-login.com');
      expect(brandMatch.cocok).toBe(true);
      expect(brandMatch.merek).toBe('BCA');
    });

    it('mengekspor fungsi evaluasiLeksikalUrl dan generateHasilLinkLokal', () => {
      expect(typeof evaluasiLeksikalUrl).toBe('function');
      expect(typeof generateHasilLinkLokal).toBe('function');

      const hasilEval = evaluasiLeksikalUrl('https://sh0pee-promo.xyz/hadiah');
      expect(hasilEval.skor).toBeGreaterThan(0);
      expect(hasilEval.temuan.length).toBeGreaterThan(0);

      const hasilFormat = generateHasilLinkLokal('https://sh0pee-promo.xyz/hadiah');
      expect(hasilFormat.halaman).toBe('link');
      expect(hasilFormat.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasilFormat.situasi_darurat).toContain('klik_link');
    });
  });

  describe('Kelengkapan Ekspor Modul Video & Suara Rules', () => {
    it('mengekspor konstanta BOBOT_VIDEO dengan kategori yang benar', () => {
      expect(typeof BOBOT_VIDEO).toBe('object');
      expect(BOBOT_VIDEO.apa_diminta.otp_pin).toBe(4);
      expect(BOBOT_VIDEO.apa_diminta.transfer).toBe(3);
      expect(BOBOT_VIDEO.darurat_desakan).toBe(2);
      expect(BOBOT_VIDEO.diminta_rahasiakan).toBe(2);
      expect(BOBOT_VIDEO.menolak_telepon_balik).toBe(3);
    });

    it('mengekspor fungsi evaluasiVideo dan alias evaluasiAturanVideo', () => {
      expect(typeof evaluasiVideo).toBe('function');
      expect(typeof evaluasiAturanVideo).toBe('function');
      expect(evaluasiVideo).toBe(evaluasiAturanVideo);

      const hasil = evaluasiVideo({
        situasi: 'video_call',
        apa_diminta: 'otp_pin',
        darurat_desakan: true,
      });
      expect(hasil.level).toBe('tinggi');
      expect(hasil.modusVideoDitemukan).toBe(true);
    });

    it('mengekspor fungsi tentukanLangkahVideo dan tentukanSituasiDaruratVideo', () => {
      expect(typeof tentukanLangkahVideo).toBe('function');
      expect(typeof tentukanSituasiDaruratVideo).toBe('function');

      const langkah = tentukanLangkahVideo({
        situasi: 'video_call',
        apa_diminta: 'transfer',
        siapa_tampil: 'keluarga',
      });
      expect(langkah.length).toBeGreaterThanOrEqual(2);

      const darurat = tentukanSituasiDaruratVideo({
        apa_diminta: 'transfer',
      });
      expect(darurat).toContain('transfer');
    });

    it('mengekspor fungsi generateHasilVideoLokal', () => {
      expect(typeof generateHasilVideoLokal).toBe('function');

      const hasilFormat = generateHasilVideoLokal({
        situasi: 'tokoh',
        siapa_tampil: 'tokoh_publik',
        janji_untung_ajakan: true,
      });
      expect(hasilFormat.halaman).toBe('video');
      expect(hasilFormat.level).toBe('tinggi');
      expect(hasilFormat.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasilFormat.status_layanan.ai).toBe('tidak_dipakai');
    });
  });

  describe('Verifikasi Tipe TypeScript (Static Compilation)', () => {
    it('dapat menginstansiasi dan menugaskan tipe-tipe yang diekspor tanpa error', () => {
      const level: TingkatLevel = 'tinggi';
      const temuan: Temuan = {
        judul: 'Uji Judul',
        penjelasan: 'Uji Penjelasan',
        bukti: 'Uji Bukti',
        sumber: 'aturan',
      };
      const aturan: Aturan = {
        id: 'uji',
        pola: /test/,
        bobot: 1,
        langsung_tinggi: false,
        judul: 'Uji',
        penjelasan: 'Uji',
        buktiExtractor: () => 'bukti',
      };
      const hasilAturan: HasilAturan = {
        skor: 6,
        level,
        temuan: [temuan],
        linkDitemukan: ['https://test.com'],
        modusVideoDitemukan: false,
      };
      const opsi: EvaluasiOpsi = {
        ekstrakLink: true,
        deteksiModusVideo: true,
      };
      const linkOpsi: EvaluasiLinkOptions = {
        rdapAgeDays: 10,
        isSafeBrowsingThreat: false,
      };
      const deteksiHasil: HasilDeteksiMerek = {
        cocok: true,
        merek: 'BCA',
        variasiCocok: 'bca',
        kategori: 'Perbankan',
        skor: 3,
      };
      const situasi: SituasiVideo = 'video_call';
      const apaDiminta: ApaDimintaVideo = 'otp_pin';
      const nomorAkun: NomorAkunVideo = 'nomor_baru';
      const siapaTampil: SiapaTampilVideo = 'keluarga';
      const jawaban: JawabanWizardVideo = {
        situasi,
        apa_diminta: apaDiminta,
        nomor_akun: nomorAkun,
        siapa_tampil: siapaTampil,
        darurat_desakan: true,
      };

      expect(level).toBe('tinggi');
      expect(temuan.sumber).toBe('aturan');
      expect(aturan.id).toBe('uji');
      expect(hasilAturan.skor).toBe(6);
      expect(opsi.ekstrakLink).toBe(true);
      expect(linkOpsi.rdapAgeDays).toBe(10);
      expect(deteksiHasil.merek).toBe('BCA');
      expect(jawaban.situasi).toBe('video_call');
    });
  });

  describe('Isomorphic & Clean Environment Integrity', () => {
    it('tidak memiliki efek samping global dan dapat dijalankan tanpa window/document', () => {
      expect(typeof window).toBe('undefined');
      expect(typeof document).toBe('undefined');

      // Evaluasi chat, link, dan video berfungsi penuh dalam environment murni ini
      const chatRes = evaluasiChat('Halo');
      const linkRes = evaluasiLeksikalUrl('https://google.com');
      const videoRes = evaluasiVideo({ situasi: 'video_call' });

      expect(chatRes).toBeDefined();
      expect(linkRes).toBeDefined();
      expect(videoRes).toBeDefined();
    });
  });
});
