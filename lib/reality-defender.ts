/**
 * lib/reality-defender.ts
 *
 * Helper integrasi dengan Reality Defender API (Fitur P1).
 * Digunakan untuk mendeteksi manipulasi visual (deepfake) dan manipulasi suara (voice cloning).
 *
 * Batasan Layanan & Transparansi (Requirements VS-06, 32.3):
 * 1. Kuota gratis: maksimal 50 scan per bulan tanpa kartu kredit.
 * 2. Deteksi audio: durasi audio wajib antara 12 detik hingga 5 menit (300 detik).
 * 3. Keterbatasan bahasa: Reality Defender tidak mendukung bahasa Indonesia secara resmi.
 *    Keterbatasan ini selalu dicatat dan disampaikan secara transparan ke pengguna.
 * 4. Batas waktu (timeout): 10 detik (10.000 ms) sesuai standar design.md.
 * 5. Aturan tampilan: hasil API ditampilkan sebagai "sinyal tambahan", bukan vonis mutlak.
 *    Tingkat risiko dari konteks situasi tetap menjadi lantai minimum (tidak pernah diturunkan).
 *
 * References:
 * - Requirements VS-06 (P1), 32.3
 * - PRD Aplikasi Web Cek Penipuan
 */

export type TipeMediaRealityDefender = 'gambar' | 'audio';

export interface CheckMediaInput {
  tipe: TipeMediaRealityDefender;
  data: string; // Base64 data URL atau base64 string murni
  durasiDetik?: number; // Wajib atau disarankan untuk media audio
}

export interface RealityDefenderOptions {
  apiKey?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  simulate?: boolean;
  now?: number;
  skipRateLimit?: boolean;
  apiUrl?: string;
}

export interface RealityDefenderResult {
  status: 'ok' | 'gagal' | 'tidak_tersedia';
  ditemukan: boolean; // true jika terdeteksi indikasi manipulasi / deepfake
  skorManipulasi?: number; // Nilai 0 - 100
  tipeMedia: TipeMediaRealityDefender;
  keterangan: string;
  peringatan?: string; // Catatan transparansi (misal: batasan bahasa Indonesia)
  detail?: {
    durasiDetik?: number;
    keterbatasanBahasa?: string;
    model?: string;
    kuotaTersisaBulanIni?: number;
    [key: string]: unknown;
  };
}

/** URL endpoint default Reality Defender API */
export const REALITY_DEFENDER_API_DEFAULT_URL =
  'https://api.realitydefender.com/v1/detect';

/** Batas waktu default: 10 detik (10.000 ms) sesuai design.md */
export const DEFAULT_REALITY_DEFENDER_TIMEOUT_MS = 10000;

/** Batas kuota Reality Defender paket gratis: 50 scan per bulan */
export const REALITY_DEFENDER_RATE_LIMIT_PER_MONTH = 50;
export const REALITY_DEFENDER_WINDOW_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

/** Catatan transparansi resmi keterbatasan bahasa Indonesia pada audio */
export const CATATAN_BAHASA_INDONESIA =
  'Layanan Reality Defender saat ini tidak mendukung bahasa Indonesia secara resmi. Hasil analisis audio berbahasa Indonesia mungkin memiliki akurasi terbatas.';

/** Batasan durasi audio sesuai spesifikasi Reality Defender (12 detik - 5 menit) */
export const BATASAN_AUDIO_DETIK = {
  MIN: 12,
  MAX: 300, // 5 menit
} as const;

/** Riwayat timestamp pemanggilan API untuk rate limiting internal 50 scan/bulan */
let requestTimestamps: number[] = [];

/**
 * Mereset riwayat timestamp pemanggilan Reality Defender (terutama untuk pengujian)
 */
export function resetRealityDefenderRateLimit(): void {
  requestTimestamps = [];
}

/**
 * Mendapatkan salinan riwayat timestamp panggilan aktif
 */
export function getRealityDefenderTimestamps(): number[] {
  return [...requestTimestamps];
}

/**
 * Menghasilkan respons simulasi Reality Defender tanpa memanggil API jaringan nyata.
 * Digunakan untuk pengujian atau saat mode simulasi diaktifkan.
 *
 * @param input Data media yang diperiksa
 * @returns RealityDefenderResult simulasi
 */
