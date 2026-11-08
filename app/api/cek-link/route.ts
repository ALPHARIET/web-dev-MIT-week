import { NextResponse } from 'next/server';
import { parseUrl, sanitasiParams } from '@/lib/sanitasi-url';
import {
  evaluasiLeksikalUrl,
  generateHasilLinkLokal,
} from '@/lib/aturan/link-rules';
import { checkSafeBrowsing } from '@/lib/safe-browsing';
import { queryDomainAge } from '@/lib/rdap';
import { checkVirusTotal } from '@/lib/virustotal';
import {
  explainLink,
  filterFormatDataHasil,
  type PaketDiagnostikLink,
} from '@/lib/gemini';
import {
  gabungLevel,
  type FormatDataHasil,
  type TingkatLevel,
  type Temuan,
  type StatusLayanan,
} from '@/lib/hasil';
import linkContohJson from '@/data/contoh/link-contoh.json';

/** Interface request body POST /api/cek-link */
export interface CekLinkRequestBody {
  url?: string;
  levelMinimum?: TingkatLevel;
  temuanAturan?: Temuan[];
}

/**
 * Mencocokkan URL yang dimasukkan dengan skenario contoh fiktif di data/contoh/link-contoh.json.
 * Requirement 21.1: Jika cocok, langsung kembalikan respons simulasi tanpa memanggil
 * Google Safe Browsing, RDAP, atau Gemini API.
 */
