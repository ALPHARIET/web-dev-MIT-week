import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  kompresGambar,
  cekTotalUkuranGambar,
  cekMagicBytesGambar,
  formatUkuranBytes,
  BATAS_TOTAL_UKURAN_BYTES,
  MAKS_LEBAR_DEFAULT,
  KUALITAS_DEFAULT,
} from './image-utils';

interface MockCanvasContext {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

interface MockCanvasElement {
  width: number;
  height: number;
  getContext: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
}

interface WindowMock {
  createImageBitmap?: ReturnType<typeof vi.fn>;
}

interface DocumentMock {
  createElement: ReturnType<typeof vi.fn>;
}

interface UrlMock {
  createObjectURL: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
}

interface MockImageInstance {
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null;
  onerror: ((err: unknown) => void) | null;
  src: string;
}

type GlobalWithBrowserMocks = Omit<typeof globalThis, 'window' | 'document' | 'Image' | 'URL'> & {
  window?: WindowMock;
  document?: DocumentMock;
  Image?: unknown;
  URL?: UrlMock;
};

const browserGlobals = globalThis as unknown as GlobalWithBrowserMocks;

describe('lib/image-utils.ts (Task 7.2)', () => {
  describe('Konstanta Bawaan', () => {
    it('memiliki MAKS_LEBAR_DEFAULT = 1600', () => {
      expect(MAKS_LEBAR_DEFAULT).toBe(1600);
    });

    it('memiliki KUALITAS_DEFAULT = 0.85', () => {
      expect(KUALITAS_DEFAULT).toBe(0.85);
    });

    it('memiliki BATAS_TOTAL_UKURAN_BYTES = 4 MB (4.194.304 bytes)', () => {
      expect(BATAS_TOTAL_UKURAN_BYTES).toBe(4 * 1024 * 1024);
    });
  });

  describe('formatUkuranBytes', () => {
    it('memformat ukuran di bawah 1 KB dalam bytes (B)', () => {
      expect(formatUkuranBytes(0)).toBe('0 B');
      expect(formatUkuranBytes(512)).toBe('512 B');
      expect(formatUkuranBytes(1023)).toBe('1023 B');
    });

    it('memformat ukuran antara 1 KB dan 1 MB dalam kilobytes (KB)', () => {
      expect(formatUkuranBytes(1024)).toBe('1.0 KB');
      expect(formatUkuranBytes(2048)).toBe('2.0 KB');
      expect(formatUkuranBytes(150 * 1024)).toBe('150.0 KB');
    });

    it('memformat ukuran 1 MB ke atas dalam megabytes (MB)', () => {
      expect(formatUkuranBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatUkuranBytes(2.5 * 1024 * 1024)).toBe('2.50 MB');
      expect(formatUkuranBytes(4 * 1024 * 1024)).toBe('4.00 MB');
    });
  });

  describe('cekTotalUkuranGambar', () => {
    it('mengembalikan isValid: true dan totalBytes: 0 untuk array kosong', () => {
      const hasil = cekTotalUkuranGambar([]);
      expect(hasil.totalBytes).toBe(0);
      expect(hasil.isValid).toBe(true);
    });

    it('menghitung total ukuran satu file secara akurat', () => {
      const file = new Blob(['a'.repeat(1024)], { type: 'image/jpeg' });
      const hasil = cekTotalUkuranGambar([file]);
      expect(hasil.totalBytes).toBe(1024);
      expect(hasil.isValid).toBe(true);
    });

    it('menghitung total ukuran beberapa file secara akurat', () => {
      const file1 = new Blob(['a'.repeat(500 * 1024)]);
      const file2 = new Blob(['b'.repeat(1500 * 1024)]);
      const file3 = new Blob(['c'.repeat(1000 * 1024)]);

      const hasil = cekTotalUkuranGambar([file1, file2, file3]);
      expect(hasil.totalBytes).toBe(3000 * 1024);
      expect(hasil.isValid).toBe(true);
    });

    it('mengembalikan isValid: true saat tepat berada di batas 4 MB', () => {
      const fileTepat4MB = { size: 4 * 1024 * 1024 } as Blob;
      const hasil = cekTotalUkuranGambar([fileTepat4MB]);

      expect(hasil.totalBytes).toBe(4 * 1024 * 1024);
      expect(hasil.isValid).toBe(true);
    });

    it('mengembalikan isValid: false saat melebihi batas 4 MB meski hanya 1 byte', () => {
      const fileLebih = { size: 4 * 1024 * 1024 + 1 } as Blob;
      const hasil = cekTotalUkuranGambar([fileLebih]);

      expect(hasil.totalBytes).toBe(4 * 1024 * 1024 + 1);
      expect(hasil.isValid).toBe(false);
    });

    it('mengembalikan isValid: false saat total beberapa file melebihi 4 MB', () => {
      const file1 = { size: 2.5 * 1024 * 1024 } as Blob;
      const file2 = { size: 2.0 * 1024 * 1024 } as Blob;

      const hasil = cekTotalUkuranGambar([file1, file2]);
      expect(hasil.totalBytes).toBe(4.5 * 1024 * 1024);
      expect(hasil.isValid).toBe(false);
    });

    it('menangani input array dengan elemen tidak valid secara aman', () => {
      const hasil = cekTotalUkuranGambar([
        null as unknown as Blob,
        undefined as unknown as Blob,
        { size: 2048 } as Blob,
      ]);
      expect(hasil.totalBytes).toBe(2048);
      expect(hasil.isValid).toBe(true);
    });

    it('menangani parameter bukan array secara aman', () => {
      const hasil = cekTotalUkuranGambar(null as unknown as Blob[]);
      expect(hasil.totalBytes).toBe(0);
      expect(hasil.isValid).toBe(true);
    });
  });

  describe('cekMagicBytesGambar', () => {
    it('mengembalikan null jika input file kosong atau tidak valid', async () => {
      expect(await cekMagicBytesGambar(null as unknown as Blob)).toBeNull();
      expect(await cekMagicBytesGambar(undefined as unknown as Blob)).toBeNull();
    });

    it('mendeteksi format JPEG valid dari bytes FF D8 FF', async () => {
      const jpegBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
      ]);
      const blob = new Blob([jpegBytes], { type: 'image/jpeg' });

      expect(await cekMagicBytesGambar(blob)).toBe('jpg');
      expect(await cekMagicBytesGambar(jpegBytes)).toBe('jpg');
      expect(await cekMagicBytesGambar(jpegBytes.buffer)).toBe('jpg');
    });

    it('mendeteksi format JPEG dengan Exif marker FF D8 FF E1', async () => {
      const jpegExifBytes = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe1, 0x00, 0x18, 0x45, 0x78, 0x69, 0x66,
      ]);
      const blob = new Blob([jpegExifBytes]);

      expect(await cekMagicBytesGambar(blob)).toBe('jpg');
    });

