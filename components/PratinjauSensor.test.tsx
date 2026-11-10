// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  PratinjauSensor,
  renderTeksDenganHighlight,
  type PratinjauSensorProps,
} from './PratinjauSensor';

describe('components/PratinjauSensor.tsx (Task 4.13)', () => {
  const defaultProps: PratinjauSensorProps = {
    isOpen: true,
    teksAsli: 'Halo admin, no HP saya 081234567890 dan email saya test@example.com',
    teksTersensor: 'Halo admin, no HP saya [disensor] dan email saya [disensor]',
    jumlahDiganti: 2,
    onKonfirmasi: vi.fn(),
    onBatal: vi.fn(),
    isLoading: false,
    adaScreenshot: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  describe('renderTeksDenganHighlight Helper', () => {
    it('mengembalikan pesan penjelas ketika teks kosong', () => {
      render(<div>{renderTeksDenganHighlight('')}</div>);
      expect(screen.getByText('Tidak ada teks yang dimasukkan.')).toBeDefined();
    });

    it('merender teks biasa tanpa badge jika tidak ada [disensor]', () => {
      render(<div>{renderTeksDenganHighlight('Ini teks normal tanpa data rahasia')}</div>);
      expect(screen.getByText('Ini teks normal tanpa data rahasia')).toBeDefined();
      expect(screen.queryByTestId('badge-disensor')).toBeNull();
    });

    it('merender badge [disensor] untuk setiap placeholder yang ditemukan', () => {
      render(<div>{renderTeksDenganHighlight('Pesan: [disensor] lalu kirim ke [disensor]')}</div>);
      const badges = screen.getAllByTestId('badge-disensor');
      expect(badges.length).toBe(2);
      badges.forEach((badge) => {
        expect(badge.textContent).toBe('[disensor]');
        expect(badge.className).toContain('bg-amber-100');
      });
    });
  });

  describe('Kondisi Rendering (isOpen)', () => {
    it('tidak merender apapun jika isOpen bernilai false', () => {
      render(<PratinjauSensor {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByTestId('modal-pratinjau-backdrop')).toBeNull();
    });

    it('merender modal dialog jika isOpen bernilai true', () => {
      render(<PratinjauSensor {...defaultProps} isOpen={true} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(screen.getByTestId('modal-pratinjau-backdrop')).toBeDefined();
    });
  });

  describe('Aksesibilitas ARIA dan Dialog', () => {
    it('memiliki atribut role="dialog" dan aria-modal="true"', () => {
      render(<PratinjauSensor {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    it('memiliki aria-labelledby yang menunjuk ke judul modal', () => {
      render(<PratinjauSensor {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBe('pratinjau-sensor-title');

      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).not.toBeNull();
      expect(titleElement?.textContent).toContain('Pratinjau Sensor Data Sensitif');
    });

    it('memiliki aria-describedby yang menunjuk ke deskripsi ringkasan sensor', () => {
      render(<PratinjauSensor {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const describedBy = dialog.getAttribute('aria-describedby');
      expect(describedBy).toBe('pratinjau-sensor-desc');

      const descElement = document.getElementById(describedBy!);
      expect(descElement).not.toBeNull();
      expect(descElement?.textContent).toContain('2 data sensitif berhasil disensor sebelum dikirim');
    });

    it('mengunci scrolling body saat modal dibuka dan mengembalikannya saat ditutup', () => {
      const { unmount } = render(<PratinjauSensor {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Konten Teks dan Ringkasan Sensor', () => {
    it('menampilkan ringkasan jumlah data sensitif yang berhasil disensor', () => {
      render(<PratinjauSensor {...defaultProps} jumlahDiganti={5} />);
      expect(
        screen.getByText('5 data sensitif berhasil disensor sebelum dikirim')
      ).toBeDefined();
    });

    it('menampilkan badge highlight pada teks tersensor', () => {
      render(<PratinjauSensor {...defaultProps} />);
      const container = screen.getByTestId('pratinjau-teks-tersensor');
      expect(container).toBeDefined();

      const badges = screen.getAllByTestId('badge-disensor');
      expect(badges.length).toBe(2);
      expect(container.textContent).toContain('Halo admin, no HP saya [disensor] dan email saya [disensor]');
    });

    it('menampilkan opsi perbandingan teks asli jika teksAsli disediakan', () => {
      render(<PratinjauSensor {...defaultProps} />);
      const detail = screen.getByTestId('detail-teks-asli');
      expect(detail).toBeDefined();

      const kontenAsli = screen.getByTestId('konten-teks-asli');
      expect(kontenAsli.textContent).toBe(defaultProps.teksAsli);
    });

    it('menampilkan indikator bagian kuning jika jumlahDiganti > 0', () => {
      render(<PratinjauSensor {...defaultProps} jumlahDiganti={3} />);
      expect(screen.getByText('Bagian bertanda kuning disensor')).toBeDefined();
    });

    it('tidak menampilkan indikator bagian kuning jika jumlahDiganti === 0', () => {
      render(<PratinjauSensor {...defaultProps} jumlahDiganti={0} />);
      expect(screen.queryByText('Bagian bertanda kuning disensor')).toBeNull();
    });
  });

  describe('Peringatan Screenshot (Requirement 12.3)', () => {
    it('tidak menampilkan peringatan screenshot jika adaScreenshot bernilai false atau tidak diberikan', () => {
      render(<PratinjauSensor {...defaultProps} adaScreenshot={false} />);
      expect(screen.queryByTestId('peringatan-screenshot')).toBeNull();
    });

    it('menampilkan peringatan screenshot dengan role="alert" saat adaScreenshot bernilai true', () => {
      render(<PratinjauSensor {...defaultProps} adaScreenshot={true} />);
      const alertBox = screen.getByTestId('peringatan-screenshot');
      expect(alertBox).toBeDefined();
      expect(alertBox.getAttribute('role')).toBe('alert');
      expect(alertBox.textContent).toContain('Gambar tidak bisa disensor otomatis');
      expect(alertBox.textContent).toContain('potong atau tutup data pribadi');
    });
  });

  describe('Tombol Aksi dan Target Sentuh (Requirement 27.2)', () => {
    it('memiliki tombol Lanjut Periksa dan Batal / Edit Kembali', () => {
      render(<PratinjauSensor {...defaultProps} />);
      expect(screen.getByTestId('btn-lanjut-periksa')).toBeDefined();
      expect(screen.getByTestId('btn-batal')).toBeDefined();
      expect(screen.getByTestId('btn-tutup-modal')).toBeDefined();
    });

    it('memastikan semua tombol memenuhi target sentuh minimal 44px', () => {
      render(<PratinjauSensor {...defaultProps} />);

      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      const btnBatal = screen.getByTestId('btn-batal');
      const btnTutup = screen.getByTestId('btn-tutup-modal');

      expect(btnLanjut.className).toContain('min-h-[44px]');
      expect(btnBatal.className).toContain('min-h-[44px]');
      expect(btnTutup.className).toContain('min-h-[44px]');
      expect(btnTutup.className).toContain('min-w-[44px]');
    });

    it('memanggil onKonfirmasi saat tombol Lanjut Periksa diklik', () => {
      const onKonfirmasi = vi.fn();
      render(<PratinjauSensor {...defaultProps} onKonfirmasi={onKonfirmasi} />);

      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      expect(onKonfirmasi).toHaveBeenCalledTimes(1);
    });

    it('memanggil onBatal saat tombol Batal / Edit Kembali diklik', () => {
      const onBatal = vi.fn();
      render(<PratinjauSensor {...defaultProps} onBatal={onBatal} />);

      const btnBatal = screen.getByTestId('btn-batal');
      fireEvent.click(btnBatal);

      expect(onBatal).toHaveBeenCalledTimes(1);
    });

    it('memanggil onBatal saat tombol silang (tutup) diklik', () => {
      const onBatal = vi.fn();
      render(<PratinjauSensor {...defaultProps} onBatal={onBatal} />);

      const btnTutup = screen.getByTestId('btn-tutup-modal');
      fireEvent.click(btnTutup);

      expect(onBatal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Memproses / Loading', () => {
    it('menampilkan spinner dan teks Memproses... saat isLoading bernilai true', () => {
      render(<PratinjauSensor {...defaultProps} isLoading={true} />);

      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      expect(btnLanjut.getAttribute('disabled')).not.toBeNull();
      expect(btnLanjut.getAttribute('aria-busy')).toBe('true');
      expect(screen.getByTestId('spinner-loading')).toBeDefined();
      expect(screen.getByText('Memproses...')).toBeDefined();
    });

    it('menonaktifkan tombol aksi selama isLoading bernilai true', () => {
      const onKonfirmasi = vi.fn();
      const onBatal = vi.fn();

      render(
        <PratinjauSensor
          {...defaultProps}
          isLoading={true}
          onKonfirmasi={onKonfirmasi}
          onBatal={onBatal}
        />
      );

      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      const btnBatal = screen.getByTestId('btn-batal');
      const btnTutup = screen.getByTestId('btn-tutup-modal');

      expect(btnLanjut.getAttribute('disabled')).not.toBeNull();
      expect(btnBatal.getAttribute('disabled')).not.toBeNull();
      expect(btnTutup.getAttribute('disabled')).not.toBeNull();

      fireEvent.click(btnLanjut);
      fireEvent.click(btnBatal);
      expect(onKonfirmasi).not.toHaveBeenCalled();
      expect(onBatal).not.toHaveBeenCalled();
    });
  });

  describe('Interaksi Keyboard dan Backdrop Click', () => {
    it('memanggil onBatal saat tombol Escape ditekan', () => {
      const onBatal = vi.fn();
      render(<PratinjauSensor {...defaultProps} onBatal={onBatal} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onBatal).toHaveBeenCalledTimes(1);
    });

    it('memanggil onBatal saat mengklik backdrop luar modal', () => {
      const onBatal = vi.fn();
      render(<PratinjauSensor {...defaultProps} onBatal={onBatal} />);

      const backdrop = screen.getByTestId('modal-pratinjau-backdrop');
      fireEvent.click(backdrop);

      expect(onBatal).toHaveBeenCalledTimes(1);
    });

    it('tidak memanggil onBatal saat mengklik backdrop jika isLoading bernilai true', () => {
      const onBatal = vi.fn();
      render(<PratinjauSensor {...defaultProps} isLoading={true} onBatal={onBatal} />);

      const backdrop = screen.getByTestId('modal-pratinjau-backdrop');
      fireEvent.click(backdrop);

      expect(onBatal).not.toHaveBeenCalled();
    });

    it('tidak memanggil onBatal saat mengklik di dalam konten dialog', () => {
      const onBatal = vi.fn();
      render(<PratinjauSensor {...defaultProps} onBatal={onBatal} />);

      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(onBatal).not.toHaveBeenCalled();
    });

    it('mengatur siklus focus trap saat menekan Tab dan Shift+Tab', () => {
      render(<PratinjauSensor {...defaultProps} />);

      const btnTutup = screen.getByTestId('btn-tutup-modal');
      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');

      btnTutup.focus();
      expect(document.activeElement).toBe(btnTutup);

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(btnLanjut);

      btnLanjut.focus();
      expect(document.activeElement).toBe(btnLanjut);

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(btnTutup);
    });
  });
});
