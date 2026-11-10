// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';

import CekChatPage from '@/app/cek-chat/page';
import CekLinkPage from '@/app/cek-link/page';
import CekVideoSuaraPage from '@/app/cek-video-suara/page';
import Home from '@/app/page';
import Header, { NAV_ITEMS } from '@/components/layout/Header';
import { KomponenHasil } from '@/components/hasil/KomponenHasil';

import type { FormatDataHasil } from '@/lib/hasil';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('test/integration/navigasi-crosslink.test.tsx — Integrasi Navigasi & Cross-Link Antar Halaman (Task 15.4)', () => {
  const originalFetch = global.fetch;

  let sessionStorageStore: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageStore = {};

    const mockSessionStorage = {
      getItem: vi.fn((key: string) => sessionStorageStore[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        sessionStorageStore[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete sessionStorageStore[key];
      }),
      clear: vi.fn(() => {
        sessionStorageStore = {};
      }),
    };

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });

    const mockJpgBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    if (typeof HTMLCanvasElement.prototype.toBlob !== 'function') {
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback, type) {
        callback(new Blob([mockJpgBuffer], { type: type || 'image/jpeg' }));
      });
    } else {
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type) {
        callback(new Blob([mockJpgBuffer], { type: type || 'image/jpeg' }));
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
    }

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input.toString();

      if (urlStr === '/api/cek-chat' || urlStr.endsWith('/api/cek-chat')) {
        const mockChatResult: FormatDataHasil = {
          halaman: 'chat',
          level: 'tinggi',
          ringkasan: 'Hasil pemeriksaan AI: Terdeteksi pesan dengan tautan mencurigakan.',
          temuan: [
            {
              judul: 'Tautan berisiko tinggi',
              penjelasan: 'Pesan memuat tautan yang mengarah ke situs palsu.',
              bukti: 'https://promo-hadiah-resmi.xyz/klaim',
              sumber: 'aturan',
            },
          ],
          hal_wajar: [],
          langkah: ['Jangan klik tautan tersebut.', 'Blokir nomor pengirim.'],
          situasi_darurat: ['klik_link'],
          batasan: 'Analisis berbasis isi pesan yang dimasukkan.',
          pihak_ketiga: ['Google Gemini'],
          status_layanan: { ai: 'ok' },
        };
        return new Response(JSON.stringify(mockChatResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (urlStr === '/api/cek-link' || urlStr.endsWith('/api/cek-link')) {
        const bodyObj = init?.body ? JSON.parse(init.body as string) : {};
        const mockLinkResult: FormatDataHasil = {
          halaman: 'link',
          level: 'tinggi',
          ringkasan: 'Tautan berbahaya terdeteksi oleh Google Safe Browsing.',
          temuan: [
            {
              judul: 'Phishing atau malware terdeteksi',
              penjelasan: 'Situs ini terdaftar sebagai situs berbahaya.',
              bukti: bodyObj.url || 'https://promo-hadiah-resmi.xyz/klaim',
              sumber: 'safe_browsing',
            },
          ],
          hal_wajar: [],
          langkah: ['Tutup halaman ini segera.', 'Ganti password akun kamu jika sudah terlanjur memasukkan data.'],
          situasi_darurat: ['klik_link'],
          batasan: 'Pemeriksaan berbasis basis data Safe Browsing dan RDAP.',
          pihak_ketiga: ['Google Safe Browsing', 'RDAP'],
          status_layanan: { safe_browsing: 'ok', rdap: 'ok' },
        };
        return new Response(JSON.stringify(mockLinkResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    sessionStorageStore = {};
  });

  describe('1. Cek Chat -> Cek Link: Tombol "Cek link ini" & Pengisian Otomatis via sessionStorage (Requirements 34.1, 34.2)', () => {
    it('menampilkan tombol "Cek link ini" saat pesan chat memuat tautan URL (Requirement 34.1)', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Selamat kamu menang undian berhadiah! Buka link ini sekarang: https://promo-hadiah-resmi.xyz/klaim',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));

      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      expect(areaCrossLinks).toBeDefined();

      const tombolCekLink = within(areaCrossLinks).getByRole('link', { name: /cek link ini/i });
      expect(tombolCekLink).toBeDefined();
      expect(tombolCekLink.getAttribute('href')).toBe('/cek-link');
      expect(tombolCekLink.getAttribute('href')).not.toContain('?');
    });

    it('menyimpan URL yang terdeteksi ke sessionStorage("url_dari_chat") saat tombol "Cek link ini" diklik (Requirements 34.1, 34.2)', async () => {
      render(<CekChatPage />);

      const targetUrl = 'https://promo-hadiah-resmi.xyz/klaim';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: `Halo segera cek hadiahmu di ${targetUrl} jangan sampai hangus ya!`,
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const tombolCekLink = within(areaCrossLinks).getByRole('link', { name: /cek link ini/i });

      fireEvent.click(tombolCekLink);

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('url_dari_chat', targetUrl);
      expect(window.sessionStorage.getItem('url_dari_chat')).toBe(targetUrl);
    });

    it('halaman Cek Link (/cek-link) otomatis mengisi input URL dari sessionStorage dan membersihkan kunci tersebut (Requirement 34.2)', async () => {
      const urlDariChat = 'https://promo-hadiah-resmi.xyz/klaim';
      window.sessionStorage.setItem('url_dari_chat', urlDariChat);

      render(<CekLinkPage />);

      const inputLink = screen.getByTestId('input-link') as HTMLInputElement;
      expect(inputLink).toBeDefined();
      expect(inputLink.value).toBe(urlDariChat);

      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('url_dari_chat');
      expect(window.sessionStorage.getItem('url_dari_chat')).toBeNull();
    });

    it('pengguna dapat langsung memeriksa URL yang terisi otomatis dari Cek Chat di halaman Cek Link', async () => {
      const urlDariChat = 'https://promo-hadiah-resmi.xyz/klaim';
      window.sessionStorage.setItem('url_dari_chat', urlDariChat);

      render(<CekLinkPage />);

      const inputLink = screen.getByTestId('input-link') as HTMLInputElement;
      expect(inputLink.value).toBe(urlDariChat);

      const formInputLink = screen.getByTestId('form-input-link');
      fireEvent.submit(formInputLink);

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cek-link',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(urlDariChat),
        })
      );
    });

    it('memilih URL pertama jika terdapat lebih dari satu link dalam teks chat (Requirement 34.1)', async () => {
      render(<CekChatPage />);

      const url1 = 'https://link-pertama.com/cek';
      const url2 = 'https://link-kedua.org/test';

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: `Silakan klik tautan pertama ${url1} atau tautan cadangan ${url2} sekarang.`,
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const tombolCekLink = within(areaCrossLinks).getByRole('link', { name: /cek link ini/i });
      fireEvent.click(tombolCekLink);

      expect(window.sessionStorage.setItem).toHaveBeenCalledWith('url_dari_chat', url1);
      expect(window.sessionStorage.getItem('url_dari_chat')).toBe(url1);
    });

    it('tidak menampilkan tombol "Cek link ini" jika pesan chat tidak memuat URL', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Tolong transfer uang secepatnya ke rekening bank BCA karena ada musibah mendadak.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.queryByTestId('area-cross-links');
      if (areaCrossLinks) {
        expect(within(areaCrossLinks).queryByRole('link', { name: /cek link ini/i })).toBeNull();
      }
    });
  });

  describe('2. Cek Chat -> Cek Video & Suara: Tautan saat Modus Video Terdeteksi (Requirement 34.3)', () => {
    it('menampilkan tautan ke /cek-video-suara saat chat mendeteksi kata "video call" (Requirement 34.3)', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Halo kak tolong angkat video call sekarang juga ada hal darurat sekali terkait keluarga kamu.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const linkVideo = within(areaCrossLinks).getByRole('link', { name: /cek video & suara/i });
      expect(linkVideo).toBeDefined();
      expect(linkVideo.getAttribute('href')).toBe('/cek-video-suara');
    });

    it('menampilkan tautan ke /cek-video-suara saat chat mendeteksi kata "voice note" atau "vn" (Requirement 34.3)', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Tolong dengarkan rekaman suara atau voice note yang barusan saya kirim ya.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const linkVideo = within(areaCrossLinks).getByRole('link', { name: /cek video & suara/i });
      expect(linkVideo).toBeDefined();
      expect(linkVideo.getAttribute('href')).toBe('/cek-video-suara');
    });

    it('menampilkan KEDUA tombol cross-link saat chat memuat URL dan modus video call sekaligus', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Mari gabung video call kita dan buka link https://meeting-konfirmasi-hadiah.xyz/room sekarang.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const tombolCekLink = within(areaCrossLinks).getByRole('link', { name: /cek link ini/i });
      const tombolCekVideo = within(areaCrossLinks).getByRole('link', { name: /cek video & suara/i });

      expect(tombolCekLink).toBeDefined();
      expect(tombolCekVideo).toBeDefined();
      expect(tombolCekLink.getAttribute('href')).toBe('/cek-link');
      expect(tombolCekVideo.getAttribute('href')).toBe('/cek-video-suara');
    });

    it('tidak menampilkan tautan "Cek Video & Suara" di area cross-links jika chat tidak menyebutkan video/suara', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value: 'Pemberitahuan: Akun kamu akan dinonaktifkan dalam 24 jam. Segera hubungi customer care.',
        },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.queryByTestId('area-cross-links');
      if (areaCrossLinks) {
        expect(within(areaCrossLinks).queryByRole('link', { name: /cek video & suara/i })).toBeNull();
      }
    });
  });

  describe('3. Semua Halaman Cek: KomponenHasil Menampilkan Tautan ke Dua Halaman Cek Lainnya di Bagian Penutup (Requirement 34.4)', () => {
    it('Cek Chat (/cek-chat): menampilkan tautan ke Cek Link (/cek-link) dan Cek Video & Suara (/cek-video-suara) di bagian bawah hasil', async () => {
      render(<CekChatPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      await screen.findByTestId('komponen-hasil');

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      expect(areaHalamanLain).toBeDefined();

      const links = within(areaHalamanLain).getAllByRole('link');
      expect(links).toHaveLength(2);

      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/cek-link');
      expect(hrefs).toContain('/cek-video-suara');
      expect(hrefs).not.toContain('/cek-chat');

      const labels = links.map((l) => l.textContent || '');
      expect(labels.some((t) => t.includes('Cek Link'))).toBe(true);
      expect(labels.some((t) => t.includes('Cek Video & Suara'))).toBe(true);
    });

    it('Cek Link (/cek-link): menampilkan tautan ke Cek Chat (/cek-chat) dan Cek Video & Suara (/cek-video-suara) di bagian bawah hasil', async () => {
      render(<CekLinkPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      await screen.findByTestId('area-hasil-link');

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      expect(areaHalamanLain).toBeDefined();

      const links = within(areaHalamanLain).getAllByRole('link');
      expect(links).toHaveLength(2);

      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/cek-chat');
      expect(hrefs).toContain('/cek-video-suara');
      expect(hrefs).not.toContain('/cek-link');

      const labels = links.map((l) => l.textContent || '');
      expect(labels.some((t) => t.includes('Cek Chat'))).toBe(true);
      expect(labels.some((t) => t.includes('Cek Video & Suara'))).toBe(true);
    });

    it('Cek Video & Suara (/cek-video-suara): menampilkan tautan ke Cek Chat (/cek-chat) dan Cek Link (/cek-link) di bagian bawah hasil', async () => {
      render(<CekVideoSuaraPage />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      await screen.findByTestId('komponen-hasil');

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      expect(areaHalamanLain).toBeDefined();

      const links = within(areaHalamanLain).getAllByRole('link');
      expect(links).toHaveLength(2);

      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/cek-chat');
      expect(hrefs).toContain('/cek-link');
      expect(hrefs).not.toContain('/cek-video-suara');

      const labels = links.map((l) => l.textContent || '');
      expect(labels.some((t) => t.includes('Cek Chat'))).toBe(true);
      expect(labels.some((t) => t.includes('Cek Link'))).toBe(true);
    });

    it('semua tautan halaman lain memiliki target sentuh minimal 44px (Requirements 1.5, 27.2)', () => {
      const dummyHasil: FormatDataHasil = {
        halaman: 'chat',
        level: 'sedang',
        ringkasan: 'Hasil pemeriksaan contoh.',
        temuan: [],
        hal_wajar: [],
        langkah: ['Langkah 1', 'Langkah 2'],
        situasi_darurat: [],
        batasan: 'Batasan pengujian.',
        pihak_ketiga: [],
        status_layanan: {},
      };

      render(<KomponenHasil hasil={dummyHasil} />);

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      const links = within(areaHalamanLain).getAllByRole('link');

      links.forEach((link) => {
        expect(link.className).toContain('min-h-[44px]');
      });
    });
  });

  describe('4. Header: Navigasi ke Semua Halaman Cek (/cek-chat, /cek-link, /cek-video-suara) dan Beranda (Requirements 1.1, 1.2)', () => {
    it('menampilkan logo aplikasi yang menautkan kembali ke Beranda (/) (Requirement 1.1)', () => {
      render(<Header />);

      const logoLink = screen.getByRole('link', { name: /cek penipuan - beranda/i });
      expect(logoLink).toBeDefined();
      expect(logoLink.getAttribute('href')).toBe('/');
      expect(logoLink.className).toContain('min-h-[44px]');
    });

    it('menampilkan navigasi desktop dengan tautan ke ketiga halaman cek (Requirement 1.1)', () => {
      render(<Header />);

      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      expect(navDesktop).toBeDefined();

      const links = within(navDesktop).getAllByRole('link');
      expect(links).toHaveLength(3);

      const cekChatLink = within(navDesktop).getByRole('link', { name: 'Cek Chat' });
      const cekLinkLink = within(navDesktop).getByRole('link', { name: 'Cek Link' });
      const cekVideoLink = within(navDesktop).getByRole('link', { name: 'Cek Video & Suara' });

      expect(cekChatLink.getAttribute('href')).toBe('/cek-chat');
      expect(cekLinkLink.getAttribute('href')).toBe('/cek-link');
      expect(cekVideoLink.getAttribute('href')).toBe('/cek-video-suara');

      [cekChatLink, cekLinkLink, cekVideoLink].forEach((link) => {
        expect(link.className).toContain('min-h-[44px]');
      });
    });

    it('menandai halaman aktif dengan aria-current="page" saat pengguna berada di halaman tertentu (Requirement 1.2)', () => {
      const { unmount: unmount1 } = render(<Header currentPath="/cek-chat" />);
      let navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      expect(within(navDesktop).getByRole('link', { name: 'Cek Chat' }).getAttribute('aria-current')).toBe('page');
      expect(within(navDesktop).getByRole('link', { name: 'Cek Link' }).getAttribute('aria-current')).toBeNull();
      expect(within(navDesktop).getByRole('link', { name: 'Cek Video & Suara' }).getAttribute('aria-current')).toBeNull();
      unmount1();

      const { unmount: unmount2 } = render(<Header currentPath="/cek-link" />);
      navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      expect(within(navDesktop).getByRole('link', { name: 'Cek Chat' }).getAttribute('aria-current')).toBeNull();
      expect(within(navDesktop).getByRole('link', { name: 'Cek Link' }).getAttribute('aria-current')).toBe('page');
      expect(within(navDesktop).getByRole('link', { name: 'Cek Video & Suara' }).getAttribute('aria-current')).toBeNull();
      unmount2();

      const { unmount: unmount3 } = render(<Header currentPath="/cek-video-suara" />);
      navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      expect(within(navDesktop).getByRole('link', { name: 'Cek Chat' }).getAttribute('aria-current')).toBeNull();
      expect(within(navDesktop).getByRole('link', { name: 'Cek Link' }).getAttribute('aria-current')).toBeNull();
      expect(within(navDesktop).getByRole('link', { name: 'Cek Video & Suara' }).getAttribute('aria-current')).toBe('page');
      unmount3();

      render(<Header currentPath="/" />);
      navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      within(navDesktop).getAllByRole('link').forEach((link) => {
        expect(link.getAttribute('aria-current')).toBeNull();
      });
    });

    it('mendukung navigasi mobile responsif melalui hamburger menu (Requirements 1.1, 1.4, 27.2)', () => {
      render(<Header currentPath="/cek-chat" />);

      const hamburgerBtn = screen.getByRole('button', { name: /buka menu navigasi/i });
      expect(hamburgerBtn.getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(hamburgerBtn);
      expect(hamburgerBtn.getAttribute('aria-expanded')).toBe('true');

      const navMobile = screen.getByRole('navigation', { name: 'Navigasi Menu Mobile' });
      expect(navMobile).toBeDefined();

      const mobileLinks = within(navMobile).getAllByRole('link');
      expect(mobileLinks).toHaveLength(3);

      expect(within(navMobile).getByRole('link', { name: 'Cek Chat' }).getAttribute('href')).toBe('/cek-chat');
      expect(within(navMobile).getByRole('link', { name: 'Cek Link' }).getAttribute('href')).toBe('/cek-link');
      expect(within(navMobile).getByRole('link', { name: 'Cek Video & Suara' }).getAttribute('href')).toBe('/cek-video-suara');

      expect(within(navMobile).getByRole('link', { name: 'Cek Chat' }).getAttribute('aria-current')).toBe('page');

      fireEvent.click(hamburgerBtn);
      expect(hamburgerBtn.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('navigation', { name: 'Navigasi Menu Mobile' })).toBeNull();
    });
  });

  describe('5. Beranda: 3 Kartu Menu Mengarah ke Masing-Masing Halaman Cek (Requirements 3.1, 3.2, 3.3, 3.4, 3.5)', () => {
    it('merender tepat tiga kartu menu bertumpuk vertikal dengan nomor urut 1, 2, 3 (Requirements 3.1, 3.2)', () => {
      render(<Home />);

      const container = screen.getByTestId('menu-kartu-container');
      expect(container).toBeDefined();

      const kartuList = within(container).getAllByTestId('kartu-menu');
      expect(kartuList).toHaveLength(3);

      const nomorList = within(container).getAllByTestId('kartu-menu-nomor');
      expect(nomorList).toHaveLength(3);
      expect(nomorList[0].textContent).toBe('1');
      expect(nomorList[1].textContent).toBe('2');
      expect(nomorList[2].textContent).toBe('3');
    });

    it('kartu 1 mengarah ke /cek-chat dengan judul "Cek Chat" (Requirement 3.3)', () => {
      render(<Home />);

      const container = screen.getByTestId('menu-kartu-container');
      const kartuList = within(container).getAllByTestId('kartu-menu');
      const kartu1 = kartuList[0];

      expect(kartu1.getAttribute('href')).toBe('/cek-chat');
      expect(within(kartu1).getByText('Cek Chat')).toBeDefined();
      expect(within(kartu1).getByText(/Tempel isi chat atau unggah screenshot/i)).toBeDefined();
      expect(kartu1.className).toContain('min-h-[44px]');
    });

    it('kartu 2 mengarah ke /cek-link dengan judul "Cek Link" (Requirement 3.4)', () => {
      render(<Home />);

      const container = screen.getByTestId('menu-kartu-container');
      const kartuList = within(container).getAllByTestId('kartu-menu');
      const kartu2 = kartuList[1];

      expect(kartu2.getAttribute('href')).toBe('/cek-link');
      expect(within(kartu2).getByText('Cek Link')).toBeDefined();
      expect(within(kartu2).getByText(/Periksa alamat link tanpa membukanya/i)).toBeDefined();
      expect(kartu2.className).toContain('min-h-[44px]');
    });

    it('kartu 3 mengarah ke /cek-video-suara dengan judul "Cek Video & Suara" (Requirement 3.5)', () => {
      render(<Home />);

      const container = screen.getByTestId('menu-kartu-container');
      const kartuList = within(container).getAllByTestId('kartu-menu');
      const kartu3 = kartuList[2];

      expect(kartu3.getAttribute('href')).toBe('/cek-video-suara');
      expect(within(kartu3).getByText('Cek Video & Suara')).toBeDefined();
      expect(within(kartu3).getByText(/Jawab beberapa pertanyaan tentang video call/i)).toBeDefined();
      expect(kartu3.className).toContain('min-h-[44px]');
    });
  });

  describe('6. Alur Terintegrasi Antar Komponen Halaman', () => {
    it('mensimulasikan alur komprehensif: deteksi URL di chat -> klik simpan ke sessionStorage -> buka Cek Link -> reset via Cek Lagi', async () => {
      const { unmount: unmountChat } = render(<CekChatPage />);

      const targetUrl = 'https://undian-kejutan-berhadiah.xyz/ambil';
      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: { value: `Silakan klaim dana tunai di ${targetUrl} sekarang juga!` },
      });

      fireEvent.click(screen.getByTestId('tombol-periksa'));
      const btnLanjut = await screen.findByTestId('btn-lanjut-periksa');
      fireEvent.click(btnLanjut);

      await screen.findByTestId('komponen-hasil');

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      const tombolCekLink = within(areaCrossLinks).getByRole('link', { name: /cek link ini/i });
      fireEvent.click(tombolCekLink);

      expect(window.sessionStorage.getItem('url_dari_chat')).toBe(targetUrl);

      unmountChat();

      const { unmount: unmountLink } = render(<CekLinkPage />);

      const inputLink = screen.getByTestId('input-link') as HTMLInputElement;
      expect(inputLink.value).toBe(targetUrl);

      fireEvent.submit(screen.getByTestId('form-input-link'));
      await screen.findByTestId('area-hasil-link');

      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(tombolCekLagi);

      await screen.findByTestId('area-input-link');
      expect((screen.getByTestId('input-link') as HTMLInputElement).value).toBe('');

      unmountLink();
    });
  });
});
