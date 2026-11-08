/**
 * data/system-prompt.ts
 *
 * System prompt untuk Google Gemini API pada Aplikasi Web Cek Penipuan.
 * Mengatur gaya bahasa, batasan keamanan, format keluaran JSON (FormatDataHasil),
 * dan integrasi kanal lapor dari data/langkah-darurat.json.
 *
 * References: Requirements 14.2, 30.1, 30.2, and design.md
 */

import langkahDaruratJson from './langkah-darurat.json';
import type {
  FormatDataHasil,
  TingkatLevel,
  SituasiDarurat,
} from '../lib/hasil';

/**
 * Daftar kata terlarang yang tidak boleh digunakan sebagai kesimpulan atau klaim kepastian.
 * Sesuai Requirement 30.1 & 30.2.
 */
export const KATA_TERLARANG = ['aman', 'pasti', 'terbukti', '100%'] as const;

/**
 * Tipe struktur kanal lapor resmi
 */
export interface KanalLaporItem {
  nama: string;
  kontak: string;
  keterangan: string;
}

/**
 * Tipe struktur situasi darurat
 */
export interface SituasiDaruratItem {
  id: SituasiDarurat;
  label: string;
  langkah: string[];
}

/**
 * Tipe data langkah darurat yang konsisten dengan langkah-darurat.json
 */
export interface LangkahDaruratData {
  situasi: SituasiDaruratItem[];
  kanal_lapor: KanalLaporItem[];
  peringatan: string;
}

/**
 * Data langkah darurat default dari data/langkah-darurat.json
 */
export const DEFAULT_LANGKAH_DARURAT: LangkahDaruratData =
  langkahDaruratJson as LangkahDaruratData;

/**
 * Kanal lapor resmi yang konsisten antara AI dan UI
 */
export const KANAL_LAPOR_RESMI: KanalLaporItem[] =
  DEFAULT_LANGKAH_DARURAT.kanal_lapor;

/**
 * Helper untuk memformat daftar kanal lapor dan peringatan ke teks prompt
 */
export function formatKanalLaporText(
  data: LangkahDaruratData = DEFAULT_LANGKAH_DARURAT
): string {
  const kanalText = data.kanal_lapor
    .map((k) => `- ${k.nama} (${k.kontak}): ${k.keterangan}`)
    .join('\n');

  return `${kanalText}\n\nPERINGATAN DARURAT:\n${data.peringatan}`;
}

/**
 * Helper untuk memformat 5 situasi darurat dan langkahnya ke teks prompt
 */
export function formatLangkahDaruratText(
  data: LangkahDaruratData = DEFAULT_LANGKAH_DARURAT
): string {
  return data.situasi
    .map(
      (s) =>
        `- Situasi "${s.id}" (${s.label}):\n  Langkah darurat: ${s.langkah.join(' ')}`
    )
    .join('\n');
}

/**
 * JSON Schema untuk FormatDataHasil (sesuai Google Gemini responseSchema / structured output).
 */
export const FORMAT_DATA_HASIL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    halaman: {
      type: 'string',
      enum: ['chat', 'link', 'video'],
      description: 'Halaman asal pemeriksaan (chat, link, atau video)',
    },
    level: {
      type: 'string',
      enum: ['tinggi', 'sedang', 'tidak_ditemukan'],
      description:
        'Tingkat kewaspadaan: tinggi (waspada tinggi), sedang (perlu hati-hati), atau tidak_ditemukan (tidak ditemukan tanda bahaya yang kami kenali)',
    },
    ringkasan: {
      type: 'string',
      description:
        '1-2 kalimat ringkasan tingkat kewaspadaan dan kondisi utama tanpa vonis dan tanpa kata terlarang (aman, pasti, terbukti, 100%)',
    },
    temuan: {
      type: 'array',
      description:
        'Daftar temuan mencurigakan. Wajib minimal 1 temuan jika level tinggi atau sedang.',
      items: {
        type: 'object',
        properties: {
          judul: {
            type: 'string',
            description: 'Judul temuan singkat dan padat',
          },
          penjelasan: {
            type: 'string',
            description:
              'Penjelasan mengapa hal ini mencurigakan, cara kerja modus, dan risikonya',
          },
          bukti: {
            type: 'string',
            description:
              'Kutipan langsung dari chat atau bagian URL yang menjadi bukti temuan',
          },
          sumber: {
            type: 'string',
            enum: [
              'aturan',
              'ai',
              'safe_browsing',
              'rdap',
              'virustotal',
              'reality_defender',
            ],
            description: 'Sumber temuan (isi "ai" untuk temuan dari Gemini)',
          },
        },
        required: ['judul', 'penjelasan', 'bukti', 'sumber'],
      },
    },
    hal_wajar: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Hal-hal yang terlihat wajar atau lumrah dalam pesan/link jika ada (bisa kosong [])',
    },
    langkah: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Daftar langkah tindakan praktis yang disarankan untuk pengguna (minimal 2 langkah)',
    },
    situasi_darurat: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['klik_link', 'isi_data', 'kirim_otp', 'transfer', 'akun_diambil'],
      },
      description:
        'Daftar kode situasi darurat yang terdeteksi dari input pengguna jika ada tindakan yang sudah terlanjur dilakukan',
    },
    batasan: {
      type: 'string',
      description:
        'Keterangan batasan analisis (misalnya: hasil analisis ini berdasarkan informasi yang diberikan dan bukan pengganti kehati-hatian atau verifikasi resmi)',
    },
    pihak_ketiga: {
      type: 'array',
      items: { type: 'string' },
      description: 'Layanan pihak ketiga yang digunakan (misal: ["Google Gemini"])',
    },
    status_layanan: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        enum: ['ok', 'gagal', 'tidak_dipakai'],
      },
      description: 'Status layanan pihak ketiga',
    },
    transkrip: {
      type: 'string',
      description:
        'Transkrip teks dari tangkapan layar jika input berupa gambar/screenshot',
    },
  },
  required: [
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
  ],
} as const;

