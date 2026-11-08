// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  TemplatPeringatan,
  buatTemplatPeringatan,
  deteksiPihakDicatut,
  deteksiPermintaanModus,
  dapatkanTandaBahayaUtama,
} from './TemplatPeringatan';
import { KomponenHasil } from './KomponenHasil';
import type { FormatDataHasil } from '@/lib/hasil';

describe('components/hasil/TemplatPeringatan.tsx (Task 21.2 & Requirement P1)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const dummyHasilBcaOtp: FormatDataHasil = {
    halaman: 'chat',
    level: 'tinggi',
    ringkasan: 'Pesan mengaku dari bank BCA dan meminta kode OTP rahasia dengan desakan waktu.',
    temuan: [
      {
        judul: 'Meminta kode OTP',
        penjelasan: 'Pelaku meminta kode OTP SMS untuk membobol akun perbankan korban.',
        bukti: 'Kirimkan kode 6 digit yang masuk ke SMS kamu sekarang juga',
        sumber: 'aturan',
      },
      {
        judul: 'Mencatut nama Bank BCA',
        penjelasan: 'Pesan dikirim dari nomor pribadi namun mengatasnamakan Bank BCA resmi.',
        bukti: 'Halo nasabah BCA terhormat',
        sumber: 'aturan',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan berikan kode OTP apa pun.',
      'Segera hubungi Halo BCA resmi di 1500888.',
    ],
    situasi_darurat: ['kirim_otp'],
    batasan: 'Analisis berbasis teks input.',
    pihak_ketiga: [],
    status_layanan: {},
  };

  const dummyHasilKurirApk: FormatDataHasil = {
    halaman: 'chat',
    level: 'tinggi',
    ringkasan: 'Pesan mengaku dari kurir paket JNE meminta penerima membuka file APK resi.',
    temuan: [
      {
        judul: 'Pengiriman file APK berbahaya',
        penjelasan: 'File APK resi palsu dirancang untuk menyadap SMS OTP di HP korban.',
        bukti: 'Surat_Foto_Paket.apk',
        sumber: 'aturan',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan instal file APK yang dikirimkan.',
      'Cek nomor resi langsung di website atau aplikasi resmi JNE.',
    ],
    situasi_darurat: ['klik_link'],
    batasan: 'Pemeriksaan teks chat.',
    pihak_ketiga: [],
    status_layanan: {},
  };

  const dummyHasilLinkPhishing: FormatDataHasil = {
    halaman: 'link',
    level: 'sedang',
    ringkasan: 'Tautan promo tidak resmi yang mencatut nama Shopee.',
    url: 'https://shopee-gratis-ongkir-terbaru.xyz/klaim',
    temuan: [
      {
        judul: 'Domain tiruan bukan milik Shopee resmi',
        penjelasan: 'Domain menggunakan TLD .xyz dan bukan shopee.co.id resmi.',
        bukti: 'shopee-gratis-ongkir-terbaru.xyz',
        sumber: 'rdap',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan masukkan nomor akun atau password di tautan tersebut.',
      'Akses Shopee lewat aplikasi resmi.',
    ],
    situasi_darurat: ['klik_link', 'isi_data'],
    batasan: 'Pengecekan domain reputasi.',
    pihak_ketiga: ['safe_browsing', 'rdap'],
    status_layanan: {
      safe_browsing: 'ok',
      rdap: 'ok',
    },
  };

  const dummyHasilTidakDitemukan: FormatDataHasil = {
    halaman: 'video',
    level: 'tidak_ditemukan',
    ringkasan: 'Tidak ditemukan indikasi kecurigaan atau manipulasi suara.',
    temuan: [],
    hal_wajar: ['Intonasi dan gestur wajar'],
    langkah: [
      'Tetap lakukan verifikasi jika ada permintaan transfer mendadak.',
      'Gunakan kontak lama yang tersimpan di HP.',
    ],
    situasi_darurat: [],
    batasan: 'Pemeriksaan wizard video.',
    pihak_ketiga: [],
    status_layanan: {},
  };

  // =========================================================================
  // 1. Pembangkitan Pesan Dinamis & Sanitasi
  // =========================================================================
  describe('Pembangkitan Templat Pesan Dinamis (Requirement P1)', () => {
    it('mendeteksi merek BCA dan modus permintaan OTP dengan benar', () => {
      const pihak = deteksiPihakDicatut(dummyHasilBcaOtp);
      expect(pihak).toBe('BCA');

      const modus = deteksiPermintaanModus(dummyHasilBcaOtp);
      expect(modus).toContain('OTP');

      const templat = buatTemplatPeringatan(dummyHasilBcaOtp);
      expect(templat).toContain('BCA');
      expect(templat).toContain('OTP');
      expect(templat).toContain('Jangan dibalas');
      expect(templat).toContain('nomor atau kanal resmi');
      expect(templat).toContain('Jangan pernah transfer uang, mengirim kode OTP');
    });

    it('mendeteksi pihak kurir dan modus file APK dengan benar', () => {
      const pihak = deteksiPihakDicatut(dummyHasilKurirApk);
      expect(pihak.toLowerCase()).toContain('jne');

      const modus = deteksiPermintaanModus(dummyHasilKurirApk);
      expect(modus.toLowerCase()).toContain('apk');

      const templat = buatTemplatPeringatan(dummyHasilKurirApk);
      expect(templat).toContain('JNE');
      expect(templat).toContain('file APK');
    });

    it('mendeteksi merek Shopee pada pemeriksaan tautan/link', () => {
      const pihak = deteksiPihakDicatut(dummyHasilLinkPhishing);
      expect(pihak).toBe('Shopee');

      const templat = buatTemplatPeringatan(dummyHasilLinkPhishing);
      expect(templat).toContain('Shopee');
      expect(templat).toContain('Domain tiruan bukan milik Shopee resmi');
    });

    it('menghasilkan templat fallback yang informatif saat tidak ada temuan spesifik', () => {
      const templat = buatTemplatPeringatan(dummyHasilTidakDitemukan);
      expect(templat).toBeDefined();
      expect(templat).toContain('Peringatan Waspada Modus Penipuan');
      expect(templat).toContain('Langkah perlindungan penting:');
      expect(templat).toContain('Jangan dibalas');
      expect(templat).toContain('kanal resmi');
    });

    it('tanda bahaya utama mengambil maksimal 2 temuan pertama yang disensor', () => {
      const hasilBanyakTemuan: FormatDataHasil = {
        ...dummyHasilBcaOtp,
        temuan: [
          { judul: 'Temuan 1', penjelasan: 'p1', bukti: 'b1', sumber: 'aturan' },
          { judul: 'Temuan 2', penjelasan: 'p2', bukti: 'b2', sumber: 'aturan' },
          { judul: 'Temuan 3', penjelasan: 'p3', bukti: 'b3', sumber: 'aturan' },
        ],
      };
      const tanda = dapatkanTandaBahayaUtama(hasilBanyakTemuan);
      expect(tanda).toHaveLength(2);
      expect(tanda[0]).toBe('Temuan 1');
      expect(tanda[1]).toBe('Temuan 2');
    });
  });

  // =========================================================================
  // 2. Perlindungan Privasi Data Pengguna (Requirement P1)
  // =========================================================================
  describe('Perlindungan Privasi Data Pengguna (Requirement P1)', () => {
    it('tidak menyertakan data sensitif pengguna (nomor HP, email, nomor rekening, OTP) dalam templat', () => {
      const hasilDenganDataSensitif: FormatDataHasil = {
        ...dummyHasilBcaOtp,
        ringkasan: 'Pengguna budi.santoso@example.com dihubungi dari 081234567890 minta transfer ke rekening 123456789012.',
        temuan: [
          {
            judul: 'Permintaan OTP 987654 ke nomor 081234567890',
            penjelasan: 'Pelaku meminta kode OTP 987654.',
            bukti: 'Kirim OTP 987654 sekarang',
            sumber: 'aturan',
          },
        ],
      };

      const templat = buatTemplatPeringatan(hasilDenganDataSensitif);

      // Data sensitif mentah tidak boleh muncul di templat
      expect(templat).not.toContain('budi.santoso@example.com');
      expect(templat).not.toContain('081234567890');
      expect(templat).not.toContain('123456789012');
      expect(templat).not.toContain('987654');
    });
  });

  // =========================================================================
  // 3. Kepatuhan Larangan Kata Terlarang (Requirements 6.7, 30.1)
  // =========================================================================
  describe('Bebas Kata Terlarang sebagai Vonis Mutlak (Requirements 6.7, 30.1)', () => {
    it('memastikan templat pesan bebas dari kata terlarang "aman", "pasti", "terbukti", "100%"', () => {
      const templat1 = buatTemplatPeringatan(dummyHasilBcaOtp);
      const templat2 = buatTemplatPeringatan(dummyHasilKurirApk);
      const templat3 = buatTemplatPeringatan(dummyHasilLinkPhishing);
      const templat4 = buatTemplatPeringatan(dummyHasilTidakDitemukan);

      const forbiddenRegex = /(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i;

      expect(templat1).not.toMatch(forbiddenRegex);
      expect(templat2).not.toMatch(forbiddenRegex);
      expect(templat3).not.toMatch(forbiddenRegex);
      expect(templat4).not.toMatch(forbiddenRegex);
    });

    it('memastikan teks UI modal TemplatPeringatan bebas dari kata terlarang', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const modalEl = screen.getByTestId('dialog-templat-peringatan');
      const textContent = modalEl.textContent || '';

      expect(textContent).not.toMatch(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
    });
  });

  // =========================================================================
  // 4. Interaksi UI & Modal Dialog
  // =========================================================================
  describe('Interaksi UI Komponen TemplatPeringatan', () => {
    it('merender tombol pemicu "Kirim peringatan" dan belum menampilkan modal', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} />);

      const btn = screen.getByTestId('tombol-kirim-peringatan');
      expect(btn).toBeDefined();
      expect(btn.textContent).toContain('Kirim peringatan');
      expect(screen.queryByTestId('dialog-templat-peringatan')).toBeNull();
    });

    it('membuka modal dialog saat tombol pemicu diklik', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} />);

      const btn = screen.getByTestId('tombol-kirim-peringatan');
      fireEvent.click(btn);

      const dialog = screen.getByTestId('dialog-templat-peringatan');
      expect(dialog).toBeDefined();
      expect(screen.getByText('Peringatkan Keluarga & Teman')).toBeDefined();

      const textarea = screen.getByTestId('textarea-templat-peringatan') as HTMLTextAreaElement;
      expect(textarea.value).toContain('BCA');
      expect(textarea.value).toContain('OTP');
    });

    it('memungkinkan pengguna menyunting isi templat di dalam textarea', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const textarea = screen.getByTestId('textarea-templat-peringatan') as HTMLTextAreaElement;
      fireEvent.change(textarea, {
        target: { value: 'Pesan peringatan khusus untuk grup keluarga besar.' },
      });

      expect(textarea.value).toBe('Pesan peringatan khusus untuk grup keluarga besar.');

      // Tautan WhatsApp harus terupdate dengan teks yang disunting
      const waBtn = screen.getByTestId('tombol-whatsapp-templat') as HTMLAnchorElement;
      expect(waBtn.href).toContain(encodeURIComponent('Pesan peringatan khusus untuk grup keluarga besar.'));
    });

    it('menyalin teks ke clipboard dan menampilkan status visual tersalin saat tombol Salin Teks diklik', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const btnSalin = screen.getByTestId('tombol-salin-templat');
      fireEvent.click(btnSalin);

      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copyCallArg = writeTextMock.mock.calls[0][0];
      expect(copyCallArg).toContain('BCA');

      // Feedback visual tersalin harus muncul
      await waitFor(() => {
        expect(screen.getByTestId('feedback-tersalin')).toBeDefined();
        expect(screen.getByText('Tersalin!')).toBeDefined();
      });
    });

    it('menyediakan fallback penyalinan saat navigator.clipboard tidak tersedia', async () => {
      // Mock clipboard null
      const originalClipboard = navigator.clipboard;
      // @ts-expect-error simulasi browser tanpa clipboard API
      navigator.clipboard = undefined;

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const btnSalin = screen.getByTestId('tombol-salin-templat');
      fireEvent.click(btnSalin);

      expect(execCommandMock).toHaveBeenCalledWith('copy');

      await waitFor(() => {
        expect(screen.getByTestId('feedback-tersalin')).toBeDefined();
      });

      // Kembalikan clipboard semula
      Object.assign(navigator, { clipboard: originalClipboard });
    });

    it('menyediakan tombol "Bagikan ke WhatsApp" dengan format tautan api.whatsapp.com yang benar', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const waBtn = screen.getByTestId('tombol-whatsapp-templat') as HTMLAnchorElement;
      expect(waBtn.tagName).toBe('A');
      expect(waBtn.target).toBe('_blank');
      expect(waBtn.rel).toContain('noopener');
      expect(waBtn.href).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?text=/);

      // Pastikan URL WhatsApp memuat teks ter-encode
      const urlText = decodeURIComponent(waBtn.href.split('text=')[1]);
      expect(urlText).toContain('BCA');
      expect(urlText).toContain('OTP');
    });

    it('menutup modal saat tombol Tutup atau tombol silang diklik', () => {
      const handleTutup = vi.fn();
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} onTutup={handleTutup} />);

      expect(screen.getByTestId('dialog-templat-peringatan')).toBeDefined();

      const btnTutup = screen.getByTestId('tombol-tutup-modal');
      fireEvent.click(btnTutup);

      expect(screen.queryByTestId('dialog-templat-peringatan')).toBeNull();
      expect(handleTutup).toHaveBeenCalledTimes(1);
    });

    it('menutup modal saat tombol silang (X) diklik', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const btnSilang = screen.getByTestId('tombol-silang-templat');
      fireEvent.click(btnSilang);

      expect(screen.queryByTestId('dialog-templat-peringatan')).toBeNull();
    });

    it('menutup modal saat backdrop overlay diklik', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const overlay = screen.getByTestId('overlay-templat-peringatan');
      fireEvent.click(overlay);

      expect(screen.queryByTestId('dialog-templat-peringatan')).toBeNull();
    });

    it('menutup modal saat tombol keyboard Escape ditekan', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      expect(screen.getByTestId('dialog-templat-peringatan')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByTestId('dialog-templat-peringatan')).toBeNull();
    });
  });

  // =========================================================================
  // 5. Target Sentuh Minimal 44px (Requirement 27.2)
  // =========================================================================
  describe('Aksesibilitas & Target Sentuh Minimal 44px (Requirement 27.2)', () => {
    it('seluruh elemen tombol dan tautan memiliki ukuran target sentuh minimal 44px', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const tombolKirim = screen.getByTestId('tombol-kirim-peringatan');
      expect(tombolKirim.className).toContain('min-h-[44px]');

      const tombolSilang = screen.getByTestId('tombol-silang-templat');
      expect(tombolSilang.className).toMatch(/h-11|min-h-\[44px\]/);

      const tombolSalin = screen.getByTestId('tombol-salin-templat');
      expect(tombolSalin.className).toContain('min-h-[44px]');

      const tombolWa = screen.getByTestId('tombol-whatsapp-templat');
      expect(tombolWa.className).toContain('min-h-[44px]');

      const tombolTutup = screen.getByTestId('tombol-tutup-modal');
      expect(tombolTutup.className).toContain('min-h-[44px]');
    });

    it('memiliki atribut aksesibilitas ARIA dialog yang lengkap', () => {
      render(<TemplatPeringatan hasil={dummyHasilBcaOtp} defaultOpen={true} />);

      const dialog = screen.getByTestId('dialog-templat-peringatan');
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    });
  });

  // =========================================================================
  // 6. Integrasi dalam KomponenHasil
  // =========================================================================
  describe('Integrasi TemplatPeringatan di KomponenHasil', () => {
    it('merender tombol "Kirim peringatan" di dalam KomponenHasil', () => {
      render(<KomponenHasil hasil={dummyHasilBcaOtp} />);

      const btnPeringatan = screen.getByTestId('tombol-kirim-peringatan');
      expect(btnPeringatan).toBeDefined();
      expect(btnPeringatan.textContent).toContain('Kirim peringatan');
    });

    it('dapat menyembunyikan tombol peringatan jika tampilkanTemplatPeringatan disetel false', () => {
      render(
        <KomponenHasil
          hasil={dummyHasilBcaOtp}
          tampilkanTemplatPeringatan={false}
        />
      );

      expect(screen.queryByTestId('tombol-kirim-peringatan')).toBeNull();
    });

    it('dapat membuka dialog modal peringatan langsung dari dalam KomponenHasil', () => {
      render(<KomponenHasil hasil={dummyHasilBcaOtp} />);

      const btnPeringatan = screen.getByTestId('tombol-kirim-peringatan');
      fireEvent.click(btnPeringatan);

      expect(screen.getByTestId('dialog-templat-peringatan')).toBeDefined();
      expect(screen.getByText('Peringatkan Keluarga & Teman')).toBeDefined();
    });
  });
});
