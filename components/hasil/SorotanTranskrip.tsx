'use client';

import React, { useMemo } from 'react';

export interface SorotanTranskripProps {
  transkrip: string;
  buktiList: string[];
  className?: string;
}

interface IntervalMatch {
  start: number;
  end: number;
  buktis: string[];
}

interface Segment {
  isHighlight: boolean;
  text: string;
  buktis?: string[];
}

/**
 * Escape karakter spesial regex.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Membersihkan kutipan pembungkus dan whitespace dari potongan bukti.
 */
function bersihkanKutipan(teks: string): string {
  return teks
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .trim();
}

/**
 * Memecah item bukti menjadi frasa-frasa pencarian.
 * Menangani elipsis (...) jika bukti memuat kutipan terputus.
 */
function ekstrakFrasaPencarian(
  buktiList: string[]
): Array<{ frasa: string; buktiAsli: string }> {
  const hasil: Array<{ frasa: string; buktiAsli: string }> = [];

  for (const item of buktiList) {
    if (!item || typeof item !== 'string') continue;
    const itemBersih = bersihkanKutipan(item);
    if (!itemBersih) continue;

    // Jika memuat elipsis (...) atau (…), pecah menjadi beberapa bagian
    const potongan = itemBersih
      .split(/\.{2,}|\u2026/)
      .map(bersihkanKutipan)
      .filter((p) => p.length >= 2);

    if (potongan.length > 0) {
      for (const p of potongan) {
        hasil.push({ frasa: p, buktiAsli: itemBersih });
      }
    } else if (itemBersih.length >= 2) {
      hasil.push({ frasa: itemBersih, buktiAsli: itemBersih });
    }
  }

  // Urutkan berdasarkan panjang frasa secara menurun agar frasa lebih panjang diprioritaskan
  hasil.sort((a, b) => b.frasa.length - a.frasa.length);
  return hasil;
}

/**
 * Menemukan rentang indeks (start, end) dari semua frasa di dalam transkrip
 * serta menggabungkan rentang yang tumpang tindih.
 */
