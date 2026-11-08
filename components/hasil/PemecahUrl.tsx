'use client';

import React from 'react';
import { parseUrl, isSensitiveParam } from '@/lib/sanitasi-url';
import {
  deteksiMerek,
  isIpAddress,
  KATA_PEMICU_LINK,
  TLD_BERISIKO_SET,
  PEMENDEK_LINK_DOMAINS,
} from '@/lib/aturan/link-rules';
import type { Temuan } from '@/lib/hasil';

/**
 * Props untuk komponen PemecahUrl sesuai spesifikasi Task 18.2 & LN-07.
 */
export interface PemecahUrlProps {
  url: string;
  temuan?: Temuan[];
  className?: string;
}

/** Tingkat risiko untuk komponen URL */
export type TingkatRisikoBagian = 'tinggi' | 'sedang' | 'normal';

/** Objek rincian tiap bagian URL */
export interface DetailBagianUrl {
  id: 'protokol' | 'subdomain' | 'domainUtama' | 'tld' | 'path' | 'params';
  label: string;
  nilaiTampil: string;
  isMencurigakan: boolean;
  tingkatRisiko: TingkatRisikoBagian;
  alasan: string;
  penjelasanTambahan?: string;
  paramsList?: Array<{ kunci: string; nilai: string; isSensitif: boolean }>;
}

/**
 * Ekstrak kata pemicu penipuan yang muncul dalam teks.
 */
function cariKataPemicu(teks: string): string[] {
  if (!teks) return [];
  const lower = teks.toLowerCase();
  return KATA_PEMICU_LINK.filter((kata) => lower.includes(kata));
}

/**
 * Mengurai URL dan mengevaluasi status kecurigaan tiap bagian secara mendalam.
 */
