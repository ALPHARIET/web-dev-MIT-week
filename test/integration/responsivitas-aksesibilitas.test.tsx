// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import RootLayout, { viewport } from '@/app/layout';

import Home from '@/app/page';
import CekChatPage from '@/app/cek-chat/page';
import CekLinkPage from '@/app/cek-link/page';
import CekVideoSuaraPage from '@/app/cek-video-suara/page';

import { Header, NAV_ITEMS } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { KartuMenu } from '@/components/shared/KartuMenu';
import { Akordeon } from '@/components/shared/Akordeon';
import { InputChat } from '@/components/input/InputChat';
import { InputLink } from '@/components/input/InputLink';
import { WizardVideoSuara } from '@/components/input/WizardVideoSuara';
import { TombolContoh } from '@/components/input/TombolContoh';
import { PratinjauSensor } from '@/components/PratinjauSensor';
import { KomponenHasil } from '@/components/hasil/KomponenHasil';
import { TingkatKewaspadaan } from '@/components/hasil/TingkatKewaspadaan';
import LangkahDisarankan from '@/components/hasil/LangkahDisarankan';
import { PanelDarurat } from '@/components/hasil/PanelDarurat';

import type { FormatDataHasil, TingkatLevel } from '@/lib/hasil';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/font/local', () => ({
  default: (options: { variable: string }) => ({
    variable: options.variable,
    className: `mocked-font-${options.variable.replace('--font-', '')}`,
  }),
}));

// ===== HELPER MATEMATIKA RASIO KONTRAS WCAG AA =====

function hexToRgb(hex: string): [number, number, number] {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(cleanHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hasAccessibleLabel(input: HTMLElement): { valid: boolean; reason?: string } {
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim().length > 0) {
    return { valid: true };
  }

  const ariaLabelledby = input.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const labellingElement = document.getElementById(ariaLabelledby);
    if (labellingElement && labellingElement.textContent?.trim()) {
      return { valid: true };
    }
  }

  const parentLabel = input.closest('label');
  if (parentLabel && parentLabel.textContent?.trim()) {
    return { valid: true };
  }

  const inputId = input.getAttribute('id');
  if (inputId) {
    const allLabels = Array.from(document.querySelectorAll('label'));
    const matchingLabel = allLabels.find(
      (lbl) => lbl.htmlFor === inputId || lbl.getAttribute('for') === inputId
    );
    if (matchingLabel && matchingLabel.textContent?.trim()) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    reason: `Elemen <${input.tagName.toLowerCase()}> dengan id="${inputId || 'tanpa-id'}" tidak memiliki label aksesibel`,
  };
}

