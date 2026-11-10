import {
  BATAS_PER_MODEL_MS,
  GeminiModelTimeout,
  bangunGeminiRequest,
  daftarModelGemini,
  fetchModelGemini,
  tandaiModelSibuk,
  tandaiDariError,
  tryParseJson,
  filterKataTerlarang,
} from './gemini';
import { KATA_TERLARANG } from '../data/system-prompt';

export type PenilaianManipulasi = 'kuat' | 'sedang' | 'lemah' | 'tidak_bisa_dinilai';

export interface TandaMedia {
  judul: string;
  penjelasan: string;
  bukti: string;
}

export interface HasilAnalisisMediaGemini {
  penilaian_manipulasi: PenilaianManipulasi;
  skor_manipulasi: number;
  alasan_penilaian: string;
  tanda_visual: TandaMedia[];
  tanda_audio: TandaMedia[];
  ada_ucapan: boolean;
  transkrip: string;
  pola_penipuan: TandaMedia[];
  level_penipuan: 'tinggi' | 'sedang' | 'tidak_ditemukan';
  hal_wajar: string[];
  langkah: string[];
}

export interface FrameMedia {
  data: string;
  detik?: number;
}

export interface AnalisisMediaInput {
  jenis: 'video' | 'audio' | 'gambar';
  frames: FrameMedia[];
  audio?: string;
  durasiDetik?: number;
  catatan?: string;
  ringkasanKonteks?: string;
}

export interface AnalisisMediaOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export type HasilPanggilanMedia =
  | { status: 'ok'; hasil: HasilAnalisisMediaGemini; model: string }
  | { status: 'tidak_tersedia' | 'gagal'; alasan: string };

export const DEFAULT_MEDIA_TIMEOUT_MS = 55_000;
export const JEDA_ULANG_MS = 2_000;

const MIME_GAMBAR = /^image\/(jpeg|jpg|png|webp)$/i;
const MIME_AUDIO = /^audio\/(wav|x-wav|wave|mpeg|mp3|mp4|x-m4a|aac|ogg|webm|flac)$/i;

const SKEMA_TANDA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      judul: { type: 'string', description: 'Nama tanda, singkat, tanpa istilah teknis' },
      penjelasan: {
        type: 'string',
        description: 'Satu atau dua kalimat pendek untuk orang awam: apa yang terlihat/terdengar janggal dan kenapa itu mencurigakan',
      },
      bukti: {
        type: 'string',
        description: 'Lokasi bukti dalam bahasa sehari-hari: misalnya "Gambar ke-2: pinggir dagu kiri", "Menit 0:12", atau kutipan ucapan',
      },
    },
    required: ['judul', 'penjelasan', 'bukti'],
  },
};

export const SKEMA_ANALISIS_MEDIA = {
  type: 'object',
  properties: {
    penilaian_manipulasi: {
      type: 'string',
      enum: ['kuat', 'sedang', 'lemah', 'tidak_bisa_dinilai'],
      description:
        'Seberapa kuat indikasi media ini DIBUAT atau DIUBAH AI: video/gambar buatan AI sepenuhnya, wajah tempelan, atau suara tiruan. Nilai ini tidak bergantung pada niat (parodi/hiburan tetap dinilai). "tidak_bisa_dinilai" hanya jika media bukan rekaman dunia nyata sama sekali (kartun/grafis polos, layar teks) atau terlalu gelap/buram untuk dilihat.',
    },
    skor_manipulasi: {
      type: 'integer',
      description: 'Perkiraan 0-100 bahwa media ini dibuat/diubah AI. 0-30 tidak ada ciri berarti, 31-60 ada ciri meragukan, 61-100 banyak ciri kuat. Harus selaras dengan penilaian_manipulasi.',
    },
    alasan_penilaian: {
      type: 'string',
      description: 'Satu kalimat pendek untuk orang awam yang menyebut hal paling janggal. Tanpa istilah teknis.',
    },
    tanda_visual: SKEMA_TANDA,
    tanda_audio: SKEMA_TANDA,
    ada_ucapan: { type: 'boolean', description: 'true jika audio berisi ucapan manusia' },
    transkrip: {
      type: 'string',
      description: 'Transkrip ucapan apa adanya (kosongkan jika tidak ada audio/ucapan). Ganti angka OTP/PIN/rekening dengan [disensor].',
    },
    pola_penipuan: SKEMA_TANDA,
    level_penipuan: {
      type: 'string',
      enum: ['tinggi', 'sedang', 'tidak_ditemukan'],
      description: 'Tingkat kewaspadaan dari ISI pesan/ajakan (bukan dari keaslian media).',
    },
    hal_wajar: { type: 'array', items: { type: 'string' } },
    langkah: {
      type: 'array',
      items: { type: 'string' },
      description:
        '2-4 langkah praktis yang SESUAI ISI media. Jika tidak ada ajakan penipuan (misal video hiburan/parodi buatan AI), beri langkah soal tidak menyebarkan hoaks dan mengecek sumber resmi; JANGAN beri langkah anti-penipuan seperti telepon balik atau jangan transfer. Jika ada ajakan penipuan, beri langkah anti-penipuan.',
    },
  },
  propertyOrdering: [
    'tanda_visual',
    'tanda_audio',
    'alasan_penilaian',
    'penilaian_manipulasi',
    'skor_manipulasi',
    'ada_ucapan',
    'transkrip',
    'pola_penipuan',
    'level_penipuan',
    'hal_wajar',
    'langkah',
  ],
  required: [
    'penilaian_manipulasi',
    'skor_manipulasi',
    'alasan_penilaian',
    'tanda_visual',
    'tanda_audio',
    'ada_ucapan',
    'transkrip',
    'pola_penipuan',
    'level_penipuan',
    'hal_wajar',
    'langkah',
  ],
};

