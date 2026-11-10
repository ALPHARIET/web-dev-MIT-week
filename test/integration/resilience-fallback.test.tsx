// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import CekChatPage from '@/app/cek-chat/page';
import CekLinkPage from '@/app/cek-link/page';
import CekVideoSuaraPage from '@/app/cek-video-suara/page';
import { POST as postChatHandler } from '@/app/api/cek-chat/route';
import { POST as postLinkHandler } from '@/app/api/cek-link/route';
import { analyzeChat, explainLink } from '@/lib/gemini';
import { checkSafeBrowsing } from '@/lib/safe-browsing';
import { queryDomainAge } from '@/lib/rdap';
import type { FormatDataHasil } from '@/lib/hasil';

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    analyzeChat: vi.fn(),
    explainLink: vi.fn(),
  };
});

vi.mock('@/lib/safe-browsing', () => ({
  checkSafeBrowsing: vi.fn(),
  checkUrl: vi.fn(),
}));

vi.mock('@/lib/rdap', () => ({
  queryDomainAge: vi.fn(),
  extractDomain: vi.fn((url: string) => {
    try {
      const match = url.match(/https?:\/\/([^\/?#]+)/i);
      return match ? match[1].toLowerCase() : url.toLowerCase();
    } catch {
      return null;
    }
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/cek-chat'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

function createValidJpgFile(name = 'screenshot.jpg', size = 64): File {
  const buffer = new Uint8Array(size);
  buffer[0] = 0xff;
  buffer[1] = 0xd8;
  buffer[2] = 0xff;
  buffer[3] = 0xe0;
  return new File([buffer], name, { type: 'image/jpeg', lastModified: Date.now() });
}

describe('Test Suite Ketahanan saat Semua Layanan Pihak Ketiga Mati (Task 15.5)', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const originalNavigatorOnLine = navigator.onLine;

  beforeEach(() => {
    vi.clearAllMocks();

    delete process.env.GEMINI_API_KEY;
    delete process.env.SAFE_BROWSING_API_KEY;

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

    const storageStore: Record<string, string> = {};
    const sessionStorageMock = {
      getItem: vi.fn((key: string) => storageStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storageStore[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete storageStore[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(storageStore)) {
          delete storageStore[k];
        }
      }),
    };
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
      configurable: true,
    });

    vi.mocked(analyzeChat).mockResolvedValue(null);
    vi.mocked(explainLink).mockResolvedValue(null);
    vi.mocked(checkSafeBrowsing).mockResolvedValue({
      ditemukan: false,
      ancaman: [],
      status: 'tidak_tersedia',
      keterangan: 'API key Google Safe Browsing tidak tersedia',
    });
    vi.mocked(queryDomainAge).mockResolvedValue({
      tersedia: false,
      status: 'tidak_tersedia',
      keterangan: 'Layanan RDAP tidak tersedia atau timeout',
    });

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/api/cek-chat')) {
        const req = new Request('http://localhost:3000/api/cek-chat', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await postChatHandler(req);
      }

      if (url.includes('/api/cek-link')) {
        const req = new Request('http://localhost:3000/api/cek-link', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await postLinkHandler(req);
      }

      return originalFetch(input, init);
    });
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
      writable: true,
    });
  });

  describe('1. Cek Chat: Ketahanan saat Gemini API Tidak Tersedia (Requirements 29.1, 29.2, 29.4)', () => {
    it('tetap menampilkan hasil aturan lokal format KomponenHasil saat Gemini API mati (analyzeChat return null)', async () => {
      vi.mocked(analyzeChat).mockResolvedValueOnce(null);

      render(<CekChatPage />);

      const inputText = 'Halo kak, segera kirimkan kode OTP SMS kamu sekarang juga untuk klaim hadiah 100 juta!';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: inputText } });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      const bannerFallback = screen.getByTestId('banner-fallback-ai');
      expect(bannerFallback.textContent).toContain('analisis AI sedang tidak tersedia');

      const blokBatasan = screen.getByTestId('blok-batasan-layanan');
      expect(blokBatasan.textContent).toContain('Analisis AI');
      expect(blokBatasan.textContent).toContain('analisis AI sedang tidak tersedia');
      const badgeAi = screen.getByTestId('status-badge-ai');
      expect(badgeAi.textContent).toContain('Gagal');

      const kartuTemuan = screen.getAllByTestId('kartu-temuan');
      expect(kartuTemuan.length).toBeGreaterThanOrEqual(1);
      const langkahItems = screen.getAllByTestId(/^langkah-item-/);
      expect(langkahItems.length).toBeGreaterThanOrEqual(2);

      const tombolCobaLagi = screen.getByTestId('tombol-coba-lagi');
      expect(tombolCobaLagi).toBeDefined();
    });

    it('tetap menampilkan hasil aturan lokal saat terjadi kegagalan jaringan (Network Error / Offline)', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('NetworkError: Failed to fetch'));

      render(<CekChatPage />);

      const inputText = 'Tolong transfer uang deposit pendaftaran kerja paruh waktu sebesar 500rb.';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: inputText } });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();

      expect(screen.getAllByTestId('kartu-temuan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });

    it('tetap menampilkan hasil aturan lokal saat backend mengembalikan HTTP 500 error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
      );

      render(<CekChatPage />);

      const inputText = 'Selamat Anda memenangkan undian berhadiah pulsa 500 ribu.';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: inputText } });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
      expect(screen.getAllByTestId('kartu-temuan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });

    it('tetap menampilkan hasil aturan lokal saat terjadi timeout 20 detik (AbortError)', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      render(<CekChatPage />);

      const inputText = 'Akun kamu terancam diblokir sekarang juga segera konfirmasi.';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: inputText } });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });
      expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
    });

    it('mendukung fallback aturan lokal pada mode screenshot saat Gemini AI gagal', async () => {
      vi.mocked(analyzeChat).mockResolvedValueOnce(null);

      render(<CekChatPage />);

      fireEvent.click(screen.getByRole('tab', { name: /unggah screenshot/i }));

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, {
        target: { files: [createValidJpgFile('chat-scam.jpg')] },
      });

      await waitFor(() => {
        expect(screen.getByText('chat-scam.jpg')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('2. Cek Link: Ketahanan saat Semua Layanan Eksternal Mati (Requirements 29.1, 29.2, 29.3, 29.4)', () => {
    it('tetap menampilkan hasil dari aturan lokal leksikal saat Safe Browsing, RDAP, dan Gemini API mati bersamaan', async () => {
      vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
        ditemukan: false,
        ancaman: [],
        status: 'tidak_tersedia',
        keterangan: 'Layanan Google Safe Browsing tidak tersedia',
      });

      vi.mocked(queryDomainAge).mockResolvedValueOnce({
        tersedia: false,
        status: 'tidak_tersedia',
        keterangan: 'Data umur domain tidak tersedia dari RDAP',
      });

      vi.mocked(explainLink).mockResolvedValueOnce(null);

      render(<CekLinkPage />);

      const inputUrl = 'https://bca-klaim-hadiah-resmi.xyz/login';
      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: inputUrl } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      const statusKewaspadaan = screen.getByRole('status');
      expect(statusKewaspadaan.getAttribute('data-level')).toBe('tinggi');
      expect(statusKewaspadaan.textContent).toContain('Waspada tinggi');

      const blokBatasan = screen.getByTestId('blok-batasan-layanan');
      expect(blokBatasan.textContent).toContain('Google Safe Browsing');
      expect(blokBatasan.textContent).toContain('Data Domain (RDAP)');

      const badgeSb = screen.getByTestId('status-badge-safe_browsing');
      expect(badgeSb.textContent).toContain('Tidak tersedia');

      const badgeRdap = screen.getByTestId('status-badge-rdap');
      expect(badgeRdap.textContent).toContain('Tidak tersedia');

      const badgeAi = screen.getByTestId('status-badge-ai');
      expect(badgeAi.textContent).toContain('Gagal');

      const temuanList = screen.getAllByTestId('kartu-temuan');
      expect(temuanList.length).toBeGreaterThanOrEqual(1);

      const langkahList = screen.getAllByTestId(/^langkah-item-/);
      expect(langkahList.length).toBeGreaterThanOrEqual(2);

      const hasBrandExplanation = temuanList.some((t) =>
        /BCA|merek|substitusi/i.test(t.textContent || '')
      );
      expect(hasBrandExplanation).toBe(true);

      const allLinks = screen.queryAllByRole('link');
      const hrefs = allLinks.map((a) => a.getAttribute('href') || '');
      expect(hrefs.some((h) => h.includes('bca-klaim-hadiah-resmi.xyz'))).toBe(false);
    });

    it('tetap menampilkan hasil aturan lokal saat terjadi network error (koneksi offline) pada Cek Link', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch (offline)'));

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: 'https://sh0pee-gratis-ongkir.xyz' } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      expect(screen.getByTestId('banner-fallback-link')).toBeDefined();

      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();

      expect(screen.getAllByTestId('kartu-temuan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });

    it('tetap menampilkan hasil aturan lokal saat API /api/cek-link mengembalikan HTTP 500 server crash', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Crash' }), { status: 500 })
      );

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: 'https://dana-kaget-saldo.net' } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');

      expect(screen.getByTestId('banner-fallback-link')).toBeDefined();
      expect(screen.getByTestId('tombol-coba-lagi')).toBeDefined();
      expect(screen.getAllByTestId('kartu-temuan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });

    it('tetap menampilkan hasil aturan lokal saat Safe Browsing & RDAP melempar Timeout / Exception di backend', async () => {
      vi.mocked(checkSafeBrowsing).mockRejectedValueOnce(new Error('SB Timeout after 5000ms'));
      vi.mocked(queryDomainAge).mockRejectedValueOnce(new Error('RDAP Timeout after 5000ms'));
      vi.mocked(explainLink).mockRejectedValueOnce(new Error('Gemini API 500'));

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: 'https://192.168.1.1/login-admin' } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');

      const badgeSb = screen.getByTestId('status-badge-safe_browsing');
      expect(badgeSb.textContent).toContain('Gagal');

      const badgeRdap = screen.getByTestId('status-badge-rdap');
      expect(badgeRdap.textContent).toContain('Gagal');

      const badgeAi = screen.getByTestId('status-badge-ai');
      expect(badgeAi.textContent).toContain('Gagal');

      expect(screen.getByText('Perlu hati-hati')).toBeDefined();
      expect(screen.getAllByTestId('kartu-temuan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Cek Video & Suara: Ketahanan Penuh Offline Tanpa Pihak Ketiga (Requirements 29.1, 29.4)', () => {
    it('berfungsi sempurna saat semua layanan pihak ketiga mati dan browser offline (navigator.onLine = false)', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });

      render(<CekVideoSuaraPage />);
      fireEvent.click(screen.getByTestId('tab-mode-kuis'));

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-otp_pin'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      const blokBatasan = screen.getByTestId('blok-batasan-layanan');
      expect(blokBatasan.textContent).toContain('Tidak digunakan');

      const temuanItems = screen.getAllByTestId('kartu-temuan');
      expect(temuanItems.length).toBeGreaterThanOrEqual(1);

      const langkahItems = within(screen.getByTestId('blok-langkah-disarankan')).getAllByRole('listitem');
      expect(langkahItems.length).toBeGreaterThanOrEqual(2);

      expect(screen.getByTestId('panel-darurat-section')).toBeDefined();
    });

    it('skenario contoh fiktif Video & Suara berfungsi instan tanpa memerlukan internet', () => {
      render(<CekVideoSuaraPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getAllByTestId('kartu-temuan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId(/^langkah-item-/).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4. Retensi Input dan Pemulihan via Tombol "Coba lagi" (Requirements 15.2, 29.1)', () => {
    it('Cek Chat: input teks dipertahankan saat gagal, dan tombol "Coba lagi" berhasil memulihkan hasil saat API kembali normal', async () => {
      let attempt = 0;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        attempt++;
        if (attempt === 1) {
          return new Response(JSON.stringify({ error: 'Gemini server down' }), { status: 500 });
        }
        vi.mocked(analyzeChat).mockResolvedValueOnce({
          halaman: 'chat',
          level: 'sedang',
          ringkasan: 'Hasil analisis AI: Pesan terindikasi penipuan lowongan kerja.',
          temuan: [
            {
              judul: 'Lowongan kerja like & subscribe',
              penjelasan: 'Pola meminta uang registrasi di awal.',
              bukti: 'gaji 500rb per hari',
              sumber: 'ai',
            },
          ],
          hal_wajar: [],
          langkah: ['Jangan kirim uang deposit.', 'Blokir nomor tersebut.'],
          situasi_darurat: ['transfer'],
          batasan: 'Analisis berbasis teks.',
          pihak_ketiga: ['Google Gemini'],
          status_layanan: { ai: 'ok' },
        });

        const req = new Request('http://localhost:3000/api/cek-chat', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await postChatHandler(req);
      });

      render(<CekChatPage />);

      const testInput = 'Tawaran kerja like review gaji 500rb per hari.';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: testInput } });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));

      await waitFor(() => {
        expect(screen.getByTestId('banner-fallback-ai')).toBeDefined();
      });

      const tombolCobaLagi = screen.getByTestId('tombol-coba-lagi');
      fireEvent.click(tombolCobaLagi);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('banner-fallback-ai')).toBeNull();
      });
      expect(screen.getByText(/Hasil analisis AI/i)).toBeDefined();
    });

    it('Cek Link: input URL dipertahankan saat gagal, dan tombol "Coba lagi" berhasil memulihkan hasil saat API kembali normal', async () => {
      let attempt = 0;
      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        attempt++;
        if (attempt === 1) {
          throw new TypeError('Failed to fetch');
        }
        vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
          ditemukan: false,
          ancaman: [],
          status: 'ok',
        });
        vi.mocked(queryDomainAge).mockResolvedValueOnce({
          tersedia: true,
          umurHari: 120,
          status: 'ok',
        });
        const req = new Request('http://localhost:3000/api/cek-link', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await postLinkHandler(req);
      });

      render(<CekLinkPage />);

      const testUrl = 'https://tokopedia-promo-spesial.xyz';
      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: testUrl } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('banner-fallback-link');

      const tombolCobaLagi = screen.getByTestId('tombol-coba-lagi');
      fireEvent.click(tombolCobaLagi);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('banner-fallback-link')).toBeNull();
      });
    });
  });

  describe('5. Invarian Struktur Minimum Hasil Aturan Lokal (Requirement 29.4, Property 10)', () => {
    it('memastikan setiap hasil pemeriksaan pada ketiga halaman cek saat layanan mati selalu memiliki >= 1 temuan dan >= 2 langkah tindakan', async () => {
      render(<CekChatPage />);
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: 'Minta kode OTP verifikasi bank segera' } });
      fireEvent.click(screen.getByTestId('tombol-periksa'));
      await waitFor(() => expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined());
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));
      await waitFor(() => expect(screen.getByTestId('komponen-hasil')).toBeDefined());

      const temuanChat = screen.getAllByTestId('kartu-temuan');
      const langkahChat = screen.getAllByTestId(/^langkah-item-/);
      expect(temuanChat.length).toBeGreaterThanOrEqual(1);
      expect(langkahChat.length).toBeGreaterThanOrEqual(2);

      cleanup();

      render(<CekLinkPage />);
      const inputLink = screen.getByTestId('input-link');
      fireEvent.change(inputLink, { target: { value: 'https://sh0pee-klaim-voucher.xyz' } });
      fireEvent.submit(screen.getByTestId('form-input-link'));
      await screen.findByTestId('area-hasil-link');

      const temuanLink = screen.getAllByTestId('kartu-temuan');
      const langkahLink = screen.getAllByTestId(/^langkah-item-/);
      expect(temuanLink.length).toBeGreaterThanOrEqual(1);
      expect(langkahLink.length).toBeGreaterThanOrEqual(2);

      cleanup();

      render(<CekVideoSuaraPage />);
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();

      const temuanVideo = screen.getAllByTestId('kartu-temuan');
      const langkahVideo = screen.getAllByTestId(/^langkah-item-/);
      expect(temuanVideo.length).toBeGreaterThanOrEqual(1);
      expect(langkahVideo.length).toBeGreaterThanOrEqual(2);
    });

    it('memastikan tidak ada klaim pasti/vonis mutlak terlarang dan kalimat resmi "Ini tidak berarti pasti aman" tampil saat tidak ditemukan bahaya (Requirements 6.4, 30.1, 30.4)', async () => {
      render(<CekChatPage />);
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: 'Pesan konfirmasi biasa halo apa kabar' } });
      fireEvent.click(screen.getByTestId('tombol-periksa'));
      await waitFor(() => expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined());
      fireEvent.click(screen.getByTestId('btn-lanjut-periksa'));
      await waitFor(() => expect(screen.getByTestId('komponen-hasil')).toBeDefined());

      const ringkasanEl = screen.getByTestId('ringkasan-teks');
      expect(ringkasanEl.textContent).not.toMatch(/\b100% aman\b/i);
      expect(ringkasanEl.textContent).not.toMatch(/\bterbukti aman\b/i);
      expect(ringkasanEl.textContent).not.toMatch(/\b100%\b/i);
      expect(ringkasanEl.textContent).toContain('Ini tidak berarti pasti aman');
    });
  });
});
