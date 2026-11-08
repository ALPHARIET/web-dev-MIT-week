/**
 * lib/video-frame-extractor.ts
 *
 * Helper ekstraksi frame video di peramban (browser) menggunakan HTMLVideoElement
 * dan HTMLCanvasElement.
 *
 * Privasi & Keamanan (Requirement VS-06):
 * - Video utuh HANYA diproses secara lokal di perangkat pengguna melalui elemen <video> tersembunyi.
 * - Peramban mengambil 3-5 frame representatif lewat <canvas> dan mengonversinya menjadi gambar base64 JPEG.
 * - Video utuh TIDAK PERNAH dikirim ke server luar atau disimpan di backend.
 *
 * References:
 * - Requirements VS-06 (P1)
 * - PRD Aplikasi Web Cek Penipuan
 */

export interface FrameExtractionResult {
  frames: string[]; // Array base64 JPEG data URLs ("data:image/jpeg;base64,...")
  durasiDetik: number;
  jumlahFrame: number;
  lebar: number;
  tinggi: number;
}

export interface ExtractFramesOptions {
  /** Jumlah frame yang diambil (rentang 3 - 5, default: 3) */
  jumlahFrame?: number;
  /** Kualitas kompresi JPEG 0.1 - 1.0 (default: 0.75) */
  kualitasJpeg?: number;
  /** Dimensi lebar maksimum frame gambar dalam piksel untuk menghemat memori & payload (default: 640) */
  maksLebar?: number;
  /** Batas waktu pemrosesan video dalam milidetik (default: 15.000 ms) */
  timeoutMs?: number;
}

/** Format video yang umum didukung peramban modern */
export const SUPPORTED_VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'mov',
  'ogg',
  'mkv',
  'm4v',
];

/** Format audio yang didukung untuk Cek Video & Suara */
export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'aac',
  'opus',
  'flac',
];

/**
 * Memeriksa apakah nama file atau MIME type merupakan format video yang didukung.
 */
export function isSupportedVideoFormat(filenameOrType: string): boolean {
  if (!filenameOrType || typeof filenameOrType !== 'string') return false;
  const clean = filenameOrType.toLowerCase().trim();

  if (clean.startsWith('video/')) return true;

  const ext = clean.split('.').pop();
  return ext ? SUPPORTED_VIDEO_EXTENSIONS.includes(ext) : false;
}

/**
 * Memeriksa apakah nama file atau MIME type merupakan format audio yang didukung.
 */
export function isSupportedAudioFormat(filenameOrType: string): boolean {
  if (!filenameOrType || typeof filenameOrType !== 'string') return false;
  const clean = filenameOrType.toLowerCase().trim();

  if (clean.startsWith('audio/')) return true;

  const ext = clean.split('.').pop();
  return ext ? SUPPORTED_AUDIO_EXTENSIONS.includes(ext) : false;
}

/**
 * Mengekstrak 3-5 frame representatif dari file video di browser menggunakan <video> dan <canvas>.
 * File video utuh tetap berada di memori peramban lokal dan tidak dikirim ke server.
 *
 * @param fileOrBlobOrUrl Objek File/Blob video atau URL video lokal
 * @param options Opsi ekstraksi frame (jumlah frame, kualitas JPEG, maks lebar, timeout)
 * @returns Promise<FrameExtractionResult>
 */
export async function extractFramesFromVideo(
  fileOrBlobOrUrl: File | Blob | string,
  options?: ExtractFramesOptions
): Promise<FrameExtractionResult> {
  // Pastikan berjalan di lingkungan peramban
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      'Ekstraksi frame video hanya dapat dijalankan di lingkungan peramban (browser)'
    );
  }

  const rawJumlah = options?.jumlahFrame ?? 3;
  // Batasi jumlah frame dalam rentang 3 - 5 sesuai spesifikasi VS-06
  const targetFrameCount = Math.max(3, Math.min(5, Math.floor(rawJumlah)));
  const kualitasJpeg = Math.max(
    0.1,
    Math.min(1.0, options?.kualitasJpeg ?? 0.75)
  );
  const maksLebar = Math.max(160, options?.maksLebar ?? 640);
  const timeoutMs = options?.timeoutMs ?? 15000;

  let objectUrl: string | null = null;
  if (typeof fileOrBlobOrUrl === 'string') {
    objectUrl = fileOrBlobOrUrl;
  } else if (typeof URL !== 'undefined' && URL.createObjectURL) {
    objectUrl = URL.createObjectURL(fileOrBlobOrUrl);
  } else {
    throw new Error('Objek URL atau Blob video tidak valid');
  }

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  // Sembunyikan elemen video dari layout DOM
  video.style.position = 'fixed';
  video.style.top = '-9999px';
  video.style.left = '-9999px';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';

  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  try {
    // Muat metadata video
    await new Promise<void>((resolve, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(
          new Error(
            `Waktu pemrosesan metadata video habis (timeout ${timeoutMs}ms)`
          )
        );
      }, timeoutMs);

      video.onloadedmetadata = () => {
        resolve();
      };

      video.onerror = () => {
        reject(
          new Error(
            'Gagal memuat file video. Format video mungkin tidak didukung peramban.'
          )
        );
      };

      video.src = objectUrl!;
    });

    if (timeoutTimer) clearTimeout(timeoutTimer);

    const durasi =
      typeof video.duration === 'number' &&
      isFinite(video.duration) &&
      video.duration > 0
        ? video.duration
        : 1;

    // Tentukan waktu cuplikan frame terdistribusi merata (misal untuk 3 frame: 25%, 50%, 75% durasi)
    const timestamps: number[] = [];
    for (let i = 1; i <= targetFrameCount; i++) {
      const t = (i * durasi) / (targetFrameCount + 1);
      timestamps.push(Math.max(0, Math.min(durasi, t)));
    }

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Hitung dimensi canvas proporsional
    let canvasWidth = videoWidth;
    let canvasHeight = videoHeight;
    if (canvasWidth > maksLebar) {
      canvasHeight = Math.round((videoHeight * maksLebar) / videoWidth);
      canvasWidth = maksLebar;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Gagal menginisialisasi konteks 2D HTMLCanvasElement');
    }

    const frames: string[] = [];

    // Ambil setiap frame secara sekuensial pada timestamp masing-masing
    for (const time of timestamps) {
      await new Promise<void>((resolve, reject) => {
        const seekTimeout = setTimeout(() => {
          reject(new Error(`Timeout saat melompat ke detik ke-${time}`));
        }, 4000);

        video.onseeked = () => {
          clearTimeout(seekTimeout);
          resolve();
        };

        video.currentTime = time;
      });

      // Gambar frame video ke canvas lalu konversi ke JPEG base64
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', kualitasJpeg);
      frames.push(dataUrl);
    }

    return {
      frames,
      durasiDetik: durasi,
      jumlahFrame: frames.length,
      lebar: canvasWidth,
      tinggi: canvasHeight,
    };
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    // Bersihkan referensi memori object URL dan video
    if (typeof fileOrBlobOrUrl !== 'string' && objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // Abaikan kesalahan pencabutan URL jika sudah dibersihkan
      }
    }
    video.src = '';
    video.remove();
  }
}