function cariContohFiktif(inputUrl: string): FormatDataHasil | null {
  if (!inputUrl) return null;

  const cleanInput = inputUrl.trim().toLowerCase().replace(/\/+$/, '');
  const noProtoInput = cleanInput.replace(/^[a-z]+:\/\//, '');

  for (const skenario of linkContohJson.skenario) {
    const cleanExample = skenario.url.trim().toLowerCase().replace(/\/+$/, '');
    const noProtoExample = cleanExample.replace(/^[a-z]+:\/\//, '');

    if (cleanInput === cleanExample || noProtoInput === noProtoExample) {
      return skenario.hasilSimulasi as FormatDataHasil;
    }
  }

  return null;
}

/**
 * Route Handler POST /api/cek-link
 *
 * Menerima URL untuk diperiksa terhadap ancaman phishing, malware, dan pola penipuan.
 *
 * Alur pemeriksaan:
 * 1. Validasi request body (URL wajib ada, panjang <= 2.000 karakter, kembalikan 400 jika tidak valid).
 * 2. Sanitasi URL: buang parameter sensitif (email, token, password, otp, dll.).
 * 3. Cek skenario contoh fiktif: jika cocok, kembalikan respons simulasi langsung tanpa API eksternal.
 * 4. Jalankan 3 pemeriksaan paralel dengan Promise.allSettled dan timeout 5 detik:
 *    - Google Safe Browsing Lookup
 *    - RDAP query umur domain
 *    - Analisis leksikal server
 * 5. Hitung skor gabungan dan gabung level (ambil level tertinggi dari aturan dan data API).
 * 6. Kirim paket diagnostik (tanpa data sensitif) ke Gemini explainLink dengan timeout 10 detik.
 * 7. Jika Gemini gagal/timeout, gunakan teks penjelasan bawaan aturan lokal.
 * 8. Format respons sebagai FormatDataHasil lengkap dan kembalikan 200 OK.
 * 9. Logging aman: hanya mencatat status, durasi, dan jenis error (tanpa isi URL).
 *
 * References: Requirements 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 20.1, 20.2, 20.3, 21.1, 28.2, 28.4, 32.2
 */
export async function POST(req: Request): Promise<Response> {
  const startTime = Date.now();

  let body: CekLinkRequestBody;
  try {
    body = await req.json();
  } catch {
    console.warn(
      JSON.stringify({
        endpoint: 'POST /api/cek-link',
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

  // 1. Validasi request body (Requirement 17.1)
  if (
    !body ||
    typeof body.url !== 'string' ||
    body.url.trim().length === 0 ||
    body.url.length > 2000
  ) {
    console.warn(
      JSON.stringify({
        endpoint: 'POST /api/cek-link',
        status: 400,
        errorType: 'ValidationError',
        durationMs: Date.now() - startTime,
      })
    );
    return NextResponse.json(
      { error: 'URL harus diisi dan maksimal 2.000 karakter' },
      { status: 400 }
    );
  }

  const rawUrl = body.url.trim();

  // 2. Sanitasi URL: buang parameter sensitif (Requirement 17.3, 17.4)
  const parsed = parseUrl(rawUrl);
  const sanitasi = sanitasiParams(parsed);
  const urlBersih = sanitasi.urlBersih || rawUrl;

  // 3. Cek contoh fiktif di data/contoh/link-contoh.json (Requirement 21.1)
  const contohHasil = cariContohFiktif(rawUrl) || cariContohFiktif(urlBersih);
  if (contohHasil) {
    console.log(
      JSON.stringify({
        endpoint: 'POST /api/cek-link',
        status: 200,
        mode: 'simulasi_contoh',
        durationMs: Date.now() - startTime,
      })
    );
    return NextResponse.json(contohHasil);
  }

  try {
    // 4. Jalankan 4 pemeriksaan paralel dengan Promise.allSettled & timeout 5 detik (Requirement 18.1, 18.2, 18.3, LN-08)
    const [sbSettled, rdapSettled, , vtSettled] = await Promise.allSettled([
      checkSafeBrowsing(urlBersih, { timeoutMs: 5000 }),
      queryDomainAge(urlBersih, { timeoutMs: 5000 }),
      Promise.resolve().then(() => evaluasiLeksikalUrl(urlBersih)),
      checkVirusTotal(urlBersih, { timeoutMs: 5000 }),
    ]);

    // Ekstrak hasil Safe Browsing
    let isSafeBrowsingThreat = false;
    let statusSafeBrowsing: StatusLayanan = 'gagal';
    if (sbSettled.status === 'fulfilled') {
      const sb = sbSettled.value;
      statusSafeBrowsing = sb.status;
      isSafeBrowsingThreat = sb.ditemukan === true;
    }

    // Ekstrak hasil RDAP
    let rdapAgeDays: number | undefined = undefined;
    let statusRdap: StatusLayanan = 'gagal';
    if (rdapSettled.status === 'fulfilled') {
      const rdap = rdapSettled.value;
      statusRdap = rdap.status;
      if (rdap.tersedia && typeof rdap.umurHari === 'number') {
        rdapAgeDays = rdap.umurHari;
      }
    }

    // Ekstrak hasil VirusTotal (Requirement LN-08: P1)
    let isVirusTotalThreat = false;
    let statusVirusTotal: StatusLayanan = 'tidak_tersedia';
    let vtJumlahVendorBerbahaya = 0;
    let vtTotalVendor = 0;
    if (vtSettled.status === 'fulfilled') {
      const vt = vtSettled.value;
      statusVirusTotal = vt.status;
      vtJumlahVendorBerbahaya = vt.jumlahVendorBerbahaya;
      vtTotalVendor = vt.totalVendor;
      // Jika ditandai berbahaya (jumlahVendorBerbahaya >= 2): tambahkan temuan sumber 'virustotal' dengan bobot +3
      isVirusTotalThreat = vt.ditemukan && vt.jumlahVendorBerbahaya >= 2;
    } else {
      statusVirusTotal = 'gagal';
    }

    // 5. Analisis leksikal server dengan hasil data Safe Browsing, RDAP, dan VirusTotal (Requirement 19.1 - 19.11, LN-08)
    const serverHasil = evaluasiLeksikalUrl(urlBersih, {
      isSafeBrowsingThreat,
      rdapAgeDays,
      isVirusTotalThreat,
      virusTotalDetail: isVirusTotalThreat
        ? {
            jumlahVendorBerbahaya: vtJumlahVendorBerbahaya,
            totalVendor: vtTotalVendor,
          }
        : undefined,
    });

    // Gabung level: ambil level tertinggi dari aturan lokal dan API (Requirement 10.5, 20.2)
    let levelTerhitung = serverHasil.level;
    if (body.levelMinimum) {
      levelTerhitung = gabungLevel(body.levelMinimum, levelTerhitung);
    }

    // Gabungkan temuan dari server dengan temuanAturan yang dikirim client (jika ada)
    const daftarTemuan: Temuan[] = [...serverHasil.temuan];
    if (Array.isArray(body.temuanAturan)) {
      for (const t of body.temuanAturan) {
        if (
          t &&
          typeof t.judul === 'string' &&
          !daftarTemuan.some((item) => item.judul === t.judul)
        ) {
          daftarTemuan.push(t);
        }
      }
    }

    // Siapkan hasil lokal sebagai fallback penjelasan jika Gemini gagal
    const fallbackHasil = generateHasilLinkLokal(urlBersih, {
      isSafeBrowsingThreat,
      rdapAgeDays,
      isVirusTotalThreat,
      virusTotalDetail: isVirusTotalThreat
        ? {
            jumlahVendorBerbahaya: vtJumlahVendorBerbahaya,
            totalVendor: vtTotalVendor,
          }
        : undefined,
    });

    // 6. Kirim paket diagnostik teknis ke Gemini explainLink dengan timeout 10 detik (Requirement 20.1, 28.2)
    const paketDiagnostik: PaketDiagnostikLink = {
      url: urlBersih, // URL aman tanpa parameter sensitif
      levelMinimum: levelTerhitung,
      temuanAturan: daftarTemuan,
      safeBrowsingDitemukan: isSafeBrowsingThreat,
      umurDomainHari: rdapAgeDays,
    };

    let hasilGemini: FormatDataHasil | null = null;
    try {
      hasilGemini = await explainLink(paketDiagnostik, { timeoutMs: 10000 });
    } catch {
      hasilGemini = null;
    }

    // 7. Bentuk FormatDataHasil lengkap (Requirement 20.2, 20.3, 32.2)
    let responFinal: FormatDataHasil;

    if (hasilGemini) {
      // Gemini berhasil: gabungkan level dan update status layanan
      const levelAkhir = gabungLevel(levelTerhitung, hasilGemini.level);

      const pihakKetiga = new Set<string>(hasilGemini.pihak_ketiga || []);
      pihakKetiga.add('Google Gemini');
      if (statusSafeBrowsing === 'ok' || isSafeBrowsingThreat) {
        pihakKetiga.add('Google Safe Browsing');
      }
      if (statusRdap === 'ok' || rdapAgeDays !== undefined) {
        pihakKetiga.add('RDAP');
      }
      if (statusVirusTotal === 'ok' || isVirusTotalThreat) {
        pihakKetiga.add('VirusTotal');
      }

      // Pastikan temuan VirusTotal tetap ada jika ditandai berbahaya
      const temuanFinal = [...hasilGemini.temuan];
      if (
        isVirusTotalThreat &&
        !temuanFinal.some((item) => item.sumber === 'virustotal')
      ) {
        const vtFinding = daftarTemuan.find(
          (item) => item.sumber === 'virustotal'
        );
        if (vtFinding) {
          temuanFinal.push(vtFinding);
        }
      }

      // Pastikan minimal 2 langkah tindakan
      let langkah = hasilGemini.langkah;
      if (!Array.isArray(langkah) || langkah.length < 2) {
        langkah = fallbackHasil.langkah;
      }

      responFinal = filterFormatDataHasil({
        ...hasilGemini,
        halaman: 'link',
        url: urlBersih,
        level: levelAkhir,
        temuan: temuanFinal,
        langkah,
        pihak_ketiga: Array.from(pihakKetiga),
        status_layanan: {
          safe_browsing: statusSafeBrowsing,
          rdap: statusRdap,
          virustotal: statusVirusTotal,
          ai: 'ok',
        },
      });
    } else {
      // Gemini gagal atau API key kosong: gunakan teks penjelasan bawaan aturan lokal (Requirement 20.3, 29.2)
      const pihakKetigaFallback = new Set<string>();
      if (statusSafeBrowsing === 'ok' || isSafeBrowsingThreat) {
        pihakKetigaFallback.add('Google Safe Browsing');
      }
      if (statusRdap === 'ok' || rdapAgeDays !== undefined) {
        pihakKetigaFallback.add('RDAP');
      }
      if (statusVirusTotal === 'ok' || isVirusTotalThreat) {
        pihakKetigaFallback.add('VirusTotal');
      }

      // Gabungkan temuan client yang belum ada di fallback
      const temuanFinal = [...fallbackHasil.temuan];
      if (Array.isArray(body.temuanAturan)) {
        for (const t of body.temuanAturan) {
          if (
            t &&
            typeof t.judul === 'string' &&
            !temuanFinal.some((item) => item.judul === t.judul)
          ) {
            temuanFinal.push(t);
          }
        }
      }

      responFinal = filterFormatDataHasil({
        ...fallbackHasil,
        url: urlBersih,
        level: levelTerhitung,
        temuan: temuanFinal,
        pihak_ketiga: Array.from(pihakKetigaFallback),
        status_layanan: {
          safe_browsing: statusSafeBrowsing,
          rdap: statusRdap,
          virustotal: statusVirusTotal,
          ai: 'gagal',
        },
      });
    }

    // 8. Logging aman: tanpa mencatat isi URL pengguna (Requirement 31.1, 31.4)
    console.log(
      JSON.stringify({
        endpoint: 'POST /api/cek-link',
        status: 200,
        level: responFinal.level,
        aiUsed: !!hasilGemini,
        safeBrowsingStatus: statusSafeBrowsing,
        rdapStatus: statusRdap,
        virusTotalStatus: statusVirusTotal,
        durationMs: Date.now() - startTime,
      })
    );

    return NextResponse.json(responFinal);
  } catch (err: unknown) {
    // 9. Selalu kembalikan 200 OK dengan hasil parsial jika terjadi kesalahan tak terduga (Requirement 29.1)
    console.error(
      JSON.stringify({
        endpoint: 'POST /api/cek-link',
        status: 200,
        fallback: true,
        errorType: err instanceof Error ? err.name : 'UnknownError',
        durationMs: Date.now() - startTime,
      })
    );

    const emergencyFallback = generateHasilLinkLokal(urlBersih);
    const responDarurat: FormatDataHasil = filterFormatDataHasil({
      ...emergencyFallback,
      status_layanan: {
        safe_browsing: 'gagal',
        rdap: 'gagal',
        virustotal: 'gagal',
        ai: 'gagal',
      },
    });

    return NextResponse.json(responDarurat);
  }
}
