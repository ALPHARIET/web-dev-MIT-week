/**
 * lib/gemini.ts
 *
 * Helper pemanggilan Google Gemini API untuk Aplikasi Web Cek Penipuan.
 * Mendukung analisis percakapan (Cek Chat, teks & screenshot multimodal)
 * dan penjelasan edukatif hasil diagnostik link (Cek Link).
 *
 * References: Requirements 14.1, 14.4, 14.5, 25.1, 30.1, 30.2, 30.3
 */

import {
  FormatDataHasil,
  TingkatLevel,
  Temuan,
  SituasiDarurat,
  StatusLayanan,
  gabungLevel,
} from './hasil';
import {
  getChatSystemPrompt,
  getLinkExplanationSystemPrompt,
  getTanyaSystemPrompt,
  FORMAT_DATA_HASIL_JSON_SCHEMA,
} from '../data/system-prompt';

/** Input untuk pemanggilan analyzeChat */
export interface AnalyzeChatInput {
  mode: 'teks' | 'screenshot';
  teks?: string;
  gambar?: string[]; // base64 data URLs atau raw base64
  konteks?: string;
  levelMinimum?: TingkatLevel;
}

/** Paket diagnostik teknis untuk pemanggilan explainLink */
export interface PaketDiagnostikLink {
  url: string;
  levelMinimum: TingkatLevel;
  temuanAturan: Temuan[];
  safeBrowsingDitemukan?: boolean;
  umurDomainHari?: number;
}

/** Opsi pemanggilan Gemini API */
export interface GeminiOptions {
  apiKey?: string;
  timeoutMs?: number;
  model?: string;
  fetchFn?: typeof fetch;
}

/** Default timeout */
export const DEFAULT_CHAT_TIMEOUT_MS = 20_000; // 20 detik
export const DEFAULT_LINK_TIMEOUT_MS = 10_000; // 10 detik
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Memeriksa apakah teks pada posisi tertentu berada dalam konteks negasi/peringatan.
 * Sesuai Requirement 30.1, 30.2, 30.3 & design.md:
 * - "Ini tidak berarti pasti aman" -> diperbolehkan (negasi)
 * - "Link ini aman" -> dilarang (klaim pasti/kesimpulan)
 */
function isNegatedContext(clauseBefore: string): boolean {
  const breaks = clauseBefore.split(
    /[,;.!?\n]|\b(?:dan|tetapi|tapi|namun|sedangkan|padahal)\b/i
  );
  const activeClause = breaks[breaks.length - 1] || '';

  return /\b(?:tidak|bukan|belum|tanpa|tak|jangan)\b(?:\s+\w+){0,3}\s*$/i.test(
    activeClause
  );
}

/**
 * Menyesuaikan kapitalisasi kata pengganti agar sesuai dengan kata aslinya.
 */
