// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import CekChatPage from '@/app/cek-chat/page';
import { POST } from '@/app/api/cek-chat/route';
import { analyzeChat } from '@/lib/gemini';
import type { FormatDataHasil } from '@/lib/hasil';

// Mock lib/gemini agar Route Handler POST /api/cek-chat dapat diuji secara terkontrol
vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    analyzeChat: vi.fn(),
  };
});

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

describe('Integrasi Penuh Halaman Cek Chat dengan Endpoint /api/cek-chat (Task 15.1)', () => {
  const validJpgFile = createMockImageFile('bukti-chat.jpg', 'image/jpeg', [0xff, 0xd8, 0xff, 0xe0]);

  // Simulasi respons sukses dari Gemini AI
  const mockGeminiSukses: FormatDataHasil = {
    halaman: 'chat',
    level: 'sedang',
    ringkasan: 'Hasil analisis AI: Pesan ini memuat penawaran kerja like & review yang mencurigakan.',
    temuan: [
      {
        judul: 'Modus penipuan komisi paruh waktu',
        penjelasan: 'Pelaku meminta pendaftaran di muka untuk tugas sederhana.',
        bukti: 'komisi harian 500rb cukup like video',
        sumber: 'ai',
      },
    ],
    hal_wajar: ['Pengirim menyapa dengan sopan'],
    langkah: [
      'Jangan mentransfer biaya aktivasi atau deposit apa pun.',
      'Abaikan dan blokir kontak yang menawarkan pekerjaan tidak wajar ini.',
    ],
    situasi_darurat: ['transfer'],
    batasan: 'Analisis berbasis isi pesan yang dikirimkan.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: {
      ai: 'ok',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // 1. Setup mock canvas & ImageBitmap untuk kompresi gambar di JSDOM
    const validJpgBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    if (typeof HTMLCanvasElement.prototype.toBlob !== 'function') {
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback, type) {
        callback(new Blob([validJpgBuffer], { type: type || 'image/jpeg' }));
      });
    } else {
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type) {
        callback(new Blob([validJpgBuffer], { type: type || 'image/jpeg' }));
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

    // 2. Setup mock sessionStorage
    const sessionStorageStore: Record<string, string> = {};
    const sessionStorageMock = {
      getItem: vi.fn((key: string) => sessionStorageStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStorageStore[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStorageStore[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(sessionStorageStore)) {
          delete sessionStorageStore[k];
        }
      }),
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });

    // 3. Setup mock URL.createObjectURL & revokeObjectURL
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

    // 4. Default: Hubungkan fetch langsung ke handler POST /api/cek-chat asli
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/cek-chat' || url.endsWith('/api/cek-chat')) {
        const req = new Request('http://localhost:3000/api/cek-chat', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await POST(req);
      }
      return new Response('Not Found', { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Alur Lengkap Mode Teks: Input -> Sensor -> Pratinjau -> Pra-pemindaian -> API -> Hasil (Requirements 12.1, 12.2, 13.1, 14.1, 14.4)', () => {
    it('menjalankan alur lengkap dari input teks hingga menampilkan hasil dari API gabungan', async () => {
      // Setup mock Gemini untuk mengembalikan hasil saat dipanggil oleh backend
      vi.mocked(analyzeChat).mockResolvedValue(mockGeminiSukses);

      render(<CekChatPage />);

      // A. Input percakapan dengan nomor HP dan rekening yang sensitif
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value:
            'Halo kak, tolong transfer deposit pendaftaran ke nomor HP 081234567890 dan rekening 123456789012 sebesar 200rb untuk komisi harian 500rb cukup like video.',
        },
      });

      // B. Klik tombol Periksa
      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(tombolPeriksa);

      // C. Modal PratinjauSensor harus terbuka sebelum data dikirim ke API (Requirement 12.2)
      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      // Pastikan data sensitif disensor dalam teks pratinjau (Requirement 12.1)
      const badgesDisensor = screen.getAllByTestId('badge-disensor');
      expect(badgesDisensor.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Pratinjau Sensor Data Sensitif/i)).toBeDefined();

      // D. Konfirmasi pengiriman di dialog sensor
      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      // E. Verifikasi fetch dipanggil dan Route Handler POST /api/cek-chat memproses request
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Verifikasi analyzeChat di backend dipanggil dengan teks tersensor (bukan nomor asli)
      expect(analyzeChat).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'teks',
          teks: expect.stringContaining('[disensor]'),
        })
      );
      const callArgs = vi.mocked(analyzeChat).mock.calls[0][0];
      expect(callArgs.teks).not.toContain('081234567890');
      expect(callArgs.teks).not.toContain('123456789012');

      // F. Verifikasi KomponenHasil ditampilkan dengan data gabungan (TingkatKewaspadaan, KartuTemuan, LangkahDisarankan)
      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Level kewaspadaan: aturan lokal transfer + deposit = tinggi; gabungLevel(tinggi, sedang) = tinggi (Requirement 14.4)
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();

      // Temuan aturan lokal dan AI tampil di KomponenHasil
      const blokTemuan = screen.getByTestId('blok-temuan');
      expect(blokTemuan).toBeDefined();

      // Langkah disarankan minimal 2 (Requirement 5.4)
      const blokLangkah = screen.getByTestId('blok-langkah-disarankan');
      expect(blokLangkah).toBeDefined();

      // Pihak ketiga menyebutkan Google Gemini
      expect(screen.getAllByText(/Google Gemini/i).length).toBeGreaterThanOrEqual(1);
    });

    it('membatalkan pemeriksaan dari modal pratinjau dan mempertahankan teks di form', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Pesan rahasia 081299998888 jangan kirim dulu.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      // Klik tombol Batal
      fireEvent.click(screen.getByTestId('btn-batal'));

      // Modal tertutup
      await waitFor(() => {
        expect(screen.queryByTestId('modal-pratinjau-dialog')).toBeNull();
      });

      // Input teks tetap utuh
      expect((screen.getByRole('textbox', { name: /teks percakapan chat/i }) as HTMLTextAreaElement).value).toBe(
        'Pesan rahasia 081299998888 jangan kirim dulu.'
      );
      // Fetch tidak pernah dipanggil
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('2. Alur Lengkap Mode Screenshot: Gambar -> Kompresi -> API -> Evaluasi Transkrip Server (Requirements 11.3, 11.4, 12.3, 14.3)', () => {
    it('mengunggah screenshot, memanggil endpoint /api/cek-chat, dan mengevaluasi transkrip di server', async () => {
      // Mock Gemini mengembalikan hasil screenshot dengan transkrip percakapan
      vi.mocked(analyzeChat).mockResolvedValue({
        halaman: 'chat',
        level: 'sedang',
        ringkasan: 'Screenshot percakapan WhatsApp terdeteksi.',
        transkrip: 'Halo kak, mohon kirimkan kode OTP 6 digit sekarang juga untuk validasi paket.',
        temuan: [
          {
            judul: 'Permintaan kode verifikasi dalam gambar',
            penjelasan: 'Pengirim meminta kode SMS dalam percakapan.',
            bukti: 'kode OTP 6 digit',
            sumber: 'ai',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan berikan kode OTP kepada siapa pun.',
          'Konfirmasi status paket ke nomor call center resmi.',
        ],
        situasi_darurat: ['kirim_otp'],
        batasan: 'Analisis berbasis OCR screenshot.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      });

      render(<CekChatPage />);

      // Pindah ke tab Unggah screenshot
      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      // Peringatan privasi screenshot tampil (Requirement 12.3)
      expect(screen.getByTestId('peringatan-privasi-screenshot')).toBeDefined();

      // Pilih file gambar
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, {
        target: { files: [validJpgFile] },
      });

      await waitFor(() => {
        expect(screen.getByText('bukti-chat.jpg')).toBeDefined();
      });

      // Klik tombol Periksa
      fireEvent.click(screen.getByTestId('tombol-periksa'));

      // Modal pratinjau teks dilewati untuk screenshot (Requirement 12.3)
      expect(screen.queryByTestId('modal-pratinjau-dialog')).toBeNull();

      // Verifikasi fetch dipanggil dan backend mengeksekusi POST /api/cek-chat
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Hasil evaluasi gabungan ditampilkan
      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Karena transkrip memuat "kode OTP 6 digit" (langsung tinggi), level harus naik ke 'tinggi' (Requirement 14.3, 14.4)
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();
    });
  });

  describe('3. Fallback ke Aturan Lokal saat API Gagal / 500 / Timeout (Requirements 15.1, 15.3, 28.3, 29.1, 29.2, 29.4)', () => {
    it('fallback ke aturan lokal ketika backend Route Handler mengembalikan status 500', async () => {
      // Mock fetch mengembalikan status 500
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Segera kirim kode OTP kamu sekarang juga atau akun diblokir!',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      // Banner peringatan fallback harus muncul (Requirement 15.1)
      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });

      // Memeriksa keterangan "analisis AI sedang tidak tersedia" (Requirement 15.1, 29.2)
      expect(screen.getAllByText(/analisis AI sedang tidak tersedia/i).length).toBeGreaterThanOrEqual(1);

      // KomponenHasil tetap tampil dengan aturan lokal (Requirement 15.3, 29.1)
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();

      // Minimal 1 alasan dan 2 langkah (Requirement 29.4)
      const kartuTemuan = screen.getAllByTestId('kartu-temuan');
      expect(kartuTemuan.length).toBeGreaterThanOrEqual(1);
      const langkahItems = screen.getAllByTestId(/^langkah-item-/);
      expect(langkahItems.length).toBeGreaterThanOrEqual(2);

      // Tombol Coba lagi tersedia (Requirement 15.2)
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
    });

    it('fallback ketika Gemini di backend gagal/timeout (analyzeChat return null -> Route Handler return status_layanan.ai: gagal)', async () => {
      // analyzeChat return null menandakan Gemini API gagal/timeout di backend
      vi.mocked(analyzeChat).mockResolvedValue(null);

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Selamat Anda memenangkan undian berhadiah 100 juta rupiah transfer biaya admin 500rb.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      // Banner fallback harus tampil karena status_layanan.ai bernilai 'gagal'
      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });

      expect(screen.getAllByText(/analisis AI sedang tidak tersedia/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();

      // KomponenHasil tetap memuat aturan lokal (hadiah undian + transfer)
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();
    });

    it('fallback ketika terjadi timeout jaringan (AbortError / Network Failure)', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('AbortError: The operation was aborted'));

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Pemberitahuan perubahan nomor rekening kantor cabang.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      // Banner fallback muncul
      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
    });
  });

  describe('4. Tombol "Coba contoh" Berfungsi Instan Tanpa Memanggil API (Requirements 9.1, 9.2, 9.5)', () => {
    it('mengisi input dan merender hasil simulasi langsung tanpa request fetch ke API', async () => {
      render(<CekChatPage />);

      const tombolContoh = screen.getByTestId('tombol-coba-contoh');
      expect(tombolContoh).toBeDefined();

      // Klik tombol coba contoh
      fireEvent.click(tombolContoh);

      // Hasil langsung muncul
      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Verifikasi fetch API SAMA SEKALI TIDAK dipanggil (Requirement 9.5)
      expect(global.fetch).not.toHaveBeenCalled();

      // Verifikasi komponen hasil memuat data simulasi contoh
      expect(screen.getByText(/Waspada tinggi/i)).toBeDefined();
      expect(screen.getByTestId('blok-temuan')).toBeDefined();
      expect(screen.getByTestId('blok-langkah-disarankan')).toBeDefined();
    });
  });

  describe('5. Input Dipertahankan dan Tombol "Coba lagi" Memanggil Ulang API (Requirement 15.2)', () => {
    it('mempertahankan input dan berhasil memanggil ulang API saat tombol "Coba lagi" diklik', async () => {
      let callCount = 0;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        callCount++;
        if (callCount === 1) {
          // Panggilan pertama: simulasi error 500
          return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
        }
        // Panggilan kedua: jalankan Route Handler POST asli dengan mock Gemini sukses
        vi.mocked(analyzeChat).mockResolvedValue(mockGeminiSukses);
        const req = new Request('http://localhost:3000/api/cek-chat', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await POST(req);
      });

      render(<CekChatPage />);

      const inputText = 'Tawaran kerja like review komisi 500rb per hari ke nomor 081234567890.';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: inputText },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      // Panggilan 1 gagal -> fallback muncul
      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Klik tombol "Coba lagi" (Requirement 15.2)
      const tombolCobaLagi = screen.getByTestId('tombol-coba-lagi');
      fireEvent.click(tombolCobaLagi);

      // Verifikasi panggilan ulang ke API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      // Banner fallback hilang dan hasil AI berhasil ditampilkan
      await waitFor(() => {
        expect(screen.queryByTestId('banner-fallback-ai')).toBeNull();
      });
      expect(screen.getByText(/Hasil analisis AI/i)).toBeDefined();
    });
  });

  describe('6. Tombol "Cek lagi" — Reset State Total (Requirements 35.1, 35.2, 35.3)', () => {
    it('mengosongkan input dan hasil saat tombol "Cek lagi" ditekan', async () => {
      render(<CekChatPage />);

      // Pilih contoh skenario
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Klik tombol "Cek lagi"
      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(tombolCekLagi);

      // Halaman kembali ke form input awal
      await waitFor(() => {
        expect(screen.queryByTestId('komponen-hasil')).toBeNull();
        expect(screen.getByTestId('area-input-chat')).toBeDefined();
      });

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i }) as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });
  });

  describe('7. Cross-Links: "Cek link ini" & "Cek Video & Suara" (Requirements 13.5, 16.4, 34.1, 34.2, 34.3)', () => {
    it('menampilkan cross-link "Cek link ini" dan menyimpan ke sessionStorage saat teks memuat URL', async () => {
      vi.mocked(analyzeChat).mockResolvedValue({
        ...mockGeminiSukses,
        ringkasan: 'Ditemukan URL mencurigakan di dalam percakapan.',
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Silakan klik link hadiah di https://shopee-promo-gratis.xyz/klaim sekarang!',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Tombol "Cek link ini" harus muncul
      const btnCekLink = screen.getByText('Cek link ini');
      expect(btnCekLink).toBeDefined();

      // Klik tombol "Cek link ini"
      fireEvent.click(btnCekLink);

      // URL disimpan di sessionStorage (Requirement 34.2)
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'url_dari_chat',
        'https://shopee-promo-gratis.xyz/klaim'
      );
    });

    it('menampilkan tautan ke /cek-video-suara jika modus panggilan video atau rekaman suara terdeteksi', async () => {
      vi.mocked(analyzeChat).mockResolvedValue({
        ...mockGeminiSukses,
        ringkasan: 'Ditemukan modus video call darurat dari orang mengaku keluarga.',
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Tolong segera angkat video call ini penting gawat darurat.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Cross-link ke Cek Video & Suara tampil (Requirement 16.4, 34.3)
      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const linkVideo = within(areaCrossLinks).getByText('Cek Video & Suara');
      expect(linkVideo).toBeDefined();
      expect(linkVideo.closest('a')?.getAttribute('href')).toBe('/cek-video-suara');
    });
  });

  describe('8. Larangan Kata Terlarang dalam Kesimpulan (Requirements 30.1, 30.4)', () => {
    it('memastikan kesimpulan tidak memuat kata terlarang seperti "aman", "pasti", "terbukti", "100%"', async () => {
      // Gemini mengembalikan kata terlarang dalam kesimpulannya
      vi.mocked(analyzeChat).mockResolvedValue({
        halaman: 'chat',
        level: 'sedang',
        ringkasan: 'Pesan ini pasti penipuan dan 100% scam.',
        temuan: [
          {
            judul: 'Toko ini pasti penipuan',
            penjelasan: 'Sudah terbukti penipuan di berbagai laporan.',
            bukti: 'Transfer ke rekening kami',
            sumber: 'ai',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan percaya karena belum pasti benar.',
          'Hubungi pihak berwenang.',
        ],
        situasi_darurat: [],
        batasan: 'Analisis berbasis teks.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Pesan percakapan biasa tentang transaksi online.' },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      // Filter kata terlarang di Route Handler harus menyaring kata terlarang
      const ringkasanEl = screen.getByTestId('ringkasan-teks');
      expect(ringkasanEl.textContent).not.toMatch(/\bpasti penipuan\b/i);
      expect(ringkasanEl.textContent).not.toMatch(/\b100%\b/i);
    });

    it('menampilkan kalimat peringatan "Ini tidak berarti pasti aman" saat level "tidak_ditemukan" (Requirement 30.4)', async () => {
      vi.mocked(analyzeChat).mockResolvedValue({
        halaman: 'chat',
        level: 'tidak_ditemukan',
        ringkasan: 'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.',
        temuan: [],
        hal_wajar: ['Percakapan santai sehari-hari'],
        langkah: [
          'Tetap waspada terhadap permintaan data sensitif di masa mendatang.',
          'Selalu verifikasi kontak yang tidak kamu kenal.',
        ],
        situasi_darurat: [],
        batasan: 'Analisis berbasis isi pesan.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      });

      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: 'Selamat pagi pak, untuk rapat jam 9 nanti di ruang rapat lantai 2 ya.' },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      expect(screen.getByText(/Tidak ditemukan tanda bahaya/i)).toBeDefined();
      expect(screen.getAllByText(/Ini tidak berarti pasti aman/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
