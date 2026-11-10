// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import fs from 'node:fs';

import CekChatPage from '@/app/cek-chat/page';
import CekLinkPage from '@/app/cek-link/page';
import CekVideoSuaraPage from '@/app/cek-video-suara/page';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import RootLayout, { metadata } from '@/app/layout';
import { KotakPrivasi } from '@/components/shared/KotakPrivasi';

import { POST as postCekChat } from '@/app/api/cek-chat/route';
import { POST as postCekLink } from '@/app/api/cek-link/route';

import { analyzeChat, explainLink } from '@/lib/gemini';
import { checkSafeBrowsing } from '@/lib/safe-browsing';
import { queryDomainAge } from '@/lib/rdap';
import { sensorTeks } from '@/lib/sensor';
import { parseUrl, sanitasiParams } from '@/lib/sanitasi-url';
import packageJson from '@/package.json';
import type { FormatDataHasil } from '@/lib/hasil';

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    analyzeChat: vi.fn(),
    explainLink: vi.fn(),
  };
});

vi.mock('@/lib/safe-browsing', () => ({
  checkSafeBrowsing: vi.fn(),
}));

vi.mock('@/lib/rdap', () => ({
  queryDomainAge: vi.fn(),
}));

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

describe('Pengujian Privasi dan Pengelolaan Data — Task 15.7 (Requirements 12.1, 12.4, 25.4, 31.1, 31.2, 31.3, 31.4)', () => {
  const originalFetch = global.fetch;

  const sampleJpgBase64 =
    'data:image/jpeg;base64,' +
    Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]).toString('base64');

  const mockHasilChatSukses: FormatDataHasil = {
    halaman: 'chat',
    level: 'sedang',
    ringkasan: 'Hasil pemeriksaan AI: Ada indikasi penawaran yang perlu kamu waspadai.',
    temuan: [
      {
        judul: 'Pola permintaan transfer atau deposit',
        penjelasan: 'Pesan meminta transfer ke pihak ketiga.',
        bukti: 'transfer deposit ke nomor rekening',
        sumber: 'ai',
      },
    ],
    hal_wajar: ['Bahasa pesan sopan'],
    langkah: [
      'Jangan mentransfer uang atau membagikan data apa pun.',
      'Verifikasi identitas pengirim melalui kontak resmi.',
    ],
    situasi_darurat: ['transfer'],
    batasan: 'Analisis berbasis isi pesan yang dikirimkan.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: { ai: 'ok' },
  };

  const mockHasilLinkSukses: FormatDataHasil = {
    halaman: 'link',
    level: 'tinggi',
    ringkasan: 'Hasil pemeriksaan link: Tautan ini memiliki beberapa indikasi mencurigakan.',
    temuan: [
      {
        judul: 'Nama merek pada subdomain asing',
        penjelasan: 'Link meniru merek resmi pada domain yang tidak terafiliasi.',
        bukti: 'bca-klik-promo.xyz',
        sumber: 'aturan',
      },
    ],
    hal_wajar: [],
    langkah: [
      'Jangan membuka atau memasukkan kredensial apa pun pada link ini.',
      'Gunakan alamat resmi yang tersimpan di bookmark peramban kamu.',
    ],
    situasi_darurat: ['klik_link'],
    batasan: 'Pemeriksaan berbasis pola leksikal dan reputasi domain.',
    pihak_ketiga: ['Google Safe Browsing', 'RDAP', 'Google Gemini'],
    status_layanan: {
      safe_browsing: 'ok',
      rdap: 'ok',
      ai: 'ok',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    vi.mocked(analyzeChat).mockResolvedValue(mockHasilChatSukses);
    vi.mocked(checkSafeBrowsing).mockResolvedValue({
      ditemukan: false,
      ancaman: [],
      status: 'ok',
      keterangan: 'Tidak ada ancaman terdeteksi',
    });
    vi.mocked(queryDomainAge).mockResolvedValue({
      tersedia: true,
      umurHari: 120,
      status: 'ok',
      keterangan: 'Domain terdaftar 120 hari lalu',
    });
    vi.mocked(explainLink).mockResolvedValue(mockHasilLinkSukses);

    const validJpgBuffer = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    if (typeof HTMLCanvasElement.prototype.toBlob !== 'function') {
      HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback, type) {
        callback(new Blob([validJpgBuffer], { type: type || 'image/jpeg' }));
      });
    } else {
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
        callback,
        type
      ) {
        callback(new Blob([validJpgBuffer], { type: type || 'image/jpeg' }));
      });
    }

    if (typeof HTMLCanvasElement.prototype.getContext !== 'function') {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      });
    } else {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        fillStyle: '',
        fillRect: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as RenderingContext);
    }

    if (typeof window.createImageBitmap !== 'function') {
      window.createImageBitmap = vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        close: vi.fn(),
      });
    } else {
      vi.spyOn(window, 'createImageBitmap').mockResolvedValue({
        width: 800,
        height: 600,
        close: vi.fn(),
      } as unknown as ImageBitmap);
    }

    if (typeof window.URL.createObjectURL !== 'function') {
      window.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    } else {
      vi.spyOn(window.URL, 'createObjectURL').mockImplementation(
        () => 'blob:mock-preview-url'
      );
    }
    if (typeof window.URL.revokeObjectURL !== 'function') {
      window.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    }

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (urlStr === '/api/cek-chat' || urlStr.endsWith('/api/cek-chat')) {
        const req = new Request('http://localhost:3000/api/cek-chat', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await postCekChat(req);
      }

      if (urlStr === '/api/cek-link' || urlStr.endsWith('/api/cek-link')) {
        const req = new Request('http://localhost:3000/api/cek-link', {
          method: init?.method || 'POST',
          headers: init?.headers,
          body: init?.body,
        });
        return await postCekLink(req);
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('1. Pastikan Tidak Ada Penyimpanan Input Pengguna Setelah Sesi (Requirements 31.1, 31.3)', () => {
    it('Cek Chat: tidak pernah menyimpan teks atau screenshot pengguna ke localStorage atau cookie permanen', async () => {
      render(<CekChatPage />);

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, {
        target: {
          value:
            'Tolong transfer uang ke rekening 123456789012 dan hubungi nomor 081234567890.',
        },
      });

      const btnPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(btnPeriksa);

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });
      const btnKirim = screen.getByTestId('btn-lanjut-periksa');
      fireEvent.click(btnKirim);

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      const btnCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(btnCekLagi);

      const textareaAfter = screen.getByRole('textbox', { name: /teks percakapan chat/i }) as HTMLTextAreaElement;
      expect(textareaAfter.value).toBe('');

      expect(localStorage.length).toBe(0);
      expect(localStorage.getItem('input_chat')).toBeNull();
      expect(localStorage.getItem('teks_chat')).toBeNull();
      expect(localStorage.getItem('hasil_chat')).toBeNull();

      expect(document.cookie).not.toContain('123456789012');
      expect(document.cookie).not.toContain('081234567890');
    });

    it('Cek Link: tidak pernah menyimpan URL pengguna ke localStorage atau cookie permanen', async () => {
      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link');
      fireEvent.change(input, {
        target: { value: 'https://bca-klaim-hadiah-palsu.net/verifikasi' },
      });

      const btnPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(btnPeriksa);

      await waitFor(() => {
        expect(screen.getByTestId('komponen-hasil')).toBeDefined();
      });

      const btnCekLagi = screen.getByTestId('tombol-cek-lagi');
      fireEvent.click(btnCekLagi);

      const inputAfter = screen.getByTestId('input-link') as HTMLInputElement;
      expect(inputAfter.value).toBe('');

      expect(localStorage.length).toBe(0);
      expect(localStorage.getItem('input_url')).toBeNull();
      expect(localStorage.getItem('hasil_link')).toBeNull();

      expect(document.cookie).not.toContain('bca-klaim-hadiah-palsu');
    });

    it('Cek Video & Suara: tidak pernah menyimpan jawaban wizard ke localStorage atau cookie permanen', () => {
      render(<CekVideoSuaraPage />);
      fireEvent.click(screen.getByTestId('tab-mode-kuis'));

      fireEvent.click(screen.getByTestId('kartu-situasi-video_call'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('opsi-apa_diminta-otp_pin'));
      fireEvent.click(screen.getByTestId('opsi-nomor_akun-nomor_baru'));
      fireEvent.click(screen.getByTestId('opsi-darurat-true'));
      fireEvent.click(screen.getByTestId('opsi-rahasiakan-true'));
      fireEvent.click(screen.getByTestId('opsi-telepon_balik-false'));
      fireEvent.click(screen.getByTestId('opsi-masih_tersambung-false'));
      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      fireEvent.click(screen.getByTestId('tombol-lanjut'));

      expect(screen.getByTestId('komponen-hasil')).toBeDefined();

      fireEvent.click(screen.getByTestId('tombol-cek-lagi'));

      expect(screen.queryByTestId('komponen-hasil')).toBeNull();
      const indikator = screen.getByTestId('indikator-langkah');
      expect(indikator.textContent).toContain('Langkah 1 dari 4');

      expect(localStorage.length).toBe(0);
      expect(document.cookie).toBe('');
    });

    it('Pembersihan data cross-link sessionStorage saat dibaca (Requirement 34.2)', () => {
      const urlSementara = 'https://undian-berhadiah-palsu.xyz/klaim';
      sessionStorage.setItem('url_dari_chat', urlSementara);

      expect(sessionStorage.getItem('url_dari_chat')).toBe(urlSementara);

      render(<CekLinkPage />);

      const input = screen.getByTestId('input-link') as HTMLInputElement;
      expect(input.value).toBe(urlSementara);

      expect(sessionStorage.getItem('url_dari_chat')).toBeNull();
    });

    it('Arsitektur Statis: memastikan tidak ada dependensi database pengguna atau ORM di package.json', () => {
      const dbPackages = [
        'prisma',
        '@prisma/client',
        'mongoose',
        'typeorm',
        'sequelize',
        'pg',
        'mysql',
        'mysql2',
        'sqlite3',
        'better-sqlite3',
      ];

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      for (const dbPkg of dbPackages) {
        expect(allDeps).not.toHaveProperty(dbPkg);
      }
    });
  });

  describe('2. Pembuangan File Gambar Screenshot di Server (Requirement 31.2)', () => {
    it('Route Handler POST /api/cek-chat tidak pernah menulis file gambar ke filesystem server', async () => {
      const writeFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') callback(null);
      });
      const promisesWriteFileSpy = vi
        .spyOn(fs.promises, 'writeFile')
        .mockResolvedValue(undefined);
      const createWriteStreamSpy = vi.spyOn(fs, 'createWriteStream').mockImplementation(
        () => ({ write: vi.fn(), end: vi.fn(), on: vi.fn() } as any)
      );

      const request = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'screenshot',
          gambar: [sampleJpgBase64],
          konteks: 'Pesan dari kontak tidak dikenal',
        }),
      });

      const response = await postCekChat(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.level).toBeDefined();

      expect(writeFileSyncSpy).not.toHaveBeenCalled();
      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(promisesWriteFileSpy).not.toHaveBeenCalled();
      expect(createWriteStreamSpy).not.toHaveBeenCalled();
    });

    it('Data gambar bersifat ephemeral dalam lifecycle request dan tidak disimpan di variabel global server', async () => {
      const req1 = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'screenshot',
          gambar: [sampleJpgBase64],
          konteks: 'Request pertama dengan screenshot',
        }),
      });
      const res1 = await postCekChat(req1);
      expect(res1.status).toBe(200);

      const req2 = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'teks',
          teks: 'Permintaan kode OTP akun bank kamu',
        }),
      });
      const res2 = await postCekChat(req2);
      expect(res2.status).toBe(200);

      const res2Json = await res2.json();
      expect(res2Json.halaman).toBe('chat');
      expect(JSON.stringify(res2Json)).not.toContain(sampleJpgBase64);
    });
  });

  describe('3. Tidak Ada Fitur Login, Autentikasi, Akun, atau Riwayat Permanen (Requirement 31.3)', () => {
    it('Header dan Footer bersama tidak memuat tautan atau tombol login, daftar, akun, atau riwayat', () => {
      const { unmount: unmountHeader, container: headerContainer } = render(<Header />);

      const headerAuthLinks = headerContainer.querySelectorAll(
        'a[href*="login"], a[href*="signin"], a[href*="register"], a[href*="auth"], a[href*="account"]'
      );
      expect(headerAuthLinks.length).toBe(0);
      expect(screen.queryByRole('button', { name: /^login$|^masuk$|^daftar$|^register$/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /^login$|^masuk$|^daftar$|^register$/i })).toBeNull();

      unmountHeader();

      const { unmount: unmountFooter, container: footerContainer } = render(<Footer />);

      const footerAuthLinks = footerContainer.querySelectorAll(
        'a[href*="login"], a[href*="signin"], a[href*="register"], a[href*="auth"], a[href*="account"]'
      );
      expect(footerAuthLinks.length).toBe(0);
      expect(screen.queryByRole('button', { name: /^login$|^masuk$|^daftar$|^register$/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /^login$|^masuk$|^daftar$|^register$/i })).toBeNull();

      expect(footerContainer.textContent).toContain('Tanpa login');
      expect(footerContainer.textContent).toContain('Data input tidak disimpan di server');

      unmountFooter();
    });

    it('RootLayout tidak membungkus aplikasi dengan AuthProvider, SessionProvider, atau login gate', () => {
      render(
        <RootLayout>
          <div data-testid="konten-uji">Halaman Tanpa Login</div>
        </RootLayout>
      );

      expect(screen.getByTestId('konten-uji')).toBeDefined();
      expect(screen.getByText('Halaman Tanpa Login')).toBeDefined();

      expect(screen.queryByText(/silakan login/i)).toBeNull();
      expect(screen.queryByText(/masuk ke akun/i)).toBeNull();
    });

    it('KotakPrivasi pada ketiga halaman secara konsisten menampilkan jaminan privasi tanpa login', () => {
      const halamanList: Array<'chat' | 'link' | 'video'> = ['chat', 'link', 'video'];

      for (const halaman of halamanList) {
        const { unmount } = render(<KotakPrivasi halaman={halaman} />);

        const jaminanEl = screen.getByTestId('jaminan-privasi');
        expect(jaminanEl.textContent).toContain(
          'Tanpa login, input tidak disimpan setelah sesi selesai.'
        );

        unmount();
      }
    });

    it('Response Route Handler tidak pernah menyetel cookie autentikasi / session (Set-Cookie)', async () => {
      const reqChat = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'teks',
          teks: 'Pesan mencurigakan tawaran kerja',
        }),
      });
      const resChat = await postCekChat(reqChat);
      expect(resChat.headers.get('set-cookie')).toBeNull();

      const reqLink = new Request('http://localhost:3000/api/cek-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://undian-palsu.com',
        }),
      });
      const resLink = await postCekLink(reqLink);
      expect(resLink.headers.get('set-cookie')).toBeNull();
    });
  });

  describe('4. Tidak Ada Pelacakan Analitik yang Mengidentifikasi Pengguna Secara Individual (Requirement 31.4)', () => {
    it('RootLayout dan Metadata tidak memuat script analitik pelacak identitas pengguna (Google Analytics, Mixpanel, PostHog, Pixel)', () => {
      const { container } = render(
        <RootLayout>
          <div data-testid="app-content">Konten Aplikasi</div>
        </RootLayout>
      );

      const scripts = container.querySelectorAll('script');
      for (const s of scripts) {
        const src = s.getAttribute('src') || '';
        const innerContent = s.innerHTML || '';
        expect(src).not.toContain('google-analytics.com');
        expect(src).not.toContain('googletagmanager.com');
        expect(src).not.toContain('mixpanel');
        expect(src).not.toContain('posthog');
        expect(src).not.toContain('hotjar');
        expect(src).not.toContain('connect.facebook.net');
        expect(innerContent).not.toContain('gtag');
        expect(innerContent).not.toContain('fbq');
        expect(innerContent).not.toContain('mixpanel');
      }

      expect(metadata.description).toContain('tanpa perlu login');
    });

    it('Rate Limiting di backend menggunakan isolasi berbasis IP anonim tanpa pengidentifikasi pribadi', async () => {
      const rateLimitModule = await import('@/lib/rate-limit');
      expect(typeof rateLimitModule.checkRateLimit).toBe('function');
      expect(rateLimitModule.RATE_LIMIT_PER_MINUTE).toBe(10);
      expect(rateLimitModule.RATE_LIMIT_PER_DAY).toBe(100);

      const result = await rateLimitModule.checkRateLimit('192.168.1.100', 'chat');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result.success).toBe(true);
    });
  });

  describe('5. Sensor Otomatis di Browser Mengganti Data Sensitif Sebelum Dikirim ke Backend (Requirements 12.1, 12.4)', () => {
    it('sensorTeks: mendeteksi dan mengganti seluruh pola nomor HP, rekening, email, dan deretan angka dengan [disensor]', () => {
      const teksInput =
        'Tolong transfer ke rekening 1234567890123456, hubungi HP 081234567890 atau +628198765432, email ke korban@gmail.com, kode OTP 987654.';

      const { hasil, jumlahDiganti } = sensorTeks(teksInput);

      expect(hasil).not.toContain('1234567890123456');
      expect(hasil).not.toContain('081234567890');
      expect(hasil).not.toContain('+628198765432');
      expect(hasil).not.toContain('korban@gmail.com');
      expect(hasil).not.toContain('987654');

      expect(hasil).toContain('Tolong transfer ke rekening [disensor]');
      expect(hasil).toContain('hubungi HP [disensor]');
      expect(hasil).toContain('email ke [disensor]');
      expect(hasil).toContain('kode OTP [disensor]');

      expect(jumlahDiganti).toBe(5);
    });

    it('Cek Chat: payload yang dikirim ke endpoint /api/cek-chat HANYA memuat teks yang telah disensor', async () => {
      let interceptedPayload: any = null;

      global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : input.toString();
        if (urlStr === '/api/cek-chat' || urlStr.endsWith('/api/cek-chat')) {
          interceptedPayload = JSON.parse(init?.body as string);
          return new Response(JSON.stringify(mockHasilChatSukses), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('Not Found', { status: 404 });
      });

      render(<CekChatPage />);

      const rawSensitiveText =
        'Halo kak, silakan setor ke rekening BCA 5412345678901234 dan konfirmasi ke HP 081299887766 atau email admin@promo.id.';

      const textarea = screen.getByRole('textbox', { name: /teks percakapan chat/i });
      fireEvent.change(textarea, { target: { value: rawSensitiveText } });

      const btnPeriksa = screen.getByTestId('tombol-periksa');
      fireEvent.click(btnPeriksa);

      await waitFor(() => {
        expect(screen.getByTestId('modal-pratinjau-dialog')).toBeDefined();
      });

      const btnKirim = screen.getByTestId('btn-lanjut-periksa');
      fireEvent.click(btnKirim);

      await waitFor(() => {
        expect(interceptedPayload).not.toBeNull();
      });

      expect(interceptedPayload.teks).not.toContain('5412345678901234');
      expect(interceptedPayload.teks).not.toContain('081299887766');
      expect(interceptedPayload.teks).not.toContain('admin@promo.id');

      expect(interceptedPayload.teks).toContain('[disensor]');
      expect(interceptedPayload.mode).toBe('teks');
    });

    it('Cek Link: sanitasiParams membuang parameter sensitif (token, password, email, otp) dari URL', () => {
      const rawUrl =
        'https://promo-undian.com/klaim?token=secretToken123&password=supersecret&email=korban@example.com&otp=123456&ref=whatsapp_group';

      const parsed = parseUrl(rawUrl);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ ref: 'whatsapp_group' });

      expect(sanitized.urlBersih).toContain('ref=whatsapp_group');
      expect(sanitized.urlBersih).not.toContain('secretToken123');
      expect(sanitized.urlBersih).not.toContain('supersecret');
      expect(sanitized.urlBersih).not.toContain('korban@example.com');
      expect(sanitized.urlBersih).not.toContain('123456');
    });
  });

  describe('6. Console Logging Backend Tidak Mencatat Data Sensitif Pengguna (Requirement 25.4)', () => {
    it('POST /api/cek-chat: tidak mencatat teks pesan chat, rekening, nomor HP, email, atau password di log', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sensitiveConversation =
        'Transfer sekarang ke rekening 9876543210123456 atas nama Penipu, kontak 081234567899, email target@scam.org, password rahasia_banget_123';

      const reqSukses = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'teks',
          teks: sensitiveConversation,
        }),
      });
      const resSukses = await postCekChat(reqSukses);
      expect(resSukses.status).toBe(200);

      const reqError = new Request('http://localhost:3000/api/cek-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'mode_tidak_valid',
          teks: sensitiveConversation,
        }),
      });
      const resError = await postCekChat(reqError);
      expect(resError.status).toBe(400);

      const allLogOutputs = [
        ...logSpy.mock.calls.flat(),
        ...warnSpy.mock.calls.flat(),
        ...errorSpy.mock.calls.flat(),
      ].map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)));

      for (const logMsg of allLogOutputs) {
        expect(logMsg).not.toContain('9876543210123456');
        expect(logMsg).not.toContain('081234567899');
        expect(logMsg).not.toContain('target@scam.org');
        expect(logMsg).not.toContain('rahasia_banget_123');
        expect(logMsg).not.toContain('Transfer sekarang ke rekening');
      }

      const logGabungan = allLogOutputs.join(' ');
      expect(logGabungan).toContain('status=');
      expect(logGabungan).toContain('durasi=');
    });

    it('POST /api/cek-link: tidak mencatat URL lengkap dengan parameter sensitif di console log', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const sensitiveUrl =
        'https://bank-palsu-promo.com/login?token=super_secret_token_999&email=korban_scam@gmail.com&rekening=554433221100';

      const request = new Request('http://localhost:3000/api/cek-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sensitiveUrl,
        }),
      });

      const response = await postCekLink(request);
      expect(response.status).toBe(200);

      const allLogOutputs = [
        ...logSpy.mock.calls.flat(),
        ...warnSpy.mock.calls.flat(),
        ...errorSpy.mock.calls.flat(),
      ].map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)));

      for (const logMsg of allLogOutputs) {
        expect(logMsg).not.toContain('super_secret_token_999');
        expect(logMsg).not.toContain('korban_scam@gmail.com');
        expect(logMsg).not.toContain('554433221100');
      }

      const logGabungan = allLogOutputs.join(' ');
      expect(logGabungan).toContain('POST /api/cek-link');
      expect(logGabungan).toContain('status');
    });
  });
});
