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

export interface AnalyzeChatInput {
  mode: 'teks' | 'screenshot';
  teks?: string;
  gambar?: string[];
  konteks?: string;
  levelMinimum?: TingkatLevel;
}

export interface PaketDiagnostikLink {
  url: string;
  levelMinimum: TingkatLevel;
  temuanAturan: Temuan[];
  safeBrowsingDitemukan?: boolean;
  umurDomainHari?: number;
}

export interface GeminiOptions {
  apiKey?: string;
  timeoutMs?: number;
  model?: string;
  fetchFn?: typeof fetch;
}

export const DEFAULT_CHAT_TIMEOUT_MS = 20_000;
export const DEFAULT_LINK_TIMEOUT_MS = 10_000;
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

const PER_MODEL_TIMEOUT_MS = 6_000;
const MODEL_COOLDOWN_MS = 2 * 60 * 1000;

const FALLBACK_MODEL_POOL = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

let lastWorkingModel: string | null = null;
const failedModelsUntil = new Map<string, number>();

export const GEMINI_MODEL_CADANGAN = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'] as const;

export const JEDA_MODEL_SIBUK_MS = 120_000;

export const BATAS_PER_MODEL_MS = {
  chat: 9_000,
  link: 7_000,
  tanya: 12_000,
  media: 30_000,
} as const;

export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';

export function memakaiProxyGemini(baseUrl?: string): boolean {
  const base = (baseUrl ?? process.env.GEMINI_BASE_URL ?? '').trim();
  if (!base) return false;
  try {
    return new URL(base).hostname !== new URL(DEFAULT_GEMINI_BASE_URL).hostname;
  } catch {
    return true;
  }
}