export function simulateRealityDefender(
  input: CheckMediaInput
): RealityDefenderResult {
  const isAudio = input.tipe === 'audio';
  const dataLower = (input.data || '').toLowerCase();

  // Kata kunci penentu simulasi manipulasi
  const kataKunciManipulasi = [
    'manipulated',
    'deepfake',
    'fake',
    'palsu',
    'manipulasi',
    'clone',
    'sintetis',
  ];

  const terdeteksi = kataKunciManipulasi.some((kata) =>
    dataLower.includes(kata)
  );

  if (terdeteksi) {
    const skor = 86;
    return {
      status: 'ok',
      ditemukan: true,
      skorManipulasi: skor,
      tipeMedia: input.tipe,
      keterangan: `Simulasi Reality Defender: Terdeteksi indikasi manipulasi ${
        isAudio ? 'suara (voice clone)' : 'visual (deepfake)'
      } dengan skor ${skor}/100.`,
      peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      detail: {
        durasiDetik: input.durasiDetik,
        keterbatasanBahasa: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
        model: 'simulated-detector-v1',
      },
    };
  }

  const skorWajar = 14;
  return {
    status: 'ok',
    ditemukan: false,
    skorManipulasi: skorWajar,
    tipeMedia: input.tipe,
    keterangan: `Simulasi Reality Defender: Tidak terdeteksi indikasi manipulasi media yang signifikan (skor manipulasi ${skorWajar}/100).`,
    peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
    detail: {
      durasiDetik: input.durasiDetik,
      keterbatasanBahasa: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      model: 'simulated-detector-v1',
    },
  };
}

/**
 * Memeriksa manipulasi media (gambar frame atau audio) menggunakan Reality Defender API.
 *
 * Alur pemeriksaan:
 * 1. Validasi input (tipe 'gambar' | 'audio', data tidak kosong).
 * 2. Validasi durasi audio: 12 detik - 5 menit (Requirement VS-06).
 * 3. Evaluasi API Key & Mode Simulasi.
 * 4. Pengecekan kuota gratis bulanan (maks 50 scan/bulan).
 * 5. Panggilan HTTP POST ke endpoint Reality Defender dengan timeout 10 detik.
 * 6. Parsing hasil skor manipulasi dan penambahan catatan transparansi bahasa.
 *
 * @param input Data media yang akan diperiksa
 * @param options Opsi opsional (apiKey, timeoutMs, fetchFn, simulate, dll.)
 * @returns Promise<RealityDefenderResult>
 */
