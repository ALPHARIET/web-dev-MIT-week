'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export type PemicuPemandu = 'fokus' | 'submit_kosong' | 'idle_8s';

export const PESAN_PEMANDU: Record<PemicuPemandu, string> = {
  fokus: 'Ketik atau tempel URL lengkap, misalnya https://nama-situs.com/promo...',
  submit_kosong: "Kolom link masih kosong. Masukkan URL atau coba tombol 'Coba contoh' di atas...",
  idle_8s: "Butuh ide link mencurigakan? Klik 'Coba contoh' untuk mencoba skenario link hadiah atau tiruan bank...",
};

export const JUDUL_PEMANDU: Record<PemicuPemandu, string> = {
  fokus: 'Panduan Pengisian Link',
  submit_kosong: 'Kolom Link Masih Kosong',
  idle_8s: 'Tips Pemeriksaan Link',
};

export interface PemanduHalamanProps {
  pemicu?: PemicuPemandu | null;
  pesan?: string;
  judul?: string;
  terbuka?: boolean;
  isOpen?: boolean;
  onTutup?: () => void;
  onClose?: () => void;
  onPemicuChange?: (pemicu: PemicuPemandu | null) => void;
  autoTutupSaatKetik?: boolean;
  autoIdle?: boolean;
  idleTimeoutMs?: number;
  className?: string;
}

export interface UsePemanduHalamanOptions {
  idleTimeoutMs?: number;
  enabled?: boolean;
  onPemicu?: (pemicu: PemicuPemandu | null) => void;
}

