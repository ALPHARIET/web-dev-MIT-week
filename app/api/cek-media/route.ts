import { NextResponse } from 'next/server';
import {
  gabungLevel,
  type FormatDataHasil,
  type HasilDetektorMedia,
  type SituasiDarurat,
  type Temuan,
  type TingkatLevel,
} from '@/lib/hasil';
import { generateHasilVideoLokal, type JawabanWizardVideo } from '@/lib/aturan/video-rules';
import { evaluasiChat } from '@/lib/aturan/chat-rules';
import { filterFormatDataHasil } from '@/lib/gemini';
import {
  analisisMediaGemini,
  type FrameMedia,
  type HasilAnalisisMediaGemini,
  type HasilPanggilanMedia,
} from '@/lib/gemini-media';
import { sensorTeks } from '@/lib/sensor';

export const maxDuration = 60;

const MAKS_PAYLOAD_BYTES = 4.4 * 1024 * 1024;
const MAKS_FRAME = 12;
const PESAN_TERLALU_BESAR =
  'Ukuran file terlalu besar untuk dianalisis. Coba file yang lebih pendek atau resolusinya lebih kecil.';

const NAMA_ANALISIS_AI = 'Analisis AI';

export interface CekMediaRequestBody {
  jenis?: 'video' | 'audio' | 'gambar';
  frames?: FrameMedia[];
  audio?: string;
  durasiDetik?: number;
  namaFile?: string;
  catatan?: string;
  jawabanWizard?: JawabanWizardVideo;
  levelMinimum?: TingkatLevel;
  tipe?: 'gambar' | 'audio';
  data?: string;
}

const POLA_DATA_GAMBAR = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/;
const POLA_DATA_AUDIO = /^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i;

function log(info: Record<string, unknown>, level: 'log' | 'warn' | 'error' = 'log') {
  console[level](JSON.stringify({ endpoint: 'POST /api/cek-media', ...info }));
}

function jsonError(status: number, error: string, startTime: number, errorType: string) {
  log({ status, errorType, durationMs: Date.now() - startTime }, 'warn');
  return NextResponse.json({ error }, { status });
}

function normalisasiBody(body: CekMediaRequestBody): {
  jenis: 'video' | 'audio' | 'gambar';
  frames: FrameMedia[];
  audio?: string;
} | null {
  let frames: FrameMedia[] = Array.isArray(body.frames)
    ? body.frames
        .filter((f) => f && typeof f.data === 'string')
        .map((f) => ({
          data: f.data,
          detik: typeof f.detik === 'number' && isFinite(f.detik) ? f.detik : undefined,
        }))
    : [];
  let audio = typeof body.audio === 'string' && body.audio ? body.audio : undefined;

  if (frames.length === 0 && !audio && typeof body.data === 'string' && body.data.trim()) {
    if (body.tipe === 'gambar') frames = [{ data: body.data }];
    else if (body.tipe === 'audio') audio = body.data;
  }

  frames = frames.filter((f) => POLA_DATA_GAMBAR.test(f.data)).slice(0, MAKS_FRAME);
  if (audio && !POLA_DATA_AUDIO.test(audio)) audio = undefined;

  if (frames.length === 0 && !audio) return null;

  const jenis =
    body.jenis === 'video' || body.jenis === 'audio' || body.jenis === 'gambar'
      ? body.jenis
      : frames.length > 1
      ? 'video'
      : frames.length === 1
      ? 'gambar'
      : 'audio';
  return { jenis, frames, audio };
}

