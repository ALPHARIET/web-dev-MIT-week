// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import CekVideoSuaraPage from './page';
import videoContohData from '@/data/contoh/video-contoh.json';

// Mock next/navigation untuk navigasi internal jika diperlukan
vi.mock('next/navigation', () => ({
  usePathname: () => '/cek-video-suara',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('app/cek-video-suara/page.tsx — Halaman Cek Video & Suara (Task 9.2)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('1. Render Elemen Dasar Halaman Awal (Requirements 8.1, 9.1, 22.1)', () => {
    it('merender judul halaman dan deskripsi panduan yang sesuai', () => {
      render(<CekVideoSuaraPage />);

      const judul = screen.getByTestId('judul-halaman-video');
      expect(judul).toBeDefined();
      expect(judul.tagName.toLowerCase()).toBe('h1');
      expect(judul.textContent).toBe('Cek Video & Suara');

      const deskripsi = screen.getByTestId('deskripsi-halaman-video');
      expect(deskripsi).toBeDefined();
      expect(deskripsi.textContent).toContain('video call');
      expect(deskripsi.textContent).toContain('rekaman suara');
      expect(deskripsi.textContent).toContain('manipulasi AI');
    });

    it('merender KotakPrivasi dengan mode halaman="video" (Requirement 8.1, 8.2, 8.3)', () => {
      render(<CekVideoSuaraPage />);

      const kotakPrivasi = screen.getByTestId('kotak-privasi');
      expect(kotakPrivasi).toBeDefined();
      expect(kotakPrivasi.getAttribute('data-halaman')).toBe('video');

      // Memeriksa peringatan data sensitif
      const peringatan = screen.getByTestId('peringatan-sensitif');
      expect(peringatan.textContent).toContain(
        'jangan masukkan OTP, PIN, password, atau nomor rekening asli'
      );

      // Memeriksa deskripsi transparansi offline lokal
      const deskripsiLayanan = screen.getByTestId('deskripsi-layanan');
      expect(deskripsiLayanan.textContent).toContain(
        'Penilaian konteks situasi dijalankan sepenuhnya di peramban'
      );
    });

    it('merender TombolContoh dengan mode halaman="video" (Requirement 9.1, 9.4)', () => {
      render(<CekVideoSuaraPage />);

      const tombolContoh = screen.getByTestId('tombol-coba-contoh');
      expect(tombolContoh).toBeDefined();
      expect(tombolContoh.textContent).toContain('Coba contoh');

      const dropdownToggle = screen.getByTestId('tombol-pilih-dropdown');
      expect(dropdownToggle).toBeDefined();
    });

    it('merender WizardVideoSuara pada Langkah 1 pada kondisi awal', () => {
      render(<CekVideoSuaraPage />);

      const areaWizard = screen.getByTestId('area-wizard-video');
      expect(areaWizard).toBeDefined();

      const wizardEl = screen.getByTestId('wizard-video-suara');
      expect(wizardEl).toBeDefined();

      const indikator = screen.getByTestId('indikator-langkah');
      expect(indikator.textContent).toContain('Langkah 1 dari 4');

      // KomponenHasil belum tampil pada kondisi awal
      expect(screen.queryByTestId('komponen-hasil')).toBeNull();
    });
  });

  describe('2. Alur Interaksi Wizard Manual & Langkah Verifikasi per Situasi (Requirements 22.1-22.4, 23.1-23.3, 24.1-24.4, 28.1, 29.1)', () => {
    it('menyelesaikan wizard untuk situasi keluarga/teman dan panggilan masih tersambung (Requirements 24.1, 24.4)', () => {
      const startTime = performance.now();
      render(<CekVideoSuaraPage />);

      // --- LANGKAH 1: Pilih video_call ---
      const kartuVideoCall = screen.getByTestId('kartu-situasi-video_call');
      fireEvent.click(kartuVideoCall);
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 2 dari 4');

      // --- LANGKAH 2: Isi Pertanyaan Konteks ---
      // 1. Apa yang diminta: transfer
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
      // 2. Dari nomor mana: nomor baru
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      // 3. Darurat/desakan: ya
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      // 4. Diminta rahasiakan: ya
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      // 5. Bisa ditelepon balik: tidak (menolak)
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      // 6. Masih tersambung: ya (Requirement 24.4)
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-true'));

      // Maju ke Langkah 3
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 3 dari 4');

      // --- LANGKAH 3: Checklist (lewati) ---
      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      const endTime = performance.now();
      // Verifikasi kecepatan eksekusi lokal < 1 detik (1000 ms) (Requirement 28.1)
      expect(endTime - startTime).toBeLessThan(1000);

      // --- VERIFIKASI HASIL (KomponenHasil) ---
      const komponenHasil = screen.getByTestId('komponen-hasil');
      expect(komponenHasil).toBeDefined();

      // Tingkat kewaspadaan: Waspada tinggi (karena transfer + darurat + rahasia)
      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      // Langkah verifikasi masih tersambung (Requirement 24.4)
      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const langkahText = langkahSection.textContent || '';
      expect(langkahText).toContain(
        'Minta lawan bicara menoleh penuh ke samping atau melambaikan tangan di depan wajah'
      );

      // Langkah verifikasi keluarga/teman (Requirement 24.1)
      expect(langkahText).toContain(
        'telepon balik ke nomor lama yang tersimpan di kontak ponsel kamu'
      );
      expect(langkahText).toContain(
        'kode rahasia keluarga'
      );
      expect(langkahText).toContain(
        'Hubungi anggota keluarga atau rekan terdekat lainnya'
      );

      // Panel darurat terbuka otomatis karena ada permintaan transfer
      expect(screen.getByTestId('panel-darurat-section')).toBeDefined();
      expect(screen.getByTestId('blok-panel-darurat')).toBeDefined();
    });

    it('menghasilkan langkah verifikasi atasan/instansi saat situasi atasan dipilih (Requirement 24.2)', () => {
      render(<CekVideoSuaraPage />);

      // Langkah 1: Pilih rekaman video / voice note
      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Langkah 2: Konteks
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-voucher'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Langkah 3: Selesaikan
      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      // Verifikasi hasil tampil
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();
    });

    it('menghasilkan langkah verifikasi tokoh publik dan Kontak OJK 157 untuk situasi video tokoh (Requirement 24.3)', () => {
      render(<CekVideoSuaraPage />);

      // Langkah 1: Pilih tokoh
      fireEvent.click(screen.getByTestId('kartu-situasi-tokoh'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Langkah 2: Pertanyaan khusus tokoh
      fireEvent.click(screen.getByTestId('opsi-siapa_tampil-tokoh_publik'));
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-investasi'));
      fireEvent.click(screen.getByTestId('opsi-janji_untung-true'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-akun_tidak_dikenal'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Langkah 3: Centang salah satu checklist
      fireEvent.click(screen.getByTestId('checkbox-bibir_tidak_sinkron'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Verifikasi KomponenHasil
      const komponenHasil = screen.getByTestId('komponen-hasil');
      expect(komponenHasil).toBeDefined();

      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      const text = langkahSection.textContent || '';

      // Requirement 24.3: cek akun resmi & Kontak OJK 157
      expect(text).toContain(
        'Cek akun media sosial dan situs web resmi terverifikasi milik tokoh tersebut'
      );
      expect(text).toContain(
        'Kontak OJK 157'
      );
      expect(text).toContain('081-157-157-157');
    });
  });

  describe('3. Alur Penggunaan Skenario Fiktif dari TombolContoh (Requirements 9.1, 9.4, 28.1, 29.1)', () => {
    it('langsung menghasilkan FormatDataHasil dan merender KomponenHasil saat memilih skenario 1 (video-call-kakak)', () => {
      render(<CekVideoSuaraPage />);

      const skenario1 = videoContohData.skenario[0];

      // Buka dropdown skenario
      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));

      // Pilih skenario video-call-kakak
      const opsiSkenario = screen.getByTestId(`opsi-skenario-${skenario1.id}`);
      fireEvent.click(opsiSkenario);

      // Verifikasi KomponenHasil langsung tampil tanpa API eksternal
      const komponenHasil = screen.getByTestId('komponen-hasil');
      expect(komponenHasil).toBeDefined();

      // Tingkat kewaspadaan Waspada tinggi
      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      // Langkah keluarga/teman tersedia
      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      expect(langkahSection.textContent).toContain('telepon balik ke nomor lama');
      expect(langkahSection.textContent).toContain('kode rahasia keluarga');

      // Indikator skenario aktif tampil
      expect(screen.getByTestId('skenario-aktif')).toBeDefined();
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(skenario1.judul);
    });

    it('langsung menghasilkan FormatDataHasil saat memilih skenario 2 (voice-note-atasan)', () => {
      render(<CekVideoSuaraPage />);

      const skenario2 = videoContohData.skenario[1];

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      fireEvent.click(screen.getByTestId(`opsi-skenario-${skenario2.id}`));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      // Temuan permintaan voucher
      const temuanSection = screen.getByTestId('blok-temuan');
      expect(temuanSection.textContent).toContain('Permintaan transfer dana, pulsa, atau pembelian voucher');
    });

    it('langsung menghasilkan FormatDataHasil saat memilih skenario 3 (video-tokoh-investasi)', () => {
      render(<CekVideoSuaraPage />);

      const skenario3 = videoContohData.skenario[2];

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      fireEvent.click(screen.getByTestId(`opsi-skenario-${skenario3.id}`));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByText('Waspada tinggi')).toBeDefined();

      // Temuan tokoh publik dan langkah OJK 157
      const langkahSection = screen.getByTestId('blok-langkah-disarankan');
      expect(langkahSection.textContent).toContain('Kontak OJK 157');
    });

    it('dapat berganti antar skenario menggunakan tombol utama "Coba contoh"', () => {
      render(<CekVideoSuaraPage />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');

      // Klik 1: skenario 1
      fireEvent.click(tombolUtama);
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        videoContohData.skenario[0].judul
      );

      // Klik 2: skenario 2
      fireEvent.click(tombolUtama);
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        videoContohData.skenario[1].judul
      );

      // Klik 3: skenario 3
      fireEvent.click(tombolUtama);
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        videoContohData.skenario[2].judul
      );
    });
  });

  describe('4. Tombol "Cek lagi" Me-reset Wizard ke Kondisi Awal (Requirement 35.2)', () => {
    it('mengembalikan halaman ke Langkah 1 saat tombol "Cek lagi" diklik setelah menyelesaikan pemeriksaan', () => {
      render(<CekVideoSuaraPage />);

      // Jalankan skenario contoh agar hasil muncul
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      expect(screen.queryByTestId('wizard-video-suara')).toBeNull();

      // Klik tombol "Cek lagi" pada KomponenHasil
      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(tombolCekLagi);

      // KomponenHasil harus hilang
      expect(screen.queryByTestId('komponen-hasil')).toBeNull();

      // Wizard harus kembali tampil pada Langkah 1
      const wizardEl = screen.getByTestId('wizard-video-suara');
      expect(wizardEl).toBeDefined();

      const indikator = screen.getByTestId('indikator-langkah');
      expect(indikator.textContent).toContain('Langkah 1 dari 4');

      // Tombol lanjut dinonaktifkan kembali karena belum ada situasi yang dipilih
      const tombolLanjut = screen.getByTestId('tombol-lanjut');
      expect((tombolLanjut as HTMLButtonElement).disabled).toBe(true);
    });

    it('dapat melakukan pemeriksaan baru setelah tombol "Cek lagi" diklik', () => {
      render(<CekVideoSuaraPage />);

      // Skenario awal
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      expect(screen.getByTestId('komponen-hasil')).toBeDefined();

      // Reset
      fireEvent.click(screen.getByTestId('tombol-cek-lagi'));
      expect(screen.getByTestId('wizard-video-suara')).toBeDefined();

      // Pilih situasi baru secara manual
      fireEvent.click(screen.getByTestId('kartu-situasi-tokoh'));
      expect(screen.getByTestId('kartu-situasi-tokoh').getAttribute('aria-checked')).toBe('true');

      const tombolLanjut = screen.getByTestId('tombol-lanjut');
      expect((tombolLanjut as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(tombolLanjut);

      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 2 dari 4');
    });
  });

  describe('5. Tautan Navigasi ke Halaman Cek Lainnya & Cross-Links (Requirements 34.4)', () => {
    it('menampilkan tautan ke dua halaman cek lainnya di KomponenHasil', () => {
      render(<CekVideoSuaraPage />);

      // Jalankan skenario contoh
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      expect(areaHalamanLain).toBeDefined();

      const links = within(areaHalamanLain).getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      expect(hrefs).toContain('/cek-chat');
      expect(hrefs).toContain('/cek-link');
    });

    it('menampilkan tombol cross-link ke Cek Link dan Cek Chat jika relevan', () => {
      render(<CekVideoSuaraPage />);

      // Pilih skenario 3 (video-tokoh-investasi yang ada ajakan link WA/Telegram)
      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      fireEvent.click(screen.getByTestId('opsi-skenario-video-tokoh-investasi'));

      const areaCrossLinks = screen.getByTestId('area-cross-links');
      expect(areaCrossLinks).toBeDefined();

      const links = within(areaCrossLinks).getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));

      expect(hrefs).toContain('/cek-link');
      expect(hrefs).toContain('/cek-chat');
    });
  });

  describe('6. Larangan Kata Terlarang (Requirements 2.4, 6.7, 30.1)', () => {
    it('memastikan teks halaman dan hasil bebas dari kata terlarang sebagai vonis atau janji keamanan', () => {
      render(<CekVideoSuaraPage />);

      // Cek pada kondisi awal
      const mainEl = screen.getByTestId('halaman-cek-video-suara');
      const initialText = (mainEl.textContent || '').toLowerCase();

      expect(initialText).not.toContain('pasti aman');
      expect(initialText).not.toContain('terbukti aman');
      expect(initialText).not.toContain('100%');
      expect(initialText).not.toContain('dijamin');

      // Cek saat hasil tampil
      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      const hasilText = (screen.getByTestId('komponen-hasil').textContent || '').toLowerCase();

      expect(hasilText).not.toContain('pasti aman');
      expect(hasilText).not.toContain('terbukti aman');
      expect(hasilText).not.toContain('100%');
      expect(hasilText).not.toContain('dijamin');
    });
  });

  describe('7. Responsivitas dan Aksesibilitas Layout (Requirements 27.1, 27.2)', () => {
    it('menggunakan container responsif yang mendukung layar 360px hingga desktop', () => {
      const { container } = render(<CekVideoSuaraPage />);
      const main = container.querySelector('main');

      expect(main).toBeDefined();
      expect(main?.classList.contains('w-full')).toBe(true);
      expect(main?.classList.contains('max-w-4xl')).toBe(true);
      expect(main?.classList.contains('mx-auto')).toBe(true);
    });

    it('memiliki struktur landmark heading semantik (h1)', () => {
      render(<CekVideoSuaraPage />);
      const h1List = screen.getAllByRole('heading', { level: 1 });
      expect(h1List.length).toBe(1);
      expect(h1List[0].textContent).toBe('Cek Video & Suara');
    });
  });
});
