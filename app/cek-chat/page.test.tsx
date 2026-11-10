// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import CekChatPage from './page';
import type { FormatDataHasil } from '@/lib/hasil';

/**
 * Helper untuk membuat mock File gambar dengan magic bytes valid
 */
function createMockImageFile(name: string, type: string, magicBytes: number[], size = 64): File {
  const buffer = new Uint8Array(size);
  magicBytes.forEach((byte, index) => {
    buffer[index] = byte;
  });
  return new File([buffer], name, { type, lastModified: Date.now() });
}

describe('app/cek-chat/page.tsx — Halaman Cek Chat (Task 7.3)', () => {
  const validJpgFile = createMockImageFile('bukti-chat.jpg', 'image/jpeg', [0xff, 0xd8, 0xff, 0xe0]);

  const mockApiHasil: FormatDataHasil = {
    halaman: 'chat',
    level: 'tinggi',
    ringkasan: 'Hasil dari Gemini AI: Pesan ini memuat modus penipuan kurir dan OTP.',
    temuan: [
      {
        judul: 'Permintaan OTP dari pihak mengaku kurir',
        penjelasan: 'Pelaku mencoba mengambil alih akun dengan meminta kode OTP 6 digit.',
        bukti: 'Kirimkan kode OTP 6 digit sekarang juga',
        sumber: 'ai',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan berikan kode OTP kepada siapa pun.',
      'Hubungi call center resmi kurir untuk konfirmasi.',
    ],
    situasi_darurat: ['kirim_otp'],
    batasan: 'Hasil analisis didasarkan pada AI Gemini.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: {
      ai: 'ok',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Canvas dan ImageBitmap untuk kompresGambar di JSDOM
    if (typeof HTMLCanvasElement.prototype.toBlob !== 'function') {
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback, type) {
        callback(new Blob(['mock-compressed-data'], { type: type || 'image/jpeg' }));
      });
    } else {
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type) {
        callback(new Blob(['mock-compressed-data'], { type: type || 'image/jpeg' }));
      });
    }

    if (typeof HTMLCanvasElement.prototype.getContext !== 'function') {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      });
    } else {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as RenderingContext);
    }

    if (typeof window.createImageBitmap !== 'function') {
      window.createImageBitmap = vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        close: vi.fn(),
      });
    } else {
      vi.spyOn(window, 'createImageBitmap').mockResolvedValue({
        width: 800,
        height: 600,
        close: vi.fn(),
      } as unknown as ImageBitmap);
    }

    // Mock sessionStorage
    const sessionStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });

    // Mock URL.createObjectURL & revokeObjectURL
    if (typeof window.URL.createObjectURL !== 'function') {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url');
    }
    if (typeof window.URL.revokeObjectURL !== 'function') {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }

    // Default mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Render Awal Halaman & Kotak Privasi (Requirements 8.1, 8.4, 8.6)', () => {
    it('merender judul halaman dan deskripsi Cek Chat', () => {
      render(<CekChatPage />);

      expect(screen.getByRole('heading', { level: 1, name: /cek chat mencurigakan/i })).toBeDefined();
      expect(screen.getByText(/periksa teks percakapan atau screenshot chat yang mencurigakan/i)).toBeDefined();
    });

    it('merender KotakPrivasi dengan informasi AI Cek Penipuan sebelum area input (Requirements 8.1, 8.4, 8.6)', () => {
      render(<CekChatPage />);

      const kotakPrivasi = screen.getByTestId('kotak-privasi');
      expect(kotakPrivasi).toBeDefined();
      expect(kotakPrivasi.getAttribute('data-halaman')).toBe('chat');

      // Memastikan menyebutkan AI Cek Penipuan dan peringatan data sensitif
      expect(within(kotakPrivasi).getAllByText(/AI Cek Penipuan/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/jangan masukkan OTP, PIN, password, atau nomor rekening asli/i)).toBeDefined();

      // Memastikan letak KotakPrivasi berada sebelum area input di DOM
      const areaInput = screen.getByTestId('area-input-chat');
      expect(
        kotakPrivasi.compareDocumentPosition(areaInput) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('merender TombolContoh (halaman="chat") dan form InputChat dalam kondisi awal', () => {
      render(<CekChatPage />);

      expect(screen.getByTestId('tombol-coba-contoh')).toBeDefined();
      expect(screen.getByTestId('input-chat-container')).toBeDefined();
      expect(screen.getByRole('tab', { name: /tempel teks/i })).toBeDefined();
      expect(screen.getByRole('tab', { name: /unggah screenshot/i })).toBeDefined();
    });
  });

  describe('2. Dukungan Tombol "Coba contoh" (Requirements 9.2, 9.5)', () => {
    it('mengisi input dan menampilkan hasil simulasi langsung tanpa memanggil API (Requirement 9.2, 9.5)', async () => {
      render(<CekChatPage />);

      const tombolContoh = screen.getByTestId('tombol-coba-contoh');
      fireEvent.click(tombolContoh);

      // Hasil simulasi langsung muncul
      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Verifikasi fetch API TIDAK pernah dipanggil
      expect(global.fetch).not.toHaveBeenCalled();

      // Verifikasi hasil simulasi berisi temuan dari data contoh
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();
      expect(screen.getByTestId('blok-temuan')).toBeDefined();
      // Verifikasi sorotan transkrip muncul pada skenario contoh (Requirement CH-07)
      expect(screen.getByTestId('sorotan-transkrip')).toBeDefined();
    });
  });

  describe('3. Alur Input Teks dan Modal Pratinjau Sensor (Requirements 12.1, 12.2, 12.4, 13.1)', () => {
    it('membuka dialog PratinjauSensor saat input teks disubmit dengan teks yang telah disensor', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      // Input teks yang memuat data sensitif: nomor HP dan nomor rekening
      fireEvent.change(textarea, {
        target: {
          value: 'Halo kak, mohon transfer ke nomor 081234567890 rekening 123456789012 sebesar 500rb.',
        },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      // Modal PratinjauSensor harus terbuka
      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      // Verifikasi judul modal dan badge [disensor]
      expect(screen.getByText(/Pratinjau Sensor Data Sensitif/i)).toBeDefined();
      const badgesDisensor = screen.getAllByTestId('badge-disensor');
      expect(badgesDisensor.length).toBeGreaterThanOrEqual(1);

      // Verifikasi fetch belum dipanggil sebelum konfirmasi
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('menutup modal dialog dan mempertahankan input saat tombol "Batal / Edit Kembali" diklik', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Pesan chat dengan nomor 081234567890 penting.' },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      // Klik tombol Batal
      const btnBatal = screen.getByTestId('btn-batal');
      fireEvent.click(btnBatal);

      // Modal harus tertutup
      await waitFor(() => {
        expect(screen.queryByTestId('modal-pratinjau-dialog')).toBeNull();
      });

      // Teks tetap ada di textarea
      expect((screen.getByRole('textbox', { name: /teks percakapan chat/i }) as HTMLTextAreaElement).value).toBe(
        'Pesan chat dengan nomor 081234567890 penting.'
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('mengirim request ke /api/cek-chat dengan teks yang telah disensor setelah konfirmasi', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiHasil,
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Tolong kirim ke 081234567890 sekarang juga.',
        },
      });

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      // Klik "Lanjut Periksa"
      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Periksa payload fetch: teks yang dikirim adalah teks tersensor
      const [url, requestInit] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/cek-chat');
      expect(requestInit.method).toBe('POST');

      const parsedBody = JSON.parse(requestInit.body);
      expect(parsedBody.mode).toBe('teks');
      expect(parsedBody.teks).toContain('[disensor]');
      expect(parsedBody.teks).not.toContain('081234567890');
      expect(parsedBody.levelMinimum).toBeDefined();

      // KomponenHasil menampilkan hasil dari API
      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
        expect(screen.getByText(/Hasil dari Gemini AI/i)).toBeDefined();
      });
    });
  });

  describe('4. Fallback saat API Gagal / Offline / Timeout (Requirements 15.1, 15.2, 15.3, 29.1, 29.2)', () => {
    it('menampilkan hasil aturan lokal beserta keterangan "analisis AI sedang tidak tersedia" saat API gagal (500)', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Minta kirimkan kode OTP Anda sekarang juga.' },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      // Tunggu hingga fallback ditampilkan
      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });

      // Memeriksa teks keterangan wajib sesuai Requirement 15.1
      expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      expect(screen.getAllByText(/analisis AI sedang tidak tersedia/i).length).toBeGreaterThanOrEqual(1);

      // Memeriksa KomponenHasil tetap tampil dengan hasil aturan lokal (Requirement 15.3)
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();
      expect(screen.getByText(/Permintaan kode OTP, PIN, atau kata sandi/i)).toBeDefined();

      // Memeriksa tombol "Coba lagi" tersedia (Requirement 15.2)
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
    });

    it('menjalankan pemanggilan ulang API saat tombol "Coba lagi" ditekan (Requirement 15.2)', async () => {
      // Panggilan 1: gagal
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      // Panggilan 2: berhasil
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiHasil,
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Transfer deposit 200rb untuk aktivasi akun.' },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      // Tunggu hingga fallback muncul
      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Klik tombol "Coba lagi"
      const tombolCobaLagi = screen.getByTestId('tombol-coba-lagi');
      fireEvent.click(tombolCobaLagi);

      // Verifikasi API dipanggil kembali
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Banner fallback hilang dan hasil sukses ditampilkan
      await waitFor(() => {
        expect(screen.queryByTestId('banner-fallback-ai')).toBeNull();
        expect(screen.getByText(/Hasil dari Gemini AI/i)).toBeDefined();
      });
    });
  });

  describe('5. Cross-Links: "Cek link ini" & "Cek Video & Suara" (Requirements 13.5, 16.4, 34.1, 34.2, 34.3)', () => {
    it('menampilkan tombol "Cek link ini" dan menyimpan URL ke sessionStorage saat link terdeteksi (Requirements 13.5, 34.1, 34.2)', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockApiHasil,
          ringkasan: 'Ditemukan tautan mencurigakan di dalam pesan.',
        }),
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Klaim hadiah undian kamu di https://hadiah-kejutan.xyz/klaim sekarang juga.' },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Cross link "Cek link ini" harus tampil
      const btnCekLink = screen.getByText('Cek link ini');
      expect(btnCekLink).toBeDefined();

      // Klik tombol "Cek link ini"
      fireEvent.click(btnCekLink);

      // Pastikan sessionStorage.setItem('url_dari_chat', url) terpanggil (Requirement 34.2)
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'url_dari_chat',
        'https://hadiah-kejutan.xyz/klaim'
      );
    });

    it('menampilkan tautan ke /cek-video-suara jika modus video call atau voice note terdeteksi (Requirements 16.4, 34.3)', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockApiHasil,
          ringkasan: 'Ditemukan modus video call darurat dari orang asing.',
        }),
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Halo tolong angkat video call ini penting banget sekarang darurat.' },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Cross link ke Cek Video & Suara harus tampil di area-cross-links
      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const linkVideo = within(areaCrossLinks).getByText('Cek Video & Suara');
      expect(linkVideo).toBeDefined();
      expect(linkVideo.closest('a')?.getAttribute('href')).toBe('/cek-video-suara');
    });
  });

  describe('6. Tombol "Cek lagi" — Reset State (Requirements 35.1, 35.2, 35.3)', () => {
    it('mengosongkan hasil dan mengembalikan halaman ke kondisi awal siap menerima input baru (Requirements 35.1, 35.3)', async () => {
      render(<CekChatPage />);

      // 1. Pilih contoh skenario
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // 2. Klik tombol "Cek lagi"
      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      expect(tombolCekLagi).toBeDefined();
      fireEvent.click(tombolCekLagi);

      // 3. Verifikasi halaman kembali ke kondisi awal
      await waitFor(() => {
        expect(screen.queryByTestId('komponen-hasil')).toBeNull();
        expect(screen.getByTestId('area-input-chat')).toBeDefined();
      });

      // Area input kosong
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i }) as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });
  });

  describe('7. Alur Unggahan Screenshot Langsung (Requirements 11.3, 11.4, 12.3)', () => {
    it('mengunggah gambar dan langsung memanggil API tanpa modal PratinjauSensor teks', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiHasil,
      });

      render(<CekChatPage />);

      // Pindah ke tab Unggah screenshot
      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      // Peringatan screenshot tidak bisa disensor otomatis tampil (Requirement 12.3)
      expect(screen.getByTestId('peringatan-privasi-screenshot')).toBeDefined();

      // Pilih file gambar
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [validJpgFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('bukti-chat.jpg')).toBeDefined();
        expect(screen.getByTestId('tombol-periksa').hasAttribute('disabled')).toBe(false);
      });

      // Klik tombol Periksa
      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      // Tidak boleh membuka modal PratinjauSensor teks
      expect(screen.queryByTestId('modal-pratinjau-dialog')).toBeNull();

      // API langsung dipanggil
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const [url, requestInit] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('/api/cek-chat');
      const parsedBody = JSON.parse(requestInit.body);
      expect(parsedBody.mode).toBe('screenshot');
      expect(Array.isArray(parsedBody.gambar)).toBe(true);

      // Hasil ditampilkan
      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });
    });
  });
});
