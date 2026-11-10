'use client';

import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import type { FormatDataHasil } from '@/lib/hasil';
import { sensorTeks } from '@/lib/sensor';
import merekData from '@/data/merek.json';

export interface TemplatPeringatanProps {
  hasil: FormatDataHasil;
  className?: string;
  defaultOpen?: boolean;
  onTutup?: () => void;
  tombolLabel?: string;
}

export function deteksiPihakDicatut(hasil: FormatDataHasil): string {
  const kumpulanTeks = [
    hasil.ringkasan || '',
    ...(hasil.temuan || []).map((t) => `${t.judul} ${t.penjelasan}`),
  ]
    .join(' ')
    .toLowerCase();

  if (Array.isArray(merekData?.merek)) {
    for (const m of merekData.merek) {
      const namaRegex = new RegExp(`\\b${m.nama.toLowerCase()}\\b`, 'i');
      if (namaRegex.test(kumpulanTeks)) {
        return m.nama;
      }
      if (Array.isArray(m.variasi)) {
        for (const v of m.variasi) {
          const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const variasiRegex = new RegExp(`\\b${escaped}\\b`, 'i');
          if (variasiRegex.test(kumpulanTeks)) {
            return m.nama;
          }
        }
      }
    }
  }

  if (/\b(?:kurir|paket|ekspedisi|pengiriman)\b/i.test(kumpulanTeks)) {
    return 'layanan kurir / ekspedisi paket';
  }
  if (/\b(?:tilang|kepolisian|polisi)\b/i.test(kumpulanTeks)) {
    return 'pihak kepolisian / tilang elektronik';
  }
  if (/\b(?:pajak|djp)\b/i.test(kumpulanTeks)) {
    return 'instansi perpajakan';
  }
  if (/\b(?:bank)\b/i.test(kumpulanTeks)) {
    return 'pihak bank';
  }
  if (/\b(?:ojk)\b/i.test(kumpulanTeks)) {
    return 'Otoritas Jasa Keuangan (OJK)';
  }
  if (/\b(?:lowongan|rekrutmen|hrd|pekerjaan)\b/i.test(kumpulanTeks)) {
    return 'pemberi lowongan kerja';
  }
  if (/\b(?:keluarga|kerabat|teman|kakak|adik|ayah|ibu|anak)\b/i.test(kumpulanTeks)) {
    return 'keluarga atau kenalan';
  }
  if (/\b(?:atasan|dosen|kantor)\b/i.test(kumpulanTeks)) {
    return 'atasan atau kantor';
  }
  if (/\b(?:undian|hadiah|giveaway)\b/i.test(kumpulanTeks)) {
    return 'penyelenggara undian / hadiah';
  }

  if (hasil.halaman === 'video') {
    return 'tokoh publik atau kenalan';
  }
  if (hasil.halaman === 'link') {
    return 'situs atau layanan tertentu';
  }

  return 'pihak resmi tertentu';
}

