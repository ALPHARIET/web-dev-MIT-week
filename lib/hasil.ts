export type TingkatLevel = 'tinggi' | 'sedang' | 'tidak_ditemukan';

export type HalamanCek = 'chat' | 'link' | 'video';

export type SumberTemuan =
  | 'aturan'
  | 'ai'
  | 'safe_browsing'
  | 'rdap'
  | 'virustotal'
  | 'reality_defender';

export type StatusLayanan = 'ok' | 'gagal' | 'tidak_dipakai' | 'tidak_tersedia';

export type SituasiDarurat =
  | 'klik_link'
  | 'isi_data'
  | 'kirim_otp'
  | 'transfer'
  | 'akun_diambil';

export interface Temuan {
  judul: string;
  penjelasan: string;
  bukti: string;
  sumber: SumberTemuan;
}

export interface FormatDataHasil {
  halaman: HalamanCek;
  level: TingkatLevel;
  ringkasan: string;
  temuan: Temuan[];
  hal_wajar: string[];
  langkah: string[];
  situasi_darurat: SituasiDarurat[];
  batasan: string;
  pihak_ketiga: string[];
  status_layanan: Record<string, StatusLayanan>;
  transkrip?: string;
  url?: string;
  analisis_media?: AnalisisMedia;
}

export interface HasilDetektorMedia {
  nama: string;
  status: StatusLayanan;
  label: string;
  sinyal: 'tinggi' | 'sedang' | 'rendah' | 'netral';
  skor?: number;
  keterangan: string;
}

export interface AnalisisMedia {
  jenis: 'video' | 'audio' | 'gambar';
  frame_dianalisis: number;
  durasi_audio_detik?: number;
  kategori?: 'penipuan' | 'konten_ai' | 'wajar' | 'tidak_bisa_dinilai';
  detektor: HasilDetektorMedia[];
}

export const AMBANG_TINGGI = 6;
export const AMBANG_SEDANG = 3;

export const URUTAN_LEVEL: Record<TingkatLevel, number> = {
  tinggi: 2,
  sedang: 1,
  tidak_ditemukan: 0,
};

export function hitungLevel(
  skor: number,
  adaLangsungTinggi: boolean = false
): TingkatLevel {
  if (adaLangsungTinggi || skor >= AMBANG_TINGGI) {
    return 'tinggi';
  }
  if (skor >= AMBANG_SEDANG) {
    return 'sedang';
  }
  return 'tidak_ditemukan';
}

export function gabungLevel(a: TingkatLevel, b: TingkatLevel): TingkatLevel {
  return URUTAN_LEVEL[a] >= URUTAN_LEVEL[b] ? a : b;
}
