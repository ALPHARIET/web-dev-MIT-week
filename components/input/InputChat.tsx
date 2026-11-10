'use client';

import React, { useState, useEffect, useRef, useId } from 'react';

/**
 * Data hasil input pemeriksaan chat yang akan dikirim ke callback onSubmit.
 */
export interface ChatInputData {
  mode: 'teks' | 'screenshot';
  teks?: string;
  gambar?: File[];
  konteks?: string;
}

/** Alias untuk kompatibilitas dengan dokumen arsitektur */
export type ChatInput = ChatInputData;

/**
 * Props untuk komponen InputChat.
 */
export interface InputChatProps {
  /** Callback saat form disubmit dengan data input yang valid */
  onSubmit: (data: ChatInputData) => void | Promise<void>;
  /** Status sedang memproses pengiriman atau analisis */
  isLoading?: boolean;
  /** Nilai teks awal (misalnya diisi dari skenario contoh) */
  initialTeks?: string;
  /** Nilai konteks awal (misalnya diisi dari skenario contoh) */
  initialKonteks?: string;
  /** Kelas CSS tambahan untuk styling kustom */
  className?: string;
}

/**
 * Representasi internal file gambar yang diunggah dengan preview URL.
 */
interface GambarItem {
  id: string;
  file: File;
  previewUrl: string;
}

const MAKS_KARAKTER_TEKS = 4000;
const MAKS_KARAKTER_KONTEKS = 200;
const MAKS_JUMLAH_GAMBAR = 5;

/**
 * Memvalidasi apakah file gambar memiliki magic bytes yang valid untuk JPG, PNG, atau WebP.
 * Memeriksa isi header file secara langsung di browser tanpa bergantung pada ekstensi nama file semata.
 *
 * Magic bytes signature:
 * - JPEG/JPG: 0xFF, 0xD8, 0xFF
 * - PNG: 0x89, 0x50, 0x4E, 0x47
 * - WebP: bytes 0-3 = "RIFF" (0x52, 0x49, 0x46, 0x46) dan bytes 8-11 = "WEBP" (0x57, 0x45, 0x42, 0x50)
 *
 * References: Requirements 11.3, 11.7
 */