export function deteksiPermintaanModus(hasil: FormatDataHasil): string {
  const situasi = hasil.situasi_darurat || [];
  const teksJudul = (hasil.temuan || []).map((t) => t.judul).join(' ').toLowerCase();
  const teks = [
    hasil.ringkasan || '',
    ...(hasil.temuan || []).map((t) => `${t.judul} ${t.penjelasan}`),
  ]
    .join(' ')
    .toLowerCase();

  if (
    /\b(?:apk|\.apk|file apk)\b/i.test(teksJudul) ||
    /\b(?:unduh apk|pasang aplikasi|file apk)\b/i.test(teks)
  ) {
    return 'mengunduh dan memasang file APK berbahaya';
  }

  if (
    /\b(?:like|follow|tugas|komisi|pekerjaan paruh waktu)\b/i.test(teksJudul) ||
    /\b(?:tugas like|komisi like)\b/i.test(teks)
  ) {
    return 'tugas like media sosial dan setoran dana';
  }

  if (
    situasi.includes('kirim_otp') ||
    /\b(?:minta otp|kirimkan otp|kode otp|kode 6 digit|minta pin|minta password)\b/i.test(teks) ||
    /\botp\b/i.test(teksJudul)
  ) {
    return 'kode OTP, PIN, atau verifikasi rahasia';
  }

  if (
    situasi.includes('transfer') ||
    /\b(?:transfer|deposit|kirim uang|biaya di muka|talangan)\b/i.test(teks)
  ) {
    return 'transfer dana atau deposit uang';
  }

  if (
    situasi.includes('klik_link') ||
    /\b(?:klik link|buka tautan|tautan palsu|phishing)\b/i.test(teks) ||
    hasil.halaman === 'link'
  ) {
    return 'klik tautan atau link mencurigakan';
  }

  if (
    situasi.includes('isi_data') ||
    /\b(?:data pribadi|isi data|formulir|nomor kartu)\b/i.test(teks)
  ) {
    return 'pengisian data pribadi atau informasi rekening';
  }

  if (
    situasi.includes('akun_diambil') ||
    /\b(?:ambil alih|perangkat tertaut|hack)\b/i.test(teks)
  ) {
    return 'akses login atau pengambilalihan akun';
  }

  return 'transfer dana, kode OTP, atau klik tautan';
}

export function dapatkanTandaBahayaUtama(hasil: FormatDataHasil): string[] {
  if (hasil.temuan && hasil.temuan.length > 0) {
    const items = hasil.temuan
      .slice(0, 2)
      .map((t) => sensorTeks(t.judul).hasil.trim())
      .filter((judul) => judul.length > 0);

    if (items.length > 0) {
      return items;
    }
  }

  return [
    'Permintaan mendesak atau ajakan mengirim uang / kode rahasia',
    'Tautan atau nomor kontak yang tidak sesuai dengan kanal resmi',
  ];
}

export function buatTemplatPeringatan(hasil: FormatDataHasil): string {
  const pihak = deteksiPihakDicatut(hasil);
  const modus = deteksiPermintaanModus(hasil);
  const tandaList = dapatkanTandaBahayaUtama(hasil);

  const daftarTanda = tandaList.map((t) => `• ${t}`).join('\n');

  const pesan = `🚨 *Peringatan Waspada Modus Penipuan* 🚨

Hati-hati, sedang beredar pesan/tautan yang mengatasnamakan *${pihak}* dan meminta *${modus}*.

*Tanda yang perlu diwaspadai:*
${daftarTanda}

*Langkah perlindungan penting:*
1. Jangan dibalas dan jangan teruskan pesan tersebut.
2. Cek dan konfirmasi langsung lewat nomor atau kanal resmi institusi terkait.
3. Jangan pernah transfer uang, mengirim kode OTP, PIN, atau data pribadi.
4. Jangan klik link sembarangan atau unduh file aplikasi (.apk).

Mari saling mengingatkan keluarga dan rekan agar selalu waspada dan terhindar dari modus penipuan.`;

  return sensorTeks(pesan).hasil;
}