function hitungRentangSorotan(
  transkrip: string,
  targetFrasa: Array<{ frasa: string; buktiAsli: string }>
): IntervalMatch[] {
  if (!transkrip || targetFrasa.length === 0) return [];

  const intervalMentah: Array<{ start: number; end: number; bukti: string }> = [];

  for (const { frasa, buktiAsli } of targetFrasa) {
    const kataList = frasa.split(/\s+/).filter(Boolean);
    if (kataList.length === 0) continue;

    // Gunakan regex case-insensitive dengan kelonggaran spasi
    const polaString = kataList.map(escapeRegex).join('\\s+');
    try {
      const regex = new RegExp(polaString, 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(transkrip)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        if (end > start) {
          intervalMentah.push({ start, end, bukti: buktiAsli });
        }

        // Hindari infinite loop pada regex zero-length match
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    } catch {
      // Fallback ke indexOf sederhana jika regex gagal
      const lowerTranskrip = transkrip.toLowerCase();
      const lowerFrasa = frasa.toLowerCase();
      let pos = 0;
      while ((pos = lowerTranskrip.indexOf(lowerFrasa, pos)) !== -1) {
        intervalMentah.push({
          start: pos,
          end: pos + frasa.length,
          bukti: buktiAsli,
        });
        pos += Math.max(1, frasa.length);
      }
    }
  }

  if (intervalMentah.length === 0) return [];

  // Urutkan berdasarkan posisi start menaik, lalu end menurun
  intervalMentah.sort((a, b) => a.start - b.start || b.end - a.end);

  // Gabungkan rentang yang beririsan atau bersebelahan
  const rentangTergabung: IntervalMatch[] = [];
  for (const item of intervalMentah) {
    if (rentangTergabung.length === 0) {
      rentangTergabung.push({
        start: item.start,
        end: item.end,
        buktis: [item.bukti],
      });
      continue;
    }

    const prev = rentangTergabung[rentangTergabung.length - 1];
    if (item.start <= prev.end) {
      // Tumpang tindih atau bersambung
      prev.end = Math.max(prev.end, item.end);
      if (!prev.buktis.includes(item.bukti)) {
        prev.buktis.push(item.bukti);
      }
    } else {
      rentangTergabung.push({
        start: item.start,
        end: item.end,
        buktis: [item.bukti],
      });
    }
  }

  return rentangTergabung;
}

/**
 * Memecah transkrip menjadi segmen teks biasa dan segmen yang disorot.
 */
function buatSegmenTeks(
  transkrip: string,
  rentang: IntervalMatch[]
): Segment[] {
  if (rentang.length === 0) {
    return [{ isHighlight: false, text: transkrip }];
  }

  const segmen: Segment[] = [];
  let cursor = 0;

  for (const r of rentang) {
    if (r.start > cursor) {
      segmen.push({
        isHighlight: false,
        text: transkrip.slice(cursor, r.start),
      });
    }
    segmen.push({
      isHighlight: true,
      text: transkrip.slice(r.start, r.end),
      buktis: r.buktis,
    });
    cursor = r.end;
  }

  if (cursor < transkrip.length) {
    segmen.push({
      isHighlight: false,
      text: transkrip.slice(cursor),
    });
  }

  return segmen;
}

/**
 * SorotanTranskrip
 *
 * Komponen untuk menampilkan transkrip pesan chat dengan sorotan (<mark>) pada
 * kalimat atau frasa pemicu temuan mencurigakan.
 *
 * Kepatuhan Desain & Aksesibilitas:
 * - Menggunakan tag `<mark>` semantik
 * - Styling amber/red berlatar kontras tinggi (WCAG AA compliant, rasio > 10:1)
 * - Menyertakan badge visual penanda temuan pada setiap sorotan
 * - Menyertakan tooltip (via atribut `title` dan aria-label) untuk pembaca layar
 *
 * References: Requirements CH-07 (P1)
 */
export function SorotanTranskrip({
  transkrip,
  buktiList,
  className = '',
}: SorotanTranskripProps): React.JSX.Element | null {
  const isKosong = !transkrip || transkrip.trim().length === 0;

  const targetFrasa = useMemo(
    () => (isKosong ? [] : ekstrakFrasaPencarian(buktiList || [])),
    [isKosong, buktiList]
  );

  const rentangSorotan = useMemo(
    () => (isKosong ? [] : hitungRentangSorotan(transkrip, targetFrasa)),
    [isKosong, transkrip, targetFrasa]
  );

  const segmenList = useMemo(
    () => (isKosong ? [] : buatSegmenTeks(transkrip, rentangSorotan)),
    [isKosong, transkrip, rentangSorotan]
  );

  // Jika transkrip kosong, tidak perlu merender apa pun
  if (isKosong) {
    return null;
  }

  const jumlahSorotan = rentangSorotan.length;

  return (
    <div
      data-testid="sorotan-transkrip"
      aria-label="Sorotan Transkrip Pesan"
      className={`rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/40 via-white to-white p-4 sm:p-5 shadow-sm space-y-3.5 ${className}`.trim()}
    >
      {/* Header Bagian Sorotan */}
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-white shrink-0 shadow-xs"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <div>
            <h4
              data-testid="judul-sorotan-transkrip"
              className="text-sm sm:text-base font-bold text-gray-900 tracking-tight"
            >
              Sorotan Bukti Percakapan
            </h4>
            <p className="text-xs text-gray-600 leading-snug">
              Bagian berlatar warna menandai kalimat atau frasa yang memicu temuan mencurigakan.
            </p>
          </div>
        </div>

        {jumlahSorotan > 0 && (
          <span
            data-testid="badge-jumlah-sorotan"
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300"
            aria-label={`${jumlahSorotan} kalimat pemicu disorot`}
          >
            {jumlahSorotan} pemicu disorot
          </span>
        )}
      </div>

      {/* Kotak Transkrip dengan Kalimat yang Disorot */}
      <div
        data-testid="konten-transkrip"
        className="p-3.5 sm:p-4 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap break-words shadow-inner"
      >
        {segmenList.map((segmen, idx) => {
          if (!segmen.isHighlight) {
            return <React.Fragment key={idx}>{segmen.text}</React.Fragment>;
          }

          const tooltipTeks =
            segmen.buktis && segmen.buktis.length > 0
              ? `Pemicu temuan: ${segmen.buktis.join('; ')}`
              : 'Kalimat pemicu temuan mencurigakan';

          return (
            <mark
              key={idx}
              data-testid="sorotan-pemicu"
              title={tooltipTeks}
              className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded border border-amber-300 font-medium inline-block my-0.5 transition-colors"
            >
              <span className="underline decoration-amber-600 decoration-2 underline-offset-2">
                {segmen.text}
              </span>
              <span
                data-testid="badge-penanda-temuan"
                className="inline-flex items-center gap-1 ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white align-baseline select-none shadow-xs"
                title="Pemicu temuan mencurigakan"
                aria-label="Pemicu temuan mencurigakan"
              >
                <svg
                  className="w-2.5 h-2.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Pemicu</span>
              </span>
            </mark>
          );
        })}
      </div>

      {/* Keterangan / Legenda */}
      {jumlahSorotan > 0 ? (
        <div
          data-testid="legenda-sorotan"
          className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-600"
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400 shrink-0"
            aria-hidden="true"
          />
          <span>
            Arahkan kursor atau sentuh bagian yang disorot untuk melihat rincian bukti pemicu temuan.
          </span>
        </div>
      ) : (
        <p
          data-testid="keterangan-tanpa-sorotan"
          className="text-[11px] sm:text-xs text-gray-500 italic"
        >
          Tidak ada kalimat atau frasa pemicu khusus yang disorot dalam pesan ini.
        </p>
      )}
    </div>
  );
}

export default SorotanTranskrip;