function daftarCerita(j?: JawabanWizardVideo): string[] {
  if (!j) return [];
  const cerita: string[] = [];
  const diminta: Record<string, string> = {
    otp_pin: 'minta kode OTP atau PIN',
    transfer: 'minta transfer, pulsa, atau voucher',
    voucher: 'minta voucher',
    pulsa: 'minta pulsa',
    investasi: 'menawarkan investasi',
    link_apk: 'minta klik link atau pasang aplikasi',
  };
  if (typeof j.apa_diminta === 'string' && diminta[j.apa_diminta]) cerita.push(diminta[j.apa_diminta]);
  if (j.nomor_akun === 'nomor_baru') cerita.push('pakai nomor baru');
  if (j.darurat_desakan) cerita.push('bilang darurat dan harus sekarang');
  if (j.diminta_rahasiakan) cerita.push('minta dirahasiakan');
  if (j.bisa_telepon_balik === false) cerita.push('tidak mau ditelepon balik');
  if (j.janji_untung_ajakan) cerita.push('menjanjikan untung');
  return cerita;
}

function ringkasKonteks(j?: JawabanWizardVideo): string | undefined {
  if (!j) return undefined;
  const situasi: Record<string, string> = {
    video_call: 'video call / telepon',
    rekaman: 'rekaman video atau voice note',
    tokoh: 'video tokoh publik di media sosial',
  };
  const bagian = [
    ...(j.situasi && situasi[j.situasi] ? [`situasi ${situasi[j.situasi]}`] : []),
    ...daftarCerita(j),
  ];
  return bagian.length ? bagian.join(', ') : undefined;
}

function detektorAi(p: HasilPanggilanMedia): HasilDetektorMedia {
  if (p.status !== 'ok') {
    return {
      nama: NAMA_ANALISIS_AI,
      status: p.status,
      label: 'Sedang tidak tersedia',
      sinyal: 'netral',
      keterangan:
        'Analisis AI sedang tidak bisa dipakai. Coba lagi beberapa menit lagi. Hasil di bawah tetap berdasarkan cerita yang kamu isi.',
    };
  }
  const h = p.hasil;
  const peta = {
    kuat: { label: 'Kemungkinan besar dibuat AI', sinyal: 'tinggi' },
    sedang: { label: 'Ada yang janggal', sinyal: 'sedang' },
    lemah: { label: 'Tidak terlihat dibuat AI', sinyal: 'rendah' },
    tidak_bisa_dinilai: { label: 'Tidak bisa dinilai', sinyal: 'netral' },
  } as const;
  const info = peta[h.penilaian_manipulasi];
  return {
    nama: NAMA_ANALISIS_AI,
    status: 'ok',
    label: info.label,
    sinyal: info.sinyal,
    skor: h.penilaian_manipulasi === 'tidak_bisa_dinilai' ? undefined : h.skor_manipulasi,
    keterangan: h.alasan_penilaian,
  };
}

function tambahTemuanUnik(daftar: Temuan[], baru: Temuan[]) {
  const ada = new Set(daftar.map((t) => t.judul.trim().toLowerCase()));
  for (const t of baru) {
    const kunci = t.judul.trim().toLowerCase();
    if (!kunci || ada.has(kunci)) continue;
    ada.add(kunci);
    daftar.push(t);
  }
}

type KategoriMedia = 'penipuan' | 'konten_ai' | 'wajar' | 'tidak_bisa_dinilai';

const LANGKAH_CADANGAN: Record<KategoriMedia, string[]> = {
  penipuan: [
    'Tutup panggilan atau abaikan pesan, lalu telepon balik orangnya ke nomor lama yang kamu simpan sendiri.',
    'Tanyakan hal yang hanya kalian berdua tahu.',
    'Jangan transfer uang atau memberi kode OTP sebelum yakin itu benar orangnya.',
  ],
  konten_ai: [
    'Jangan langsung percaya atau menyebarkan video ini sebagai kejadian nyata.',
    'Cek kebenarannya di akun resmi tokohnya atau di media berita terpercaya.',
    'Kalau mau membagikan, beri keterangan bahwa ini video buatan AI.',
    'Laporkan ke platform kalau video ini dipakai untuk memfitnah, menyebar hoaks, atau menipu.',
  ],
  wajar: [
    'Tetap cek sumber videonya sebelum percaya atau membagikannya.',
    'Kalau video ini dipakai untuk meminta uang atau data pribadi, cek ulang lewat jalur resmi.',
  ],
  tidak_bisa_dinilai: [
    'Coba unggah video yang lebih jelas, dengan wajah atau suara orangnya terlihat dan terdengar.',
    'Kalau video ini dipakai untuk meminta uang atau data pribadi, cek ulang lewat jalur resmi.',
  ],
};