function matchCapitalization(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;
  if (
    original[0] === original[0].toUpperCase() &&
    original[0] !== original[0].toLowerCase()
  ) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Menyaring kata terlarang ('aman', 'pasti', 'terbukti', '100%') jika digunakan sebagai kesimpulan atau vonis.
 * Mempertahankan konteks negasi/edukatif seperti "tidak berarti pasti aman" atau "tidak aman".
 */
export function filterKataTerlarang(teks: string): string {
  if (!teks || typeof teks !== 'string') return teks;

  const targetRegex =
    /(?:\b100%\s+aman\b|\bpasti\s+aman\b|\bterbukti\s+aman\b|\bpasti\s+(?:penipuan|penipu|scam|palsu|asli|resmi|benar|valid)\b|\bterbukti\s+(?:penipuan|penipu|scam|palsu|asli|resmi|benar|valid)\b|\b100%|\bpasti\b|\bterbukti\b|\baman\b)/gi;

  let hasil = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = targetRegex.exec(teks)) !== null) {
    const matchIndex = match.index;
    const matchStr = match[0];
    const clauseBefore = teks.slice(0, matchIndex);

    hasil += teks.slice(lastIndex, matchIndex);
    lastIndex = matchIndex + matchStr.length;

    // Jika kata didahului negasi (misal: "tidak berarti pasti aman"), biarkan apa adanya
    if (isNegatedContext(clauseBefore)) {
      hasil += matchStr;
      continue;
    }

    const lower = matchStr.toLowerCase();
    let replacement = '';

    if (
      lower === '100% aman' ||
      lower === 'pasti aman' ||
      lower === 'terbukti aman'
    ) {
      replacement = 'tidak ditemukan tanda bahaya';
    } else if (lower.startsWith('pasti ')) {
      const rest = matchStr.slice(6);
      const restLower = rest.toLowerCase();
      if (['penipuan', 'penipu', 'scam', 'palsu'].includes(restLower)) {
        replacement = `berindikasi ${rest}`;
      } else {
        replacement = `terindikasi ${rest}`;
      }
    } else if (lower.startsWith('terbukti ')) {
      const rest = matchStr.slice(9);
      const restLower = rest.toLowerCase();
      if (['penipuan', 'penipu', 'scam', 'palsu'].includes(restLower)) {
        replacement = `berindikasi ${rest}`;
      } else {
        replacement = `terindikasi ${rest}`;
      }
    } else if (lower === '100%') {
      replacement = 'sepenuhnya';
    } else if (lower === 'pasti') {
      replacement = 'kemungkinan besar';
    } else if (lower === 'terbukti') {
      replacement = 'terindikasi';
    } else if (lower === 'aman') {
      replacement = 'tidak ditemukan tanda bahaya';
    } else {
      replacement = matchStr;
    }

    hasil += matchCapitalization(matchStr, replacement);
  }

  hasil += teks.slice(lastIndex);
  return hasil;
}

/**
 * Menyaring keluaran FormatDataHasil untuk membersihkan kata terlarang dari kesimpulan.
 * Sesuai Requirement 30.1 & 30.3.
 */
export function filterFormatDataHasil(hasil: FormatDataHasil): FormatDataHasil {
  return {
    ...hasil,
    ringkasan: filterKataTerlarang(hasil.ringkasan),
    temuan: hasil.temuan.map((t) => ({
      ...t,
      judul: filterKataTerlarang(t.judul),
      penjelasan: filterKataTerlarang(t.penjelasan),
      // bukti dipertahankan apa adanya karena kutipan verbatim pesan
    })),
    hal_wajar: hasil.hal_wajar.map((h) => filterKataTerlarang(h)),
    langkah: hasil.langkah.map((l) => filterKataTerlarang(l)),
    batasan: filterKataTerlarang(hasil.batasan),
  };
}

/**
 * Memvalidasi apakah suatu objek sesuai dengan struktur FormatDataHasil.
 * Requirement 14.5: Validasi keluaran JSON dari AI.
 */
