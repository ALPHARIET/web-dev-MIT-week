// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import PanelDarurat, {
  DEFAULT_LANGKAH_DARURAT,
  DAFTAR_SITUASI_ID,
  LABEL_RINGKAS_SITUASI,
} from './PanelDarurat';

describe('components/hasil/PanelDarurat.tsx (Task 4.7)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Pemuatan Data Bawaan & 5 Situasi Darurat (Requirement 7.1, 7.3)', () => {
    it('memiliki data bawaan 5 situasi darurat dan 4 kanal lapor dari langkah-darurat.json', () => {
      expect(DEFAULT_LANGKAH_DARURAT.situasi).toHaveLength(5);
      expect(DEFAULT_LANGKAH_DARURAT.kanal_lapor).toHaveLength(4);
      expect(DEFAULT_LANGKAH_DARURAT.peringatan).toContain('IASC');

      expect(DAFTAR_SITUASI_ID).toEqual([
        'klik_link',
        'isi_data',
        'kirim_otp',
        'transfer',
        'akun_diambil',
      ]);
    });

    it('merender 5 tombol pilihan situasi saat panel terbuka', () => {
      render(<PanelDarurat autoOpen={true} />);

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeDefined();

      const tabs = within(tabList).getAllByRole('tab');
      expect(tabs).toHaveLength(5);

      DAFTAR_SITUASI_ID.forEach((situasiId) => {
        const tab = screen.getByTestId(`tab-situasi-${situasiId}`);
        expect(tab).toBeDefined();
        expect(tab.textContent).toContain(LABEL_RINGKAS_SITUASI[situasiId]);
      });
    });
  });

  describe('Kondisi Tertutup & Buka/Tutup Accordion Toggle (Requirement 7.1, 27.2)', () => {
    it('secara bawaan tertutup jika autoOpen false dan situasiAktif tidak ada', () => {
      render(<PanelDarurat />);

      const toggleBtn = screen.getByTestId('panel-darurat-toggle');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

      // Konten panel tidak ter-render saat tertutup
      expect(screen.queryByTestId('panel-darurat-content')).toBeNull();
    });

    it('dapat dibuka dan ditutup kembali dengan mengklik tombol header', () => {
      render(<PanelDarurat />);

      const toggleBtn = screen.getByTestId('panel-darurat-toggle');

      // Klik 1: Buka panel
      fireEvent.click(toggleBtn);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByTestId('panel-darurat-content')).toBeDefined();

      // Klik 2: Tutup kembali
      fireEvent.click(toggleBtn);
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByTestId('panel-darurat-content')).toBeNull();
    });
  });

  describe('Dukungan autoOpen (Requirement 7.6)', () => {
    it('langsung terbuka saat autoOpen bernilai true', () => {
      render(<PanelDarurat autoOpen={true} />);

      const toggleBtn = screen.getByTestId('panel-darurat-toggle');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

      const content = screen.getByTestId('panel-darurat-content');
      expect(content).toBeDefined();
    });
  });

  describe('Dukungan situasiAktif Terdeteksi (Requirement 7.6)', () => {
    it('otomatis terbuka dan memilih situasi "transfer" saat situasiAktif=["transfer"]', () => {
      render(<PanelDarurat situasiAktif={['transfer']} />);

      // Panel harus otomatis terbuka
      const toggleBtn = screen.getByTestId('panel-darurat-toggle');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

      // Banner peringatan tindakan terdeteksi tampil
      const banner = screen.getByTestId('banner-situasi-terdeteksi');
      expect(banner).toBeDefined();
      expect(banner.textContent).toContain('Sudah transfer');

      // Tab transfer terpilih sebagai tab aktif
      const tabTransfer = screen.getByTestId('tab-situasi-transfer');
      expect(tabTransfer.getAttribute('aria-selected')).toBe('true');

      // Checklist untuk "transfer" langsung tampil di posisi teratas
      const panelTransfer = screen.getByTestId('panel-langkah-transfer');
      expect(panelTransfer).toBeDefined();
      expect(panelTransfer.textContent).toContain('Hubungi bank pengirim sekarang juga');
    });

    it('otomatis terbuka dan memilih situasi "kirim_otp" saat situasiAktif="kirim_otp" (string)', () => {
      render(<PanelDarurat situasiAktif="kirim_otp" />);

      const toggleBtn = screen.getByTestId('panel-darurat-toggle');
      expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');

      const tabOtp = screen.getByTestId('tab-situasi-kirim_otp');
      expect(tabOtp.getAttribute('aria-selected')).toBe('true');

      const panelOtp = screen.getByTestId('panel-langkah-kirim_otp');
      expect(panelOtp).toBeDefined();
      expect(panelOtp.textContent).toContain('Hubungi call center bank atau penyedia layanan');
    });

    it('menampilkan badge "Tindakan Terdeteksi" pada header saat situasiAktif terisi', () => {
      render(<PanelDarurat situasiAktif={['transfer']} />);
      const badgeHeader = screen.getByTestId('badge-darurat-terdeteksi');
      expect(badgeHeader).toBeDefined();
      expect(badgeHeader.textContent).toContain('Tindakan Terdeteksi');
    });

    it('menampilkan penanda "!" pada tab situasi terdeteksi lain jika ada lebih dari satu situasiAktif', () => {
      render(<PanelDarurat situasiAktif={['transfer', 'kirim_otp']} />);

      // transfer aktif
      expect(screen.getByTestId('tab-situasi-transfer').getAttribute('aria-selected')).toBe('true');

      // kirim_otp terdeteksi tapi belum dipilih, sehingga memiliki badge indicator
      const badgeOtp = screen.getByTestId('badge-terdeteksi-kirim_otp');
      expect(badgeOtp).toBeDefined();
    });
  });

  describe('Interaksi Pemilihan Situasi (Requirement 7.2)', () => {
    it('mengganti checklist langkah darurat saat tab situasi lain diklik', () => {
      const handleSelect = vi.fn();
      render(<PanelDarurat autoOpen={true} onSelectSituasi={handleSelect} />);

      // Awalnya default ke 'klik_link'
      const tabKlikLink = screen.getByTestId('tab-situasi-klik_link');
      expect(tabKlikLink.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByTestId('panel-langkah-klik_link')).toBeDefined();
      expect(screen.getByText('Tutup halaman web tersebut segera.')).toBeDefined();

      // Klik tab 'isi_data'
      const tabIsiData = screen.getByTestId('tab-situasi-isi_data');
      fireEvent.click(tabIsiData);

      expect(handleSelect).toHaveBeenCalledWith('isi_data');
      expect(tabIsiData.getAttribute('aria-selected')).toBe('true');
      expect(tabKlikLink.getAttribute('aria-selected')).toBe('false');

      // Checklist berubah menjadi langkah untuk 'isi_data'
      expect(screen.getByTestId('panel-langkah-isi_data')).toBeDefined();
      expect(screen.getByText(/Ganti password lewat aplikasi/)).toBeDefined();
      expect(screen.getByText(/Aktifkan verifikasi dua langkah/)).toBeDefined();
    });

    it('menampilkan langkah yang sesuai untuk setiap situasi dari 5 situasi', () => {
      render(<PanelDarurat autoOpen={true} />);

      // 1. klik_link
      fireEvent.click(screen.getByTestId('tab-situasi-klik_link'));
      expect(screen.getByText('Tutup halaman web tersebut segera.')).toBeDefined();

      // 2. isi_data
      fireEvent.click(screen.getByTestId('tab-situasi-isi_data'));
      expect(screen.getByText(/Ganti password lewat aplikasi/)).toBeDefined();

      // 3. kirim_otp
      fireEvent.click(screen.getByTestId('tab-situasi-kirim_otp'));
      expect(screen.getByText(/Hubungi call center bank atau penyedia layanan/)).toBeDefined();

      // 4. transfer
      fireEvent.click(screen.getByTestId('tab-situasi-transfer'));
      expect(screen.getByText(/Lapor ke Indonesia Anti-Scam Centre \(IASC\)/)).toBeDefined();

      // 5. akun_diambil
      fireEvent.click(screen.getByTestId('tab-situasi-akun_diambil'));
      expect(screen.getByText(/Pulihkan akun lewat fitur pemulihan resmi/)).toBeDefined();
    });
  });

  describe('Interaksi Checklist Langkah Penyelamatan (Requirement 7.2)', () => {
    it('memperbarui status centang dan menampilkan badge "Sudah dilakukan"', () => {
      const handleToggleStep = vi.fn();
      render(<PanelDarurat autoOpen={true} onToggleStep={handleToggleStep} />);

      const checkbox0 = screen.getByRole('checkbox', {
        name: /Tandai langkah darurat 1 sudah dilakukan: Tutup halaman web tersebut segera./i,
      }) as HTMLInputElement;

      expect(checkbox0.checked).toBe(false);

      // Centang langkah 1
      fireEvent.click(checkbox0);
      expect(checkbox0.checked).toBe(true);
      expect(handleToggleStep).toHaveBeenCalledWith('klik_link', 0, true);

      // Label teks mendapatkan efek visual line-through
      const stepItem = screen.getByTestId('darurat-step-klik_link-0');
      expect(within(stepItem).getByText('Sudah dilakukan')).toBeDefined();

      // Uncentang
      fireEvent.click(checkbox0);
      expect(checkbox0.checked).toBe(false);
      expect(handleToggleStep).toHaveBeenCalledWith('klik_link', 0, false);
      expect(within(stepItem).queryByText('Sudah dilakukan')).toBeNull();
    });
  });

  describe('Menampilkan 4 Kanal Lapor Resmi (Requirement 7.4)', () => {
    it('merender keempat kanal lapor resmi beserta kontak dan keterangannya', () => {
      render(<PanelDarurat autoOpen={true} />);

      const seksiKanal = screen.getByTestId('seksi-kanal-lapor');
      expect(seksiKanal).toBeDefined();

      // 1. Indonesia Anti-Scam Centre (IASC)
      expect(screen.getByText('Indonesia Anti-Scam Centre (IASC)')).toBeDefined();
      const iascLink = screen.getByRole('link', {
        name: /Buka situs resmi Indonesia Anti-Scam Centre \(IASC\) di tab baru/i,
      });
      expect(iascLink.getAttribute('href')).toBe('https://iasc.ojk.go.id');
      expect(iascLink.getAttribute('target')).toBe('_blank');

      // 2. Kontak OJK 157
      expect(screen.getByText('Kontak OJK 157')).toBeDefined();
      expect(screen.getByText(/Layanan informasi dan pengaduan konsumen/)).toBeDefined();
      const ojkPhoneLink = screen.getByRole('link', { name: 'Telepon 157' });
      expect(ojkPhoneLink.getAttribute('href')).toBe('tel:157');
      const ojkWaLink = screen.getByRole('link', { name: 'WhatsApp OJK' });
      expect(ojkWaLink.getAttribute('href')).toBe('https://wa.me/6281157157157');

      // 3. Call Center Bank / Dompet Digital
      expect(screen.getByText('Call Center Bank / Dompet Digital')).toBeDefined();
      expect(screen.getByText(/Nomor resmi di kartu ATM atau aplikasi resmi/)).toBeDefined();

      // 4. Fitur Laporkan di Platform Pesan
      expect(screen.getByText('Fitur Laporkan di Platform Pesan')).toBeDefined();
      expect(screen.getByText(/Fitur Laporkan & Blokir di aplikasi/)).toBeDefined();
    });
  });

  describe('Peringatan Resmi Terhadap Pihak Mengaku IASC (Requirement 7.5)', () => {
    it('merender kotak peringatan resmi dengan teks spesifik mengenai penipuan mengatasnamakan IASC', () => {
      render(<PanelDarurat autoOpen={true} />);

      const peringatanBox = screen.getByTestId('peringatan-resmi-iasc');
      expect(peringatanBox).toBeDefined();
      expect(peringatanBox.textContent).toContain(
        'Waspadai pihak yang mengaku perwakilan IASC dan menjanjikan uang kembali.'
      );
      expect(peringatanBox.textContent).toContain(
        'IASC dan OJK tidak pernah meminta imbalan biaya atau meminta data rahasia seperti PIN dan OTP.'
      );
    });
  });

  describe('Target Sentuh Minimal 44px (Requirement 27.2)', () => {
    it('memiliki tinggi minimal 44px (min-h-[44px]) pada tombol toggle header', () => {
      render(<PanelDarurat />);
      const toggle = screen.getByTestId('panel-darurat-toggle');
      expect(toggle.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('memiliki tinggi minimal 44px pada kelima tab pilihan situasi', () => {
      render(<PanelDarurat autoOpen={true} />);
      DAFTAR_SITUASI_ID.forEach((id) => {
        const tab = screen.getByTestId(`tab-situasi-${id}`);
        // min-h-[48px] memenuhi syarat >= 44px
        expect(tab.className).toMatch(/min-h-\[(44|48)px\]/);
      });
    });

    it('memiliki target sentuh minimal 44px pada kotak checklist langkah', () => {
      render(<PanelDarurat autoOpen={true} />);
      const stepItem = screen.getByTestId('darurat-step-klik_link-0');
      const touchTarget = stepItem.querySelector('.min-w-\\[44px\\]');
      expect(touchTarget).toBeDefined();
      expect(touchTarget?.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('memiliki tinggi minimal 44px pada tombol/tautan kanal lapor', () => {
      render(<PanelDarurat autoOpen={true} />);
      const iascLink = screen.getByRole('link', {
        name: /Buka situs resmi Indonesia Anti-Scam Centre \(IASC\) di tab baru/i,
      });
      expect(iascLink.classList.contains('min-h-[44px]')).toBe(true);

      const phoneLink = screen.getByRole('link', { name: 'Telepon 157' });
      expect(phoneLink.classList.contains('min-h-[44px]')).toBe(true);
    });
  });

  describe('Kepatuhan Larangan Kata Terlarang (Requirement 6.7, 30.1)', () => {
    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan atau klaim', () => {
      render(<PanelDarurat autoOpen={true} />);
      const textContent = screen.getByTestId('panel-darurat-section').textContent || '';

      const forbiddenWords = ['pasti aman', 'terbukti aman', '100% aman', 'pasti penipu', 'dijamin aman'];
      forbiddenWords.forEach((phrase) => {
        expect(textContent.toLowerCase()).not.toContain(phrase);
      });
    });
  });

  describe('Dukungan className Kustom', () => {
    it('menggabungkan prop className ke container section', () => {
      render(<PanelDarurat className="custom-panel-class mt-6" />);
      const section = screen.getByTestId('panel-darurat-section');
      expect(section.classList.contains('custom-panel-class')).toBe(true);
      expect(section.classList.contains('mt-6')).toBe(true);
    });
  });

  describe('Penyesuaian Kontekstual Sesuai Modus Penipuan (Konteks APK)', () => {
    it('menampilkan langkah darurat pencopotan APK dan mode pesawat saat konteks APK terdeteksi', () => {
      render(
        <PanelDarurat
          situasiAktif={['klik_link']}
          autoOpen={true}
          isApk={true}
        />
      );

      // Tab berlabel "Unduh / Pasang APK" alih-alih hanya "Klik link"
      const tabApk = screen.getByTestId('tab-situasi-klik_link');
      expect(tabApk.textContent).toContain('Unduh / Pasang APK');

      // Banner peringatan menyebut "Unduh / Pasang APK"
      const banner = screen.getByTestId('banner-situasi-terdeteksi');
      expect(banner.textContent).toContain('Unduh / Pasang APK');

      // Judul langkah penyelamatan menyebut File APK
      const panel = screen.getByTestId('panel-langkah-klik_link');
      expect(panel.textContent).toContain('Terlanjur Unduh atau Pasang File APK');

      // Langkah 1 berfokus pada Mode Pesawat (matikan koneksi internet)
      expect(panel.textContent).toContain('Segera aktifkan Mode Pesawat');

      // Langkah 2 berfokus pada Copot Pemasangan (Uninstall)
      expect(panel.textContent).toContain('Copot Pemasangan (Uninstall)');

      // Langkah 3 berfokus pada hapus file .apk dari folder Download
      expect(panel.textContent).toContain('hapus permanen berkas file berekstensi .apk');

      // Langkah 4 berfokus pada izin Aksesibilitas dan SMS
      expect(panel.textContent).toContain('Aksesibilitas dan Akses SMS');
    });

    it('otomatis mendeteksi konteks APK dari daftar temuan temuan[].judul atau temuan[].bukti', () => {
      render(
        <PanelDarurat
          situasiAktif={['klik_link']}
          autoOpen={true}
          temuan={[
            {
              judul: 'Pengiriman atau ajakan memasang file aplikasi (APK)',
              penjelasan: 'File .apk berbahaya dikirimkan kurir',
              bukti: 'Surat_Paket.apk',
            },
          ]}
        />
      );

      const tabApk = screen.getByTestId('tab-situasi-klik_link');
      expect(tabApk.textContent).toContain('Unduh / Pasang APK');
      expect(screen.getAllByText(/Segera aktifkan Mode Pesawat/).length).toBeGreaterThan(0);
    });

    it('menampilkan kelima tab dengan label dan langkah kontekstual dinamis saat modus APK aktif', () => {
      render(
        <PanelDarurat
          isApk={true}
          autoOpen={true}
        />
      );

      // 1. Tab 1: Unduh / Pasang APK
      const tab1 = screen.getByTestId('tab-situasi-klik_link');
      expect(tab1.textContent).toContain('Unduh / Pasang APK');

      // 2. Tab 2: Beri Izin / Akses HP
      const tab2 = screen.getByTestId('tab-situasi-isi_data');
      expect(tab2.textContent).toContain('Beri Izin / Akses HP');

      // 3. Tab 3: SMS / OTP Disadap
      const tab3 = screen.getByTestId('tab-situasi-kirim_otp');
      expect(tab3.textContent).toContain('SMS / OTP Disadap');

      // 4. Tab 4: Sudah Transfer
      const tab4 = screen.getByTestId('tab-situasi-transfer');
      expect(tab4.textContent).toContain('Sudah Transfer');

      // 5. Tab 5: HP / Akun Dibobol
      const tab5 = screen.getByTestId('tab-situasi-akun_diambil');
      expect(tab5.textContent).toContain('HP / Akun Dibobol');

      // Klik tab 2 (Beri Izin / Akses HP)
      fireEvent.click(tab2);
      const panel2 = screen.getByTestId('panel-langkah-isi_data');
      expect(panel2.textContent).toContain('Terlanjur Memberi Izin Aksesibilitas atau SMS');
      expect(panel2.textContent).toContain('Safe Mode');

      // Klik tab 3 (SMS / OTP Disadap)
      fireEvent.click(tab3);
      const panel3 = screen.getByTestId('panel-langkah-kirim_otp');
      expect(panel3.textContent).toContain('SMS atau Kode OTP Terbaca / Disadap Malware APK');
      expect(panel3.textContent).toContain('Blokir M-Banking');

      // Klik tab 5 (HP / Akun Dibobol)
      fireEvent.click(tab5);
      const panel5 = screen.getByTestId('panel-langkah-akun_diambil');
      expect(panel5.textContent).toContain('Perangkat HP Dikuasai Jarak Jauh atau Akun Dibobol');
    });

    it('menampilkan tab dan langkah dinamis untuk konteks Bank Phishing', () => {
      render(
        <PanelDarurat
          autoOpen={true}
          ringkasan="Terdapat indikasi link phishing perubahan tarif perbankan BCA palsu"
        />
      );

      const tab1 = screen.getByTestId('tab-situasi-klik_link');
      expect(tab1.textContent).toContain('Buka Link Phishing');

      const tab2 = screen.getByTestId('tab-situasi-isi_data');
      expect(tab2.textContent).toContain('Isi User / PIN Bank');

      const tab5 = screen.getByTestId('tab-situasi-akun_diambil');
      expect(tab5.textContent).toContain('M-Banking Terkunci');
    });

    it('menampilkan tab dan langkah dinamis untuk konteks Task Scam / Misi Freelance', () => {
      render(
        <PanelDarurat
          autoOpen={true}
          ringkasan="Modus penipuan lowongan kerja paruh waktu komisi misi like YouTube di grup Telegram"
        />
      );

      const tab1 = screen.getByTestId('tab-situasi-klik_link');
      expect(tab1.textContent).toContain('Masuk Grup / Link Misi');

      const tab4 = screen.getByTestId('tab-situasi-transfer');
      expect(tab4.textContent).toContain('Transfer Deposit');

      const tab5 = screen.getByTestId('tab-situasi-akun_diambil');
      expect(tab5.textContent).toContain('Diancam / Akun Ditahan');
    });

    it('menampilkan tab dan langkah dinamis untuk konteks Mengaku Keluarga Ganti Nomor', () => {
      render(
        <PanelDarurat
          autoOpen={true}
          ringkasan="Pengirim mengaku keluarga pinjam hp teman karena nomor baru ganti"
        />
      );

      const tab1 = screen.getByTestId('tab-situasi-klik_link');
      expect(tab1.textContent).toContain('Percaya Chat Pengirim');

      const tab5 = screen.getByTestId('tab-situasi-akun_diambil');
      expect(tab5.textContent).toContain('Akun WhatsApp Dibajak');
    });
  });
});
