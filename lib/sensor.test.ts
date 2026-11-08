import { describe, it, expect } from 'vitest';
import {
  sensorTeks,
  SENSOR_PLACEHOLDER,
  POLA_EMAIL,
  POLA_NOMOR_HP,
  POLA_NOMOR_REKENING,
  POLA_DERETAN_ANGKA,
} from './sensor';

describe('lib/sensor.ts — sensorTeks', () => {
  describe('Konstanta dan Ekspor', () => {
    it('mengekspor SENSOR_PLACEHOLDER bernilai "[disensor]"', () => {
      expect(SENSOR_PLACEHOLDER).toBe('[disensor]');
    });

    it('mengekspor regex pola sensitif yang valid', () => {
      expect(POLA_EMAIL).toBeInstanceOf(RegExp);
      expect(POLA_NOMOR_HP).toBeInstanceOf(RegExp);
      expect(POLA_NOMOR_REKENING).toBeInstanceOf(RegExp);
      expect(POLA_DERETAN_ANGKA).toBeInstanceOf(RegExp);
    });
  });

  describe('Sensor Nomor HP Indonesia', () => {
    it('mengganti nomor HP berawalan 08 (10-13 digit)', () => {
      const res1 = sensorTeks('Hubungi saya di 0812345678');
      expect(res1.hasil).toBe('Hubungi saya di [disensor]');
      expect(res1.jumlahDiganti).toBe(1);

      const res2 = sensorTeks('Nomor WA: 081234567890');
      expect(res2.hasil).toBe('Nomor WA: [disensor]');
      expect(res2.jumlahDiganti).toBe(1);

      const res3 = sensorTeks('Kontak: 0812345678901');
      expect(res3.hasil).toBe('Kontak: [disensor]');
      expect(res3.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor HP berawalan +62', () => {
      const res = sensorTeks('Silakan WA ke +6281234567890 ya');
      expect(res.hasil).toBe('Silakan WA ke [disensor] ya');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor HP berawalan 62 tanpa tanda +', () => {
      const res = sensorTeks('Kirim pesan ke 6281234567890 segera');
      expect(res.hasil).toBe('Kirim pesan ke [disensor] segera');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor HP di dalam tanda kurung atau tanda baca', () => {
      const res = sensorTeks('Nomor darurat: (081234567890).');
      expect(res.hasil).toBe('Nomor darurat: ([disensor]).');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti beberapa nomor HP sekaligus dalam satu teks', () => {
      const res = sensorTeks(
        'Bisa hubungi 081234567890 atau cadangan +6289876543210'
      );
      expect(res.hasil).toBe('Bisa hubungi [disensor] atau cadangan [disensor]');
      expect(res.jumlahDiganti).toBe(2);
    });
  });

  describe('Sensor Deretan 4-8 Angka (PIN, OTP, Kode Verifikasi)', () => {
    it('mengganti kode 4 digit (PIN)', () => {
      const res = sensorTeks('PIN rahasia kamu: 1234');
      expect(res.hasil).toBe('PIN rahasia kamu: [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti kode 6 digit (OTP standar)', () => {
      const res = sensorTeks('Jangan bagikan kode OTP 543210 kepada siapa pun');
      expect(res.hasil).toBe(
        'Jangan bagikan kode OTP [disensor] kepada siapa pun'
      );
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti kode verifikasi 5 digit dan 7 digit', () => {
      const res5 = sensorTeks('Kode konfirmasi: 98765');
      expect(res5.hasil).toBe('Kode konfirmasi: [disensor]');
      expect(res5.jumlahDiganti).toBe(1);

      const res7 = sensorTeks('Kode aktivasi: 1234567');
      expect(res7.hasil).toBe('Kode aktivasi: [disensor]');
      expect(res7.jumlahDiganti).toBe(1);
    });

    it('mengganti kode 8 digit', () => {
      const res = sensorTeks('Voucher diskon: 87654321');
      expect(res.hasil).toBe('Voucher diskon: [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti beberapa kode angka 4-8 digit dalam satu kalimat', () => {
      const res = sensorTeks('PIN lama 4321 diubah jadi OTP 889900');
      expect(res.hasil).toBe('PIN lama [disensor] diubah jadi OTP [disensor]');
      expect(res.jumlahDiganti).toBe(2);
    });
  });

  describe('Sensor Alamat Email', () => {
    it('mengganti alamat email standar', () => {
      const res = sensorTeks('Kirim bukti transfer ke admin@tokopenipu.com');
      expect(res.hasil).toBe('Kirim bukti transfer ke [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti alamat email dengan titik, tanda hubung, dan subdomain', () => {
      const res = sensorTeks(
        'Hubungi layanan.konsumen-care@sub.perusahaan.co.id'
      );
      expect(res.hasil).toBe('Hubungi [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti alamat email yang mengandung angka tanpa memecah angka', () => {
      const res = sensorTeks('Email saya budi123456@gmail.com');
      expect(res.hasil).toBe('Email saya [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mempertahankan tanda baca setelah alamat email', () => {
      const res = sensorTeks('Hubungi info@scam.org, kami siap melayani.');
      expect(res.hasil).toBe('Hubungi [disensor], kami siap melayani.');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti beberapa alamat email dalam satu teks', () => {
      const res = sensorTeks('Kontak: satu@test.com atau dua@contoh.id');
      expect(res.hasil).toBe('Kontak: [disensor] atau [disensor]');
      expect(res.jumlahDiganti).toBe(2);
    });
  });

  describe('Sensor Nomor Rekening (10-16 Digit)', () => {
    it('mengganti nomor rekening 10 digit (contoh BCA/BNI)', () => {
      const res = sensorTeks('Transfer ke rekening BCA 1234567890');
      expect(res.hasil).toBe('Transfer ke rekening BCA [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor rekening 13 digit (contoh Mandiri)', () => {
      const res = sensorTeks('Rekening Mandiri: 1234567890123 a.n. Penipu');
      expect(res.hasil).toBe('Rekening Mandiri: [disensor] a.n. Penipu');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor rekening 15 digit (contoh BRI)', () => {
      const res = sensorTeks('Transfer BRI: 123456789012345');
      expect(res.hasil).toBe('Transfer BRI: [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor rekening / kartu 16 digit', () => {
      const res = sensorTeks('Nomor virtual account: 1234567890123456');
      expect(res.hasil).toBe('Nomor virtual account: [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });

    it('mengganti nomor rekening 16 digit yang diawali angka 0 secara utuh', () => {
      const res = sensorTeks('Rekening tujuan 0123456789012345');
      expect(res.hasil).toBe('Rekening tujuan [disensor]');
      expect(res.jumlahDiganti).toBe(1);
    });
  });

  describe('Pelestarian Teks Non-Sensitif', () => {
    it('tidak mengubah teks yang tidak mengandung data sensitif', () => {
      const teks =
        'Selamat siang kak, perkenalkan saya dari PT Maju Mundur. Ada promo menarik.';
      const res = sensorTeks(teks);
      expect(res.hasil).toBe(teks);
      expect(res.jumlahDiganti).toBe(0);
    });

    it('tidak menyensor angka 1, 2, atau 3 digit', () => {
      const teks = 'Ada 3 orang, kamar nomor 42, dengan 100 paket.';
      const res = sensorTeks(teks);
      expect(res.hasil).toBe(teks);
      expect(res.jumlahDiganti).toBe(0);
    });

    it('tidak menyensor format nominal rupiah dengan titik pemisah ribuan', () => {
      const teks = 'Total transfer Rp500.000 atau Rp 50.000 atau Rp 10.000.000';
      const res = sensorTeks(teks);
      expect(res.hasil).toBe(teks);
      expect(res.jumlahDiganti).toBe(0);
    });

    it('mempertahankan struktur spasi, baris baru, dan emoji', () => {
      const teks = 'Halo kak! 👋\n\nAda kabar gembira 🎉\nSilakan cek pesan ini.';
      const res = sensorTeks(teks);
      expect(res.hasil).toBe(teks);
      expect(res.jumlahDiganti).toBe(0);
    });
  });

  describe('Skenario Chat Penipuan Terpadu', () => {
    it('menyensor skenario tawaran kerja paruh waktu dengan komisi dan kontak', () => {
      const input =
        'Selamat kak! Dapat tawaran kerja like video komisi 50000 per tugas. Hubungi 081234567890 atau email hrd@fakejob.id sekarang!';
      const res = sensorTeks(input);
      expect(res.hasil).toBe(
        'Selamat kak! Dapat tawaran kerja like video komisi [disensor] per tugas. Hubungi [disensor] atau email [disensor] sekarang!'
      );
      expect(res.jumlahDiganti).toBe(3);
    });

    it('menyensor skenario kurir meminta kode OTP', () => {
      const input =
        'Paket Anda tertahan di gudang J&T. Silakan kirim kode 849201 ke kurir via WhatsApp +6281987654321.';
      const res = sensorTeks(input);
      expect(res.hasil).toBe(
        'Paket Anda tertahan di gudang J&T. Silakan kirim kode [disensor] ke kurir via WhatsApp [disensor].'
      );
      expect(res.jumlahDiganti).toBe(2);
    });

    it('menyensor skenario keluarga minta transfer mendesak', () => {
      const input =
        'Tolong transfer uang Rp500.000 dulu ke rekening teman Ibu di BCA 1234567890. PIN m-banking Ibu lupa: 4321.';
      const res = sensorTeks(input);
      expect(res.hasil).toBe(
        'Tolong transfer uang Rp500.000 dulu ke rekening teman Ibu di BCA [disensor]. PIN m-banking Ibu lupa: [disensor].'
      );
      expect(res.jumlahDiganti).toBe(2);
    });

    it('menyensor semua data sensitif dalam satu percakapan komprehensif', () => {
      const input =
        'Email penipu: bad@scam.com, HP: 085211223344, Rekening: 987654321012, OTP: 654321';
      const res = sensorTeks(input);
      expect(res.hasil).toBe(
        'Email penipu: [disensor], HP: [disensor], Rekening: [disensor], OTP: [disensor]'
      );
      expect(res.jumlahDiganti).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('mengembalikan string kosong dan jumlahDiganti 0 untuk input string kosong', () => {
      const res = sensorTeks('');
      expect(res.hasil).toBe('');
      expect(res.jumlahDiganti).toBe(0);
    });

    it('menangani input yang hanya berisi satu data sensitif', () => {
      expect(sensorTeks('081234567890')).toEqual({
        hasil: '[disensor]',
        jumlahDiganti: 1,
      });

      expect(sensorTeks('user@domain.com')).toEqual({
        hasil: '[disensor]',
        jumlahDiganti: 1,
      });

      expect(sensorTeks('123456')).toEqual({
        hasil: '[disensor]',
        jumlahDiganti: 1,
      });

      expect(sensorTeks('123456789012')).toEqual({
        hasil: '[disensor]',
        jumlahDiganti: 1,
      });
    });

    it('idempoten ketika dijalankan pada teks yang sudah disensor', () => {
      const input = 'Hubungi 081234567890 dengan OTP 123456';
      const res1 = sensorTeks(input);
      expect(res1.hasil).toBe('Hubungi [disensor] dengan OTP [disensor]');
      expect(res1.jumlahDiganti).toBe(2);

      const res2 = sensorTeks(res1.hasil);
      expect(res2.hasil).toBe(res1.hasil);
      expect(res2.jumlahDiganti).toBe(0);
    });
  });
});
