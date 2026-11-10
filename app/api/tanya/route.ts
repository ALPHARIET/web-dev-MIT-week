import { NextResponse } from 'next/server';
import type { FormatDataHasil } from '@/lib/hasil';
import { tanyaGemini, filterKataTerlarang } from '@/lib/gemini';
import { bangunJawabanEdukasiBawaan } from '@/lib/tanya-helper';

export interface TanyaRequestBody {
  pertanyaan: string;
  konteksHasil?: FormatDataHasil;
  riwayat?: Array<{ peran: 'pengguna' | 'asisten'; isi: string }>;
}

export interface TanyaResponseBody {
  jawaban: string;
}

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
