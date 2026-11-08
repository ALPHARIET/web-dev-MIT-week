// @vitest-environment jsdom
/**
 * test/integration/audit-kata-terlarang.test.ts
 *
 * Audit komprehensif kepatuhan larangan kata terlarang di seluruh proyek:
 * - Kata terlarang: "aman", "pasti", "terbukti", "100%"
 * - Memindai seluruh direktori `app/`, `components/`, `lib/`, `data/`
 * - Memastikan tidak ada penggunaan kata-kata tersebut sebagai KESIMPULAN, vonis, atau janji hasil pasti
 * - Memastikan penggunaan dalam konteks edukatif negasi tetap dipertahankan
 *   (misal: "Ini tidak berarti pasti aman", "bukan jaminan aman", "belum tentu aman")
 *
 * References: Requirements 2.4, 6.7, 30.1, 30.2, 30.3, 30.4
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Import komponen UI
import Home from '@/app/page';
import { KomponenHasil } from '@/components/hasil/KomponenHasil';
import { KotakPrivasi } from '@/components/shared/KotakPrivasi';
import LangkahDisarankan, { FALLBACK_LANGKAH } from '@/components/hasil/LangkahDisarankan';
import { TingkatKewaspadaan } from '@/components/hasil/TingkatKewaspadaan';
import { PanelDarurat } from '@/components/hasil/PanelDarurat';
import { TombolContoh } from '@/components/input/TombolContoh';
import Footer from '@/components/layout/Footer';

// Import data & rules
import {
  KATA_TERLARANG,
  CHAT_SYSTEM_PROMPT,
  LINK_EXPLANATION_SYSTEM_PROMPT,
  TANYA_SYSTEM_PROMPT,
} from '@/data/system-prompt';
import { filterKataTerlarang, filterFormatDataHasil } from '@/lib/gemini';
import { generateHasilChatLokal } from '@/lib/aturan/chat-rules';
import { generateHasilLinkLokal } from '@/lib/aturan/link-rules';
import { generateHasilVideoLokal } from '@/lib/aturan/video-rules';
import type { FormatDataHasil } from '@/lib/hasil';

/**
 * Daftar konteks negasi / edukatif yang diizinkan sesuai Requirement 6.4, 30.4 & PRD.
 */
const ALLOWED_EDUCATIONAL_NEGATIONS = [
  /tidak\s+berarti\s+pasti\s+aman/i,
  /bukan\s+berarti\s+pasti\s+aman/i,
  /bukan\s+jaminan\s+aman/i,
  /tidak\s+ada\s+jaminan\s+aman/i,
  /tidak\s+menjamin\s+aman/i,
  /belum\s+tentu\s+aman/i,
  /tidak\s+aman/i,
  /bukan\s+aman/i,
  /belum\s+terbukti/i,
  /tidak\s+100%/i,
  /tidak\s+berarti\s+pasti/i,
  /bukan\s+berarti\s+pasti/i,
];

/**
 * Struktur laporan pelanggaran audit
 */
interface AuditViolation {
  file: string;
  lineNo: number;
  word: string;
  snippet: string;
  reason: string;
}

/**
 * Memeriksa satu baris kode apakah memuat kata terlarang sebagai KESIMPULAN atau vonis.
 * Mengembalikan null jika baris sah, atau AuditViolation jika ada pelanggaran.
 */
