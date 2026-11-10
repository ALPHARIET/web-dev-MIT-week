import { NextResponse } from 'next/server';
import {
  type FormatDataHasil,
  type TingkatLevel,
  type Temuan,
  gabungLevel,
} from '@/lib/hasil';
import {
  analyzeChat,
  parseBase64DataUrl,
  filterFormatDataHasil,
} from '@/lib/gemini';
import { cekMagicBytesGambar } from '@/lib/image-utils';
import {
  evaluasiChat,
  generateHasilChatLokal,
  tentukanSituasiDaruratChat,
} from '@/lib/aturan/chat-rules';

const MAKS_PAYLOAD_BYTES = 4 * 1024 * 1024;

export interface CekChatRequestBody {
  mode: 'teks' | 'screenshot';
  teks?: string;
  gambar?: string[];
  konteks?: string;
  levelMinimum?: TingkatLevel;
  temuanAturan?: Temuan[];
}

function bangunHasilFallback(body: CekChatRequestBody): FormatDataHasil {
  const teksEvaluasi =
    body.mode === 'teks'
      ? [body.teks, body.konteks].filter(Boolean).join('\n')
      : body.konteks || '';

  const fallback = generateHasilChatLokal(teksEvaluasi);

  const levelFinal = body.levelMinimum
    ? gabungLevel(body.levelMinimum, fallback.level)
    : fallback.level;
  fallback.level = levelFinal;

  if (Array.isArray(body.temuanAturan) && body.temuanAturan.length > 0) {
    const existingJudul = new Set(
      fallback.temuan.map((t) => t.judul.trim().toLowerCase())
    );
    for (const t of body.temuanAturan) {
      if (t && t.judul && !existingJudul.has(t.judul.trim().toLowerCase())) {
        fallback.temuan.push(t);
        existingJudul.add(t.judul.trim().toLowerCase());
      }
    }
  }

  if (fallback.level !== 'tidak_ditemukan' && fallback.temuan.length === 0) {
    fallback.temuan.push({
      judul: 'Tanda mencurigakan terdeteksi',
      penjelasan: 'Pola pesan atau konteks yang dianalisis terindikasi mencurigakan.',
      bukti: body.teks ? body.teks.slice(0, 60) : 'Screenshot atau konteks percakapan',
      sumber: 'aturan',
    });
  }

  if (fallback.level === 'tinggi') {
    fallback.ringkasan =
      'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.';
  } else if (fallback.level === 'sedang') {
    fallback.ringkasan = 'Ada tanda yang perlu kamu cek dulu sebelum lanjut.';
  } else {
    fallback.ringkasan =
      'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.';
  }

  if (body.mode === 'teks' && (body.teks ?? '').trim().length < 20) {
    fallback.batasan =
      'Catatan: analisis AI sedang tidak tersedia. Teks chat sangat singkat sehingga analisis terbatas. Disarankan menambah konteks percakapan.';
  } else {
    fallback.batasan =
      'Catatan: analisis AI sedang tidak tersedia. Hasil pemeriksaan ini didasarkan sepenuhnya pada aturan lokal.';
  }

  if (!fallback.pihak_ketiga.includes('Google Gemini')) {
    fallback.pihak_ketiga.push('Google Gemini');
  }
  fallback.status_layanan = {
    ...fallback.status_layanan,
    ai: 'gagal',
  };

  if (fallback.langkah.length < 2) {
    fallback.langkah = [
      'Jangan pernah membagikan kode OTP, PIN, password, atau mentransfer uang kepada pengirim.',
      'Verifikasi keaslian kontak atau akun melalui saluran resmi mandiri sebelum mengambil tindakan.',
    ];
  }

  return filterFormatDataHasil(fallback);
}

