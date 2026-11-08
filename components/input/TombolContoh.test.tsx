// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  TombolContoh,
  getDaftarContoh,
  type SkenarioChat,
  type SkenarioLink,
  type SkenarioVideo,
  type HalamanContoh,
} from './TombolContoh';
import chatContohJson from '../../data/contoh/chat-contoh.json';
import linkContohJson from '../../data/contoh/link-contoh.json';
import videoContohJson from '../../data/contoh/video-contoh.json';

describe('components/input/TombolContoh.tsx (Task 4.12)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Fungsi Pembantu getDaftarContoh (Requirements 9.2, 9.3, 9.4, 9.5)', () => {
    it('mengembalikan 3 skenario chat dari data/contoh/chat-contoh.json', () => {
      const hasil = getDaftarContoh('chat') as SkenarioChat[];
      expect(hasil).toHaveLength(3);
      expect(hasil.map((s) => s.id)).toEqual([
        'chat-like-review',
        'chat-otp-kurir',
        'chat-keluarga-ganti-nomor',
      ]);
      expect(hasil[0].judul).toContain('like & review');
      expect(hasil[1].judul).toContain('OTP dari kurir');
      expect(hasil[2].judul).toContain('keluarga ganti nomor');
      expect(typeof hasil[0].teks).toBe('string');
      expect(hasil[0].hasilSimulasi.halaman).toBe('chat');
    });

    it('mengembalikan 3 skenario link dari data/contoh/link-contoh.json', () => {
      const hasil = getDaftarContoh('link') as SkenarioLink[];
      expect(hasil).toHaveLength(3);
      expect(hasil.map((s) => s.id)).toEqual([
        'link-bank-hadiah',
        'link-marketplace-typo',
        'link-pemendek-saldo',
      ]);
      expect(hasil[0].judul).toContain('bank');
      expect(hasil[1].judul).toContain('marketplace');
      expect(hasil[2].judul).toContain('saldo');
      expect(hasil[0].url).toBeTruthy();
      expect(hasil[0].responsSimulasi).toBeDefined();
      expect(hasil[0].hasilSimulasi.halaman).toBe('link');
    });

    it('mengembalikan 3 skenario video dari data/contoh/video-contoh.json', () => {
      const hasil = getDaftarContoh('video') as SkenarioVideo[];
      expect(hasil).toHaveLength(3);
      expect(hasil.map((s) => s.id)).toEqual([
        'video-call-kakak',
        'voice-note-atasan',
        'video-tokoh-investasi',
      ]);
      expect(hasil[0].judul).toContain('Video call kakak');
      expect(hasil[1].judul).toContain('Voice note atasan');
      expect(hasil[2].judul).toContain('tokoh promosi investasi');
      expect(hasil[0].situasi).toBe('video_call');
      expect(hasil[0].jawaban).toBeDefined();
      expect(hasil[0].hasilSimulasi.halaman).toBe('video');
    });

    it('mengembalikan array kosong untuk halaman tidak dikenal', () => {
      // @ts-expect-error Pengujian input halaman non-standar
      const hasil = getDaftarContoh('unknown');
      expect(hasil).toEqual([]);
    });
  });

  describe('Rendering Komponen Dasar & Aksesibilitas', () => {
    it('merender tombol utama "Coba contoh" dan tombol toggle dropdown', () => {
      render(<TombolContoh halaman="chat" />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');
      expect(tombolUtama).toBeDefined();
      expect(tombolUtama.textContent).toContain('Coba contoh');

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      expect(tombolDropdown).toBeDefined();
      expect(tombolDropdown.getAttribute('aria-expanded')).toBe('false');
      expect(tombolDropdown.getAttribute('aria-haspopup')).toBe('menu');
    });

    it('tidak menampilkan dropdown dan teks skenario aktif pada saat render awal', () => {
      render(<TombolContoh halaman="link" />);

      expect(screen.queryByTestId('menu-skenario')).toBeNull();
      expect(screen.queryByTestId('skenario-aktif')).toBeNull();
    });

    it('menerapkan className kustom ke kontainer wrapper', () => {
      render(<TombolContoh halaman="video" className="custom-test-class" />);

      const wrapper = screen.getByTestId('tombol-contoh-wrapper');
      expect(wrapper.classList.contains('custom-test-class')).toBe(true);
    });
  });

  describe('Interaksi Bergilir Sekuensial (Sequential Cycle on Click)', () => {
    it('memilih skenario 0 -> 1 -> 2 -> 0 secara berurutan pada setiap klik tombol utama di halaman chat', () => {
      const onPilihContoh = vi.fn();
      const onContohDipilih = vi.fn();

      render(
        <TombolContoh
          halaman="chat"
          onPilihContoh={onPilihContoh}
          onContohDipilih={onContohDipilih}
        />
      );

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');

      // Klik 1: memilih skenario ke-0 (chat-like-review)
      fireEvent.click(tombolUtama);
      expect(onPilihContoh).toHaveBeenCalledTimes(1);
      expect(onContohDipilih).toHaveBeenCalledTimes(1);
      expect(onPilihContoh).toHaveBeenLastCalledWith(
        chatContohJson.skenario[0]
      );
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        chatContohJson.skenario[0].judul
      );
      expect(screen.getByTestId('skenario-aktif').textContent).toContain('(1/3)');

      // Klik 2: memilih skenario ke-1 (chat-otp-kurir)
      fireEvent.click(tombolUtama);
      expect(onPilihContoh).toHaveBeenCalledTimes(2);
      expect(onContohDipilih).toHaveBeenCalledTimes(2);
      expect(onPilihContoh).toHaveBeenLastCalledWith(
        chatContohJson.skenario[1]
      );
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        chatContohJson.skenario[1].judul
      );
      expect(screen.getByTestId('skenario-aktif').textContent).toContain('(2/3)');

      // Klik 3: memilih skenario ke-2 (chat-keluarga-ganti-nomor)
      fireEvent.click(tombolUtama);
      expect(onPilihContoh).toHaveBeenCalledTimes(3);
      expect(onContohDipilih).toHaveBeenCalledTimes(3);
      expect(onPilihContoh).toHaveBeenLastCalledWith(
        chatContohJson.skenario[2]
      );
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        chatContohJson.skenario[2].judul
      );
      expect(screen.getByTestId('skenario-aktif').textContent).toContain('(3/3)');

      // Klik 4: berputar kembali ke skenario ke-0 (chat-like-review)
      fireEvent.click(tombolUtama);
      expect(onPilihContoh).toHaveBeenCalledTimes(4);
      expect(onContohDipilih).toHaveBeenCalledTimes(4);
      expect(onPilihContoh).toHaveBeenLastCalledWith(
        chatContohJson.skenario[0]
      );
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        chatContohJson.skenario[0].judul
      );
      expect(screen.getByTestId('skenario-aktif').textContent).toContain('(1/3)');
    });

    it('memilih skenario berurutan pada halaman link (Requirement 9.3)', () => {
      const onPilih = vi.fn();
      render(<TombolContoh halaman="link" onPilihContoh={onPilih} />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');

      fireEvent.click(tombolUtama);
      expect(onPilih).toHaveBeenLastCalledWith(linkContohJson.skenario[0]);
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        linkContohJson.skenario[0].judul
      );

      fireEvent.click(tombolUtama);
      expect(onPilih).toHaveBeenLastCalledWith(linkContohJson.skenario[1]);
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        linkContohJson.skenario[1].judul
      );
    });

    it('memilih skenario berurutan pada halaman video (Requirement 9.4)', () => {
      const onPilih = vi.fn();
      render(<TombolContoh halaman="video" onPilihContoh={onPilih} />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');

      fireEvent.click(tombolUtama);
      expect(onPilih).toHaveBeenLastCalledWith(videoContohJson.skenario[0]);
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        videoContohJson.skenario[0].judul
      );

      fireEvent.click(tombolUtama);
      expect(onPilih).toHaveBeenLastCalledWith(videoContohJson.skenario[1]);
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        videoContohJson.skenario[1].judul
      );
    });
  });

  describe('Interaksi Dropdown dan Pemilihan Langsung', () => {
    it('dapat membuka dan menutup menu dropdown dengan tombol toggle', () => {
      render(<TombolContoh halaman="chat" />);

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');

      // Awalnya tertutup
      expect(screen.queryByTestId('menu-skenario')).toBeNull();
      expect(tombolDropdown.getAttribute('aria-expanded')).toBe('false');

      // Buka dropdown
      fireEvent.click(tombolDropdown);
      expect(screen.getByTestId('menu-skenario')).toBeDefined();
      expect(tombolDropdown.getAttribute('aria-expanded')).toBe('true');

      // Tutup kembali dropdown
      fireEvent.click(tombolDropdown);
      expect(screen.queryByTestId('menu-skenario')).toBeNull();
      expect(tombolDropdown.getAttribute('aria-expanded')).toBe('false');
    });

    it('merender ketiga opsi skenario di dalam menu dropdown sesuai halaman chat', () => {
      render(<TombolContoh halaman="chat" />);

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      fireEvent.click(tombolDropdown);

      const menu = screen.getByTestId('menu-skenario');
      expect(menu).toBeDefined();

      const opsi1 = screen.getByTestId('opsi-skenario-chat-like-review');
      const opsi2 = screen.getByTestId('opsi-skenario-chat-otp-kurir');
      const opsi3 = screen.getByTestId('opsi-skenario-chat-keluarga-ganti-nomor');

      expect(opsi1).toBeDefined();
      expect(opsi2).toBeDefined();
      expect(opsi3).toBeDefined();

      expect(opsi1.textContent).toContain('Tawaran kerja like & review');
      expect(opsi2.textContent).toContain('Permintaan OTP dari kurir');
      expect(opsi3.textContent).toContain('Pesan mengaku keluarga ganti nomor');
    });

    it('memilih skenario secara spesifik dari dropdown dan menutup menu', () => {
      const onPilihContoh = vi.fn();
      render(<TombolContoh halaman="link" onPilihContoh={onPilihContoh} />);

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      fireEvent.click(tombolDropdown);

      // Pilih opsi kedua: link-marketplace-typo
      const opsi2 = screen.getByTestId('opsi-skenario-link-marketplace-typo');
      fireEvent.click(opsi2);

      // Callback terpanggil dengan data skenario link kedua
      expect(onPilihContoh).toHaveBeenCalledTimes(1);
      expect(onPilihContoh).toHaveBeenCalledWith(linkContohJson.skenario[1]);

      // Menu dropdown otomatis tertutup
      expect(screen.queryByTestId('menu-skenario')).toBeNull();

      // Indikator skenario aktif terpasang
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        linkContohJson.skenario[1].judul
      );
      expect(screen.getByTestId('skenario-aktif').textContent).toContain('(2/3)');
    });

    it('menampilkan tanda centang pada opsi yang sedang aktif saat dropdown dibuka kembali', () => {
      render(<TombolContoh halaman="video" />);

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      fireEvent.click(tombolDropdown);

      // Pilih opsi ketiga: video-tokoh-investasi
      const opsi3 = screen.getByTestId('opsi-skenario-video-tokoh-investasi');
      fireEvent.click(opsi3);

      // Buka dropdown kembali
      fireEvent.click(tombolDropdown);
      const indikator = screen.getByTestId('indikator-terpilih');
      expect(indikator).toBeDefined();
      expect(indikator.textContent).toContain('✓');
    });

    it('melanjutkan perputaran tombol utama dari indeks yang dipilih di dropdown', () => {
      const onPilih = vi.fn();
      render(<TombolContoh halaman="chat" onPilihContoh={onPilih} />);

      // Pilih opsi 1 (indeks 1) via dropdown
      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      fireEvent.click(tombolDropdown);
      fireEvent.click(screen.getByTestId('opsi-skenario-chat-otp-kurir'));
      expect(onPilih).toHaveBeenLastCalledWith(chatContohJson.skenario[1]);

      // Tekan tombol utama "Coba contoh" -> harus maju ke indeks 2 (chat-keluarga-ganti-nomor)
      const tombolUtama = screen.getByTestId('tombol-coba-contoh');
      fireEvent.click(tombolUtama);
      expect(onPilih).toHaveBeenLastCalledWith(chatContohJson.skenario[2]);
    });
  });

  describe('Interaksi Keyboard & Penutupan Dropdown', () => {
    it('menutup dropdown saat tombol Escape ditekan', () => {
      render(<TombolContoh halaman="chat" />);

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      fireEvent.click(tombolDropdown);
      expect(screen.getByTestId('menu-skenario')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('menu-skenario')).toBeNull();
    });

    it('menutup dropdown saat klik di luar area komponen (mousedown)', () => {
      render(
        <div>
          <div data-testid="luar-komponen">Area luar</div>
          <TombolContoh halaman="link" />
        </div>
      );

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      fireEvent.click(tombolDropdown);
      expect(screen.getByTestId('menu-skenario')).toBeDefined();

      // Klik elemen di luar komponen
      fireEvent.mouseDown(screen.getByTestId('luar-komponen'));
      expect(screen.queryByTestId('menu-skenario')).toBeNull();
    });

    it('menghapus tanda skenario aktif saat tombol reset disilang', () => {
      render(<TombolContoh halaman="chat" />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');
      fireEvent.click(tombolUtama);
      expect(screen.getByTestId('skenario-aktif')).toBeDefined();

      const tombolReset = screen.getByTestId('tombol-reset-contoh');
      fireEvent.click(tombolReset);
      expect(screen.queryByTestId('skenario-aktif')).toBeNull();
    });

    it('mereset skenario aktif saat prop halaman berganti', () => {
      const { rerender } = render(<TombolContoh halaman="chat" />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      expect(screen.getByTestId('skenario-aktif-judul').textContent).toBe(
        chatContohJson.skenario[0].judul
      );

      // Ubah prop halaman ke 'link'
      rerender(<TombolContoh halaman="link" />);
      expect(screen.queryByTestId('skenario-aktif')).toBeNull();
    });
  });

  describe('Target Sentuh & Aksesibilitas (Requirement 27.2)', () => {
    it('memastikan tombol utama memiliki kelas min-h-[44px]', () => {
      render(<TombolContoh halaman="chat" />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');
      expect(tombolUtama.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('memastikan tombol toggle dropdown memiliki kelas min-h-[44px] dan min-w-[44px]', () => {
      render(<TombolContoh halaman="link" />);

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      expect(tombolDropdown.classList.contains('min-h-[44px]')).toBe(true);
      expect(tombolDropdown.classList.contains('min-w-[44px]')).toBe(true);
    });

    it('memastikan setiap opsi di menu dropdown memiliki kelas min-h-[44px]', () => {
      render(<TombolContoh halaman="video" />);

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      const opsiList = [
        'video-call-kakak',
        'voice-note-atasan',
        'video-tokoh-investasi',
      ];

      for (const id of opsiList) {
        const item = screen.getByTestId(`opsi-skenario-${id}`);
        expect(item.classList.contains('min-h-[44px]')).toBe(true);
      }
    });

    it('memastikan tombol reset aktif memiliki kelas min-h-[44px] dan min-w-[44px]', () => {
      render(<TombolContoh halaman="chat" />);

      fireEvent.click(screen.getByTestId('tombol-coba-contoh'));
      const tombolReset = screen.getByTestId('tombol-reset-contoh');
      expect(tombolReset.classList.contains('min-h-[44px]')).toBe(true);
      expect(tombolReset.classList.contains('min-w-[44px]')).toBe(true);
    });
  });

  describe('Kepatuhan Kata Terlarang (Requirements 2.4, 6.7, 30.1)', () => {
    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai klaim hasil pada teks komponen', () => {
      render(<TombolContoh halaman="chat" />);

      fireEvent.click(screen.getByTestId('tombol-pilih-dropdown'));
      const wrapper = screen.getByTestId('tombol-contoh-wrapper');

      const teksKeseluruhan = wrapper.textContent || '';
      const regexTerlarang = /\b(pasti|terbukti|100%)\b/i;
      expect(teksKeseluruhan).not.toMatch(regexTerlarang);
    });
  });
});