export function TemplatPeringatan({
  hasil,
  className = '',
  defaultOpen = false,
  onTutup,
  tombolLabel = 'Kirim peringatan',
}: TemplatPeringatanProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [teksPesan, setTeksPesan] = useState(() => buatTemplatPeringatan(hasil));
  const [tersalin, setTersalin] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogId = useId();
  const textareaId = useId();

  useEffect(() => {
    setTeksPesan(buatTemplatPeringatan(hasil));
  }, [hasil]);

  const handleBuka = () => {
    setIsOpen(true);
    setTersalin(false);
  };

  const handleTutup = useCallback(() => {
    setIsOpen(false);
    setTersalin(false);
    onTutup?.();
  }, [onTutup]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleTutup();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleTutup]);

  const handleSalin = async () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(teksPesan);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = teksPesan;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      setTersalin(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setTersalin(false);
      }, 2500);
    } catch {
      setTersalin(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setTersalin(false);
      }, 2500);
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(teksPesan)}`;

  return (
    <div className={`inline-block ${className}`.trim()}>
      {/* ===== TOMBOL PEMICU PEMBUKA DIALOG MODAL ===== */}
      <button
        type="button"
        data-testid="tombol-kirim-peringatan"
        onClick={handleBuka}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white text-sm sm:text-base font-semibold hover:bg-emerald-800 active:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 shadow-sm transition-colors min-h-[44px]"
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        <span>{tombolLabel}</span>
      </button>

      {/* ===== DIALOG MODAL TEMPLAT PERINGATAN ===== */}
      {isOpen && (
        <div
          data-testid="overlay-templat-peringatan"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleTutup();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`judul-${dialogId}`}
            aria-describedby={`deskripsi-${dialogId}`}
            data-testid="dialog-templat-peringatan"
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8"
          >
            {/* ===== HEADER MODAL ===== */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 shrink-0"
                  aria-hidden="true"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.4}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3
                    id={`judul-${dialogId}`}
                    className="text-base sm:text-lg font-bold text-gray-900"
                  >
                    Peringatkan Keluarga & Teman
                  </h3>
                </div>
              </div>

              {/* ===== TOMBOL SILANG TUTUP MODAL ===== */}
              <button
                type="button"
                data-testid="tombol-silang-templat"
                onClick={handleTutup}
                aria-label="Tutup dialog peringatan"
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* ===== ISI KONTEN MODAL ===== */}
            <div className="p-5 space-y-4">
              <p
                id={`deskripsi-${dialogId}`}
                className="text-xs sm:text-sm text-gray-600 leading-relaxed"
              >
                Salin atau bagikan templat pesan berikut ke grup keluarga atau rekan terdekat agar mereka terhindar dari modus penipuan serupa.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={textareaId}
                    className="text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    Templat Pesan Siap Kirim:
                  </label>
                  <span className="text-[11px] text-gray-600">
                    Bisa disunting sebelum dibagikan
                  </span>
                </div>

                <textarea
                  id={textareaId}
                  data-testid="textarea-templat-peringatan"
                  rows={9}
                  value={teksPesan}
                  onChange={(e) => setTeksPesan(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-3.5 text-xs sm:text-sm text-gray-800 font-mono leading-relaxed bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-inner resize-y transition-colors"
                  aria-label="Teks templat pesan peringatan"
                />
              </div>

              {/* ===== STATUS FEEDBACK SALIN TEKS ===== */}
              {tersalin && (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="feedback-tersalin"
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold"
                >
                  <svg
                    className="w-4 h-4 shrink-0 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Teks berhasil disalin ke clipboard!</span>
                </div>
              )}
            </div>

            {/* ===== FOOTER MODAL: TOMBOL AKSI ===== */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-5 py-4 bg-gray-50/80 border-t border-gray-200">
              {/* ===== TOMBOL SALIN TEKS ===== */}
              <button
                type="button"
                data-testid="tombol-salin-templat"
                onClick={handleSalin}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 text-xs sm:text-sm font-semibold hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 transition-colors min-h-[44px] shadow-sm"
              >
                {tersalin ? (
                  <>
                    <svg
                      className="w-4 h-4 shrink-0 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 shrink-0 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="8" y="8" width="12" height="12" rx="2" />
                      <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                    </svg>
                    <span>Salin Teks</span>
                  </>
                )}
              </button>

              {/* ===== TOMBOL BAGIKAN KE WHATSAPP ===== */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="tombol-whatsapp-templat"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs sm:text-sm font-semibold hover:bg-[#20ba59] active:bg-[#1caa50] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 transition-colors min-h-[44px] shadow-sm"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Bagikan ke WhatsApp</span>
              </a>

              {/* ===== TOMBOL TUTUP ===== */}
              <button
                type="button"
                data-testid="tombol-tutup-modal"
                onClick={handleTutup}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors min-h-[44px]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplatPeringatan;