function ringkasanUntuk(
  kategori: KategoriMedia,
  s: { media?: 'kuat' | 'sedang'; isiUcapan: boolean; cerita: boolean; adaAi: boolean }
): string {
  if (!s.adaAi && kategori !== 'penipuan') {
    return 'Analisis AI sedang tidak tersedia, jadi video ini belum dicek.';
  }
  if (kategori === 'konten_ai') {
    return s.media === 'kuat'
      ? 'Video ini kemungkinan besar dibuat AI. Tidak terlihat ajakan penipuan, tapi jangan percaya atau sebarkan sebagai kejadian nyata.'
      : 'Ada bagian yang janggal dan mungkin dibuat AI. Jangan langsung percaya atau menyebarkannya sebagai kejadian nyata.';
  }
  if (kategori === 'wajar') {
    return 'Video ini tidak terlihat dibuat AI dan tidak ada ajakan penipuan.';
  }
  if (kategori === 'tidak_bisa_dinilai') {
    return 'AI tidak bisa menilai video ini karena wajah atau suara orangnya kurang jelas.';
  }
  const alasan: string[] = [];
  if (s.media === 'kuat') alasan.push('wajah atau suaranya kemungkinan besar dibuat AI');
  else if (s.media === 'sedang') alasan.push('ada bagian wajah atau suara yang janggal');
  if (s.isiUcapan) alasan.push('isi omongannya mirip modus penipuan');
  if (s.cerita) alasan.push('ceritamu cocok dengan modus penipuan');
  if (alasan.length === 0) return 'Cek dulu lewat nomor yang kamu simpan sendiri sebelum lanjut.';
  const kalimat = alasan.join(', dan ');
  return `${kalimat.charAt(0).toUpperCase()}${kalimat.slice(1)}.`;
}

