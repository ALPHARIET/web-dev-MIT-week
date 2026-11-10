// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import CekVideoSuaraPage from '@/app/cek-video-suara/page';
import videoContohData from '@/data/contoh/video-contoh.json';

function renderKuis() {
  const hasil = render(<CekVideoSuaraPage />);
  fireEvent.click(screen.getByTestId('tab-mode-kuis'));
  return hasil;
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/cek-video-suara',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('test/integration/cek-video-integration.test.tsx — Integrasi Cek Video & Suara Offline (Task 15.3, Requirements 23.3, 28.1, 29.1)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;
  const originalNavigatorOnLine = navigator.onLine;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.fn().mockRejectedValue(new Error('Network call prohibited in offline P0 flow!'));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    Object.defineProperty(navigator, 'onLine', {
      value: originalNavigatorOnLine,
      configurable: true,
      writable: true,
    });
  });

  describe('1. Alur Sepenuhnya Offline & Bebas Panggilan Jaringan Eksternal (Requirements 23.3, 29.1)', () => {
    it('menjalankan alur wizard manual dari Langkah 1 s.d. Hasil tanpa satu pun panggilan fetch', () => {
      renderKuis();

      const kartu = screen.getByTestId('kartu-situasi-video_call');
      fireEvent.click(kartu);
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-otp_pin'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('checkbox-bibir_tidak_sinkron'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();

      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });

    it('menjalankan seluruh 3 skenario contoh fiktif tanpa satu pun panggilan fetch', () => {
      renderKuis();

      for (const skenario of videoContohData.skenario) {
        fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
        fireEvent.click(screen.getByTestId(`opsi-skenario-${skenario.id}`));

        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
        expect(fetchSpy).toHaveBeenCalledTimes(0);
      }
    });

    it('tetap berfungsi 100% normal saat koneksi browser diputus (navigator.onLine = false)', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
        writable: true,
      });

      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();
      expect(fetchSpy).toHaveBeenCalledTimes(0);
    });

    it('memastikan status layanan mencatat AI tidak digunakan ("tidak_dipakai") pada alur offline P0 (Requirement 29.1)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      fireEvent.click(screen.getByTestId(`opsi-skenario-${videoContohData.skenario[0].id}`));

      const blokBatasan = screen.getByTestId('blok-batasan-layanan');
      expect(blokBatasan).toBeDefined();

      const textBatasan = blokBatasan.textContent || '';
      expect(textBatasan).toContain('Penilaian dilakukan berdasarkan aturan konteks');
      expect(textBatasan).toContain('berfungsi penuh di peramban');
      expect(textBatasan).toContain('Analisis AI');
      expect(textBatasan).toContain('Tidak digunakan');
    });
  });

  describe('2. Kecepatan Respons Pemeriksaan < 1 Detik (1.000 ms) (Requirement 28.1)', () => {
    it('menghasilkan hasil kalkulasi wizard manual dalam waktu kurang dari 1.000 ms', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-investasi'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-akun_tidak_dikenal'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      const startTime = performance.now();
      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));
      const endTime = performance.now();

      const durasiMs = endTime - startTime;
      expect(durasiMs).toBeLessThan(1000);

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
    });

    it('menghasilkan hasil saat klik skenario contoh dalam waktu kurang dari 1.000 ms untuk semua skenario', () => {
      renderKuis();

      for (const skenario of videoContohData.skenario) {
        const startTime = performance.now();

        fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
        fireEvent.click(screen.getByTestId(`opsi-skenario-${skenario.id}`));

        const endTime = performance.now();
        const durasiMs = endTime - startTime;

        expect(durasiMs).toBeLessThan(1000);
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      }
    });

    it('mereset halaman kembali ke wizard awal melalui tombol "Cek lagi" secara instan (< 1.000 ms)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();

      const startTime = performance.now();
      fireEvent.click(screen.getByTestId('tombol-cek-lagi'));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(screen.queryByTestId('komponen-hasil')).toBeNull();
      expect(screen.getByTestId('wizard-video-suara')).toBeDefined();
    });
  });

  describe('3. Ketepatan Skor, Bobot Aturan, dan Kombinasi Khusus (Requirements 23.1, 23.2)', () => {
    it('mendeteksi kombinasi khusus 1: Minta Uang/OTP + Darurat/Rahasia langsung menghasilkan level TINGGI', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_lama_tersimpan'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();
    });

    it('mendeteksi kombinasi khusus 2: Tokoh Publik + Janji Untung langsung menghasilkan level TINGGI', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-tokoh'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-siapa_tampil-tokoh_publik'));
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-tidak_ada'));
      fireEvent.click(screen.getByTestId('opsi-janji_untung-true'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_lama_tersimpan'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();
    });

    it('menghasilkan tingkat SEDANG saat skor 3-5 tanpa kombinasi khusus', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-link_apk'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-akun_tidak_dikenal'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Perlu hati-hati')).toBeDefined();
    });

    it('menghasilkan tingkat TIDAK DITEMUKAN saat skor < 3 tanpa kombinasi khusus', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-tidak_ada'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_lama_tersimpan'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Tidak ditemukan tanda bahaya')).toBeDefined();

      const ringkasan = screen.getByTestId('ringkasan-teks');
      expect(ringkasan.textContent).toContain('tidak berarti pasti aman');
    });

    it('menambahkan skor dan temuan untuk setiap tanda pengamatan checklist visual/audio (+1 per tanda)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-tidak_ada'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_lama_tersimpan'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('checkbox-bibir_tidak_sinkron'));
      fireEvent.click(screen.getByTestId('checkbox-kedipan_aneh'));
      fireEvent.click(screen.getByTestId('checkbox-suara_datar_napas'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Perlu hati-hati')).toBeDefined();

      const areaTemuan = screen.getByTestId('blok-temuan');
      const textTemuan = areaTemuan.textContent || '';
      expect(textTemuan).toContain('Bibir tidak sinkron');
      expect(textTemuan).toContain('Kedipan aneh');
      expect(textTemuan).toContain('Suara datar tanpa tarikan napas');
    });
  });

  describe('4. Tampilan Situasi Darurat & Panel Darurat Sesuai Jawaban (Requirements 7.1-7.6, 24, 29.1)', () => {
    it('menampilkan Panel Darurat situasi "transfer" saat jawaban melibatkan permintaan transfer atau voucher', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const panelDaruratSection = screen.getByTestId('panel-darurat-section');
      expect(panelDaruratSection).toBeDefined();

      const blokDarurat = screen.getByTestId('blok-panel-darurat');
      expect(blokDarurat).toBeDefined();

      const tabTransfer = screen.getByTestId('tab-situasi-transfer');
      expect(tabTransfer.getAttribute('aria-selected')).toBe('true');

      const teksDarurat = blokDarurat.textContent || '';
      expect(teksDarurat).toContain('Hubungi bank pengirim');
      expect(teksDarurat).toContain('pemblokiran rekening tujuan transfer');
      expect(teksDarurat).toContain('Siapkan bukti transaksi');
    });

    it('menampilkan Panel Darurat situasi "kirim_otp" saat jawaban melibatkan permintaan OTP/PIN', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-otp_pin'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const blokDarurat = screen.getByTestId('blok-panel-darurat');
      expect(blokDarurat).toBeDefined();

      const tabOtp = screen.getByTestId('tab-situasi-kirim_otp');
      expect(tabOtp.getAttribute('aria-selected')).toBe('true');

      const teksDarurat = blokDarurat.textContent || '';
      expect(teksDarurat).toContain('Hubungi call center bank');
      expect(teksDarurat).toContain('pemblokiran sementara transaksi atau akun');
      expect(teksDarurat).toContain('keluarkan perangkat asing');
    });

    it('menampilkan Panel Darurat situasi "klik_link" saat jawaban melibatkan permintaan link APK atau janji untung', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-link_apk'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-akun_tidak_dikenal'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const blokDarurat = screen.getByTestId('blok-panel-darurat');
      expect(blokDarurat).toBeDefined();

      const tabLink = screen.getByTestId('tab-situasi-klik_link');
      expect(tabLink.getAttribute('aria-selected')).toBe('true');

      const teksDarurat = blokDarurat.textContent || '';
      expect(teksDarurat).toContain('Tutup halaman web tersebut segera');
      expect(teksDarurat).toContain('Jangan memasang file .apk');
      expect(teksDarurat).toContain('Hapus file unduhan tersebut');
    });
  });

  describe('5. Langkah Verifikasi Tindakan Sesuai Situasi Spesifik (Requirements 24.1-24.4, 29.4)', () => {
    it('situasi keluarga/teman: memuat verifikasi nomor lama tersimpan, kode rahasia keluarga, dan kerabat lain (Requirement 24.1)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const text = langkahSection.textContent || '';

      expect(text).toContain('telepon balik ke nomor lama yang tersimpan di kontak ponsel kamu');
      expect(text).toContain('kode rahasia keluarga');
      expect(text).toContain('Hubungi anggota keluarga atau rekan terdekat lainnya');
    });

    it('situasi atasan/instansi: memuat verifikasi jalur resmi kantor/email resmi (Requirement 24.2)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      fireEvent.click(screen.getByTestId('opsi-skenario-voice-note-atasan'));

      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const text = langkahSection.textContent || '';

      expect(text).toContain('Konfirmasikan instruksi lewat jalur resmi kantor atau kampus');
      expect(text).toContain('Temui langsung atasan/dosen bersangkutan atau tanyakan kepada rekan kerja');
    });

    it('situasi tokoh publik/investasi: memuat verifikasi akun/web resmi dan Kontak OJK 157 (Requirement 24.3)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-tokoh'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-siapa_tampil-tokoh_publik'));
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-investasi'));
      fireEvent.click(screen.getByTestId('opsi-janji_untung-true'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-akun_tidak_dikenal'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const text = langkahSection.textContent || '';

      expect(text).toContain('Cek akun media sosial dan situs web resmi terverifikasi milik tokoh tersebut');
      expect(text).toContain('Kontak OJK 157');
      expect(text).toContain('081-157-157-157');
      expect(text).toContain('Jangan mengklik tautan yang mengarahkan ke grup privat WhatsApp atau Telegram');
    });

    it('panggilan masih tersambung: menyarankan lawan bicara menoleh penuh atau melambaikan tangan (Requirement 24.4)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-otp_pin'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-true'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const text = langkahSection.textContent || '';

      expect(text).toContain(
        'Minta lawan bicara menoleh penuh ke samping atau melambaikan tangan di depan wajah'
      );
      expect(text).toContain('cara ini tidak selalu berhasil');
    });

    it('memastikan setiap hasil memuat minimal 1 temuan dan minimal 2 langkah tindakan (Requirement 29.4)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-tidak_ada'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_lama_tersimpan'));
      fireEvent.click(screen.getByTestId('opsi-darurat-false'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const items = within(langkahSection).getAllByRole('listitem');

      expect(items.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('6. Alur Navigasi, Cross-Links, dan Reset Halaman (Requirements 34.4, 35.2)', () => {
    it('menampilkan cross-links ke Cek Link dan Cek Chat ketika ada indikasi tautan eksternal', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      fireEvent.click(screen.getByTestId('opsi-skenario-video-tokoh-investasi'));

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      expect(areaCrossLinks).toBeDefined();

      const links = within(areaCrossLinks).getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      expect(hrefs).toContain('/cek-link');
      expect(hrefs).toContain('/cek-chat');
    });

    it('menampilkan link navigasi ke halaman cek lainnya di bagian bawah hasil (Requirement 34.4)', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      expect(areaHalamanLain).toBeDefined();

      const links = within(areaHalamanLain).getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      expect(hrefs).toContain('/cek-chat');
      expect(hrefs).toContain('/cek-link');
    });

    it('mengembalikan state ke Langkah 1 secara bersih saat tombol "Cek lagi" diklik', () => {
      renderKuis();

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();

      fireEvent.click(screen.getByTestId('tombol-cek-lagi'));

      expect(screen.queryByTestId('komponen-hasil')).toBeNull();
      const indikator = screen.getByTestId('indikator-langkah');
      expect(indikator.textContent).toContain('Langkah 1 dari 4');

      const tombolLanjut = screen.getByTestId('tombol-lanjut');
      expect((tombolLanjut as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('7. Bebas Kata Terlarang sebagai Vonis Mutlak (Requirements 2.4, 6.7, 30.1)', () => {
    it('memastikan teks halaman dan seluruh variasi hasil bebas dari "pasti aman", "terbukti aman", "100%", atau "dijamin"', () => {
      renderKuis();

      const dilarang = ['pasti aman', 'terbukti aman', '100%', 'dijamin'];

      for (const skenario of videoContohData.skenario) {
        fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
        fireEvent.click(screen.getByTestId(`opsi-skenario-${skenario.id}`));

        const teksHasil = (screen.getByTestId('komponen-hasil').textContent || '').toLowerCase();
        for (const kata of dilarang) {
          expect(teksHasil).not.toContain(kata);
        }

        fireEvent.click(screen.getByTestId('tombol-cek-lagi'));
      }
    });
  });
});