export function resolveGeminiModel(modelInput?: string): string {
  const m = (modelInput || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  if (!memakaiProxyGemini() && /^gemini-(1\.0|1\.5|2\.0)(-|$)/.test(m)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return m;
}

function getAvailableCandidateModels(
  requestedModel: string,
  isCustomFetcher: boolean
): string[] {
  if (isCustomFetcher) {
    return [requestedModel];
  }

  const now = Date.now();
  const rawPool = Array.from(
    new Set([
      ...(lastWorkingModel ? [lastWorkingModel] : []),
      ...FALLBACK_MODEL_POOL,
      requestedModel,
    ])
  );

  const activeModels = rawPool.filter((m) => {
    const cooldownUntil = failedModelsUntil.get(m);
    return !cooldownUntil || now >= cooldownUntil;
  });

  return activeModels.length > 0 ? activeModels : rawPool;
}

function markModelSuccess(model: string): void {
  lastWorkingModel = model;
  failedModelsUntil.delete(model);
}

function markModelFailed(model: string): void {
  if (lastWorkingModel === model) {
    lastWorkingModel = null;
  }
  failedModelsUntil.set(model, Date.now() + MODEL_COOLDOWN_MS);
}

function supportsThinkingConfig(model: string): boolean {
  const lower = model.toLowerCase();
  if (lower.includes('lite') || lower.includes('gemma')) {
    return false;
  }
  return lower.includes('3.') || lower.includes('2.5');
}

const modelSibukSampai = new Map<string, number>();

export function tandaiModelSibuk(
  model: string,
  now: number = Date.now(),
  durasiMs: number = JEDA_MODEL_SIBUK_MS
): void {
  modelSibukSampai.set(model, now + durasiMs);
}

export function bacaJedaUlangGemini(teksError: string): number | undefined {
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(teksError || '');
  if (!m) return undefined;
  const ms = Math.round(parseFloat(m[1]) * 1000);
  return isFinite(ms) && ms > 0 ? ms : undefined;
}

export const BATAS_KUOTA_HABIS_MS = 60_000;

export function tandaiDariError(model: string, status: number, teksError: string): boolean {
  if (status === 429) {
    const jeda = bacaJedaUlangGemini(teksError);
    if (jeda && jeda > BATAS_KUOTA_HABIS_MS) {
      tandaiModelSibuk(model, Date.now(), jeda);
      return false;
    }
    tandaiModelSibuk(model);
    return true;
  }
  if (status === 503) {
    tandaiModelSibuk(model);
    return true;
  }
  return false;
}

export function resetModelSibuk(): void {
  modelSibukSampai.clear();
}

export function daftarModelGemini(modelInput?: string, now: number = Date.now()): string[] {
  const semua = Array.from(new Set([resolveGeminiModel(modelInput), ...GEMINI_MODEL_CADANGAN]));
  const siap = semua.filter((m) => (modelSibukSampai.get(m) ?? 0) <= now);
  return siap.length > 0 ? siap : semua;
}

export class GeminiModelTimeout extends Error {
  constructor(public model: string, public batasMs: number) {
    super(`Model ${model} tidak menjawab dalam ${batasMs}ms`);
    this.name = 'GeminiModelTimeout';
  }
}

export async function fetchModelGemini(
  fetcher: typeof fetch,
  url: string,
  init: RequestInit,
  model: string,
  batasMs: number,
  signalInduk?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let habis = false;
  const timer = setTimeout(() => {
    habis = true;
    controller.abort(new GeminiModelTimeout(model, batasMs));
  }, batasMs);
  const teruskan = () => controller.abort(signalInduk?.reason);
  if (signalInduk) {
    if (signalInduk.aborted) teruskan();
    else signalInduk.addEventListener('abort', teruskan, { once: true });
  }
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (habis && !signalInduk?.aborted) throw new GeminiModelTimeout(model, batasMs);
    throw err;
  } finally {
    clearTimeout(timer);
    signalInduk?.removeEventListener('abort', teruskan);
  }
}

export function bangunGeminiRequest(
  model: string,
  apiKey: string,
  baseUrl?: string
): { url: string; headers: Record<string, string> } {
  const proxy = memakaiProxyGemini(baseUrl);
  let base = (baseUrl ?? process.env.GEMINI_BASE_URL ?? '').trim() || DEFAULT_GEMINI_BASE_URL;
  base = base.replace(/\/+$/, '');
  if (!/\/v1(?:beta|alpha)?$/.test(base)) base += '/v1beta';
  const key = apiKey.trim();
  const namaModel = encodeURIComponent(model.trim()).replace(/%2F/gi, '/');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-goog-api-key': key };
  if (proxy) headers.Authorization = `Bearer ${key}`;
  return {
    url: `${base}/models/${namaModel}:generateContent?key=${encodeURIComponent(key)}`,
    headers,
  };
}

function isNegatedContext(clauseBefore: string): boolean {
  const breaks = clauseBefore.split(
    /[,;.!?\n]|\b(?:dan|tetapi|tapi|namun|sedangkan|padahal)\b/i
  );
  const activeClause = breaks[breaks.length - 1] || '';

  return /\b(?:tidak|bukan|belum|tanpa|tak|jangan)\b(?:\s+\w+){0,3}\s*$/i.test(
    activeClause
  );
}

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

export function filterFormatDataHasil(hasil: FormatDataHasil): FormatDataHasil {
  return {
    ...hasil,
    ringkasan: filterKataTerlarang(hasil.ringkasan),
    temuan: hasil.temuan.map((t) => ({
      ...t,
      judul: filterKataTerlarang(t.judul),
      penjelasan: filterKataTerlarang(t.penjelasan),
    })),
    hal_wajar: hasil.hal_wajar.map((h) => filterKataTerlarang(h)),
    langkah: hasil.langkah.map((l) => filterKataTerlarang(l)),
    batasan: filterKataTerlarang(hasil.batasan),
  };
}

export function isValidFormatDataHasil(obj: unknown): obj is FormatDataHasil {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }

  const r = obj as Record<string, unknown>;

  if (r.halaman !== 'chat' && r.halaman !== 'link' && r.halaman !== 'video') {
    return false;
  }

  if (
    r.level !== 'tinggi' &&
    r.level !== 'sedang' &&
    r.level !== 'tidak_ditemukan'
  ) {
    return false;
  }

  if (typeof r.ringkasan !== 'string' || r.ringkasan.trim().length === 0) {
    return false;
  }

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

  if (!Array.isArray(r.hal_wajar) || !r.hal_wajar.every((h) => typeof h === 'string')) {
    return false;
  }
  if (!Array.isArray(r.langkah) || !r.langkah.every((l) => typeof l === 'string')) {
    return false;
  }

  if (!Array.isArray(r.situasi_darurat)) {
    return false;
  }

  if (typeof r.batasan !== 'string') {
    return false;
  }
  if (!Array.isArray(r.pihak_ketiga)) {
    return false;
  }

  if (r.status_layanan !== undefined && (typeof r.status_layanan !== 'object' || Array.isArray(r.status_layanan))) {
    return false;
  }

  if (r.transkrip !== undefined && typeof r.transkrip !== 'string') {
    return false;
  }

  return true;
}

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

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

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
  const requestedModel = resolveGeminiModel(options.model);
  const isCustomFetcher = Boolean(options.fetchFn);
  const candidateModels = getAvailableCandidateModels(requestedModel, isCustomFetcher);
  const fetcher = options.fetchFn || fetch;

  try {
    for (const model of candidateModels) {
      const generationConfig: Record<string, unknown> = {
        responseMimeType: 'application/json',
        responseSchema: FORMAT_DATA_HASIL_JSON_SCHEMA,
        temperature: 0.2,
      };
      if (supportsThinkingConfig(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

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
        generationConfig,
      };

      const { url, headers } = bangunGeminiRequest(model, apiKey);

      const perModelTimeout =
        timeoutMs > 0 && timeoutMs < PER_MODEL_TIMEOUT_MS
          ? timeoutMs
          : PER_MODEL_TIMEOUT_MS;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error(`Gemini API timeout after ${perModelTimeout}ms`));
      }, perModelTimeout);

      let response: Response;
      try {
        response = await fetcher(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch {
        clearTimeout(timeoutId);
        if (!isCustomFetcher) {
          markModelFailed(model);
        }
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (!isCustomFetcher) {
          markModelFailed(model);
        }
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText || typeof rawText !== 'string') {
        continue;
      }

      const parsed = tryParseJson(rawText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        continue;
      }

      const p = parsed as Record<string, unknown>;
      if (!p.halaman) p.halaman = 'chat';
      if (!p.level) p.level = 'sedang';
      if (!p.ringkasan) p.ringkasan = 'Pemeriksaan selesai.';
      if (!Array.isArray(p.temuan)) p.temuan = [];
      if (!Array.isArray(p.hal_wajar)) p.hal_wajar = [];
      if (!Array.isArray(p.langkah)) p.langkah = [];
      if (!Array.isArray(p.situasi_darurat)) p.situasi_darurat = [];
      if (!p.batasan) p.batasan = 'Hasil analisis berdasarkan informasi yang kamu berikan dan bukan pengganti kehati-hatian atau verifikasi resmi. Selalu waspada terhadap modus penipuan yang terus berkembang.';
      if (!Array.isArray(p.pihak_ketiga)) p.pihak_ketiga = ['Google Gemini'];

      const temuanArr = p.temuan as unknown[];
      if ((p.level === 'tinggi' || p.level === 'sedang') && temuanArr.length === 0) {
        temuanArr.push({
          judul: 'Tanda mencurigakan terdeteksi',
          penjelasan: typeof p.ringkasan === 'string' ? p.ringkasan : 'Pola pesan menyerupai indikasi penipuan.',
          bukti: 'Konteks percakapan',
          sumber: 'ai',
        });
      }

      const langkahArr = p.langkah as string[];
      if (langkahArr.length < 2) {
        p.langkah = [
          'Jangan pernah membagikan kode OTP, PIN, password, atau mentransfer uang kepada pengirim.',
          'Verifikasi keaslian kontak atau akun melalui saluran resmi mandiri sebelum mengambil tindakan.',
        ];
      }

      if (!isValidFormatDataHasil(p)) {
        continue;
      }

      if (!isCustomFetcher) {
        markModelSuccess(model);
      }

      const validSituasi = new Set<SituasiDarurat>([
        'klik_link',
        'isi_data',
        'kirim_otp',
        'transfer',
        'akun_diambil',
      ]);
      const situasiNormal = (p.situasi_darurat as string[]).filter((s) =>
        validSituasi.has(s as SituasiDarurat)
      ) as SituasiDarurat[];

      const statusLayanan: Record<string, StatusLayanan> =
        p.status_layanan &&
        typeof p.status_layanan === 'object' &&
        !Array.isArray(p.status_layanan)
          ? { ...(p.status_layanan as Record<string, StatusLayanan>), ai: 'ok' }
          : { ai: 'ok' };

      const pihakKetiga = Array.isArray(p.pihak_ketiga) && p.pihak_ketiga.length > 0
        ? Array.from(new Set([...p.pihak_ketiga, 'Google Gemini']))
        : ['Google Gemini'];

      return {
        ...(p as unknown as FormatDataHasil),
        status_layanan: statusLayanan,
        pihak_ketiga: pihakKetiga,
        situasi_darurat: situasiNormal,
      };
    }

    return null;
  } catch {
    return null;
  }
}

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
- Safe Browsing Terdeteksi Ancaman: ${diagnostik.safeBrowsingDitemukan ? 'Ya' : 'Tidak / Bersih'
    }