export function bedahBagianUrl(
  rawUrl: string,
  temuan: Temuan[] = []
): {
  bagianList: DetailBagianUrl[];
  jumlahMencurigakan: number;
  urlTersanitasiTampil: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return {
      bagianList: [],
      jumlahMencurigakan: 0,
      urlTersanitasiTampil: '',
    };
  }

  const parsed = parseUrl(trimmed);
  const temuanTextCombined = temuan
    .map((t) => `${t.judul} ${t.penjelasan} ${t.bukti}`)
    .join(' ')
    .toLowerCase();

  // 1. Protokol (https://, http://, atau tidak ada)
  let protokolMencurigakan = false;
  let protokolRisiko: TingkatRisikoBagian = 'normal';
  let protokolAlasan = 'Menggunakan protokol HTTPS terenkripsi standar.';

  if (parsed.protokol === 'http') {
    protokolMencurigakan = true;
    protokolRisiko = 'sedang';
    protokolAlasan =
      'Menggunakan protokol HTTP tanpa enkripsi (tidak aman). Komunikasi rentan disadap dan situs resmi perbankan atau e-commerce selalu mewajibkan HTTPS.';
  } else if (!parsed.protokol) {
    protokolAlasan =
      'Protokol tidak ditentukan secara eksplisit pada alamat yang dimasukkan.';
  } else if (parsed.protokol !== 'https') {
    protokolMencurigakan = true;
    protokolRisiko = 'sedang';
    protokolAlasan = `Menggunakan protokol yang tidak umum: ${parsed.protokol}://`;
  } else {
    protokolAlasan =
      'Menggunakan enkripsi HTTPS standar. Perhatian: memiliki sertifikat HTTPS tidak menjamin situs tersebut bukan penipuan, karena penipu juga dapat memasang sertifikat gratis.';
  }

  const protokolDetail: DetailBagianUrl = {
    id: 'protokol',
    label: 'Protokol',
    nilaiTampil: parsed.protokol ? `${parsed.protokol}://` : '(tidak ada)',
    isMencurigakan: protokolMencurigakan,
    tingkatRisiko: protokolRisiko,
    alasan: protokolAlasan,
  };

  // 2. Subdomain
  let subMencurigakan = false;
  let subRisiko: TingkatRisikoBagian = 'normal';
  let subAlasan = parsed.subdomain
    ? 'Struktur subdomain tampak normal.'
    : 'Tidak menggunakan subdomain tambahan.';

  if (parsed.subdomain) {
    const subParts = parsed.subdomain.split('.').filter(Boolean);
    const subDeteksiMerek = deteksiMerek(parsed.subdomain);
    const kataPemicuSub = cariKataPemicu(parsed.subdomain);

    if (subDeteksiMerek.cocok && subDeteksiMerek.merek) {
      subMencurigakan = true;
      subRisiko = 'tinggi';
      subAlasan = `Mencantumkan nama merek resmi "${subDeteksiMerek.merek}" pada subdomain, padahal domain utama terdaftar adalah "${parsed.domainUtama}". Ini taktik umum phishing untuk mengecoh pandangan korban.`;
    } else if (subParts.length > 3) {
      subMencurigakan = true;
      subRisiko = 'sedang';
      subAlasan = `Subdomain memiliki ${subParts.length} tingkatan (bertingkat berlebih), pola yang sering dimanfaatkan untuk mengaburkan nama domain asli.`;
    } else if (kataPemicuSub.length > 0) {
      subMencurigakan = true;
      subRisiko = 'sedang';
      subAlasan = `Subdomain memuat kata pemicu penipuan: "${kataPemicuSub.join(', ')}".`;
    } else if (
      temuanTextCombined.includes('subdomain') &&
      !temuanTextCombined.includes('wajar')
    ) {
      subMencurigakan = true;
      subRisiko = 'sedang';
      subAlasan =
        'Terdapat temuan pemeriksaan terkait susunan subdomain pada tautan ini.';
    }
  }

  const subdomainDetail: DetailBagianUrl = {
    id: 'subdomain',
    label: 'Subdomain',
    nilaiTampil: parsed.subdomain || '(tidak ada)',
    isMencurigakan: subMencurigakan,
    tingkatRisiko: subRisiko,
    alasan: subAlasan,
  };

  // 3. Domain Utama
  let domMencurigakan = false;
  let domRisiko: TingkatRisikoBagian = 'normal';
  let domAlasan = 'Nama domain utama terdaftar sesuai format umum.';

  const isIp = isIpAddress(parsed.domainUtama);
  const isPunycode =
    trimmed.toLowerCase().includes('xn--') ||
    parsed.domainUtama.toLowerCase().includes('xn--');
  const merekDeteksi = deteksiMerek(parsed.domainUtama);
  const isShortener =
    PEMENDEK_LINK_DOMAINS.has(parsed.domainUtama.toLowerCase()) ||
    PEMENDEK_LINK_DOMAINS.has(
      `${parsed.domainUtama}.${parsed.tld}`.toLowerCase()
    );
  const kataPemicuDom = cariKataPemicu(parsed.domainUtama);

  if (isIp) {
    domMencurigakan = true;
    domRisiko = 'tinggi';
    domAlasan =
      'Alamat menggunakan IP numerik langsung tanpa nama domain resmi. Modus ini sering dipakai untuk menyembunyikan identitas pemilik situs.';
  } else if (isPunycode) {
    domMencurigakan = true;
    domRisiko = 'tinggi';
    domAlasan =
      'Domain menggunakan format Punycode (awalan xn--) atau karakter homograf yang mirip huruf asli (homograph attack) untuk mengecoh pengguna.';
  } else if (merekDeteksi.cocok && merekDeteksi.merek) {
    domMencurigakan = true;
    domRisiko = 'tinggi';
    domAlasan = `Nama domain menyerupai merek terpercaya "${merekDeteksi.merek}" (variasi: ${merekDeteksi.variasiCocok}) dengan substitusi karakter atau ejaan plesetan (typosquatting).`;
  } else if (kataPemicuDom.length > 0) {
    domMencurigakan = true;
    domRisiko = 'tinggi';
    domAlasan = `Domain utama memuat kata pemicu penipuan: "${kataPemicuDom.join(', ')}".`;
  } else if (isShortener) {
    domMencurigakan = true;
    domRisiko = 'sedang';
    domAlasan =
      'Domain merupakan layanan pemendek link (URL shortener). Alamat situs tujuan yang sebenarnya tersembunyi di balik tautan ini.';
  } else if (
    temuanTextCombined.includes('safe browsing') ||
    temuanTextCombined.includes('ancaman google')
  ) {
    domMencurigakan = true;
    domRisiko = 'tinggi';
    domAlasan =
      'Domain ini terdaftar dalam basis data ancaman Google Safe Browsing sebagai situs berisiko malware atau phishing.';
  } else if (
    temuanTextCombined.includes('kurang dari 30 hari') ||
    temuanTextCombined.includes('domain baru didaftarkan')
  ) {
    domMencurigakan = true;
    domRisiko = 'tinggi';
    domAlasan =
      'Domain baru didaftarkan kurang dari 30 hari yang lalu berdasarkan data registrasi domain (RDAP).';
  }

  const domainUtamaDetail: DetailBagianUrl = {
    id: 'domainUtama',
    label: 'Domain Utama',
    nilaiTampil: parsed.domainUtama || '(tidak ada)',
    isMencurigakan: domMencurigakan,
    tingkatRisiko: domRisiko,
    alasan: domAlasan,
  };

  // 4. TLD / ccTLD
  let tldMencurigakan = false;
  let tldRisiko: TingkatRisikoBagian = 'normal';
  let tldAlasan = parsed.tld
    ? 'Ekstensi domain standar.'
    : 'Tidak ada ekstensi domain (TLD).';

  if (parsed.tld) {
    const cleanTld = parsed.tld.replace(/^\./, '').toLowerCase();
    const lastPartTld = cleanTld.split('.').pop() || '';
    const isRisky =
      TLD_BERISIKO_SET.has(cleanTld) || TLD_BERISIKO_SET.has(lastPartTld);

    if (isRisky) {
      tldMencurigakan = true;
      tldRisiko = 'sedang';
      tldAlasan = `Ekstensi .${cleanTld} termasuk daftar TLD berisiko tinggi yang sering disalahgunakan untuk aktivitas phishing dan penipuan karena biaya pendaftaran sangat murah.`;
    } else if (temuanTextCombined.includes('tld berisiko')) {
      tldMencurigakan = true;
      tldRisiko = 'sedang';
      tldAlasan = `Ekstensi domain .${cleanTld} terindikasi berisiko tinggi dalam temuan sistem.`;
    }
  }

  const tldDetail: DetailBagianUrl = {
    id: 'tld',
    label: 'TLD / ccTLD',
    nilaiTampil: parsed.tld ? `.${parsed.tld}` : '(tidak ada)',
    isMencurigakan: tldMencurigakan,
    tingkatRisiko: tldRisiko,
    alasan: tldAlasan,
  };

  // 5. Path (Jalur Halaman)
  let pathMencurigakan = false;
  let pathRisiko: TingkatRisikoBagian = 'normal';
  let pathAlasan = parsed.path
    ? 'Jalur URL tidak memuat kata pemicu yang mencurigakan.'
    : 'Halaman beranda (tanpa jalur sub-halaman tambahan).';

  const kataPemicuPath = cariKataPemicu(parsed.path);
  const isApkOrExec = /\.(apk|exe|bat|scr|msi|vbs|jar|iso)$/i.test(
    parsed.path || ''
  );
  const hasAtSymbol = trimmed.includes('@');

  if (isApkOrExec) {
    pathMencurigakan = true;
    pathRisiko = 'tinggi';
    pathAlasan =
      'Jalur URL mengarah langsung ke pengunduhan file aplikasi (.apk / executable). Modus ini sangat berbahaya karena sering dipakai untuk menyusupkan malware pembobol rekening.';
  } else if (hasAtSymbol) {
    pathMencurigakan = true;
    pathRisiko = 'tinggi';
    pathAlasan =
      'Terdapat karakter "@" di dalam URL. Trik ini sering mengecoh karena browser akan mengabaikan teks sebelum tanda "@" dan mengarahkan pengguna ke situs penipu.';
  } else if (kataPemicuPath.length > 0) {
    pathMencurigakan = true;
    pathRisiko = 'sedang';
    pathAlasan = `Jalur URL memuat kata pemicu penipuan: "${kataPemicuPath.join(', ')}", pola yang lazim dipakai untuk memancing korban ke halaman login atau klaim fiktif.`;
  }

  const pathDetail: DetailBagianUrl = {
    id: 'path',
    label: 'Jalur (Path)',
    nilaiTampil: parsed.path || '/',
    isMencurigakan: pathMencurigakan,
    tingkatRisiko: pathRisiko,
    alasan: pathAlasan,
  };

  // 6. Query Parameters
  const paramKeys = Object.keys(parsed.params || {});
  const paramsList = paramKeys.map((k) => ({
    kunci: k,
    nilai: parsed.params[k],
    isSensitif: isSensitiveParam(k),
  }));

  let paramsMencurigakan = false;
  let paramsRisiko: TingkatRisikoBagian = 'normal';
  let paramsAlasan =
    paramKeys.length > 0
      ? 'Parameter query tidak memuat kata sandi atau data sensitif terbuka.'
      : 'Tidak ada parameter query dalam tautan ini.';

  const sensitiveKeysFound = paramsList
    .filter((p) => p.isSensitif)
    .map((p) => p.kunci);

  if (sensitiveKeysFound.length > 0) {
    paramsMencurigakan = true;
    paramsRisiko = 'sedang';
    paramsAlasan = `Parameter URL memuat data sensitif terbuka (${sensitiveKeysFound.join(
      ', '
    )}). URL sensitif seperti ini berisiko membocorkan token akun atau data pribadi saat dibagikan.`;
  } else if (paramKeys.length > 0) {
    const combinedParamValues = Object.values(parsed.params).join(' ');
    const kataPemicuParams = cariKataPemicu(combinedParamValues);
    if (kataPemicuParams.length > 0) {
      paramsMencurigakan = true;
      paramsRisiko = 'sedang';
      paramsAlasan = `Nilai parameter memuat kata pemicu: "${kataPemicuParams.join(', ')}".`;
    }
  }

  let paramTampilString = '(tidak ada)';
  if (paramKeys.length > 0) {
    const sp = new URLSearchParams(parsed.params);
    paramTampilString = `?${sp.toString()}`;
  }

  const paramsDetail: DetailBagianUrl = {
    id: 'params',
    label: 'Parameter Query',
    nilaiTampil: paramTampilString,
    isMencurigakan: paramsMencurigakan,
    tingkatRisiko: paramsRisiko,
    alasan: paramsAlasan,
    paramsList: paramsList.length > 0 ? paramsList : undefined,
  };

  const bagianList: DetailBagianUrl[] = [
    protokolDetail,
    subdomainDetail,
    domainUtamaDetail,
    tldDetail,
    pathDetail,
    paramsDetail,
  ];

  const jumlahMencurigakan = bagianList.filter((b) => b.isMencurigakan).length;

  return {
    bagianList,
    jumlahMencurigakan,
    urlTersanitasiTampil: parsed.urlBersih || trimmed,
  };
}

