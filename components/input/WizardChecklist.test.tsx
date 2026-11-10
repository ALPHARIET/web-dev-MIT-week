// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  WizardVideoSuara,
  DAFTAR_CHECKLIST_PENGAMATAN,
  isChecklistSelected,
  removeChecklistItem,
} from './WizardVideoSuara';
import type { FormatDataHasil } from '../../lib/hasil';

function majuKeLangkah3Checklist(
  initialJawabanOverrides?: Record<string, unknown>
): ReturnType<typeof vi.fn> {
  const onHasilReady = vi.fn();
  render(
    <WizardVideoSuara
      onHasilReady={onHasilReady}
      initialJawaban={initialJawabanOverrides}
    />
  );

  if (!document.getElementById('heading-langkah-3')) {
    fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
    fireEvent.click(screen.getByTestId('tombol-lanjut'));

    fireEvent.click(screen.getByTestId('opsi-apa_diminta-tidak_ada'));
    fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_lama_tersimpan'));
    fireEvent.click(screen.getByTestId('opsi-darurat-false'));
    fireEvent.click(screen.getByTestId('opsi-rahasiakan-false'));
    fireEvent.click(screen.getByTestId('opsi-telepon_balik-true'));
    fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));

    fireEvent.click(screen.getByTestId('tombol-lanjut'));
  }

  return onHasilReady;
}