- Umur Domain: ${diagnostik.umurDomainHari !== undefined
      ? `${diagnostik.umurDomainHari} hari`
      : 'Tidak diketahui'
    }
- Daftar Temuan Teknis:
${diagnostik.temuanAturan.length > 0
      ? diagnostik.temuanAturan
        .map((t) => `- [${t.sumber}] ${t.judul}: ${t.penjelasan} (bukti: ${t.bukti})`)
        .join('\n')
      : '- Tidak ditemukan tanda bahaya teknis.'
    }

INSTRUKSI KHUSUS UNTUK ARRAY "langkah" (WAJIB DINAMIS & KONTEKSTUAL):
- Buat 3 sampai 4 langkah tindakan praktis yang SPESIFIK sesuai konteks URL "${diagnostik.url}" dan temuan teknis di atas.
- DILARANG hanya menyalin kalimat template generik seperti "Jangan pernah mengklik, membuka, atau memasukkan data apa pun ke dalam tautan yang mencurigakan" atau "Gunakan aplikasi resmi yang diunduh dari toko aplikasi resmi".
- Sebutkan secara spesifik nama domain/host dari URL yang diperiksa, merek/instansi yang dicatut (jika ada, beserta kanal/aplikasi resminya), jenis halaman atau path URL (misal: halaman login, klaim hadiah/promo, unduhan file .apk/malware, pemendek tautan, atau alamat IP), dan tindakan konkret yang relevan dengan skenario URL tersebut.
- Jika level adalah "tidak_ditemukan", berikan 3 langkah verifikasi mandiri yang relevan khusus untuk domain "${diagnostik.url}" (misal: memeriksa kesesuaian ejaan domain di bilah alamat saat halaman dimuat, mengecek indikator koneksi HTTPS sebelum login/bertransaksi di domain tersebut, dan menyimpan alamat resminya di bookmark).