/**
 * Styling badge status risiko yang memenuhi rasio kontras WCAG AA (> 4.5:1).
 */
export function getBadgeRisikoBagian(
  tingkatRisiko: TingkatRisikoBagian,
  isMencurigakan: boolean
): { label: string; badgeClasses: string; containerBorder: string } {
  if (!isMencurigakan || tingkatRisiko === 'normal') {
    return {
      label: 'Wajar',
      badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      containerBorder: 'border-gray-200 bg-white hover:border-emerald-300',
    };
  }
  if (tingkatRisiko === 'tinggi') {
    return {
      label: 'Mencurigakan (Risiko Tinggi)',
      badgeClasses: 'bg-red-100 text-red-900 border-red-300 font-bold',
      containerBorder:
        'border-red-300 bg-red-50/40 shadow-xs ring-1 ring-red-200',
    };
  }
  return {
    label: 'Perlu Diwaspadai',
    badgeClasses: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    containerBorder:
      'border-amber-300 bg-amber-50/40 shadow-xs ring-1 ring-amber-200',
  };
}

/**
 * Styling segmen URL pada sorotan horizontal inline.
 */
function getSorotanStyle(
  isMencurigakan: boolean,
  tingkatRisiko: TingkatRisikoBagian
): string {
  if (!isMencurigakan || tingkatRisiko === 'normal') {
    return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
  }
  if (tingkatRisiko === 'tinggi') {
    return 'bg-red-100 text-red-950 border-red-400 font-bold shadow-xs ring-2 ring-red-400/40';
  }
  return 'bg-amber-100 text-amber-950 border-amber-400 font-semibold shadow-xs ring-2 ring-amber-400/40';
}

