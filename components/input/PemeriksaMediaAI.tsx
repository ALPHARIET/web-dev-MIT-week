'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { FormatDataHasil } from '@/lib/hasil';
import type { JawabanWizardVideo, SituasiVideo } from '@/lib/aturan/video-rules';
import { siapkanMedia, type MediaSiap, type TahapPersiapan } from '@/lib/media-browser';
import { sensorTeks } from '@/lib/sensor';

export interface PemeriksaMediaAIProps {
  onHasilReady: (hasil: FormatDataHasil, framePratinjau: string[]) => void;
  className?: string;
}

const LABEL_TAHAP: Record<TahapPersiapan, string> = {
  membaca: 'Membaca file di perangkatmu...',
  frame: 'Mengambil beberapa gambar dari video...',
  audio: 'Mengambil suara (maksimal 60 detik)...',
  kompres: 'Mengecilkan gambar...',
  selesai: 'Siap dianalisis',
};

const PESAN_ANALISIS = [
  'Mengirim gambar dan suara ke AI...',
  'AI memeriksa wajah dan gerak bibir...',
  'AI mendengarkan suaranya...',
  'Mencocokkan omongannya dengan modus penipuan...',
  'Menyusun hasil...',
];

const PILIHAN_SITUASI: Array<{ id: SituasiVideo; label: string }> = [
  { id: 'video_call', label: 'Video call / telepon' },
  { id: 'rekaman', label: 'Rekaman / voice note' },
  { id: 'tokoh', label: 'Video tokoh / artis' },
];

type KunciTanda =
  | 'minta_otp'
  | 'minta_uang'
  | 'darurat'
  | 'rahasia'
  | 'nomor_baru'
  | 'tolak_telepon'
  | 'janji_untung';

const PILIHAN_TANDA: Array<{ id: KunciTanda; label: string }> = [
  { id: 'minta_uang', label: 'Minta transfer, pulsa, atau voucher' },
  { id: 'minta_otp', label: 'Minta kode OTP / PIN' },
  { id: 'darurat', label: 'Ada keadaan darurat / harus sekarang' },
  { id: 'rahasia', label: 'Minta dirahasiakan' },
  { id: 'nomor_baru', label: 'Dari nomor atau akun baru' },
  { id: 'tolak_telepon', label: 'Menolak ditelepon balik' },
  { id: 'janji_untung', label: 'Janji untung / ajakan investasi' },
];

export function bangunJawabanKonteks(
  situasi: SituasiVideo | null,
  tanda: Set<KunciTanda>
): JawabanWizardVideo | undefined {
  if (!situasi && tanda.size === 0) return undefined;
  const j: JawabanWizardVideo = {};
  if (situasi) j.situasi = situasi;
  if (tanda.has('minta_otp')) j.apa_diminta = 'otp_pin';
  else if (tanda.has('minta_uang')) j.apa_diminta = 'transfer';
  else if (tanda.has('janji_untung')) j.apa_diminta = 'investasi';
  if (tanda.has('nomor_baru')) j.nomor_akun = 'nomor_baru';
  if (tanda.has('darurat')) j.darurat_desakan = true;
  if (tanda.has('rahasia')) j.diminta_rahasiakan = true;
  if (tanda.has('tolak_telepon')) j.bisa_telepon_balik = false;
  if (tanda.has('janji_untung')) j.janji_untung_ajakan = true;
  if (situasi === 'tokoh') j.siapa_tampil = 'tokoh_publik';
  return j;
}