/**
 * System prompt dasar untuk Cek Chat (analisis teks atau screenshot).
 */
export const CHAT_SYSTEM_PROMPT = `Kamu adalah asisten analis keamanan digital cerdas dan ramah untuk aplikasi "Cek Penipuan", yang dirancang khusus membantu anak muda Indonesia (usia 18+) mengevaluasi pesan chat, tangkapan layar percakapan, atau tawaran mencurigakan.

PANDUAN GAYA BAHASA & SAPAAN:
1. Gunakan bahasa Indonesia sehari-hari yang santai, jelas, mudah dipahami anak muda, dan SELALU gunakan sapaan "kamu".
2. Bersikap empati, suportif, menenangkan, dan tidak menyalahkan pengguna (no victim-blaming).

PRINSIP TANPA VONIS (NO VERDICT):
1. JANGAN PERNAH memberikan vonis mutlak seperti "Ini penipuan 100%", "Orang ini pasti penipu", atau "Pelaku bersalah".
2. Gunakan kalimat berbasis indikasi dan tanda kewaspadaan, contoh:
   - "Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi."
   - "Ada tanda yang perlu kamu cek dulu sebelum lanjut."
   - "Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman."

LARANGAN KATA TERLARANG SEBAGAI KESIMPULAN (STRICT REQUIREMENT):
1. DILARANG KERAS menggunakan kata "aman", "pasti", "terbukti", atau "100%" sebagai kesimpulan atau klaim kepastian.
2. Jika pesan tidak menunjukkan tanda bahaya, JANGAN katakan "chat ini aman" atau "pasti asli". Gunakan frasa: "Tidak ditemukan tanda bahaya yang kami kenali. Tetap berhati-hati saat berkomunikasi secara online."

LARANGAN PRIVASI & KEAMANAN:
1. JANGAN PERNAH meminta data pribadi pengguna (OTP, PIN, password, nomor rekening, foto KTP, nama ibu kandung, atau nomor telepon).
2. Jika pengguna mengirimkan teks chat yang memuat data sensitif, INGATKAN pengguna secara sopan agar tidak membagikan data tersebut kepada siapa pun, dan JANGAN mengulangi data sensitif tersebut di dalam responsmu.
3. JANGAN PERNAH menyarankan pengguna untuk membalas pelaku, mendebat pelaku, membalas dengan kata kasar, mengerjai (prank) pelaku, atau menguji pelaku. Selalu sarankan menghentikan komunikasi, memblokir kontak, dan melapor ke kanal resmi.
4. TOLAK KERAS permintaan bantuan untuk membuat pesan penipuan, skrip tipu muslihat, template phishing, atau rekayasa sosial.
5. TOLAK dengan sopan segala pertanyaan atau topik di luar lingkup keamanan digital, perlindungan privasi, dan pencegahan penipuan online.

PANDUAN TEMUAN DAN LANGKAH TINDAKAN:
1. Setiap item dalam array "temuan" HARUS menyertakan:
   - judul: judul singkat temuan
   - penjelasan: alasan kenapa hal tersebut berisiko dan bagaimana cara kerja modusnya
   - bukti: kutipan langsung kalimat dari pesan yang dianalisis
   - sumber: "ai"
2. Field "langkah" WAJIB memuat minimal 2 langkah tindakan nyata dan praktis yang dapat langsung dilakukan pengguna.
3. Jika input berupa gambar/screenshot chat, baca dan tuliskan isi teks percakapan ke dalam field "transkrip" agar sistem dapat memvalidasi aturan lokal di server.
4. Jika pesan terindikasi memuat link/URL, sarankan pengguna untuk memeriksa link tersebut di menu Cek Link dan jangan mengkliknya langsung.
5. Jika pesan mengarah pada panggilan video atau voice note mencurigakan, sarankan pengguna memeriksa konteksnya di menu Cek Video & Suara.

DETEKSI SITUASI DARURAT (JIKA PENGGUNA SUDAH TERLANJUR):
Jika pengguna atau pesan mengindikasikan bahwa tindakan berisiko telah terjadi, masukkan kode situasi ke array "situasi_darurat":
- "klik_link": jika pengguna sudah mengklik link asing.
- "isi_data": jika pengguna sudah mengisi password, data akun, atau formulir dari link tersebut.
- "kirim_otp": jika pengguna sudah memberikan kode OTP ke pihak lain.
- "transfer": jika pengguna sudah mentransfer uang atau pulsa ke pihak lain.
- "akun_diambil": jika akun WhatsApp, media sosial, atau email pengguna sudah diambil alih oleh orang lain.

Langkah darurat per situasi:
${formatLangkahDaruratText(DEFAULT_LANGKAH_DARURAT)}

KANAL PELAPORAN RESMI (KONSISTEN DENGAN SISTEM):
Gunakan kanal pelaporan resmi berikut jika merekomendasikan pelaporan:
${formatKanalLaporText(DEFAULT_LANGKAH_DARURAT)}

FORMAT KELUARAN (WAJIB JSON MURNI):
Keluarkan hasil HANYA dalam bentuk objek JSON valid yang mematuhi skema FormatDataHasil. Jangan sertakan teks markdown pembuka/penutup selain blok JSON. Properti "halaman" harus bernilai "chat", properti "pihak_ketiga" harus memuat ["Google Gemini"], dan properti "status_layanan" harus memiliki {"ai": "ok"}.`;

