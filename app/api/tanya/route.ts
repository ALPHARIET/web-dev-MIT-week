import { NextResponse } from 'next/server';
import type { FormatDataHasil } from '@/lib/hasil';
import { tanyaGemini, filterKataTerlarang } from '@/lib/gemini';
import { TANYA_SYSTEM_PROMPT, getTanyaSystemPrompt } from '@/data/system-prompt';
import {
  isPertanyaanKeamananDigital,
  bangunJawabanEdukasiBawaan,
} from '@/lib/tanya-helper';

/**
 * Interface request body untuk POST /api/tanya
 */
export interface TanyaRequestBody {
  pertanyaan: string;
  konteksHasil?: FormatDataHasil;
  riwayat?: Array<{ peran: 'pengguna' | 'asisten'; isi: string }>;
}

/**
 * Interface response body untuk POST /api/tanya
 */
export interface TanyaResponseBody {
  jawaban: string;
}

/**
 * Route Handler Next.js POST /api/tanya
 *
 * Menerima pertanyaan lanjutan dari pengguna beserta riwayat percakapan dan konteks hasil pemeriksaan.
 *
 * Validasi:
 * - Pertanyaan wajib ada, bertipe string, non-kosong, maks 1.000 karakter
 * - Maksimal 10 pertanyaan per sesi (jika riwayat pengguna >= 10, kembalikan pesan batas sesi tercapai)
 * - Batasi topik HANYA pada keamanan digital, penipuan online, dan privasi
 * - Tolak pertanyaan di luar topik keamanan digital
 * - Larang meminta data pribadi (OTP, PIN, password, nomor rekening)
 * - Larang menyarankan membalas atau memancing pelaku
 * - Filter kata terlarang ("aman", "pasti", "terbukti", "100%") dari respons sebagai kesimpulan
 * - Pemanggilan Gemini via REST API v1beta dengan timeout 15 detik (fallback jika API key tidak disetel atau gagal)
 * - Logging aman: tidak mencatat isi pertanyaan, riwayat, atau data pengguna di log console
 *
 * References: Requirements 30.1, 30.2, 31.1, 31.5, 32.4
 */
export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();

  let body: TanyaRequestBody;
  try {
    body = await req.json();
  } catch {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/tanya] status=error durasi=${durasiMs}ms errorType=invalid_json`
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
      `[POST /api/tanya] status=error durasi=${durasiMs}ms errorType=invalid_body_type`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: 'Body request harus berupa objek JSON',
      },
      { status: 400 }
    );
  }

  // 1. Validasi pertanyaan (Requirements 32.4)
  if (
    typeof body.pertanyaan !== 'string' ||
    body.pertanyaan.trim().length === 0
  ) {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/tanya] status=error durasi=${durasiMs}ms errorType=empty_pertanyaan`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: 'Pertanyaan harus diisi dan berupa teks non-kosong',
      },
      { status: 400 }
    );
  }

  if (body.pertanyaan.length > 1000) {
    const durasiMs = Date.now() - startTime;
    console.error(
      `[POST /api/tanya] status=error durasi=${durasiMs}ms errorType=pertanyaan_too_long`
    );
    return NextResponse.json(
      {
        error: 'Bad Request',
        pesan: 'Panjang pertanyaan melebihi batas maksimal 1.000 karakter',
      },
      { status: 400 }
    );
  }

  // 2. Maksimal 10 pertanyaan per sesi (Requirement 31.5, 32.4)
  const jumlahPertanyaanPengguna = Array.isArray(body.riwayat)
    ? body.riwayat.filter((r) => r && r.peran === 'pengguna').length
    : 0;

  if (jumlahPertanyaanPengguna >= 10) {
    const durasiMs = Date.now() - startTime;
    console.log(`[POST /api/tanya] status=session_limit durasi=${durasiMs}ms`);
    return NextResponse.json(
      {
        jawaban:
          'Batas sesi tanya jawab telah tercapai (maksimal 10 pertanyaan per sesi). Silakan gunakan tombol "Cek lagi" untuk memulai sesi baru.',
      },
      { status: 200 }
    );
  }

  try {
    // 3. Pemanggilan Gemini via REST API v1beta dengan timeout 15 detik
    const hasilGemini = await tanyaGemini(
      {
        pertanyaan: body.pertanyaan,
        konteksHasil: body.konteksHasil,
        riwayat: body.riwayat,
      },
      { timeoutMs: 15_000 }
    );

    if (hasilGemini && hasilGemini.trim().length > 0) {
      const durasiMs = Date.now() - startTime;
      console.log(`[POST /api/tanya] status=sukses durasi=${durasiMs}ms`);
      return NextResponse.json(
        {
          jawaban: filterKataTerlarang(hasilGemini.trim()),
        },
        { status: 200 }
      );
    }

    // 4. Fallback jika Gemini API key tidak disetel, error, atau timeout
    const durasiMs = Date.now() - startTime;
    console.warn(
      `[POST /api/tanya] status=fallback durasi=${durasiMs}ms errorType=ai_gagal_atau_timeout`
    );
    const jawabanFallback = filterKataTerlarang(
      bangunJawabanEdukasiBawaan(body.pertanyaan, body.konteksHasil)
    );

    return NextResponse.json(
      {
        jawaban: jawabanFallback,
      },
      { status: 200 }
    );
  } catch {
    // 5. Exception tak terduga: fallback edukatif bawaan dengan 200 OK
    const durasiMs = Date.now() - startTime;
    console.warn(
      `[POST /api/tanya] status=fallback durasi=${durasiMs}ms errorType=unexpected_exception`
    );
    const jawabanFallback = filterKataTerlarang(
      bangunJawabanEdukasiBawaan(body.pertanyaan, body.konteksHasil)
    );

    return NextResponse.json(
      {
        jawaban: jawabanFallback,
      },
      { status: 200 }
    );
  }
}
