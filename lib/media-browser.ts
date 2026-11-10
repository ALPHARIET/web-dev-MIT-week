import {
  extractFramesFromVideo,
  isSupportedAudioFormat,
  isSupportedVideoFormat,
} from './video-frame-extractor';
import { kompresGambar } from './image-utils';

export type JenisMedia = 'video' | 'audio' | 'gambar';

export interface FrameSiap {
  data: string;
  detik?: number;
}

export interface MediaSiap {
  jenis: JenisMedia;
  namaFile: string;
  ukuranAsliBytes: number;
  frames: FrameSiap[];
  audio?: string;
  durasiAudioDetik?: number;
  durasiAsliDetik?: number;
  audioDipotong: boolean;
  catatan: string[];
}

export type TahapPersiapan = 'membaca' | 'frame' | 'audio' | 'kompres' | 'selesai';

export const MAKS_UKURAN_FILE_BYTES = 100 * 1024 * 1024;
export const MAKS_DETIK_AUDIO = 60;
export const JUMLAH_FRAME_VIDEO = 10;
export const SAMPLE_RATE_AUDIO = 16_000;
export const BATAS_KIRIMAN_BYTES = 3_900_000;

export function tentukanJenisMedia(file: File): JenisMedia | null {
  const tipe = (file.type || '').toLowerCase();
  const nama = (file.name || '').toLowerCase();
  if (tipe.startsWith('video/') || isSupportedVideoFormat(nama)) return 'video';
  if (tipe.startsWith('audio/') || isSupportedAudioFormat(nama)) return 'audio';
  if (/^image\/(jpeg|jpg|png|webp)$/.test(tipe) || /\.(jpe?g|png|webp)$/.test(nama)) {
    return 'gambar';
  }
  return null;
}

