import { describe, it, expect } from 'vitest';
import {
  ATURAN_CHAT,
  evaluasiChat,
  evaluasiAturanChat,
  generateHasilChatLokal,
} from './chat-rules';

describe('lib/aturan/chat-rules.ts', () => {
  describe('Daftar 11 Pola Deteksi Chat (Requirement 13.2)', () => {
    it('memiliki tepat 11 aturan deteksi dengan ID yang sesuai spesifikasi', () => {
      expect(ATURAN_CHAT).toHaveLength(11);

      const expectedIds = [
        'minta_otp',
        'minta_transfer',
        'biaya_dimuka',
        'kirim_apk',
        'desakan_waktu',
        'keluarga_ganti_nomor',
        'pihak_resmi',
        'gaji_besar',
        'hadiah_undian',
        'pindah_aplikasi',
        'ada_link',
      ];

      const actualIds = ATURAN_CHAT.map((a) => a.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it('setiap aturan memiliki judul, penjelasan fallback, dan buktiExtractor', () => {
      for (const aturan of ATURAN_CHAT) {
        expect(aturan.judul).toBeTruthy();
        expect(typeof aturan.judul).toBe('string');
        expect(aturan.penjelasan).toBeTruthy();
        expect(typeof aturan.penjelasan).toBe('string');
        expect(typeof aturan.buktiExtractor).toBe('function');
        expect(typeof aturan.bobot).toBe('number');
        expect(aturan.bobot).toBeGreaterThanOrEqual(0);
      }
    });

    it('memiliki bobot dan flag langsung_tinggi yang tepat sesuai spesifikasi', () => {
      const aturanMap = new Map(ATURAN_CHAT.map((a) => [a.id, a]));

      expect(aturanMap.get('minta_otp')?.langsung_tinggi).toBe(true);

      expect(aturanMap.get('minta_transfer')?.bobot).toBe(3);
      expect(aturanMap.get('minta_transfer')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('biaya_dimuka')?.bobot).toBe(3);
      expect(aturanMap.get('biaya_dimuka')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('kirim_apk')?.bobot).toBe(3);
      expect(aturanMap.get('kirim_apk')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('desakan_waktu')?.bobot).toBe(2);
      expect(aturanMap.get('desakan_waktu')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('keluarga_ganti_nomor')?.bobot).toBe(2);
      expect(aturanMap.get('keluarga_ganti_nomor')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('pihak_resmi')?.bobot).toBe(2);
      expect(aturanMap.get('pihak_resmi')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('gaji_besar')?.bobot).toBe(2);
      expect(aturanMap.get('gaji_besar')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('hadiah_undian')?.bobot).toBe(2);
      expect(aturanMap.get('hadiah_undian')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('pindah_aplikasi')?.bobot).toBe(1);
      expect(aturanMap.get('pindah_aplikasi')?.langsung_tinggi).toBe(false);

      expect(aturanMap.get('ada_link')?.bobot).toBe(1);
      expect(aturanMap.get('ada_link')?.langsung_tinggi).toBe(false);
    });
  });

  describe('Pengujian Masing-Masing Pola Deteksi', () => {
    describe('1. minta_otp (Permintaan OTP/PIN/password - langsung waspada tinggi)', () => {
      it('mendeteksi permintaan OTP dan langsung menetapkan level "tinggi" (Requirements 13.2, 13.3)', () => {
        const hasil = evaluasiChat('Mohon sebutkan kode OTP 6 digit yang baru saja masuk ke SMS Anda.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan kode OTP, PIN, atau kata sandi')).toBe(true);
        expect(hasil.level).toBe('tinggi');
      });

      it('mendeteksi permintaan PIN ATM', () => {
        const hasil = evaluasiChat('Ketikkan PIN ATM kamu untuk proses verifikasi data.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan kode OTP, PIN, atau kata sandi')).toBe(true);
        expect(hasil.level).toBe('tinggi');
      });

      it('mendeteksi permintaan password / kata sandi', () => {
        const hasil = evaluasiChat('Berikan password akun kamu agar kami bisa membantu.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan kode OTP, PIN, atau kata sandi')).toBe(true);
        expect(hasil.level).toBe('tinggi');

        const hasil2 = evaluasiChat('Kirimkan kata sandi Anda kepada admin.');
        expect(hasil2.temuan.some((t) => t.judul === 'Permintaan kode OTP, PIN, atau kata sandi')).toBe(true);
        expect(hasil2.level).toBe('tinggi');
      });
    });

    describe('2. minta_transfer (Permintaan transfer, pulsa, atau voucher - bobot +3)', () => {
      it('mendeteksi permintaan transfer uang (+3)', () => {
        const hasil = evaluasiChat('Bisa tolong transfer uang Rp 200.000 ke rekening ini?');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan transfer uang, pulsa, atau voucher')).toBe(true);
        expect(hasil.skor).toBe(3);
        expect(hasil.level).toBe('sedang');
      });

      it('mendeteksi permintaan pengisian pulsa (+3)', () => {
        const hasil = evaluasiChat('Tolong belikan pulsa 50 ribu ke nomor ini ya.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan transfer uang, pulsa, atau voucher')).toBe(true);
        expect(hasil.skor).toBe(3);
      });

      it('mendeteksi permintaan voucher (+3)', () => {
        const hasil = evaluasiChat('Tolong kirimkan voucher game Google Play sekarang.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan transfer uang, pulsa, atau voucher')).toBe(true);
        expect(hasil.skor).toBe(3);
      });
    });

    describe('3. biaya_dimuka (Biaya di muka / deposit - bobot +3)', () => {
      it('mendeteksi biaya admin atau biaya pendaftaran (+3)', () => {
        const hasil = evaluasiChat('Kamu perlu membayar biaya pendaftaran dan biaya admin sebesar 150 ribu.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan biaya di muka atau deposit')).toBe(true);
        expect(hasil.skor).toBe(3);
        expect(hasil.level).toBe('sedang');
      });

      it('mendeteksi permintaan deposit dulu (+3)', () => {
        const hasil = evaluasiChat('Lakukan deposit dulu untuk mengaktifkan akun pekerjaan.');
        expect(hasil.temuan.some((t) => t.judul === 'Permintaan biaya di muka atau deposit')).toBe(true);
        expect(hasil.skor).toBe(3);
      });
    });

    describe('4. kirim_apk (Kirim file aplikasi / APK - bobot +3)', () => {
      it('mendeteksi file undangan.apk (+3)', () => {
        const hasil = evaluasiChat('Silakan buka file undangan.apk ini untuk melihat lokasi pesta.');
        expect(hasil.temuan.some((t) => t.judul === 'Pengiriman atau ajakan memasang file aplikasi (APK)')).toBe(true);
        expect(hasil.skor).toBe(3);
        expect(hasil.level).toBe('sedang');
      });

      it('mendeteksi file foto paket.apk (+3)', () => {
        const hasil = evaluasiChat('Ini foto paket.apk pesanan Anda, tolong pasang di HP.');
        expect(hasil.temuan.some((t) => t.judul === 'Pengiriman atau ajakan memasang file aplikasi (APK)')).toBe(true);
        expect(hasil.skor).toBe(3);
      });

      it('mendeteksi ajakan instal/download file .apk (+3)', () => {
        const hasil = evaluasiChat('Unduh file surat_tilang.apk berikut untuk melihat rincian.');
        expect(hasil.temuan.some((t) => t.judul === 'Pengiriman atau ajakan memasang file aplikasi (APK)')).toBe(true);
        expect(hasil.skor).toBe(3);
      });
    });

    describe('5. desakan_waktu (Desakan waktu - bobot +2)', () => {
      it('mendeteksi kata "segera" dan "diblokir" (+2)', () => {
        const hasil = evaluasiChat('Akun Anda akan diblokir jika tidak diperbarui.');
        expect(hasil.temuan.some((t) => t.judul === 'Desakan waktu dan ancaman mendesak')).toBe(true);
        expect(hasil.skor).toBe(2);
      });

      it('mendeteksi kata "hari ini juga" dan "24 jam" (+2)', () => {
        const hasil = evaluasiChat('Kesempatan berlaku hari ini juga, batas waktu 24 jam saja.');
        expect(hasil.temuan.some((t) => t.judul === 'Desakan waktu dan ancaman mendesak')).toBe(true);
        expect(hasil.skor).toBe(2);
      });
    });

    describe('6. keluarga_ganti_nomor (Mengaku keluarga ganti nomor - bobot +2)', () => {
      it('mendeteksi "ini nomor baru" dan "HP rusak" (+2)', () => {
        const hasil = evaluasiChat('Halo nak, ini nomor baru Ibu. HP rusak jadi pinjam HP teman.');
        expect(hasil.temuan.some((t) => t.judul === 'Mengaku sebagai keluarga atau kerabat yang ganti nomor')).toBe(true);
        expect(hasil.skor).toBe(2);
      });

      it('mendeteksi "pinjam HP teman" (+2)', () => {
        const hasil = evaluasiChat('Ini aku pinjam HP teman dulu sementara.');
        expect(hasil.temuan.some((t) => t.judul === 'Mengaku sebagai keluarga atau kerabat yang ganti nomor')).toBe(true);
        expect(hasil.skor).toBe(2);
      });
    });

    describe('7. pihak_resmi (Mengaku pihak resmi - bobot +2)', () => {
      it('mendeteksi "dari bank" (+2)', () => {
        const hasil = evaluasiChat('Halo, kami dari bank ingin melakukan verifikasi keamanan akun.');
        expect(hasil.temuan.some((t) => t.judul === 'Mengaku sebagai pihak resmi atau institusi')).toBe(true);
        expect(hasil.skor).toBe(2);
      });

      it('mendeteksi "CS", "kurir", "polisi", dan "BPJS" (+2)', () => {
        const teksKurir = evaluasiChat('Saya Budi kurir J&T mengantarkan paket Anda.');
        expect(teksKurir.temuan.some((t) => t.judul === 'Mengaku sebagai pihak resmi atau institusi')).toBe(true);

        const teksPolisi = evaluasiChat('Panggilan dari pihak kepolisian terkait laporan.');
        expect(teksPolisi.temuan.some((t) => t.judul === 'Mengaku sebagai pihak resmi atau institusi')).toBe(true);

        const teksBpjs = evaluasiChat('Pemberitahuan resmi kepesertaan BPJS Kesehatan.');
        expect(teksBpjs.temuan.some((t) => t.judul === 'Mengaku sebagai pihak resmi atau institusi')).toBe(true);

        const teksCs = evaluasiChat('Halo kak, CS resmi siap membantu kendala kamu.');
        expect(teksCs.temuan.some((t) => t.judul === 'Mengaku sebagai pihak resmi atau institusi')).toBe(true);
      });
    });

    describe('8. gaji_besar (Gaji besar tanpa syarat - bobot +2)', () => {
      it('mendeteksi "gaji harian", "tanpa pengalaman", "kerja dari HP", "like dan review" (+2)', () => {
        const hasil = evaluasiChat('Tawaran kerja dari HP dengan gaji harian besar tanpa pengalaman, tugas like dan review video.');
        expect(hasil.temuan.some((t) => t.judul === 'Penawaran gaji besar atau komisi tanpa syarat')).toBe(true);
        expect(hasil.skor).toBe(2);
      });
    });

    describe('9. hadiah_undian (Hadiah atau undian - bobot +2)', () => {
      it('mendeteksi "selamat anda", "pemenang", "klaim hadiah" (+2)', () => {
        const hasil = evaluasiChat('Selamat Anda pemenang gebyar undian, klaim hadiah mobil.');
        expect(hasil.temuan.some((t) => t.judul === 'Pemberitahuan hadiah atau kemenangan undian')).toBe(true);
        expect(hasil.skor).toBe(2);
      });
    });

    describe('10. pindah_aplikasi (Pindah aplikasi - bobot +1)', () => {
      it('mendeteksi "lanjut di Telegram" dan "chat WA saya" (+1)', () => {
        const hasil = evaluasiChat('Untuk proses seleksi silakan lanjut di Telegram kami.');
        expect(hasil.temuan.some((t) => t.judul === 'Ajakan mengalihkan percakapan ke aplikasi lain')).toBe(true);
        expect(hasil.skor).toBe(1);

        const hasil2 = evaluasiChat('Bisa chat WA saya untuk info detailnya.');
        expect(hasil2.temuan.some((t) => t.judul === 'Ajakan mengalihkan percakapan ke aplikasi lain')).toBe(true);
        expect(hasil2.skor).toBe(1);
      });
    });

    describe('11. ada_link (Keberadaan link di pesan - bobot +1)', () => {
      it('mendeteksi link URL dalam pesan dan menyimpannya di linkDitemukan (+1) (Requirements 13.2, 13.5)', () => {
        const hasil = evaluasiChat('Silakan buka tautan https://promo-shopee.co.id/voucher untuk klaim.');
        expect(hasil.temuan.some((t) => t.judul === 'Tautan (link) di dalam pesan')).toBe(true);
        expect(hasil.skor).toBe(1);
        expect(hasil.linkDitemukan).toContain('https://promo-shopee.co.id/voucher');
      });

      it('mengekstrak beberapa link berbeda secara bersamaan', () => {
        const hasil = evaluasiChat('Kunjungi https://situs-satu.com dan bit.ly/promo-dua sekarang.');
        expect(hasil.linkDitemukan).toContain('https://situs-satu.com');
        expect(hasil.linkDitemukan).toContain('bit.ly/promo-dua');
        expect(hasil.linkDitemukan).toHaveLength(2);
      });
    });
  });

  describe('Kombinasi Khusus Langsung Tinggi (Requirement 13.4)', () => {
    it('menetapkan tingkat kewaspadaan "tinggi" saat ada kombinasi minta transfer AND desakan waktu', () => {
      const pesan = 'Tolong transfer uang Rp 500.000 sekarang segera hari ini juga sebelum terlambat!';
      const hasil = evaluasiChat(pesan);

      expect(hasil.skor).toBe(5);
      expect(hasil.level).toBe('tinggi');
    });

    it('menetapkan tingkat kewaspadaan "tinggi" saat ada kombinasi biaya di muka AND desakan waktu', () => {
      const pesan = 'Harap bayar biaya pendaftaran batas waktu 24 jam atau akun diblokir.';
      const hasil = evaluasiChat(pesan);

      expect(hasil.skor).toBe(5);
      expect(hasil.level).toBe('tinggi');
    });

    it('menetapkan tingkat kewaspadaan "tinggi" saat ada kombinasi minta transfer AND instruksi merahasiakan', () => {
      const pesan = 'Tolong transfer uang ke rekening ini, jangan beritahu siapa-siapa ya rahasia kita berdua.';
      const hasil = evaluasiChat(pesan);

      expect(hasil.skor).toBe(3);
      expect(hasil.level).toBe('tinggi');
    });

    it('menetapkan tingkat kewaspadaan "tinggi" saat ada kombinasi minta pulsa AND jangan kasih tahu', () => {
      const pesan = 'Bisa isikan pulsa 100rb? Tolong diam-diam jangan sampai ada yang tahu.';
      const hasil = evaluasiChat(pesan);

      expect(hasil.level).toBe('tinggi');
    });

    it('tidak menaikkan ke tinggi jika hanya ada desakan waktu tanpa permintaan uang/OTP', () => {
      const pesan = 'Pemberitahuan: batas waktu pengumpulan tugas adalah hari ini juga sebelum jam 12.';
      const hasil = evaluasiChat(pesan);

      expect(hasil.skor).toBe(2);
      expect(hasil.level).toBe('tidak_ditemukan');
    });
  });

  describe('Deteksi Modus Video Call / Voice Note (Requirement 16.4)', () => {
    it('mendeteksi frasa "video call" dan menetapkan modusVideoDitemukan = true', () => {
      const hasil = evaluasiChat('Bisa video call sebentar untuk verifikasi wajah?');
      expect(hasil.modusVideoDitemukan).toBe(true);
    });

    it('mendeteksi frasa "voice note" dan menetapkan modusVideoDitemukan = true', () => {
      const hasil = evaluasiChat('Tolong dengarkan voice note yang saya kirimkan.');
      expect(hasil.modusVideoDitemukan).toBe(true);
    });

    it('mendeteksi singkatan "vc" dan "vn"', () => {
      const hasilVc = evaluasiChat('Yuk vc sekarang kak.');
      expect(hasilVc.modusVideoDitemukan).toBe(true);

      const hasilVn = evaluasiChat('Cek vn dari atasan ya.');
      expect(hasilVn.modusVideoDitemukan).toBe(true);
    });

    it('bernilai false untuk teks yang tidak mengandung modus video/suara', () => {
      const hasil = evaluasiChat('Halo apa kabar, ada yang bisa dibantu hari ini?');
      expect(hasil.modusVideoDitemukan).toBe(false);
    });
  });

  describe('generateHasilChatLokal', () => {
    it('menghasilkan objek FormatDataHasil lengkap untuk pesan waspada tinggi', () => {
      const teks = 'Kirimkan kode OTP 6 digit dan transfer uang 500rb segera hari ini!';
      const hasil = generateHasilChatLokal(teks);

      expect(hasil.halaman).toBe('chat');
      expect(hasil.level).toBe('tinggi');
      expect(hasil.ringkasan).toBe(
        'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.'
      );
      expect(hasil.temuan.length).toBeGreaterThanOrEqual(1);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasil.batasan).toBeTruthy();
      expect(hasil.status_layanan.ai).toBe('tidak_dipakai');
      expect(hasil.pihak_ketiga).toEqual([]);
    });

    it('menghasilkan objek FormatDataHasil lengkap untuk pesan waspada sedang', () => {
      const teks = 'Ada biaya pendaftaran 50 ribu untuk mengikuti tes.';
      const hasil = generateHasilChatLokal(teks);

      expect(hasil.halaman).toBe('chat');
      expect(hasil.level).toBe('sedang');
      expect(hasil.ringkasan).toBe('Ada tanda yang perlu kamu cek dulu sebelum lanjut.');
      expect(hasil.temuan.length).toBeGreaterThanOrEqual(1);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('menghasilkan objek FormatDataHasil untuk pesan netral / tidak ditemukan tanda bahaya', () => {
      const teks = 'Selamat siang, besok kita jadi rapat jam 10 pagi di kantor ya.';
      const hasil = generateHasilChatLokal(teks);

      expect(hasil.halaman).toBe('chat');
      expect(hasil.level).toBe('tidak_ditemukan');
      expect(hasil.ringkasan).toBe(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );
      expect(hasil.temuan).toEqual([]);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('mendeteksi situasi darurat yang relevan di chat', () => {
      const teksTransfer = 'Saya sudah terlanjur transfer uang Rp 1.000.000 ke penipu itu.';
      const hasilTransfer = generateHasilChatLokal(teksTransfer);
      expect(hasilTransfer.situasi_darurat).toContain('transfer');

      const teksOtp = 'Saya sudah kasih kode OTP saya tadi.';
      const hasilOtp = generateHasilChatLokal(teksOtp);
      expect(hasilOtp.situasi_darurat).toContain('kirim_otp');

      const teksLink = 'Saya sempat klik link https://login-bank.xyz kemarin.';
      const hasilLink = generateHasilChatLokal(teksLink);
      expect(hasilLink.situasi_darurat).toContain('klik_link');
    });

    it('menangani input kosong atau string kosong secara aman tanpa crash', () => {
      const hasilKosong = generateHasilChatLokal('');
      expect(hasilKosong.level).toBe('tidak_ditemukan');
      expect(hasilKosong.temuan).toEqual([]);
      expect(hasilKosong.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('memastikan alias evaluasiAturanChat identik dengan evaluasiChat', () => {
      expect(evaluasiAturanChat).toBe(evaluasiChat);
    });
  });

  describe('Skenario Contoh Fiktif Realistis', () => {
    it('skenario 1: tawaran kerja like & review (tinggi)', () => {
      const teks =
        'Gaji harian Rp500.000 tanpa pengalaman cukup kerja dari HP tugas like dan review. Lanjut di Telegram t.me/lowongan dan bayar biaya pendaftaran Rp150.000 hari ini juga!';
      const hasil = evaluasiChat(teks);

      expect(hasil.level).toBe('tinggi');
      expect(hasil.skor).toBeGreaterThanOrEqual(6);
      expect(hasil.linkDitemukan).toContain('t.me/lowongan');
    });

    it('skenario 2: kurir minta OTP (tinggi)', () => {
      const teks =
        'Saya kurir J&T Express paket tertahan. Mohon berikan kode OTP 6 digit sekarang juga agar paket tidak diblokir.';
      const hasil = evaluasiChat(teks);

      expect(hasil.level).toBe('tinggi');
      expect(hasil.temuan.some((t) => t.judul === 'Permintaan kode OTP, PIN, atau kata sandi')).toBe(true);
      expect(hasil.temuan.some((t) => t.judul === 'Mengaku sebagai pihak resmi atau institusi')).toBe(true);
    });

    it('skenario 3: keluarga ganti nomor minta transfer (tinggi)', () => {
      const teks =
        'Halo nak ini nomor baru Ibu, HP rusak pinjam HP teman. Tolong transfer uang 500rb segera hari ini penting banget ya.';
      const hasil = evaluasiChat(teks);

      expect(hasil.level).toBe('tinggi');
      expect(hasil.temuan.some((t) => t.judul === 'Mengaku sebagai keluarga atau kerabat yang ganti nomor')).toBe(true);
      expect(hasil.temuan.some((t) => t.judul === 'Permintaan transfer uang, pulsa, atau voucher')).toBe(true);
    });
  });
});
