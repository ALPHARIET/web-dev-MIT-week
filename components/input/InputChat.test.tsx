// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import {
  InputChat,
  validateImageMagicBytes,
  formatUkuranFile,
  type ChatInputData,
} from './InputChat';

function createMockFile(
  name: string,
  type: string,
  magicBytes: number[],
  size = 64
): File {
  const buffer = new Uint8Array(size);
  magicBytes.forEach((byte, index) => {
    buffer[index] = byte;
  });
  return new File([buffer], name, { type, lastModified: Date.now() });
}

describe('components/input/InputChat.tsx (Task 7.1)', () => {
  const validJpgFile = createMockFile(
    'bukti-chat.jpg',
    'image/jpeg',
    [0xff, 0xd8, 0xff, 0xe0]
  );
  const validPngFile = createMockFile(
    'bukti-transfer.png',
    'image/png',
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  );
  const validWebpFile = createMockFile(
    'tangkapan.webp',
    'image/webp',
    [
      0x52, 0x49, 0x46, 0x46,
      0x20, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]
  );
  const invalidFakeJpg = createMockFile(
    'palsu.jpg',
    'image/jpeg',
    [0x00, 0x11, 0x22, 0x33]
  );
  const unsupportedGif = createMockFile(
    'animasi.gif',
    'image/gif',
    [0x47, 0x49, 0x46, 0x38]
  );

  beforeEach(() => {
    vi.clearAllMocks();

    if (typeof window.URL.createObjectURL !== 'function') {
      window.URL.createObjectURL = vi.fn(
        (obj: Blob | MediaSource) =>
          `blob:mock-url-${'name' in obj ? (obj as File).name : 'blob'}`
      );
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockImplementation(
        (obj: Blob | MediaSource) =>
          `blob:mock-url-${'name' in obj ? (obj as File).name : 'blob'}`
      );
    }

    if (typeof window.URL.revokeObjectURL !== 'function') {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
  });

  afterEach(() => {
    cleanup();
  });

  describe('Helper: validateImageMagicBytes (Requirements 11.3, 11.7)', () => {
    it('mengembalikan true untuk file JPEG valid (FF D8 FF)', async () => {
      const isValid = await validateImageMagicBytes(validJpgFile);
      expect(isValid).toBe(true);
    });

    it('mengembalikan true untuk file PNG valid (89 50 4E 47)', async () => {
      const isValid = await validateImageMagicBytes(validPngFile);
      expect(isValid).toBe(true);
    });

    it('mengembalikan true untuk file WebP valid (RIFF ... WEBP)', async () => {
      const isValid = await validateImageMagicBytes(validWebpFile);
      expect(isValid).toBe(true);
    });

    it('mengembalikan false jika magic bytes tidak cocok meski ekstensi .jpg', async () => {
      const isValid = await validateImageMagicBytes(invalidFakeJpg);
      expect(isValid).toBe(false);
    });

    it('mengembalikan false untuk format lain yang tidak didukung seperti GIF', async () => {
      const isValid = await validateImageMagicBytes(unsupportedGif);
      expect(isValid).toBe(false);
    });

    it('mengembalikan false untuk file yang terlalu kecil (< 4 bytes)', async () => {
      const tinyFile = new File([new Uint8Array([0xff, 0xd8])], 'tiny.jpg', {
        type: 'image/jpeg',
      });
      const isValid = await validateImageMagicBytes(tinyFile);
      expect(isValid).toBe(false);
    });
  });

  describe('Helper: formatUkuranFile', () => {
    it('memformat byte di bawah 1 KB dengan satuan B', () => {
      expect(formatUkuranFile(512)).toBe('512 B');
    });

    it('memformat byte antara 1 KB hingga 1 MB dengan satuan KB', () => {
      expect(formatUkuranFile(2048)).toBe('2.0 KB');
      expect(formatUkuranFile(150 * 1024)).toBe('150.0 KB');
    });

    it('memformat byte di atas 1 MB dengan satuan MB', () => {
      expect(formatUkuranFile(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('Tab Navigasi (Requirement 11.1, 27.2)', () => {
    it('merender dua tab: "Tempel teks" dan "Unggah screenshot"', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabTeks = screen.getByRole('tab', { name: /tempel teks/i });
      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });

      expect(tabTeks).toBeDefined();
      expect(tabScreenshot).toBeDefined();
    });

    it('tab "Tempel teks" aktif secara default dengan aria-selected true', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabTeks = screen.getByRole('tab', { name: /tempel teks/i });
      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });

      expect(tabTeks.getAttribute('aria-selected')).toBe('true');
      expect(tabScreenshot.getAttribute('aria-selected')).toBe('false');

      expect(screen.getByRole('tabpanel', { name: /tempel teks/i })).toBeDefined();
    });

    it('berpindah ke tab "Unggah screenshot" saat diklik', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      expect(tabScreenshot.getAttribute('aria-selected')).toBe('true');
      const tabTeks = screen.getByRole('tab', { name: /tempel teks/i });
      expect(tabTeks.getAttribute('aria-selected')).toBe('false');

      expect(screen.getByRole('tabpanel', { name: /unggah screenshot/i })).toBeDefined();
    });

    it('kedua tombol tab memiliki target sentuh minimal 44px (Requirement 27.2)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabTeks = screen.getByRole('tab', { name: /tempel teks/i });
      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });

      expect(tabTeks.className).toContain('min-h-[44px]');
      expect(tabScreenshot.className).toContain('min-h-[44px]');
    });
  });

  describe('Mode Teks (Requirements 11.2, 11.5, 11.6, 27.4)', () => {
    it('memiliki label yang terhubung dengan textarea melalui id/htmlFor (Requirement 27.4)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      expect(textarea).toBeDefined();
    });

    it('menonaktifkan tombol "Periksa" saat teks kosong (Requirement 11.6)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(true);
      expect(tombolPeriksa.getAttribute('aria-disabled')).toBe('true');
    });

    it('menonaktifkan tombol "Periksa" jika hanya berisi spasi kosong (Requirement 11.6)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      fireEvent.change(textarea, { target: { value: '    \n  \t   ' } });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(true);
    });

    it('memperbarui counter karakter responsif saat pengguna mengetik (Requirement 11.2)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      const counter = screen.getByTestId('counter-karakter-teks');

      expect(counter.textContent).toContain('0 / 4.000 karakter');

      fireEvent.change(textarea, { target: { value: 'Halo, saya dari kurir J&T' } });

      expect(counter.textContent).toContain('25 / 4.000 karakter');
      expect(counter.className).not.toContain('text-red-600');
    });

    it('mengaktifkan tombol "Periksa" saat teks terisi dan <= 4.000 karakter', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      fireEvent.change(textarea, {
        target: { value: 'Selamat Anda memenangkan undian 100 juta rupiah' },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(false);
      expect(tombolPeriksa.getAttribute('aria-disabled')).toBe('false');
    });

    it('menampilkan peringatan dan menonaktifkan tombol Periksa jika teks melebihi 4.000 karakter (Requirement 11.2)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      const teksPanjang = 'A'.repeat(4005);
      fireEvent.change(textarea, { target: { value: teksPanjang } });

      const counter = screen.getByTestId('counter-karakter-teks');
      expect(counter.className).toContain('text-red-600');

      const peringatan = screen.getByTestId('peringatan-teks-panjang');
      expect(peringatan).toBeDefined();
      expect(peringatan.textContent).toContain('Teks melebihi batas maksimal 4.000 karakter');

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(true);
    });

    it('mendukung pengisian kolom konteks opsional maks 200 karakter (Requirement 11.5)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const inputKonteks = screen.getByRole('textbox', {
        name: /konteks tambahan/i,
      });
      expect(inputKonteks).toBeDefined();

      fireEvent.change(inputKonteks, {
        target: { value: 'dari nomor tidak dikenal' },
      });

      const counterKonteks = screen.getByTestId('counter-karakter-konteks');
      expect(counterKonteks.textContent).toBe('24 / 200');
    });

    it('memanggil onSubmit dengan payload yang sesuai saat disubmit', () => {
      const handleSubmit = vi.fn();
      render(<InputChat onSubmit={handleSubmit} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      fireEvent.change(textarea, {
        target: { value: 'Kirimkan kode OTP Anda segera' },
      });

      const inputKonteks = screen.getByRole('textbox', {
        name: /konteks tambahan/i,
      });
      fireEvent.change(inputKonteks, {
        target: { value: 'mengaku dari bank BCA' },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit).toHaveBeenCalledWith({
        mode: 'teks',
        teks: 'Kirimkan kode OTP Anda segera',
        konteks: 'mengaku dari bank BCA',
      });
    });

    it('mengirim konteks sebagai undefined jika kolom konteks tidak diisi', () => {
      const handleSubmit = vi.fn();
      render(<InputChat onSubmit={handleSubmit} />);

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      fireEvent.change(textarea, {
        target: { value: 'Menang undian hadiah mobil' },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      expect(handleSubmit).toHaveBeenCalledWith({
        mode: 'teks',
        teks: 'Menang undian hadiah mobil',
        konteks: undefined,
      });
    });

    it('mengisi teks dan konteks dari props initialTeks dan initialKonteks', () => {
      render(
        <InputChat
          onSubmit={vi.fn()}
          initialTeks="Teks contoh awal"
          initialKonteks="Konteks awal"
        />
      );

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      }) as HTMLTextAreaElement;
      const inputKonteks = screen.getByRole('textbox', {
        name: /konteks tambahan/i,
      }) as HTMLInputElement;

      expect(textarea.value).toBe('Teks contoh awal');
      expect(inputKonteks.value).toBe('Konteks awal');
    });

    it('memperbarui teks secara dinamis saat prop initialTeks berubah dari luar', () => {
      const { rerender } = render(
        <InputChat onSubmit={vi.fn()} initialTeks="Awal" />
      );

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      }) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Awal');

      rerender(<InputChat onSubmit={vi.fn()} initialTeks="Teks baru diperbarui" />);
      expect(textarea.value).toBe('Teks baru diperbarui');
    });
  });

  describe('Mode Screenshot (Requirements 11.3, 11.7, 12.3, 27.2)', () => {
    it('menampilkan peringatan privasi bahwa screenshot tidak bisa disensor otomatis (Requirement 12.3)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const alertPrivasi = screen.getByTestId('peringatan-privasi-screenshot');
      expect(alertPrivasi).toBeDefined();
      expect(alertPrivasi.textContent).toContain('Peringatan Privasi Screenshot');
      expect(alertPrivasi.textContent).toContain('tidak bisa disensor otomatis');
      expect(alertPrivasi.textContent).toContain('potong (crop) atau tutup data pribadi');
    });

    it('memiliki label untuk input file (Requirement 27.4)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const labelUpload = screen.getByText(/pilih file gambar/i);
      expect(labelUpload).toBeDefined();
    });

    it('tombol Periksa dinonaktifkan saat belum ada screenshot yang diunggah (Requirement 11.6)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(true);
    });

    it('menerima upload gambar valid (JPG) dan menampilkan thumbnail pratinjau (Requirement 11.3)', async () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDefined();

      fireEvent.change(input, {
        target: { files: [validJpgFile] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('daftar-thumbnail-screenshot')).toBeDefined();
      });

      expect(screen.getByText('bukti-chat.jpg')).toBeDefined();
      expect(screen.getByAltText('Pratinjau bukti-chat.jpg')).toBeDefined();

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(false);
    });

    it('tombol hapus gambar memiliki target sentuh minimal 44px dan aria-label (Requirement 27.2)', async () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [validPngFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('bukti-transfer.png')).toBeDefined();
      });

      const tombolHapus = screen.getByRole('button', {
        name: /hapus gambar bukti-transfer\.png/i,
      });
      expect(tombolHapus).toBeDefined();
      expect(tombolHapus.className).toContain('min-w-[44px]');
      expect(tombolHapus.className).toContain('min-h-[44px]');
    });

    it('menghapus gambar saat tombol hapus diklik dan me-revoke URL preview', async () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [validJpgFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('bukti-chat.jpg')).toBeDefined();
      });

      const tombolHapus = screen.getByRole('button', {
        name: /hapus gambar bukti-chat\.jpg/i,
      });
      fireEvent.click(tombolHapus);

      await waitFor(() => {
        expect(screen.queryByText('bukti-chat.jpg')).toBeNull();
      });

      expect(window.URL.revokeObjectURL).toHaveBeenCalled();

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(true);
    });

    it('menolak file jika magic bytes tidak didukung dan menampilkan pesan "Format file tidak didukung" (Requirement 11.7)', async () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [invalidFakeJpg] },
      });

      await waitFor(() => {
        const error = screen.getByTestId('error-file');
        expect(error.textContent).toContain('Format file tidak didukung');
      });

      expect(screen.queryByTestId('daftar-thumbnail-screenshot')).toBeNull();
    });

    it('membatasi maksimal 5 gambar dan menolak file ke-6+ dengan pesan "Maksimal 5 gambar" (Requirement 11.3)', async () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const file1 = createMockFile('img1.png', 'image/png', [0x89, 0x50, 0x4e, 0x47]);
      const file2 = createMockFile('img2.png', 'image/png', [0x89, 0x50, 0x4e, 0x47]);
      const file3 = createMockFile('img3.png', 'image/png', [0x89, 0x50, 0x4e, 0x47]);
      const file4 = createMockFile('img4.png', 'image/png', [0x89, 0x50, 0x4e, 0x47]);
      const file5 = createMockFile('img5.png', 'image/png', [0x89, 0x50, 0x4e, 0x47]);
      const file6 = createMockFile('img6.png', 'image/png', [0x89, 0x50, 0x4e, 0x47]);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [file1, file2, file3, file4, file5, file6] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-file')).toBeDefined();
      });

      expect(screen.getByTestId('error-file').textContent).toContain('Maksimal 5 gambar');

      expect(screen.getByText('Gambar terunggah (5/5)')).toBeDefined();
      expect(screen.queryByText('img6.png')).toBeNull();
    });

    it('mendukung penambahan file melalui aksi drag and drop', async () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const dropzone = screen.getByText(/atau seret dan lepas gambar ke sini/i).closest('div');
      expect(dropzone).toBeDefined();

      fireEvent.dragOver(dropzone!, { dataTransfer: { files: [] } });
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [validWebpFile],
        },
      });

      await waitFor(() => {
        expect(screen.getByText('tangkapan.webp')).toBeDefined();
      });
    });

    it('memanggil onSubmit dengan array file gambar saat mode screenshot disubmit', async () => {
      const handleSubmit = vi.fn();
      render(<InputChat onSubmit={handleSubmit} />);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [validJpgFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('bukti-chat.jpg')).toBeDefined();
      });

      const inputKonteks = screen.getByRole('textbox', {
        name: /konteks tambahan/i,
      });
      fireEvent.change(inputKonteks, {
        target: { value: 'screenshot obrolan Telegram' },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      const submittedData: ChatInputData = handleSubmit.mock.calls[0][0];
      expect(submittedData.mode).toBe('screenshot');
      expect(submittedData.gambar?.length).toBe(1);
      expect(submittedData.gambar?.[0].name).toBe('bukti-chat.jpg');
      expect(submittedData.konteks).toBe('screenshot obrolan Telegram');
    });
  });

  describe('State Loading & Aksesibilitas (Requirement 27.2)', () => {
    it('menonaktifkan tombol Periksa dan menampilkan teks loading saat isLoading true', () => {
      render(
        <InputChat
          onSubmit={vi.fn()}
          isLoading={true}
          initialTeks="Teks sedang diuji"
        />
      );

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.hasAttribute('disabled')).toBe(true);
      expect(tombolPeriksa.textContent).toContain('Memeriksa...');
    });

    it('menonaktifkan textarea dan input konteks saat isLoading true', () => {
      render(
        <InputChat
          onSubmit={vi.fn()}
          isLoading={true}
          initialTeks="Teks input"
          initialKonteks="Konteks"
        />
      );

      const textarea = screen.getByRole('textbox', {
        name: /teks percakapan chat/i,
      });
      const inputKonteks = screen.getByRole('textbox', {
        name: /konteks tambahan/i,
      });

      expect(textarea.hasAttribute('disabled')).toBe(true);
      expect(inputKonteks.hasAttribute('disabled')).toBe(true);
    });

    it('tombol Periksa memiliki target sentuh minimal 44px (Requirement 27.2)', () => {
      render(<InputChat onSubmit={vi.fn()} initialTeks="Tes" />);

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.className).toContain('min-h-[44px]');
    });
  });
});