describe('WizardChecklist — Checklist Pengamatan Visual & Audio (Requirements VS-05, 23.1)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('1. Struktur dan Tampilan 7 Tanda Kejanggalan (Requirement VS-05)', () => {
    it('memiliki tepat 7 item tanda kejanggalan dalam DAFTAR_CHECKLIST_PENGAMATAN', () => {
      expect(DAFTAR_CHECKLIST_PENGAMATAN).toHaveLength(7);

      const expectedIds = [
        'bibir_tidak_sinkron',
        'kedipan_aneh',
        'tepi_wajah_blur',
        'wajah_rusak_tangan',
        'cahaya_beda',
        'suara_datar_napas',
        'jeda_janggal',
      ];

      const actualIds = DAFTAR_CHECKLIST_PENGAMATAN.map((item) => item.id);
      expect(actualIds).toEqual(expectedIds);
    });

    it('memastikan label dan deskripsi setiap tanda sesuai dengan spesifikasi', () => {
      const items = DAFTAR_CHECKLIST_PENGAMATAN;

      expect(items[0].label).toBe('Bibir tidak sinkron');
      expect(items[0].deskripsi.toLowerCase()).toContain('gerakan bibir');
      expect(items[0].deskripsi.toLowerCase()).toContain('suara');

      expect(items[1].label).toBe('Kedipan aneh');
      expect(items[1].deskripsi.toLowerCase()).toContain('berkedip');

      expect(items[2].label).toContain('Tepi wajah blur');
      expect(items[2].deskripsi.toLowerCase()).toContain('buram');

      expect(items[3].label).toBe('Wajah rusak saat tangan lewat');
      expect(items[3].deskripsi.toLowerCase()).toContain('tangan');

      expect(items[4].label).toContain('Cahaya');
      expect(items[4].deskripsi.toLowerCase()).toContain('pencahayaan');

      expect(items[5].label).toBe('Suara datar tanpa tarikan napas');
      expect(items[5].deskripsi.toLowerCase()).toContain('tarikan napas');

      expect(items[6].label).toContain('Jeda janggal');
      expect(items[6].deskripsi.toLowerCase()).toContain('jeda');
    });

    it('merender ke-7 checkbox tanda kejanggalan di UI Langkah 3 dengan data-testid yang benar', () => {
      majuKeLangkah3Checklist();

      expect(document.getElementById('heading-langkah-3')).toBeDefined();
      expect(screen.getByText('Langkah 3: Checklist Pengamatan Visual & Audio')).toBeDefined();

      for (const item of DAFTAR_CHECKLIST_PENGAMATAN) {
        const checkbox = screen.getByTestId(`checkbox-${item.id}`) as HTMLInputElement;
        expect(checkbox).toBeDefined();
        expect(checkbox.checked).toBe(false);

        expect(screen.getByText(item.label)).toBeDefined();
        expect(screen.getByText(item.deskripsi)).toBeDefined();
      }
    });

    it('memastikan setiap item checklist memiliki target sentuh minimal 44 px (Requirement 27.2)', () => {
      majuKeLangkah3Checklist();

      for (const item of DAFTAR_CHECKLIST_PENGAMATAN) {
        const labelContainer = screen.getByTestId(`item-checklist-${item.id}`);
        expect(labelContainer.className).toContain('min-h-[44px]');
      }
    });
  });

  describe('2. Catatan Edukatif Deepfake Wajib (Requirement VS-05)', () => {
    it('menampilkan teks catatan edukatif wajib secara persis', () => {
      majuKeLangkah3Checklist();

      const catatanBox = screen.getByTestId('catatan-deepfake');
      expect(catatanBox).toBeDefined();

      const textContent = catatanBox.textContent || '';
      expect(textContent).toContain(
        'Deepfake yang bagus bisa tidak menunjukkan tanda ini. Tidak menemukan tanda bukan berarti video itu asli.'
      );
    });

    it('menampilkan label penanda "Opsional" pada header checklist', () => {
      majuKeLangkah3Checklist();

      expect(screen.getByText('Opsional')).toBeDefined();
    });

    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan/vonis', () => {
      majuKeLangkah3Checklist();

      const catatanBox = screen.getByTestId('catatan-deepfake');
      const textContent = catatanBox.textContent?.toLowerCase() || '';

      expect(textContent).not.toMatch(/\b(pasti|terbukti|100%)\b/);
      expect(textContent).not.toContain('pasti aman');
      expect(textContent).not.toContain('dijamin aman');
    });
  });

  describe('3. Tombol "Lewati checklist" (Checklist Opsional)', () => {
    it('menyediakan tombol "Lewati checklist" dengan data-testid dan teks yang sesuai', () => {
      majuKeLangkah3Checklist();

      const tombolLewati = screen.getByTestId('tombol-lewati-checklist');
      expect(tombolLewati).toBeDefined();
      expect(tombolLewati.textContent).toContain('Lewati checklist');
      expect(tombolLewati.className).toContain('min-h-[44px]');
    });

    it('langsung menyelesaikan wizard dengan checklist kosong saat "Lewati checklist" ditekan', () => {
      const onHasilReady = majuKeLangkah3Checklist();

      const tombolLewati = screen.getByTestId('tombol-lewati-checklist');
      fireEvent.click(tombolLewati);

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      const temuanChecklist = hasil.temuan.filter((t) =>
        t.judul.includes('Kejanggalan visual atau audio teramati')
      );
      expect(temuanChecklist).toHaveLength(0);

      expect(hasil.level).toBe('tidak_ditemukan');

      expect(screen.getByTestId('langkah-selesai')).toBeDefined();
    });
  });

  describe('4. Nilai Skor +1 per Tanda yang Dicentang (Requirement 23.1)', () => {
    it('menambahkan +1 skor dan 1 temuan jika mencentang 1 tanda', () => {
      const onHasilReady = majuKeLangkah3Checklist();

      const checkboxBibir = screen.getByTestId('checkbox-bibir_tidak_sinkron') as HTMLInputElement;
      fireEvent.click(checkboxBibir);
      expect(checkboxBibir.checked).toBe(true);

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      const temuanChecklist = hasil.temuan.filter((t) =>
        t.judul.includes('Kejanggalan visual atau audio teramati')
      );
      expect(temuanChecklist).toHaveLength(1);
      expect(temuanChecklist[0].judul).toContain('Bibir tidak sinkron');
      expect(temuanChecklist[0].bukti).toContain('+1');
    });

    it('menambahkan +3 skor dan menaikkan level ke "sedang" jika mencentang 3 tanda', () => {
      const onHasilReady = majuKeLangkah3Checklist();

      fireEvent.click(screen.getByTestId('checkbox-kedipan_aneh'));
      fireEvent.click(screen.getByTestId('checkbox-cahaya_beda'));
      fireEvent.click(screen.getByTestId('checkbox-jeda_janggal'));

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      expect(hasil.level).toBe('sedang');

      const temuanChecklist = hasil.temuan.filter((t) =>
        t.judul.includes('Kejanggalan visual atau audio teramati')
      );
      expect(temuanChecklist).toHaveLength(3);

      const judulSemua = temuanChecklist.map((t) => t.judul).join(' ');
      expect(judulSemua).toContain('Kedipan aneh');
      expect(judulSemua).toContain('Cahaya');
      expect(judulSemua).toContain('Jeda');
    });

    it('menambahkan +7 skor dan menetapkan level ke "tinggi" jika mencentang seluruh 7 tanda', () => {
      const onHasilReady = majuKeLangkah3Checklist();

      for (const item of DAFTAR_CHECKLIST_PENGAMATAN) {
        const cb = screen.getByTestId(`checkbox-${item.id}`) as HTMLInputElement;
        fireEvent.click(cb);
        expect(cb.checked).toBe(true);
      }

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      expect(hasil.level).toBe('tinggi');

      const temuanChecklist = hasil.temuan.filter((t) =>
        t.judul.includes('Kejanggalan visual atau audio teramati')
      );
      expect(temuanChecklist).toHaveLength(7);
    });

    it('dapat membatalkan centang (uncheck) dan skor tidak menyertakan tanda yang dibatalkan', () => {
      const onHasilReady = majuKeLangkah3Checklist();

      const cbWajah = screen.getByTestId('checkbox-wajah_rusak_tangan') as HTMLInputElement;
      const cbSuara = screen.getByTestId('checkbox-suara_datar_napas') as HTMLInputElement;

      fireEvent.click(cbWajah);
      fireEvent.click(cbSuara);
      expect(cbWajah.checked).toBe(true);
      expect(cbSuara.checked).toBe(true);

      fireEvent.click(cbWajah);
      expect(cbWajah.checked).toBe(false);
      expect(cbSuara.checked).toBe(true);

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(onHasilReady).toHaveBeenCalledTimes(1);
      const hasil: FormatDataHasil = onHasilReady.mock.calls[0][0];

      const temuanChecklist = hasil.temuan.filter((t) =>
        t.judul.includes('Kejanggalan visual atau audio teramati')
      );
      expect(temuanChecklist).toHaveLength(1);
      expect(temuanChecklist[0].judul).toContain('Suara datar tanpa tarikan napas');
    });
  });

  describe('5. Navigasi dan Pemulihan State', () => {
    it('dapat kembali ke Langkah 2 menggunakan tombol "Kembali" dan mempertahankan jawaban', () => {
      majuKeLangkah3Checklist();

      const tombolKembali = screen.getByTestId('tombol-kembali');
      fireEvent.click(tombolKembali);

      expect(document.getElementById('heading-langkah-2')).toBeDefined();
      expect(screen.getByTestId('indikator-langkah').textContent).toContain('Langkah 2 dari 4');

      const optTidakAda = screen.getByTestId('opsi-apa_diminta-tidak_ada') as HTMLInputElement;
      expect(optTidakAda.checked).toBe(true);
    });

    it('dapat menerima initialJawaban dengan checklist dan mencentang checkbox yang sesuai saat masuk', () => {
      render(
        <WizardVideoSuara
          onHasilReady={vi.fn()}
          initialJawaban={{
            situasi: 'video_call',
            apa_diminta: 'tidak_ada',
            nomor_akun: 'nomor_lama_tersimpan',
            darurat_desakan: false,
            diminta_rahasiakan: false,
            bisa_telepon_balik: true,
            masih_tersambung: false,
            checklist: ['Bibir tidak sinkron', 'kedipan_aneh'],
          }}
        />
      );

      fireEvent.click(screen.getByTestId('tombol-lanjut'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(document.getElementById('heading-langkah-3')).toBeDefined();

      const cbBibir = screen.getByTestId('checkbox-bibir_tidak_sinkron') as HTMLInputElement;
      const cbKedipan = screen.getByTestId('checkbox-kedipan_aneh') as HTMLInputElement;
      const cbSuara = screen.getByTestId('checkbox-suara_datar_napas') as HTMLInputElement;

      expect(cbBibir.checked).toBe(true);
      expect(cbKedipan.checked).toBe(true);
      expect(cbSuara.checked).toBe(false);
    });
  });

  describe('6. Helper Functions isChecklistSelected & removeChecklistItem', () => {
    const itemTest = DAFTAR_CHECKLIST_PENGAMATAN[0];

    it('mencocokkan berdasarkan item.id', () => {
      expect(isChecklistSelected(itemTest, ['bibir_tidak_sinkron'])).toBe(true);
    });

    it('mencocokkan berdasarkan item.label', () => {
      expect(isChecklistSelected(itemTest, ['Bibir tidak sinkron'])).toBe(true);
    });

    it('mengembalikan false jika tidak ada dalam daftar', () => {
      expect(isChecklistSelected(itemTest, ['kedipan_aneh', 'suara_datar'])).toBe(false);
    });

    it('menghapus item dengan removeChecklistItem', () => {
      const listAwal = ['Bibir tidak sinkron', 'Kedipan aneh'];
      const listSetelah = removeChecklistItem(itemTest, listAwal);
      expect(listSetelah).toEqual(['Kedipan aneh']);
    });
  });
});