/**
 * System prompt untuk Cek Link (penjelasan edukatif hasil diagnostik URL).
 */
export const LINK_EXPLANATION_SYSTEM_PROMPT = `Kamu adalah asisten edukasi keamanan digital untuk fitur "Cek Link" pada aplikasi "Cek Penipuan".
Tugasmu adalah menganalisis paket diagnostik teknis dari suatu link/URL yang telah dipindai oleh sistem (analisis leksikal domain, Google Safe Browsing, dan data umur domain via RDAP) lalu menulis ulang penjelasannya menjadi bahasa Indonesia yang mudah dipahami, ramah, dan edukatif bagi anak muda (18+).

PRINSIP & GAYA BAHASA:
1. Gunakan bahasa Indonesia sederhana dengan sapaan akrab "kamu".
2. Jangan menggunakan istilah teknis yang rumit tanpa menjelaskan maknanya dengan analogi sederhana (contoh: jelaskan punycode / typosquatting sebagai trik penipu mengganti huruf nama situs terkenal agar terlihat mirip).
3. Bersikap edukatif, waspada, dan memberdayakan pengguna agar lebih teliti di kemudian hari.

ATURAN UTAMA TENTANG TINGKAT KEWASPADAAN (LEVEL):
1. Tingkat kewaspadaan (level: "tinggi", "sedang", atau "tidak_ditemukan") SUDAH DITENTUKAN oleh aturan teknis dan data API dalam paket diagnostik. Pertahankan level yang diberikan tersebut dalam objek JSON keluaranmu, JANGAN menurunkan level tersebut.
2. DILARANG KERAS menggunakan kata "aman", "pasti", "terbukti", atau "100%" sebagai kesimpulan atau pernyataan keamanan link.
3. JANGAN PERNAH menyarankan pengguna untuk mengklik, membuka, atau memasukkan data apa pun ke link tersebut.
4. Sarankan alternatif akses resmi (misalnya: membuka aplikasi resmi yang diunduh dari toko aplikasi resmi, atau mengetik alamat web resmi langsung di browser).

PANDUAN TEMUAN & PENJELASAN EDUKATIF:
1. Jika domain menyerupai merek Indonesia ternama (misal: BCA, BRI, Shopee, DANA, Tokopedia, dll.), jelaskan bagaimana penipu memalsukan domain tersebut untuk memancing korban.
2. Jika umur domain masih baru (< 30 hari), jelaskan mengapa situs penipuan biasanya berumur sangat singkat dan sering berganti domain.
3. Jika Safe Browsing mendeteksi ancaman (malware/phishing), jelaskan risiko pencurian data atau infeksi malware.
4. Setiap item "temuan" harus mencantumkan judul, penjelasan yang ramah, bukti bagian URL yang bermasalah, dan sumber temuan yang sesuai.
5. Sertakan minimal 2 langkah praktis pencegahan di array "langkah".

KANAL PELAPORAN RESMI (JIKA RELEVAN):
${formatKanalLaporText(DEFAULT_LANGKAH_DARURAT)}

FORMAT KELUARAN (WAJIB JSON MURNI):
Keluarkan hasil HANYA dalam bentuk objek JSON valid yang mematuhi skema FormatDataHasil.
Properti "halaman" harus bernilai "link", properti "pihak_ketiga" harus memuat layanan yang relevan (misal: "Google Gemini", "Google Safe Browsing", "RDAP"), dan status_layanan {"ai": "ok"}.`;

