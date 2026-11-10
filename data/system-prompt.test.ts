import { describe, it, expect } from 'vitest';
import {
  CHAT_SYSTEM_PROMPT,
  LINK_EXPLANATION_SYSTEM_PROMPT,
  LINK_SYSTEM_PROMPT,
  TANYA_SYSTEM_PROMPT,
  KATA_TERLARANG,
  KANAL_LAPOR_RESMI,
  DEFAULT_LANGKAH_DARURAT,
  FORMAT_DATA_HASIL_JSON_SCHEMA,
  formatKanalLaporText,
  formatLangkahDaruratText,
  getChatSystemPrompt,
  getLinkExplanationSystemPrompt,
  getLinkSystemPrompt,
  getTanyaSystemPrompt,
} from './system-prompt';
import langkahDaruratJson from './langkah-darurat.json';
import type { FormatDataHasil } from '../lib/hasil';

describe('System Prompt Gemini (Task 1.7)', () => {
  describe('Konstanta & Ekspor', () => {
    it('mengekspor konstanta prompt dan skema yang diperlukan', () => {
      expect(typeof CHAT_SYSTEM_PROMPT).toBe('string');
      expect(CHAT_SYSTEM_PROMPT.length).toBeGreaterThan(100);

      expect(typeof LINK_EXPLANATION_SYSTEM_PROMPT).toBe('string');
      expect(LINK_EXPLANATION_SYSTEM_PROMPT.length).toBeGreaterThan(100);

      expect(LINK_SYSTEM_PROMPT).toBe(LINK_EXPLANATION_SYSTEM_PROMPT);
      expect(getLinkSystemPrompt).toBe(getLinkExplanationSystemPrompt);

      expect(typeof TANYA_SYSTEM_PROMPT).toBe('string');
      expect(TANYA_SYSTEM_PROMPT.length).toBeGreaterThan(50);
    });

    it('mengekspor daftar kata terlarang sesuai Requirement 30.1', () => {
      expect(KATA_TERLARANG).toContain('aman');
      expect(KATA_TERLARANG).toContain('pasti');
      expect(KATA_TERLARANG).toContain('terbukti');
      expect(KATA_TERLARANG).toContain('100%');
    });

    it('mengekspor data kanal lapor dan langkah darurat konsisten dengan langkah-darurat.json', () => {
      expect(DEFAULT_LANGKAH_DARURAT.situasi).toHaveLength(5);
      expect(DEFAULT_LANGKAH_DARURAT.kanal_lapor).toHaveLength(4);
      expect(KANAL_LAPOR_RESMI).toEqual(langkahDaruratJson.kanal_lapor);
    });

    it('skema JSON FORMAT_DATA_HASIL_JSON_SCHEMA memuat semua field FormatDataHasil', () => {
      const requiredFields = [
        'halaman',
        'level',
        'ringkasan',
        'temuan',
        'hal_wajar',
        'langkah',
        'situasi_darurat',
        'batasan',
        'pihak_ketiga',
        'status_layanan',
      ];

      for (const field of requiredFields) {
        expect(FORMAT_DATA_HASIL_JSON_SCHEMA.required).toContain(field);
        expect(FORMAT_DATA_HASIL_JSON_SCHEMA.properties).toHaveProperty(field);
      }

      expect(
        FORMAT_DATA_HASIL_JSON_SCHEMA.properties.level.enum
      ).toEqual(['tinggi', 'sedang', 'tidak_ditemukan']);

      expect(
        FORMAT_DATA_HASIL_JSON_SCHEMA.properties.halaman.enum
      ).toEqual(['chat', 'link', 'video']);
    });
  });

  describe('Cek Chat System Prompt (Requirement 14.2 & 30.1 & 30.2)', () => {
    it('menggunakan bahasa Indonesia sederhana dengan sapaan "kamu"', () => {
      expect(CHAT_SYSTEM_PROMPT).toMatch(/\bkamu\b/i);
    });

    it('mengatur prinsip tanpa vonis (tanpa memberi vonis mutlak)', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('tanpa vonis');
      expect(CHAT_SYSTEM_PROMPT).toContain('pola penipuan');
    });

    it('melarang penggunaan kata terlarang (aman, pasti, terbukti, 100%) sebagai kesimpulan', () => {
      for (const kata of KATA_TERLARANG) {
        expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain(kata.toLowerCase());
      }
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('kata terlarang');
    });

    it('melarang meminta data pribadi pengguna', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('data pribadi');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('otp');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('pin');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('password');
    });

    it('mengingatkan pengguna yang mengirim data sensitif dan tidak mengulanginya', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('sensitif');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('ingatkan');
    });

    it('melarang menyarankan membalas atau mendebat pelaku', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('membalas pelaku');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('blokir');
    });

    it('menolak membantu membuat pesan penipuan', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('membuat pesan penipuan');
    });

    it('menolak pertanyaan di luar topik keamanan digital', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('di luar');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('keamanan digital');
    });

    it('mewajibkan temuan disertai alasan dan bukti kutipan', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('alasan');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('bukti');
    });

    it('mewajibkan minimal 2 langkah praktis di setiap jawaban', () => {
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('minimal 2 langkah');
    });

    it('mewajibkan format keluaran JSON sesuai skema FormatDataHasil', () => {
      expect(CHAT_SYSTEM_PROMPT).toContain('FormatDataHasil');
      expect(CHAT_SYSTEM_PROMPT).toContain('JSON');
    });

    it('memuat konten kanal lapor konsisten dari langkah-darurat.json', () => {
      // ===== IASC =====
      expect(CHAT_SYSTEM_PROMPT).toContain('iasc.ojk.go.id');
      // ===== OJK 157 =====
      expect(CHAT_SYSTEM_PROMPT).toContain('157');
      expect(CHAT_SYSTEM_PROMPT).toContain('081-157-157-157');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('call center bank');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('mengaku');
      expect(CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('iasc');
    });

    it('memuat 5 situasi darurat sesuai PRD', () => {
      expect(CHAT_SYSTEM_PROMPT).toContain('klik_link');
      expect(CHAT_SYSTEM_PROMPT).toContain('isi_data');
      expect(CHAT_SYSTEM_PROMPT).toContain('kirim_otp');
      expect(CHAT_SYSTEM_PROMPT).toContain('transfer');
      expect(CHAT_SYSTEM_PROMPT).toContain('akun_diambil');
    });
  });

  describe('Cek Link System Prompt (Requirement 20.1, 20.2, 30.1, 30.2)', () => {
    it('menggunakan bahasa Indonesia sederhana dengan sapaan "kamu"', () => {
      expect(LINK_EXPLANATION_SYSTEM_PROMPT).toMatch(/\bkamu\b/i);
    });

    it('menekankan penjelasan edukatif ramah tanpa kata terlarang', () => {
      expect(LINK_EXPLANATION_SYSTEM_PROMPT.toLowerCase()).toContain('edukatif');
      for (const kata of KATA_TERLARANG) {
        expect(LINK_EXPLANATION_SYSTEM_PROMPT.toLowerCase()).toContain(
          kata.toLowerCase()
        );
      }
    });

    it('melarang menyarankan mengklik link', () => {
      expect(LINK_EXPLANATION_SYSTEM_PROMPT.toLowerCase()).toContain('mengklik');
    });

    it('menegaskan bahwa level risiko ditentukan oleh aturan dan API, bukan diturunkan oleh AI', () => {
      expect(LINK_EXPLANATION_SYSTEM_PROMPT.toLowerCase()).toContain(
        'sudah ditentukan'
      );
      expect(LINK_EXPLANATION_SYSTEM_PROMPT.toLowerCase()).toContain(
        'jangan menurunkan'
      );
    });

    it('mengatur format keluaran JSON FormatDataHasil dengan halaman "link"', () => {
      expect(LINK_EXPLANATION_SYSTEM_PROMPT).toContain('FormatDataHasil');
      expect(LINK_EXPLANATION_SYSTEM_PROMPT).toContain('"link"');
    });
  });

  describe('Tanya Lanjut System Prompt', () => {
    it('mengatur batasan komunikasi hanya keamanan digital dengan sapaan "kamu"', () => {
      expect(TANYA_SYSTEM_PROMPT).toMatch(/\bkamu\b/i);
      expect(TANYA_SYSTEM_PROMPT.toLowerCase()).toContain('keamanan digital');
      expect(TANYA_SYSTEM_PROMPT.toLowerCase()).toContain('tolak');
      expect(TANYA_SYSTEM_PROMPT.toLowerCase()).toContain('data pribadi');
    });

    it('menyertakan kanal lapor resmi di sistem tanya lanjut', () => {
      expect(TANYA_SYSTEM_PROMPT).toContain('iasc.ojk.go.id');
      expect(TANYA_SYSTEM_PROMPT).toContain('157');
    });
  });

  describe('Fungsi Helper Pembuat Prompt', () => {
    it('getChatSystemPrompt() mengembalikan CHAT_SYSTEM_PROMPT default jika tanpa opsi', () => {
      const prompt = getChatSystemPrompt();
      expect(prompt).toBe(CHAT_SYSTEM_PROMPT);
    });

    it('getChatSystemPrompt() menambahkan konteks pengguna dan level minimum', () => {
      const prompt = getChatSystemPrompt({
        konteks: 'Pesan dari nomor luar negeri mengaku bos saya',
        levelMinimum: 'sedang',
      });

      expect(prompt).toContain('Pesan dari nomor luar negeri mengaku bos saya');
      expect(prompt).toContain('"sedang"');
      expect(prompt).toContain('rules-first');
    });

    it('getChatSystemPrompt() dapat menggunakan data langkah darurat kustom', () => {
      const customData = {
        situasi: [
          {
            id: 'transfer' as const,
            label: 'Sudah transfer uang',
            langkah: ['Langkah darurat custom 1', 'Langkah darurat custom 2'],
          },
        ],
        kanal_lapor: [
          {
            nama: 'Kanal Khusus',
            kontak: '12345',
            keterangan: 'Keterangan khusus',
          },
        ],
        peringatan: 'Peringatan kustom testing',
      };

      const prompt = getChatSystemPrompt({
        langkahDarurat: customData as any,
      });

      expect(prompt).toContain('Kanal Khusus');
      expect(prompt).toContain('Peringatan kustom testing');
      expect(prompt).toContain('Langkah darurat custom 1');
    });

    it('getLinkExplanationSystemPrompt() menambahkan level terhitung dan temuan diagnostik', () => {
      const prompt = getLinkExplanationSystemPrompt({
        levelResiko: 'tinggi',
        temuanDiagnostik: [
          'Domain terdaftar 2 hari lalu',
          'Domain mirip shopee.co.id (sh0pee.cfd)',
        ],
      });

      expect(prompt).toContain('"tinggi"');
      expect(prompt).toContain('Domain terdaftar 2 hari lalu');
      expect(prompt).toContain('sh0pee.cfd');
    });

    it('getTanyaSystemPrompt() menyertakan ringkasan pemeriksaan sebelumnya', () => {
      const mockHasil: FormatDataHasil = {
        halaman: 'chat',
        level: 'tinggi',
        ringkasan: 'Ditemukan indikasi penipuan lowongan kerja.',
        temuan: [
          {
            judul: 'Meminta uang jaminan',
            penjelasan: 'Pelaku meminta transfer dana sebelum kerja dimulai.',
            bukti: 'Transfer 500rb untuk seragam',
            sumber: 'ai',
          },
        ],
        hal_wajar: [],
        langkah: [
          'Jangan lakukan transfer apa pun.',
          'Segera blokir nomor pelaku.',
        ],
        situasi_darurat: [],
        batasan: 'Berdasarkan analisis teks yang diberikan.',
        pihak_ketiga: ['Google Gemini'],
        status_layanan: { ai: 'ok' },
      };

      const prompt = getTanyaSystemPrompt({
        konteksHasil: mockHasil,
        riwayatSingkat: 'Pengguna: Apakah nomor ini bisa dilacak?',
      });

      expect(prompt).toContain('Meminta uang jaminan');
      expect(prompt).toContain('tinggi');
      expect(prompt).toContain('Apakah nomor ini bisa dilacak?');
    });

    it('formatKanalLaporText dan formatLangkahDaruratText menghasilkan string yang terformat rapi', () => {
      const kanalText = formatKanalLaporText();
      expect(kanalText).toContain('Indonesia Anti-Scam Centre (IASC)');
      expect(kanalText).toContain('iasc.ojk.go.id');
      expect(kanalText).toContain('Kontak OJK 157');
      expect(kanalText).toContain('PERINGATAN DARURAT:');

      const situasiText = formatLangkahDaruratText();
      expect(situasiText).toContain('klik_link');
      expect(situasiText).toContain('transfer');
      expect(situasiText).toContain('Langkah darurat:');
    });
  });
});
