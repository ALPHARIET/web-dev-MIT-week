// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SorotanTranskrip } from './SorotanTranskrip';

describe('components/hasil/SorotanTranskrip.tsx — Fitur Sorotan Kalimat Pemicu (Task 18.1 / CH-07)', () => {
  const transkripContoh =
    'Halo kak! Kami dari Talent Media Agency. Silakan lakukan pembayaran biaya pendaftaran sebesar Rp150.000 ya. Slot terbatas hari ini saja!';

  const buktiContoh = [
    'lakukan pembayaran biaya pendaftaran sebesar Rp150.000',
    'Slot terbatas hari ini saja!',
  ];

  describe('1. Render Kondisional & Kasus Tepi Transkrip', () => {
    it('mengembalikan null jika transkrip kosong atau hanya whitespace', () => {
      const { container: c1 } = render(
        <SorotanTranskrip transkrip="" buktiList={['bukti']} />
      );
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(
        <SorotanTranskrip transkrip={'   \n\t  '} buktiList={['bukti']} />
      );
      expect(c2.firstChild).toBeNull();
    });

    it('merender teks transkrip utuh tanpa sorotan jika buktiList kosong', () => {
      render(<SorotanTranskrip transkrip={transkripContoh} buktiList={[]} />);

      const container = screen.getByTestId('sorotan-transkrip');
      expect(container).toBeDefined();

      const konten = screen.getByTestId('konten-transkrip');
      expect(konten.textContent).toContain(transkripContoh);

      expect(screen.queryByTestId('sorotan-pemicu')).toBeNull();
      expect(screen.queryByTestId('badge-jumlah-sorotan')).toBeNull();
      expect(screen.getByTestId('keterangan-tanpa-sorotan')).toBeDefined();
    });

    it('merender teks transkrip utuh tanpa sorotan jika tidak ada bukti yang cocok', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={['kata yang sama sekali tidak ada di transkrip']}
        />
      );

      const konten = screen.getByTestId('konten-transkrip');
      expect(konten.textContent).toContain(transkripContoh);
      expect(screen.queryByTestId('sorotan-pemicu')).toBeNull();
      expect(screen.getByTestId('keterangan-tanpa-sorotan')).toBeDefined();
    });
  });

  describe('2. Pemecahan dan Penyorotan Menggunakan Tag <mark> (WCAG AA Compliant)', () => {
    it('menyoroti frasa yang cocok menggunakan tag semantik <mark>', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={buktiContoh}
        />
      );

      const markElements = screen.getAllByTestId('sorotan-pemicu');
      expect(markElements).toHaveLength(2);

      markElements.forEach((el) => {
        expect(el.tagName.toLowerCase()).toBe('mark');
      });

      expect(markElements[0].textContent).toContain(
        'lakukan pembayaran biaya pendaftaran sebesar Rp150.000'
      );
      expect(markElements[1].textContent).toContain(
        'Slot terbatas hari ini saja!'
      );
    });

    it('menerapkan kelas styling amber/red berlatar kontras tinggi (WCAG AA compliant)', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={['biaya pendaftaran']}
        />
      );

      const mark = screen.getByTestId('sorotan-pemicu');
      expect(mark.className).toContain('bg-amber-100');
      expect(mark.className).toContain('text-amber-950');
      expect(mark.className).toContain('border-amber-300');
    });

    it('menampilkan badge penanda temuan dengan styling merah pada bagian yang disorot', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={['biaya pendaftaran']}
        />
      );

      const badge = screen.getByTestId('badge-penanda-temuan');
      expect(badge).toBeDefined();
      expect(badge.textContent).toContain('Pemicu');
      expect(badge.className).toContain('bg-red-600');
      expect(badge.className).toContain('text-white');
    });

    it('menampilkan tooltip (atribut title dan aria-label) pada bagian yang disorot', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={['biaya pendaftaran']}
        />
      );

      const mark = screen.getByTestId('sorotan-pemicu');
      expect(mark.getAttribute('title')).toContain('Pemicu temuan');

      const badge = screen.getByTestId('badge-penanda-temuan');
      expect(badge.getAttribute('aria-label')).toBe('Pemicu temuan mencurigakan');
    });
  });

  describe('3. Ketahanan Pencocokan Bukti (Case-Insensitive, Elipsis, Kutipan, Spasi)', () => {
    it('mencocokkan frasa bukti secara case-insensitive', () => {
      const teks = 'MOHON SEGERA KIRIM KODE OTP ANDA SEKARANG.';
      render(
        <SorotanTranskrip
          transkrip={teks}
          buktiList={['kode otp']}
        />
      );

      const mark = screen.getByTestId('sorotan-pemicu');
      expect(mark).toBeDefined();
      expect(mark.textContent).toContain('KODE OTP');
    });

    it('memecah dan menyoroti frasa yang dipisahkan elipsis (...) dalam kutipan AI', () => {
      const teks =
        'Hanya dengan like dan review produk Shopee. Gaji harian Rp500.000 langsung cair setiap sore tanpa pengalaman.';
      const buktiDenganElipsis = [
        'like dan review produk... Gaji harian Rp500.000 langsung cair... tanpa pengalaman',
      ];

      render(
        <SorotanTranskrip
          transkrip={teks}
          buktiList={buktiDenganElipsis}
        />
      );

      const markElements = screen.getAllByTestId('sorotan-pemicu');
      expect(markElements.length).toBe(3);
      expect(markElements[0].textContent).toContain('like dan review produk');
      expect(markElements[1].textContent).toContain(
        'Gaji harian Rp500.000 langsung cair'
      );
      expect(markElements[2].textContent).toContain('tanpa pengalaman');
    });

    it('membersihkan tanda kutip pembungkus pada bukti', () => {
      const teks = 'Paket Anda tertahan di gudang, silakan klik link ini.';
      render(
        <SorotanTranskrip
          transkrip={teks}
          buktiList={['"tertahan di gudang"']}
        />
      );

      const mark = screen.getByTestId('sorotan-pemicu');
      expect(mark).toBeDefined();
      expect(mark.textContent).toContain('tertahan di gudang');
    });

    it('menangani perbedaan spasi ganda atau newline antar kata', () => {
      const teks = 'Kirimkan   kode   verifikasi sekarang';
      render(
        <SorotanTranskrip
          transkrip={teks}
          buktiList={['kode verifikasi']}
        />
      );

      const mark = screen.getByTestId('sorotan-pemicu');
      expect(mark).toBeDefined();
      expect(mark.textContent).toContain('kode   verifikasi');
    });

    it('menggabungkan rentang sorotan yang tumpang tindih secara rapi tanpa duplikasi karakter', () => {
      const teks = 'Segera transfer biaya pendaftaran sekarang juga.';
      render(
        <SorotanTranskrip
          transkrip={teks}
          buktiList={['transfer biaya', 'biaya pendaftaran']}
        />
      );

      const markElements = screen.getAllByTestId('sorotan-pemicu');
      expect(markElements).toHaveLength(1);
      expect(markElements[0].textContent).toContain('transfer biaya pendaftaran');

      const konten = screen.getByTestId('konten-transkrip');
      const teksBersih = konten.textContent?.replace(/\s*Pemicu/g, '') || '';
      expect(teksBersih).toBe(teks);
    });

    it('menyoroti beberapa kemunculan kata yang sama jika muncul berulang kali', () => {
      const teks = 'Segera telepon kami. Jangan lupa segera hubungi kami.';
      render(
        <SorotanTranskrip
          transkrip={teks}
          buktiList={['segera']}
        />
      );

      const markElements = screen.getAllByTestId('sorotan-pemicu');
      expect(markElements).toHaveLength(2);
    });
  });

  describe('4. Badge Counter, Legenda & Aksesibilitas', () => {
    it('menampilkan badge jumlah pemicu disorot ketika ada sorotan', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={buktiContoh}
        />
      );

      const badgeJumlah = screen.getByTestId('badge-jumlah-sorotan');
      expect(badgeJumlah).toBeDefined();
      expect(badgeJumlah.textContent).toContain('2 pemicu disorot');
    });

    it('menampilkan legenda penjelasan saat ada sorotan', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={buktiContoh}
        />
      );

      const legenda = screen.getByTestId('legenda-sorotan');
      expect(legenda).toBeDefined();
      expect(legenda.textContent).toContain('Arahkan kursor atau sentuh');
    });

    it('meneruskan prop className kustom ke elemen kontainer terluar', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={buktiContoh}
          className="my-kustom-class p-6"
        />
      );

      const container = screen.getByTestId('sorotan-transkrip');
      expect(container.className).toContain('my-kustom-class');
      expect(container.className).toContain('p-6');
    });

    it('tidak menggunakan kata terlarang (aman, pasti, 100%, terbukti) sebagai kesimpulan', () => {
      render(
        <SorotanTranskrip
          transkrip={transkripContoh}
          buktiList={buktiContoh}
        />
      );

      const container = screen.getByTestId('sorotan-transkrip');
      const text = container.textContent?.toLowerCase() || '';

      expect(text).not.toMatch(/\bpasti aman\b/i);
      expect(text).not.toMatch(/\b100%\b/i);
      expect(text).not.toMatch(/\bterbukti asli\b/i);
    });
  });
});
