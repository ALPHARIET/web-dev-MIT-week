import { NextResponse } from 'next/server';
import {
  checkMediaManipulation,
  type TipeMediaRealityDefender,
} from '@/lib/reality-defender';
import {
  generateHasilVideoLokal,
  type JawabanWizardVideo,
} from '@/lib/aturan/video-rules';
import {
  gabungLevel,
  type FormatDataHasil,
  type TingkatLevel,
  type Temuan,
  type SituasiDarurat,
} from '@/lib/hasil';
import { filterFormatDataHasil } from '@/lib/gemini';

/** Batas maksimal ukuran payload request: 4.5 MB (batas Vercel serverless function) */
const MAKS_PAYLOAD_BYTES = 4.5 * 1024 * 1024;

/** Interface request body POST /api/cek-media */
export interface CekMediaRequestBody {
  tipe: TipeMediaRealityDefender;
  data: string; // Base64 data URL atau base64 string
  durasiDetik?: number; // Terutama untuk audio (12 detik - 5 menit)
  jawabanWizard?: JawabanWizardVideo; // Jawaban konteks pengguna jika tersedia
  levelMinimum?: TingkatLevel; // Level kewaspadaan minimum dari konteks lokal
}

/**
 * Route Handler POST /api/cek-media (Fitur P1)
 *
 * Menerima frame gambar (ekstraksi canvas browser) atau file audio (base64)
 * untuk dianalisis manipulasinya menggunakan Reality Defender API.
 *
 * Aturan Tampilan & Keamanan (Requirement VS-06, 32.3):
 * 1. Hasil Reality Defender ditampilkan sebagai "sinyal tambahan", bukan vonis mutlak.
 * 2. Level risiko dari konteks situasi (jawaban wizard) menjadi lantai minimum:
 *    - Jika konteks 'tinggi', level TIDAK AKAN PERNAH diturunkan ke 'sedang' atau 'tidak_ditemukan',
 *      meskipun AI menyatakan media kemungkinan asli.
 *    - Jika AI mendeteksi manipulasi, tingkat risiko digabungkan ke level tertinggi ('tinggi').
 * 3. Jika API Reality Defender gagal atau kuota habis:
 *    - Selalu kembalikan 200 OK dengan FormatDataHasil berbasis aturan konteks,
 *      disertai catatan "analisis file sedang tidak tersedia".
 * 4. Keterbatasan Reality Defender (50 scan/bulan, audio 12 detik-5 menit, tanpa bahasa Indonesia)
 *    dicatat secara transparan di properti batasan dan temuan.
 *
 * References: Requirements VS-06 (P1), 32.3, 32.5
 */
