import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  AMBANG_TINGGI,
  AMBANG_SEDANG,
  hitungLevel,
  gabungLevel,
  evaluasiAturan,
  ekstrakUrl,
  deteksiModusVideo,
  type Aturan,
} from './scoring';

describe('lib/aturan/scoring.ts', () => {
  describe('Konstanta Ambang Batas', () => {
    it('memiliki nilai ambang batas sesuai spesifikasi (Requirements 10.2, 10.3)', () => {
      expect(AMBANG_TINGGI).toBe(6);
      expect(AMBANG_SEDANG).toBe(3);
    });
  });

  describe('hitungLevel', () => {
    it('mengembalikan "tidak_ditemukan" untuk skor < 3 tanpa langsung_tinggi (Requirement 10.4)', () => {
      expect(hitungLevel(0)).toBe('tidak_ditemukan');
      expect(hitungLevel(1)).toBe('tidak_ditemukan');
      expect(hitungLevel(2)).toBe('tidak_ditemukan');
      expect(hitungLevel(2.5)).toBe('tidak_ditemukan');
    });

    it('mengembalikan "sedang" untuk skor 3 sampai 5 tanpa langsung_tinggi (Requirement 10.3)', () => {
      expect(hitungLevel(3)).toBe('sedang');
      expect(hitungLevel(4)).toBe('sedang');
      expect(hitungLevel(5)).toBe('sedang');
      expect(hitungLevel(5.9)).toBe('sedang');
    });

    it('mengembalikan "tinggi" untuk skor >= 6 (Requirement 10.2)', () => {
      expect(hitungLevel(6)).toBe('tinggi');
      expect(hitungLevel(7)).toBe('tinggi');
      expect(hitungLevel(100)).toBe('tinggi');
    });

    it('mengembalikan "tinggi" jika adaLangsungTinggi bernilai true meskipun skor < 3 atau < 6', () => {
      expect(hitungLevel(0, true)).toBe('tinggi');
      expect(hitungLevel(1, true)).toBe('tinggi');
      expect(hitungLevel(2, true)).toBe('tinggi');
      expect(hitungLevel(4, true)).toBe('tinggi');
    });
  });

  describe('gabungLevel', () => {
    it('selalu mengambil level tertinggi', () => {
      expect(gabungLevel('tidak_ditemukan', 'sedang')).toBe('sedang');
      expect(gabungLevel('sedang', 'tinggi')).toBe('tinggi');
      expect(gabungLevel('tinggi', 'tidak_ditemukan')).toBe('tinggi');
    });
  });

  describe('ekstrakUrl', () => {
    it('mengekstrak URL dengan skema http dan https', () => {
      const teks = 'Kunjungi https://bca-promo.com/login dan http://hadiah-ku.net sekarang!';
      const urls = ekstrakUrl(teks);
      expect(urls).toEqual([
        'https://bca-promo.com/login',
        'http://hadiah-ku.net',
      ]);
    });

    it('mengekstrak URL yang diawali www.', () => {
      const teks = 'Buka tautan www.bank-dana.id untuk verifikasi.';
      const urls = ekstrakUrl(teks);
      expect(urls).toEqual(['www.bank-dana.id']);
    });

    it('mengekstrak link pendek seperti bit.ly, t.me, wa.me', () => {
      const teks = 'Chat kami di wa.me/6281234567 atau gabung t.me/investasi_cuan dan bit.ly/promo123';
      const urls = ekstrakUrl(teks);
      expect(urls).toContain('wa.me/6281234567');
      expect(urls).toContain('t.me/investasi_cuan');
      expect(urls).toContain('bit.ly/promo123');
    });

    it('membersihkan tanda baca yang menempel di akhir URL', () => {
      const teks = 'Cek link ini: https://example.com/promo, atau https://test.id/auth! Segera.';
      const urls = ekstrakUrl(teks);
      expect(urls).toEqual(['https://example.com/promo', 'https://test.id/auth']);
    });

    it('menghilangkan duplikasi URL', () => {
      const teks = 'https://example.com dan https://example.com sekali lagi';
      const urls = ekstrakUrl(teks);
      expect(urls).toHaveLength(1);
      expect(urls).toEqual(['https://example.com']);
    });

    it('mengembalikan array kosong untuk teks tanpa URL atau input kosong', () => {
      expect(ekstrakUrl('Selamat pagi apa kabar?')).toEqual([]);
      expect(ekstrakUrl('')).toEqual([]);
    });
  });

  describe('deteksiModusVideo', () => {
    it('mendeteksi berbagai istilah video call dan voice note', () => {
      expect(deteksiModusVideo('tolong angkat video call sekarang')).toBe(true);
      expect(deteksiModusVideo('bisa vc sebentar kak?')).toBe(true);
      expect(deteksiModusVideo('dengar voice note ini')).toBe(true);
      expect(deteksiModusVideo('cek rekaman suara atasan')).toBe(true);
      expect(deteksiModusVideo('ini panggilan video dari kantor')).toBe(true);
      expect(deteksiModusVideo('waspada video deepfake')).toBe(true);
      expect(deteksiModusVideo('kirim vn dong')).toBe(true);
    });

    it('mengembalikan false untuk teks biasa tanpa indikasi modus video/suara', () => {
      expect(deteksiModusVideo('Halo selamat siang')).toBe(false);
      expect(deteksiModusVideo('Kirim paket via JNE')).toBe(false);
      expect(deteksiModusVideo('')).toBe(false);
    });
  });

  describe('evaluasiAturan', () => {
    const aturanOtp: Aturan = {
      id: 'minta_otp',
      pola: /kode\s*otp/i,
      bobot: 0,
      langsung_tinggi: true,
      judul: 'Permintaan kode OTP',
      penjelasan: 'Pihak resmi tidak pernah meminta kode OTP.',
      buktiExtractor: (_input, match) => (match ? match[0] : 'kode OTP'),
    };

    const aturanTransfer: Aturan = {
      id: 'minta_transfer',
      pola: /transfer\s*uang/i,
      bobot: 3,
      langsung_tinggi: false,
      judul: 'Permintaan transfer dana',
      penjelasan: 'Waspada permintaan transfer ke rekening perorangan.',
      buktiExtractor: (_input, match) => (match ? match[0] : 'transfer uang'),
    };

    const aturanDesakan: Aturan = {
      id: 'desakan_waktu',
      pola: /segera|dalam\s*10\s*menit/i,
      bobot: 2,
      langsung_tinggi: false,
      judul: 'Desakan waktu darurat',
      penjelasan: 'Pelaku sering menciptakan kepanikan agar korban tidak sempat berpikir.',
      buktiExtractor: (_input, match) => (match ? match[0] : 'segera'),
    };

    const aturanLinkDalamPesan: Aturan = {
      id: 'link_dalam_pesan',
      pola: /(?:https?:\/\/|www\.)[^\s]+/i,
      bobot: 1,
      langsung_tinggi: false,
      judul: 'Tautan dalam pesan',
      penjelasan: 'Pesan mencurigakan sering menyertakan tautan palsu.',
      buktiExtractor: (input) => {
        const urls = ekstrakUrl(input);
        return urls[0] || 'tautan';
      },
    };

    it('menghasilkan nilai dasar saat input kosong atau daftar aturan kosong', () => {
      const hasilKosong = evaluasiAturan('', [aturanOtp, aturanTransfer]);
      expect(hasilKosong.skor).toBe(0);
      expect(hasilKosong.level).toBe('tidak_ditemukan');
      expect(hasilKosong.temuan).toEqual([]);
      expect(hasilKosong.linkDitemukan).toEqual([]);
      expect(hasilKosong.modusVideoDitemukan).toBe(false);

      const hasilTanpaAturan = evaluasiAturan('Halo apa kabar', []);
      expect(hasilTanpaAturan.skor).toBe(0);
      expect(hasilTanpaAturan.level).toBe('tidak_ditemukan');
      expect(hasilTanpaAturan.temuan).toEqual([]);
    });

    it('menghitung skor aditif saat beberapa aturan cocok (Requirements 10.1, 10.3)', () => {
      const input = 'Tolong segera transfer uang untuk pembayaran hadiah.';
      const hasil = evaluasiAturan(input, [aturanTransfer, aturanDesakan]);

      // bobot: transfer (3) + desakan (2) = 5 -> sedang
      expect(hasil.skor).toBe(5);
      expect(hasil.level).toBe('sedang');
      expect(hasil.temuan).toHaveLength(2);
      expect(hasil.temuan[0].judul).toBe('Permintaan transfer dana');
      expect(hasil.temuan[1].judul).toBe('Desakan waktu darurat');
      expect(hasil.temuan[0].sumber).toBe('aturan');
    });

    it('menetapkan level "tinggi" saat skor mencapai atau melebihi 6 (Requirement 10.2)', () => {
      const aturanBonus: Aturan = {
        id: 'biaya_muka',
        pola: /biaya\s*admin/i,
        bobot: 3,
        langsung_tinggi: false,
        judul: 'Biaya di muka',
        penjelasan: 'Diminta bayar biaya admin.',
        buktiExtractor: () => 'biaya admin',
      };

      const input = 'Segera transfer uang dan bayar biaya admin!';
      const hasil = evaluasiAturan(input, [
        aturanTransfer, // 3
        aturanDesakan, // 2
        aturanBonus, // 3 -> total 8 >= 6
      ]);

      expect(hasil.skor).toBe(8);
      expect(hasil.level).toBe('tinggi');
    });

    it('langsung menetapkan level "tinggi" jika aturan memiliki langsung_tinggi: true (Requirement 10.2)', () => {
      const input = 'Masukkan kode OTP sekarang';
      const hasil = evaluasiAturan(input, [aturanOtp]);

      expect(hasil.skor).toBe(0); // bobot 0 tetapi langsung_tinggi
      expect(hasil.level).toBe('tinggi');
      expect(hasil.temuan).toHaveLength(1);
      expect(hasil.temuan[0].judul).toBe('Permintaan kode OTP');
    });

    it('mendukung pola berbasis fungsi predikat (input: string) => boolean', () => {
      const aturanFungsi: Aturan = {
        id: 'panjang_minim',
        pola: (teks: string) => teks.includes('voucher belanja'),
        bobot: 3,
        langsung_tinggi: false,
        judul: 'Iming-iming voucher',
        penjelasan: 'Penawaran voucher gratis sering dipakai memancing korban.',
        buktiExtractor: () => 'voucher belanja',
      };

      const hasil = evaluasiAturan('Klaim voucher belanja kamu', [aturanFungsi]);
      expect(hasil.skor).toBe(3);
      expect(hasil.level).toBe('sedang');
      expect(hasil.temuan[0].judul).toBe('Iming-iming voucher');
    });

    it('tetap deterministik dengan RegExp yang memiliki flag global (/g)', () => {
      const aturanGlobal: Aturan = {
        id: 'kata_pinjaman',
        pola: /pinjaman/gi,
        bobot: 2,
        langsung_tinggi: false,
        judul: 'Tawaran pinjaman',
        penjelasan: 'Penawaran pinjaman online ilegal.',
        buktiExtractor: (_input, match) => (match ? match[0] : 'pinjaman'),
      };

      const input = 'Tawaran pinjaman dana cepat tanpa jaminan.';

      // Jalankan beberapa kali berturut-turut untuk memastikan regex lastIndex tidak menyebabkan kegagalan
      const hasil1 = evaluasiAturan(input, [aturanGlobal]);
      const hasil2 = evaluasiAturan(input, [aturanGlobal]);
      const hasil3 = evaluasiAturan(input, [aturanGlobal]);

      expect(hasil1.skor).toBe(2);
      expect(hasil2.skor).toBe(2);
      expect(hasil3.skor).toBe(2);
      expect(hasil1.level).toBe('tidak_ditemukan');
      expect(hasil2.level).toBe('tidak_ditemukan');
      expect(hasil3.level).toBe('tidak_ditemukan');
    });

    it('mengekstrak link ke field linkDitemukan dan mendeteksi modus video', () => {
      const input =
        'Tolong angkat video call dan buka https://bank-login.xyz untuk verifikasi.';
      const hasil = evaluasiAturan(input, [aturanLinkDalamPesan]);

      expect(hasil.linkDitemukan).toEqual(['https://bank-login.xyz']);
      expect(hasil.modusVideoDitemukan).toBe(true);
      expect(hasil.temuan).toHaveLength(1);
    });

    it('dapat menonaktifkan ekstraksi link dan deteksi modus video melalui opsi', () => {
      const input = 'Angkat vc dan klik https://example.com';
      const hasil = evaluasiAturan(input, [], {
        ekstrakLink: false,
        deteksiModusVideo: false,
      });

      expect(hasil.linkDitemukan).toEqual([]);
      expect(hasil.modusVideoDitemukan).toBe(false);
    });

    it('tahan terhadap error pada pola atau buktiExtractor tanpa melempar pengecualian', () => {
      const aturanError: Aturan = {
        id: 'aturan_rusak',
        pola: () => {
          throw new Error('Pola rusak');
        },
        bobot: 3,
        langsung_tinggi: false,
        judul: 'Aturan rusak',
        penjelasan: 'Tes ketahanan error',
        buktiExtractor: () => {
          throw new Error('Extractor rusak');
        },
      };

      expect(() => {
        const hasil = evaluasiAturan('input apa saja', [aturanError]);
        expect(hasil.skor).toBe(0);
        expect(hasil.level).toBe('tidak_ditemukan');
      }).not.toThrow();
    });
  });

  describe('Property-Based Testing (PBT)', () => {
    it('Property 3: Determinisme skor → level (Validates: Requirements 10.1, 10.2, 10.3, 10.4)', () => {
      // Verifikasi bahwa untuk bilangan non-negatif acak, level selalu deterministik
      // dan sesuai dengan ambang batas yang ditetapkan
      fc.assert(
        fc.property(fc.nat({ max: 100 }), fc.boolean(), (skor, langsungTinggi) => {
          const level1 = hitungLevel(skor, langsungTinggi);
          const level2 = hitungLevel(skor, langsungTinggi);

          // Deterministik: dipanggil dua kali dengan input sama menghasilkan output sama
          expect(level1).toBe(level2);

          // Konsistensi ambang batas
          if (langsungTinggi) {
            expect(level1).toBe('tinggi');
          } else if (skor >= 6) {
            expect(level1).toBe('tinggi');
          } else if (skor >= 3) {
            expect(level1).toBe('sedang');
          } else {
            expect(level1).toBe('tidak_ditemukan');
          }
        }),
        { numRuns: 200 }
      );
    });

    it('Property: evaluasiAturan bersifat murni dan deterministik untuk input yang sama', () => {
      const sampleRules: Aturan[] = [
        {
          id: 'rule_a',
          pola: /hadiah/i,
          bobot: 2,
          langsung_tinggi: false,
          judul: 'Klaim hadiah',
          penjelasan: 'Penjelasan hadiah',
          buktiExtractor: (_i, m) => (m ? m[0] : 'hadiah'),
        },
        {
          id: 'rule_b',
          pola: /urgent|darurat/i,
          bobot: 3,
          langsung_tinggi: false,
          judul: 'Kondisi darurat',
          penjelasan: 'Penjelasan darurat',
          buktiExtractor: (_i, m) => (m ? m[0] : 'darurat'),
        },
        {
          id: 'rule_c',
          pola: /otp/i,
          bobot: 0,
          langsung_tinggi: true,
          judul: 'Kode OTP',
          penjelasan: 'Penjelasan OTP',
          buktiExtractor: (_i, m) => (m ? m[0] : 'otp'),
        },
      ];

      fc.assert(
        fc.property(fc.string(), (teks) => {
          const res1 = evaluasiAturan(teks, sampleRules);
          const res2 = evaluasiAturan(teks, sampleRules);

          expect(res1.skor).toBe(res2.skor);
          expect(res1.level).toBe(res2.level);
          expect(res1.temuan.length).toBe(res2.temuan.length);
          expect(res1.linkDitemukan).toEqual(res2.linkDitemukan);
          expect(res1.modusVideoDitemukan).toBe(res2.modusVideoDitemukan);
        }),
        { numRuns: 100 }
      );
    });
  });
});