export function isValidFormatDataHasil(obj: unknown): obj is FormatDataHasil {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const r = obj as Record<string, unknown>;

  // Validasi properti halaman
  if (r.halaman !== 'chat' && r.halaman !== 'link' && r.halaman !== 'video') {
    return false;
  }

  // Validasi level
  if (
    r.level !== 'tinggi' &&
    r.level !== 'sedang' &&
    r.level !== 'tidak_ditemukan'
  ) {
    return false;
  }

  // Validasi ringkasan
  if (typeof r.ringkasan !== 'string' || r.ringkasan.trim().length === 0) {
    return false;
  }

  // Validasi temuan
  if (!Array.isArray(r.temuan)) {
    return false;
  }
  if (
    (r.level === 'tinggi' || r.level === 'sedang') &&
    r.temuan.length === 0
  ) {
    return false;
  }
  for (const item of r.temuan) {
    if (!item || typeof item !== 'object') return false;
    const t = item as Record<string, unknown>;
    if (typeof t.judul !== 'string' || t.judul.trim().length === 0) return false;
    if (typeof t.penjelasan !== 'string' || t.penjelasan.trim().length === 0)
      return false;
    if (typeof t.bukti !== 'string') return false;
    if (typeof t.sumber !== 'string') return false;
  }

  // Validasi hal_wajar & langkah
  if (!Array.isArray(r.hal_wajar) || !r.hal_wajar.every((h) => typeof h === 'string')) {
    return false;
  }
  if (!Array.isArray(r.langkah) || !r.langkah.every((l) => typeof l === 'string')) {
    return false;
  }

  // Validasi situasi_darurat
  if (!Array.isArray(r.situasi_darurat)) {
    return false;
  }

  // Validasi batasan & pihak_ketiga
  if (typeof r.batasan !== 'string') {
    return false;
  }
  if (!Array.isArray(r.pihak_ketiga)) {
    return false;
  }

  // Validasi status_layanan
  if (!r.status_layanan || typeof r.status_layanan !== 'object' || Array.isArray(r.status_layanan)) {
    return false;
  }

  // Validasi transkrip jika ada
  if (r.transkrip !== undefined && typeof r.transkrip !== 'string') {
    return false;
  }

  return true;
}

/**
 * Mengurai string base64 atau data URL menjadi mimeType dan raw data base64.
 */
export function parseBase64DataUrl(
  dataUrlOrBase64: string
): { mimeType: string; data: string } {
  if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') {
    return { mimeType: 'image/jpeg', data: '' };
  }
  const match = dataUrlOrBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2].trim(),
    };
  }
  return {
    mimeType: 'image/jpeg',
    data: dataUrlOrBase64.trim(),
  };
}

/**
 * Mencoba mem-parsing teks JSON (termasuk yang dibungkus markdown code fences).
 */