Susun respons sebagai objek FormatDataHasil JSON yang ramah, jelas, tanpa vonis, serta tanpa kata terlarang seperti klausul kesimpulan mutlak.`;

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

export const DEFAULT_TANYA_TIMEOUT_MS = 15_000;

export interface TanyaGeminiInput {
  pertanyaan: string;
  konteksHasil?: FormatDataHasil;
  riwayat?: Array<{ peran: 'pengguna' | 'asisten'; isi: string }>;
}

export async function tanyaGemini(
  input: TanyaGeminiInput,
  options?: GeminiOptions
): Promise<string | null> {
  const apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TANYA_TIMEOUT_MS;
  const requestedModel = resolveGeminiModel(options?.model);
  const isCustomFetcher = Boolean(options?.fetchFn);
  const candidateModels = getAvailableCandidateModels(requestedModel, isCustomFetcher);
  const fetcher = options?.fetchFn || fetch;

  const systemPrompt = getTanyaSystemPrompt({
    konteksHasil: input.konteksHasil,
  });

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(input.riwayat)) {
    for (const r of input.riwayat) {
      if (!r || typeof r.isi !== 'string' || !r.isi.trim()) continue;
      const role = r.peran === 'asisten' ? 'model' : 'user';

      if (contents.length === 0 && role === 'model') continue;

      const prev = contents[contents.length - 1];
      if (prev && prev.role === role) {
        prev.parts.push({ text: r.isi.trim() });
      } else {
        contents.push({ role, parts: [{ text: r.isi.trim() }] });
      }
    }
  }

  const userText = input.pertanyaan.trim();
  const last = contents[contents.length - 1];
  if (last && last.role === 'user') {
    last.parts.push({ text: userText });
  } else {
    contents.push({ role: 'user', parts: [{ text: userText }] });
  }

  try {
    for (const model of candidateModels) {
      const generationConfig: Record<string, unknown> = {
        temperature: 0.4,
      };
      if (supportsThinkingConfig(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      const payload = {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents,
        generationConfig,
      };

      const { url, headers } = bangunGeminiRequest(model, apiKey);

      const perModelTimeout =
        timeoutMs > 0 && timeoutMs < PER_MODEL_TIMEOUT_MS
          ? timeoutMs
          : PER_MODEL_TIMEOUT_MS;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort(new Error(`Gemini Tanya API timeout after ${perModelTimeout}ms`));
      }, perModelTimeout);

      let response: Response;
      try {
        response = await fetcher(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch {
        clearTimeout(timeoutId);
        if (!isCustomFetcher) {
          markModelFailed(model);
        }
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        if (!isCustomFetcher) {
          markModelFailed(model);
        }
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        continue;
      }

      if (!isCustomFetcher) {
        markModelSuccess(model);
      }

      return filterKataTerlarang(rawText.trim());
    }

    return null;
  } catch {
    return null;
  }
}

