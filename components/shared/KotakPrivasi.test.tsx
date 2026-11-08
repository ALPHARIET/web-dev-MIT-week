// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  KotakPrivasi,
  DATA_PRIVASI_PER_HALAMAN,
  ShieldLockIcon,
  AlertWarningIcon,
  CheckCircleIcon,
} from './KotakPrivasi';

describe('components/shared/KotakPrivasi.tsx (Task 4.9)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Peringatan Utama & Jaminan Privasi (Requirement 8.2, 31.1, 31.3)', () => {
    const halamanList = ['chat', 'link', 'video'] as const;

    halamanList.forEach((halaman) => {
      it(`selalu menampilkan peringatan utama data sensitif pada halaman "${halaman}" (Requirement 8.2)`, () => {
        render(<KotakPrivasi halaman={halaman} />);

        const peringatanEl = screen.getByTestId('peringatan-sensitif');
        expect(peringatanEl).toBeDefined();

        // Verifikasi kalimat peringatan utama persis seperti yang disyaratkan
        expect(peringatanEl.textContent?.toLowerCase()).toContain(
          'jangan masukkan otp, pin, password, atau nomor rekening asli'
        );
      });

      it(`selalu menampilkan jaminan privasi "Tanpa login, input tidak disimpan setelah sesi selesai" pada halaman "${halaman}"`, () => {
        render(<KotakPrivasi halaman={halaman} />);

        const jaminanEl = screen.getByTestId('jaminan-privasi');
        expect(jaminanEl).toBeDefined();
        expect(jaminanEl.textContent).toContain(
          'Tanpa login, input tidak disimpan setelah sesi selesai'
        );
      });
    });
  });

  describe('Cek Chat - Informasi Pihak Ketiga & Privasi (Requirement 8.3, 8.4)', () => {
    it('merender KotakPrivasi untuk halaman chat dengan benar', () => {
      render(<KotakPrivasi halaman="chat" />);

      const container = screen.getByTestId('kotak-privasi');
      expect(container.getAttribute('data-halaman')).toBe('chat');
      expect(screen.getByText(/Cek Chat/i)).toBeDefined();
    });

    it('menyebutkan Google Gemini sebagai layanan pihak ketiga di Cek Chat (Requirement 8.4)', () => {
      render(<KotakPrivasi halaman="chat" />);

      const badgeList = screen.getAllByTestId('badge-layanan');
      const badgeTexts = badgeList.map((el) => el.textContent);
      expect(badgeTexts).toContain('Google Gemini');

      const deskripsi = screen.getByTestId('deskripsi-layanan');
      expect(deskripsi.textContent).toContain(
        'Teks atau screenshot akan dikirim ke Google Gemini untuk dianalisis. Jangan sertakan OTP, PIN, password, atau nomor rekening. Tutup nama dan nomor HP di screenshot kalau bisa.'
      );
    });

    it('tidak menampilkan catatan transparansi video P1 pada halaman chat', () => {
      render(<KotakPrivasi halaman="chat" />);
      expect(screen.queryByTestId('catatan-transparansi')).toBeNull();
    });
  });

  describe('Cek Link - Informasi Pihak Ketiga & Privasi (Requirement 8.3, 8.5)', () => {
    it('merender KotakPrivasi untuk halaman link dengan benar', () => {
      render(<KotakPrivasi halaman="link" />);

      const container = screen.getByTestId('kotak-privasi');
      expect(container.getAttribute('data-halaman')).toBe('link');
      expect(screen.getByText(/Cek Link/i)).toBeDefined();
    });

    it('menyebutkan Google Safe Browsing dan layanan data domain serta link tidak dibuka (Requirement 8.5)', () => {
      render(<KotakPrivasi halaman="link" />);

      const badgeList = screen.getAllByTestId('badge-layanan');
      const badgeTexts = badgeList.map((el) => el.textContent);
      expect(badgeTexts.some((text) => text?.includes('Google Safe Browsing'))).toBe(true);
      expect(badgeTexts.some((text) => text?.includes('Layanan Data Domain'))).toBe(true);

      const deskripsi = screen.getByTestId('deskripsi-layanan');
      expect(deskripsi.textContent).toBe(
        'Alamat link dikirim ke Google Safe Browsing dan layanan data domain untuk dicek. Link tidak akan kami buka.'
      );
    });

    it('tidak menampilkan catatan transparansi video P1 pada halaman link', () => {
      render(<KotakPrivasi halaman="link" />);
      expect(screen.queryByTestId('catatan-transparansi')).toBeNull();
    });
  });

  describe('Cek Video & Suara - Informasi Pihak Ketiga & Privasi (Requirement 8.3, 23.3)', () => {
    it('merender KotakPrivasi untuk halaman video dengan benar', () => {
      render(<KotakPrivasi halaman="video" />);

      const container = screen.getByTestId('kotak-privasi');
      expect(container.getAttribute('data-halaman')).toBe('video');
      expect(screen.getByText(/Cek Video & Suara/i)).toBeDefined();
    });

    it('menjelaskan bahwa penilaian konteks dijalankan sepenuhnya di peramban tanpa kirim ke server luar', () => {
      render(<KotakPrivasi halaman="video" />);

      const deskripsi = screen.getByTestId('deskripsi-layanan');
      expect(deskripsi.textContent).toBe(
        'Penilaian konteks situasi dijalankan sepenuhnya di peramban tanpa mengirim data ke server luar.'
      );
    });

    it('memuat catatan transparansi untuk fitur analisis media P1 (Reality Defender)', () => {
      render(<KotakPrivasi halaman="video" />);

      const catatan = screen.getByTestId('catatan-transparansi');
      expect(catatan).toBeDefined();
      expect(catatan.textContent).toContain(
        'Jika fitur analisis media (P1) diaktifkan, frame gambar atau audio dikirim ke Reality Defender tanpa menyimpan file.'
      );
    });
  });

  describe('Kustomisasi & Desain Ramah Pengguna (Requirement 27.3)', () => {
    it('menerapkan kelas CSS kustom melalui prop className', () => {
      render(<KotakPrivasi halaman="chat" className="custom-test-class mb-6 shadow-lg" />);

      const container = screen.getByTestId('kotak-privasi');
      expect(container.classList.contains('custom-test-class')).toBe(true);
      expect(container.classList.contains('mb-6')).toBe(true);
      expect(container.classList.contains('shadow-lg')).toBe(true);
    });

    it('memiliki role="region" dan aria-label yang deskriptif untuk aksesibilitas', () => {
      render(<KotakPrivasi halaman="chat" />);

      const container = screen.getByTestId('kotak-privasi');
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-label')).toBe(
        'Pemberitahuan privasi dan layanan pihak ketiga'
      );
    });

    it('merender ikon perisai privasi dengan aria-hidden="true"', () => {
      render(<KotakPrivasi halaman="chat" />);

      const icon = screen.getByTestId('ikon-perisai-privasi');
      expect(icon).toBeDefined();
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('merender komponen ikon mandiri dengan benar', () => {
      const { container: shieldContainer } = render(<ShieldLockIcon className="w-8 h-8 text-blue-500" />);
      const shieldSvg = shieldContainer.querySelector('svg');
      expect(shieldSvg?.classList.contains('w-8')).toBe(true);

      const { container: alertContainer } = render(<AlertWarningIcon className="w-6 h-6 text-amber-600" />);
      const alertSvg = alertContainer.querySelector('svg');
      expect(alertSvg?.classList.contains('w-6')).toBe(true);

      const { container: checkContainer } = render(<CheckCircleIcon className="w-5 h-5 text-emerald-600" />);
      const checkSvg = checkContainer.querySelector('svg');
      expect(checkSvg?.classList.contains('w-5')).toBe(true);
    });
  });

  describe('Pencegahan Kata Terlarang sebagai Kesimpulan (Requirement 30.1)', () => {
    it('tidak menggunakan kata "aman", "pasti", "terbukti", atau "100%" sebagai klaim garansi kesimpulan', () => {
      const halamanList = ['chat', 'link', 'video'] as const;

      halamanList.forEach((halaman) => {
        const { unmount } = render(<KotakPrivasi halaman={halaman} />);
        const container = screen.getByTestId('kotak-privasi');
        const textContent = container.textContent || '';

        // Pastikan tidak ada frase klaim keamanan palsu
        expect(textContent.toLowerCase()).not.toContain('pasti aman');
        expect(textContent.toLowerCase()).not.toContain('terbukti aman');
        expect(textContent.toLowerCase()).not.toContain('100% aman');
        expect(textContent.toLowerCase()).not.toContain('dijamin aman');

        unmount();
      });
    });
  });

  describe('Integritas Objek Konfigurasi DATA_PRIVASI_PER_HALAMAN', () => {
    it('menyediakan konfigurasi lengkap untuk ketiga jenis halaman', () => {
      expect(DATA_PRIVASI_PER_HALAMAN.chat).toBeDefined();
      expect(DATA_PRIVASI_PER_HALAMAN.link).toBeDefined();
      expect(DATA_PRIVASI_PER_HALAMAN.video).toBeDefined();

      expect(DATA_PRIVASI_PER_HALAMAN.chat.layananPihakKetiga).toContain('Google Gemini');
      expect(DATA_PRIVASI_PER_HALAMAN.link.layananPihakKetiga).toContain('Google Safe Browsing');
      expect(DATA_PRIVASI_PER_HALAMAN.video.catatanTransparansi).toBeDefined();
    });
  });
});
