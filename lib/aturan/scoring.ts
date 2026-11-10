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

export interface Aturan {
  id: string;
  pola: RegExp | ((input: string) => boolean);
  bobot: number;
  langsung_tinggi: boolean;
  judul: string;
  penjelasan: string;
  buktiExtractor: (input: string, match: RegExpMatchArray | null) => string;
}

export interface HasilAturan {
  skor: number;
  level: TingkatLevel;
  temuan: Temuan[];
  linkDitemukan: string[];
  modusVideoDitemukan: boolean;
}

export interface EvaluasiOpsi {
  ekstrakLink?: boolean;
  deteksiModusVideo?: boolean;
}

const URL_REGEX =
  /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:bit\.ly|t\.me|wa\.me)\/[^\s<>"'{}|\\^`]+/gi;

const MODUS_VIDEO_REGEX =
  /\b(?:video\s*call|videocall|vcall|voice\s*note|voicenote|rekaman\s*suara|pesan\s*suara|panggilan\s*video|telepon\s*video|deepfake)\b|\b(?:vc|vn)\b/i;

function bersihkanUrl(url: string): string {
  return url.replace(/[.,!?:;)]+$/, '');
}

export function ekstrakUrl(teks: string): string[] {
  if (!teks || typeof teks !== 'string') return [];
  const matches = teks.match(URL_REGEX);
  if (!matches) return [];

  const daftar = matches
    .map(bersihkanUrl)
    .filter((u) => u.length > 0);

  return Array.from(new Set(daftar));
}

export function deteksiModusVideo(teks: string): boolean {
  if (!teks || typeof teks !== 'string') return false;
  return MODUS_VIDEO_REGEX.test(teks);
}

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

  if (opsiLengkap.ekstrakLink && typeof input === 'string') {
    for (const link of ekstrakUrl(input)) {
      setLink.add(link);
    }
  }

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

        if (
          aturan.id === 'modus_video' ||
          aturan.id === 'video_call' ||
          aturan.id === 'voice_note'
        ) {
          modusVideoDitemukan = true;
        }

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
