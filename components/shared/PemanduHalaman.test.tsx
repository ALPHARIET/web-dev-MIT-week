// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import {
  PemanduHalaman,
  usePemanduHalaman,
  PESAN_PEMANDU,
  JUDUL_PEMANDU,
  type PemicuPemandu,
} from './PemanduHalaman';
import CekLinkPage from '@/app/cek-link/page';

describe('components/shared/PemanduHalaman.tsx — Pemandu Halaman Berbasis Skrip (Task 21.1 / Requirement LN-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('1. Tiga Pemicu Skrip Kontekstual (Requirement LN-09)', () => {
    it('merender panduan fokus dengan teks dan atribut yang sesuai', () => {
      render(<PemanduHalaman pemicu="fokus" />);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('fokus');

      const judul = screen.getByTestId('judul-pemandu');
      expect(judul.textContent).toBe(JUDUL_PEMANDU.fokus);

      const pesan = screen.getByTestId('pesan-pemandu');
      expect(pesan.textContent).toBe(
        'Ketik atau tempel URL lengkap, misalnya https://nama-situs.com/promo...'
      );
      expect(pesan.textContent).toBe(PESAN_PEMANDU.fokus);
    });

    it('merender panduan submit_kosong saat tombol periksa ditekan sebelum kolom terisi', () => {
      render(<PemanduHalaman pemicu="submit_kosong" />);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('submit_kosong');

      const judul = screen.getByTestId('judul-pemandu');
      expect(judul.textContent).toBe(JUDUL_PEMANDU.submit_kosong);

      const pesan = screen.getByTestId('pesan-pemandu');
      expect(pesan.textContent).toBe(
        "Kolom link masih kosong. Masukkan URL atau coba tombol 'Coba contoh' di atas..."
      );
      expect(pesan.textContent).toBe(PESAN_PEMANDU.submit_kosong);
    });

    it('merender panduan idle_8s dengan teks edukatif saat pengguna terdiam di halaman', () => {
      render(<PemanduHalaman pemicu="idle_8s" />);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('idle_8s');

      const judul = screen.getByTestId('judul-pemandu');
      expect(judul.textContent).toBe(JUDUL_PEMANDU.idle_8s);

      const pesan = screen.getByTestId('pesan-pemandu');
      expect(pesan.textContent).toBe(
        "Butuh ide link mencurigakan? Klik 'Coba contoh' untuk mencoba skenario link hadiah atau tiruan bank..."
      );
      expect(pesan.textContent).toBe(PESAN_PEMANDU.idle_8s);
    });

    it('tidak merender apapun saat pemicu bernilai null atau undefined', () => {
      const { container } = render(<PemanduHalaman pemicu={null} />);
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
      expect(container.firstChild).toBeNull();
    });

    it('tidak merender apapun saat terbuka={false} atau isOpen={false}', () => {
      const { rerender } = render(<PemanduHalaman pemicu="fokus" terbuka={false} />);
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();

      rerender(<PemanduHalaman pemicu="fokus" isOpen={false} />);
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('mendukung pesan dan judul kustom melalui prop', () => {
      render(
        <PemanduHalaman
          pemicu="fokus"
          pesan="Ini pesan kustom panduan"
          judul="Judul Kustom"
        />
      );

      expect(screen.getByTestId('pesan-pemandu').textContent).toBe(
        'Ini pesan kustom panduan'
      );
      expect(screen.getByTestId('judul-pemandu').textContent).toBe('Judul Kustom');
    });
  });

  describe('2. Penutupan Tooltip (Manual via Tombol X & Otomatis saat Mengetik)', () => {
    it('dapat ditutup secara manual melalui tombol silang "X"', () => {
      const onTutup = vi.fn();
      const onClose = vi.fn();

      render(
        <PemanduHalaman
          pemicu="fokus"
          onTutup={onTutup}
          onClose={onClose}
        />
      );

      const tombolTutup = screen.getByTestId('tombol-tutup-pemandu');
      expect(tombolTutup).toBeDefined();

      fireEvent.click(tombolTutup);

      expect(onTutup).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('dapat ditutup secara otomatis saat pengguna mulai mengetik di halaman', () => {
      const onClose = vi.fn();

      render(
        <div>
          <PemanduHalaman pemicu="fokus" onClose={onClose} />
          <input data-testid="input-pengujian" type="text" />
        </div>
      );

      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();

      const input = screen.getByTestId('input-pengujian');
      fireEvent.input(input, { target: { value: 'https://' } });

      expect(onClose).toHaveBeenCalled();
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('dapat ditutup menggunakan tombol Escape', () => {
      const onClose = vi.fn();
      render(<PemanduHalaman pemicu="fokus" onClose={onClose} />);

      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });
  });

  describe('3. Aksesibilitas & Ukuran Target Sentuh (Requirement 4, 27.2)', () => {
    it('memastikan tombol penutup memiliki ukuran target sentuh minimal 44px', () => {
      render(<PemanduHalaman pemicu="fokus" />);

      const tombolTutup = screen.getByTestId('tombol-tutup-pemandu');
      expect(tombolTutup.className).toMatch(/min-h-\[44px\]/);
      expect(tombolTutup.className).toMatch(/min-w-\[44px\]/);
      expect(tombolTutup.getAttribute('aria-label')).toBe('Tutup panduan');
    });

    it('memiliki role="status" dan aria-live="polite" untuk screen reader', () => {
      render(<PemanduHalaman pemicu="fokus" />);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu.getAttribute('role')).toBe('status');
      expect(pemandu.getAttribute('aria-live')).toBe('polite');
    });

    it('menampilkan ikon pemandu dengan aria-hidden="true"', () => {
      render(<PemanduHalaman pemicu="fokus" />);

      const ikon = screen.getByTestId('ikon-pemandu');
      expect(ikon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('4. Bebas Kata Terlarang (Requirement 5, 30.1)', () => {
    it('tidak memuat kata terlarang ("aman", "pasti", "terbukti", "100%") sebagai klaim atau kesimpulan', () => {
      const pemicuList: PemicuPemandu[] = ['fokus', 'submit_kosong', 'idle_8s'];
      const kataTerlarangRegex = /\b(aman|pasti|terbukti|100%)\b/i;

      pemicuList.forEach((pemicu) => {
        const pesan = PESAN_PEMANDU[pemicu];
        const judul = JUDUL_PEMANDU[pemicu];

        expect(pesan).not.toMatch(kataTerlarangRegex);
        expect(judul).not.toMatch(kataTerlarangRegex);

        const { unmount } = render(<PemanduHalaman pemicu={pemicu} />);
        const teks = screen.getByTestId('pemandu-halaman').textContent || '';
        expect(teks).not.toMatch(kataTerlarangRegex);
        unmount();
      });
    });
  });

  describe('5. Hook usePemanduHalaman (State & Timer 8 Detik)', () => {
    function TestHarness({
      idleTimeoutMs = 8000,
      enabled = true,
    }: {
      idleTimeoutMs?: number;
      enabled?: boolean;
    }) {
      const {
        pemicu,
        handleFokus,
        handleSubmitKosong,
        handleKetik,
        handleTutup,
        resetPemandu,
        isOpen,
      } = usePemanduHalaman({ idleTimeoutMs, enabled });

      return (
        <div>
          <span data-testid="status-pemicu">{pemicu ?? 'null'}</span>
          <span data-testid="status-is-open">{isOpen ? 'open' : 'closed'}</span>
          <button data-testid="btn-fokus" onClick={handleFokus}>
            Fokus
          </button>
          <button data-testid="btn-submit-kosong" onClick={handleSubmitKosong}>
            Submit Kosong
          </button>
          <button data-testid="btn-ketik" onClick={handleKetik}>
            Ketik
          </button>
          <button data-testid="btn-tutup" onClick={handleTutup}>
            Tutup
          </button>
          <button data-testid="btn-reset" onClick={resetPemandu}>
            Reset
          </button>
          <PemanduHalaman pemicu={pemicu} onTutup={handleTutup} />
        </div>
      );
    }

    it('memulai dengan pemicu null dan isOpen false', () => {
      render(<TestHarness />);

      expect(screen.getByTestId('status-pemicu').textContent).toBe('null');
      expect(screen.getByTestId('status-is-open').textContent).toBe('closed');
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('mengubah pemicu ke "fokus" saat handleFokus dipanggil', () => {
      render(<TestHarness />);

      fireEvent.click(screen.getByTestId('btn-fokus'));

      expect(screen.getByTestId('status-pemicu').textContent).toBe('fokus');
      expect(screen.getByTestId('status-is-open').textContent).toBe('open');
      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();
    });

    it('mengubah pemicu ke "submit_kosong" saat handleSubmitKosong dipanggil', () => {
      render(<TestHarness />);

      fireEvent.click(screen.getByTestId('btn-submit-kosong'));

      expect(screen.getByTestId('status-pemicu').textContent).toBe('submit_kosong');
      expect(screen.getByTestId('status-is-open').textContent).toBe('open');
      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();
    });

    it('menutup tooltip saat handleKetik dipanggil', () => {
      render(<TestHarness />);

      fireEvent.click(screen.getByTestId('btn-fokus'));
      expect(screen.getByTestId('status-is-open').textContent).toBe('open');

      fireEvent.click(screen.getByTestId('btn-ketik'));
      expect(screen.getByTestId('status-pemicu').textContent).toBe('null');
      expect(screen.getByTestId('status-is-open').textContent).toBe('closed');
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('menutup tooltip saat handleTutup dipanggil', () => {
      render(<TestHarness />);

      fireEvent.click(screen.getByTestId('btn-submit-kosong'));
      expect(screen.getByTestId('status-is-open').textContent).toBe('open');

      fireEvent.click(screen.getByTestId('btn-tutup'));
      expect(screen.getByTestId('status-pemicu').textContent).toBe('null');
      expect(screen.getByTestId('status-is-open').textContent).toBe('closed');
    });

    it('memicu idle_8s setelah 8 detik tanpa mengetik di halaman', () => {
      vi.useFakeTimers();
      render(<TestHarness idleTimeoutMs={8000} />);

      expect(screen.getByTestId('status-pemicu').textContent).toBe('null');

      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(screen.getByTestId('status-pemicu').textContent).toBe('idle_8s');
      expect(screen.getByTestId('status-is-open').textContent).toBe('open');
      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();
    });

    it('tidak memicu idle_8s jika pengguna sudah mulai mengetik sebelum 8 detik', () => {
      vi.useFakeTimers();
      render(<TestHarness idleTimeoutMs={8000} />);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      fireEvent.click(screen.getByTestId('btn-ketik'));

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.getByTestId('status-pemicu').textContent).toBe('null');
      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });
  });

  describe('6. Integrasi Pemandu Halaman di Cek Link (app/cek-link/page.tsx)', () => {
    it('menampilkan panduan fokus saat input link difokuskan', () => {
      render(<CekLinkPage />);

      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();

      const input = screen.getByTestId('input-link');
      fireEvent.focus(input);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('fokus');
      expect(screen.getByTestId('pesan-pemandu').textContent).toContain(
        'Ketik atau tempel URL lengkap'
      );
    });

    it('menampilkan panduan fokus saat input link disentuh di perangkat mobile (touch)', () => {
      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.touchStart(input);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('fokus');
    });

    it('menampilkan panduan submit_kosong saat tombol Periksa ditekan saat input masih kosong', () => {
      render(<CekLinkPage />);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('submit_kosong');
      expect(screen.getByTestId('pesan-pemandu').textContent).toContain(
        'Kolom link masih kosong'
      );
    });

    it('menutup tooltip pemandu saat pengguna mulai mengetik di kolom input link', () => {
      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.focus(input);
      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();

      fireEvent.change(input, { target: { value: 'https://nama-situs.com' } });

      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('menutup tooltip pemandu saat tombol silang X ditekan di halaman Cek Link', () => {
      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.focus(input);
      expect(screen.getByTestId('pemandu-halaman')).toBeDefined();

      const tombolTutup = screen.getByTestId('tombol-tutup-pemandu');
      fireEvent.click(tombolTutup);

      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();
    });

    it('menampilkan tooltip edukatif idle_8s setelah pengguna terdiam 8 detik di halaman Cek Link', () => {
      vi.useFakeTimers();
      render(<CekLinkPage />);

      expect(screen.queryByTestId('pemandu-halaman')).toBeNull();

      act(() => {
        vi.advanceTimersByTime(8000);
      });

      const pemandu = screen.getByTestId('pemandu-halaman');
      expect(pemandu).toBeDefined();
      expect(pemandu.getAttribute('data-pemicu')).toBe('idle_8s');
      expect(screen.getByTestId('pesan-pemandu').textContent).toContain(
        'Butuh ide link mencurigakan?'
      );
    });
  });
});
