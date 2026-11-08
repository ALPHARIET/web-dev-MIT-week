// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  TanyaLanjut,
  dapatkanPertanyaanCepatDefault,
  MAKS_PERTANYAAN_PER_SESI,
  MAKS_KARAKTER_PERTANYAAN,
} from './TanyaLanjut';
import type { FormatDataHasil } from '@/lib/hasil';

describe('components/hasil/TanyaLanjut.tsx (Task 17.2, Requirements 31.5, 32.4)', () => {
  const dummyHasilChatTinggi: FormatDataHasil = {
    halaman: 'chat',
    level: 'tinggi',
    ringkasan: 'Pesan memuat indikasi penipuan lowongan kerja dan permintaan kode OTP.',
    temuan: [
      {
        judul: 'Meminta kode OTP',
        penjelasan: 'Pelaku meminta kode OTP untuk mengambil alih akun.',
        bukti: 'Kirimkan kode OTP 6 digit',
        sumber: 'aturan',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan berikan kode OTP apa pun.',
      'Segera blokir kontak pengirim.',
    ],
    situasi_darurat: ['kirim_otp'],
    batasan: 'Analisis berbasis teks percakapan.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: { ai: 'ok' },
  };

  const dummyHasilLinkSedang: FormatDataHasil = {
    halaman: 'link',
    level: 'sedang',
    ringkasan: 'Link menggunakan nama mirip merek dan domain baru.',
    temuan: [
      {
        judul: 'Domain baru didaftarkan',
        penjelasan: 'Domain terdaftar kurang dari 30 hari.',
        bukti: 'https://promo-sh0pee-resmi.xyz',
        sumber: 'rdap',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan membuka atau memasukkan data ke link tersebut.',
      'Gunakan aplikasi resmi.',
    ],
    situasi_darurat: [],
    batasan: 'Pengecekan leksikal dan domain.',
    pihak_ketiga: ['Google Safe Browsing', 'RDAP'],
    status_layanan: { safe_browsing: 'ok', rdap: 'ok' },
  };

  const dummyHasilVideoTidakDitemukan: FormatDataHasil = {
    halaman: 'video',
    level: 'tidak_ditemukan',
    ringkasan: 'Tidak ditemukan tanda bahaya manipulasi deepfake.',
    temuan: [],
    hal_wajar: ['Gerakan bibir sinkron dengan suara'],
    langkah: [
      'Tetap berhati-hati jika ada permintaan uang mendadak.',
      'Gunakan kode rahasia keluarga.',
    ],
    situasi_darurat: [],
    batasan: 'Pemeriksaan berbasis indikator wizard.',
    pihak_ketiga: [],
    status_layanan: {},
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Render Awal dan Struktur Komponen', () => {
    it('merender judul, deskripsi, pesan sambutan awal asisten, dan counter awal 0/10 pertanyaan', () => {
      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      expect(screen.getByTestId('komponen-tanya-lanjut')).toBeDefined();
      expect(screen.getByText('Tanya Lanjut Seputar Hasil Ini')).toBeDefined();

      // Counter pertanyaan awal
      const counter = screen.getByTestId('counter-pertanyaan');
      expect(counter.textContent).toContain('0/10 pertanyaan');

      // Pesan awal sambutan asisten
      const pesanAsisten = screen.getByTestId('pesan-asisten');
      expect(pesanAsisten.textContent).toContain('Halo! Ada yang ingin kamu tanyakan lebih lanjut');

      // Input teks dan tombol submit
      expect(screen.getByTestId('input-tanya-lanjut')).toBeDefined();
      const tombolKirim = screen.getByTestId('tombol-kirim-pertanyaan');
      expect(tombolKirim).toBeDefined();
      expect((tombolKirim as HTMLButtonElement).disabled).toBe(true); // Disabled karena input masih kosong
    });

    it('mendukung kustomisasi className', () => {
      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          className="kustom-class-tanya border-purple-500"
        />
      );

      const root = screen.getByTestId('komponen-tanya-lanjut');
      expect(root.classList.contains('kustom-class-tanya')).toBe(true);
      expect(root.classList.contains('border-purple-500')).toBe(true);
    });
  });

  describe('2. Pertanyaan Cepat Kontekstual & Kustom', () => {
    it('menghasilkan 3 pertanyaan cepat default sesuai halaman dan level risiko', () => {
      // Halaman Chat
      const tanyaChatTinggi = dapatkanPertanyaanCepatDefault(dummyHasilChatTinggi);
      expect(tanyaChatTinggi).toHaveLength(3);
      expect(tanyaChatTinggi[0]).toContain('paling berbahaya');

      const tanyaChatSedang = dapatkanPertanyaanCepatDefault({
        ...dummyHasilChatTinggi,
        level: 'sedang',
      });
      expect(tanyaChatSedang).toHaveLength(3);
      expect(tanyaChatSedang[0]).toContain('memverifikasi keaslian');

      const tanyaChatTidak = dapatkanPertanyaanCepatDefault({
        ...dummyHasilChatTinggi,
        level: 'tidak_ditemukan',
      });
      expect(tanyaChatTidak).toHaveLength(3);
      expect(tanyaChatTidak[0]).toContain('belum menunjukkan tanda mencurigakan');

      // Halaman Link
      const tanyaLinkTinggi = dapatkanPertanyaanCepatDefault({
        ...dummyHasilLinkSedang,
        level: 'tinggi',
      });
      expect(tanyaLinkTinggi).toHaveLength(3);
      expect(tanyaLinkTinggi[0]).toContain('link ini sangat berisiko');

      const tanyaLinkSedang = dapatkanPertanyaanCepatDefault(dummyHasilLinkSedang);
      expect(tanyaLinkSedang).toHaveLength(3);
      expect(tanyaLinkSedang[0]).toContain('mencurigakan');

      const tanyaLinkTidak = dapatkanPertanyaanCepatDefault({
        ...dummyHasilLinkSedang,
        level: 'tidak_ditemukan',
      });
      expect(tanyaLinkTidak).toHaveLength(3);
      expect(tanyaLinkTidak[0]).toContain('benar-benar resmi');

      // Halaman Video & Suara
      const tanyaVideoTinggi = dapatkanPertanyaanCepatDefault({
        ...dummyHasilVideoTidakDitemukan,
        level: 'tinggi',
      });
      expect(tanyaVideoTinggi).toHaveLength(3);
      expect(tanyaVideoTinggi[0]).toContain('deepfake');

      const tanyaVideoSedang = dapatkanPertanyaanCepatDefault({
        ...dummyHasilVideoTidakDitemukan,
        level: 'sedang',
      });
      expect(tanyaVideoSedang).toHaveLength(3);
      expect(tanyaVideoSedang[0]).toContain('manipulasi');

      const tanyaVideoTidak = dapatkanPertanyaanCepatDefault(dummyHasilVideoTidakDitemukan);
      expect(tanyaVideoTidak).toHaveLength(3);
      expect(tanyaVideoTidak[0]).toContain('tips mengenali teknologi');
    });

    it('merender tombol pertanyaan cepat di layar dengan target sentuh minimal 44px', () => {
      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const areaTanyaCepat = screen.getByTestId('area-pertanyaan-cepat');
      expect(areaTanyaCepat).toBeDefined();

      const btn0 = screen.getByTestId('btn-pertanyaan-cepat-0');
      const btn1 = screen.getByTestId('btn-pertanyaan-cepat-1');
      const btn2 = screen.getByTestId('btn-pertanyaan-cepat-2');

      expect(btn0).toBeDefined();
      expect(btn1).toBeDefined();
      expect(btn2).toBeDefined();

      // Target sentuh minimal 44px (Requirement 1.5, 27.2)
      expect(btn0.classList.contains('min-h-[44px]')).toBe(true);
      expect(btn1.classList.contains('min-h-[44px]')).toBe(true);
      expect(btn2.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('menggunakan prop pertanyaanCepat kustom jika disediakan', () => {
      const kustomPertanyaan = [
        'Apakah bank pernah meminta OTP lewat telepon?',
        'Berapa nomor call center resmi BCA?',
      ];

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          pertanyaanCepat={kustomPertanyaan}
        />
      );

      expect(screen.getByText('Apakah bank pernah meminta OTP lewat telepon?')).toBeDefined();
      expect(screen.getByText('Berapa nomor call center resmi BCA?')).toBeDefined();
      expect(screen.queryByTestId('btn-pertanyaan-cepat-2')).toBeNull();
    });
  });

  describe('3. Input Teks, Validasi, dan Batas Karakter', () => {
    it('memperbarui counter karakter saat pengguna mengetik dan membatasi pada 1.000 karakter', () => {
      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const input = screen.getByTestId('input-tanya-lanjut');
      const counterKarakter = screen.getByTestId('counter-karakter');

      expect(counterKarakter.textContent).toBe('0/1000 karakter');

      fireEvent.change(input, {
        target: { value: 'Bagaimana cara memverifikasi nomor ini?' },
      });

      expect(counterKarakter.textContent).toBe('39/1000 karakter');

      // Tombol submit menjadi aktif saat input tidak kosong
      const tombolKirim = screen.getByTestId('tombol-kirim-pertanyaan');
      expect((tombolKirim as HTMLButtonElement).disabled).toBe(false);
      expect(tombolKirim.classList.contains('min-h-[44px]')).toBe(true);
      expect(tombolKirim.classList.contains('min-w-[44px]')).toBe(true);
    });

    it('tidak mengizinkan teks melebihi MAKS_KARAKTER_PERTANYAAN (1.000 karakter)', () => {
      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const input = screen.getByTestId('input-tanya-lanjut') as HTMLTextAreaElement;
      const teksPanjang = 'A'.repeat(1200);

      fireEvent.change(input, { target: { value: teksPanjang } });

      expect(input.value.length).toBe(MAKS_KARAKTER_PERTANYAAN);
      const counterKarakter = screen.getByTestId('counter-karakter');
      expect(counterKarakter.textContent).toBe('1000/1000 karakter');
    });
  });

  describe('4. Interaksi Tanya Jawab & Balon Percakapan', () => {
    it('mengirimkan pertanyaan via form submit dan menampilkan balon pengguna dan asisten', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        'Jangan pernah memberikan kode OTP kepada siapa pun, karena OTP adalah kunci rahasia akunmu.'
      );

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, {
        target: { value: 'Mengapa kode OTP tidak boleh diberikan?' },
      });

      const tombolKirim = screen.getByTestId('tombol-kirim-pertanyaan');
      fireEvent.click(tombolKirim);

      // Loading indikator tampil saat proses
      expect(screen.getByTestId('balon-loading')).toBeDefined();

      // Input teks langsung dikosongkan
      expect((input as HTMLTextAreaElement).value).toBe('');

      // Tunggu respons asisten muncul
      await waitFor(() => {
        expect(screen.getByText('Mengapa kode OTP tidak boleh diberikan?')).toBeDefined();
        expect(
          screen.getByText(
            'Jangan pernah memberikan kode OTP kepada siapa pun, karena OTP adalah kunci rahasia akunmu.'
          )
        ).toBeDefined();
      });

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith('Mengapa kode OTP tidak boleh diberikan?');

      // Counter pertanyaan bertambah menjadi 1/10
      const counter = screen.getByTestId('counter-pertanyaan');
      expect(counter.textContent).toContain('1/10 pertanyaan');
    });

    it('mengirimkan pertanyaan langsung saat tombol pertanyaan cepat diklik', async () => {
      const mockHandler = vi.fn().mockResolvedValue(
        'Tanda paling berbahaya adalah adanya permintaan kode verifikasi OTP mendadak.'
      );

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const btn0 = screen.getByTestId('btn-pertanyaan-cepat-0');
      const pertanyaanTeks = btn0.textContent || '';

      fireEvent.click(btn0);

      await waitFor(() => {
        expect(screen.getAllByText(pertanyaanTeks).length).toBeGreaterThanOrEqual(1);
        expect(
          screen.getByText(
            'Tanda paling berbahaya adalah adanya permintaan kode verifikasi OTP mendadak.'
          )
        ).toBeDefined();
      });

      expect(mockHandler).toHaveBeenCalledWith(pertanyaanTeks);

      const counter = screen.getByTestId('counter-pertanyaan');
      expect(counter.textContent).toContain('1/10 pertanyaan');
    });

    it('mendukung submit dengan menekan tombol Enter pada textarea', async () => {
      const mockHandler = vi.fn().mockResolvedValue('Jawaban edukasi untuk pertanyaan pengguna.');

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, {
        target: { value: 'Bagaimana cara melapor ke IASC?' },
      });

      // Tekan Enter biasa (submit)
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      await waitFor(() => {
        expect(mockHandler).toHaveBeenCalledWith('Bagaimana cara melapor ke IASC?');
        expect(screen.getByText('Jawaban edukasi untuk pertanyaan pengguna.')).toBeDefined();
      });
    });

    it('tidak melakukan submit saat menekan Shift+Enter (untuk baris baru)', () => {
      const mockHandler = vi.fn();

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, {
        target: { value: 'Baris pertama' },
      });

      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('5. Pemanggilan Backend Default POST /api/tanya (Requirement 32.4)', () => {
    it('memanggil fetch(/api/tanya) dengan payload yang benar dan menyertakan konteks hasil & riwayat', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jawaban: 'Ini adalah jawaban dari endpoint backend /api/tanya.',
        }),
      });
      global.fetch = fetchMock;

      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, {
        target: { value: 'Apakah nomor pengirim bisa dilacak?' },
      });

      const tombolKirim = screen.getByTestId('tombol-kirim-pertanyaan');
      fireEvent.click(tombolKirim);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const [url, requestInit] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/tanya');
      expect(requestInit.method).toBe('POST');
      expect(requestInit.headers['Content-Type']).toBe('application/json');

      const parsedBody = JSON.parse(requestInit.body);
      expect(parsedBody.pertanyaan).toBe('Apakah nomor pengirim bisa dilacak?');
      expect(parsedBody.konteksHasil).toEqual(dummyHasilChatTinggi);
      expect(Array.isArray(parsedBody.riwayat)).toBe(true);

      // Pastikan jawaban muncul di DOM
      await waitFor(() => {
        expect(
          screen.getByText('Ini adalah jawaban dari endpoint backend /api/tanya.')
        ).toBeDefined();
      });
    });

    it('menangani kesalahan respons HTTP dari API secara anggun tanpa membuat aplikasi crash', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          pesan: 'Layanan AI sedang sibuk. Silakan coba kembali sesaat lagi.',
        }),
      });
      global.fetch = fetchMock;

      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, {
        target: { value: 'Bagaimana jika saya tertipu?' },
      });

      fireEvent.click(screen.getByTestId('tombol-kirim-pertanyaan'));

      await waitFor(() => {
        expect(
          screen.getByText('Layanan AI sedang sibuk. Silakan coba kembali sesaat lagi.')
        ).toBeDefined();
      });

      // Status loading selesai
      expect(screen.queryByTestId('balon-loading')).toBeNull();
    });

    it('menangani kegagalan jaringan (network error / fetch reject) secara ramah', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('Network connection offline'));
      global.fetch = fetchMock;

      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, {
        target: { value: 'Halo asisten?' },
      });

      fireEvent.click(screen.getByTestId('tombol-kirim-pertanyaan'));

      await waitFor(() => {
        expect(
          screen.getByText(/terjadi kendala saat mengirim pertanyaanmu/)
        ).toBeDefined();
      });

      expect(screen.queryByTestId('balon-loading')).toBeNull();
    });
  });

  describe('6. Batas Maksimal 10 Pertanyaan per Sesi (Requirement 31.5)', () => {
    it('menghitung pertanyaan pengguna hingga 10 dan mendisable input serta menampilkan banner', async () => {
      let callCount = 0;
      const mockHandler = vi.fn().mockImplementation((teks: string) => {
        callCount++;
        return Promise.resolve(`Jawaban ke-${callCount} untuk: ${teks}`);
      });

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const input = screen.getByTestId('input-tanya-lanjut');
      const tombolKirim = screen.getByTestId('tombol-kirim-pertanyaan');

      // Kirim 10 pertanyaan berturut-turut
      for (let i = 1; i <= MAKS_PERTANYAAN_PER_SESI; i++) {
        fireEvent.change(input, { target: { value: `Pertanyaan ke-${i}` } });
        fireEvent.click(tombolKirim);

        // Tunggu respon selesai
        await waitFor(() => {
          expect(screen.getByText(`Jawaban ke-${i} untuk: Pertanyaan ke-${i}`)).toBeDefined();
        });

        // Verifikasi counter bertambah
        const counter = screen.getByTestId('counter-pertanyaan');
        expect(counter.textContent).toContain(`${i}/${MAKS_PERTANYAAN_PER_SESI} pertanyaan`);
      }

      expect(mockHandler).toHaveBeenCalledTimes(10);

      // Saat batas 10 tercapai:
      // 1. Banner batas pertanyaan tampil
      const bannerBatas = screen.getByTestId('banner-batas-pertanyaan');
      expect(bannerBatas).toBeDefined();
      expect(bannerBatas.textContent).toContain('Batas 10 pertanyaan per sesi telah tercapai');

      // 2. Input dan tombol kirim dinonaktifkan
      expect((input as HTMLTextAreaElement).disabled).toBe(true);
      expect((tombolKirim as HTMLButtonElement).disabled).toBe(true);

      // 3. Tombol pertanyaan cepat dinonaktifkan
      const btn0 = screen.getByTestId('btn-pertanyaan-cepat-0');
      expect((btn0 as HTMLButtonElement).disabled).toBe(true);

      // Coba klik tombol pertanyaan cepat setelah batas tercapai
      fireEvent.click(btn0);
      expect(mockHandler).toHaveBeenCalledTimes(10); // Tidak bertambah
    });
  });

  describe('7. Privasi & Penyimpanan HANYA di Memori Browser (Requirement 31.5)', () => {
    it('tidak menyimpan isi percakapan ke localStorage atau sessionStorage sama sekali', async () => {
      const mockHandler = vi.fn().mockResolvedValue('Jawaban rahasia.');

      const setItemSpyLocal = vi.spyOn(Storage.prototype, 'setItem');

      render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, { target: { value: 'Pertanyaan sensitif privasi' } });
      fireEvent.click(screen.getByTestId('tombol-kirim-pertanyaan'));

      await waitFor(() => {
        expect(screen.getByText('Jawaban rahasia.')).toBeDefined();
      });

      // Pastikan localStorage dan sessionStorage kosong dan tidak pernah dipanggil untuk riwayat tanya jawab
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.getItem('tanya_lanjut')).toBeNull();
      expect(sessionStorage.getItem('riwayat_chat')).toBeNull();

      // Memastikan tidak ada pemanggilan setItem untuk percakapan
      const callsToStorage = setItemSpyLocal.mock.calls.filter(
        ([key]) => key.includes('tanya') || key.includes('riwayat') || key.includes('percakapan')
      );
      expect(callsToStorage).toHaveLength(0);
    });

    it('mereset seluruh riwayat percakapan saat komponen di-unmount dan di-mount kembali (in-memory only)', async () => {
      const mockHandler = vi.fn().mockResolvedValue('Jawaban tersimpan hanya di memori.');

      const { unmount } = render(
        <TanyaLanjut
          hasil={dummyHasilChatTinggi}
          onKirimPertanyaan={mockHandler}
        />
      );

      const input = screen.getByTestId('input-tanya-lanjut');
      fireEvent.change(input, { target: { value: 'Pertanyaan di sesi pertama' } });
      fireEvent.click(screen.getByTestId('tombol-kirim-pertanyaan'));

      await waitFor(() => {
        expect(screen.getByText('Pertanyaan di sesi pertama')).toBeDefined();
      });

      // Unmount komponen (simulasi pengguna berpindah halaman atau menekan Cek Lagi)
      unmount();

      // Mount kembali dengan hasil baru/sama
      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      // Riwayat lama tidak ada, counter kembali ke 0/10
      expect(screen.queryByText('Pertanyaan di sesi pertama')).toBeNull();
      expect(screen.getByTestId('counter-pertanyaan').textContent).toContain('0/10 pertanyaan');
    });
  });

  describe('8. Larangan Kata Terlarang (Requirement 6.7, 30.1)', () => {
    it('tidak menggunakan kata terlarang (pasti aman, 100% aman, terbukti aman) sebagai kesimpulan dalam UI TanyaLanjut', () => {
      render(<TanyaLanjut hasil={dummyHasilChatTinggi} />);

      const text = screen.getByTestId('komponen-tanya-lanjut').textContent || '';
      const forbiddenPhrases = [
        'pasti aman',
        'terbukti aman',
        '100% aman',
        'dijamin aman',
      ];

      forbiddenPhrases.forEach((phrase) => {
        expect(text.toLowerCase()).not.toContain(phrase);
      });
    });
  });
});
