// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { InputLink } from './InputLink';

describe('components/input/InputLink.tsx (Task 8.1)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering Elemen Dasar & Label (Requirements 17.1, 27.4)', () => {
    it('merender elemen input dengan label, placeholder, dan batas maxLength 2.000', () => {
      render(<InputLink onSubmit={vi.fn()} />);

      const label = screen.getByTestId('label-input-link');
      expect(label).toBeDefined();
      expect(label.getAttribute('for')).toBe('input-link-field');
      expect(label.textContent).toContain('Alamat URL atau Domain');

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.id).toBe('input-link-field');
      expect(input.placeholder).toContain('Contoh:');
      expect(input.maxLength).toBe(2000);
      expect(input.value).toBe('');

      const counter = screen.getByTestId('counter-karakter');
      expect(counter.textContent).toBe('0/2.000');

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa).toBeDefined();
      expect(tombolPeriksa.textContent).toContain('Periksa');
    });

    it('mengisi nilai awal input saat prop initialUrl diberikan', () => {
      const initial = 'https://sh0pee-promo.co.id';
      render(<InputLink onSubmit={vi.fn()} initialUrl={initial} />);

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.value).toBe(initial);

      const counter = screen.getByTestId('counter-karakter');
      expect(counter.textContent).toBe(`${initial.length}/2.000`);
    });

    it('menerapkan className kustom ke elemen form pembungkus', () => {
      render(<InputLink onSubmit={vi.fn()} className="kustom-class-form" />);

      const form = screen.getByTestId('form-input-link');
      expect(form.classList.contains('kustom-class-form')).toBe(true);
    });
  });

  describe('Fitur Keamanan Kritis: Link Sebagai Teks Biasa (Requirements 17.2, 17.5)', () => {
    it('menampilkan pratinjau alamat sebagai teks biasa murni dan TIDAK PERNAH sebagai tag <a> yang bisa diklik', () => {
      const urlMencurigakan = 'https://phishing-bank-bca.com/login?token=bahaya';
      const { container } = render(
        <InputLink onSubmit={vi.fn()} initialUrl={urlMencurigakan} />
      );

      const pratinjau = screen.getByTestId('pratinjau-alamat');
      expect(pratinjau).toBeDefined();

      const teksPratinjau = screen.getByTestId('teks-pratinjau-url');
      expect(teksPratinjau).toBeDefined();
      expect(teksPratinjau.textContent).toBe(urlMencurigakan);
      expect(teksPratinjau.tagName.toLowerCase()).not.toBe('a');

      const allAnchorTags = container.querySelectorAll('a');
      expect(allAnchorTags.length).toBe(0);

      const allHrefElements = container.querySelectorAll('[href]');
      expect(allHrefElements.length).toBe(0);

      const badge = screen.getByTestId('badge-keamanan-teks');
      expect(badge.textContent?.toLowerCase()).toContain('teks biasa');
    });

    it('memperbarui teks pratinjau saat pengguna mengetik URL', () => {
      render(<InputLink onSubmit={vi.fn()} />);

      expect(screen.queryByTestId('pratinjau-alamat')).toBeNull();

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, { target: { value: 'https://undian-palsu.net' } });

      const pratinjau = screen.getByTestId('pratinjau-alamat');
      expect(pratinjau).toBeDefined();

      const teks = screen.getByTestId('teks-pratinjau-url');
      expect(teks.textContent).toBe('https://undian-palsu.net');
      expect(teks.tagName.toLowerCase()).not.toBe('a');
    });
  });

  describe('Validasi Input Kosong & Hanya Spasi', () => {
    it('menampilkan pesan validasi dan mencegah pemanggilan onSubmit saat input kosong', () => {
      const onSubmit = vi.fn();
      render(<InputLink onSubmit={onSubmit} />);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      const errorMsg = screen.getByTestId('pesan-validasi');
      expect(errorMsg).toBeDefined();
      expect(errorMsg.textContent).toContain('Masukkan URL atau nama domain');

      expect(onSubmit).not.toHaveBeenCalled();

      const input = screen.getByTestId('input-link');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('menampilkan pesan validasi saat input hanya berisi spasi/tab/newline', () => {
      const onSubmit = vi.fn();
      render(<InputLink onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, { target: { value: '    \t   ' } });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      expect(screen.getByTestId('pesan-validasi')).toBeDefined();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('menghilangkan pesan validasi saat pengguna mulai mengetik input baru', () => {
      const onSubmit = vi.fn();
      render(<InputLink onSubmit={onSubmit} />);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);
      expect(screen.getByTestId('pesan-validasi')).toBeDefined();

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, { target: { value: 'google.com' } });

      expect(screen.queryByTestId('pesan-validasi')).toBeNull();
      expect(input.getAttribute('aria-invalid')).toBe('false');
    });
  });

  describe('Tombol Bersihkan Input', () => {
    it('tidak menampilkan tombol bersihkan saat input masih kosong', () => {
      render(<InputLink onSubmit={vi.fn()} />);

      expect(screen.queryByTestId('tombol-bersihkan')).toBeNull();
    });

    it('menampilkan tombol bersihkan ketika kolom telah terisi', () => {
      render(<InputLink onSubmit={vi.fn()} initialUrl="dana-kaget.site" />);

      const tombolBersihkan = screen.getByTestId('tombol-bersihkan');
      expect(tombolBersihkan).toBeDefined();
      expect(tombolBersihkan.getAttribute('aria-label')).toBe('Bersihkan input URL');
    });

    it('mengosongkan input dan menghapus pesan error saat tombol bersihkan diklik', () => {
      render(<InputLink onSubmit={vi.fn()} initialUrl="bri-poin.xyz" />);

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.value).toBe('bri-poin.xyz');

      const tombolBersihkan = screen.getByTestId('tombol-bersihkan');
      fireEvent.click(tombolBersihkan);

      expect(input.value).toBe('');
      expect(screen.queryByTestId('tombol-bersihkan')).toBeNull();
      expect(screen.queryByTestId('pratinjau-alamat')).toBeNull();
      expect(screen.queryByTestId('pesan-validasi')).toBeNull();
    });
  });

  describe('Pengiriman Form & onSubmit', () => {
    it('memanggil onSubmit dengan URL yang sudah di-trim saat tombol Periksa diklik', () => {
      const onSubmit = vi.fn();
      render(<InputLink onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, { target: { value: '  https://shopee.co.id/promo  ' } });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('https://shopee.co.id/promo');
    });

    it('memanggil onSubmit saat pengguna menekan tombol Enter pada form', () => {
      const onSubmit = vi.fn();
      render(<InputLink onSubmit={onSubmit} />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, { target: { value: 'bca.id-update.com' } });

      const form = screen.getByTestId('form-input-link');
      fireEvent.submit(form);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('bca.id-update.com');
    });
  });

  describe('Status Loading (isLoading)', () => {
    it('menonaktifkan input dan tombol periksa serta menampilkan spinner loading', () => {
      render(
        <InputLink
          onSubmit={vi.fn()}
          initialUrl="https://example.com"
          isLoading={true}
        />
      );

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.disabled).toBe(true);

      const tombolPeriksa = screen.getByTestId('tombol-periksa') as HTMLButtonElement;
      expect(tombolPeriksa.disabled).toBe(true);
      expect(tombolPeriksa.getAttribute('aria-busy')).toBe('true');
      expect(tombolPeriksa.textContent).toContain('Memeriksa...');

      const spinner = screen.getByTestId('spinner-loading');
      expect(spinner).toBeDefined();

      expect(screen.queryByTestId('tombol-bersihkan')).toBeNull();
    });
  });

  describe('Sinkronisasi initialUrl Eksternal', () => {
    it('memperbarui nilai input ketika prop initialUrl berubah dari luar', () => {
      const { rerender } = render(
        <InputLink onSubmit={vi.fn()} initialUrl="link-pertama.com" />
      );

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.value).toBe('link-pertama.com');

      rerender(<InputLink onSubmit={vi.fn()} initialUrl="link-kedua.com" />);
      expect(input.value).toBe('link-kedua.com');
      expect(screen.getByTestId('teks-pratinjau-url').textContent).toBe(
        'link-kedua.com'
      );
    });
  });

  describe('Target Sentuh & Aksesibilitas (Requirement 27.2)', () => {
    it('memastikan tombol periksa memiliki ukuran target sentuh minimal 44px', () => {
      render(<InputLink onSubmit={vi.fn()} />);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('memastikan tombol bersihkan memiliki target sentuh minimal 44px', () => {
      render(<InputLink onSubmit={vi.fn()} initialUrl="https://test.com" />);

      const tombolBersihkan = screen.getByTestId('tombol-bersihkan');
      expect(tombolBersihkan.classList.contains('min-h-[44px]')).toBe(true);
      expect(tombolBersihkan.classList.contains('min-w-[44px]')).toBe(true);
    });

    it('memastikan input memiliki tinggi minimal setidaknya 44px (min-h-[48px])', () => {
      render(<InputLink onSubmit={vi.fn()} />);

      const input = screen.getByTestId('input-link');
      expect(input.classList.contains('min-h-[48px]')).toBe(true);
    });
  });

  describe('Kepatuhan Kata Terlarang (Requirements 2.4, 6.7, 30.1)', () => {
    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai klaim kesimpulan', () => {
      render(<InputLink onSubmit={vi.fn()} initialUrl="https://contoh-link.com" />);

      const form = screen.getByTestId('form-input-link');
      const text = form.textContent || '';
      const prohibitedRegex = /\b(pasti|terbukti|100%)\b/i;
      expect(text).not.toMatch(prohibitedRegex);
    });
  });
});