function auditLine(line: string, filePath: string, lineNo: number): AuditViolation | null {
  // Hanya periksa baris yang memuat kata terlarang (word boundary)
  const forbiddenMatch = line.match(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
  if (!forbiddenMatch) return null;

  const trimmed = line.trim();

  // 1. Abaikan baris komentar kode teknis penuh (bukan teks yang tampil ke user atau hasil)
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    (trimmed.startsWith('{/*') && trimmed.endsWith('*/}'))
  ) {
    return null;
  }

  // 2. Abaikan file implementasi filter (lib/gemini.ts) pada baris logika penggantian kata atau regex
  if (filePath.endsWith('gemini.ts')) {
    if (
      trimmed.includes('targetRegex') ||
      trimmed.includes('/gi') ||
      trimmed.startsWith('/') ||
      trimmed.includes('lower ===') ||
      trimmed.includes('lower.startsWith') ||
      trimmed.includes('replacement =') ||
      trimmed.includes('matchStr')
    ) {
      return null;
    }
  }

  // 3. Abaikan definisi KATA_TERLARANG dan teks aturan pelarangan pada data/system-prompt.ts
  if (filePath.endsWith('system-prompt.ts')) {
    if (
      trimmed.includes('KATA_TERLARANG =') ||
      trimmed.includes('DILARANG KERAS') ||
      trimmed.includes('JANGAN PERNAH') ||
      trimmed.includes('JANGAN katakan') ||
      trimmed.includes('tanpa kata terlarang')
    ) {
      return null;
    }
  }

  // 4. Jika baris memiliki trailing comment (misal: code // komentar aman),
  // abaikan jika kata terlarang hanya muncul di dalam komentarnya
  let codeOnly = line;
  const commentIndex = line.indexOf('//');
  if (commentIndex !== -1) {
    const codePart = line.substring(0, commentIndex);
    const matchInCode = codePart.match(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
    if (!matchInCode) {
      return null;
    }
    codeOnly = codePart;
  }

  // 5. Bersihkan konteks edukatif negasi yang diizinkan
  let lineCleared = codeOnly;
  for (const pattern of ALLOWED_EDUCATIONAL_NEGATIONS) {
    lineCleared = lineCleared.replace(pattern, ' ');
  }

  // 6. Khusus aturan video: pertanyaan/bukti wizard mengenai janji untung dari penipu
  // Sesuai Requirement 22.4: "ada janji untung pasti atau ajakan ke WA/Telegram"
  if (filePath.includes('video-rules.ts')) {
    lineCleared = lineCleared.replace(/Janji keuntungan pasti/i, ' ');
    lineCleared = lineCleared.replace(/janji untung pasti/i, ' ');
  }

  // 7. Evaluasi apakah masih ada kata terlarang yang berdiri sebagai kesimpulan/vonis
  const remaining = lineCleared.match(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
  if (remaining) {
    return {
      file: filePath,
      lineNo,
      word: remaining[0],
      snippet: trimmed,
      reason: `Kata "${remaining[0]}" ditemukan di luar konteks negasi yang diizinkan`,
    };
  }

  return null;
}

/**
 * Memindai satu direktori secara rekursif dan mengembalikan daftar file non-test
 */
function getAllSourceFiles(dirPath: string): string[] {
  let fileList: string[] = [];
  if (!fs.existsSync(dirPath)) return fileList;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        fileList = fileList.concat(getAllSourceFiles(fullPath));
      }
    } else if (entry.isFile()) {
      // Ambil file source kode & data JSON, kecualikan file tes
      const ext = path.extname(entry.name).toLowerCase();
      const isTest = entry.name.includes('.test.') || entry.name.includes('.spec.');
      if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext) && !isTest) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

