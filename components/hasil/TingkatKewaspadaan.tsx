import React from 'react';
import { TingkatLevel } from '@/lib/hasil';

export interface TingkatKewaspadaanProps {
  level: TingkatLevel;
  ringkasan?: string;
  className?: string;
}

/**
 * Ikon ShieldAlert untuk tingkat kewaspadaan tinggi (merah)
 */
export function ShieldAlertIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      data-testid="icon-tinggi"
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
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * Ikon AlertTriangle untuk tingkat kewaspadaan sedang (oranye)
 */
export function AlertTriangleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      data-testid="icon-sedang"
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
 * Ikon Info / ShieldCheckAbu untuk tingkat kewaspadaan tidak ditemukan tanda bahaya (abu-abu)
 */
export function InfoShieldIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      data-testid="icon-tidak_ditemukan"
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export interface KonfigurasiTingkat {
  label: string;
  kalimatPembuka: string;
  containerClasses: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

export const KONFIGURASI_LEVEL: Record<TingkatLevel, KonfigurasiTingkat> = {
  tinggi: {
    label: 'Waspada tinggi',
    kalimatPembuka:
      'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.',
    containerClasses: 'bg-red-50 text-red-700 border-red-300',
    icon: ShieldAlertIcon,
  },
  sedang: {
    label: 'Perlu hati-hati',
    kalimatPembuka: 'Ada tanda yang perlu kamu cek dulu sebelum lanjut.',
    containerClasses: 'bg-orange-50 text-orange-700 border-orange-300',
    icon: AlertTriangleIcon,
  },
  tidak_ditemukan: {
    label: 'Tidak ditemukan tanda bahaya',
    kalimatPembuka:
      'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.',
    containerClasses: 'bg-gray-50 text-gray-700 border-gray-300',
    icon: InfoShieldIcon,
  },
};

/**
 * Komponen TingkatKewaspadaan
 *
 * Menampilkan label, ikon visual, dan kalimat pembuka resmi sesuai tingkat kewaspadaan:
 * - Tinggi: "Waspada tinggi" (merah: bg-red-50, text-red-700, border-red-300) + ShieldAlert
 * - Sedang: "Perlu hati-hati" (oranye: bg-orange-50, text-orange-700, border-orange-300) + AlertTriangle
 * - Tidak ditemukan: "Tidak ditemukan tanda bahaya" (abu-abu, bukan hijau: bg-gray-50, text-gray-700, border-gray-300) + Info
 *
 * Aksesibilitas (WCAG AA):
 * - Level dibedakan menggunakan teks label DAN ikon, bukan hanya warna.
 * - Kontras warna memenuhi rasio WCAG AA.
 * - Memiliki atribut aria role="status" dan aria-label informatif.
 */
export function TingkatKewaspadaan({
  level,
  ringkasan,
  className = '',
}: TingkatKewaspadaanProps): React.JSX.Element {
  const config = KONFIGURASI_LEVEL[level] ?? KONFIGURASI_LEVEL.tidak_ditemukan;
  const IconComponent = config.icon;

  return (
    <div
      role="status"
      aria-label={`Tingkat kewaspadaan: ${config.label}`}
      data-level={level}
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${config.containerClasses} ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-3xl sm:text-5xl leading-none">
              {config.label}
            </h3>
          </div>
          <p className="mt-1 text-sm sm:text-base font-medium leading-relaxed">
            {config.kalimatPembuka}
          </p>
          {ringkasan && ringkasan.trim().length > 0 && (
            <p
              data-testid="ringkasan-teks"
              className="mt-3 text-sm sm:text-base leading-relaxed border-t border-current/20 pt-2 opacity-95"
            >
              {ringkasan}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TingkatKewaspadaan;