export const MEDIA_SYSTEM_PROMPT = `Kamu analis forensik media untuk aplikasi "Cek Penipuan" yang membantu anak muda Indonesia (18+) mengecek video, voice note, dan gambar yang mungkin dibuat AI.

Kamu menerima beberapa GAMBAR DIAM yang diambil berurutan dari satu video (lengkap dengan detiknya) dan/atau potongan SUARA. Anggap gambar-gambar itu sebagai satu video: bandingkan satu gambar dengan gambar berikutnya.

Kerjakan dua penilaian yang TERPISAH:

PENILAIAN 1 - Apakah media ini dibuat atau diubah AI? (isi penilaian_manipulasi, skor_manipulasi, tanda_visual, tanda_audio)
Nilai ini murni soal keaslian rekaman, BUKAN soal niat. Video parodi, hiburan, meme, atau iklan tetap harus dinilai "kuat" kalau ciri buatan AI-nya jelas. Jangan menurunkan penilaian hanya karena videonya terlihat lucu atau tidak berbahaya.

Ada tiga jenis media AI; periksa semuanya:
a) Video/gambar yang SELURUHNYA dibuat AI (seperti hasil Sora, Veo, Kling):
   - gerak dan benturan yang tidak masuk akal secara fisika, badan melayang, tendangan/pukulan yang tidak menyentuh tapi lawan terpental;
   - tangan, jari, kaki, sepatu, atau anggota badan yang berubah bentuk, menyatu, bertambah, atau hilang antar-gambar;
   - pakaian, logo, warna, rambut, atau aksesori yang berubah dari gambar ke gambar;
   - wajah yang terlalu mulus atau seperti lilin, mata/gigi aneh, wajah berubah identitas;
   - tulisan atau logo yang kabur dan tidak terbaca, latar yang meleleh atau berubah;
   - tampilan terlalu sinematik/terlalu bersih untuk rekaman HP biasa, debu/asap/air yang bergerak aneh;
   - tokoh terkenal (presiden, pejabat, artis) dalam adegan yang absurd atau mustahil; ini tanda kuat konten buatan AI.
b) Wajah TEMPELAN (face swap/deepfake): tepi rahang/rambut menyatu dengan latar, warna kulit wajah beda dengan leher, cahaya wajah tidak cocok dengan latar, wajah bergeser saat menoleh.
c) Suara TIRUAN: intonasi datar, tanpa tarikan napas, nada seperti robot atau terlalu rapi, jeda janggal, logat yang tidak cocok dengan orang yang diaku.

Aturan penilaian:
- "kuat" (skor 61-100): ada beberapa ciri yang jelas, atau satu ciri yang sangat jelas (misal fisika mustahil, anggota badan berubah bentuk, tokoh terkenal di adegan mustahil).
- "sedang" (skor 31-60): ada ciri yang meragukan tapi belum jelas.
- "lemah" (skor 0-30): sudah diperiksa dan terlihat seperti rekaman asli.
- "tidak_bisa_dinilai": HANYA jika media sama sekali bukan rekaman dunia nyata (kartun/grafis sederhana, tangkapan layar teks) atau terlalu gelap/buram. Wajah yang tidak terlihat dekat BUKAN alasan untuk tidak menilai; nilai dari badan, gerak, dan latar.
- Video terkompres (kotak-kotak, sedikit buram) wajar untuk video WhatsApp/TikTok dan bukan bukti AI. Jangan mengarang ciri yang tidak terlihat; setiap tanda harus menyebut gambar ke berapa atau detik ke berapa.

PENILAIAN 2 - Apakah isi ucapannya mirip modus penipuan? (isi transkrip, pola_penipuan, level_penipuan)
Hanya dari isi UCAPAN di suara: minta transfer/pulsa/voucher, minta OTP/PIN, mengaku darurat (kecelakaan, ditahan polisi, sakit), desakan waktu, minta dirahasiakan, mengaku ganti nomor, janji untung besar tanpa risiko/investasi, ajakan pindah ke WhatsApp/Telegram, minta klik link atau pasang aplikasi. Jika tidak ada ucapan, kosongkan pola_penipuan dan isi level_penipuan "tidak_ditemukan". Penilaian 2 tidak boleh memengaruhi Penilaian 1.

Gaya bahasa: untuk orang awam. Bahasa Indonesia sehari-hari, kalimat pendek, sapaan "kamu", tidak menggurui. Jangan pakai istilah teknis seperti frame, artefak, kompresi, timbre, spektral, face swap, atau model; tulis "gambar ke-2", "suaranya terdengar seperti robot", "wajahnya seperti ditempel". Sebut paling banyak 3 tanda wajah/suara dan 3 pola penipuan yang paling penting. Jangan memakai kata berikut sebagai kesimpulan: ${KATA_TERLARANG.map((k) => `"${k}"`).join(', ')}. Jangan mengulang data sensitif (OTP, PIN, nomor rekening). Isi semua kolom sesuai skema JSON.`;

function pisahDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/);
  if (!m) return null;
  return { mimeType: m[1].toLowerCase(), data: m[2].replace(/\s+/g, '') };
}

function rapikanTanda(raw: unknown, maks = 6): TandaMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t) => ({
      judul: typeof t.judul === 'string' ? filterKataTerlarang(t.judul.trim()) : '',
      penjelasan:
        typeof t.penjelasan === 'string' ? filterKataTerlarang(t.penjelasan.trim()) : '',
      bukti: typeof t.bukti === 'string' ? t.bukti.trim() : '',
    }))
    .filter((t) => t.judul.length > 0 && t.penjelasan.length > 0)
    .slice(0, maks);
}

function rapikanDaftar(raw: unknown, maks = 6): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map((s) => filterKataTerlarang(s.trim()))
    .slice(0, maks);
}

export function normalisasiHasilMedia(raw: unknown): HasilAnalisisMediaGemini | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  const penilaianValid: PenilaianManipulasi[] = ['kuat', 'sedang', 'lemah', 'tidak_bisa_dinilai'];
  const penilaian = penilaianValid.includes(r.penilaian_manipulasi as PenilaianManipulasi)
    ? (r.penilaian_manipulasi as PenilaianManipulasi)
    : null;
  if (!penilaian) return null;

  let skor = typeof r.skor_manipulasi === 'number' && isFinite(r.skor_manipulasi)
    ? r.skor_manipulasi
    : penilaian === 'kuat'
    ? 75
    : penilaian === 'sedang'
    ? 45
    : 15;
  if (skor > 0 && skor <= 1) skor = skor * 100;
  skor = Math.max(0, Math.min(100, Math.round(skor)));

  const levelValid = ['tinggi', 'sedang', 'tidak_ditemukan'] as const;
  const levelPenipuan = levelValid.includes(r.level_penipuan as (typeof levelValid)[number])
    ? (r.level_penipuan as (typeof levelValid)[number])
    : 'tidak_ditemukan';

  return {
    penilaian_manipulasi: penilaian,
    skor_manipulasi: skor,
    alasan_penilaian:
      typeof r.alasan_penilaian === 'string' && r.alasan_penilaian.trim()
        ? filterKataTerlarang(r.alasan_penilaian.trim())
        : 'Gemini tidak memberi alasan rinci.',
    tanda_visual: rapikanTanda(r.tanda_visual),
    tanda_audio: rapikanTanda(r.tanda_audio),
    ada_ucapan: r.ada_ucapan === true,
    transkrip: typeof r.transkrip === 'string' ? r.transkrip.trim().slice(0, 6000) : '',
    pola_penipuan: rapikanTanda(r.pola_penipuan),
    level_penipuan: levelPenipuan,
    hal_wajar: rapikanDaftar(r.hal_wajar, 4),
    langkah: rapikanDaftar(r.langkah, 4),
  };
}

