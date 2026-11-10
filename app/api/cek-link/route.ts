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

export interface CekLinkRequestBody {
  url?: string;
  levelMinimum?: TingkatLevel;
  temuanAturan?: Temuan[];
}

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

  const parsed = parseUrl(rawUrl);
  const sanitasi = sanitasiParams(parsed);
  const urlBersih = sanitasi.urlBersih || rawUrl;

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
    const [sbSettled, rdapSettled, , vtSettled] = await Promise.allSettled([
      checkSafeBrowsing(urlBersih, { timeoutMs: 5000 }),
      queryDomainAge(urlBersih, { timeoutMs: 5000 }),
      Promise.resolve().then(() => evaluasiLeksikalUrl(urlBersih)),
      checkVirusTotal(urlBersih, { timeoutMs: 5000 }),
    ]);

    let isSafeBrowsingThreat = false;
    let statusSafeBrowsing: StatusLayanan = 'gagal';
    if (sbSettled.status === 'fulfilled') {
      const sb = sbSettled.value;
      statusSafeBrowsing = sb.status;
      isSafeBrowsingThreat = sb.ditemukan === true;
    }

    let rdapAgeDays: number | undefined = undefined;
    let statusRdap: StatusLayanan = 'gagal';
    if (rdapSettled.status === 'fulfilled') {
      const rdap = rdapSettled.value;
      statusRdap = rdap.status;
      if (rdap.tersedia && typeof rdap.umurHari === 'number') {
        rdapAgeDays = rdap.umurHari;
      }
    }

    let isVirusTotalThreat = false;
    let statusVirusTotal: StatusLayanan = 'tidak_tersedia';
    let vtJumlahVendorBerbahaya = 0;
    let vtTotalVendor = 0;
    if (vtSettled.status === 'fulfilled') {
      const vt = vtSettled.value;
      statusVirusTotal = vt.status;
      vtJumlahVendorBerbahaya = vt.jumlahVendorBerbahaya;
      vtTotalVendor = vt.totalVendor;
      isVirusTotalThreat = vt.ditemukan && vt.jumlahVendorBerbahaya >= 2;
    } else {
      statusVirusTotal = 'gagal';
    }

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

    let levelTerhitung = serverHasil.level;
    if (body.levelMinimum) {
      levelTerhitung = gabungLevel(body.levelMinimum, levelTerhitung);
    }

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

    const paketDiagnostik: PaketDiagnostikLink = {
      url: urlBersih,
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

    let responFinal: FormatDataHasil;

    if (hasilGemini) {
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
