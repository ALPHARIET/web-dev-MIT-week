// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  WizardVideoSuara,
  DAFTAR_SITUASI_VIDEO,
  DAFTAR_CHECKLIST_PENGAMATAN,
} from './WizardVideoSuara';
import videoContohData from '../../data/contoh/video-contoh.json';
import type { FormatDataHasil } from '../../lib/hasil';

describe('components/input/WizardVideoSuara.tsx (Task 9.1)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Langkah 1: Tiga Kartu Pilihan Situasi (Requirement 22.1)', () => {
    it('merender ketiga kartu pilihan situasi dengan judul dan deskripsi yang benar', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      // Verifikasi indikator langkah awal
      const indikator = screen.getByTestId('indikator-langkah');
      expect(indikator.textContent).toContain('Langkah 1 dari 4');

      // Verifikasi keberadaan 3 kartu situasi
      for (const situasi of DAFTAR_SITUASI_VIDEO) {
        const kartu = screen.getByTestId(`kartu-situasi-${situasi.id}`);
        expect(kartu).toBeDefined();
        expect(kartu.textContent).toContain(situasi.judul);
        expect(kartu.textContent).toContain(situasi.deskripsi);
        expect(kartu.getAttribute('aria-checked')).toBe('false');
      }

      // Tombol lanjut dinonaktifkan di awal karena belum ada situasi yang dipilih
      const tombolLanjut = screen.getByTestId('tombol-lanjut');
      expect((tombolLanjut as HTMLButtonElement).disabled).toBe(true);
    });

    it('mengaktifkan tombol "Lanjut" setelah pengguna memilih salah satu situasi', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      const kartuVideoCall = screen.getByTestId('kartu-situasi-video_call');
      fireEvent.click(kartuVideoCall);

      expect(kartuVideoCall.getAttribute('aria-checked')).toBe('true');
      expect(screen.getByTestId('indikator-terpilih-situasi')).toBeDefined();

      const tombolLanjut = screen.getByTestId('tombol-lanjut');
      expect((tombolLanjut as HTMLButtonElement).disabled).toBe(false);
    });

    it('dapat berpindah pilihan situasi sebelum menekan tombol "Lanjut"', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      const kartuRekaman = screen.getByTestId('kartu-situasi-rekaman');
      const kartuTokoh = screen.getByTestId('kartu-situasi-tokoh');

      fireEvent.click(kartuRekaman);
      expect(kartuRekaman.getAttribute('aria-checked')).toBe('true');
      expect(kartuTokoh.getAttribute('aria-checked')).toBe('false');

      fireEvent.click(kartuTokoh);
      expect(kartuRekaman.getAttribute('aria-checked')).toBe('false');
      expect(kartuTokoh.getAttribute('aria-checked')).toBe('true');
    });

    it('berpindah ke Langkah 2 saat tombol "Lanjut" ditekan', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      const indikator = screen.getByTestId('indikator-langkah');
      expect(indikator.textContent).toContain('Langkah 2 dari 4');
      expect(screen.getByText('Langkah 2: Pertanyaan Konteks Komunikasi')).toBeDefined();
    });
  });

  describe('Langkah 2: Pertanyaan Konteks Komunikasi (Requirements 22.2, 22.3, 22.4)', () => {
    it('merender pertanyaan konteks wajib untuk situasi video_call (Requirement 22.3)', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Pertanyaan wajib
      expect(screen.getByTestId('pertanyaan-apa-diminta')).toBeDefined();
      expect(screen.getByTestId('pertanyaan-nomor-akun')).toBeDefined();
      expect(screen.getByTestId('pertanyaan-darurat-desakan')).toBeDefined();
      expect(screen.getByTestId('pertanyaan-diminta-rahasiakan')).toBeDefined();
      expect(screen.getByTestId('pertanyaan-bisa-telepon-balik')).toBeDefined();

      // Pertanyaan tambahan untuk video_call (Requirement 24.4)
      expect(screen.getByTestId('pertanyaan-masih-tersambung')).toBeDefined();

      // Tidak merender pertanyaan khusus tokoh pada situasi video_call
      expect(screen.queryByTestId('pertanyaan-siapa-tampil')).toBeNull();
      expect(screen.queryByTestId('pertanyaan-janji-untung')).toBeNull();
    });

    it('merender pertanyaan khusus tokoh pada situasi tokoh (Requirement 22.4)', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      fireEvent.click(screen.getByTestId('kartu-situasi-tokoh'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Pertanyaan khusus tokoh
      expect(screen.getByTestId('pertanyaan-siapa-tampil')).toBeDefined();
      expect(screen.getByTestId('pertanyaan-janji-untung')).toBeDefined();

      // Tidak merender pertanyaan masih_tersambung pada situasi tokoh
      expect(screen.queryByTestId('pertanyaan-masih-tersambung')).toBeNull();
    });

    it('menonaktifkan tombol "Lanjut ke Checklist" sampai seluruh pertanyaan wajib terisi', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      const tombolLanjut = screen.getByTestId('tombol-lanjut') as HTMLButtonElement;
      expect(tombolLanjut.disabled).toBe(true);

      // Isi pertanyaan 1
      fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
      expect(tombolLanjut.disabled).toBe(true);

      // Isi pertanyaan 2
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      expect(tombolLanjut.disabled).toBe(true);

      // Isi pertanyaan 3
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      expect(tombolLanjut.disabled).toBe(true);

      // Isi pertanyaan 4
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      expect(tombolLanjut.disabled).toBe(true);

      // Isi pertanyaan 5 (lengkap)
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      expect(tombolLanjut.disabled).toBe(false);
    });

    it('dapat kembali ke Langkah 1 dengan tombol "Kembali" dan mempertahankan situasi yang dipilih', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      fireEvent.click(screen.getByTestId('kartu-situasi-rekaman'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 2 dari 4');

      fireEvent.click(screen.getByTestId('tombol-kembali'));

      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 1 dari 4');
      const kartuRekaman = screen.getByTestId('kartu-situasi-rekaman');
      expect(kartuRekaman.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Langkah 3: Checklist Pengamatan Visual & Audio (Requirement 23.1, Task Details)', () => {
    function majuKeLangkah3(situasi: 'video_call' | 'rekaman' | 'tokoh' = 'video_call') {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      fireEvent.click(screen.getByTestId(`kartu-situasi-${situasi}`));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      if (situasi === 'tokoh') {
        fireEvent.click(screen.getByTestId('opsi-siapa_tampil-tokoh_publik'));
        fireEvent.click(screen.getByTestId('opsi-apa_diminta-investasi'));
        fireEvent.click(screen.getByTestId('opsi-janji_untung-true'));
        fireEvent.click(screen.getByTestId('opsi-nomor_akun-akun_tidak_dikenal'));
        fireEvent.click(screen.getByTestId('opsi-darurat-true'));
        fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
        fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      } else {
        fireEvent.click(screen.getByTestId('opsi-apa_diminta-transfer'));
        fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
        fireEvent.click(screen.getByTestId('opsi-darurat-true'));
        fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
        fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      }

      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      return onHasilReady;
    }

    it('merender ketujuh item checklist pengamatan beserta catatan edukatif deepfake', () => {
      majuKeLangkah3();

      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 3 dari 4');
      expect(screen.getByTestId('catatan-deepfake')).toBeDefined();

      for (const item of DAFTAR_CHECKLIST_PENGAMATAN) {
        const itemEl = screen.getByTestId(`item-checklist-${item.id}`);
        expect(itemEl).toBeDefined();
        expect(itemEl.textContent).toContain(item.label);
        expect(itemEl.textContent).toContain(item.deskripsi);

        const checkbox = screen.getByTestId(`checkbox-${item.id}`) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      }
    });

    it('dapat mencentang dan membatalkan centang pada item checklist', () => {
      majuKeLangkah3();

      const itemBibir = DAFTAR_CHECKLIST_PENGAMATAN[0];
      const checkboxBibir = screen.getByTestId(`checkbox-${itemBibir.id}`) as HTMLInputElement;

      // Centang
      fireEvent.click(checkboxBibir);
      expect(checkboxBibir.checked).toBe(true);

      // Batalkan centang
      fireEvent.click(checkboxBibir);
      expect(checkboxBibir.checked).toBe(false);
    });

    it('dapat kembali ke Langkah 2 dari Langkah 3 dengan tombol "Kembali"', () => {
      majuKeLangkah3();

      fireEvent.click(screen.getByTestId('tombol-kembali'));
      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 2 dari 4');
    });

    it('dapat melewati checklist dengan tombol "Lewati checklist" dan langsung menghasilkan hasil', () => {
      const onHasilReady = majuKeLangkah3();

      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      expect(hasil.halaman).toBe('video');
      expect(hasil.level).toBe('tinggi'); // Kombinasi minta transfer + darurat = tinggi
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByTestId('langkah-selesai')).toBeDefined();
    });

    it('menghasilkan hasil dengan temuan checklist saat tombol "Lihat Hasil" ditekan', () => {
      const onHasilReady = majuKeLangkah3();

      // Pilih dua tanda checklist
      fireEvent.click(screen.getByTestId('checkbox-bibir_tidak_sinkron'));
      fireEvent.click(screen.getByTestId('checkbox-suara_datar_napas'));

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      // Verifikasi temuan checklist tercatat
      const temuanBibir = hasil.temuan.find((t) => t.judul.includes('Bibir tidak sinkron'));
      const temuanSuara = hasil.temuan.find((t) => t.judul.includes('Suara datar tanpa tarikan napas'));

      expect(temuanBibir).toBeDefined();
      expect(temuanSuara).toBeDefined();
      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 4 dari 4');
    });
  });

  describe('Langkah 4: Penyelesaian & Kalkulasi Lokal (Requirement 23.3)', () => {
    it('menampilkan status selesai dan memungkinkan reset wizard ke Langkah 1', () => {
      const onHasilReady = vi.fn();
      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: 'video_call',
            apa_diminta: 'transfer',
            nomor_akun: 'nomor_baru',
            darurat_desakan: true,
            diminta_rahasiakan: true,
            bisa_telepon_balik: false,
          }}
        />
      );

      // Maju dari L1 ke L2
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      // Maju dari L2 ke L3
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      // Selesaikan wizard di L3
      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(screen.getByTestId('langkah-selesai')).toBeDefined();
      expect(screen.getByText('Pemeriksaan Selesai')).toBeDefined();

      // Reset wizard
      fireEvent.click(screen.getByTestId('tombol-reset-wizard'));
      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 1 dari 4');
    });

    it('memastikan hasil pemeriksaan offline P0 tidak menggunakan API pihak ketiga (Requirement 23.3)', () => {
      const onHasilReady = vi.fn();
      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: 'rekaman',
            apa_diminta: 'voucher',
            nomor_akun: 'nomor_baru',
            darurat_desakan: true,
            diminta_rahasiakan: true,
            bisa_telepon_balik: false,
          }}
        />
      );

      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      fireEvent.click(screen.getByTestId('tombol-lewati-checklist'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      expect(hasil.pihak_ketiga).toEqual([]);
      expect(hasil.status_layanan.ai).toBe('tidak_dipakai');
    });
  });

  describe('Integrasi dengan Data Skenario Contoh (Requirements 9.4, 22.1-22.4)', () => {
    it('menginisialisasi form dengan skenario 1: Video call kakak minta transfer', () => {
      const onHasilReady = vi.fn();
      const skenario1 = videoContohData.skenario[0];

      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: skenario1.situasi as 'video_call',
            ...skenario1.jawaban,
          }}
        />
      );

      // Kartu video_call langsung terpilih di Langkah 1
      const kartu = screen.getByTestId('kartu-situasi-video_call');
      expect(kartu.getAttribute('aria-checked')).toBe('true');

      // Maju ke Langkah 2
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Pertanyaan konteks sudah terisi otomatis dari initialJawaban
      const radioApaDiminta = screen.getByTestId('opsi-apa_diminta-transfer') as HTMLInputElement;
      const radioNomorAkun = screen.getByTestId('opsi-nomor_akun-nomor_baru') as HTMLInputElement;
      const radioDarurat = screen.getByTestId('opsi-darurat-true') as HTMLInputElement;
      const radioRahasia = screen.getByTestId('opsi-rahasiakan-true') as HTMLInputElement;
      const radioTelepon = screen.getByTestId('opsi-telepon_balik-false') as HTMLInputElement;

      expect(radioApaDiminta.checked).toBe(true);
      expect(radioNomorAkun.checked).toBe(true);
      expect(radioDarurat.checked).toBe(true);
      expect(radioRahasia.checked).toBe(true);
      expect(radioTelepon.checked).toBe(true);

      // Tombol lanjut ke checklist langsung aktif
      const tombolLanjut = screen.getByTestId('tombol-lanjut') as HTMLButtonElement;
      expect(tombolLanjut.disabled).toBe(false);
    });

    it('menginisialisasi form dengan skenario 2: Voice note atasan minta voucher', () => {
      const onHasilReady = vi.fn();
      const skenario2 = videoContohData.skenario[1];

      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: skenario2.situasi as 'rekaman',
            ...skenario2.jawaban,
          }}
        />
      );

      const kartu = screen.getByTestId('kartu-situasi-rekaman');
      expect(kartu.getAttribute('aria-checked')).toBe('true');

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      const radioVoucher = screen.getByTestId('opsi-apa_diminta-voucher') as HTMLInputElement;
      expect(radioVoucher.checked).toBe(true);
    });

    it('menginisialisasi form dengan skenario 3: Video tokoh promosi investasi', () => {
      const onHasilReady = vi.fn();
      const skenario3 = videoContohData.skenario[2];

      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: skenario3.situasi as 'tokoh',
            ...skenario3.jawaban,
          }}
        />
      );

      const kartu = screen.getByTestId('kartu-situasi-tokoh');
      expect(kartu.getAttribute('aria-checked')).toBe('true');

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Pertanyaan khusus tokoh terisi
      const radioTokohPublik = screen.getByTestId('opsi-siapa_tampil-tokoh_publik') as HTMLInputElement;
      const radioJanjiUntung = screen.getByTestId('opsi-janji_untung-true') as HTMLInputElement;
      const radioInvestasi = screen.getByTestId('opsi-apa_diminta-investasi') as HTMLInputElement;

      expect(radioTokohPublik.checked).toBe(true);
      expect(radioJanjiUntung.checked).toBe(true);
      expect(radioInvestasi.checked).toBe(true);
    });

    it('memperbarui jawaban ketika prop initialJawaban berubah setelah render awal', () => {
      const onHasilReady = vi.fn();
      const { rerender } = render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      const kartuAwal = screen.getByTestId('kartu-situasi-video_call');
      expect(kartuAwal.getAttribute('aria-checked')).toBe('false');

      // Update prop initialJawaban
      rerender(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: 'tokoh',
            apa_diminta: 'investasi',
            siapa_tampil: 'tokoh_publik',
          }}
        />
      );

      const kartuTokoh = screen.getByTestId('kartu-situasi-tokoh');
      expect(kartuTokoh.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Target Sentuh & Aksesibilitas (Requirements 27.2, 27.4)', () => {
    it('memastikan setiap kartu situasi di Langkah 1 memiliki kelas min-h-[44px]', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      for (const situasi of DAFTAR_SITUASI_VIDEO) {
        const kartu = screen.getByTestId(`kartu-situasi-${situasi.id}`);
        expect(kartu.classList.contains('min-h-[44px]')).toBe(true);
      }
    });

    it('memastikan tombol navigasi memiliki kelas min-h-[44px]', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      const tombolLanjut = screen.getByTestId('tombol-lanjut');
      expect(tombolLanjut.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('memastikan setiap item checklist di Langkah 3 memiliki kelas min-h-[44px]', () => {
      const onHasilReady = vi.fn();
      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: 'video_call',
            apa_diminta: 'tidak_ada',
            nomor_akun: 'nomor_lama_tersimpan',
            darurat_desakan: false,
            diminta_rahasiakan: false,
            bisa_telepon_balik: true,
          }}
        />
      );

      // Ke L2
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      // Ke L3
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      for (const item of DAFTAR_CHECKLIST_PENGAMATAN) {
        const labelEl = screen.getByTestId(`item-checklist-${item.id}`);
        expect(labelEl.classList.contains('min-h-[44px]')).toBe(true);
      }

      const tombolLewati = screen.getByTestId('tombol-lewati-checklist');
      expect(tombolLewati.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('memastikan setiap input radio di Langkah 2 memiliki label dengan id yang sesuai (Requirement 27.4)', () => {
      const onHasilReady = vi.fn();
      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{ situasi: 'video_call' }}
        />
      );

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      // Uji beberapa radio input
      const radioTransfer = screen.getByTestId('opsi-apa_diminta-transfer');
      expect(radioTransfer.getAttribute('id')).toBe('apa_diminta_transfer');

      const radioDarurat = screen.getByTestId('opsi-darurat-true');
      expect(radioDarurat.getAttribute('id')).toBe('darurat_true');
    });
  });

  describe('Kepatuhan Larangan Kata Terlarang (Requirements 2.4, 6.7, 30.1)', () => {
    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan pada teks wizard', () => {
      const onHasilReady = vi.fn();
      render(<WizardVideoSuara onHasilReady={onHasilReady} />);

      const wrapper = screen.getByTestId('wizard-video-suara');
      const text = wrapper.textContent || '';

      // Larangan kesimpulan: "pasti aman", "terbukti aman", "100% aman"
      const regexTerlarang = /\b(pasti aman|terbukti aman|100% aman)\b/i;
      expect(text).not.toMatch(regexTerlarang);
    });
  });

  describe('Fitur P1: Toggle Analisis File AI & Upload Media (Requirements VS-06, 32.3)', () => {
    const setupLangkah3 = () => {
      const onHasilReady = vi.fn();
      render(
        <WizardVideoSuara
          onHasilReady={onHasilReady}
          initialJawaban={{
            situasi: 'video_call',
            apa_diminta: 'transfer',
            nomor_akun: 'nomor_baru',
            darurat_desakan: true,
            diminta_rahasiakan: true,
            bisa_telepon_balik: false,
          }}
        />
      );

      // Ke L2
      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      // Ke L3
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      return { onHasilReady };
    };

    it('toggle analisis AI berada di Langkah 3 dan default MATI (Requirement VS-06)', () => {
      setupLangkah3();

      const toggle = screen.getByTestId('toggle-analisis-ai') as HTMLInputElement;
      expect(toggle).toBeDefined();
      expect(toggle.checked).toBe(false);
      expect(toggle.getAttribute('aria-checked')).toBe('false');

      // Panel upload media tidak tampil saat toggle mati
      expect(screen.queryByTestId('panel-upload-media-ai')).toBeNull();
      expect(screen.queryByTestId('notifikasi-privasi-ai')).toBeNull();
    });

    it('menampilkan panel upload dan transparansi privasi saat toggle dinyalakan', () => {
      setupLangkah3();

      const toggle = screen.getByTestId('toggle-analisis-ai') as HTMLInputElement;
      fireEvent.click(toggle);

      expect(toggle.checked).toBe(true);
      expect(screen.getByTestId('panel-upload-media-ai')).toBeDefined();

      // Memeriksa teks transparansi privasi file (Requirement VS-06)
      const notifikasi = screen.getByTestId('notifikasi-privasi-ai');
      expect(notifikasi.textContent).toContain(
        'Frame gambar atau audio akan dikirim ke Reality Defender. Video utuh tetap di perangkatmu. File tidak kami simpan.'
      );

      // Memeriksa catatan batasan transparan Reality Defender
      expect(notifikasi.textContent).toContain('50 scan/bulan gratis');
      expect(notifikasi.textContent).toContain('12 detik - 5 menit');
      expect(notifikasi.textContent).toContain('bahasa Indonesia belum didukung secara resmi');

      // Input file tersedia
      const inputFile = screen.getByTestId('input-media-ai') as HTMLInputElement;
      expect(inputFile).toBeDefined();
      expect(inputFile.getAttribute('type')).toBe('file');
      expect(inputFile.getAttribute('accept')).toBe('video/*,audio/*,image/*');
    });

    it('menyembunyikan kembali panel upload saat toggle dimatikan', () => {
      setupLangkah3();

      const toggle = screen.getByTestId('toggle-analisis-ai') as HTMLInputElement;
      // Nyalakan
      fireEvent.click(toggle);
      expect(screen.getByTestId('panel-upload-media-ai')).toBeDefined();

      // Matikan kembali
      fireEvent.click(toggle);
      expect(toggle.checked).toBe(false);
      expect(screen.queryByTestId('panel-upload-media-ai')).toBeNull();
    });
  });
});