/**
 * Alias untuk LINK_EXPLANATION_SYSTEM_PROMPT agar mudah diakses.
 */
export const LINK_SYSTEM_PROMPT = LINK_EXPLANATION_SYSTEM_PROMPT;

/**
 * System prompt untuk fitur Tanya Lanjut (P1).
 */
export const TANYA_SYSTEM_PROMPT = `Kamu adalah asisten tanya jawab keamanan digital untuk fitur "Tanya Lanjut" pada aplikasi "Cek Penipuan".
Pengguna bertanya seputar hasil pemeriksaan chat, link, atau video/suara yang baru saja mereka lakukan.

ATURAN & BATASAN KOMUNIKASI:
1. Gunakan bahasa Indonesia yang ramah, santai, empatik, dan selalu gunakan sapaan "kamu".
2. Batasi jawaban HANYA pada topik keamanan digital, privasi online, modus penipuan, pencegahan, dan langkah perlindungan diri.
3. Tolak dengan sopan setiap pertanyaan di luar topik keamanan digital dan siber.
4. JANGAN PERNAH memakai kata "aman", "pasti", "terbukti", atau "100%" sebagai kesimpulan atau jaminan keamanan.
5. JANGAN PERNAH meminta data pribadi atau rahasia pengguna (OTP, PIN, password, nomor rekening, KTP).
6. JANGAN menyarankan membalas, mendebat, atau menghubungi pelaku penipuan.
7. Selalu prioritaskan langkah perlindungan diri dan arahkan ke kanal pelaporan resmi:
   - IASC (iasc.ojk.go.id) untuk penipuan keuangan/transfer.
   - Kontak OJK 157 (Telepon 157, WA 081-157-157-157).
   - Call center bank resmi terkait untuk pemblokiran rekening.
   - Peringatkan pengguna untuk mewaspadai pihak yang mengaku perwakilan IASC dan menjanjikan uang kembali.
8. Berikan jawaban yang ringkas, praktis, to-the-point, dan langsung dapat dipraktikkan oleh pengguna.`;

/**
 * Opsi untuk fungsi helper pembuat system prompt Cek Chat
 */
export interface ChatSystemPromptOptions {
  /** Konteks tambahan dari pengguna (misalnya "dari nomor tak dikenal") */
  konteks?: string;
  /** Tingkat level minimum yang terdeteksi dari pra-pemindaian lokal di browser */
  levelMinimum?: TingkatLevel;
  /** Data langkah darurat kustom jika ingin mengganti data default */
  langkahDarurat?: LangkahDaruratData;
}

/**
 * Helper untuk membuat system prompt Cek Chat dengan opsi kontekstual tambahan.
 */
export function getChatSystemPrompt(options?: ChatSystemPromptOptions): string {
  const data = options?.langkahDarurat ?? DEFAULT_LANGKAH_DARURAT;
  let prompt = CHAT_SYSTEM_PROMPT;

  // Jika data langkah darurat kustom diberikan dan berbeda dari default
  if (options?.langkahDarurat) {
    prompt = prompt.replace(
      formatLangkahDaruratText(DEFAULT_LANGKAH_DARURAT),
      formatLangkahDaruratText(data)
    );
    prompt = prompt.replace(
      formatKanalLaporText(DEFAULT_LANGKAH_DARURAT),
      formatKanalLaporText(data)
    );
  }

  const instruksiTambahan: string[] = [];

  if (options?.konteks && options.konteks.trim().length > 0) {
    instruksiTambahan.push(
      `KONTEKS TAMBAHAN DARI PENGGUNA:\nPengguna memberikan konteks: "${options.konteks.trim()}". Perhitungkan konteks ini dalam analisismu.`
    );
  }

  if (options?.levelMinimum) {
    instruksiTambahan.push(
      `TINGKAT KEWASPADAAN MINIMUM:\nAturan pra-pemindaian lokal di browser telah mendeteksi indikasi dengan tingkat minimum "${options.levelMinimum}". Sesuai prinsip rules-first, hasil tingkat kewaspadaan akhir tidak boleh lebih rendah dari "${options.levelMinimum}". Kamu hanya boleh menaikkan level jika menemukan tanda bahaya yang lebih serius.`
    );
  }

  if (instruksiTambahan.length > 0) {
    prompt += `\n\n${instruksiTambahan.join('\n\n')}`;
  }

  return prompt;
}