/**
 * Komponen PemecahUrl (Task 18.2, Requirement LN-07)
 *
 * Mengurai URL menjadi komponen:
 * - Protokol (https://, http://)
 * - Subdomain
 * - Domain utama
 * - TLD / ccTLD
 * - Path (Jalur)
 * - Query Parameters
 *
 * Menampilkan:
 * 1. Visual URL Breakdown Bar (sorotan horizontal per bagian dengan warna risiko)
 * 2. Kartu Rincian Tiap Bagian dengan badge risiko dan penjelasan mendalam
 *
 * Catatan Keamanan (Requirement 17.2):
 * URL dan bagian-bagiannya selalu ditampilkan sebagai teks biasa (span/code),
 * tidak pernah sebagai tautan yang bisa diklik (`<a>`).
 */
export function PemecahUrl({
  url,
  temuan = [],
  className = '',
}: PemecahUrlProps): React.JSX.Element {
  const { bagianList, jumlahMencurigakan } = bedahBagianUrl(url, temuan);

  // Buat map untuk akses cepat per komponen
  const bagianMap = bagianList.reduce<Record<string, DetailBagianUrl>>(
    (acc, b) => {
      acc[b.id] = b;
      return acc;
    },
    {}
  );

  const protokol = bagianMap['protokol'];
  const subdomain = bagianMap['subdomain'];
  const domainUtama = bagianMap['domainUtama'];
  const tld = bagianMap['tld'];
  const path = bagianMap['path'];
  const params = bagianMap['params'];

  return (
    <section
      data-testid="pemecah-url"
      aria-label="Pemecahan Bagian URL dan Sorotan Risiko"
      className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm space-y-6 ${className}`.trim()}
    >
      {/* Header Pemecah URL */}
      <header className="space-y-1.5 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
              aria-hidden="true"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h3
              data-testid="judul-pemecah-url"
              className="text-base sm:text-lg font-bold text-gray-900 tracking-tight"
            >
              Pemecahan Struktur URL & Sorotan Tanda Bahaya
            </h3>
          </div>

          {jumlahMencurigakan > 0 ? (
            <span
              data-testid="badge-ringkasan-mencurigakan"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-200"
            >
              <span
                className="w-2 h-2 rounded-full bg-red-600 animate-pulse"
                aria-hidden="true"
              />
              <span>{jumlahMencurigakan} Bagian Disorot</span>
            </span>
          ) : (
            <span
              data-testid="badge-ringkasan-normal"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
            >
              <span
                className="w-2 h-2 rounded-full bg-emerald-600"
                aria-hidden="true"
              />
              <span>Struktur URL Normal</span>
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          Pelajari anatomi alamat tautan di bawah ini. Bagian yang disorot merah
          atau kuning menunjukkan letak tanda bahaya yang sering disamarkan
          penipu.
        </p>
      </header>

      {/* 1. Visual URL Breakdown Bar (Sorotan Horizontal Segmen URL) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-700">
          <span>Pratinjau Sorotan Struktur URL:</span>
          <span className="text-[11px] font-normal normal-case text-gray-500">
            Teks biasa (tidak dapat diklik demi keamanan)
          </span>
        </div>

        <div
          data-testid="bar-pemecah-url"
          role="region"
          aria-label="Sorotan Visual Segmen URL"
          className="p-3 sm:p-4 rounded-xl border border-gray-300 bg-gray-50/80 font-mono text-xs sm:text-sm overflow-x-auto flex flex-wrap items-center gap-1.5 shadow-inner"
        >
          {/* Segmen Protokol */}
          {protokol && (
            <span
              data-testid="sorotan-protokol"
              title={`Protokol: ${protokol.nilaiTampil} (${protokol.alasan})`}
              className={`inline-flex items-center px-2 py-1 rounded-md border select-all transition-colors ${getSorotanStyle(
                protokol.isMencurigakan,
                protokol.tingkatRisiko
              )}`}
            >
              {protokol.nilaiTampil !== '(tidak ada)'
                ? protokol.nilaiTampil
                : 'http://'}
            </span>
          )}

          {/* Segmen Subdomain (jika ada) */}
          {subdomain && subdomain.nilaiTampil !== '(tidak ada)' && (
            <span
              data-testid="sorotan-subdomain"
              title={`Subdomain: ${subdomain.nilaiTampil} (${subdomain.alasan})`}
              className={`inline-flex items-center px-2 py-1 rounded-md border select-all transition-colors ${getSorotanStyle(
                subdomain.isMencurigakan,
                subdomain.tingkatRisiko
              )}`}
            >
              {subdomain.nilaiTampil}.
            </span>
          )}

          {/* Segmen Domain Utama (Wajib ada) */}
          {domainUtama && (
            <span
              data-testid="sorotan-domainUtama"
              title={`Domain Utama: ${domainUtama.nilaiTampil} (${domainUtama.alasan})`}
              className={`inline-flex items-center px-2 py-1 rounded-md border select-all transition-colors ${getSorotanStyle(
                domainUtama.isMencurigakan,
                domainUtama.tingkatRisiko
              )}`}
            >
              {domainUtama.nilaiTampil}
            </span>
          )}

          {/* Segmen TLD (jika ada) */}
          {tld && tld.nilaiTampil !== '(tidak ada)' && (
            <span
              data-testid="sorotan-tld"
              title={`TLD: ${tld.nilaiTampil} (${tld.alasan})`}
              className={`inline-flex items-center px-2 py-1 rounded-md border select-all transition-colors ${getSorotanStyle(
                tld.isMencurigakan,
                tld.tingkatRisiko
              )}`}
            >
              {tld.nilaiTampil}
            </span>
          )}

          {/* Segmen Path */}
          {path && (
            <span
              data-testid="sorotan-path"
              title={`Jalur Path: ${path.nilaiTampil} (${path.alasan})`}
              className={`inline-flex items-center px-2 py-1 rounded-md border select-all transition-colors ${getSorotanStyle(
                path.isMencurigakan,
                path.tingkatRisiko
              )}`}
            >
              {path.nilaiTampil !== '/' ? path.nilaiTampil : '/'}
            </span>
          )}

          {/* Segmen Query Params (jika ada) */}
          {params && params.nilaiTampil !== '(tidak ada)' && (
            <span
              data-testid="sorotan-params"
              title={`Parameter: ${params.nilaiTampil} (${params.alasan})`}
              className={`inline-flex items-center px-2 py-1 rounded-md border select-all transition-colors ${getSorotanStyle(
                params.isMencurigakan,
                params.tingkatRisiko
              )}`}
            >
              {params.nilaiTampil}
            </span>
          )}
        </div>
      </div>

      {/* 2. Kartu Rincian Tiap Bagian URL */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
          Rincian dan Penjelasan per Bagian:
        </h4>

        <div
          data-testid="daftar-kartu-bagian"
          className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
        >
          {bagianList.map((item) => {
            const badge = getBadgeRisikoBagian(
              item.tingkatRisiko,
              item.isMencurigakan
            );

            return (
              <article
                key={item.id}
                data-testid={`kartu-bagian-${item.id}`}
                aria-label={`Rincian Bagian ${item.label}`}
                className={`rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 ${badge.containerBorder}`}
              >
                {/* Header Kartu Bagian */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {item.label}
                    </span>
                    <span
                      data-testid={`badge-risiko-${item.id}`}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${badge.badgeClasses}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Nilai Teks Bagian */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono text-xs sm:text-sm text-gray-900 break-all select-all font-semibold">
                    {item.nilaiTampil}
                  </div>
                </div>

                {/* Penjelasan Risiko / Status */}
                <div className="space-y-1 text-xs text-gray-700 leading-relaxed">
                  <p data-testid={`penjelasan-${item.id}`}>{item.alasan}</p>

                  {/* Rincian Parameter Spesifik jika ada */}
                  {item.id === 'params' &&
                    item.paramsList &&
                    item.paramsList.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 mt-2 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-600 block">
                          Daftar Parameter Terdeteksi:
                        </span>
                        <div className="space-y-1">
                          {item.paramsList.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              data-testid={`param-item-${p.kunci}`}
                              className="flex items-center justify-between text-[11px] bg-white border rounded px-2 py-1 font-mono"
                            >
                              <span className="font-semibold text-gray-900">
                                {p.kunci}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded ${
                                  p.isSensitif
                                    ? 'bg-amber-100 text-amber-900 font-bold'
                                    : 'text-gray-500'
                                }`}
                              >
                                {p.isSensitif ? 'Parameter Sensitif' : 'Publik'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default PemecahUrl;