export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();

  // 1. Validasi Batas Ukuran Payload (Requirement 26.1)
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > MAKS_PAYLOAD_BYTES) {
      console.warn(
        JSON.stringify({
          endpoint: 'POST /api/cek-media',
          status: 413,
          errorType: 'PayloadTooLarge',
          durationMs: Date.now() - startTime,
        })
      );
      return NextResponse.json(
        {
          error:
            'Ukuran payload media melebihi batas maksimal 4.5 MB. Harap perkecil ukuran file atau ekstrak frame gambar beresolusi lebih rendah.',
        },
        { status: 413 }
      );
    }
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    console.warn(
      JSON.stringify({
        endpoint: 'POST /api/cek-media',
        status: 400,
        errorType: 'InvalidJSON',
        durationMs: Date.now() - startTime,
      })
    );
    return NextResponse.json(
      { error: 'Format permintaan tidak valid' },
      { status: 400 }
    );
  }

  const byteLength = Buffer.byteLength(rawBody, 'utf8');
  if (byteLength > MAKS_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        error:
          'Ukuran payload media melebihi batas maksimal 4.5 MB. Harap perkecil ukuran file atau ekstrak frame gambar beresolusi lebih rendah.',
      },
      { status: 413 }
    );
  }

  let body: CekMediaRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.warn(
      JSON.stringify({
        endpoint: 'POST /api/cek-media',
        status: 400,
        errorType: 'InvalidJSON',
        durationMs: Date.now() - startTime,
      })
    );
    return NextResponse.json(
      { error: 'Format permintaan tidak valid' },
      { status: 400 }
    );
  }

  // 2. Validasi input request body
  if (
    !body ||
    (body.tipe !== 'gambar' && body.tipe !== 'audio') ||
    typeof body.data !== 'string' ||
    body.data.trim() === ''
  ) {
    console.warn(
      JSON.stringify({
        endpoint: 'POST /api/cek-media',
        status: 400,
        errorType: 'ValidationError',
        durationMs: Date.now() - startTime,
      })
    );
    return NextResponse.json(
      {
        error:
          'Data media (gambar atau audio base64) dan tipe ("gambar" | "audio") wajib diisi',
      },
      { status: 400 }
    );
  }

  try {
    // 3. Evaluasi Konteks Lokal (Lantai Minimum)
    let baseLevel: TingkatLevel = 'tidak_ditemukan';
    let daftarTemuan: Temuan[] = [];
    let daftarLangkah: string[] = [
      'Verifikasi identitas pengirim melalui saluran komunikasi mandiri sebelum mengambil tindakan apa pun.',
      'Jangan membagikan data sensitif atau mengirimkan dana kepada pihak yang identitasnya belum terkonfirmasi.',
    ];
    let daftarSituasiDarurat: SituasiDarurat[] = [];
    let daftarHalWajar: string[] = [
      'Kualitas visual atau audio tampak meyakinkan karena teknologi generative AI mampu merekayasa media dengan detail yang sangat halus.',
    ];

    if (body.jawabanWizard) {
      const konteksHasil = generateHasilVideoLokal(body.jawabanWizard);
      baseLevel = konteksHasil.level;
      daftarTemuan = [...konteksHasil.temuan];
      daftarLangkah = [...konteksHasil.langkah];
      daftarSituasiDarurat = [...konteksHasil.situasi_darurat];
      if (konteksHasil.hal_wajar && konteksHasil.hal_wajar.length > 0) {
        daftarHalWajar = [...konteksHasil.hal_wajar];
      }
    }

    if (body.levelMinimum) {
      baseLevel = gabungLevel(body.levelMinimum, baseLevel);
    }

    // 4. Panggil Reality Defender API
    const rdResult = await checkMediaManipulation({
      tipe: body.tipe,
      data: body.data,
      durasiDetik: body.durasiDetik,
    });

    // 5. Aturan Tampilan & Penggabungan Level (Requirement VS-06)
    // Sinyal tambahan: jika terdeteksi manipulasi, tingkat kewaspadaan dinaikkan.
    // Jika tidak terdeteksi manipulasi atau API gagal, level konteks tetap lantai minimum (TIDAK PERNAH diturunkan).
    let levelAkhir = baseLevel;
    if (rdResult.status === 'ok' && rdResult.ditemukan) {
      levelAkhir = gabungLevel(baseLevel, 'tinggi');
    }

    // 6. Bentuk Temuan Reality Defender jika manipulasi terdeteksi
    if (rdResult.status === 'ok' && rdResult.ditemukan) {
      const isAudio = body.tipe === 'audio';
      const temuanMedia: Temuan = {
        judul: isAudio
          ? 'Indikasi manipulasi suara / voice cloning terdeteksi oleh AI'
          : 'Indikasi manipulasi visual / deepfake terdeteksi oleh AI',
        penjelasan: isAudio
          ? 'Reality Defender mendeteksi karakteristik audio tiruan atau kecocokan dengan pola kloning suara AI. Catatan: Hasil analisis AI ini merupakan sinyal tambahan dan bukan vonis mutlak.'
          : 'Reality Defender mendeteksi ketidakwajaran sintetis atau pola manipulasi deepfake pada frame visual. Catatan: Hasil analisis AI ini merupakan sinyal tambahan dan bukan vonis mutlak.',
        bukti: `Hasil Reality Defender: ${rdResult.keterangan}`,
        sumber: 'reality_defender',
      };
      daftarTemuan.push(temuanMedia);
    }

    // 7. Bentuk Ringkasan Sesuai Level Akhir
    let ringkasan: string;
    if (levelAkhir === 'tinggi') {
      ringkasan =
        'Ada beberapa tanda kuat yang mirip pola penipuan atau manipulasi media AI. Jangan lanjutkan sebelum memverifikasi langsung.';
    } else if (levelAkhir === 'sedang') {
      ringkasan =
        'Ada beberapa indikasi yang perlu kamu periksa dan verifikasi lebih lanjut sebelum mengambil tindakan.';
    } else {
      ringkasan =
        'Kami tidak menemukan tanda bahaya yang kuat dari pemeriksaan media ini. Ini tidak berarti pasti aman; tetap lakukan verifikasi langsung.';
    }

    // 8. Keterangan Batasan & Transparansi Layanan
    let batasan =
      'Hasil analisis Reality Defender merupakan sinyal tambahan dan bukan vonis mutlak. Batasan layanan: kuota gratis 50 scan/bulan dan bahasa Indonesia belum didukung secara resmi.';
    if (rdResult.status !== 'ok') {
      batasan +=
        ' Catatan: Analisis file media pihak ketiga sedang tidak tersedia; hasil didasarkan pada aturan konteks situasi.';
    }

    // Pastikan langkah minimal 2 item
    if (daftarLangkah.length < 2) {
      daftarLangkah.push(
        'Jangan pernah menuruti permintaan transfer atau pengiriman data rahasia dari pihak yang belum terverifikasi.'
      );
    }

    // 9. Susun Objek FormatDataHasil Lengkap
    const responFinal: FormatDataHasil = filterFormatDataHasil({
      halaman: 'video',
      level: levelAkhir,
      ringkasan,
      temuan: daftarTemuan,
      hal_wajar: daftarHalWajar,
      langkah: daftarLangkah,
      situasi_darurat: daftarSituasiDarurat,
      batasan,
      pihak_ketiga: ['Reality Defender'],
      status_layanan: {
        reality_defender: rdResult.status,
      },
    });

    console.log(
      JSON.stringify({
        endpoint: 'POST /api/cek-media',
        status: 200,
        tipe: body.tipe,
        level: responFinal.level,
        rdStatus: rdResult.status,
        rdDitemukan: rdResult.ditemukan,
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(responFinal, { status: 200 });
  } catch (err: unknown) {
    // 10. Fallback Darurat: Selalu kembalikan 200 OK dengan hasil parsial jika terjadi kesalahan server (Requirement 29.1, 32.5)
    console.error(
      JSON.stringify({
        endpoint: 'POST /api/cek-media',
        status: 200,
        fallback: true,
        errorType: err instanceof Error ? err.name : 'UnknownError',
        durationMs: Date.now() - startTime,
      })
    );

    const fallbackKonteks = body?.jawabanWizard
      ? generateHasilVideoLokal(body.jawabanWizard)
      : null;

    const responDarurat: FormatDataHasil = filterFormatDataHasil({
      halaman: 'video',
      level: fallbackKonteks?.level ?? body?.levelMinimum ?? 'tidak_ditemukan',
      ringkasan:
        fallbackKonteks?.ringkasan ??
        'Pemeriksaan media tidak dapat memproses file secara lengkap saat ini. Tetap berhati-hati dan verifikasi ke pihak terkait.',
      temuan: fallbackKonteks?.temuan ?? [],
      hal_wajar: fallbackKonteks?.hal_wajar ?? [
        'Kualitas rekaman media tampak natural.',
      ],
      langkah: fallbackKonteks?.langkah ?? [
        'Verifikasi identitas pengirim melalui saluran komunikasi mandiri sebelum mengambil tindakan apa pun.',
        'Jangan membagikan data sensitif atau mengirimkan dana kepada pihak yang identitasnya belum terkonfirmasi.',
      ],
      situasi_darurat: fallbackKonteks?.situasi_darurat ?? [],
      batasan:
        'Analisis file media pihak ketiga sedang tidak tersedia. Hasil didasarkan pada aturan konteks situasi.',
      pihak_ketiga: ['Reality Defender'],
      status_layanan: {
        reality_defender: 'gagal',
      },
    });

    return NextResponse.json(responDarurat, { status: 200 });
  }
}