export function encodeWav(sampel: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = sampel.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const tulisTeks = (offset: number, teks: string) => {
    for (let i = 0; i < teks.length; i++) view.setUint8(offset + i, teks.charCodeAt(i));
  };

  tulisTeks(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  tulisTeks(8, 'WAVE');
  tulisTeks(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  tulisTeks(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < sampel.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, sampel[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function blobKeDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(blob);
  });
}

export async function ekstrakAudioWav(
  file: Blob,
  maksDetik: number = MAKS_DETIK_AUDIO
): Promise<{ dataUrl: string; durasiDetik: number; durasiAsliDetik: number; dipotong: boolean } | null> {
  if (typeof window === 'undefined') return null;
  const Ctx: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const Offline: typeof OfflineAudioContext | undefined = window.OfflineAudioContext;
  if (!Ctx || !Offline) return null;

  let ctx: AudioContext | null = null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const durasiAsli = decoded.duration;
    if (!isFinite(durasiAsli) || durasiAsli < 0.5) return null;

    const durasi = Math.min(durasiAsli, maksDetik);
    const jumlahSampel = Math.ceil(durasi * SAMPLE_RATE_AUDIO);
    const offline = new Offline(1, jumlahSampel, SAMPLE_RATE_AUDIO);
    const sumber = offline.createBufferSource();
    sumber.buffer = decoded;
    sumber.connect(offline.destination);
    sumber.start(0, 0, durasi);
    const hasil = await offline.startRendering();
    const sampel = hasil.getChannelData(0);

    let puncak = 0;
    for (let i = 0; i < sampel.length; i += 64) puncak = Math.max(puncak, Math.abs(sampel[i]));
    if (puncak < 0.005) return null;

    const wav = encodeWav(sampel, SAMPLE_RATE_AUDIO);
    const dataUrl = await blobKeDataUrl(new Blob([wav], { type: 'audio/wav' }));
    return { dataUrl, durasiDetik: durasi, durasiAsliDetik: durasiAsli, dipotong: durasiAsli > maksDetik };
  } catch {
    return null;
  } finally {
    try {
      await ctx?.close();
    } catch {
    }
  }
}

function ukuranKiriman(m: Pick<MediaSiap, 'frames' | 'audio'>): number {
  return m.frames.reduce((n, f) => n + f.data.length, 0) + (m.audio?.length ?? 0);
}

export async function siapkanMedia(
  file: File,
  onTahap?: (tahap: TahapPersiapan) => void
): Promise<MediaSiap> {
  const jenis = tentukanJenisMedia(file);
  if (!jenis) {
    throw new Error('Format file belum didukung. Pilih video (MP4/MOV/WebM), audio (MP3/M4A/WAV/OGG/OPUS), atau gambar (JPG/PNG/WebP).');
  }
  if (file.size > MAKS_UKURAN_FILE_BYTES) {
    throw new Error('Ukuran file lebih dari 100 MB. Potong videonya dulu atau kirim bagian yang paling mencurigakan.');
  }

  const hasil: MediaSiap = {
    jenis,
    namaFile: file.name,
    ukuranAsliBytes: file.size,
    frames: [],
    audioDipotong: false,
    catatan: [],
  };

  onTahap?.('membaca');

  if (jenis === 'video') {
    onTahap?.('frame');
    const ekstrak = await extractFramesFromVideo(file, {
      jumlahFrame: JUMLAH_FRAME_VIDEO,
      maksLebar: 640,
      kualitasJpeg: 0.8,
    });
    if (ekstrak.frames.length === 0) {
      throw new Error('Gagal mengambil gambar dari video. Coba format MP4.');
    }
    hasil.frames = ekstrak.frames.map((data, i) => ({ data, detik: ekstrak.waktuDetik?.[i] }));
    hasil.durasiAsliDetik = ekstrak.durasiDetik;

    onTahap?.('audio');
    const audio = await ekstrakAudioWav(file);
    if (audio) {
      hasil.audio = audio.dataUrl;
      hasil.durasiAudioDetik = audio.durasiDetik;
      hasil.audioDipotong = audio.dipotong;
    } else {
      hasil.catatan.push('Suara dari video tidak bisa diambil (video tanpa suara atau formatnya tidak didukung browser). Hanya gambar yang dianalisis.');
    }
  } else if (jenis === 'audio') {
    onTahap?.('audio');
    const audio = await ekstrakAudioWav(file);
    if (!audio) {
      throw new Error('Rekaman suara tidak bisa dibaca browser atau isinya hening. Coba simpan ulang sebagai MP3/M4A.');
    }
    hasil.audio = audio.dataUrl;
    hasil.durasiAudioDetik = audio.durasiDetik;
    hasil.durasiAsliDetik = audio.durasiAsliDetik;
    hasil.audioDipotong = audio.dipotong;
  } else {
    onTahap?.('kompres');
    const blob = await kompresGambar(file, { maxLebar: 1280, kualitas: 0.85 });
    hasil.frames = [{ data: await blobKeDataUrl(blob) }];
  }

  if (hasil.audioDipotong) {
    hasil.catatan.push(`Hanya ${MAKS_DETIK_AUDIO} detik pertama suara yang dianalisis.`);
  }

  while (ukuranKiriman(hasil) > BATAS_KIRIMAN_BYTES && hasil.frames.length > 3) {
    hasil.frames.splice(Math.floor(hasil.frames.length / 2), 1);
  }
  if (ukuranKiriman(hasil) > BATAS_KIRIMAN_BYTES && hasil.audio) {
    hasil.audio = undefined;
    hasil.durasiAudioDetik = undefined;
    hasil.catatan.push('Suara tidak ikut dianalisis karena ukurannya terlalu besar.');
  }
  if (ukuranKiriman(hasil) > BATAS_KIRIMAN_BYTES) {
    throw new Error('File terlalu besar untuk dianalisis. Coba file dengan resolusi lebih kecil.');
  }

  onTahap?.('selesai');
  return hasil;
}