export function usePemanduHalaman(options?: UsePemanduHalamanOptions) {
  const { idleTimeoutMs = 8000, enabled = true, onPemicu } = options || {};
  const [pemicu, setPemicuState] = useState<PemicuPemandu | null>(null);
  const [sudahKetik, setSudahKetik] = useState<boolean>(false);
  const [ditutupManual, setDitutupManual] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setPemicu = useCallback(
    (baru: PemicuPemandu | null) => {
      setPemicuState(baru);
      onPemicu?.(baru);
    },
    [onPemicu]
  );

  useEffect(() => {
    if (!enabled || sudahKetik || ditutupManual) return;

    timerRef.current = setTimeout(() => {
      setPemicuState((prev) => {
        if (!prev && !sudahKetik && !ditutupManual) {
          onPemicu?.('idle_8s');
          return 'idle_8s';
        }
        return prev;
      });
    }, idleTimeoutMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, idleTimeoutMs, sudahKetik, ditutupManual, onPemicu]);

  const handleFokus = useCallback(() => {
    if (!enabled) return;
    setDitutupManual(false);
    setPemicu('fokus');
  }, [enabled, setPemicu]);

  const handleSubmitKosong = useCallback(() => {
    if (!enabled) return;
    setDitutupManual(false);
    setPemicu('submit_kosong');
  }, [enabled, setPemicu]);

  const handleKetik = useCallback(() => {
    setSudahKetik(true);
    setPemicu(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [setPemicu]);

  const handleTutup = useCallback(() => {
    setDitutupManual(true);
    setPemicu(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [setPemicu]);

  const resetPemandu = useCallback(() => {
    setSudahKetik(false);
    setDitutupManual(false);
    setPemicu(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [setPemicu]);

  return {
    pemicu,
    setPemicu,
    handleFokus,
    handleSubmitKosong,
    handleKetik,
    handleTutup,
    resetPemandu,
    isOpen: pemicu !== null,
  };
}

export function PemanduHalaman({
  pemicu: pemicuProp,
  pesan: pesanProp,
  judul: judulProp,
  terbuka: terbukaProp,
  isOpen: isOpenProp,
  onTutup,
  onClose,
  onPemicuChange,
  autoTutupSaatKetik = true,
  autoIdle = false,
  idleTimeoutMs = 8000,
  className = '',
}: PemanduHalamanProps): React.JSX.Element | null {
  const [pemicuInternal, setPemicuInternal] = useState<PemicuPemandu | null>(pemicuProp ?? null);
  const [terlihat, setTerlihat] = useState<boolean>(true);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pemicuProp !== undefined) {
      setPemicuInternal(pemicuProp);
      if (pemicuProp) {
        setTerlihat(true);
      }
    }
  }, [pemicuProp]);

  useEffect(() => {
    if (!autoIdle || pemicuProp) return;

    idleTimerRef.current = setTimeout(() => {
      setPemicuInternal('idle_8s');
      setTerlihat(true);
      onPemicuChange?.('idle_8s');
    }, idleTimeoutMs);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [autoIdle, pemicuProp, idleTimeoutMs, onPemicuChange]);

  useEffect(() => {
    if (!autoTutupSaatKetik || !terlihat || !pemicuInternal) return;

    const handleInput = () => {
      setTerlihat(false);
      onTutup?.();
      onClose?.();
      onPemicuChange?.(null);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTerlihat(false);
        onTutup?.();
        onClose?.();
        onPemicuChange?.(null);
      }
    };

    window.addEventListener('input', handleInput);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('input', handleInput);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [autoTutupSaatKetik, terlihat, pemicuInternal, onTutup, onClose, onPemicuChange]);

  const pemicuAktif = pemicuProp !== undefined ? pemicuProp : pemicuInternal;
  const isExplicitlyClosed = terbukaProp === false || isOpenProp === false;

  if (!terlihat || isExplicitlyClosed || !pemicuAktif) {
    return null;
  }

  const handleManualClose = () => {
    setTerlihat(false);
    onTutup?.();
    onClose?.();
    onPemicuChange?.(null);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const teksPesan = pesanProp || (pemicuAktif ? PESAN_PEMANDU[pemicuAktif] : '');
  const teksJudul = judulProp || (pemicuAktif ? JUDUL_PEMANDU[pemicuAktif] : 'Panduan Halaman');

  const gayaPemicu = {
    fokus: {
      container: 'bg-blue-50/95 border-blue-200 text-blue-950',
      ikonContainer: 'text-blue-600 bg-blue-100/80',
      badge: 'bg-blue-200/70 text-blue-800',
    },
    submit_kosong: {
      container: 'bg-amber-50/95 border-amber-300 text-amber-950',
      ikonContainer: 'text-amber-600 bg-amber-100/80',
      badge: 'bg-amber-200/70 text-amber-900',
    },
    idle_8s: {
      container: 'bg-indigo-50/95 border-indigo-200 text-indigo-950',
      ikonContainer: 'text-indigo-600 bg-indigo-100/80',
      badge: 'bg-indigo-200/70 text-indigo-800',
    },
  }[pemicuAktif] || {
    container: 'bg-blue-50/95 border-blue-200 text-blue-950',
    ikonContainer: 'text-blue-600 bg-blue-100/80',
    badge: 'bg-blue-200/70 text-blue-800',
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      data-testid="pemandu-halaman"
      data-pemicu={pemicuAktif}
      className={`relative flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border shadow-xs transition-all duration-200 animate-fadeIn ${gayaPemicu.container} ${className}`.trim()}
    >
      {/* ===== IKON SIMBOL PANDUAN ===== */}
      <div
        className={`p-2 rounded-lg shrink-0 mt-0.5 ${gayaPemicu.ikonContainer}`}
        aria-hidden="true"
        data-testid="ikon-pemandu"
      >
        {pemicuAktif === 'submit_kosong' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ) : pemicuAktif === 'idle_8s' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        )}
      </div>

      {/* ===== KONTEN TEKS PANDUAN ===== */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            data-testid="judul-pemandu"
            className="text-xs sm:text-sm font-bold tracking-tight"
          >
            {teksJudul}
          </span>
          <span
            data-testid="badge-pemandu"
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${gayaPemicu.badge}`}
          >
            panduan skrip
          </span>
        </div>
        <p
          data-testid="pesan-pemandu"
          className="text-xs sm:text-sm leading-relaxed"
        >
          {teksPesan}
        </p>
      </div>

      {/* ===== TOMBOL SILANG 'X' PENUTUP ===== */}
      <button
        type="button"
        onClick={handleManualClose}
        data-testid="tombol-tutup-pemandu"
        aria-label="Tutup panduan"
        title="Tutup panduan"
        className="shrink-0 p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 active:bg-black/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </aside>
  );
}

export default PemanduHalaman;