describe('Audit Kata Terlarang (Requirements 2.4, 6.7, 30.1, 30.2, 30.3, 30.4)', () => {
  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // 1. Pemindaian Statis Seluruh File Kode & Data
  // =========================================================================
  describe('1. Pemindaian Statis Direktori app/, components/, lib/, data/', () => {
    const dirsToScan = ['app', 'components', 'lib', 'data'];

    it('memindai semua file kode dan data serta memastikan tidak ada pelanggaran kata terlarang sebagai kesimpulan', () => {
      const allFiles: string[] = [];
      for (const dir of dirsToScan) {
        const fullDir = path.resolve(process.cwd(), dir);
        allFiles.push(...getAllSourceFiles(fullDir));
      }

      expect(allFiles.length).toBeGreaterThan(0);

      const violations: AuditViolation[] = [];

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          const violation = auditLine(line, filePath, idx + 1);
          if (violation) {
            violations.push(violation);
          }
        });
      }

      if (violations.length > 0) {
        console.error('Pelanggaran audit kata terlarang ditemukan:');
        violations.forEach((v) => {
          console.error(`- ${v.file}:${v.lineNo} [${v.word}] -> ${v.snippet} (${v.reason})`);
        });
      }

      expect(violations, `Ditemukan ${violations.length} pelanggaran kata terlarang di kode`).toEqual([]);
    });

    it('verifikasi validator audit menangkap pelanggaran sintetis dan meloloskan negasi sah', () => {
      // Kasus pelanggaran klaim pasti
      const v1 = auditLine('const text = "Link ini pasti aman untuk diklik.";', 'dummy.ts', 1);
      expect(v1).not.toBeNull();
      expect(v1?.word.toLowerCase()).toBe('pasti');

      const v2 = auditLine('const ringkasan = "Pesan ini terbukti penipuan.";', 'dummy.ts', 2);
      expect(v2).not.toBeNull();
      expect(v2?.word.toLowerCase()).toBe('terbukti');

      const v3 = auditLine('const status = "Akun Anda 100% aman.";', 'dummy.ts', 3);
      expect(v3).not.toBeNull();

      const v4 = auditLine('const note = "Toko ini aman.";', 'dummy.ts', 4);
      expect(v4).not.toBeNull();
      expect(v4?.word.toLowerCase()).toBe('aman');

      // Kasus negasi yang diizinkan (Requirement 6.4, 30.4)
      const allowed1 = auditLine(
        'const ringkasan = "Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.";',
        'dummy.ts',
        5
      );
      expect(allowed1).toBeNull();

      const allowed2 = auditLine('const ket = "Tidak ada di daftar ancaman (bukan jaminan aman)";', 'dummy.ts', 6);
      expect(allowed2).toBeNull();

      const allowed3 = auditLine('const pesan = "Data kamu belum tentu aman.";', 'dummy.ts', 7);
      expect(allowed3).toBeNull();

      const allowed4 = auditLine('const note = "Situs ini tidak aman.";', 'dummy.ts', 8);
      expect(allowed4).toBeNull();
    });
  });

  // =========================================================================
  // 2. Audit File Data JSON
  // =========================================================================
  describe('2. Audit File Data JSON di data/ dan data/contoh/', () => {
    it('memastikan data JSON contoh dan darurat tidak mengandung kata terlarang sebagai kesimpulan', () => {
      const dataDir = path.resolve(process.cwd(), 'data');
      const jsonFiles = getAllSourceFiles(dataDir).filter((f) => f.endsWith('.json'));

      expect(jsonFiles.length).toBeGreaterThan(0);

      const violations: { file: string; path: string; text: string }[] = [];

      function checkJsonValue(val: unknown, currentPath: string, filePath: string): void {
        if (typeof val === 'string') {
          // Khusus URL atau kode identifier teknis
          if (val.startsWith('http://') || val.startsWith('https://')) return;

          // Periksa apakah string mengandung kata terlarang sebagai kesimpulan
          let cleared = val;
          for (const pattern of ALLOWED_EDUCATIONAL_NEGATIONS) {
            cleared = cleared.replace(pattern, ' ');
          }

          const match = cleared.match(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
          if (match) {
            violations.push({
              file: path.relative(process.cwd(), filePath),
              path: currentPath,
              text: val,
            });
          }
        } else if (Array.isArray(val)) {
          val.forEach((item, idx) => checkJsonValue(item, `${currentPath}[${idx}]`, filePath));
        } else if (val && typeof val === 'object') {
          for (const [key, propVal] of Object.entries(val)) {
            checkJsonValue(propVal, `${currentPath}.${key}`, filePath);
          }
        }
      }

      for (const jsonFile of jsonFiles) {
        const raw = fs.readFileSync(jsonFile, 'utf-8');
        const parsed = JSON.parse(raw);
        checkJsonValue(parsed, 'root', jsonFile);
      }

      expect(violations, `Ditemukan pelanggaran kata terlarang di file JSON: ${JSON.stringify(violations)}`).toEqual(
        []
      );
    });
  });

  // =========================================================================
  // 3. Audit System Prompt (Requirement 30.1 & 30.2)
  // =========================================================================
  describe('3. Audit System Prompt (Requirement 30.1 & 30.2)', () => {
    it('KATA_TERLARANG memuat persis daftar kata yang dilarang', () => {
      expect(KATA_TERLARANG).toContain('aman');
      expect(KATA_TERLARANG).toContain('pasti');
      expect(KATA_TERLARANG).toContain('terbukti');
      expect(KATA_TERLARANG).toContain('100%');
    });

    it('CHAT_SYSTEM_PROMPT melarang AI menggunakan kata terlarang sebagai kesimpulan', () => {
      const promptLower = CHAT_SYSTEM_PROMPT.toLowerCase();
      expect(promptLower).toContain('larangan kata terlarang');
      for (const kata of KATA_TERLARANG) {
        expect(promptLower).toContain(kata.toLowerCase());
      }
      expect(promptLower).toContain('tanpa vonis');
    });

    it('LINK_EXPLANATION_SYSTEM_PROMPT melarang AI menggunakan kata terlarang sebagai kesimpulan', () => {
      const promptLower = LINK_EXPLANATION_SYSTEM_PROMPT.toLowerCase();
      for (const kata of KATA_TERLARANG) {
        expect(promptLower).toContain(kata.toLowerCase());
      }
      expect(promptLower).toContain('dilarang keras');
    });

    it('TANYA_SYSTEM_PROMPT melarang AI menggunakan kata terlarang sebagai jaminan', () => {
      const promptLower = TANYA_SYSTEM_PROMPT.toLowerCase();
      for (const kata of KATA_TERLARANG) {
        expect(promptLower).toContain(kata.toLowerCase());
      }
    });

    it('system prompt memuat klausul negasi standar untuk kondisi tidak ditemukan bahaya (Requirement 30.4)', () => {
      expect(CHAT_SYSTEM_PROMPT).toContain(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );
    });
  });

  // =========================================================================
  // 4. Audit Filter Keluaran AI (Requirement 30.1 & 30.3)
  // =========================================================================
  describe('4. Audit Filter Keluaran AI (filterKataTerlarang & filterFormatDataHasil)', () => {
    it('membersihkan kata terlarang "pasti aman", "terbukti aman", "100% aman"', () => {
      expect(filterKataTerlarang('Tautan ini pasti aman.')).not.toContain('pasti aman');
      expect(filterKataTerlarang('Tautan ini terbukti aman.')).not.toContain('terbukti aman');
      expect(filterKataTerlarang('Tautan ini 100% aman.')).not.toContain('100% aman');
    });

    it('membersihkan vonis mutlak "pasti penipuan", "terbukti penipuan", "100% scam"', () => {
      expect(filterKataTerlarang('Pesan ini pasti penipuan.')).toBe('Pesan ini berindikasi penipuan.');
      expect(filterKataTerlarang('Pengirim terbukti penipu.')).toBe('Pengirim berindikasi penipu.');
      expect(filterKataTerlarang('Transaksi ini 100% scam.')).toBe('Transaksi ini sepenuhnya scam.');
    });

    it('membersihkan klaim "pasti asli" dan "terbukti asli"', () => {
      expect(filterKataTerlarang('Surat ini pasti asli.')).toBe('Surat ini terindikasi asli.');
      expect(filterKataTerlarang('Bukti ini terbukti sah.')).toBe('Bukti ini terindikasi sah.');
    });

    it('mempertahankan konteks edukasi dan negasi yang sah tanpa mengubahnya', () => {
      const negasi304 = 'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.';
      expect(filterKataTerlarang(negasi304)).toBe(negasi304);

      const negasiJaminan = 'Pemeriksaan ini bukan jaminan aman.';
      expect(filterKataTerlarang(negasiJaminan)).toBe(negasiJaminan);

      const negasiBelumTentu = 'Data rekening kamu belum tentu aman.';
      expect(filterKataTerlarang(negasiBelumTentu)).toBe(negasiBelumTentu);

      const negasiTidakAman = 'Website tersebut tidak aman untuk diakses.';
      expect(filterKataTerlarang(negasiTidakAman)).toBe(negasiTidakAman);
    });

    it('filterFormatDataHasil membersihkan semua field kesimpulan namun mempertahankan bukti kutipan verbatim', () => {
      const dummyInput: FormatDataHasil = {
        halaman: 'chat',
        level: 'tinggi',
        ringkasan: 'Pesan ini pasti penipuan 100%.',
        temuan: [
          {
            judul: 'Tawaran pasti untung',
            penjelasan: 'Skema investasi ini terbukti penipuan di berbagai daerah.',
            bukti: 'Dijamin 100% untung pasti cair!', // Bukti asli verbatim harus tetap dipertahankan
            sumber: 'ai',
          },
        ],
        hal_wajar: ['Format chat tampak rapi dan pasti resmi'],
        langkah: [
          'Hubungi pihak berwenang karena ini pasti berbahaya.',
          'Jangan percaya akun yang belum pasti kredibilitasnya.',
        ],
        situasi_darurat: [],
        batasan: 'Analisis berbasis teks dan terbukti akurat.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      };

      const filtered = filterFormatDataHasil(dummyInput);

      // Ringkasan bersih dari pasti dan 100%
      expect(filtered.ringkasan).not.toMatch(/\b(pasti|100%)\b/i);
      expect(filtered.ringkasan).toBe('Pesan ini berindikasi penipuan sepenuhnya.');

      // Temuan: judul dan penjelasan bersih
      expect(filtered.temuan[0].judul).not.toMatch(/\bpasti\b/i);
      expect(filtered.temuan[0].penjelasan).not.toMatch(/\bterbukti\b/i);

      // Bukti kutipan verbatim TIDAK diubah
      expect(filtered.temuan[0].bukti).toBe('Dijamin 100% untung pasti cair!');

      // Hal wajar, langkah, dan batasan bersih
      expect(filtered.hal_wajar[0]).not.toMatch(/\bpasti\b/i);
      expect(filtered.langkah[0]).not.toMatch(/\bpasti\b/i);
      expect(filtered.batasan).not.toMatch(/\bterbukti\b/i);
    });
  });

  // =========================================================================
  // 5. Audit Komponen UI yang Diterjemahkan (Rendered UI Audit)
  // =========================================================================
  describe('5. Audit Teks UI Komponen dan Halaman (Requirements 2.4, 6.7, 30.1)', () => {
    it('halaman Beranda (Home): Hero, Akordeon, dan Menu bebas kata terlarang sebagai janji hasil (Requirement 2.4)', () => {
      render(React.createElement(Home));

      const hero = screen.getByTestId('hero-panduan');
      const heroText = hero.textContent?.toLowerCase() || '';

      // Tidak ada janji pasti aman / garansi keamanan
      expect(heroText).not.toContain('pasti aman');
      expect(heroText).not.toContain('terbukti aman');
      expect(heroText).not.toContain('100% aman');
      expect(heroText).not.toContain('dijamin');
      expect(/\bpasti\b/i.test(heroText)).toBe(false);

      const akordeon = screen.getByTestId('section-cara-kerja');
      const akordeonText = akordeon.textContent?.toLowerCase() || '';
      expect(akordeonText).not.toContain('pasti aman');
      expect(akordeonText).not.toContain('terbukti aman');
      expect(akordeonText).not.toContain('100%');
      expect(akordeonText).not.toContain('dijamin');
    });

    it('KomponenHasil level "tidak_ditemukan": memuat kalimat negasi edukatif sesuai Requirement 6.4 & 30.4', () => {
      const dummyTidakDitemukan: FormatDataHasil = {
        halaman: 'link',
        level: 'tidak_ditemukan',
        ringkasan: 'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.',
        temuan: [],
        hal_wajar: ['Struktur URL sesuai format domain resmi'],
        langkah: [
          'Tetap periksa keaslian halaman sebelum login.',
          'Jangan memasukkan kata sandi jika ragu.',
        ],
        situasi_darurat: [],
        batasan: 'Pemeriksaan hanya mendeteksi tanda bahaya umum.',
        pihak_ketiga: [],
        status_layanan: {},
      };

      render(React.createElement(KomponenHasil, { hasil: dummyTidakDitemukan }));

      const hasilEl = screen.getByTestId('komponen-hasil');
      const text = hasilEl.textContent || '';

      // Memastikan kalimat wajib Requirement 6.4 & 30.4 tampil utuh
      expect(text).toContain(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );

      // Memastikan tidak ada klaim garansi lain seperti "pasti aman", "terbukti aman", "100% aman"
      expect(text.toLowerCase()).not.toContain('100% aman');
      expect(text.toLowerCase()).not.toContain('terbukti aman');
      expect(text.toLowerCase()).not.toContain('dijamin');
    });

    it('KomponenHasil level "tinggi": tidak memuat kata terlarang sebagai kesimpulan (Requirement 6.7)', () => {
      const dummyTinggi: FormatDataHasil = {
        halaman: 'chat',
        level: 'tinggi',
        ringkasan: 'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.',
        temuan: [
          {
            judul: 'Permintaan kode OTP',
            penjelasan: 'Pihak resmi tidak pernah meminta kode OTP melalui pesan chat.',
            bukti: 'Kirimkan kode OTP sekarang',
            sumber: 'aturan',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan bagikan kode OTP kepada siapa pun.',
          'Blokir nomor pengirim segera.',
        ],
        situasi_darurat: ['kirim_otp'],
        batasan: 'Hasil didasarkan pada analisis aturan lokal.',
        pihak_ketiga: [],
        status_layanan: {},
      };

      render(React.createElement(KomponenHasil, { hasil: dummyTinggi }));

      const hasilEl = screen.getByTestId('komponen-hasil');
      const text = hasilEl.textContent?.toLowerCase() || '';

      expect(text).not.toContain('pasti aman');
      expect(text).not.toContain('terbukti aman');
      expect(text).not.toContain('100% aman');
      expect(text).not.toContain('pasti penipuan');
      expect(text).not.toContain('terbukti penipuan');
      expect(text).not.toContain('100% scam');
    });

    it('KotakPrivasi tidak memuat janji kesimpulan atau kata terlarang (Requirement 30.1)', () => {
      const halamanList = ['chat', 'link', 'video'] as const;
      for (const hal of halamanList) {
        const { unmount } = render(
          React.createElement(KotakPrivasi, {
            halaman: hal,
          })
        );
        const el = screen.getByTestId('kotak-privasi');
        const text = el.textContent?.toLowerCase() || '';

        expect(text).not.toContain('pasti aman');
        expect(text).not.toContain('terbukti aman');
        expect(text).not.toContain('100% aman');
        expect(text).not.toContain('dijamin');
        unmount();
      }
    });

    it('LangkahDisarankan fallback bebas dari kata terlarang (Requirement 6.7)', () => {
      for (const step of FALLBACK_LANGKAH) {
        expect(step).not.toMatch(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
      }

      render(React.createElement(LangkahDisarankan, { langkah: [] }));
      const el = screen.getByTestId('langkah-disarankan-section');
      const text = el.textContent?.toLowerCase() || '';

      expect(text).not.toContain('pasti aman');
      expect(text).not.toContain('terbukti aman');
      expect(text).not.toContain('100%');
    });

    it('TingkatKewaspadaan konfigurasi bebas kata terlarang sebagai kesimpulan (Requirement 6.2, 6.3, 6.4)', () => {
      render(React.createElement(TingkatKewaspadaan, { level: 'tidak_ditemukan' }));
      const statusEl = screen.getByRole('status');
      expect(statusEl.textContent).toContain('Tidak ditemukan tanda bahaya');
      expect(statusEl.textContent).toContain(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );
    });

    it('PanelDarurat dan TombolContoh bebas dari kata terlarang sebagai kesimpulan', () => {
      const { unmount: unmount1 } = render(React.createElement(PanelDarurat, { autoOpen: true }));
      const pd = screen.getByTestId('panel-darurat-section');
      const textPd = pd.textContent?.toLowerCase() || '';
      expect(textPd).not.toContain('pasti aman');
      expect(textPd).not.toContain('terbukti aman');
      expect(textPd).not.toContain('100% aman');
      unmount1();

      const { unmount: unmount2 } = render(React.createElement(TombolContoh, { halaman: 'chat' }));
      const tc = screen.getByTestId('tombol-contoh-wrapper');
      const textTc = tc.textContent?.toLowerCase() || '';
      expect(textTc).not.toContain('pasti aman');
      expect(textTc).not.toContain('terbukti aman');
      expect(textTc).not.toContain('100% aman');
      unmount2();
    });

    it('Footer bebas dari janji kepastian atau kata terlarang (Requirement 2.4)', () => {
      render(React.createElement(Footer));
      const footerEl = screen.getByRole('contentinfo');
      const text = footerEl.textContent?.toLowerCase() || '';

      expect(text).not.toContain('pasti aman');
      expect(text).not.toContain('terbukti aman');
      expect(text).not.toContain('100% aman');
    });
  });

  // =========================================================================
  // 6. Audit Aturan Penilaian Lokal (Chat, Link, Video)
  // =========================================================================
  describe('6. Audit Aturan Penilaian Lokal (Chat, Link, Video)', () => {
    it('generateHasilChatLokal mengembalikan klausul wajib pada kondisi normal dan bebas kata terlarang', () => {
      const hasil = generateHasilChatLokal('Halo apa kabar');
      expect(hasil.level).toBe('tidak_ditemukan');
      expect(hasil.ringkasan).toBe(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );

      // Verifikasi langkah dan batasan tidak mengandung kata terlarang
      for (const l of hasil.langkah) {
        expect(l).not.toMatch(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
      }
    });

    it('generateHasilLinkLokal mengembalikan klausul wajib pada kondisi normal dan bebas kata terlarang', () => {
      const hasil = generateHasilLinkLokal('https://wikipedia.org');
      expect(hasil.level).toBe('tidak_ditemukan');
      expect(hasil.ringkasan).toContain(
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.'
      );

      for (const l of hasil.langkah) {
        expect(l).not.toMatch(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
      }
    });

    it('generateHasilVideoLokal mengembalikan klausul wajib pada kondisi normal dan bebas kata terlarang', () => {
      const hasil = generateHasilVideoLokal({
        situasi: 'video_call',
        siapa_tampil: 'keluarga',
        apa_diminta: 'tidak_minta',
        bisa_telepon_balik: true,
      });

      expect(hasil.level).toBe('tidak_ditemukan');
      expect(hasil.ringkasan).toContain('Ini tidak berarti pasti aman');

      for (const l of hasil.langkah) {
        expect(l).not.toMatch(/(?:\b100%|\bpasti\b|\bterbukti\b|\baman\b)/i);
      }
    });
  });
});
