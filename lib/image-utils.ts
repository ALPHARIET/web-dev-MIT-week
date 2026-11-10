export const MAKS_LEBAR_DEFAULT = 1600;
export const KUALITAS_DEFAULT = 0.85;
export const BATAS_TOTAL_UKURAN_BYTES = 4 * 1024 * 1024;

export type TipeGambar = 'jpg' | 'png' | 'webp';

export interface OpsiKompresi {
  maxLebar?: number;
  kualitas?: number;
}

export interface HasilCekUkuran {
  totalBytes: number;
  isValid: boolean;
}

export function formatUkuranBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function cekTotalUkuranGambar(files: (File | Blob)[]): HasilCekUkuran {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      totalBytes: 0,
      isValid: true,
    };
  }

  const totalBytes = files.reduce((acc, file) => {
    return acc + (file && typeof file.size === 'number' ? file.size : 0);
  }, 0);

  return {
    totalBytes,
    isValid: totalBytes <= BATAS_TOTAL_UKURAN_BYTES,
  };
}

export async function cekMagicBytesGambar(
  file: File | Blob | ArrayBuffer | Uint8Array
): Promise<TipeGambar | null> {
  if (!file) return null;

  try {
    let bytes: Uint8Array;

    if (file instanceof Uint8Array) {
      bytes = file;
    } else if (file instanceof ArrayBuffer) {
      bytes = new Uint8Array(file);
    } else if (typeof (file as Blob).slice === 'function') {
      const slice = (file as Blob).slice(0, 12);
      const buffer = await slice.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else {
      return null;
    }

    if (bytes.length < 3) {
      return null;
    }

    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'jpg';
    }

    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'png';
    }

    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'webp';
    }

    return null;
  } catch {
    return null;
  }
}

export async function kompresGambar(
  file: File | Blob,
  options?: OpsiKompresi
): Promise<Blob> {
  if (!file) {
    throw new Error('File gambar tidak boleh kosong');
  }

  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function'
  ) {
    return file;
  }

  const maxLebar =
    options?.maxLebar && options.maxLebar > 0 ? options.maxLebar : MAKS_LEBAR_DEFAULT;
  const kualitas =
    typeof options?.kualitas === 'number'
      ? Math.min(1, Math.max(0.01, options.kualitas))
      : KUALITAS_DEFAULT;

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawableSource: CanvasImageSource | null = null;
    let cleanup = () => {};

    const createBitmapFn =
      typeof window.createImageBitmap === 'function'
        ? window.createImageBitmap
        : typeof createImageBitmap === 'function'
          ? createImageBitmap
          : null;

    if (createBitmapFn) {
      try {
        const bitmap = await createBitmapFn(file);
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
        drawableSource = bitmap;
        cleanup = () => {
          bitmap.close?.();
        };
      } catch {
      }
    }

    if (
      !drawableSource &&
      typeof Image !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    ) {
      const objectUrl = URL.createObjectURL(file);
      try {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Gagal memuat gambar'));
          img.src = objectUrl;
        });
        sourceWidth = img.naturalWidth || img.width;
        sourceHeight = img.naturalHeight || img.height;
        drawableSource = img;
      } catch {
      } finally {
        if (typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(objectUrl);
        }
      }
    }

    if (!drawableSource || sourceWidth <= 0 || sourceHeight <= 0) {
      console.warn('Gagal memuat sumber gambar untuk kompresi, menggunakan file asli.');
      cleanup();
      return file;
    }

    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (sourceWidth > maxLebar) {
      targetWidth = maxLebar;
      targetHeight = Math.round((sourceHeight * maxLebar) / sourceWidth);
    }

    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Canvas 2D context tidak tersedia, menggunakan file asli.');
      cleanup();
      return file;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.drawImage(drawableSource, 0, 0, targetWidth, targetHeight);
    cleanup();

    if (typeof canvas.toBlob !== 'function') {
      console.warn('canvas.toBlob tidak didukung, menggunakan file asli.');
      return file;
    }

    const hasilBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        kualitas
      );
    });

    if (!hasilBlob) {
      console.warn('canvas.toBlob menghasilkan null, menggunakan file asli.');
      return file;
    }

    return hasilBlob;
  } catch (error) {
    console.warn('Gagal mengompresi gambar, menggunakan file asli:', error);
    return file;
  }
}
