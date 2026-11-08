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
} from '@/lib/aturan/chat-rules';

/** Batas maksimal payload 4 MB (Requirement 26.1: <= 4 MB, di bawah Vercel 4.5 MB) */
const MAKS_PAYLOAD_BYTES = 4 * 1024 * 1024; // 4.194.304 bytes

/** Tipe request body POST /api/cek-chat */
export interface CekChatRequestBody {
  mode: 'teks' | 'screenshot';
  teks?: string;
  gambar?: string[];
  konteks?: string;
  levelMinimum?: TingkatLevel;
  temuanAturan?: Temuan[];
}

/**
 * Membangun objek FormatDataHasil cadangan (fallback) berbasis aturan lokal
 * ketika Gemini API mengalami error, timeout (>20 detik), atau tidak disetel.
 *
 * References: Requirements 14.4, 15.1, 15.3, 29.1, 29.2, 29.4
 */
function bangunHasilFallback(body: CekChatRequestBody): FormatDataHasil {
  const teksEvaluasi =
    body.mode === 'teks'
      ? [body.teks, body.konteks].filter(Boolean).join('\n')
      : body.konteks || '';

  const fallback = generateHasilChatLokal(teksEvaluasi);

  // Gabungkan level aturan lokal dengan levelMinimum dari client (Requirement 14.4)
  const levelFinal = body.levelMinimum
    ? gabungLevel(body.levelMinimum, fallback.level)
    : fallback.level;
  fallback.level = levelFinal;

  // Gabungkan temuan aturan yang dikirim oleh client
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

  // Jika level > tidak_ditemukan dan temuan kosong, berikan temuan indikasi (Requirement 5.2)
  if (fallback.level !== 'tidak_ditemukan' && fallback.temuan.length === 0) {
    fallback.temuan.push({
      judul: 'Tanda mencurigakan terdeteksi',
      penjelasan: 'Pola pesan atau konteks yang dianalisis terindikasi mencurigakan.',
      bukti: body.teks ? body.teks.slice(0, 60) : 'Screenshot atau konteks percakapan',
      sumber: 'aturan',
    });
  }

  // Sesuaikan ringkasan dengan level final
  if (fallback.level === 'tinggi') {
    fallback.ringkasan =
      'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.';
  } else if (fallback.level === 'sedang') {
    fallback.ringkasan = 'Ada tanda yang perlu kamu cek dulu sebelum lanjut.';
  } else {
    fallback.ringkasan =
      'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.';
  }

  // Keterangan khusus jika teks terlalu pendek (Requirement 16.3)
  if (body.mode === 'teks' && (body.teks ?? '').trim().length < 20) {
    fallback.batasan =
      'Catatan: analisis AI sedang tidak tersedia. Teks chat sangat singkat sehingga analisis terbatas. Disarankan menambah konteks percakapan.';
  } else {
    // Batasan memuat catatan analisis AI sedang tidak tersedia (Requirement 15.1)
    fallback.batasan =
      'Catatan: analisis AI sedang tidak tersedia. Hasil pemeriksaan ini didasarkan sepenuhnya pada aturan lokal.';
  }

  // Pihak ketiga dan status layanan: AI gagal (Requirement 15.1, 29.2)
  if (!fallback.pihak_ketiga.includes('Google Gemini')) {
    fallback.pihak_ketiga.push('Google Gemini');
  }
  fallback.status_layanan = {
    ...fallback.status_layanan,
    ai: 'gagal',
  };

  // Pastikan minimal 2 langkah tindakan (Requirement 5.4, 29.4)
  if (fallback.langkah.length < 2) {
    fallback.langkah = [
      'Jangan pernah membagikan kode OTP, PIN, password, atau mentransfer uang kepada pengirim.',
      'Verifikasi keaslian kontak atau akun melalui saluran resmi mandiri sebelum mengambil tindakan.',
    ];
  }

  return filterFormatDataHasil(fallback);
}

/**
 * Route Handler Next.js POST /api/cek-chat
 *
 * Alur pemeriksaan:
 * 1. Validasi request body:
 *    - Ukuran <= 4 MB (jika melebihi, kembalikan 413 Payload Too Large)
 *    - Format JSON valid (jika salah, kembalikan 400 Bad Request)
 *    - Mode valid ('teks' | 'screenshot')
 *    - Teks atau gambar tidak boleh kosong
 *    - Validasi magic bytes gambar (JPG, PNG, WebP)
 * 2. Pemanggilan AI via `analyzeChat` dari `lib/gemini.ts` dengan timeout 20 detik.
 * 3. Untuk screenshot: jika Gemini mengembalikan `transkrip`, jalankan aturan lokal
 *    server `evaluasiChat(transkrip)` dan gabungkan temuan serta tingkatkan level.
 * 4. Gabungkan tingkat level: `gabungLevel(levelMinimum, levelAI)` menjamin level tidak pernah turun.
 * 5. Jika Gemini error, timeout, atau API key tidak disetel: kembalikan hasil aturan lokal
 *    dengan `status_layanan.ai = 'gagal'` (selalu 200 OK dengan hasil parsial, bukan 500).
 * 6. Logging aman: tidak mencatat isi pesan chat, gambar, atau data pengguna di log (hanya status, durasi, jenis error).
 *
 * References: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.3, 25.4, 26.1, 26.2, 26.3, 26.4, 28.3, 32.1
 */