export function susunPartsMedia(
  input: AnalisisMediaInput
): Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> {
  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  const frames = input.frames.slice(0, 12);
  frames.forEach((f, i) => {
    const p = pisahDataUrl(f.data);
    if (!p || !MIME_GAMBAR.test(p.mimeType)) return;
    const label =
      input.jenis === 'gambar'
        ? `Gambar ${i + 1}`
        : `Gambar ke-${i + 1}${typeof f.detik === 'number' ? ` (detik ${f.detik.toFixed(1)})` : ''}`;
    parts.push({ text: label });
    parts.push({ inlineData: { mimeType: p.mimeType === 'image/jpg' ? 'image/jpeg' : p.mimeType, data: p.data } });
  });

  if (input.audio) {
    const a = pisahDataUrl(input.audio);
    if (a && MIME_AUDIO.test(a.mimeType)) {
      parts.push({
        text: `Audio${typeof input.durasiDetik === 'number' ? ` (${Math.round(input.durasiDetik)} detik)` : ''}:`,
      });
      parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
    }
  }

  const jenisLabel =
    input.jenis === 'video'
      ? 'video (dikirim sebagai beberapa gambar diam + suara jika ada)'
      : input.jenis === 'audio'
      ? 'rekaman suara / voice note'
      : 'gambar / tangkapan layar video call';

  let instruksi = `Jenis media: ${jenisLabel}.\nAnalisis keaslian media ini dan isi ucapannya sesuai instruksi sistem.`;
  if (input.ringkasanKonteks) {
    instruksi += `\n\nKonteks dari pengguna: ${input.ringkasanKonteks}`;
  }
  if (input.catatan && input.catatan.trim()) {
    instruksi += `\n\nCatatan pengguna: "${input.catatan.trim().slice(0, 500)}"`;
  }
  parts.push({ text: instruksi });

  return parts;
}

export async function analisisMediaGemini(
  input: AnalisisMediaInput,
  options: AnalisisMediaOptions = {}
): Promise<HasilPanggilanMedia> {
  const apiKey = (options.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey) {
    return { status: 'tidak_tersedia', alasan: 'API key Gemini belum diatur' };
  }

  const parts = susunPartsMedia(input);
  if (!parts.some((p) => p.inlineData)) {
    return { status: 'gagal', alasan: 'Tidak ada frame atau audio yang valid untuk dianalisis' };
  }

  const fetcher = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_MEDIA_TIMEOUT_MS;
  const kandidat = daftarModelGemini(options.model);

  const payload = {
    systemInstruction: { parts: [{ text: MEDIA_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SKEMA_ANALISIS_MEDIA,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 4096 },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Gemini timeout setelah ${timeoutMs}ms`));
  }, timeoutMs);

  let alasanTerakhir = 'Gemini tidak memberi jawaban yang bisa dibaca';
  try {
    const mulai = Date.now();
    for (let putaran = 1; putaran <= 2; putaran++) {
      const daftar = putaran === 1 ? kandidat : daftarModelGemini(options.model, Number.POSITIVE_INFINITY);
      let semuaSibuk = true;
      for (const model of daftar) {
        const { url, headers } = bangunGeminiRequest(model, apiKey);

        let res: Response;
        try {
          res = await fetchModelGemini(
            fetcher,
            url,
            { method: 'POST', headers, body: JSON.stringify(payload) },
            model,
            BATAS_PER_MODEL_MS.media,
            controller.signal
          );
        } catch (err) {
          if (err instanceof GeminiModelTimeout) {
            tandaiModelSibuk(model);
            semuaSibuk = false;
            alasanTerakhir = `Gemini (${model}) sedang lambat merespons`;
            console.warn(`[analisisMediaGemini] ${err.message}, mencoba model cadangan`);
            continue;
          }
          throw err;
        }

        if (!res.ok) {
          const teksError = await res.text().catch(() => '');
          if (!tandaiDariError(model, res.status, teksError)) semuaSibuk = false;
          alasanTerakhir = `Gemini menolak permintaan (HTTP ${res.status})`;
          console.error(`[analisisMediaGemini] status=${res.status} model=${model}`);
          if (res.status === 401 || res.status === 403) break;
          continue;
        }

        const data = await res.json().catch(() => null);
        const teks: unknown = data?.candidates?.[0]?.content?.parts?.find?.(
          (p: { text?: string }) => typeof p?.text === 'string'
        )?.text;
        if (typeof teks !== 'string') {
          semuaSibuk = false;
          alasanTerakhir = 'Gemini tidak mengembalikan teks';
          continue;
        }

        const hasil = normalisasiHasilMedia(tryParseJson(teks));
        if (!hasil) {
          semuaSibuk = false;
          alasanTerakhir = 'Format jawaban Gemini tidak sesuai skema';
          continue;
        }
        return { status: 'ok', hasil, model };
      }
      if (!semuaSibuk || Date.now() - mulai > timeoutMs - 25_000) break;
      await new Promise((r) => setTimeout(r, JEDA_ULANG_MS));
    }
    return { status: 'gagal', alasan: alasanTerakhir };
  } catch (err: unknown) {
    const timeout =
      err instanceof Error && /timeout|abort/i.test(`${err.name} ${err.message}`);
    return {
      status: 'gagal',
      alasan: timeout
        ? `Gemini melebihi batas waktu (${Math.round(timeoutMs / 1000)} detik)`
        : 'Koneksi ke Gemini gagal',
    };
  } finally {
    clearTimeout(timer);
  }
}