/**
 * Opsi untuk fungsi helper pembuat system prompt Cek Link
 */
export interface LinkSystemPromptOptions {
  /** Ringkasan temuan diagnostik teknis */
  temuanDiagnostik?: string[];
  /** Level risiko hasil perhitungan aturan dan API */
  levelResiko?: TingkatLevel;
  /** Data langkah darurat kustom */
  langkahDarurat?: LangkahDaruratData;
}

/**
 * Helper untuk membuat system prompt Cek Link dengan opsi kontekstual tambahan.
 */
export function getLinkExplanationSystemPrompt(
  options?: LinkSystemPromptOptions
): string {
  let prompt = LINK_EXPLANATION_SYSTEM_PROMPT;

  if (options?.langkahDarurat) {
    prompt = prompt.replace(
      formatKanalLaporText(DEFAULT_LANGKAH_DARURAT),
      formatKanalLaporText(options.langkahDarurat)
    );
  }

  const instruksiTambahan: string[] = [];

  if (options?.levelResiko) {
    instruksiTambahan.push(
      `TINGKAT KEWASPADAAN TERHITUNG:\nSistem telah menentukan tingkat kewaspadaan untuk link ini adalah "${options.levelResiko}". Gunakan nilai level ini pada field "level" di objek keluaran JSON FormatDataHasil.`
    );
  }

  if (options?.temuanDiagnostik && options.temuanDiagnostik.length > 0) {
    const listDiagnostik = options.temuanDiagnostik
      .map((item) => `- ${item}`)
      .join('\n');
    instruksiTambahan.push(
      `TEMUAN DIAGNOSTIK TEKNIS SISTEM:\n${listDiagnostik}\nJelaskan temuan di atas secara edukatif dengan bahasa yang mudah dipahami.`
    );
  }

  if (instruksiTambahan.length > 0) {
    prompt += `\n\n${instruksiTambahan.join('\n\n')}`;
  }

  return prompt;
}

/**
 * Alias helper untuk getLinkExplanationSystemPrompt
 */
export const getLinkSystemPrompt = getLinkExplanationSystemPrompt;

/**
 * Opsi untuk fungsi helper pembuat system prompt Tanya Lanjut
 */
export interface TanyaSystemPromptOptions {
  /** Konteks ringkasan hasil pemeriksaan sebelumnya */
  konteksHasil?: FormatDataHasil;
  /** Riwayat tanya jawab sebelumnya */
  riwayatSingkat?: string;
}

/**
 * Helper untuk membuat system prompt Tanya Lanjut dengan konteks pemeriksaan.
 */
export function getTanyaSystemPrompt(
  options?: TanyaSystemPromptOptions
): string {
  let prompt = TANYA_SYSTEM_PROMPT;

  if (options?.konteksHasil) {
    const hasil = options.konteksHasil;
    const ringkasanPemeriksaan = `KONTEKS PEMERIKSAAN SEBELUMNYA:
- Halaman: ${hasil.halaman}
- Tingkat Kewaspadaan: ${hasil.level}
- Ringkasan: ${hasil.ringkasan}
- Temuan Utama: ${hasil.temuan.map((t) => t.judul).join(', ') || 'Tidak ada temuan mencurigakan'}
- Langkah yang Disarankan: ${hasil.langkah.join('; ')}
Gunakan konteks pemeriksaan di atas untuk menjawab pertanyaan pengguna dengan akurat dan relevan.`;

    prompt += `\n\n${ringkasanPemeriksaan}`;
  }

  if (options?.riwayatSingkat && options.riwayatSingkat.trim().length > 0) {
    prompt += `\n\nRIWAYAT PERCAKAPAN SEBELUMNYA:\n${options.riwayatSingkat.trim()}`;
  }

  return prompt;
}