export async function checkMediaManipulation(
  input: CheckMediaInput,
  options?: RealityDefenderOptions
): Promise<RealityDefenderResult> {
  // 1. Validasi input
  if (
    !input ||
    (input.tipe !== 'gambar' && input.tipe !== 'audio') ||
    typeof input.data !== 'string' ||
    input.data.trim() === ''
  ) {
    return {
      status: 'gagal',
      ditemukan: false,
      tipeMedia: input?.tipe ?? 'gambar',
      keterangan: 'Data media tidak valid atau kosong',
    };
  }

  const isAudio = input.tipe === 'audio';

  // 2. Validasi batasan audio (12 detik - 5 menit / 300 detik)
  if (isAudio && typeof input.durasiDetik === 'number') {
    if (input.durasiDetik < BATASAN_AUDIO_DETIK.MIN) {
      return {
        status: 'gagal',
        ditemukan: false,
        tipeMedia: 'audio',
        keterangan: `Durasi audio terlalu pendek (${input.durasiDetik} detik). Reality Defender memerlukan audio minimal ${BATASAN_AUDIO_DETIK.MIN} detik.`,
        peringatan: CATATAN_BAHASA_INDONESIA,
        detail: {
          durasiDetik: input.durasiDetik,
          keterbatasanBahasa: CATATAN_BAHASA_INDONESIA,
        },
      };
    }

    if (input.durasiDetik > BATASAN_AUDIO_DETIK.MAX) {
      return {
        status: 'gagal',
        ditemukan: false,
        tipeMedia: 'audio',
        keterangan: `Durasi audio melebihi batas (${input.durasiDetik} detik). Maksimal durasi audio yang didukung adalah 5 menit (${BATASAN_AUDIO_DETIK.MAX} detik).`,
        peringatan: CATATAN_BAHASA_INDONESIA,
        detail: {
          durasiDetik: input.durasiDetik,
          keterbatasanBahasa: CATATAN_BAHASA_INDONESIA,
        },
      };
    }
  }

  // 3. Evaluasi API Key & Mode Simulasi
  const apiKey = (
    options?.apiKey ??
    process.env.REALITY_DEFENDER_API_KEY ??
    ''
  ).trim();

  const shouldSimulate =
    options?.simulate === true ||
    apiKey === 'simulation' ||
    (!apiKey && process.env.REALITY_DEFENDER_SIMULATE === 'true');

  if (shouldSimulate) {
    return simulateRealityDefender(input);
  }

  if (!apiKey) {
    return {
      status: 'tidak_tersedia',
      ditemukan: false,
      tipeMedia: input.tipe,
      keterangan: 'API key Reality Defender tidak tersedia',
      peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      detail: isAudio
        ? { keterbatasanBahasa: CATATAN_BAHASA_INDONESIA }
        : undefined,
    };
  }

  // 4. Rate limiting internal (maksimal 50 scan per bulan)
  const now = options?.now ?? Date.now();
  if (!options?.skipRateLimit) {
    const monthThreshold = now - REALITY_DEFENDER_WINDOW_MONTH_MS;
    // Bersihkan catatan timestamp lebih dari 30 hari
    requestTimestamps = requestTimestamps.filter((t) => t > monthThreshold);

    if (requestTimestamps.length >= REALITY_DEFENDER_RATE_LIMIT_PER_MONTH) {
      return {
        status: 'tidak_tersedia',
        ditemukan: false,
        tipeMedia: input.tipe,
        keterangan: `Batas kuota Reality Defender tercapai (maksimal ${REALITY_DEFENDER_RATE_LIMIT_PER_MONTH} scan per bulan)`,
        peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
        detail: {
          kuotaTersisaBulanIni: 0,
          keterbatasanBahasa: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
        },
      };
    }

    requestTimestamps.push(now);
  }

  // 5. Timeout dan AbortController
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REALITY_DEFENDER_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout setelah ${timeoutMs}ms`));
  }, timeoutMs);

  const fetchImpl = options?.fetchFn ?? fetch;
  const apiUrl =
    options?.apiUrl ??
    process.env.REALITY_DEFENDER_API_URL ??
    REALITY_DEFENDER_API_DEFAULT_URL;

  try {
    const response = await fetchImpl(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        type: input.tipe === 'gambar' ? 'image' : 'audio',
        data: input.data,
        duration: input.durasiDetik,
      }),
      signal: controller.signal,
    });

    // 6. Penanganan status HTTP
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          status: 'tidak_tersedia',
          ditemukan: false,
          tipeMedia: input.tipe,
          keterangan: `Layanan Reality Defender tidak tersedia (HTTP ${response.status})`,
          peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
        };
      }

      if (response.status === 429) {
        return {
          status: 'tidak_tersedia',
          ditemukan: false,
          tipeMedia: input.tipe,
          keterangan: 'Batas kuota Reality Defender terlampaui (HTTP 429)',
          peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
        };
      }

      return {
        status: 'gagal',
        ditemukan: false,
        tipeMedia: input.tipe,
        keterangan: `Permintaan ke Reality Defender API gagal (HTTP ${response.status})`,
        peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      };
    }

    // 7. Parsing respons JSON
    let data: any;
    try {
      data = await response.json();
    } catch {
      return {
        status: 'gagal',
        ditemukan: false,
        tipeMedia: input.tipe,
        keterangan: 'Format respons Reality Defender bukan JSON yang valid',
        peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      };
    }

    // Ekstrak skor manipulasi (mendukung format 0.0 - 1.0 atau 0 - 100)
    let skor: number | undefined = undefined;
    if (typeof data.score === 'number') {
      skor = data.score <= 1.0 ? Math.round(data.score * 100) : data.score;
    } else if (typeof data.manipulation_score === 'number') {
      skor =
        data.manipulation_score <= 1.0
          ? Math.round(data.manipulation_score * 100)
          : data.manipulation_score;
    } else if (typeof data.confidence === 'number') {
      skor =
        data.confidence <= 1.0
          ? Math.round(data.confidence * 100)
          : data.confidence;
    }

    const prediction = String(data.prediction || data.verdict || '').toLowerCase();
    const isManipulated =
      prediction === 'manipulated' ||
      prediction === 'fake' ||
      (typeof skor === 'number' && skor >= 50);

    const skorManipulasi =
      typeof skor === 'number' ? skor : isManipulated ? 80 : 20;

    let keterangan: string;
    if (isManipulated) {
      keterangan = `Terdeteksi indikasi manipulasi ${
        isAudio ? 'suara (voice clone)' : 'visual (deepfake)'
      } oleh Reality Defender (skor ${skorManipulasi}/100)`;
    } else {
      keterangan = `Tidak terdeteksi indikasi manipulasi media yang signifikan oleh Reality Defender (skor ${skorManipulasi}/100)`;
    }

    return {
      status: 'ok',
      ditemukan: isManipulated,
      skorManipulasi,
      tipeMedia: input.tipe,
      keterangan,
      peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      detail: {
        durasiDetik: input.durasiDetik,
        keterbatasanBahasa: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
        raw: data,
      },
    };
  } catch (error: unknown) {
    if (
      (error instanceof Error &&
        (error.name === 'AbortError' ||
          error.name === 'TimeoutError' ||
          error.message.includes('Timeout'))) ||
      controller.signal.aborted
    ) {
      return {
        status: 'gagal',
        ditemukan: false,
        tipeMedia: input.tipe,
        keterangan: `Pemeriksaan Reality Defender melebihi batas waktu (${timeoutMs} ms)`,
        peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
      };
    }

    const pesanError =
      error instanceof Error ? error.message : 'Terjadi kesalahan tidak terduga';
    return {
      status: 'gagal',
      ditemukan: false,
      tipeMedia: input.tipe,
      keterangan: `Gagal menghubungi Reality Defender API: ${pesanError}`,
      peringatan: isAudio ? CATATAN_BAHASA_INDONESIA : undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