export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();

  // 1. Validasi batas ukuran payload dari Content-Length header jika tersedia (Requirement 26.1)
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

  // 2. Baca body teks dan verifikasi ukuran byte sebenarnya
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

  // 3. Parse JSON body (Requirement 26.4)
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

  // 4. Validasi mode pemeriksaan
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

  // 5. Validasi mode 'teks'
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

  // 6. Validasi mode 'screenshot'
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

  // 7. Validasi magic bytes gambar (JPG, PNG, WebP) jika ada gambar (Requirements 26.2, 26.3, 26.4)
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

  // 8. Eksekusi analisis Gemini atau fallback
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
      // 8a. Untuk screenshot: jika Gemini mengembalikan transkrip, jalankan aturan lokal server evaluasiChat (Requirement 14.3)
      if (geminiResult.transkrip && geminiResult.transkrip.trim().length > 0) {
        const hasilTranskrip = evaluasiChat(geminiResult.transkrip);
        // Level aturan lokal atas transkrip tidak boleh diturunkan
        geminiResult.level = gabungLevel(geminiResult.level, hasilTranskrip.level);

        // Gabungkan temuan dari aturan transkrip jika belum ada
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

      // 8b. Gabungkan tingkat level dengan levelMinimum dari client (Requirement 14.4)
      if (body.levelMinimum) {
        geminiResult.level = gabungLevel(body.levelMinimum, geminiResult.level);
      }

      // 8c. Gabungkan temuan aturan yang dikirim oleh client
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

      // 8d. Pastikan ringkasan selaras jika level dinaikkan
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

      // 8e. Pastikan minimal 1 temuan jika level > tidak_ditemukan (Requirement 5.2)
      if (geminiResult.level !== 'tidak_ditemukan' && geminiResult.temuan.length === 0) {
        geminiResult.temuan.push({
          judul: 'Tanda mencurigakan terdeteksi',
          penjelasan: 'Pola dalam pesan menyerupai indikasi penipuan yang sering dilaporkan.',
          bukti: body.teks ? body.teks.slice(0, 60) : 'Pesan atau tangkapan layar percakapan',
          sumber: 'ai',
        });
      }

      // 8f. Pastikan minimal 2 langkah tindakan
      if (!Array.isArray(geminiResult.langkah) || geminiResult.langkah.length < 2) {
        const defaultLangkah = [
          'Jangan pernah membagikan kode OTP, PIN, password, atau mentransfer uang kepada pengirim.',
          'Verifikasi keaslian kontak atau akun melalui saluran resmi mandiri sebelum mengambil tindakan.',
        ];
        geminiResult.langkah = Array.isArray(geminiResult.langkah)
          ? [...geminiResult.langkah, ...defaultLangkah].slice(0, Math.max(2, geminiResult.langkah.length))
          : defaultLangkah;
      }

      // 8g. Pihak ketiga dan status layanan
      if (!geminiResult.pihak_ketiga.includes('Google Gemini')) {
        geminiResult.pihak_ketiga.push('Google Gemini');
      }
      geminiResult.status_layanan = {
        ...(geminiResult.status_layanan || {}),
        ai: 'ok',
      };

      hasilAkhir = filterFormatDataHasil(geminiResult);

      // Logging aman: hanya mencatat status, durasi, mode (Requirement 25.4)
      const durasiMs = Date.now() - startTime;
      console.log(
        `[POST /api/cek-chat] status=sukses durasi=${durasiMs}ms mode=${body.mode}`
      );
    } else {
      // Gemini null -> fallback ke aturan lokal (Requirements 15.1, 15.3, 29.1, 29.2)
      hasilAkhir = bangunHasilFallback(body);

      // Logging aman: hanya status, durasi, jenis error (Requirement 25.4)
      const durasiMs = Date.now() - startTime;
      console.warn(
        `[POST /api/cek-chat] status=fallback durasi=${durasiMs}ms mode=${body.mode} errorType=ai_gagal_atau_timeout`
      );
    }
  } catch {
    // Tangani error tak terduga: selalu kembalikan 200 OK dengan hasil parsial (bukan 500)
    hasilAkhir = bangunHasilFallback(body);

    const durasiMs = Date.now() - startTime;
    console.warn(
      `[POST /api/cek-chat] status=fallback durasi=${durasiMs}ms mode=${body.mode} errorType=unexpected_exception`
    );
  }

  return NextResponse.json(hasilAkhir, { status: 200 });
}
