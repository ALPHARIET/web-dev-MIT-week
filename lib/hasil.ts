/**
 * lib/hasil.ts
 *
 * Definisi tipe data FormatDataHasil dan fungsi penggabungan level
 * untuk Aplikasi Web Cek Penipuan.
 */

/** Tingkat kewaspadaan yang ditampilkan ke pengguna */
export type TingkatLevel = 'tinggi' | 'sedang' | 'tidak_ditemukan';

/** Halaman asal pemeriksaan */
export type HalamanCek = 'chat' | 'link' | 'video';

/** Sumber temuan */
export type SumberTemuan =
  | 'aturan'
  | 'ai'
  | 'safe_browsing'
  | 'rdap'
  | 'virustotal'
  | 'reality_defender';

/** Status layanan pihak ketiga */
export type StatusLayanan = 'ok' | 'gagal' | 'tidak_dipakai' | 'tidak_tersedia';

/** Situasi darurat yang terdeteksi atau dipilih pengguna */
export type SituasiDarurat =
  | 'klik_link'
  | 'isi_data'
  | 'kirim_otp'
  | 'transfer'
  | 'akun_diambil';

/** Satu temuan mencurigakan */
export interface Temuan {
  judul: string; // Judul temuan (misalnya "Meminta kode OTP")
  penjelasan: string; // Kenapa berisiko dan cara kerja modus
  bukti: string; // Kutipan kalimat atau bagian URL yang menjadi bukti
  sumber: SumberTemuan;
}

/** Objek hasil bersama yang dipakai di semua halaman cek */
export interface FormatDataHasil {
  halaman: HalamanCek;
  level: TingkatLevel;
  ringkasan: string; // 1-2 kalimat pembuka
  temuan: Temuan[]; // Minimal 1 temuan jika level > tidak_ditemukan
  hal_wajar: string[]; // Hal yang tampak wajar (bisa kosong)
  langkah: string[]; // Minimal 2 langkah tindakan
  situasi_darurat: SituasiDarurat[];
  batasan: string; // Keterangan batasan hasil pemeriksaan
  pihak_ketiga: string[]; // Daftar layanan pihak ketiga yang digunakan
  status_layanan: Record<string, StatusLayanan>;
  transkrip?: string; // Transkrip teks dari tangkapan layar jika input berupa gambar/screenshot
  url?: string; // URL yang diperiksa (pada pemeriksaan tautan / Cek Link)
}

/** Ambang batas skor ke tingkat kewaspadaan */
export const AMBANG_TINGGI = 6;
export const AMBANG_SEDANG = 3;

/** Urutan bobot level untuk perbandingan */
export const URUTAN_LEVEL: Record<TingkatLevel, number> = {
  tinggi: 2,
  sedang: 1,
  tidak_ditemukan: 0,
};

/**
 * Menghitung tingkat kewaspadaan berdasarkan skor aturan.
 *
 * - skor >= 6 atau adaLangsungTinggi = true => 'tinggi'
 * - 3 <= skor <= 5 => 'sedang'
 * - skor < 3 => 'tidak_ditemukan'
 */
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

/**
 * Menggabungkan dua tingkat kewaspadaan dan selalu mengambil level tertinggi.
 * Monotonisitas: gabungLevel(a, b) >= a dan gabungLevel(a, b) >= b.
 */
export function gabungLevel(a: TingkatLevel, b: TingkatLevel): TingkatLevel {
  return URUTAN_LEVEL[a] >= URUTAN_LEVEL[b] ? a : b;
}
