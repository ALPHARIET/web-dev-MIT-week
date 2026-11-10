// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import CekLinkPage from './page';
import linkContohData from '@/data/contoh/link-contoh.json';
import type { FormatDataHasil } from '@/lib/hasil';

describe('app/cek-link/page.tsx — Halaman Cek Link (Task 8.2)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    sessionStorage.clear();
  });

  describe('1. Rendering Elemen Dasar & Kotak Privasi (Requirements 8.1, 8.5, 8.6, 27.1)', () => {
    it('merender header halaman dengan judul dan deskripsi yang sesuai', () => {
      render(<CekLinkPage />);

      const judul = screen.getByTestId('judul-cek-link');
      expect(judul).toBeDefined();
      expect(judul.textContent).toBe('Cek Link Mencurigakan');

      const deskripsi = screen.getByTestId('deskripsi-cek-link');
      expect(deskripsi).toBeDefined();
      expect(deskripsi.textContent).toContain('Periksa alamat link atau nama domain tanpa membukanya');
    });

    it('merender KotakPrivasi dengan halaman="link" sebelum area input (Requirements 8.1, 8.5, 8.6)', () => {
      render(<CekLinkPage />);

      const kotakPrivasi = screen.getByTestId('kotak-privasi');
      expect(kotakPrivasi).toBeDefined();
      expect(kotakPrivasi.getAttribute('data-halaman')).toBe('link');

      // Pastikan menyebutkan Google Safe Browsing dan RDAP (Requirement 8.5)
      const deskripsiLayanan = screen.getByTestId('deskripsi-layanan');
      expect(deskripsiLayanan.textContent).toContain('Google Safe Browsing');
      expect(deskripsiLayanan.textContent).toContain('layanan data domain');
      expect(deskripsiLayanan.textContent).toContain('Link tidak akan kami buka');

      // Peringatan data sensitif (Requirement 8.2)
      const peringatanSensitif = screen.getByTestId('peringatan-sensitif');
      expect(peringatanSensitif.textContent).toContain('jangan masukkan OTP, PIN, password, atau nomor rekening asli');

      // KotakPrivasi berada sebelum area input di hierarki DOM (Requirement 8.6)
      const areaInput = screen.getByTestId('area-input-link');
      expect(
        kotakPrivasi.compareDocumentPosition(areaInput) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('merender TombolContoh dan InputLink di dalam area input', () => {
      render(<CekLinkPage />);

      const areaInput = screen.getByTestId('area-input-link');
      expect(areaInput).toBeDefined();

      const tombolContoh = screen.getByTestId('tombol-coba-contoh');
      expect(tombolContoh).toBeDefined();

      const inputUrl = screen.getByTestId('input-link');
      expect(inputUrl).toBeDefined();

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa).toBeDefined();

      // Hasil belum dirender pada kondisi awal
      expect(screen.queryByTestId('area-hasil-link')).toBeNull();
      expect(screen.queryByTestId('komponen-hasil')).toBeNull();
    });
  });

  describe('2. Integrasi Navigasi Cek Chat via sessionStorage (Requirement 34.2)', () => {
    it('mengisi otomatis URL dari sessionStorage "url_dari_chat" saat mount dan membersihkannya dari storage', () => {
      const urlDariChat = 'https://undian-palsu-bank.net/login';
      sessionStorage.setItem('url_dari_chat', urlDariChat);

      render(<CekLinkPage />);

      // Input otomatis terisi
      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.value).toBe(urlDariChat);

      // Key url_dari_chat sudah dibersihkan dari sessionStorage
      expect(sessionStorage.getItem('url_dari_chat')).toBeNull();
    });

    it('membiarkan input kosong jika tidak ada URL di sessionStorage', () => {
      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('3. Fitur "Coba contoh" Menggunakan Simulasi Tanpa Kuota API (Requirements 9.1, 9.3, 21.1, 21.2, 21.3)', () => {
    it('menggunakan respons simulasi dari data/contoh/link-contoh.json secara instan tanpa memanggil fetch (Requirement 21.1)', async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch;

      render(<CekLinkPage />);

      const tombolCobaContoh = screen.getByTestId('tombol-coba-contoh');
      fireEvent.click(tombolCobaContoh);

      // Hasil simulasi langsung dirender di KomponenHasil
      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      const komponenHasil = screen.getByTestId('komponen-hasil');
      expect(komponenHasil).toBeDefined();

      // Verifikasi fetch TIDAK PERNAH dipanggil (Requirement 21.1 - tanpa kuota API)
      expect(mockFetch).not.toHaveBeenCalled();

      // Memastikan salah satu temuan dari skenario pertama muncul
      const skenarioPertama = linkContohData.skenario[0];
      expect(screen.getByText(skenarioPertama.hasilSimulasi.ringkasan)).toBeDefined();
    });

    it('memastikan link contoh tidak pernah berupa tag <a> yang bisa diklik (Requirements 17.2, 21.3)', async () => {
      render(<CekLinkPage />);

      const tombolCobaContoh = screen.getByTestId('tombol-coba-contoh');
      fireEvent.click(tombolCobaContoh);

      await screen.findByTestId('area-hasil-link');

      // Cari elemen temuan yang memuat kotak bukti URL
      const buktiList = screen.getAllByTestId('kotak-bukti');
      expect(buktiList.length).toBeGreaterThan(0);

      buktiList.forEach((el) => {
        expect(el.tagName.toLowerCase()).not.toBe('a');
        expect(el.closest('a')).toBeNull();
      });
    });
  });

  describe('4. Alur Pemeriksaan Normal via POST /api/cek-link (Requirements 18.1, 18.4, 20.1, 28.2)', () => {
    it('mengirim request ke API POST /api/cek-link dengan payload yang sesuai dan merender FormatDataHasil server', async () => {
      const mockHasilServer: FormatDataHasil = {
        halaman: 'link',
        level: 'tinggi',
        ringkasan: 'Ditemukan indikasi penipuan berbahaya pada tautan ini.',
        temuan: [
          {
            judul: 'Terdeteksi di Safe Browsing',
            penjelasan: 'Tautan terindikasi phishing oleh Google Safe Browsing.',
            bukti: 'https://phishing-bca-hadiah.com',
            sumber: 'safe_browsing',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan membuka tautan tersebut.',
          'Laporkan ke pihak berwenang.',
        ],
        situasi_darurat: ['klik_link'],
        batasan: 'Pemeriksaan didasarkan pada data API.',
        pihak_ketiga: ['Google Safe Browsing', 'RDAP'],
        status_layanan: {
          safe_browsing: 'ok',
          rdap: 'ok',
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHasilServer,
      });
      global.fetch = mockFetch;

      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, {
        target: { value: 'https://phishing-bca-hadiah.com' },
      });

      const form = screen.getByTestId('form-input-link');
      fireEvent.submit(form);

      // Verifikasi fetch dipanggil ke endpoint /api/cek-link
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const [endpoint, options] = mockFetch.mock.calls[0];
      expect(endpoint).toBe('/api/cek-link');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.url).toBe('https://phishing-bca-hadiah.com');
      expect(body.levelMinimum).toBeDefined();
      expect(body.temuanAturan).toBeDefined();
      expect(options.signal).toBeDefined();

      // Verifikasi hasil dari server dirender
      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();
      expect(screen.getByText(mockHasilServer.ringkasan)).toBeDefined();
      expect(screen.getByText(mockHasilServer.temuan[0].judul)).toBeDefined();

      // Verifikasi status layanan ditampilkan (Requirement 18.4)
      const blokBatasanLayanan = screen.getByTestId('blok-batasan-layanan');
      expect(blokBatasanLayanan.textContent).toContain('Google Safe Browsing');
      expect(blokBatasanLayanan.textContent).toContain('Berjalan normal');
    });

    it('merender pemecahan URL per bagian (PemecahUrl) dengan sorotan di area hasil (Requirement LN-07)', async () => {
      const mockHasilServer: FormatDataHasil = {
        halaman: 'link',
        level: 'sedang',
        ringkasan: 'Domain ini baru didaftarkan dan menyerupai merek.',
        temuan: [
          {
            judul: 'Nama mirip merek',
            penjelasan: 'Mirip merek Shopee.',
            bukti: 'sh0pee',
            sumber: 'aturan',
          },
        ],
        hal_wajar: [],
        langkah: ['Jangan buka link.', 'Periksa kembali ejaan domain.'],
        situasi_darurat: ['klik_link'],
        batasan: 'Pemeriksaan leksikal.',
        pihak_ketiga: [],
        status_layanan: {},
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHasilServer,
      });
      global.fetch = mockFetch;

      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, {
        target: { value: 'https://sh0pee-promo.co.id/klaim' },
      });

      const form = screen.getByTestId('form-input-link');
      fireEvent.submit(form);

      await screen.findByTestId('area-hasil-link');

      // Verifikasi PemecahUrl dirender dengan bar sorotan dan rincian bagian
      const pemecah = screen.getByTestId('pemecah-url');
      expect(pemecah).toBeDefined();

      const barPemecah = screen.getByTestId('bar-pemecah-url');
      expect(barPemecah).toBeDefined();

      // Memastikan bagian domainUtama terdeteksi
      const sorotanDomain = screen.getByTestId('sorotan-domainUtama');
      expect(sorotanDomain.textContent).toContain('sh0pee-promo');

      // Memastikan kartu rincian tersedia
      expect(screen.getByTestId('kartu-bagian-domainUtama')).toBeDefined();
      expect(screen.getByTestId('kartu-bagian-path')).toBeDefined();
    });
  });

  describe('5. Alur Fallback Aturan Lokal saat API Gagal / Offline / Timeout (Requirements 18.4, 29.1, 29.3, 29.4)', () => {
    it('menggunakan hasil aturan lokal generateHasilLinkLokal saat fetch mengalami kegagalan jaringan', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error / connection offline'));
      global.fetch = mockFetch;

      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, {
        target: { value: 'https://undian-sh0pee-klaim.xyz' },
      });

      const form = screen.getByTestId('form-input-link');
      fireEvent.submit(form);

      // Hasil fallback aturan lokal tetap tampil (Requirement 29.1)
      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      // Banner peringatan fallback server tampil
      const bannerFallback = screen.getByTestId('banner-fallback-link');
      expect(bannerFallback.textContent).toContain('Layanan pengecekan server sedang tidak tersedia');
      expect(bannerFallback.textContent).toContain('aturan leksikal lokal');

      // Hasil tetap memuat minimal 1 temuan dan minimal 2 langkah (Requirement 29.4)
      const kartuTemuanList = screen.getAllByTestId('kartu-temuan');
      expect(kartuTemuanList.length).toBeGreaterThanOrEqual(1);

      const langkahItems = screen.getAllByTestId(/^langkah-item-/);
      expect(langkahItems.length).toBeGreaterThanOrEqual(2);

      // Status layanan Safe Browsing dan RDAP menandai status gagal (Requirement 18.4, 29.3)
      const statusBadge = screen.getByTestId('status-badge-safe_browsing');
      expect(statusBadge.textContent).toContain('Gagal (menggunakan fallback aturan lokal)');
    });

    it('menggunakan hasil aturan lokal saat server mengembalikan status non-200 (misalnya 500 error)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      global.fetch = mockFetch;

      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, {
        target: { value: 'https://bca-klik-promo.top' },
      });

      const form = screen.getByTestId('form-input-link');
      fireEvent.submit(form);

      const areaHasil = await screen.findByTestId('area-hasil-link');
      expect(areaHasil).toBeDefined();

      // Banner fallback tampil
      expect(screen.getByTestId('banner-fallback-link')).toBeDefined();
    });
  });

  describe('6. Penyederhanaan UI Hasil Pemeriksaan Link', () => {
    it('menyembunyikan KotakPrivasi dan tidak merender kotak atribusi tambahan saat hasil ditampilkan', async () => {
      render(<CekLinkPage />);

      // Saat masih di area input, KotakPrivasi tampil
      expect(screen.getByTestId('kotak-privasi')).toBeDefined();

      // Pilih contoh untuk menampilkan hasil
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      await screen.findByTestId('area-hasil-link');

      // Setelah hasil tampil, KotakPrivasi disembunyikan dan kotak atribusi tidak ada
      expect(screen.queryByTestId('kotak-privasi')).toBeNull();
      expect(screen.queryByTestId('atribusi-google-safe-browsing')).toBeNull();
    });
  });

  describe('7. Tombol "Cek lagi" (Requirements 35.1, 35.2, 35.3)', () => {
    it('mengosongkan input dan hasil serta mengembalikan tampilan ke formulir awal saat "Cek lagi" diklik', async () => {
      render(<CekLinkPage />);

      // Pilih contoh skenario
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      await screen.findByTestId('area-hasil-link');

      // Klik tombol "Cek lagi" di KomponenHasil
      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(tombolCekLagi);

      // Area hasil hilang
      expect(screen.queryByTestId('area-hasil-link')).toBeNull();

      // Formulir input kembali tampil dalam keadaan kosong
      const input = (await screen.findByTestId('input-link')) as HTMLInputElement;
      expect(input.value).toBe('');

      // Tombol periksa kembali siap menerima input
      expect(screen.getByTestId('tombol-periksa')).toBeDefined();
    });
  });

  describe('8. Larangan Kata Terlarang sebagai Vonis / Kesimpulan (Requirements 2.4, 6.7, 30.1)', () => {
    it('memastikan teks UI pada halaman tidak mengandung kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan', async () => {
      render(<CekLinkPage />);

      const areaInput = screen.getByTestId('area-input-link');
      const textInput = (areaInput.textContent || '').toLowerCase();

      expect(textInput).not.toContain('pasti aman');
      expect(textInput).not.toContain('terbukti aman');
      expect(textInput).not.toContain('100%');
      expect(/\bpasti\b/i.test(textInput)).toBe(false);
      expect(/\bterbukti\b/i.test(textInput)).toBe(false);

      // Pilih contoh untuk memeriksa bagian hasil
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      const areaHasil = await screen.findByTestId('area-hasil-link');
      const textHasil = (areaHasil.textContent || '').toLowerCase();

      expect(textHasil).not.toContain('pasti aman');
      expect(textHasil).not.toContain('terbukti aman');
      expect(textHasil).not.toContain('100%');
    });
  });
});
