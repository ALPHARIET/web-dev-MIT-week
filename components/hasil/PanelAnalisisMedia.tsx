'use client';

import React from 'react';
import type { AnalisisMedia, HasilDetektorMedia } from '@/lib/hasil';

export interface PanelAnalisisMediaProps {
  analisis: AnalisisMedia;
  framePratinjau?: string[];
  className?: string;
}

const GAYA_SINYAL: Record<HasilDetektorMedia['sinyal'], { badge: string; bar: string }> = {
  tinggi: { badge: 'bg-red-100 text-red-900 border-red-300', bar: 'bg-red-500' },
  sedang: { badge: 'bg-amber-100 text-amber-900 border-amber-300', bar: 'bg-amber-500' },
  rendah: { badge: 'bg-gray-100 text-gray-800 border-gray-300', bar: 'bg-gray-500' },
  netral: { badge: 'bg-gray-50 text-gray-600 border-gray-200', bar: 'bg-gray-300' },
};

function kalimatYangDicek(a: AnalisisMedia): string {
  const bagian: string[] = [];
  if (a.frame_dianalisis > 0) {
    bagian.push(a.jenis === 'gambar' ? 'gambarnya' : `${a.frame_dianalisis} potongan gambar`);
  }
  if (typeof a.durasi_audio_detik === 'number') {
    bagian.push(`${Math.round(a.durasi_audio_detik)} detik suara`);
  }
  return bagian.length ? `AI memeriksa ${bagian.join(' dan ')}.` : '';
}

export default function PanelAnalisisMedia({
  analisis,
  framePratinjau,
  className = '',
}: PanelAnalisisMediaProps): React.JSX.Element | null {
  const d = analisis.detektor[0];
  if (!d) return null;
  const gaya = GAYA_SINYAL[d.sinyal];
  const adaSkor = typeof d.skor === 'number' && d.status === 'ok';

  return (
    <section
      data-testid="panel-analisis-media"
      aria-labelledby="judul-analisis-media"
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4 ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="judul-analisis-media" className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
          Analisis AI
        </h3>
        <span
          data-testid="label-analisis-media"
          className={`text-sm font-semibold px-3 py-1 rounded-full border ${gaya.badge}`}
        >
          {d.label}
        </span>
      </div>

      {framePratinjau && framePratinjau.length > 0 && (
        <div className="grid grid-cols-5 gap-1.5" aria-label="Potongan gambar yang diperiksa AI">
          {framePratinjau.slice(0, 12).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Potongan gambar ${i + 1}`}
              className="w-full aspect-video object-cover rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      )}

      {adaSkor && (
        <div className="space-y-1">
          <div
            className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={d.skor}
            aria-label={`Kemungkinan dibuat AI ${d.skor} dari 100`}
          >
            <div className={`h-full rounded-full ${gaya.bar}`} style={{ width: `${d.skor}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Kecil kemungkinan dibuat AI</span>
            <span>Besar kemungkinan</span>
          </div>
        </div>
      )}

      <p data-testid="keterangan-analisis-media" className="text-sm sm:text-base text-gray-800 leading-relaxed">
        {d.keterangan}
      </p>

      <p className="text-xs text-gray-500">{kalimatYangDicek(analisis)} AI bisa salah, jadi tetap cek langsung ke orangnya.</p>
    </section>
  );
}
