/**
 * lib/aturan/scoring.ts
 *
 * Logika penghitungan skor aturan, ambang batas tingkat kewaspadaan,
 * dan evaluasi aturan pemindaian (isomorphic: murni TypeScript).
 */

import {
  TingkatLevel,
  Temuan,
  hitungLevel,
  gabungLevel,
  AMBANG_TINGGI,
  AMBANG_SEDANG,
} from '../hasil';

export { AMBANG_TINGGI, AMBANG_SEDANG, hitungLevel, gabungLevel };
export type { TingkatLevel, Temuan };

/**
 * Satu aturan pemindaian yang dapat dipicu oleh teks atau kondisi input.
 */
export interface Aturan {
  /** Pengenal unik aturan (misal: 'minta_otp', 'transfer_dana') */
  id: string;
  /** Pola pencocokan berbasis RegExp atau fungsi predikat */
  pola: RegExp | ((input: string) => boolean);
  /** Skor bobot yang ditambahkan jika aturan cocok */
  bobot: number;
  /** Jika true, tingkat kewaspadaan langsung menjadi 'tinggi' */
  langsung_tinggi: boolean;
  /** Judul temuan yang ditampilkan ke pengguna */
  judul: string;
  /** Penjelasan temuan / teks fallback saat AI tidak tersedia */
  penjelasan: string;
  /** Ekstraktor kutipan teks yang menjadi bukti kecurigaan */
  buktiExtractor: (input: string, match: RegExpMatchArray | null) => string;
}

/**
 * Hasil evaluasi sekumpulan aturan terhadap teks input.
 */
export interface HasilAturan {
  /** Total skor dari seluruh aturan yang cocok */
  skor: number;
  /** Tingkat kewaspadaan hasil evaluasi */
  level: TingkatLevel;
  /** Daftar temuan dari setiap aturan yang cocok */
  temuan: Temuan[];
  /** Daftar URL/link yang ditemukan di teks (untuk cross-link ke Cek Link) */
  linkDitemukan: string[];
  /** Menandakan apakah modus video call atau voice note terdeteksi */
  modusVideoDitemukan: boolean;
}

/**
 * Opsi tambahan untuk konfigurasi evaluasi aturan.
 */
export interface EvaluasiOpsi {
  /** Apakah otomatis mengekstrak URL dari teks input (default: true) */
  ekstrakLink?: boolean;
  /** Apakah otomatis mendeteksi modus video/voice note dari teks input (default: true) */
  deteksiModusVideo?: boolean;
}

/** Regex untuk mendeteksi URL dan tautan dalam teks */
const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:bit\.ly|t\.me|wa\.me)\/[^\s<>"'{}|\\^`]+/gi;

/** Regex untuk mendeteksi modus video call atau voice note */
const MODUS_VIDEO_REGEX =
  /\b(?:video\s*call|videocall|vcall|voice\s*note|voicenote|rekaman\s*suara|pesan\s*suara|panggilan\s*video|telepon\s*video|deepfake)\b|\b(?:vc|vn)\b/i;

/**
 * Membersihkan tanda baca di akhir URL jika menempel dari kalimat percakapan.
 */
function bersihkanUrl(url: string): string {
  return url.replace(/[.,!?:;)]+$/, '');
}

/**
 * Mengekstrak daftar tautan/URL unik dari sebuah teks input.
 */
export function ekstrakUrl(teks: string): string[] {
  if (!teks || typeof teks !== 'string') return [];
  const matches = teks.match(URL_REGEX);
  if (!matches) return [];

  const daftar = matches
    .map(bersihkanUrl)
    .filter((u) => u.length > 0);

  return Array.from(new Set(daftar));
}

/**
 * Memeriksa apakah teks memuat indikasi modus video call atau voice note.
 */
export function deteksiModusVideo(teks: string): boolean {
  if (!teks || typeof teks !== 'string') return false;
  return MODUS_VIDEO_REGEX.test(teks);
}

/**
 * Mengevaluasi teks input terhadap sekumpulan aturan pemindaian.
 *
 * Menghitung skor total dari aturan yang cocok, menentukan tingkat kewaspadaan
 * sesuai ambang batas (atau langsung 'tinggi' jika ada aturan berbobot langsung_tinggi),
 * menyusun daftar temuan, mengekstrak tautan, dan mendeteksi modus video.
 *
 * @param input Teks yang akan diperiksa
 * @param daftarAturan Array aturan yang akan diterapkan
 * @param opsi Opsi tambahan untuk ekstraksi link dan modus video
 * @returns HasilAturan dengan skor, level, temuan, linkDitemukan, dan modusVideoDitemukan
 */
export function evaluasiAturan(
  input: string,
  daftarAturan: Aturan[],
  opsi?: EvaluasiOpsi
): HasilAturan {
  const opsiLengkap = {
    ekstrakLink: true,
    deteksiModusVideo: true,
    ...opsi,
  };

  let skor = 0;
  let adaLangsungTinggi = false;
  const temuan: Temuan[] = [];
  const setLink = new Set<string>();
  let modusVideoDitemukan = false;

  // Ekstrak tautan dari teks input jika diaktifkan
  if (opsiLengkap.ekstrakLink && typeof input === 'string') {
    for (const link of ekstrakUrl(input)) {
      setLink.add(link);
    }
  }

  // Deteksi modus video / suara dari teks input jika diaktifkan
  if (opsiLengkap.deteksiModusVideo && typeof input === 'string') {
    if (deteksiModusVideo(input)) {
      modusVideoDitemukan = true;
    }
  }

  if (typeof input === 'string' && Array.isArray(daftarAturan)) {
    for (const aturan of daftarAturan) {
      let cocok = false;
      let match: RegExpMatchArray | null = null;

      try {
        if (typeof aturan.pola === 'function') {
          cocok = Boolean(aturan.pola(input));
        } else if (aturan.pola instanceof RegExp) {
          // Reset lastIndex jika regex stateful (/g atau /y)
          if (aturan.pola.global || aturan.pola.sticky) {
            aturan.pola.lastIndex = 0;
          }
          const execRes = aturan.pola.exec(input);
          cocok = execRes !== null;
          match = execRes;
          if (aturan.pola.global || aturan.pola.sticky) {
            aturan.pola.lastIndex = 0;
          }
        }
      } catch {
        cocok = false;
      }

      if (cocok) {
        skor += aturan.bobot;
        if (aturan.langsung_tinggi) {
          adaLangsungTinggi = true;
        }

        let bukti = '';
        try {
          bukti = aturan.buktiExtractor(input, match);
        } catch {
          bukti = match ? match[0] : '';
        }

        temuan.push({
          judul: aturan.judul,
          penjelasan: aturan.penjelasan,
          bukti: bukti || (match ? match[0] : ''),
          sumber: 'aturan',
        });

        // Tandai jika ada aturan yang secara spesifik mengindikasikan modus video
        if (
          aturan.id === 'modus_video' ||
          aturan.id === 'video_call' ||
          aturan.id === 'voice_note'
        ) {
          modusVideoDitemukan = true;
        }

        // Jika aturan terkait link, pastikan tautan di bukti ikut terdaftar
        if (
          aturan.id === 'link_dalam_pesan' ||
          aturan.id === 'link' ||
          aturan.id === 'ada_link'
        ) {
          for (const link of ekstrakUrl(bukti)) {
            setLink.add(link);
          }
        }
      }
    }
  }

  const level = hitungLevel(skor, adaLangsungTinggi);

  return {
    skor,
    level,
    temuan,
    linkDitemukan: Array.from(setLink),
    modusVideoDitemukan,
  };
}
