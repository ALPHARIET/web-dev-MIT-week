/**
 * Modul Utilitas Gambar (Task 7.2)
 *
 * Menyediakan utilitas untuk pemrosesan gambar di browser:
 * - Kompresi gambar ke lebar maksimal 1.600 px, format JPEG (default kualitas 0.85)
 * - Verifikasi batas total ukuran file (< 4 MB untuk aman dari limit Vercel 4.5 MB)
 * - Deteksi tipe file biner via magic bytes (JPEG, PNG, WebP)
 *
 * References: Requirements 11.4, 26.1, 26.2, 26.3
 */

export const MAKS_LEBAR_DEFAULT = 1600;
export const KUALITAS_DEFAULT = 0.85;
export const BATAS_TOTAL_UKURAN_BYTES = 4 * 1024 * 1024; // 4 MB = 4.194.304 bytes

export type TipeGambar = 'jpg' | 'png' | 'webp';

export interface OpsiKompresi {
  maxLebar?: number;
  kualitas?: number;
}

export interface HasilCekUkuran {
  totalBytes: number;
  isValid: boolean;
}

/**
 * Format ukuran bytes ke representasi teks yang mudah dibaca (B, KB, MB).
 */
export function formatUkuranBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Memverifikasi total ukuran seluruh gambar di bawah 4 MB (batas aman Vercel 4.5 MB).
 *
 * @param files Daftar file atau blob gambar yang akan dikirim
 * @returns totalBytes dan status isValid (true jika totalBytes <= 4 MB)
 */
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

/**
 * Memeriksa header bytes biner file untuk mendeteksi tipe gambar yang valid:
 * - JPEG: `FF D8 FF`
 * - PNG:  `89 50 4E 47 0D 0A 1A 0A`
 * - WebP: `52 49 46 46` ... `57 45 42 50` (RIFF....WEBP)
 *
 * Memeriksa isi biner sebenarnya (bukan hanya ekstensi file atau MIME type).
 *
 * @param file File, Blob, ArrayBuffer, atau Uint8Array
 * @returns 'jpg' | 'png' | 'webp' jika cocok, atau null jika tidak didukung/rusak
 */
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

    // Cek JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'jpg';
    }

    // Cek PNG: 89 50 4E 47 0D 0A 1A 0A
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

    // Cek WebP: RIFF (52 49 46 46) .... WEBP (57 45 42 50)
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

/**
 * Mengompresi gambar di browser:
 * - Menyesuaikan lebar hingga maksimal 1.600 px (atau nilai opsi maxLebar) dengan aspek rasio tetap terjaga
 * - Mengonversi format ke JPEG dengan kompresi berkualitas (default: 0.85)
 * - Menggunakan HTMLCanvasElement / createImageBitmap / Image di browser
 * - Fallback aman jika berjalan di lingkungan non-browser (Node.js/SSR) atau jika kompresi gagal
 *
 * @param file File atau Blob gambar
 * @param options Pilihan opsi { maxLebar, kualitas }
 * @returns Promise<Blob> Blob hasil kompresi (format image/jpeg) atau file asli sebagai fallback
 */
export async function kompresGambar(
  file: File | Blob,
  options?: OpsiKompresi
): Promise<Blob> {
  if (!file) {
    throw new Error('File gambar tidak boleh kosong');
  }

  // Fallback aman untuk lingkungan non-browser (Node.js/SSR)
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

    // 1. Coba decode via createImageBitmap jika tersedia
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
        // Abaikan jika createImageBitmap gagal, lanjut ke fallback Image element
      }
    }

    // 2. Fallback ke HTMLImageElement jika createImageBitmap tidak tersedia/gagal
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
        // Abaikan jika pemuatan Image element juga gagal
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

    // Hitung dimensi target dengan aspek rasio tetap terjaga
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (sourceWidth > maxLebar) {
      targetWidth = maxLebar;
      targetHeight = Math.round((sourceHeight * maxLebar) / sourceWidth);
    }

    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    // Siapkan canvas
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Canvas 2D context tidak tersedia, menggunakan file asli.');
      cleanup();
      return file;
    }

    // Isi latar belakang dengan warna putih untuk menangani transparansi PNG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Gambar ulang ke canvas
    ctx.drawImage(drawableSource, 0, 0, targetWidth, targetHeight);
    cleanup();

    // Konversi ke JPEG Blob
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