export function tryParseJson(raw: string): unknown {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Struktur internal bagian konten Gemini API */
interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/**
 * Helper internal untuk melakukan HTTP POST ke Gemini REST API v1beta dengan timeout terminable.
 */
async function callGeminiGenerateContent(
  systemPrompt: string,
  parts: GeminiPart[],
  options: GeminiOptions,
  defaultTimeoutMs: number
): Promise<FormatDataHasil | null> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fetcher = options.fetchFn || fetch;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: FORMAT_DATA_HASIL_JSON_SCHEMA,
      temperature: 0.2,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Gemini API timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText || typeof rawText !== 'string') {
      return null;
    }

    const parsed = tryParseJson(rawText);
    if (!isValidFormatDataHasil(parsed)) {
      return null;
    }

    // Normalisasi situasi_darurat ke nilai valid
    const validSituasi = new Set<SituasiDarurat>([
      'klik_link',
      'isi_data',
      'kirim_otp',
      'transfer',
      'akun_diambil',
    ]);
    const situasiNormal = parsed.situasi_darurat.filter((s) =>
      validSituasi.has(s as SituasiDarurat)
    ) as SituasiDarurat[];

    return {
      ...parsed,
      situasi_darurat: situasiNormal,
    };
  } catch {
    // Timeout, network error, parsing error, abort -> return null
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Menganalisis percakapan chat (teks atau tangkapan layar multimodal) via Gemini API.
 * Default timeout 20 detik (20.000 ms).
 * Return null jika gagal atau timeout agar caller fallback ke aturan lokal.
 *
 * References: Requirements 14.1, 14.4, 14.5, 25.1, 30.1, 30.2, 30.3
 */
export async function analyzeChat(
  input: AnalyzeChatInput,
  options?: GeminiOptions
): Promise<FormatDataHasil | null> {
  const systemPrompt = getChatSystemPrompt({
    konteks: input.konteks,
    levelMinimum: input.levelMinimum,
  });

  const parts: GeminiPart[] = [];

  if (
    input.mode === 'screenshot' ||
    (input.gambar && input.gambar.length > 0)
  ) {
    for (const img of input.gambar || []) {
      const parsedImg = parseBase64DataUrl(img);
      if (parsedImg.data) {
        parts.push({
          inlineData: {
            mimeType: parsedImg.mimeType,
            data: parsedImg.data,
          },
        });
      }
    }

    let instruction =
      'Analisis tangkapan layar (screenshot) percakapan di atas untuk mendeteksi indikasi penipuan. Ekstrak transkrip teks percakapan secara lengkap ke dalam properti "transkrip", lalu evaluasi tanda-tanda mencurigakan.';
    if (input.teks && input.teks.trim().length > 0) {
      instruction += `\n\nCatatan tambahan dari pengguna: "${input.teks.trim()}"`;
    }
    parts.push({ text: instruction });
  } else {
    const chatText = input.teks || '';
    parts.push({
      text: `Analisis pesan percakapan berikut untuk mendeteksi indikasi penipuan:\n\n${chatText}`,
    });
  }

  const hasilRaw = await callGeminiGenerateContent(
    systemPrompt,
    parts,
    options || {},
    DEFAULT_CHAT_TIMEOUT_MS
  );

  if (!hasilRaw) {
    return null;
  }

  // Gabung level: Sesuai Requirement 14.4, tingkat kewaspadaan akhir tidak boleh lebih rendah dari aturan lokal
  const levelAkhir = input.levelMinimum
    ? gabungLevel(input.levelMinimum, hasilRaw.level)
    : hasilRaw.level;

  const pihakKetiga = Array.from(
    new Set([...(hasilRaw.pihak_ketiga || []), 'Google Gemini'])
  );

  const statusLayanan: Record<string, StatusLayanan> = {
    ...(hasilRaw.status_layanan || {}),
    ai: 'ok',
  };

  const hasilFinal: FormatDataHasil = {
    ...hasilRaw,
    halaman: 'chat',
    level: levelAkhir,
    pihak_ketiga: pihakKetiga,
    status_layanan: statusLayanan,
  };

  return filterFormatDataHasil(hasilFinal);
}

/**
 * Menyusun penjelasan edukatif hasil pemindaian link diagnostik via Gemini API.
 * Default timeout 10 detik (10.000 ms).
 * Return null jika gagal atau timeout agar caller fallback ke teks penjelasan bawaan.
 *
 * References: Requirements 14.5, 25.1, 30.2, 30.3
 */
export async function explainLink(
  diagnostik: PaketDiagnostikLink,
  options?: GeminiOptions
): Promise<FormatDataHasil | null> {
  const temuanDiagnostik = diagnostik.temuanAturan.map(
    (t) => `[${t.sumber}] ${t.judul}: ${t.penjelasan} (bukti: ${t.bukti})`
  );
  if (diagnostik.safeBrowsingDitemukan) {
    temuanDiagnostik.push(
      'Google Safe Browsing mendeteksi ancaman malware / phishing pada link ini.'
    );
  }
  if (diagnostik.umurDomainHari !== undefined) {
    temuanDiagnostik.push(
      `Umur domain tercatat ${diagnostik.umurDomainHari} hari.`
    );
  }

  const systemPrompt = getLinkExplanationSystemPrompt({
    levelResiko: diagnostik.levelMinimum,
    temuanDiagnostik,
  });

  const promptUser = `Tulis penjelasan edukatif dan terstruktur untuk hasil pemindaian link berikut:
- URL: ${diagnostik.url}
- Level Kewaspadaan Terhitung: ${diagnostik.levelMinimum}
- Safe Browsing Terdeteksi Ancaman: ${
    diagnostik.safeBrowsingDitemukan ? 'Ya' : 'Tidak / Bersih'
  }
- Umur Domain: ${
    diagnostik.umurDomainHari !== undefined
      ? `${diagnostik.umurDomainHari} hari`
      : 'Tidak diketahui'
  }
- Daftar Temuan Teknis:
${
  diagnostik.temuanAturan.length > 0
    ? diagnostik.temuanAturan
        .map((t) => `- [${t.sumber}] ${t.judul}: ${t.penjelasan} (bukti: ${t.bukti})`)
        .join('\n')
    : '- Tidak ditemukan tanda bahaya teknis.'
}

Susun respons sebagai objek FormatDataHasil JSON yang ramah, jelas, tanpa vonis, tanpa kata terlarang, dengan minimal 2 langkah pencegahan praktis.`;

  const parts: GeminiPart[] = [{ text: promptUser }];

  const hasilRaw = await callGeminiGenerateContent(
    systemPrompt,
    parts,
    options || {},
    DEFAULT_LINK_TIMEOUT_MS
  );

  if (!hasilRaw) {
    return null;
  }

  // Gabung level: Sesuai prinsip rules-first, level tidak boleh lebih rendah dari hasil diagnostik
  const levelAkhir = gabungLevel(diagnostik.levelMinimum, hasilRaw.level);

  const pihakKetiga = new Set(hasilRaw.pihak_ketiga || []);
  pihakKetiga.add('Google Gemini');
  if (diagnostik.safeBrowsingDitemukan !== undefined) {
    pihakKetiga.add('Google Safe Browsing');
  }
  if (diagnostik.umurDomainHari !== undefined) {
    pihakKetiga.add('RDAP');
  }

  const statusLayanan: Record<string, StatusLayanan> = {
    ...(hasilRaw.status_layanan || {}),
    ai: 'ok',
  };

  const hasilFinal: FormatDataHasil = {
    ...hasilRaw,
    halaman: 'link',
    level: levelAkhir,
    pihak_ketiga: Array.from(pihakKetiga),
    status_layanan: statusLayanan,
  };

  return filterFormatDataHasil(hasilFinal);
}

/** Default timeout untuk Tanya Lanjut: 15 detik (Requirement 32.4) */
export const DEFAULT_TANYA_TIMEOUT_MS = 15_000;

/** Input untuk pemanggilan tanyaGemini */
export interface TanyaGeminiInput {
  pertanyaan: string;
  konteksHasil?: FormatDataHasil;
  riwayat?: Array<{ peran: 'pengguna' | 'asisten'; isi: string }>;
}

/**
 * Mengirimkan pertanyaan pengguna dan riwayat percakapan ke Google Gemini via REST API v1beta.
 * Menggunakan system prompt Tanya Lanjut dan menyaring kata terlarang dari respons.
 * Timeout default 15 detik. Return null jika gagal atau timeout agar caller fallback ke jawaban edukatif bawaan.
 *
 * References: Requirements 30.1, 30.2, 30.3, 31.5, 32.4
 */
export async function tanyaGemini(
  input: TanyaGeminiInput,
  options?: GeminiOptions
): Promise<string | null> {
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TANYA_TIMEOUT_MS;
  const model = options?.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fetcher = options?.fetchFn || fetch;

  const systemPrompt = getTanyaSystemPrompt({
    konteksHasil: input.konteksHasil,
  });

  // Susun multi-turn contents untuk Gemini API
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(input.riwayat)) {
    for (const r of input.riwayat) {
      if (!r || typeof r.isi !== 'string' || !r.isi.trim()) continue;
      const role = r.peran === 'asisten' ? 'model' : 'user';

      // Gemini mengharuskan konten pertama memiliki peran 'user'
      if (contents.length === 0 && role === 'model') continue;

      const prev = contents[contents.length - 1];
      if (prev && prev.role === role) {
        prev.parts.push({ text: r.isi.trim() });
      } else {
        contents.push({ role, parts: [{ text: r.isi.trim() }] });
      }
    }
  }

  // Tambahkan pertanyaan pengguna saat ini
  const userText = input.pertanyaan.trim();
  const last = contents[contents.length - 1];
  if (last && last.role === 'user') {
    last.parts.push({ text: userText });
  } else {
    contents.push({ role: 'user', parts: [{ text: userText }] });
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Gemini Tanya API timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return null;
    }

    return filterKataTerlarang(rawText.trim());
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