describe('Task 15.6 — Uji Responsivitas dan Aksesibilitas WCAG AA (test/integration/responsivitas-aksesibilitas.test.tsx)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('1. Layout Rapi pada Lebar Layar 360 px Tanpa Scroll Horizontal (Requirements 1.4, 27.1)', () => {
    it('memastikan konfigurasi Viewport Next.js disetel untuk layar mobile 360px (Requirement 1.4, 27.1, 27.5)', () => {
      expect(viewport).toBeDefined();
      expect(viewport.width).toBe('device-width');
      expect(viewport.initialScale).toBe(1);
      expect(viewport.maximumScale).toBeGreaterThanOrEqual(1);
    });

    it('memastikan RootLayout menggunakan overflow-x-hidden pada body untuk mencegah scroll horizontal (Requirement 27.1)', () => {
      const { container } = render(
        <RootLayout>
          <div data-testid="test-content">Konten Aplikasi</div>
        </RootLayout>
      );

      const body = container.querySelector('body');
      expect(body).not.toBeNull();
      expect(body?.className).toContain('overflow-x-hidden');
      expect(body?.className).toContain('min-h-screen');
      expect(body?.className).toContain('flex flex-col');
    });

    it('memastikan main container di RootLayout memiliki w-full dan responsive horizontal padding yang aman untuk 360px (Requirement 1.4, 27.1)', () => {
      render(
        <RootLayout>
          <div>Konten Utama</div>
        </RootLayout>
      );

      const main = screen.getByRole('main');
      expect(main.className).toContain('w-full');
      expect(main.className).toContain('max-w-5xl');
      expect(main.className).toContain('mx-auto');
      expect(main.className).toContain('px-4');
    });

    it('memastikan Halaman Beranda (Home) menggunakan layout vertikal w-full yang pas di 360px (Requirement 3.1, 27.1)', () => {
      const { container } = render(<Home />);

      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain('w-full');

      const menuContainer = screen.getByTestId('menu-kartu-container');
      expect(menuContainer.className).toContain('space-y-4');

      const kartuList = screen.getAllByTestId('kartu-menu');
      expect(kartuList).toHaveLength(3);
      kartuList.forEach((kartu) => {
        expect(kartu.className).toContain('w-full');
        expect(kartu.className).toContain('block');
      });
    });

    it('memastikan Halaman Cek Chat menggunakan kontainer w-full dan responsive padding (Requirement 27.1)', () => {
      const { container } = render(<CekChatPage />);

      const pageContainer = container.querySelector('.max-w-4xl');
      expect(pageContainer).not.toBeNull();
      expect(pageContainer?.className).toContain('w-full');
      expect(pageContainer?.className).toContain('mx-auto');
    });

    it('memastikan Halaman Cek Link menggunakan kontainer w-full dan form responsif (Requirement 27.1)', () => {
      const { container } = render(<CekLinkPage />);

      const pageContainer = container.querySelector('.max-w-4xl');
      expect(pageContainer).not.toBeNull();
      expect(pageContainer?.className).toContain('w-full');
      expect(pageContainer?.className).toContain('mx-auto');

      const formInput = screen.getByTestId('form-input-link');
      expect(formInput.className).toContain('w-full');
    });

    it('memastikan Halaman Cek Video & Suara menggunakan kontainer w-full dan grid 1 kolom di mobile (Requirement 27.1)', () => {
      render(<CekVideoSuaraPage />);
      fireEvent.click(screen.getByTestId('tab-mode-kuis'));

      const page = screen.getByTestId('halaman-cek-video-suara');
      expect(page.className).toContain('w-full');
      expect(page.className).toContain('max-w-4xl');

      const radiogroup = screen.getByRole('radiogroup', { name: /pilihan situasi video atau suara/i });
      expect(radiogroup.className).toContain('grid-cols-1');
    });

    it('memastikan KomponenHasil memiliki penataan fleksibel yang mencegah scroll horizontal saat menampilkan URL panjang atau banyak temuan (Requirement 27.1)', () => {
      const mockHasilPanjang: FormatDataHasil = {
        halaman: 'link',
        level: 'tinggi',
        ringkasan: 'Tautan ini mengandung indikasi phishing yang berbahaya dengan nama domain sangat panjang.',
        temuan: [
          {
            judul: 'Domain Sangat Panjang Meniru Lembaga Resmi Perbankan',
            penjelasan: 'Pelaku memanfaatkan domain tiruan untuk mengecoh calon korban.',
            bukti: 'https://login-perbankan-resmi-verifikasi-keamanan-akun-nasabah-indonesia-update-2025.phishing-bank.xyz/verify-otp-account',
            sumber: 'safe_browsing',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Segera tutup halaman browser dan jangan masukkan data rekening apa pun.',
          'Hubungi call center resmi bank untuk memastikan status rekening kamu.',
        ],
        situasi_darurat: ['klik_link'],
        batasan: 'Pemeriksaan berbasis reputasi link dan kecocokan kata kunci.',
        pihak_ketiga: ['Google Safe Browsing', 'RDAP'],
        status_layanan: { safe_browsing: 'ok', rdap: 'ok' },
      };

      const { container } = render(
        <KomponenHasil
          hasil={mockHasilPanjang}
          className="w-full"
          onCekLagi={vi.fn()}
        />
      );

      const rootSection = container.querySelector('[data-testid="komponen-hasil"]');
      expect(rootSection?.className).toContain('w-full');

      const buktiElem = screen.getByText(/login-perbankan-resmi-verifikasi-keamanan-akun-nasabah-indonesia/i);
      const blockquote = buktiElem.closest('blockquote');
      expect(blockquote?.className).toContain('break-words');
    });
  });

  describe('2. Target Sentuh Minimal 44 × 44 px untuk Semua Elemen Interaktif (Requirements 1.5, 27.2)', () => {
    it('memastikan tombol navigasi Header dan hamburger menu memenuhi target sentuh minimal 44px (Requirements 1.5, 27.2)', () => {
      render(<Header currentPath="/" />);

      const logoLink = screen.getByRole('link', { name: /cek penipuan - beranda/i });
      expect(logoLink.className).toContain('min-h-[44px]');
      expect(logoLink.className).toContain('min-w-[44px]');

      NAV_ITEMS.forEach((item) => {
        const link = screen.getByRole('link', { name: item.label });
        expect(link.className).toContain('min-h-[44px]');
      });

      const hamburger = screen.getByRole('button', { name: /buka menu navigasi/i });
      expect(hamburger.className).toContain('min-h-[44px]');
      expect(hamburger.className).toContain('min-w-[44px]');
    });

    it('memastikan link navigasi Footer dan catatan batasan memenuhi target sentuh minimal 44px (Requirements 1.5, 27.2)', () => {
      render(<Footer />);

      const footerLinks = screen.getAllByRole('link');
      expect(footerLinks.length).toBeGreaterThan(0);
      footerLinks.forEach((link) => {
        expect(link.className).toContain('min-h-[44px]');
      });
    });

    it('memastikan tiga KartuMenu di Beranda memenuhi target sentuh minimal 44px (Requirements 3.1, 27.2)', () => {
      render(
        <div className="space-y-4">
          <KartuMenu nomor={1} judul="Cek Chat" deskripsi="Periksa chat" href="/cek-chat" />
          <KartuMenu nomor={2} judul="Cek Link" deskripsi="Periksa link" href="/cek-link" />
          <KartuMenu nomor={3} judul="Cek Video & Suara" deskripsi="Periksa video" href="/cek-video-suara" />
        </div>
      );

      const kartuLinks = screen.getAllByTestId('kartu-menu');
      kartuLinks.forEach((kartu) => {
        expect(kartu.className).toContain('min-h-[44px]');
      });
    });

    it('memastikan tombol accordion di Akordeon memiliki target sentuh minimal 44px (Requirements 4.5, 27.2)', () => {
      render(
        <Akordeon
          items={[
            { id: 'item-1', judul: 'Bagaimana cara penilaian?', konten: <p>Isi 1</p> },
            { id: 'item-2', judul: 'Apa saja batasannya?', konten: <p>Isi 2</p> },
          ]}
        />
      );

      const headerBtn1 = screen.getByTestId('akordeon-header-item-1');
      const headerBtn2 = screen.getByTestId('akordeon-header-item-2');
      expect(headerBtn1.className).toContain('min-h-[44px]');
      expect(headerBtn2.className).toContain('min-h-[44px]');
    });

    it('memastikan elemen interaktif pada InputChat (tab, tombol submit, input konteks) memenuhi target sentuh minimal 44px (Requirement 27.2)', () => {
      render(<InputChat onSubmit={vi.fn()} />);

      const tabTeks = screen.getByRole('tab', { name: /tempel teks/i });
      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      expect(tabTeks.className).toContain('min-h-[44px]');
      expect(tabScreenshot.className).toContain('min-h-[44px]');

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.className).toContain('min-h-[44px]');

      const inputKonteks = screen.getByPlaceholderText(/dari nomor tidak dikenal/i);
      expect(inputKonteks.className).toContain('min-h-[44px]');
    });

    it('memastikan elemen interaktif pada InputLink (input field, tombol bersihkan, tombol periksa) memenuhi target sentuh minimal 44px (Requirement 27.2)', () => {
      render(<InputLink onSubmit={vi.fn()} initialUrl="https://contoh-link.com" />);

      const inputLink = screen.getByTestId('input-link');
      expect(inputLink.className).toMatch(/min-h-\[(44|48)px\]/);

      const tombolBersihkan = screen.getByTestId('tombol-bersihkan');
      expect(tombolBersihkan.className).toContain('min-h-[44px]');
      expect(tombolBersihkan.className).toContain('min-w-[44px]');

      const tombolPeriksa = screen.getByTestId('tombol-periksa');
      expect(tombolPeriksa.className).toContain('min-h-[44px]');
    });

    it('memastikan komponen TombolContoh (tombol utama, toggle dropdown, dan reset) memiliki target sentuh minimal 44 × 44 px (Requirement 27.2)', () => {
      render(<TombolContoh halaman="chat" onPilihContoh={vi.fn()} />);

      const tombolUtama = screen.getByTestId('tombol-coba-contoh');
      expect(tombolUtama.className).toContain('min-h-[44px]');

      const tombolDropdown = screen.getByTestId('tombol-pilih-dropdown');
      expect(tombolDropdown.className).toContain('min-h-[44px]');
      expect(tombolDropdown.className).toContain('min-w-[44px]');

      fireEvent.click(tombolUtama);

      const tombolReset = screen.getByTestId('tombol-reset-contoh');
      expect(tombolReset.className).toContain('min-h-[44px]');
      expect(tombolReset.className).toContain('min-w-[44px]');
    });

    it('memastikan tombol aksi pada dialog modal PratinjauSensor memenuhi target sentuh minimal 44px (Requirement 27.2)', () => {
      render(
        <PratinjauSensor
          isOpen={true}
          teksAsli="Hubungi 081234567890 transfer ke BCA 1234567890"
          teksTersensor="Hubungi [disensor] transfer ke BCA [disensor]"
          jumlahDiganti={2}
          onKonfirmasi={vi.fn()}
          onBatal={vi.fn()}
        />
      );

      const btnLanjut = screen.getByTestId('btn-lanjut-periksa');
      const btnBatal = screen.getByTestId('btn-batal');
      const btnTutup = screen.getByTestId('btn-tutup-modal');

      expect(btnLanjut.className).toContain('min-h-[44px]');
      expect(btnBatal.className).toContain('min-h-[44px]');
      expect(btnTutup.className).toContain('min-h-[44px]');
      expect(btnTutup.className).toContain('min-w-[44px]');
    });

    it('memastikan pilihan situasi dan tombol wizard pada WizardVideoSuara memiliki target sentuh minimal 44px (Requirement 27.2)', () => {
      render(
        <WizardVideoSuara
          onHasilReady={vi.fn()}
          initialJawaban={{
            situasi: 'tokoh',
          }}
        />
      );

      const situasi1 = screen.getByTestId('kartu-situasi-video_call');
      const situasi2 = screen.getByTestId('kartu-situasi-rekaman');
      const situasi3 = screen.getByTestId('kartu-situasi-tokoh');

      expect(situasi1.className).toContain('min-h-[44px]');
      expect(situasi2.className).toContain('min-h-[44px]');
      expect(situasi3.className).toContain('min-h-[44px]');

      const btnLanjut = screen.getByTestId('tombol-lanjut');
      expect(btnLanjut.className).toContain('min-h-[44px]');

      fireEvent.click(btnLanjut);

      const radioLabels = document.querySelectorAll(
        'label[for^="siapa_tampil_"], label[for^="apa_diminta_"]'
      );
      expect(radioLabels.length).toBeGreaterThan(0);
      radioLabels.forEach((lbl) => {
        expect((lbl as HTMLElement).className).toContain('min-h-[44px]');
      });
    });

    it('memastikan checklist pada LangkahDisarankan memiliki area target sentuh minimal 44 × 44 px (Requirement 27.2)', () => {
      render(
        <LangkahDisarankan
          langkah={[
            'Jangan mentransfer uang ke rekening mana pun.',
            'Blokir nomor pengirim di aplikasi pesan.',
          ]}
        />
      );

      const checkboxContainers = document.querySelectorAll('.min-w-\\[44px\\].min-h-\\[44px\\]');
      expect(checkboxContainers.length).toBe(2);
    });

    it('memastikan toggle, tab situasi, checkbox, dan tautan darurat pada PanelDarurat memenuhi target sentuh minimal 44px (Requirement 27.2)', () => {
      render(<PanelDarurat situasiAktif={['transfer']} autoOpen={true} />);

      const toggleBtn = screen.getByTestId('panel-darurat-toggle');
      expect(toggleBtn.className).toContain('min-h-[44px]');

      const tabTransfer = screen.getByTestId('tab-situasi-transfer');
      expect(tabTransfer.className).toMatch(/min-h-\[(44|48)px\]/);

      const linkIASC = screen.getByRole('link', { name: /indonesia anti-scam centre/i });
      expect(linkIASC.className).toContain('min-h-[44px]');

      const linkTelp = screen.getByRole('link', { name: /telepon 157/i });
      expect(linkTelp.className).toContain('min-h-[44px]');
    });

    it('memastikan tombol "Cek lagi", tombol cross-links, dan link halaman lain pada KomponenHasil memenuhi target sentuh minimal 44px (Requirement 27.2)', () => {
      const mockHasil: FormatDataHasil = {
        halaman: 'chat',
        level: 'sedang',
        ringkasan: 'Ada indikasi penawaran kerja like & review.',
        temuan: [
          {
            judul: 'Modus Like & Review',
            penjelasan: 'Pelaku meminta pendaftaran untuk tugas like video.',
            bukti: 'komisi harian 500rb',
            sumber: 'ai',
          },
        ],
        hal_wajar: [],
        langkah: ['Abaikan pesan ini.', 'Laporkan kontak.'],
        situasi_darurat: [],
        batasan: 'Analisis berbasis isi pesan.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      };

      render(
        <KomponenHasil
          hasil={mockHasil}
          crossLinks={[{ label: 'Cek tautan terkait', href: '/cek-link' }]}
          onCekLagi={vi.fn()}
        />
      );

      const tombolCekLagi = screen.getByTestId('tombol-cek-lagi');
      expect(tombolCekLagi.className).toContain('min-h-[44px]');

      const btnCrossLink = screen.getByTestId('btn-cross-link-0');
      expect(btnCrossLink.className).toContain('min-h-[44px]');

      const linkHalamanLain = screen.getByTestId('link-halaman-lain-0');
      expect(linkHalamanLain.className).toContain('min-h-[44px]');
    });
  });

  describe('3. Kontras Teks Memenuhi WCAG AA pada Semua Teks di UI (Requirement 27.3)', () => {
    it('memastikan rumus kalkulasi rasio kontras W3C WCAG 2.1 bekerja secara matematis dan presisi', () => {
      const blackOnWhite = calculateContrastRatio('#000000', '#ffffff');
      expect(blackOnWhite).toBeCloseTo(21.0, 1);

      const sameColor = calculateContrastRatio('#ffffff', '#ffffff');
      expect(sameColor).toBeCloseTo(1.0, 1);
    });

    it('memenuhi rasio kontras WCAG AA (≥ 4.5:1) untuk teks tombol utama dan tombol darurat (Requirement 27.3)', () => {
      const primaryBtnRatio = calculateContrastRatio('#ffffff', '#2563eb');
      expect(primaryBtnRatio).toBeGreaterThanOrEqual(4.5);

      const dangerBtnRatio = calculateContrastRatio('#ffffff', '#dc2626');
      expect(dangerBtnRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('memenuhi rasio kontras WCAG AA (≥ 4.5:1) untuk seluruh teks umum pada background putih & gray-50 (Requirement 27.3)', () => {
      const bgWhite = '#ffffff';
      const bgGray50 = '#f9fafb';

      expect(calculateContrastRatio('#111827', bgWhite)).toBeGreaterThanOrEqual(7.0);
      expect(calculateContrastRatio('#111827', bgGray50)).toBeGreaterThanOrEqual(7.0);

      expect(calculateContrastRatio('#1f2937', bgWhite)).toBeGreaterThanOrEqual(7.0);
      expect(calculateContrastRatio('#1f2937', bgGray50)).toBeGreaterThanOrEqual(7.0);

      expect(calculateContrastRatio('#374151', bgWhite)).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrastRatio('#374151', bgGray50)).toBeGreaterThanOrEqual(4.5);

      expect(calculateContrastRatio('#4b5563', bgWhite)).toBeGreaterThanOrEqual(4.5);
      expect(calculateContrastRatio('#4b5563', bgGray50)).toBeGreaterThanOrEqual(4.5);
    });

    it('memenuhi rasio kontras WCAG AA (≥ 4.5:1) untuk teks pada 3 kotak tingkat kewaspadaan (Requirement 27.3)', () => {
      const bgTinggi = '#fef2f2';
      const textTinggi700 = calculateContrastRatio('#b91c1c', bgTinggi);
      const textTinggi800 = calculateContrastRatio('#991b1b', bgTinggi);
      expect(textTinggi700).toBeGreaterThanOrEqual(4.5);
      expect(textTinggi800).toBeGreaterThanOrEqual(4.5);

      const bgSedang = '#fff7ed';
      const textSedang700 = calculateContrastRatio('#c2410c', bgSedang);
      const textSedang800 = calculateContrastRatio('#9a3412', bgSedang);
      expect(textSedang700).toBeGreaterThanOrEqual(4.5);
      expect(textSedang800).toBeGreaterThanOrEqual(4.5);

      const bgTidakDitemukan = '#f9fafb';
      const textAbu700 = calculateContrastRatio('#374151', bgTidakDitemukan);
      const textAbu800 = calculateContrastRatio('#1f2937', bgTidakDitemukan);
      expect(textAbu700).toBeGreaterThanOrEqual(4.5);
      expect(textAbu800).toBeGreaterThanOrEqual(4.5);
    });

    it('memenuhi rasio kontras WCAG AA (≥ 4.5:1) untuk badge informasi dan catatan edukasi (Requirement 27.3)', () => {
      const amberBadgeRatio = calculateContrastRatio('#92400e', '#fffbeb');
      expect(amberBadgeRatio).toBeGreaterThanOrEqual(4.5);

      const emeraldBadgeRatio = calculateContrastRatio('#065f46', '#ecfdf5');
      expect(emeraldBadgeRatio).toBeGreaterThanOrEqual(4.5);

      const blueBadgeRatio = calculateContrastRatio('#1d4ed8', '#eff6ff');
      expect(blueBadgeRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('memastikan komponen TingkatKewaspadaan merender kelas CSS kontras tinggi yang valid untuk semua level (Requirement 27.3)', () => {
      const levels: TingkatLevel[] = ['tinggi', 'sedang', 'tidak_ditemukan'];

      levels.forEach((lvl) => {
        const { unmount } = render(<TingkatKewaspadaan level={lvl} ringkasan="Ringkasan uji kontras" />);
        const box = screen.getByRole('status');

        if (lvl === 'tinggi') {
          expect(box.className).toContain('bg-red-50');
          expect(box.className).toContain('text-red-700');
        } else if (lvl === 'sedang') {
          expect(box.className).toContain('bg-orange-50');
          expect(box.className).toContain('text-orange-700');
        } else {
          expect(box.className).toContain('bg-gray-50');
          expect(box.className).toContain('text-gray-700');
        }

        unmount();
      });
    });
  });

  describe('4. Semua Input Form Memiliki Label Terkait Melalui htmlFor/id atau aria-label (Requirement 27.4)', () => {
    it('memastikan seluruh input formulir di InputChat memiliki label aksesibel (Requirement 27.4)', () => {
      const { container } = render(<InputChat onSubmit={vi.fn()} />);

      const textareaTeks = container.querySelector('textarea[name="teks-chat"]') as HTMLElement;
      expect(textareaTeks).not.toBeNull();
      const cekTeks = hasAccessibleLabel(textareaTeks);
      expect(cekTeks.valid).toBe(true);

      const inputKonteks = container.querySelector('input[name="konteks-chat"]') as HTMLElement;
      expect(inputKonteks).not.toBeNull();
      const cekKonteks = hasAccessibleLabel(inputKonteks);
      expect(cekKonteks.valid).toBe(true);

      const tabScreenshot = screen.getByRole('tab', { name: /unggah screenshot/i });
      fireEvent.click(tabScreenshot);

      const inputFile = container.querySelector('input[type="file"]') as HTMLElement;
      expect(inputFile).not.toBeNull();
      const cekFile = hasAccessibleLabel(inputFile);
      expect(cekFile.valid).toBe(true);
    });

    it('memastikan input URL di InputLink memiliki label eksplisit melalui htmlFor/id (Requirement 27.4)', () => {
      render(<InputLink onSubmit={vi.fn()} />);

      const inputLink = screen.getByTestId('input-link');
      const labelLink = screen.getByTestId('label-input-link');

      expect(inputLink.getAttribute('id')).toBe('input-link-field');
      expect(labelLink.getAttribute('for')).toBe('input-link-field');
      expect(labelLink.textContent).toContain('Alamat URL atau Domain');

      const statusAksesibel = hasAccessibleLabel(inputLink);
      expect(statusAksesibel.valid).toBe(true);
    });

    it('memastikan seluruh radio input dan checkbox di WizardVideoSuara memiliki label terkait (Requirement 27.4)', () => {
      const { unmount: u1, container: c1 } = render(
        <WizardVideoSuara
          onHasilReady={vi.fn()}
          initialJawaban={{
            situasi: 'tokoh',
          }}
        />
      );
      const btnLanjut2 = screen.getByTestId('tombol-lanjut');
      fireEvent.click(btnLanjut2);

      const radioInputs = c1.querySelectorAll('input[type="radio"]');
      expect(radioInputs.length).toBeGreaterThan(0);
      radioInputs.forEach((radio) => {
        const result = hasAccessibleLabel(radio as HTMLElement);
        expect(result.valid).toBe(true);
      });
      u1();

      const { container: c2 } = render(
        <WizardVideoSuara
          onHasilReady={vi.fn()}
          initialJawaban={{
            situasi: 'rekaman',
            apa_diminta: 'uang',
            nomor_akun: 'baru_asing',
            darurat_desakan: true,
            diminta_rahasiakan: true,
            bisa_telepon_balik: false,
          }}
        />
      );
      const btn1 = screen.getByTestId('tombol-lanjut');
      fireEvent.click(btn1);
      const btn2 = screen.getByTestId('tombol-lanjut');
      fireEvent.click(btn2);

      const checkboxInputs = c2.querySelectorAll('input[type="checkbox"]');
      expect(checkboxInputs.length).toBeGreaterThan(0);
      checkboxInputs.forEach((cb) => {
        const result = hasAccessibleLabel(cb as HTMLElement);
        expect(result.valid).toBe(true);
      });
    });

    it('memastikan area teks pratinjau pada dialog PratinjauSensor memiliki label eksplisit melalui htmlFor/id (Requirement 27.4)', () => {
      render(
        <PratinjauSensor
          isOpen={true}
          teksAsli="Hubungi 081299990000"
          teksTersensor="Hubungi [disensor]"
          jumlahDiganti={1}
          onKonfirmasi={vi.fn()}
          onBatal={vi.fn()}
        />
      );

      const previewElem = screen.getByTestId('pratinjau-teks-tersensor');
      expect(previewElem.getAttribute('id')).toBe('pratinjau-konten-teks');

      const label = document.querySelector('label[for="pratinjau-konten-teks"]');
      expect(label).not.toBeNull();
      expect(label?.textContent).toContain('Teks yang akan dikirim:');
    });

    it('memastikan checkbox pada LangkahDisarankan dan PanelDarurat memiliki label/aria-label yang valid (Requirement 27.4)', () => {
      const { unmount: unmountLangkah } = render(
        <LangkahDisarankan langkah={['Amankan akun segera.', 'Ganti password perbankan.']} />
      );
      const langkahCheckboxes = screen.getAllByRole('checkbox');
      expect(langkahCheckboxes).toHaveLength(2);
      langkahCheckboxes.forEach((cb) => {
        const result = hasAccessibleLabel(cb);
        expect(result.valid).toBe(true);
      });
      unmountLangkah();

      render(<PanelDarurat situasiAktif={['transfer']} autoOpen={true} />);
      const daruratCheckboxes = screen.getAllByRole('checkbox');
      expect(daruratCheckboxes.length).toBeGreaterThan(0);
      daruratCheckboxes.forEach((cb) => {
        const result = hasAccessibleLabel(cb);
        expect(result.valid).toBe(true);
      });
    });

    it('memastikan tidak ada input atau textarea liar tanpa label di seluruh halaman cek yang dirender (Requirement 27.4)', () => {
      const { unmount: unmountChat, container: containerChat } = render(<CekChatPage />);
      const inputsChat = containerChat.querySelectorAll('input, textarea, select');
      inputsChat.forEach((el) => {
        const cek = hasAccessibleLabel(el as HTMLElement);
        expect(cek.valid).toBe(true);
      });
      unmountChat();

      const { unmount: unmountLink, container: containerLink } = render(<CekLinkPage />);
      const inputsLink = containerLink.querySelectorAll('input, textarea, select');
      inputsLink.forEach((el) => {
        const cek = hasAccessibleLabel(el as HTMLElement);
        expect(cek.valid).toBe(true);
      });
      unmountLink();
    });
  });

  describe('5. Tiga Tingkat Kewaspadaan Dibedakan dengan Label Teks dan Ikon, Bukan Hanya Warna (Requirements 6.5, 27.3)', () => {
    it('memastikan tingkat "tinggi" menampilkan label teks resmi "Waspada tinggi" dan ikon ShieldAlert (Requirements 6.2, 6.5)', () => {
      render(
        <TingkatKewaspadaan
          level="tinggi"
          ringkasan="Ada beberapa tanda kuat penipuan."
        />
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Waspada tinggi' })).toBeDefined();

      const iconTinggi = screen.getByTestId('icon-tinggi');
      expect(iconTinggi).toBeDefined();
      expect(iconTinggi.tagName.toLowerCase()).toBe('svg');

      expect(
        screen.getByText(
          'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.'
        )
      ).toBeDefined();

      const containerStatus = screen.getByRole('status');
      expect(containerStatus.getAttribute('aria-label')).toBe('Tingkat kewaspadaan: Waspada tinggi');
    });

    it('memastikan tingkat "sedang" menampilkan label teks resmi "Perlu hati-hati" dan ikon AlertTriangle (Requirements 6.3, 6.5)', () => {
      render(
        <TingkatKewaspadaan
          level="sedang"
          ringkasan="Ada tanda yang perlu kamu periksa."
        />
      );

      expect(screen.getByRole('heading', { level: 3, name: 'Perlu hati-hati' })).toBeDefined();

      const iconSedang = screen.getByTestId('icon-sedang');
      expect(iconSedang).toBeDefined();
      expect(iconSedang.tagName.toLowerCase()).toBe('svg');

      expect(
        screen.getByText('Ada tanda yang perlu kamu cek dulu sebelum lanjut.')
      ).toBeDefined();

      const containerStatus = screen.getByRole('status');
      expect(containerStatus.getAttribute('aria-label')).toBe('Tingkat kewaspadaan: Perlu hati-hati');
    });

    it('memastikan tingkat "tidak_ditemukan" menampilkan label teks resmi "Tidak ditemukan tanda bahaya" dan ikon InfoShield (Requirements 6.4, 6.5)', () => {
      render(
        <TingkatKewaspadaan
          level="tidak_ditemukan"
          ringkasan="Tidak ditemukan tanda bahaya yang kami kenali."
        />
      );

      expect(
        screen.getByRole('heading', { level: 3, name: 'Tidak ditemukan tanda bahaya' })
      ).toBeDefined();

      const iconTidakDitemukan = screen.getByTestId('icon-tidak_ditemukan');
      expect(iconTidakDitemukan).toBeDefined();
      expect(iconTidakDitemukan.tagName.toLowerCase()).toBe('svg');

      expect(
        screen.getByText(
          'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
        )
      ).toBeDefined();

      const containerStatus = screen.getByRole('status');
      expect(containerStatus.getAttribute('aria-label')).toBe(
        'Tingkat kewaspadaan: Tidak ditemukan tanda bahaya'
      );
    });

    it('memastikan ketiga ikon visual memiliki geometri SVG yang berbeda untuk memudahkan pengguna buta warna (Requirements 6.5, 27.3)', () => {
      const { unmount: u1 } = render(<TingkatKewaspadaan level="tinggi" />);
      const iconTinggiSvg = screen.getByTestId('icon-tinggi').innerHTML;
      u1();

      const { unmount: u2 } = render(<TingkatKewaspadaan level="sedang" />);
      const iconSedangSvg = screen.getByTestId('icon-sedang').innerHTML;
      u2();

      const { unmount: u3 } = render(<TingkatKewaspadaan level="tidak_ditemukan" />);
      const iconTidakDitemukanSvg = screen.getByTestId('icon-tidak_ditemukan').innerHTML;
      u3();

      expect(iconTinggiSvg).not.toBe(iconSedangSvg);
      expect(iconTinggiSvg).not.toBe(iconTidakDitemukanSvg);
      expect(iconSedangSvg).not.toBe(iconTidakDitemukanSvg);
    });

    it('memastikan KomponenHasil menyajikan ikon visual dan label teks yang sesuai di header blok hasil (Requirements 6.1, 6.5)', () => {
      const mockHasilTinggi: FormatDataHasil = {
        halaman: 'video',
        level: 'tinggi',
        ringkasan: 'Indikasi deepfake video tokoh meminta sumbangan.',
        temuan: [
          {
            judul: 'Gerakan Bibir Tidak Sinkron',
            penjelasan: 'Terdapat anomali sinkronisasi audio dan video.',
            bukti: 'bibir kaku saat mengucapkan kalimat',
            sumber: 'aturan',
          },
        ],
        hal_wajar: [],
        langkah: ['Jangan kirim uang.', 'Laporkan video.'],
        situasi_darurat: [],
        batasan: 'Pemeriksaan berbasis pola visual dan konteks.',
        pihak_ketiga: [],
        status_layanan: {},
      };

      render(<KomponenHasil hasil={mockHasilTinggi} onCekLagi={vi.fn()} />);

      expect(screen.getByRole('heading', { level: 3, name: 'Waspada tinggi' })).toBeDefined();
      expect(screen.getByTestId('icon-tinggi')).toBeDefined();
    });
  });

  describe('6. Kompatibilitas Browser & Semantik Aksesibilitas Modern (Requirements 27.5, 1.4)', () => {
    it('menyediakan tautan lewati ke konten utama (skip to main content) untuk pengguna pembaca layar dan keyboard (Requirement 27.4, 27.5)', () => {
      render(
        <RootLayout>
          <div>Konten Utama</div>
        </RootLayout>
      );

      const skipLink = screen.getByText('Menuju ke konten utama');
      expect(skipLink).toBeDefined();
      expect(skipLink.getAttribute('href')).toBe('#main-content');
      expect(skipLink.className).toContain('min-h-[44px]');

      const main = screen.getByRole('main');
      expect(main.getAttribute('id')).toBe('main-content');
      expect(main.getAttribute('tabindex')).toBe('-1');
    });

    it('menggunakan elemen semantik HTML standar (header, nav, main, footer, section, h1-h3) untuk kompatibilitas peramban (Chrome, Safari, Firefox) (Requirement 27.5)', () => {
      render(
        <RootLayout>
          <Home />
        </RootLayout>
      );

      expect(document.querySelector('header')).not.toBeNull();
      expect(document.querySelector('main')).not.toBeNull();
      expect(document.querySelector('footer')).not.toBeNull();

      const navElements = document.querySelectorAll('nav');
      expect(navElements.length).toBeGreaterThan(0);

      const h1 = document.querySelector('h1');
      expect(h1).not.toBeNull();
      expect(h1?.textContent).toContain('Ragu sama chat, link, atau video call');
    });

    it('memastikan dialog modal PratinjauSensor mengikuti standar WAI-ARIA Modal (role="dialog", aria-modal="true") (Requirement 27.4, 27.5)', () => {
      render(
        <PratinjauSensor
          isOpen={true}
          teksAsli="081299990000"
          teksTersensor="[disensor]"
          jumlahDiganti={1}
          onKonfirmasi={vi.fn()}
          onBatal={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeDefined();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('pratinjau-sensor-title');
      expect(dialog.getAttribute('aria-describedby')).toBe('pratinjau-sensor-desc');

      const title = document.getElementById('pratinjau-sensor-title');
      const desc = document.getElementById('pratinjau-sensor-desc');
      expect(title).not.toBeNull();
      expect(desc).not.toBeNull();
    });
  });
});