    it('mendeteksi format PNG valid dari bytes 89 50 4E 47 0D 0A 1A 0A', async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const blob = new Blob([pngBytes], { type: 'image/png' });

      expect(await cekMagicBytesGambar(blob)).toBe('png');
      expect(await cekMagicBytesGambar(pngBytes)).toBe('png');
    });

    it('mendeteksi format WebP valid dari header RIFF...WEBP', async () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x40, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
        0x56, 0x50, 0x38, 0x20,
      ]);
      const blob = new Blob([webpBytes], { type: 'image/webp' });

      expect(await cekMagicBytesGambar(blob)).toBe('webp');
      expect(await cekMagicBytesGambar(webpBytes)).toBe('webp');
    });

    it('mengembalikan null untuk format RIFF yang bukan WebP (misalnya AVI atau WAV)', async () => {
      const aviBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x10, 0x00, 0x00, 0x00,
        0x41, 0x56, 0x49, 0x20,
      ]);
      expect(await cekMagicBytesGambar(aviBytes)).toBeNull();

      const wavBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x10, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45,
      ]);
      expect(await cekMagicBytesGambar(wavBytes)).toBeNull();
    });

    it('mengembalikan null untuk format gambar yang tidak diizinkan seperti GIF', async () => {
      const gifBytes = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
      ]);
      expect(await cekMagicBytesGambar(gifBytes)).toBeNull();
    });

    it('mengembalikan null untuk dokumen PDF', async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(await cekMagicBytesGambar(pdfBytes)).toBeNull();
    });

    it('mengembalikan null untuk file teks biasa', async () => {
      const textBlob = new Blob(['Halo ini teks biasa, bukan file gambar']);
      expect(await cekMagicBytesGambar(textBlob)).toBeNull();
    });

    it('mengembalikan null untuk file dengan panjang bytes kurang dari 3', async () => {
      const shortBytes = new Uint8Array([0xff, 0xd8]);
      expect(await cekMagicBytesGambar(shortBytes)).toBeNull();
    });

    it('mengembalikan null untuk file kosong (0 bytes)', async () => {
      const emptyBlob = new Blob([]);
      expect(await cekMagicBytesGambar(emptyBlob)).toBeNull();
    });

    it('mengembalikan null jika pembacaan stream/arrayBuffer mengalami error', async () => {
      const mockBrokenBlob = {
        slice: () => ({
          arrayBuffer: () => Promise.reject(new Error('Gagal membaca disk')),
        }),
      } as unknown as Blob;

      expect(await cekMagicBytesGambar(mockBrokenBlob)).toBeNull();
    });
  });

  describe('kompresGambar', () => {
    it('melempar error jika file tidak disediakan', async () => {
      await expect(kompresGambar(null as unknown as Blob)).rejects.toThrow(
        'File gambar tidak boleh kosong'
      );
    });

    describe('Fallback di Lingkungan Non-Browser (Node.js / SSR)', () => {
      it('mengembalikan file asli tanpa error saat berjalan di lingkungan Node.js', async () => {
        const mockFile = new Blob(['data-gambar-asli'], { type: 'image/png' });
        const hasil = await kompresGambar(mockFile);

        expect(hasil).toBe(mockFile);
      });
    });

    describe('Simulasi Kompresi di Lingkungan Browser', () => {
      const originalWindow = browserGlobals.window;
      const originalDocument = browserGlobals.document;
      const originalImage = browserGlobals.Image;
      const originalURL = browserGlobals.URL;

      let mockCanvas: MockCanvasElement;
      let mockContext: MockCanvasContext;
      let mockBlobResult: Blob;

      beforeEach(() => {
        mockBlobResult = new Blob(['jpeg-compressed-data'], { type: 'image/jpeg' });

        mockContext = {
          fillStyle: '',
          fillRect: vi.fn(),
          drawImage: vi.fn(),
        };

        mockCanvas = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(mockContext),
          toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
            callback(mockBlobResult);
          }),
        };

        browserGlobals.document = {
          createElement: vi.fn((tag: string) => {
            if (tag === 'canvas') return mockCanvas;
            return {};
          }),
        };

        browserGlobals.window = {
          createImageBitmap: vi.fn(),
        };

        browserGlobals.URL = {
          createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/mock-uuid'),
          revokeObjectURL: vi.fn(),
        };
      });

      afterEach(() => {
        browserGlobals.window = originalWindow;
        browserGlobals.document = originalDocument;
        browserGlobals.Image = originalImage;
        browserGlobals.URL = originalURL;
        vi.restoreAllMocks();
      });

      it('mengecilkan gambar yang lebarnya melebihi 1600 px ke 1600 px dengan rasio aspek tetap', async () => {
        const mockBitmap = {
          width: 3200,
          height: 1600,
          close: vi.fn(),
        };
        browserGlobals.window?.createImageBitmap?.mockResolvedValue(mockBitmap);

        const inputFile = new Blob(['sample-png-3200x1600'], { type: 'image/png' });
        const hasil = await kompresGambar(inputFile);

        expect(mockCanvas.width).toBe(1600);
        expect(mockCanvas.height).toBe(800);

        expect(mockContext.fillStyle).toBe('#FFFFFF');
        expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1600, 800);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0, 1600, 800);
        expect(mockBitmap.close).toHaveBeenCalled();

        expect(mockCanvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          'image/jpeg',
          0.85
        );

        expect(hasil).toBe(mockBlobResult);
      });

      it('mempertahankan lebar asli jika lebar gambar di bawah batas maksimal 1600 px', async () => {
        const mockBitmap = {
          width: 1200,
          height: 900,
          close: vi.fn(),
        };
        browserGlobals.window?.createImageBitmap?.mockResolvedValue(mockBitmap);

        const inputFile = new Blob(['sample-png-1200x900'], { type: 'image/png' });
        const hasil = await kompresGambar(inputFile);

        expect(mockCanvas.width).toBe(1200);
        expect(mockCanvas.height).toBe(900);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0, 1200, 900);
        expect(mockCanvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          'image/jpeg',
          0.85
        );
        expect(hasil).toBe(mockBlobResult);
      });

      it('mengikuti opsi kustom maxLebar dan kualitas jika diberikan', async () => {
        const mockBitmap = {
          width: 2000,
          height: 1000,
          close: vi.fn(),
        };
        browserGlobals.window?.createImageBitmap?.mockResolvedValue(mockBitmap);

        const inputFile = new Blob(['sample-img'], { type: 'image/jpeg' });
        const hasil = await kompresGambar(inputFile, {
          maxLebar: 800,
          kualitas: 0.7,
        });

        expect(mockCanvas.width).toBe(800);
        expect(mockCanvas.height).toBe(400);

        expect(mockCanvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          'image/jpeg',
          0.7
        );
        expect(hasil).toBe(mockBlobResult);
      });

      it('menggunakan fallback HTMLImageElement jika createImageBitmap tidak tersedia', async () => {
        if (browserGlobals.window) {
          delete (browserGlobals.window as Record<string, unknown>).createImageBitmap;
        }

        class MockImage implements MockImageInstance {
          naturalWidth = 2400;
          naturalHeight = 1200;
          onload: (() => void) | null = null;
          onerror: ((err: unknown) => void) | null = null;
          private _src = '';

          get src(): string {
            return this._src;
          }

          set src(val: string) {
            this._src = val;
            setTimeout(() => {
              this.onload?.();
            }, 0);
          }
        }
        browserGlobals.Image = MockImage;

        const inputFile = new Blob(['sample-image'], { type: 'image/png' });
        const hasil = await kompresGambar(inputFile);

        expect(browserGlobals.URL?.createObjectURL).toHaveBeenCalledWith(inputFile);
        expect(browserGlobals.URL?.revokeObjectURL).toHaveBeenCalledWith(
          'blob:http://localhost/mock-uuid'
        );

        expect(mockCanvas.width).toBe(1600);
        expect(mockCanvas.height).toBe(800);
        expect(hasil).toBe(mockBlobResult);
      });

      it('fallback ke file asli jika canvas getContext("2d") mengembalikan null', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockCanvas.getContext.mockReturnValue(null);

        const mockBitmap = { width: 1000, height: 1000, close: vi.fn() };
        browserGlobals.window?.createImageBitmap?.mockResolvedValue(mockBitmap);

        const inputFile = new Blob(['test-file']);
        const hasil = await kompresGambar(inputFile);

        expect(hasil).toBe(inputFile);
        expect(mockBitmap.close).toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Canvas 2D context tidak tersedia')
        );
      });

      it('fallback ke file asli jika canvas.toBlob mengembalikan null', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockCanvas.toBlob.mockImplementation((callback: (b: Blob | null) => void) => {
          callback(null);
        });

        const mockBitmap = { width: 1000, height: 1000, close: vi.fn() };
        browserGlobals.window?.createImageBitmap?.mockResolvedValue(mockBitmap);

        const inputFile = new Blob(['test-file']);
        const hasil = await kompresGambar(inputFile);

        expect(hasil).toBe(inputFile);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('canvas.toBlob menghasilkan null')
        );
      });

      it('fallback ke file asli jika createImageBitmap dan Image sama-sama gagal decode', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        browserGlobals.window?.createImageBitmap?.mockRejectedValue(
          new Error('Format corrupt')
        );

        class MockFailingImage implements MockImageInstance {
          naturalWidth = 0;
          naturalHeight = 0;
          onload: (() => void) | null = null;
          onerror: ((err: unknown) => void) | null = null;
          private _src = '';

          get src(): string {
            return this._src;
          }

          set src(val: string) {
            this._src = val;
            setTimeout(() => {
              this.onerror?.(new Error('Gagal decode'));
            }, 0);
          }
        }
        browserGlobals.Image = MockFailingImage;

        const inputFile = new Blob(['corrupt-file']);
        const hasil = await kompresGambar(inputFile);

        expect(hasil).toBe(inputFile);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Gagal memuat sumber gambar')
        );
      });
    });
  });
});
