// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import CekLinkPage from '@/app/cek-link/page';
import { POST } from '@/app/api/cek-link/route';
import { checkSafeBrowsing } from '@/lib/safe-browsing';
import { queryDomainAge } from '@/lib/rdap';
import { explainLink } from '@/lib/gemini';
import linkContohJson from '@/data/contoh/link-contoh.json';
import type { FormatDataHasil } from '@/lib/hasil';

vi.mock('@/lib/safe-browsing', () => ({
  checkSafeBrowsing: vi.fn(),
}));

vi.mock('@/lib/rdap', () => ({
  queryDomainAge: vi.fn(),
}));

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    explainLink: vi.fn(),
  };
});

describe('Integrasi Penuh Halaman Cek Link Frontend & API POST /api/cek-link (Task 15.2)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();

    vi.mocked(checkSafeBrowsing).mockResolvedValue({
      ditemukan: false,
      ancaman: [],
      status: 'ok',
      keterangan: 'Tidak ada ancaman terdeteksi',
    });

    vi.mocked(queryDomainAge).mockResolvedValue({
      tersedia: false,
      status: 'tidak_tersedia',
      keterangan: 'Data RDAP tidak tersedia',
    });

    vi.mocked(explainLink).mockResolvedValue(null);

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (urlStr === '/api/cek-link' || urlStr.endsWith('/api/cek-link')) {
        try {
          const req = new Request('http://localhost:3000/api/cek-link', {
            method: init?.method || 'POST',
            headers: init?.headers,
            body: init?.body,
          });

          const res = await POST(req);
          return res;
        } catch (err) {
          console.error('FETCH MOCK ERROR:', err);
          throw err;
        }
      }

      return originalFetch(input, init);
    });
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    sessionStorage.clear();
  });

  describe('1. Alur Lengkap Pemeriksaan Normal (Frontend -> Backend)', () => {
    it('mengirimkan URL mencurigakan ke API, memproses di backend, dan merender hasil serta status layanan normal', async () => {
      vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
        ditemukan: true,
        ancaman: ['MALWARE'],
        status: 'ok',
        keterangan: 'Ditemukan ancaman MALWARE',
      });

      vi.mocked(queryDomainAge).mockResolvedValueOnce({
        tersedia: true,
        umurHari: 4,
        tanggalRegistrasi: '2025-02-15T00:00:00Z',
        status: 'ok',
        keterangan: 'Domain terdaftar 4 hari yang lalu',
      });

      const mockGeminiHasil: FormatDataHasil = {
        halaman: 'link',
        level: 'tinggi',
        ringkasan: 'Tautan ini mengandung ancaman berbahaya dan meniru institusi perbankan.',
        temuan: [
          {
            judul: 'Terdeteksi malware berbahaya',
            penjelasan: 'Google Safe Browsing mendeteksi muatan malware berbahaya.',
            bukti: 'undian-bca-gratis.xyz',
            sumber: 'safe_browsing',
          },
          {
            judul: 'Domain baru terdaftar',
            penjelasan: 'Catatan RDAP menunjukkan domain berusia 4 hari.',
            bukti: 'umur 4 hari',
            sumber: 'rdap',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan membuka atau mengklik tautan tersebut.',
          'Hubungi pihak resmi bank melalui saluran terverifikasi.',
        ],
        situasi_darurat: ['klik_link', 'isi_data'],
        batasan: 'Pemeriksaan menggabungkan analisis URL dan data ancaman pihak ketiga.',
        pihak_ketiga: ['Google Safe Browsing', 'RDAP', 'Google Gemini'],
        status_layanan: {
          safe_browsing: 'ok',
          rdap: 'ok',
          ai: 'ok',
        },
      };
      vi.mocked(explainLink).mockResolvedValueOnce(mockGeminiHasil);

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, {
        target: { value: 'https://undian-bca-gratis.xyz/klaim-hadiah' },
      });

      const formEl = screen.getByTestId('form-input-link');
      fireEvent.submit(formEl);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      expect(checkSafeBrowsing).toHaveBeenCalled();
      expect(queryDomainAge).toHaveBeenCalled();
      expect(explainLink).toHaveBeenCalled();

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      const statusKewaspadaan = screen.getByRole('status');
      expect(statusKewaspadaan.getAttribute('data-level')).toBe('tinggi');
      expect(statusKewaspadaan.textContent).toContain('Waspada tinggi');
      expect(screen.getByTestId('icon-tinggi')).toBeDefined();

      expect(screen.getByText(mockGeminiHasil.ringkasan)).toBeDefined();

      const kartuTemuan = screen.getAllByTestId('kartu-temuan');
      expect(kartuTemuan.length).toBeGreaterThanOrEqual(2);

      const blokLayanan = screen.getByTestId('blok-batasan-layanan');
      expect(blokLayanan.textContent).toContain('Google Safe Browsing');
      expect(blokLayanan.textContent).toContain('Berjalan normal');

      const langkahItems = screen.getAllByTestId(/^langkah-item-/);
      expect(langkahItems.length).toBeGreaterThanOrEqual(2);

      const panelDarurat = screen.getByTestId('panel-darurat-section');
      expect(panelDarurat).toBeDefined();
    });

    it('menangani URL yang aman/normal dan menghasilkan tingkat kewaspadaan tidak_ditemukan', async () => {
      vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
        ditemukan: false,
        ancaman: [],
        status: 'ok',
        keterangan: 'Tidak ada ancaman terdeteksi',
      });

      vi.mocked(queryDomainAge).mockResolvedValueOnce({
        tersedia: true,
        umurHari: 800,
        tanggalRegistrasi: '2022-01-01T00:00:00Z',
        status: 'ok',
        keterangan: 'Domain terdaftar 800 hari yang lalu',
      });

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, {
        target: { value: 'https://kemdikbud.go.id/berita' },
      });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');

      const statusKewaspadaan = screen.getByRole('status');
      expect(statusKewaspadaan.getAttribute('data-level')).toBe('tidak_ditemukan');
      expect(statusKewaspadaan.textContent).toContain('Tidak ditemukan tanda bahaya');
      expect(screen.getByTestId('icon-tidak_ditemukan')).toBeDefined();

      const kalimatKhususList = screen.getAllByText(
        /Kami tidak menemukan tanda bahaya yang kami kenali\. Ini tidak berarti pasti aman\./i
      );
      expect(kalimatKhususList.length).toBeGreaterThanOrEqual(1);
    });

    it('memastikan backend melakukan sanitasi parameter sensitif dari URL pengguna (Requirement 17.3, 17.4)', async () => {
      render(<CekLinkPage />);

      const sensitiveUrl =
        'https://promo-diskon.com/hadiah?email=korban@example.com&token=secrettoken123&otp=998877&voucher=merdeka50';

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: sensitiveUrl } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await waitFor(() => {
        expect(checkSafeBrowsing).toHaveBeenCalled();
      });

      const calledUrl = vi.mocked(checkSafeBrowsing).mock.calls[0][0];
      expect(calledUrl).not.toContain('korban@example.com');
      expect(calledUrl).not.toContain('secrettoken123');
      expect(calledUrl).not.toContain('998877');
      expect(calledUrl).toContain('voucher=merdeka50');
    });

    it('mengisi otomatis URL dari sessionStorage "url_dari_chat" dan dapat langsung diperiksa (Requirement 34.2)', async () => {
      const urlDariChat = 'https://bca-promo-undian.com/klaim';
      sessionStorage.setItem('url_dari_chat', urlDariChat);

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link') as HTMLInputElement;
      expect(inputEl.value).toBe(urlDariChat);
      expect(sessionStorage.getItem('url_dari_chat')).toBeNull();

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Contoh Fiktif Menggunakan Respons Simulasi Tanpa Memanggil API', () => {
    it('menampilkan hasil simulasi dari TombolContoh seketika tanpa melakukan fetch API (Requirement 21.1)', async () => {
      render(<CekLinkPage />);

      const tombolContoh = screen.getByTestId('tombol-coba-contoh');
      fireEvent.click(tombolContoh);

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(checkSafeBrowsing).not.toHaveBeenCalled();
      expect(queryDomainAge).not.toHaveBeenCalled();
      expect(explainLink).not.toHaveBeenCalled();

      const skenario0 = linkContohJson.skenario[0];
      expect(screen.getByText(skenario0.hasilSimulasi.ringkasan)).toBeDefined();
    });

    it('backend API juga mendeteksi URL contoh fiktif dan mengembalikan respons simulasi tanpa kuota API (Requirement 21.1)', async () => {
      render(<CekLinkPage />);

      const contohUrl = linkContohJson.skenario[1].url;
      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: contohUrl } });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(checkSafeBrowsing).not.toHaveBeenCalled();
      expect(queryDomainAge).not.toHaveBeenCalled();
      expect(explainLink).not.toHaveBeenCalled();

      expect(screen.getByText(linkContohJson.skenario[1].hasilSimulasi.ringkasan)).toBeDefined();
    });

    it('menampilkan link contoh sebagai teks biasa yang tidak dapat diklik (Requirements 17.2, 21.3)', async () => {
      render(<CekLinkPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      await screen.findByTestId('area-hasil-link');

      const buktiBoxes = screen.getAllByTestId('kotak-bukti');
      expect(buktiBoxes.length).toBeGreaterThan(0);

      buktiBoxes.forEach((box) => {
        expect(box.tagName.toLowerCase()).not.toBe('a');
        expect(box.closest('a')).toBeNull();
      });
    });
  });

  describe('3. Penyederhanaan UI Hasil Pemeriksaan Link', () => {
    it('menyembunyikan KotakPrivasi dan tidak merender kotak atribusi tambahan saat hasil ditampilkan', async () => {
      render(<CekLinkPage />);

      expect(screen.getByTestId('kotak-privasi')).toBeDefined();

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, { target: { value: 'https://test-link-advisory.org' } });
      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');

      expect(screen.queryByTestId('kotak-privasi')).toBeNull();
      expect(screen.queryByTestId('atribusi-google-safe-browsing')).toBeNull();
    });
  });

  describe('4. Ketahanan dan Fallback Aturan Lokal saat Terjadi Kegagalan Jaringan / Layanan', () => {
    it('melakukan fallback ke aturan leksikal lokal saat fetch mengalami kegagalan jaringan (offline) (Requirement 29.1)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (offline)'));

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, {
        target: { value: 'https://sh0pee-diskon-gede.xyz/login' },
      });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      const bannerFallback = screen.getByTestId('banner-fallback-link');
      expect(bannerFallback.textContent).toContain('Layanan pengecekan server sedang tidak tersedia');
      expect(bannerFallback.textContent).toContain('aturan leksikal lokal');

      const tombolCobaLagi = screen.getByTestId('tombol-coba-lagi');
      expect(tombolCobaLagi).toBeDefined();

      const kartuTemuan = screen.getAllByTestId('kartu-temuan');
      expect(kartuTemuan.length).toBeGreaterThanOrEqual(1);
      const hasBrandFinding = kartuTemuan.some((el) =>
        /merek|substitusi|kata pemicu|tld/i.test(el.textContent || '')
      );
      expect(hasBrandFinding).toBe(true);

      const langkahList = screen.getAllByTestId(/^langkah-item-/);
      expect(langkahList.length).toBeGreaterThanOrEqual(2);
    });

    it('melakukan fallback ke aturan lokal saat API mengembalikan status 500 server error', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Server database crash' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, {
        target: { value: 'https://dana-kaget-hadiah-2025.com/login' },
      });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      expect(screen.getByTestId('banner-fallback-link')).toBeDefined();

      const badgeSafeBrowsing = screen.getByTestId('status-badge-safe_browsing');
      expect(badgeSafeBrowsing.textContent).toContain('Gagal');
    });

    it('backend menangani kegagalan Gemini explainLink dengan fallback teks bawaan aturan lokal (Requirement 20.3, 29.2)', async () => {
      vi.mocked(explainLink).mockRejectedValueOnce(new Error('Gemini API 503 Overloaded'));

      vi.mocked(checkSafeBrowsing).mockResolvedValueOnce({
        ditemukan: false,
        ancaman: [],
        status: 'ok',
      });

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, {
        target: { value: 'https://bca-klaim-saldo.net/masuk' },
      });

      fireEvent.submit(screen.getByTestId('form-input-link'));

      await screen.findByTestId('area-hasil-link');

      expect(screen.queryByTestId('banner-fallback-link')).toBeNull();

      const badgeAi = screen.getByTestId('status-badge-ai');
      expect(badgeAi.textContent).toContain('Gagal');

      const temuan = screen.getAllByTestId('kartu-temuan');
      expect(temuan.length).toBeGreaterThanOrEqual(1);
    });

    it('melakukan pemanggilan ulang saat tombol "Coba lagi" pada banner fallback diklik', async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Offline error'))
        .mockImplementationOnce(async (input: RequestInfo | URL, init?: RequestInit) => {
          const req = new Request('http://localhost:3000/api/cek-link', {
            method: init?.method || 'POST',
            headers: init?.headers,
            body: init?.body,
          });
          return POST(req);
        });

      render(<CekLinkPage />);

      const inputEl = screen.getByTestId('input-link');
      fireEvent.change(inputEl, {
        target: { value: 'https://sh0pee-update.xyz' },
      });

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

  describe('5. Tombol "Cek lagi" dan Tautan Antar Halaman Cek', () => {
    it('tombol "Cek lagi" mereset formulir dan menghilangkan tampilan hasil (Requirement 35.1, 35.2)', async () => {
      render(<CekLinkPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      await screen.findByTestId('area-hasil-link');

      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(tombolCekLagi);

      expect(screen.queryByTestId('area-hasil-link')).toBeNull();

      const inputEl = (await screen.findByTestId('input-link')) as HTMLInputElement;
      expect(inputEl.value).toBe('');
    });

    it('menampilkan tautan ke dua halaman cek lainnya di bagian bawah hasil (Requirement 34.4)', async () => {
      render(<CekLinkPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      await screen.findByTestId('area-hasil-link');

      const linkChat = screen.getByRole('link', { name: /Cek Chat/i });
      expect(linkChat.getAttribute('href')).toBe('/cek-chat');

      const linkVideo = screen.getByRole('link', { name: /Cek Video & Suara/i });
      expect(linkVideo.getAttribute('href')).toBe('/cek-video-suara');
    });
  });
});