export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAKS_PAYLOAD_BYTES) {
    return jsonError(413, PESAN_TERLALU_BESAR, startTime, 'PayloadTooLarge');
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonError(400, 'Format permintaan tidak valid', startTime, 'InvalidBody');
  }
  if (Buffer.byteLength(rawBody, 'utf8') > MAKS_PAYLOAD_BYTES) {
    return jsonError(413, PESAN_TERLALU_BESAR, startTime, 'PayloadTooLarge');
  }

  let body: CekMediaRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonError(400, 'Format permintaan tidak valid', startTime, 'InvalidJSON');
  }

  const media = body && typeof body === 'object' ? normalisasiBody(body) : null;
  if (!media) {
    return jsonError(
      400,
      'Kirim minimal satu gambar atau rekaman suara yang valid.',
      startTime,
      'ValidationError'
    );
  }

  const jawaban = body.jawabanWizard && typeof body.jawabanWizard === 'object' ? body.jawabanWizard : undefined;
  const catatan =
    typeof body.catatan === 'string' && body.catatan.trim()
      ? sensorTeks(body.catatan.slice(0, 500)).hasil
      : undefined;
  const durasi = typeof body.durasiDetik === 'number' && isFinite(body.durasiDetik) ? body.durasiDetik : undefined;

  try {
    const konteks = jawaban ? generateHasilVideoLokal(jawaban) : null;
    let level: TingkatLevel = konteks?.level ?? 'tidak_ditemukan';
    if (body.levelMinimum === 'tinggi' || body.levelMinimum === 'sedang') {
      level = gabungLevel(level, body.levelMinimum);
    }
    const situasiDarurat = new Set<SituasiDarurat>(konteks?.situasi_darurat ?? []);

    let ai: HasilPanggilanMedia;
    try {
      ai = await analisisMediaGemini({
        jenis: media.jenis,
        frames: media.frames,
        audio: media.audio,
        durasiDetik: durasi,
        catatan,
        ringkasanKonteks: ringkasKonteks(jawaban),
      });
    } catch {
      ai = { status: 'gagal', alasan: 'Analisis AI gagal' };
    }
    const hasilAi: HasilAnalisisMediaGemini | null = ai.status === 'ok' ? ai.hasil : null;

    const temuan: Temuan[] = [];
    let transkrip: string | undefined;
    let isiUcapanMencurigakan = false;

    if (hasilAi) {
      const mediaJanggal =
        hasilAi.penilaian_manipulasi === 'kuat' || hasilAi.penilaian_manipulasi === 'sedang';
      if (mediaJanggal) {
        tambahTemuanUnik(
          temuan,
          [...hasilAi.tanda_visual, ...hasilAi.tanda_audio].slice(0, 3).map((t) => ({
            judul: t.judul,
            penjelasan: t.penjelasan,
            bukti: t.bukti,
            sumber: 'ai' as const,
          }))
        );
      }

      if (hasilAi.ada_ucapan && hasilAi.transkrip) {
        level = gabungLevel(level, hasilAi.level_penipuan);
        tambahTemuanUnik(
          temuan,
          hasilAi.pola_penipuan.slice(0, 3).map((t) => ({
            judul: t.judul,
            penjelasan: t.penjelasan,
            bukti: t.bukti,
            sumber: 'ai' as const,
          }))
        );
        isiUcapanMencurigakan = hasilAi.level_penipuan !== 'tidak_ditemukan';

        transkrip = sensorTeks(hasilAi.transkrip).hasil;
        const aturan = evaluasiChat(hasilAi.transkrip);
        level = gabungLevel(level, aturan.level);
        if (aturan.level !== 'tidak_ditemukan') isiUcapanMencurigakan = true;
        if (hasilAi.pola_penipuan.length === 0) tambahTemuanUnik(temuan, aturan.temuan.slice(0, 3));
        const isi = hasilAi.transkrip.toLowerCase();
        if (/\b(transfer|kirim uang|pulsa|voucher|top ?up)\b/.test(isi)) situasiDarurat.add('transfer');
        if (/\b(otp|kode verifikasi|pin)\b/.test(isi)) situasiDarurat.add('kirim_otp');
      }
    }

    const cerita = daftarCerita(jawaban);
    if (konteks && konteks.level !== 'tidak_ditemukan' && cerita.length > 0) {
      temuan.push({
        judul: 'Ceritamu cocok dengan modus penipuan',
        penjelasan:
          'Penipu biasanya minta uang atau kode rahasia, bikin kamu panik supaya buru-buru, dan melarang kamu mengecek ke orang lain.',
        bukti: `Kamu bilang dia ${cerita.join(', ')}.`,
        sumber: 'aturan',
      });
    }

    const penilaian = hasilAi?.penilaian_manipulasi;
    const mediaAi = penilaian === 'kuat' || penilaian === 'sedang' ? penilaian : undefined;
    const adaTandaPenipuan =
      isiUcapanMencurigakan ||
      Boolean(konteks && konteks.level !== 'tidak_ditemukan') ||
      level !== 'tidak_ditemukan';
    const kategori: KategoriMedia = adaTandaPenipuan
      ? 'penipuan'
      : mediaAi
      ? 'konten_ai'
      : penilaian === 'tidak_bisa_dinilai'
      ? 'tidak_bisa_dinilai'
      : 'wajar';

    if (mediaAi === 'kuat') level = gabungLevel(level, kategori === 'penipuan' ? 'tinggi' : 'sedang');
    else if (mediaAi === 'sedang') level = gabungLevel(level, 'sedang');

    if (level !== 'tidak_ditemukan' && temuan.length === 0) {
      temuan.push({
        judul: 'Ada yang perlu diwaspadai',
        penjelasan: hasilAi?.alasan_penilaian ?? 'Ada tanda yang mirip modus penipuan.',
        bukti: '',
        sumber: 'ai',
      });
    }

    const langkah: string[] = [];
    const sumberLangkah =
      kategori === 'penipuan'
        ? [...(konteks?.langkah ?? []), ...(hasilAi?.langkah ?? []), ...LANGKAH_CADANGAN.penipuan]
        : [
            ...LANGKAH_CADANGAN[kategori].slice(0, 2),
            ...(hasilAi?.langkah ?? []),
            ...LANGKAH_CADANGAN[kategori].slice(2),
          ];
    for (const l of sumberLangkah) {
      if (langkah.length >= 4) break;
      if (!langkah.some((x) => x.toLowerCase() === l.toLowerCase())) langkah.push(l);
    }

    const halWajar = Array.from(new Set([...(hasilAi?.hal_wajar ?? []), ...(konteks?.hal_wajar ?? [])])).slice(0, 2);
    const adaAi = ai.status === 'ok';

    const hasil: FormatDataHasil = filterFormatDataHasil({
      halaman: 'video',
      level,
      ringkasan: ringkasanUntuk(kategori, {
        media: mediaAi,
        isiUcapan: isiUcapanMencurigakan,
        cerita: Boolean(konteks && konteks.level !== 'tidak_ditemukan'),
        adaAi,
      }),
      temuan,
      hal_wajar: halWajar,
      langkah,
      situasi_darurat: kategori === 'penipuan' ? Array.from(situasiDarurat) : [],
      batasan: !adaAi
        ? 'Analisis AI sedang tidak tersedia, jadi hasil ini hanya dari cerita yang kamu isi.'
        : kategori === 'penipuan'
        ? 'AI bisa salah. Video palsu yang bagus bisa lolos, dan video asli yang buram bisa terlihat janggal. Cara paling ampuh tetap telepon balik orangnya.'
        : 'AI bisa salah. Video buatan AI yang bagus bisa lolos, dan video asli yang buram bisa terlihat janggal.',
      pihak_ketiga: [NAMA_ANALISIS_AI],
      status_layanan: { ai: ai.status },
      transkrip,
      analisis_media: {
        jenis: media.jenis,
        frame_dianalisis: media.frames.length,
        durasi_audio_detik: media.audio ? durasi : undefined,
        kategori,
        detektor: [detektorAi(ai)],
      },
    });

    log({
      status: 200,
      jenis: media.jenis,
      frames: media.frames.length,
      audio: Boolean(media.audio),
      level: hasil.level,
      ai: ai.status,
      model: ai.status === 'ok' ? ai.model : undefined,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(hasil, { status: 200 });
  } catch (err: unknown) {
    log(
      {
        status: 200,
        fallback: true,
        errorType: err instanceof Error ? err.name : 'UnknownError',
        durationMs: Date.now() - startTime,
      },
      'error'
    );

    const konteks = jawaban ? generateHasilVideoLokal(jawaban) : null;
    const darurat: FormatDataHasil = filterFormatDataHasil({
      halaman: 'video',
      level: konteks?.level ?? 'tidak_ditemukan',
      ringkasan: konteks?.ringkasan ?? ringkasanUntuk('wajar', { isiUcapan: false, cerita: false, adaAi: false }),
      temuan: konteks?.temuan ?? [],
      hal_wajar: konteks?.hal_wajar ?? [],
      langkah: konteks?.langkah ?? [
        'Telepon balik orangnya ke nomor lama yang kamu simpan sendiri sebelum menuruti permintaan apa pun.',
        'Jangan transfer uang atau memberi kode OTP sebelum yakin itu benar orangnya.',
      ],
      situasi_darurat: konteks?.situasi_darurat ?? [],
      batasan: 'Analisis AI sedang tidak tersedia, jadi hasil ini hanya dari cerita yang kamu isi.',
      pihak_ketiga: [NAMA_ANALISIS_AI],
      status_layanan: { ai: 'gagal' },
    });
    return NextResponse.json(darurat, { status: 200 });
  }
}