function formatUkuran(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function PemeriksaMediaAI({ onHasilReady, className = '' }: PemeriksaMediaAIProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaSiap | null>(null);
  const [tahap, setTahap] = useState<TahapPersiapan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sedangAnalisis, setSedangAnalisis] = useState(false);
  const [indeksPesan, setIndeksPesan] = useState(0);
  const [sedangDiseret, setSedangDiseret] = useState(false);

  const [situasi, setSituasi] = useState<SituasiVideo | null>(null);
  const [tanda, setTanda] = useState<Set<KunciTanda>>(new Set());
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!sedangAnalisis) return;
    setIndeksPesan(0);
    const t = setInterval(() => {
      setIndeksPesan((i) => Math.min(i + 1, PESAN_ANALISIS.length - 1));
    }, 4000);
    return () => clearInterval(t);
  }, [sedangAnalisis]);

  const sedangMemproses = tahap !== null && tahap !== 'selesai';

  const prosesFile = async (f: File) => {
    setError(null);
    setMedia(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setTahap('membaca');
    try {
      const siap = await siapkanMedia(f, setTahap);
      setMedia(siap);
      if (!situasi) {
        setSituasi(siap.jenis === 'audio' ? 'rekaman' : null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'File tidak bisa diproses.');
      setTahap(null);
    }
  };

  const handlePilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void prosesFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setSedangDiseret(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void prosesFile(f);
  };

  const gantiFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    setMedia(null);
    setTahap(null);
    setError(null);
  };

  const toggleTanda = (id: KunciTanda) => {
    setTanda((prev) => {
      const baru = new Set(prev);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  };

  const periksa = async () => {
    if (!media || sedangAnalisis) return;
    setError(null);
    setSedangAnalisis(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 75_000);
    try {
      const res = await fetch('/api/cek-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis: media.jenis,
          frames: media.frames,
          audio: media.audio,
          durasiDetik: media.durasiAudioDetik,
          namaFile: media.namaFile,
          catatan: catatan.trim() ? sensorTeks(catatan.trim()).hasil : undefined,
          jawabanWizard: bangunJawabanKonteks(situasi, tanda),
        }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        const pesan =
          res.status === 429
            ? data?.pesan ?? 'Terlalu banyak pemeriksaan. Tunggu sebentar lalu coba lagi.'
            : data?.error ?? 'Analisis gagal. Coba lagi sebentar lagi.';
        setError(pesan);
        return;
      }
      const hasil = data as FormatDataHasil;
      if (hasil.status_layanan?.ai !== 'ok' && hasil.level === 'tidak_ditemukan') {
        setError(
          'AI sedang sibuk melayani banyak pengguna, jadi file kamu belum sempat dicek. Tunggu sekitar 1 menit, lalu tekan Periksa lagi. File kamu masih di sini.'
        );
        return;
      }
      onHasilReady(hasil, media.frames.map((f) => f.data));
    } catch {
      setError('Analisis memakan waktu terlalu lama atau koneksi terputus. File kamu masih di sini, coba tekan Periksa lagi.');
    } finally {
      clearTimeout(timer);
      setSedangAnalisis(false);
    }
  };

  return (
    <div
      data-testid="pemeriksa-media-ai"
      className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 lg:p-8 shadow-sm space-y-6 ${className}`.trim()}
    >
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Periksa file dengan AI</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Unggah video, voice note, atau screenshot video call. AI akan mengecek apakah wajah atau
          suaranya buatan AI, dan apakah omongannya mirip modus penipuan.
        </p>
      </div>

      {!file ? (
        <label
          htmlFor="input-media-utama"
          data-testid="dropzone-media"
          onDragOver={(e) => {
            e.preventDefault();
            setSedangDiseret(true);
          }}
          onDragLeave={() => setSedangDiseret(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 text-center rounded-2xl border-2 border-dashed px-4 py-10 cursor-pointer transition-colors min-h-[180px] focus-within:ring-2 focus-within:ring-blue-600 ${
            sedangDiseret ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <svg className="w-10 h-10 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
          <span className="font-semibold text-gray-900">Pilih atau tarik file ke sini</span>
          <span className="text-xs text-gray-500">
            Video (MP4, MOV, WebM) · Suara (MP3, M4A, OPUS, WAV) · Gambar (JPG, PNG) · maks. 100 MB
          </span>
          <input
            ref={inputRef}
            id="input-media-utama"
            data-testid="input-media-utama"
            type="file"
            accept="video/*,audio/*,image/jpeg,image/png,image/webp,.opus,.m4a"
            onChange={handlePilihFile}
            className="sr-only"
          />
        </label>
      ) : (
        <div data-testid="pratinjau-media" className="rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatUkuran(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={gantiFile}
              disabled={sedangAnalisis}
              data-testid="tombol-ganti-file"
              className="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 min-h-[44px] disabled:opacity-50"
            >
              Ganti file
            </button>
          </div>

          {previewUrl && media?.jenis === 'video' && (
            <video src={previewUrl} controls playsInline className="w-full max-h-72 rounded-lg bg-black" />
          )}
          {previewUrl && media?.jenis === 'audio' && <audio src={previewUrl} controls className="w-full" />}
          {previewUrl && media?.jenis === 'gambar' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Pratinjau gambar" className="w-full max-h-72 object-contain rounded-lg bg-gray-100" />
          )}

          {sedangMemproses && tahap && (
            <p data-testid="status-persiapan" role="status" className="text-sm text-blue-700 font-medium animate-pulse">
              {LABEL_TAHAP[tahap]}
            </p>
          )}

          {media && (
            <div data-testid="ringkasan-kiriman" className="space-y-2">
              {media.jenis === 'video' && media.frames.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-700">Gambar yang akan dicek AI:</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {media.frames.map((f, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={f.data} alt={`Frame ${i + 1}`} className="w-full aspect-video object-cover rounded border border-gray-200" />
                    ))}
                  </div>
                </>
              )}
              <p className="text-xs text-gray-600">
                {media.jenis === 'video' && `${media.frames.length} gambar`}
                {media.jenis === 'gambar' && '1 gambar'}
                {media.audio && `${media.jenis === 'video' ? ' + ' : ''}${Math.round(media.durasiAudioDetik ?? 0)} detik suara`}
                {' '}siap dianalisis.
              </p>
              {media.catatan.map((c) => (
                <p key={c} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {c}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <details className="group rounded-2xl border border-gray-200" data-testid="konteks-opsional">
        <summary className="cursor-pointer list-none px-4 py-3 min-h-[44px] flex items-center justify-between gap-2 font-semibold text-sm text-gray-900">
          <span>
            Tambah konteks <span className="font-normal text-gray-500">(opsional, bikin hasil lebih tepat)</span>
          </span>
          <span className="text-gray-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
        </summary>
        <div className="px-4 pb-4 space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-gray-700 mb-1">Ini dari mana?</legend>
            <div className="flex flex-wrap gap-2">
              {PILIHAN_SITUASI.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={situasi === s.id}
                  data-testid={`situasi-${s.id}`}
                  onClick={() => setSituasi(situasi === s.id ? null : s.id)}
                  className={`px-3 py-2 rounded-full text-sm border min-h-[40px] transition-colors ${
                    situasi === s.id
                      ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-gray-700 mb-1">Centang yang terjadi:</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {PILIHAN_TANDA.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm cursor-pointer min-h-[44px] ${
                    tanda.has(t.id) ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-medium' : 'border-gray-200 text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={tanda.has(t.id)}
                    onChange={() => toggleTanda(t.id)}
                    data-testid={`tanda-${t.id}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <label htmlFor="catatan-media" className="text-xs font-semibold text-gray-700">
              Cerita singkat (opsional)
            </label>
            <textarea
              id="catatan-media"
              data-testid="catatan-media"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Contoh: mengaku kakak, bilang kecelakaan, minta transfer Rp2 juta sekarang"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-[11px] text-gray-500">Angka seperti nomor HP, rekening, dan OTP otomatis disensor sebelum dikirim.</p>
          </div>
        </div>
      </details>

      <p data-testid="transparansi-media" className="text-xs text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <span className="font-semibold text-gray-800">Yang dikirim ke AI: </span>
        beberapa potongan gambar dan maksimal 60 detik suara. Video utuh tetap di HP-mu, dan
        kami tidak menyimpan file apa pun.
      </p>

      {error && (
        <p data-testid="error-media" role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="button"
        data-testid="tombol-periksa-media"
        onClick={periksa}
        disabled={!media || sedangAnalisis || sedangMemproses}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-base text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 min-h-[48px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sedangAnalisis ? 'Menganalisis...' : 'Periksa'}
      </button>

      {sedangAnalisis && (
        <p data-testid="status-analisis" role="status" aria-live="polite" className="text-sm text-center text-gray-700 animate-pulse">
          {PESAN_ANALISIS[indeksPesan]} <span className="text-gray-500">(biasanya kurang dari 1 menit)</span>
        </p>
      )}
    </div>
  );
}

export default PemeriksaMediaAI;
