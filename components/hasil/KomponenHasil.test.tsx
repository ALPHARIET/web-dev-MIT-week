// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import {
  KomponenHasil,
  HALAMAN_LAIN_DEFAULT,
  NAMA_LAYANAN_LABEL,
  STATUS_LAYANAN_CONFIG,
  type CrossLink,
} from './KomponenHasil';
import type { FormatDataHasil } from '@/lib/hasil';

describe('components/hasil/KomponenHasil.tsx (Task 4.8)', () => {
  afterEach(() => {
    cleanup();
  });

  const dummyHasilTinggi: FormatDataHasil = {
    halaman: 'chat',
    level: 'tinggi',
    ringkasan: 'Pesan ini memuat indikasi penipuan lowongan kerja dan meminta kode OTP rahasia.',
    temuan: [
      {
        judul: 'Meminta kode OTP',
        penjelasan: 'Pelaku meminta kode OTP untuk mengambil alih akun WhatsApp atau dompet digital.',
        bukti: 'Kirimkan kode 6 digit yang masuk ke SMS kamu',
        sumber: 'aturan',
      },
      {
        judul: 'Pola lowongan kerja like & follow',
        penjelasan: 'Menjanjikan komisi mudah dengan like video tapi berujung pada deposit uang.',
        bukti: 'Komisi 500rb per hari hanya dengan like video TikTok',
        sumber: 'ai',
      },
    ],
    hal_wajar: ['Menggunakan bahasa Indonesia yang cukup rapi'],
    langkah: [
      'Jangan berikan kode OTP atau SMS apa pun kepada pengirim.',
      'Segera blokir dan laporkan nomor tersebut di WhatsApp.',
      'Periksa menu Perangkat Tertaut pada setelan WhatsApp.',
    ],
    situasi_darurat: ['kirim_otp'],
    batasan: 'Analisis berbasis teks dan tangkapan layar chat yang dimasukkan. Tidak memeriksa riwayat percakapan di luar input ini.',
    pihak_ketiga: ['gemini'],
    status_layanan: {
      gemini: 'ok',
    },
  };

  const dummyHasilSedang: FormatDataHasil = {
    halaman: 'link',
    level: 'sedang',
    ringkasan: 'Link ini menggunakan domain yang baru didaftarkan dan mirip nama merek resmi.',
    temuan: [
      {
        judul: 'Domain baru terdaftar',
        penjelasan: 'Domain ini baru didaftarkan kurang dari 30 hari yang lalu.',
        bukti: 'https://promo-bank-bca-resmi.xyz',
        sumber: 'rdap',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan masukkan informasi login atau data perbankan di link tersebut.',
      'Akses situs resmi melalui aplikasi atau bookmark tersimpan.',
    ],
    situasi_darurat: [],
    batasan: 'Pengecekan domain dan reputasi URL pihak ketiga. Domain baru tidak otomatis merupakan situs jahat.',
    pihak_ketiga: ['safe_browsing', 'rdap'],
    status_layanan: {
      safe_browsing: 'ok',
      rdap: 'gagal',
    },
  };

  const dummyHasilTidakDitemukan: FormatDataHasil = {
    halaman: 'video',
    level: 'tidak_ditemukan',
    ringkasan: 'Tidak ditemukan indikasi manipulasi suara atau video deepfake yang mencurigakan.',
    temuan: [],
    hal_wajar: [
      'Gerakan bibir sinkron dengan intonasi ucapan',
      'Kontak sudah dikenal dan nomor sesuai dengan daftar kontak keluarga',
    ],
    langkah: [
      'Tetap lakukan konfirmasi melalui saluran terpisah jika ada permintaan uang mendadak.',
      'Gunakan kata kunci rahasia keluarga untuk verifikasi identitas.',
    ],
    situasi_darurat: [],
    batasan: 'Pemeriksaan berbasis indikator panduan wizard. Deepfake tingkat tinggi mungkin tidak terdeteksi sepenuhnya.',
    pihak_ketiga: [],
    status_layanan: {},
  };

  describe('Urutan 7 Blok Wajib Sesuai Spesifikasi (Requirement 6.1)', () => {
    it('merender seluruh 7 blok dalam urutan yang tepat sesuai Requirement 6.1', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const container = screen.getByTestId('komponen-hasil');
      expect(container).toBeDefined();

      const blok1 = screen.getByTestId('blok-tingkat-kewaspadaan');
      const blok2 = screen.getByTestId('blok-temuan');
      const blok3 = screen.getByTestId('blok-hal-wajar');
      const blok4 = screen.getByTestId('blok-langkah-disarankan');
      const blok5 = screen.getByTestId('blok-panel-darurat');
      const blok6 = screen.getByTestId('blok-batasan-layanan');
      const blok7 = screen.getByTestId('blok-aksi-penutup');

      expect(
        blok1.compareDocumentPosition(blok2) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        blok2.compareDocumentPosition(blok3) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        blok3.compareDocumentPosition(blok4) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        blok4.compareDocumentPosition(blok5) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        blok5.compareDocumentPosition(blok6) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        blok6.compareDocumentPosition(blok7) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();

      const blokTanya = screen.getByTestId('blok-tanya-lanjut');
      expect(
        blok6.compareDocumentPosition(blokTanya) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        blokTanya.compareDocumentPosition(blok7) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('tidak merender blok (3) Yang tampak wajar jika hasil.hal_wajar kosong', () => {
      render(<KomponenHasil hasil={dummyHasilSedang} />);

      expect(screen.getByTestId('blok-tingkat-kewaspadaan')).toBeDefined();
      expect(screen.getByTestId('blok-temuan')).toBeDefined();
      expect(screen.queryByTestId('blok-hal-wajar')).toBeNull();
      expect(screen.getByTestId('blok-langkah-disarankan')).toBeDefined();
      expect(screen.getByTestId('blok-panel-darurat')).toBeDefined();
      expect(screen.getByTestId('blok-batasan-layanan')).toBeDefined();
      expect(screen.getByTestId('blok-tanya-lanjut')).toBeDefined();
      expect(screen.getByTestId('blok-aksi-penutup')).toBeDefined();
    });

    it('dapat menyembunyikan blok Tanya Lanjut jika tampilkanTanyaLanjut disetel false', () => {
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          tampilkanTanyaLanjut={false}
        />
      );

      expect(screen.queryByTestId('blok-tanya-lanjut')).toBeNull();
    });

    it('meneruskan pertanyaanCepat kustom ke komponen TanyaLanjut', () => {
      const kustomPertanyaan = ['Pertanyaan spesifik 1', 'Pertanyaan spesifik 2'];
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          pertanyaanCepat={kustomPertanyaan}
        />
      );

      expect(screen.getByText('Pertanyaan spesifik 1')).toBeDefined();
      expect(screen.getByText('Pertanyaan spesifik 2')).toBeDefined();
    });
  });

  describe('Tingkat Kewaspadaan (Requirements 6.2, 6.3, 6.4, 6.5)', () => {
    it('merender level "tinggi" dengan label "Waspada tinggi" dan kalimat pembuka resmi (Requirement 6.2)', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      expect(screen.getByText('Waspada tinggi')).toBeDefined();
      expect(
        screen.getByText(
          'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.'
        )
      ).toBeDefined();
      expect(screen.getByTestId('icon-tinggi')).toBeDefined();
      expect(screen.getByText(dummyHasilTinggi.ringkasan)).toBeDefined();
    });

    it('merender level "sedang" dengan label "Perlu hati-hati" dan kalimat pembuka resmi (Requirement 6.3)', () => {
      render(<KomponenHasil hasil={dummyHasilSedang} />);

      expect(screen.getByText('Perlu hati-hati')).toBeDefined();
      expect(
        screen.getByText('Ada tanda yang perlu kamu cek dulu sebelum lanjut.')
      ).toBeDefined();
      expect(screen.getByTestId('icon-sedang')).toBeDefined();
      expect(screen.getByText(dummyHasilSedang.ringkasan)).toBeDefined();
    });

    it('merender level "tidak_ditemukan" dengan label "Tidak ditemukan tanda bahaya" dan kalimat pembuka resmi (Requirement 6.4)', () => {
      render(<KomponenHasil hasil={dummyHasilTidakDitemukan} />);

      expect(screen.getByText('Tidak ditemukan tanda bahaya')).toBeDefined();
      expect(
        screen.getByText(
          'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
        )
      ).toBeDefined();
      expect(screen.getByTestId('icon-tidak_ditemukan')).toBeDefined();
      expect(screen.getByText(dummyHasilTidakDitemukan.ringkasan)).toBeDefined();
    });
  });

  describe('Yang Perlu Diwaspadai & Sumber Temuan (Requirements 6.1, 6.6)', () => {
    it('merender setiap temuan sebagai KartuTemuan lengkap dengan nomor, judul, penjelasan, dan bukti', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const kartuList = screen.getAllByTestId('kartu-temuan');
      expect(kartuList).toHaveLength(2);

      expect(screen.getByText('Meminta kode OTP')).toBeDefined();
      expect(
        screen.getByText(/Pelaku meminta kode OTP untuk mengambil alih akun/)
      ).toBeDefined();
      expect(
        screen.getByText('Kirimkan kode 6 digit yang masuk ke SMS kamu')
      ).toBeDefined();

      expect(screen.getByText('Pola lowongan kerja like & follow')).toBeDefined();
      expect(
        screen.getByText(
          'Komisi 500rb per hari hanya dengan like video TikTok'
        )
      ).toBeDefined();
    });

    it('menampilkan badge sumber temuan yang benar untuk setiap temuan (Requirement 6.6)', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const badges = screen.getAllByTestId('badge-sumber');
      expect(badges[0].textContent).toBe('Pola penipuan');
      expect(badges[1].textContent).toBe('Analisis AI');
    });

    it('menampilkan badge jumlah temuan saat temuan lebih dari nol', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);
      const badgeJumlah = screen.getByTestId('badge-jumlah-temuan');
      expect(badgeJumlah.textContent).toBe('2');
    });

    it('merender SorotanTranskrip jika prop transkrip disediakan (Requirement CH-07)', () => {
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          transkrip="Halo kak, Kirimkan kode 6 digit yang masuk ke SMS kamu sekarang juga."
        />
      );

      const sorotan = screen.getByTestId('sorotan-transkrip');
      expect(sorotan).toBeDefined();
      expect(screen.getByTestId('konten-transkrip')).toBeDefined();
      const markElements = screen.getAllByTestId('sorotan-pemicu');
      expect(markElements.length).toBeGreaterThan(0);
    });

    it('merender SorotanTranskrip jika hasil.transkrip tersedia (Requirement CH-07)', () => {
      const hasilDenganTranskrip: FormatDataHasil = {
        ...dummyHasilTinggi,
        transkrip: 'Teks dari tangkapan layar: Kirimkan kode 6 digit yang masuk ke SMS kamu',
      };
      render(<KomponenHasil hasil={hasilDenganTranskrip} />);

      const sorotan = screen.getByTestId('sorotan-transkrip');
      expect(sorotan).toBeDefined();
    });

    it('tidak merender SorotanTranskrip jika transkrip tidak disediakan', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      expect(screen.queryByTestId('sorotan-transkrip')).toBeNull();
    });

    it('merender PemecahUrl jika prop url disediakan (Requirement LN-07)', () => {
      render(
        <KomponenHasil
          hasil={dummyHasilSedang}
          url="https://promo-bank-bca-resmi.xyz/login"
        />
      );

      const pemecah = screen.getByTestId('blok-pemecah-url');
      expect(pemecah).toBeDefined();
      expect(screen.getByTestId('pemecah-url')).toBeDefined();
      expect(screen.getByTestId('bar-pemecah-url')).toBeDefined();
    });

    it('merender PemecahUrl jika hasil.url tersedia (Requirement LN-07)', () => {
      const hasilDenganUrl: FormatDataHasil = {
        ...dummyHasilSedang,
        url: 'https://promo-bank-bca-resmi.xyz/login',
      };
      render(<KomponenHasil hasil={hasilDenganUrl} />);

      expect(screen.getByTestId('blok-pemecah-url')).toBeDefined();
      expect(screen.getByTestId('pemecah-url')).toBeDefined();
    });

    it('tidak merender blok PemecahUrl jika url tidak disediakan', () => {
      render(<KomponenHasil hasil={dummyHasilSedang} />);

      expect(screen.queryByTestId('blok-pemecah-url')).toBeNull();
    });

    it('menampilkan pesan informatif saat tidak ada temuan (level tidak_ditemukan)', () => {
      render(<KomponenHasil hasil={dummyHasilTidakDitemukan} />);
      expect(screen.getByTestId('temuan-kosong')).toBeDefined();
      expect(screen.queryByTestId('badge-jumlah-temuan')).toBeNull();
    });
  });

  describe('Yang Tampak Wajar (Requirement 6.1)', () => {
    it('merender daftar butir yang tampak wajar jika disediakan', () => {
      render(<KomponenHasil hasil={dummyHasilTidakDitemukan} />);

      const blokWajar = screen.getByTestId('blok-hal-wajar');
      expect(blokWajar).toBeDefined();
      expect(screen.getByText('Yang Tampak Wajar')).toBeDefined();

      expect(
        screen.getByText('Gerakan bibir sinkron dengan intonasi ucapan')
      ).toBeDefined();
      expect(
        screen.getByText(
          'Kontak sudah dikenal dan nomor sesuai dengan daftar kontak keluarga'
        )
      ).toBeDefined();
    });
  });

  describe('Langkah yang Disarankan (Requirement 6.1, 5.4)', () => {
    it('merender komponen LangkahDisarankan dengan langkah yang diberikan', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const langkahSection = screen.getByTestId('langkah-disarankan-section');
      expect(langkahSection).toBeDefined();

      expect(
        screen.getByText('Jangan berikan kode OTP atau SMS apa pun kepada pengirim.')
      ).toBeDefined();
      expect(
        screen.getByText('Segera blokir dan laporkan nomor tersebut di WhatsApp.')
      ).toBeDefined();
      expect(
        screen.getByText('Periksa menu Perangkat Tertaut pada setelan WhatsApp.')
      ).toBeDefined();
    });
  });

  describe('PanelDarurat & Integrasi Situasi Darurat (Requirements 6.1, 7.6)', () => {
    it('merender PanelDarurat dan otomatis terbuka saat situasi_darurat terdeteksi (Requirement 7.6)', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const panelSection = screen.getByTestId('panel-darurat-section');
      expect(panelSection).toBeDefined();

      const toggle = screen.getByTestId('panel-darurat-toggle');
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByTestId('panel-darurat-content')).toBeDefined();

      expect(screen.getByTestId('badge-darurat-terdeteksi')).toBeDefined();
    });

    it('merender PanelDarurat tertutup secara default saat situasi_darurat kosong', () => {
      render(<KomponenHasil hasil={dummyHasilSedang} />);

      const toggle = screen.getByTestId('panel-darurat-toggle');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByTestId('panel-darurat-content')).toBeNull();
    });
  });

  describe('Batasan & Layanan Pihak Ketiga (Requirement 6.1)', () => {
    it('menampilkan teks batasan pemeriksaan dan daftar layanan pihak ketiga beserta statusnya', () => {
      render(<KomponenHasil hasil={dummyHasilSedang} />);

      const teksBatasan = screen.getByTestId('teks-batasan');
      expect(teksBatasan.textContent).toBe(dummyHasilSedang.batasan);

      const itemSb = screen.getByTestId('layanan-item-safe_browsing');
      expect(within(itemSb).getByText('Google Safe Browsing')).toBeDefined();
      expect(screen.getByTestId('status-badge-safe_browsing').textContent).toBe(
        'Berjalan normal'
      );

      const itemRdap = screen.getByTestId('layanan-item-rdap');
      expect(within(itemRdap).getByText('Data Domain (RDAP)')).toBeDefined();
      expect(screen.getByTestId('status-badge-rdap').textContent).toContain(
        'fallback aturan lokal'
      );
    });

    it('menampilkan pesan informatif saat tidak ada layanan pihak ketiga yang digunakan', () => {
      render(<KomponenHasil hasil={dummyHasilTidakDitemukan} />);
      expect(
        screen.getByTestId('layanan-pihak-ketiga-kosong')
      ).toBeDefined();
    });
  });

  describe('Aksi Penutup: Tombol "Cek lagi", Halaman Lain & Cross-Links (Requirements 34.1, 34.3, 34.4, 35.2)', () => {
    it('merender tombol "Cek lagi" dan memanggil onCekLagi saat diklik (Requirement 35.2)', () => {
      const handleCekLagi = vi.fn();
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          onCekLagi={handleCekLagi}
        />
      );

      const btnCekLagi = screen.getByTestId('tombol-cek-lagi');
      expect(btnCekLagi).toBeDefined();
      expect(btnCekLagi.textContent).toContain('Cek lagi');
      expect(btnCekLagi.classList.contains('min-h-[44px]')).toBe(true);

      fireEvent.click(btnCekLagi);
      expect(handleCekLagi).toHaveBeenCalledTimes(1);
    });

    it('merender tautan default ke dua halaman cek lainnya berdasarkan hasil.halaman (Requirement 34.4)', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const areaHalamanLain = screen.getByTestId('area-halaman-lain');
      expect(areaHalamanLain).toBeDefined();

      const link0 = screen.getByTestId('link-halaman-lain-0');
      const link1 = screen.getByTestId('link-halaman-lain-1');

      expect(link0.textContent).toContain('Cek Link');
      expect(link0.getAttribute('href')).toBe('/cek-link');
      expect(link0.classList.contains('min-h-[44px]')).toBe(true);

      expect(link1.textContent).toContain('Cek Video & Suara');
      expect(link1.getAttribute('href')).toBe('/cek-video-suara');
      expect(link1.classList.contains('min-h-[44px]')).toBe(true);
    });

    it('menggunakan prop halamanLain kustom jika disediakan', () => {
      const kustomHalamanLain = [
        { label: 'Cek Nomor Telepon', href: '/cek-nomor' },
      ];
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          halamanLain={kustomHalamanLain}
        />
      );

      const link0 = screen.getByTestId('link-halaman-lain-0');
      expect(link0.textContent).toContain('Cek Nomor Telepon');
      expect(link0.getAttribute('href')).toBe('/cek-nomor');
    });

    it('merender cross-links dengan tombol onClick (Requirement 34.1: "Cek link ini")', () => {
      const handleCrossLink = vi.fn();
      const crossLinks: CrossLink[] = [
        {
          label: 'Cek link ini',
          onClick: handleCrossLink,
          deskripsi: 'Periksa tautan yang terdeteksi di chat secara terpisah',
        },
      ];

      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          crossLinks={crossLinks}
        />
      );

      const areaCross = screen.getByTestId('area-cross-links');
      expect(areaCross).toBeDefined();

      const btnCross = screen.getByTestId('btn-cross-link-0');
      expect(btnCross.textContent).toContain('Cek link ini');
      expect(btnCross.classList.contains('min-h-[44px]')).toBe(true);

      fireEvent.click(btnCross);
      expect(handleCrossLink).toHaveBeenCalledTimes(1);
    });

    it('merender cross-links dengan href (Requirement 34.3: tautan ke Cek Video & Suara)', () => {
      const crossLinks: CrossLink[] = [
        {
          label: 'Cek di Video & Suara',
          href: '/cek-video-suara',
          deskripsi: 'Buka panduan deteksi video call atau voice note',
        },
      ];

      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          crossLinks={crossLinks}
        />
      );

      const linkCross = screen.getByTestId('btn-cross-link-0');
      expect(linkCross.textContent).toContain('Cek di Video & Suara');
      expect(linkCross.getAttribute('href')).toBe('/cek-video-suara');
    });

    it('merender tombol "Kirim peringatan" untuk keluarga di samping tombol "Cek lagi" (Requirement P1, 27.2)', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const btnPeringatan = screen.getByTestId('tombol-kirim-peringatan');
      expect(btnPeringatan).toBeDefined();
      expect(btnPeringatan.textContent).toContain('Kirim peringatan');
      expect(btnPeringatan.classList.contains('min-h-[44px]')).toBe(true);

      fireEvent.click(btnPeringatan);
      expect(screen.getByTestId('dialog-templat-peringatan')).toBeDefined();
    });

    it('dapat menyembunyikan tombol "Kirim peringatan" jika tampilkanTemplatPeringatan disetel false', () => {
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          tampilkanTemplatPeringatan={false}
        />
      );

      expect(screen.queryByTestId('tombol-kirim-peringatan')).toBeNull();
    });
  });

  describe('Kepatuhan Larangan Kata Terlarang (Requirement 6.7)', () => {
    it('tidak menggunakan kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan dalam UI KomponenHasil', () => {
      render(<KomponenHasil hasil={dummyHasilTinggi} />);

      const text = screen.getByTestId('komponen-hasil').textContent || '';
      const forbiddenPhrases = [
        'pasti aman',
        'terbukti aman',
        '100% aman',
        'dijamin aman',
        'pasti penipu',
        'terbukti penipu',
      ];

      forbiddenPhrases.forEach((phrase) => {
        expect(text.toLowerCase()).not.toContain(phrase);
      });
    });
  });

  describe('Dukungan className Kustom', () => {
    it('menggabungkan prop className ke container terluar', () => {
      render(
        <KomponenHasil
          hasil={dummyHasilTinggi}
          className="kustom-hasil-class p-6"
        />
      );

      const root = screen.getByTestId('komponen-hasil');
      expect(root.classList.contains('kustom-hasil-class')).toBe(true);
      expect(root.classList.contains('p-6')).toBe(true);
    });
  });

  describe('Konfigurasi Default & Konstanta', () => {
    it('memiliki pemetaan default untuk ketiga halaman cek', () => {
      expect(HALAMAN_LAIN_DEFAULT.chat).toHaveLength(2);
      expect(HALAMAN_LAIN_DEFAULT.link).toHaveLength(2);
      expect(HALAMAN_LAIN_DEFAULT.video).toHaveLength(2);
    });

    it('memiliki konfigurasi badge status layanan yang lengkap', () => {
      expect(STATUS_LAYANAN_CONFIG.ok).toBeDefined();
      expect(STATUS_LAYANAN_CONFIG.gagal).toBeDefined();
      expect(STATUS_LAYANAN_CONFIG.tidak_dipakai).toBeDefined();
      expect(STATUS_LAYANAN_CONFIG.tidak_tersedia).toBeDefined();
    });

    it('memiliki label yang mudah dibaca untuk layanan pihak ketiga', () => {
      expect(NAMA_LAYANAN_LABEL.gemini).toBe('Analisis AI');
      expect(NAMA_LAYANAN_LABEL.safe_browsing).toContain('Safe Browsing');
      expect(NAMA_LAYANAN_LABEL.rdap).toContain('RDAP');
    });
  });
});