export async function validateImageMagicBytes(file: File): Promise<boolean> {
  try {
    const slice = file.slice(0, 12);
    let bytes: Uint8Array;

    if (typeof slice.arrayBuffer === 'function') {
      const buffer = await slice.arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else if (typeof FileReader !== 'undefined') {
      bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            resolve(new Uint8Array());
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(slice);
      });
    } else {
      return false;
    }

    if (bytes.length < 4) {
      return false;
    }

    // Cek JPEG / JPG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return true;
    }

    // Cek PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return true;
    }

    // Cek WebP: RIFF (bytes 0-3) dan WEBP (bytes 8-11)
    if (bytes.length >= 12) {
      const isRiff =
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      const isWebp =
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      if (isRiff && isWebp) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Format ukuran file ke representasi yang ramah pengguna (KB atau MB).
 */
export function formatUkuranFile(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Komponen Input Chat dengan dua tab: "Tempel teks" dan "Unggah screenshot".
 * Dilengkapi validasi panjang teks, magic bytes file, batas jumlah screenshot,
 * peringatan privasi untuk gambar, dan target sentuh minimal 44px.
 *
 * References: Requirements 11.1, 11.2, 11.3, 11.5, 11.6, 11.7, 12.3, 27.2, 27.4
 */
export function InputChat({
  onSubmit,
  isLoading = false,
  initialTeks,
  initialKonteks,
  className = '',
}: InputChatProps): React.JSX.Element {
  const [mode, setMode] = useState<'teks' | 'screenshot'>('teks');
  const [teks, setTeks] = useState<string>(initialTeks || '');
  const [konteks, setKonteks] = useState<string>(initialKonteks || '');
  const [gambarList, setGambarList] = useState<GambarItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pesanValidasi, setPesanValidasi] = useState<string | null>(null);
  const [pesanErrorFile, setPesanErrorFile] = useState<string | null>(null);
  const [isCheckingFiles, setIsCheckingFiles] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gambarListRef = useRef<GambarItem[]>(gambarList);
  gambarListRef.current = gambarList;

  const teksInputId = useId();
  const konteksInputId = useId();
  const fileInputId = useId();

  // Sinkronisasi prop initialTeks jika berubah dari luar (misal TombolContoh)
  useEffect(() => {
    if (initialTeks !== undefined) {
      setTeks(initialTeks);
      if (initialTeks.trim().length > 0) {
        setMode('teks');
        setPesanValidasi(null);
      }
    }
  }, [initialTeks]);

  // Sinkronisasi prop initialKonteks jika berubah dari luar
  useEffect(() => {
    if (initialKonteks !== undefined) {
      setKonteks(initialKonteks);
    }
  }, [initialKonteks]);

  // Bersihkan semua URL preview saat unmount agar tidak terjadi memory leak
  useEffect(() => {
    return () => {
      gambarListRef.current.forEach((item) => {
        if (
          item.previewUrl &&
          typeof window !== 'undefined' &&
          window.URL &&
          typeof window.URL.revokeObjectURL === 'function'
        ) {
          try {
            window.URL.revokeObjectURL(item.previewUrl);
          } catch {
            // Abaikan kesalahan pembatalan object URL
          }
        }
      });
    };
  }, []);

  // Validasi input kosong dan panjang
  const isTeksKosong = teks.trim().length === 0;
  const isTeksMelebihiBatas = teks.length > MAKS_KARAKTER_TEKS;
  const isScreenshotKosong = gambarList.length === 0;
  const isScreenshotMelebihiBatas = gambarList.length > MAKS_JUMLAH_GAMBAR;

  const isFormValid =
    mode === 'teks'
      ? !isTeksKosong && !isTeksMelebihiBatas
      : !isScreenshotKosong && !isScreenshotMelebihiBatas;

  const isTombolPeriksaDisabled =
    isLoading || isCheckingFiles || !isFormValid;

  /**
   * Menangani perpindahan tab
   */
  const handlePilihTab = (tabBaru: 'teks' | 'screenshot') => {
    setMode(tabBaru);
    setPesanValidasi(null);
  };

  /**
   * Membuat preview URL aman untuk browser / testing
   */
  const buatPreviewUrl = (file: File): string => {
    if (
      typeof window !== 'undefined' &&
      window.URL &&
      typeof window.URL.createObjectURL === 'function'
    ) {
      try {
        return window.URL.createObjectURL(file);
      } catch {
        return '';
      }
    }
    return '';
  };

  /**
   * Memproses daftar file gambar yang dipilih atau di-drop
   */
  const prosesPenambahanFile = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setPesanErrorFile(null);
    setIsCheckingFiles(true);

    const kuotaTersisa = MAKS_JUMLAH_GAMBAR - gambarList.length;
    let fileUntukDiproses = files;
    let adaKelebihanJumlah = false;

    if (kuotaTersisa <= 0) {
      setPesanErrorFile('Maksimal 5 gambar');
      setIsCheckingFiles(false);
      return;
    }

    if (files.length > kuotaTersisa) {
      fileUntukDiproses = files.slice(0, kuotaTersisa);
      adaKelebihanJumlah = true;
    }

    const itemBaru: GambarItem[] = [];
    let adaFormatTidakDidukung = false;

    for (const file of fileUntukDiproses) {
      const isValid = await validateImageMagicBytes(file);
      if (isValid) {
        const previewUrl = buatPreviewUrl(file);
        itemBaru.push({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          previewUrl,
        });
      } else {
        adaFormatTidakDidukung = true;
      }
    }

    if (itemBaru.length > 0) {
      setGambarList((prev) => [...prev, ...itemBaru]);
      setPesanValidasi(null);
    }

    if (adaFormatTidakDidukung && adaKelebihanJumlah) {
      setPesanErrorFile('Format file tidak didukung dan maksimal 5 gambar.');
    } else if (adaFormatTidakDidukung) {
      setPesanErrorFile('Format file tidak didukung');
    } else if (adaKelebihanJumlah) {
      setPesanErrorFile('Maksimal 5 gambar');
    }

    setIsCheckingFiles(false);

    // Reset input file agar dapat memilih file yang sama kembali jika diperlukan
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Menghapus salah satu gambar yang telah diunggah
   */
  const handleHapusGambar = (id: string) => {
    setGambarList((prev) => {
      const target = prev.find((item) => item.id === id);
      if (
        target?.previewUrl &&
        typeof window !== 'undefined' &&
        window.URL &&
        typeof window.URL.revokeObjectURL === 'function'
      ) {
        try {
          window.URL.revokeObjectURL(target.previewUrl);
        } catch {
          // Abaikan
        }
      }
      const sisa = prev.filter((item) => item.id !== id);
      if (sisa.length <= MAKS_JUMLAH_GAMBAR && pesanErrorFile === 'Maksimal 5 gambar') {
        setPesanErrorFile(null);
      }
      return sisa;
    });
  };

  /**
   * Menangani submit form
   */
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isLoading || isCheckingFiles) return;

    if (mode === 'teks') {
      if (isTeksKosong) {
        setPesanValidasi('Teks percakapan tidak boleh kosong.');
        return;
      }
      if (isTeksMelebihiBatas) {
        setPesanValidasi('Teks melebihi batas maksimal 4.000 karakter.');
        return;
      }

      setPesanValidasi(null);
      onSubmit({
        mode: 'teks',
        teks: teks.trim(),
        konteks: konteks.trim() ? konteks.trim() : undefined,
      });
    } else {
      if (isScreenshotKosong) {
        setPesanValidasi('Harap unggah minimal 1 screenshot gambar.');
        return;
      }
      if (isScreenshotMelebihiBatas) {
        setPesanValidasi('Maksimal 5 gambar yang diperbolehkan.');
        return;
      }

      setPesanValidasi(null);
      onSubmit({
        mode: 'screenshot',
        gambar: gambarList.map((g) => g.file),
        konteks: konteks.trim() ? konteks.trim() : undefined,
      });
    }
  };

  return (
    <div
      data-testid="input-chat-container"
      className={`overflow-hidden ${className}`}
    >
      {/* Tab Navigasi: Tempel teks vs Unggah screenshot (Requirement 11.1, 27.2) */}
      <div
        role="tablist"
        aria-label="Pilihan mode input chat"
        className="flex border-b border-gray-200 bg-gray-50/75 p-1 gap-1"
      >
        <button
          type="button"
          role="tab"
          id="tab-teks"
          aria-selected={mode === 'teks'}
          aria-controls="panel-teks"
          disabled={isLoading}
          onClick={() => handlePilihTab('teks')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
            mode === 'teks'
              ? 'bg-white text-blue-700 shadow-sm font-semibold border border-gray-200/60'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {/* Ikon Tab Teks */}
          <svg
            className="w-4 h-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Tempel teks</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-screenshot"
          aria-selected={mode === 'screenshot'}
          aria-controls="panel-screenshot"
          disabled={isLoading}
          onClick={() => handlePilihTab('screenshot')}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2 ${
            mode === 'screenshot'
              ? 'bg-white text-blue-700 shadow-sm font-semibold border border-gray-200/60'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {/* Ikon Tab Screenshot */}
          <svg
            className="w-4 h-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Unggah screenshot</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-6 space-y-5">
        {/* Panel Mode Teks */}
        {mode === 'teks' && (
          <div
            role="tabpanel"
            id="panel-teks"
            aria-labelledby="tab-teks"
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor={teksInputId}
                className="text-sm font-semibold text-gray-800"
              >
                Teks Percakapan Chat
              </label>
              {/* Counter Karakter Responsif (Requirement 11.2) */}
              <span
                data-testid="counter-karakter-teks"
                className={`text-xs font-mono transition-colors ${
                  isTeksMelebihiBatas ? 'text-red-600 font-bold' : 'text-gray-500'
                }`}
                aria-live="polite"
              >
                {teks.length.toLocaleString('id-ID')} / {MAKS_KARAKTER_TEKS.toLocaleString('id-ID')} karakter
              </span>
            </div>

            <textarea
              id={teksInputId}
              name="teks-chat"
              rows={6}
              disabled={isLoading}
              value={teks}
              onChange={(e) => {
                setTeks(e.target.value);
                if (pesanValidasi) setPesanValidasi(null);
              }}
              placeholder="Tempel percakapan WhatsApp, Telegram, SMS, atau chat lainnya di sini..."
              className={`w-full p-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-colors min-h-[140px] leading-relaxed resize-y ${
                isTeksMelebihiBatas
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
              } ${isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            />

            {/* Peringatan jika melebihi batas 4.000 karakter */}
            {isTeksMelebihiBatas && (
              <p
                role="alert"
                data-testid="peringatan-teks-panjang"
                className="text-xs text-red-600 font-medium flex items-center gap-1.5 pt-1"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Teks melebihi batas maksimal 4.000 karakter.</span>
              </p>
            )}
          </div>
        )}

        {/* Panel Mode Screenshot */}
        {mode === 'screenshot' && (
          <div
            role="tabpanel"
            id="panel-screenshot"
            aria-labelledby="tab-screenshot"
            className="space-y-4"
          >
            {/* Peringatan Privasi Screenshot (Requirement 12.3) */}
            <div
              role="alert"
              data-testid="peringatan-privasi-screenshot"
              className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm flex items-start gap-3"
            >
              <svg
                className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div className="space-y-1">
                <p className="font-semibold text-amber-950">Peringatan Privasi Screenshot</p>
                <p className="text-amber-900 text-xs sm:text-sm leading-relaxed">
                  Gambar screenshot tidak bisa disensor otomatis. Harap potong (crop) atau tutup
                  data pribadi seperti nomor rekening, nomor HP, atau alamat sebelum mengunggah.
                </p>
              </div>
            </div>

            {/* Area Dropzone & Input File (Requirement 11.3, 27.2, 27.4) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  prosesPenambahanFile(Array.from(e.dataTransfer.files));
                }
              }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={isLoading || isCheckingFiles || gambarList.length >= MAKS_JUMLAH_GAMBAR}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    prosesPenambahanFile(Array.from(e.target.files));
                  }
                }}
                className="sr-only"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor={fileInputId}
                    className={`inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg text-sm font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors ${
                      gambarList.length >= MAKS_JUMLAH_GAMBAR || isLoading
                        ? 'opacity-50 pointer-events-none'
                        : ''
                    }`}
                  >
                    Pilih file gambar
                  </label>
                  <p className="text-xs text-gray-500">
                    atau seret dan lepas gambar ke sini
                  </p>
                </div>

                <p className="text-xs text-gray-500">
                  Format: JPG, PNG, atau WebP (maksimal 5 gambar)
                </p>
              </div>
            </div>

            {/* Pesan Error File (Format tidak didukung / Batas 5 gambar) */}
            {pesanErrorFile && (
              <div
                role="alert"
                data-testid="error-file"
                className="text-xs text-red-600 font-medium flex items-center gap-1.5 bg-red-50 p-2.5 rounded-lg border border-red-200"
              >
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{pesanErrorFile}</span>
              </div>
            )}

            {/* Indikator Memeriksa Magic Bytes File */}
            {isCheckingFiles && (
              <p className="text-xs text-gray-500 italic flex items-center gap-1.5">
                <svg
                  className="w-3.5 h-3.5 animate-spin text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span>Memeriksa berkas gambar...</span>
              </p>
            )}

            {/* Pratinjau Thumbnail Gambar yang Diunggah */}
            {gambarList.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">
                    Gambar terunggah ({gambarList.length}/{MAKS_JUMLAH_GAMBAR})
                  </span>
                </div>

                <ul
                  data-testid="daftar-thumbnail-screenshot"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {gambarList.map((item, index) => (
                    <li
                      key={item.id}
                      data-testid={`thumbnail-item-${index}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50/50"
                    >
                      {/* Gambar Thumbnail */}
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300 flex items-center justify-center">
                        {item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.previewUrl}
                            alt={`Pratinjau ${item.file.name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-6 h-6 text-gray-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </div>

                      {/* Detail Nama & Ukuran */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium text-gray-900 truncate"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {formatUkuranFile(item.file.size)}
                        </p>
                      </div>

                      {/* Tombol Hapus Gambar (Target Sentuh Minimal 44px - Requirement 27.2) */}
                      <button
                        type="button"
                        aria-label={`Hapus gambar ${item.file.name}`}
                        disabled={isLoading}
                        onClick={() => handleHapusGambar(item.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Kolom Konteks Opsional (Requirement 11.5, 27.4) */}
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label
              htmlFor={konteksInputId}
              className="text-xs font-semibold text-gray-700"
            >
              Konteks tambahan <span className="font-normal text-gray-500">(opsional)</span>
            </label>
            <span
              data-testid="counter-karakter-konteks"
              className="text-[11px] text-gray-500 font-mono"
            >
              {konteks.length} / {MAKS_KARAKTER_KONTEKS}
            </span>
          </div>

          <input
            id={konteksInputId}
            name="konteks-chat"
            type="text"
            maxLength={MAKS_KARAKTER_KONTEKS}
            disabled={isLoading}
            value={konteks}
            onChange={(e) => setKonteks(e.target.value)}
            placeholder="Contoh: dari nomor tidak dikenal, mengaku dari bank BCA, minta transfer cepat..."
            className="w-full min-h-[44px] px-3.5 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>

        {/* Pesan Validasi Form Umum (Requirement 11.6) */}
        {pesanValidasi && (
          <div
            role="alert"
            data-testid="pesan-validasi-umum"
            className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{pesanValidasi}</span>
          </div>
        )}

        {/* Tombol Aksi Utama "Periksa" (Requirement 11.6, 27.2) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isTombolPeriksaDisabled}
            data-testid="tombol-periksa"
            aria-disabled={isTombolPeriksaDisabled}
            className={`w-full sm:w-auto min-h-[44px] px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm ${
              isTombolPeriksaDisabled
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Memeriksa...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Periksa</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InputChat;
