import React from 'react';

export type HalamanPrivasi = 'chat' | 'link' | 'video';

export interface KotakPrivasiProps {
  halaman: HalamanPrivasi;
  className?: string;
}

export interface InfoPrivasiHalaman {
  namaHalaman: string;
  layananPihakKetiga: string[];
  deskripsiLayanan: string;
  catatanTransparansi?: string;
}

/**
 * Konfigurasi informasi privasi dan pihak ketiga spesifik per halaman.
 * Sesuai Requirement 8.3, 8.4, 8.5
 */
export const DATA_PRIVASI_PER_HALAMAN: Record<HalamanPrivasi, InfoPrivasiHalaman> = {
  chat: {
    namaHalaman: 'Cek Chat',
    layananPihakKetiga: ['AI Cek Penipuan'],
    deskripsiLayanan:
      'Teks atau screenshot akan diproses oleh AI Cek Penipuan untuk dianalisis. Jangan sertakan OTP, PIN, password, atau nomor rekening. Tutup nama dan nomor HP di screenshot kalau bisa.',
  },
  link: {
    namaHalaman: 'Cek Link',
    layananPihakKetiga: ['Google Safe Browsing', 'Layanan Data Domain (RDAP)'],
    deskripsiLayanan:
      'Alamat link dikirim ke Google Safe Browsing dan layanan data domain untuk dicek. Link tidak akan kami buka.',
  },
  video: {
    namaHalaman: 'Cek Video & Suara',
    layananPihakKetiga: ['Lokal (Tanpa Server Luar)'],
    deskripsiLayanan:
      'Penilaian konteks situasi dijalankan sepenuhnya di peramban tanpa mengirim data ke server luar.',
    catatanTransparansi:
      'Jika fitur analisis media (P1) diaktifkan, frame gambar atau audio dikirim ke Reality Defender tanpa menyimpan file.',
  },
};

/**
 * Ikon Perisai dengan Gembok Privasi (Shield Lock)
 */
export function ShieldLockIcon({ className = 'w-5 h-5' }: { className?: string }): React.JSX.Element {
  return (
    <svg
      data-testid="ikon-perisai-privasi"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="10" width="6" height="5" rx="1" />
      <path d="M10 10V8a2 2 0 0 1 4 0v2" />
    </svg>
  );
}

/**
 * Ikon Peringatan Segitiga (Alert Warning)
 */
export function AlertWarningIcon({ className = 'w-5 h-5' }: { className?: string }): React.JSX.Element {
  return (
    <svg
      data-testid="ikon-peringatan"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * Ikon Centang (Checkmark) untuk Jaminan Privasi
 */
export function CheckCircleIcon({ className = 'w-4 h-4' }: { className?: string }): React.JSX.Element {
  return (
    <svg
      data-testid="ikon-centang-privasi"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Komponen KotakPrivasi
 *
 * Ditampilkan di setiap halaman cek sebelum area input (Requirement 8.1, 8.6).
 * Memuat:
 * 1. Peringatan utama perlindungan data sensitif (Requirement 8.2):
 *    "jangan masukkan OTP, PIN, password, atau nomor rekening asli"
 * 2. Daftar layanan pihak ketiga spesifik per halaman (Requirement 8.3, 8.4, 8.5):
 *    - Cek Chat: Google Gemini untuk analisis teks/screenshot
 *    - Cek Link: Google Safe Browsing & RDAP, link tidak dibuka
 *    - Cek Video & Suara: Dijalankan sepenuhnya di peramban tanpa mengirim data
 * 3. Jaminan privasi: Tanpa login, input tidak disimpan setelah sesi selesai
 * 4. Desain ramah pengguna, ikon perisai/gembok privasi, kontras WCAG AA
 *
 * References: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 27.3, 31.1, 31.3
 */
export function KotakPrivasi({
  halaman,
  className = '',
}: KotakPrivasiProps): React.JSX.Element {
  const infoHalaman = DATA_PRIVASI_PER_HALAMAN[halaman] ?? DATA_PRIVASI_PER_HALAMAN.chat;

  return (
    <aside
      role="region"
      aria-label="Pemberitahuan privasi dan layanan pihak ketiga"
      data-testid="kotak-privasi"
      data-halaman={halaman}
      className={`rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5 text-gray-900 shadow-sm transition-all duration-200 ${className}`.trim()}
    >
      {/* Header Kotak Privasi: Ikon Perisai & Judul */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm flex-shrink-0"
            aria-hidden="true"
          >
            <ShieldLockIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Privasi & Keamanan Data
            </h3>
            <p className="text-xs text-blue-800 font-medium">
              Transparansi pengolahan data untuk {infoHalaman.namaHalaman}
            </p>
          </div>
        </div>
      </div>

      {/* Peringatan Utama: Data Sensitif (Requirement 8.2) */}
      <div
        data-testid="peringatan-sensitif"
        className="rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-3.5 mb-3.5 text-amber-950 flex items-start gap-2.5"
      >
        <span className="flex-shrink-0 text-amber-700 mt-0.5" aria-hidden="true">
          <AlertWarningIcon className="w-5 h-5" />
        </span>
        <div className="text-xs sm:text-sm leading-relaxed">
          <span className="font-bold">Penting: </span>
          <span>jangan masukkan OTP, PIN, password, atau nomor rekening asli.</span>
        </div>
      </div>

      {/* Rincian Pengiriman Data & Pihak Ketiga (Requirement 8.3, 8.4, 8.5) */}
      <div
        data-testid="layanan-pihak-ketiga"
        className="rounded-xl bg-white border border-blue-100 p-3.5 sm:p-4 mb-3.5 space-y-2 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {halaman === 'chat' ? 'Pengolahan & Analisis Data AI' : 'Pengolahan Data & Layanan Luar'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {infoHalaman.layananPihakKetiga.map((layanan) => (
              <span
                key={layanan}
                data-testid="badge-layanan"
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"
              >
                {layanan}
              </span>
            ))}
          </div>
        </div>

        <p
          data-testid="deskripsi-layanan"
          className="text-xs sm:text-sm text-gray-700 leading-relaxed pt-1"
        >
          {infoHalaman.deskripsiLayanan}
        </p>

        {infoHalaman.catatanTransparansi && (
          <p
            data-testid="catatan-transparansi"
            className="text-xs text-gray-600 italic border-t border-gray-100 pt-2 leading-relaxed"
          >
            {infoHalaman.catatanTransparansi}
          </p>
        )}
      </div>

      {/* Jaminan Privasi (Tanpa Login & Input Tidak Disimpan) */}
      <div
        data-testid="jaminan-privasi"
        className="pt-1 border-t border-blue-200/60 flex items-center justify-between flex-wrap gap-2 text-xs sm:text-sm text-gray-700"
      >
        <div className="flex items-center gap-1.5 font-medium text-blue-950">
          <span className="text-emerald-700 flex-shrink-0" aria-hidden="true">
            <CheckCircleIcon className="w-4 h-4" />
          </span>
          <span>Tanpa login, input tidak disimpan setelah sesi selesai.</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600 font-medium">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
            Tanpa database pengguna
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
            Bebas pelacakan pribadi
          </span>
        </div>
      </div>
    </aside>
  );
}

export default KotakPrivasi;