export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();

  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > MAKS_PAYLOAD_BYTES) {
      const durasiMs = Date.now() - startTime;
      console.error(
        `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=payload_too_large`
      );
      return NextResponse.json(
        {
          error: 'Payload Too Large',
          pesan: 'Ukuran payload melebihi batas maksimal 4 MB',
        },
        { status: 413 }
      );
    }
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=read_body_failed`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: 'Gagal membaca body request',
      },
      { status: 400 }
    );
  }

  const byteLength = Buffer.byteLength(rawBody, 'utf8');
  if (byteLength > MAKS_PAYLOAD_BYTES) {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=payload_too_large`
    );
    return NextResponse.json(
      {
        error: 'Payload Too Large',
        pesan: 'Ukuran payload melebihi batas maksimal 4 MB',
      },
      { status: 413 }
    );
  }

  let body: CekChatRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=invalid_json`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: 'Body request bukan JSON yang valid',
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=invalid_body_type`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: 'Body request harus berupa objek JSON',
      },
      { status: 400 }
    );
  }

  if (body.mode !== 'teks' && body.mode !== 'screenshot') {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=invalid_mode`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: "Mode harus berupa 'teks' atau 'screenshot'",
      },
      { status: 400 }
    );
  }

  if (body.mode === 'teks') {
    if (typeof body.teks !== 'string' || body.teks.trim().length === 0) {
      const durasiMs = Date.now() - startTime;
      console.error(
        `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=empty_text`
      );
      return NextResponse.json(
        {
          error: 'Bad Request',
          pesan: 'Teks percakapan tidak boleh kosong pada mode teks',
        },
        { status: 400 }
      );
    }

    if (body.teks.length > 4000) {
      const durasiMs = Date.now() - startTime;
      console.error(
        `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=text_too_long`
      );
      return NextResponse.json(
        {
          error: 'Bad Request',
          pesan: 'Panjang teks melebihi batas maksimal 4.000 karakter',
        },
        { status: 400 }
      );
    }
  }

  if (body.mode === 'screenshot') {
    if (!Array.isArray(body.gambar) || body.gambar.length === 0) {
      const durasiMs = Date.now() - startTime;
      console.error(
        `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=empty_images`
      );
      return NextResponse.json(
        {
          error: 'Bad Request',
          pesan: 'Gambar tidak boleh kosong pada mode screenshot',
        },
        { status: 400 }
      );
    }

    if (body.gambar.length > 5) {
      const durasiMs = Date.now() - startTime;
      console.error(
        `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=too_many_images`
      );
      return NextResponse.json(
        {
          error: 'Bad Request',
          pesan: 'Jumlah gambar melebihi batas maksimal 5 gambar',
        },
        { status: 400 }
      );
    }
  }

  if (Array.isArray(body.gambar) && body.gambar.length > 0) {
    let totalUkuranGambarBytes = 0;

    for (let i = 0; i < body.gambar.length; i++) {
      const item = body.gambar[i];
      if (typeof item !== 'string' || item.trim().length === 0) {
        const durasiMs = Date.now() - startTime;
        console.error(
          `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=invalid_image_item index=${i}`
        );
        return NextResponse.json(
          {
            error: 'Bad Request',
            pesan: `Data gambar ke-${i + 1} tidak valid atau kosong`,
          },
          { status: 400 }
        );
      }

      const { data } = parseBase64DataUrl(item);
      if (!data) {
        const durasiMs = Date.now() - startTime;
        console.error(
          `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=invalid_base64 index=${i}`
        );
        return NextResponse.json(
          {
            error: 'Bad Request',
            pesan: `Data base64 gambar ke-${i + 1} tidak valid`,
          },
          { status: 400 }
        );
      }

      const imgBuffer = Buffer.from(data, 'base64');
      totalUkuranGambarBytes += imgBuffer.length;

      const tipeGambar = await cekMagicBytesGambar(new Uint8Array(imgBuffer));
      if (!tipeGambar || !['jpg', 'png', 'webp'].includes(tipeGambar)) {
        const durasiMs = Date.now() - startTime;
        console.error(
          `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=unsupported_image_format index=${i}`
        );
        return NextResponse.json(
          {
            error: 'Bad Request',
            pesan: `Format file gambar ke-${i + 1} tidak didukung. Hanya file JPG, PNG, dan WebP yang diterima`,
          },
          { status: 400 }
        );
      }
    }

    if (totalUkuranGambarBytes > MAKS_PAYLOAD_BYTES) {
      const durasiMs = Date.now() - startTime;
      console.error(
        `[POST /api/cek-chat] status=error durasi=${durasiMs}ms errorType=images_total_size_exceeded`
      );
      return NextResponse.json(
        {
          error: 'Payload Too Large',
          pesan: 'Total ukuran data gambar melebihi batas 4 MB',
        },
        { status: 413 }
      );
    }
  }

  let hasilAkhir: FormatDataHasil;

  try {
    const geminiResult = await analyzeChat({
      mode: body.mode,
      teks: body.teks,
      gambar: body.gambar,
      konteks: body.konteks,
      levelMinimum: body.levelMinimum,
    });

    if (geminiResult) {
      if (geminiResult.transkrip && geminiResult.transkrip.trim().length > 0) {
        const hasilTranskrip = evaluasiChat(geminiResult.transkrip);
        geminiResult.level = gabungLevel(geminiResult.level, hasilTranskrip.level);

        const existingJudul = new Set(
          geminiResult.temuan.map((t) => t.judul.trim().toLowerCase())
        );
        for (const temuanAturan of hasilTranskrip.temuan) {
          if (!existingJudul.has(temuanAturan.judul.trim().toLowerCase())) {
            geminiResult.temuan.push(temuanAturan);
            existingJudul.add(temuanAturan.judul.trim().toLowerCase());
          }
        }
      }

      if (body.levelMinimum) {
        geminiResult.level = gabungLevel(body.levelMinimum, geminiResult.level);
      }

      if (Array.isArray(body.temuanAturan) && body.temuanAturan.length > 0) {
        const existingJudul = new Set(
          geminiResult.temuan.map((t) => t.judul.trim().toLowerCase())
        );
        for (const t of body.temuanAturan) {
          if (t && t.judul && !existingJudul.has(t.judul.trim().toLowerCase())) {
            geminiResult.temuan.push(t);
            existingJudul.add(t.judul.trim().toLowerCase());
          }
        }
      }

      const teksUntukSituasi = body.mode === 'teks' ? body.teks : geminiResult.transkrip;
      if (teksUntukSituasi && typeof teksUntukSituasi === 'string') {
        const hasilLokal = evaluasiChat(teksUntukSituasi);
        const situasiLokal = tentukanSituasiDaruratChat(teksUntukSituasi, hasilLokal);
        const setSituasi = new Set([...(geminiResult.situasi_darurat || []), ...situasiLokal]);
        geminiResult.situasi_darurat = Array.from(setSituasi);
      }

      if (
        geminiResult.level === 'tinggi' &&
        geminiResult.ringkasan.toLowerCase().includes('tidak menemukan')
      ) {
        geminiResult.ringkasan =
          'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.';
      } else if (
        geminiResult.level === 'sedang' &&
        geminiResult.ringkasan.toLowerCase().includes('tidak menemukan')
      ) {
        geminiResult.ringkasan =
          'Ada tanda yang perlu kamu cek dulu sebelum lanjut.';
      }

      if (geminiResult.level !== 'tidak_ditemukan' && geminiResult.temuan.length === 0) {
        geminiResult.temuan.push({
          judul: 'Tanda mencurigakan terdeteksi',
          penjelasan: 'Pola dalam pesan menyerupai indikasi penipuan yang sering dilaporkan.',
          bukti: body.teks ? body.teks.slice(0, 60) : 'Pesan atau tangkapan layar percakapan',
          sumber: 'ai',
        });
      }

      if (!Array.isArray(geminiResult.langkah) || geminiResult.langkah.length < 2) {
        const defaultLangkah = [
          'Jangan pernah membagikan kode OTP, PIN, password, atau mentransfer uang kepada pengirim.',
          'Verifikasi keaslian kontak atau akun melalui saluran resmi mandiri sebelum mengambil tindakan.',
        ];
        geminiResult.langkah = Array.isArray(geminiResult.langkah)
          ? [...geminiResult.langkah, ...defaultLangkah].slice(0, Math.max(2, geminiResult.langkah.length))
          : defaultLangkah;
      }

      if (!geminiResult.pihak_ketiga.includes('Google Gemini')) {
        geminiResult.pihak_ketiga.push('Google Gemini');
      }
      geminiResult.status_layanan = {
        ...(geminiResult.status_layanan || {}),
        ai: 'ok',
      };

      hasilAkhir = filterFormatDataHasil(geminiResult);

      const durasiMs = Date.now() - startTime;
      console.log(
        `[POST /api/cek-chat] status=sukses durasi=${durasiMs}ms mode=${body.mode}`
      );
    } else {
      hasilAkhir = bangunHasilFallback(body);

      const durasiMs = Date.now() - startTime;
      console.warn(
        `[POST /api/cek-chat] status=fallback durasi=${durasiMs}ms mode=${body.mode} errorType=ai_gagal_atau_timeout`
      );
    }
  } catch {
    hasilAkhir = bangunHasilFallback(body);

    const durasiMs = Date.now() - startTime;
    console.warn(
      `[POST /api/cek-chat] status=fallback durasi=${durasiMs}ms mode=${body.mode} errorType=unexpected_exception`
    );
  }

  return NextResponse.json(hasilAkhir, { status: 200 });
}
