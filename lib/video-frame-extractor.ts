export interface FrameExtractionResult {
  frames: string[];
  waktuDetik: number[];
  durasiDetik: number;
  jumlahFrame: number;
  lebar: number;
  tinggi: number;
}

export interface ExtractFramesOptions {
  jumlahFrame?: number;
  kualitasJpeg?: number;
  maksLebar?: number;
  timeoutMs?: number;
}

export const SUPPORTED_VIDEO_EXTENSIONS = [
  'mp4',
  'webm',
  'mov',
  'ogg',
  'mkv',
  'm4v',
];

export const SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'aac',
  'opus',
  'flac',
];

export function isSupportedVideoFormat(filenameOrType: string): boolean {
  if (!filenameOrType || typeof filenameOrType !== 'string') return false;
  const clean = filenameOrType.toLowerCase().trim();

  if (clean.startsWith('video/')) return true;

  const ext = clean.split('.').pop();
  return ext ? SUPPORTED_VIDEO_EXTENSIONS.includes(ext) : false;
}

export function isSupportedAudioFormat(filenameOrType: string): boolean {
  if (!filenameOrType || typeof filenameOrType !== 'string') return false;
  const clean = filenameOrType.toLowerCase().trim();

  if (clean.startsWith('audio/')) return true;

  const ext = clean.split('.').pop();
  return ext ? SUPPORTED_AUDIO_EXTENSIONS.includes(ext) : false;
}

export async function extractFramesFromVideo(
  fileOrBlobOrUrl: File | Blob | string,
  options?: ExtractFramesOptions
): Promise<FrameExtractionResult> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error(
      'Ekstraksi frame video hanya dapat dijalankan di lingkungan peramban (browser)'
    );
  }

  const rawJumlah = options?.jumlahFrame ?? 3;
  const targetFrameCount = Math.max(3, Math.min(12, Math.floor(rawJumlah)));
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

  video.style.position = 'fixed';
  video.style.top = '-9999px';
  video.style.left = '-9999px';
  video.style.opacity = '0';
  video.style.pointerEvents = 'none';

  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  try {
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

    const timestamps: number[] = [];
    for (let i = 1; i <= targetFrameCount; i++) {
      const t = (i * durasi) / (targetFrameCount + 1);
      timestamps.push(Math.max(0, Math.min(durasi, t)));
    }

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

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

      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', kualitasJpeg);
      frames.push(dataUrl);
    }

    return {
      frames,
      waktuDetik: timestamps.slice(0, frames.length),
      durasiDetik: durasi,
      jumlahFrame: frames.length,
      lebar: canvasWidth,
      tinggi: canvasHeight,
    };
  } finally {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (typeof fileOrBlobOrUrl !== 'string' && objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
      }
    }
    video.src = '';
    video.remove();
  }
}
