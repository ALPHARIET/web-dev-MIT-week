/**
 * lib/aturan/link-rules.ts
 *
 * Implementasi aturan analisis leksikal URL untuk Aplikasi Web Cek Penipuan.
 * Menganalisis URL berdasarkan 10 aturan:
 * 1. Google Safe Browsing match (langsung waspada tinggi: langsung_tinggi = true)
 * 2. Nama mirip merek Indonesia (+3) dengan substitusi karakter (leetspeak)
 * 3. Domain berumur < 30 hari via RDAP (+3)
 * 4. Punycode atau karakter mirip (xn--) (+3)
 * 5. Alamat berupa IP (+3) (IPv4/IPv6)
 * 6. Kata pemicu di domain atau path (+2): hadiah, klaim, undian, verifikasi, login, promo
 * 7. Lebih dari 3 subdomain, atau nama merek di subdomain dan bukan di domain utama (+2)
 * 8. TLD berisiko (+1) - dimuat dari data/tld-berisiko.json
 * 9. Layanan pemendek link (+1) (bit.ly, s.id, tinyurl, linktr.ee, dll.)
 * 10. Karakter '@' di URL atau URL > 200 karakter (+1)
 *
 * References: Requirements 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11, and design.md
 */

import { parseUrl } from '../sanitasi-url';
import {
  hitungLevel,
  type TingkatLevel,
  type Temuan,
  type FormatDataHasil,
  type StatusLayanan,
  type SituasiDarurat,
} from '../hasil';
import { type HasilAturan } from './scoring';
import daftarMerekJson from '../../data/merek.json';
import tldBerisikoJson from '../../data/tld-berisiko.json';

/**
 * Opsi tambahan untuk evaluasi leksikal URL
 */
export interface EvaluasiLinkOptions {
  /** Umur domain dalam satuan hari berdasarkan data registrasi RDAP */
  rdapAgeDays?: number;
  /** Status apakah URL terdaftar dalam daftar ancaman Google Safe Browsing */
  isSafeBrowsingThreat?: boolean;
  /** Status apakah URL ditandai berbahaya oleh VirusTotal (>= 2 vendor) */
  isVirusTotalThreat?: boolean;
  /** Rincian vendor VirusTotal */
  virusTotalDetail?: {
    jumlahVendorBerbahaya: number;
    totalVendor: number;
  };
}

/**
 * Hasil deteksi kemiripan merek
 */
export interface HasilDeteksiMerek {
  /** Apakah cocok dengan merek terdaftar */
  cocok: boolean;
  /** Nama resmi merek yang cocok (misal: "BCA", "Shopee") */
  merek: string | null;
  /** String variasi atau pola yang memicu kecocokan */
  variasiCocok: string | null;
  /** Kategori industri merek */
  kategori: string | null;
  /** Skor bobot aturan (selalu 3 jika cocok, 0 jika tidak) */
  skor: number;
}

/**
 * Daftar kata pemicu yang sering digunakan pada domain atau path situs phishing (Requirement 19.6)
 */
export const KATA_PEMICU_LINK = [
  'hadiah',
  'klaim',
  'undian',
  'verifikasi',
  'login',
  'promo',
] as const;

/**
 * Daftar domain layanan pemendek tautan yang umum (Requirement 19.9)
 */
export const PEMENDEK_LINK_DOMAINS = new Set<string>([
  'bit.ly',
  's.id',
  'tinyurl.com',
  'linktr.ee',
  'cutt.ly',
  't.co',
  'is.gd',
  'buff.ly',
  'ow.ly',
  'rb.gy',
  'shorturl.at',
  'rebrand.ly',
  'bl.ink',
  'tiny.cc',
  'v.gd',
  'qr.ae',
  'trib.al',
  'soo.gd',
  'shorte.st',
]);

/**
 * Set TLD berisiko yang dimuat dari data/tld-berisiko.json (Requirement 19.8)
 */
export const TLD_BERISIKO_SET = new Set<string>(
  (tldBerisikoJson.tld || []).map((t: string) => t.toLowerCase().trim())
);

/**
 * Regex IPv4 standar untuk deteksi alamat host berbasis IP numerik
 */
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Memeriksa apakah suatu string merupakan alamat IPv4 atau IPv6
 */
export function isIpAddress(host: string): boolean {
  if (!host) return false;
  const clean = host.replace(/^\[|\]$/g, '').trim();

  // IPv4
  if (IPV4_REGEX.test(clean)) return true;

  // IPv6
  if (clean.includes(':')) {
    const parts = clean.split(':');
    if (parts.length >= 2 && parts.length <= 8) {
      return parts.every(
        (p) => p === '' || (p.length <= 4 && /^[0-9a-fA-F]+$/.test(p))
      );
    }
  }

  return false;
}

/**
 * Normalisasi leetspeak (substitusi angka pengganti huruf)
 * 0 -> o, 1 -> i, 3 -> e, 4 -> a, 5 -> s, @ -> a, $ -> s
 */
export function normalizeLeetspeak(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

/**
 * Membersihkan input domain/URL menjadi format hostname sederhana
 */
function cleanHostString(input: string): string {
  let s = (input || '').trim().toLowerCase();
  // Buang protokol
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  s = s.replace(/^\/\//, '');
  // Buang path, query, hash
  s = s.split(/[/?#]/)[0];
  // Buang userinfo jika ada (hanya jika setelah @ terdapat nama host yang valid tanpa diawali titik)
  const atIdx = s.lastIndexOf('@');
  if (atIdx >= 0 && !s.slice(atIdx).startsWith('@.')) {
    const afterAt = s.slice(atIdx + 1);
    if (afterAt.includes('.') && !afterAt.startsWith('.')) {
      s = afterAt;
    }
  }
  // Buang port
  const colonIdx = s.lastIndexOf(':');
  if (colonIdx >= 0 && !s.includes(']')) {
    s = s.slice(0, colonIdx);
  }
  return s;
}

/**
 * Mendeteksi nama domain atau teks yang mirip merek Indonesia dengan substitusi karakter (leetspeak).
 * Muat daftar merek dari `data/merek.json` (Requirement 19.2, Property 8).
 *
 * @param domainInput String domain, URL, atau token nama domain yang diperiksa
 * @returns HasilDeteksiMerek dengan flag cocok, nama merek, variasi yang cocok, kategori, dan skor (+3)
 */
export function deteksiMerek(domainInput: string): HasilDeteksiMerek {
  if (!domainInput || typeof domainInput !== 'string') {
    return {
      cocok: false,
      merek: null,
      variasiCocok: null,
      kategori: null,
      skor: 0,
    };
  }

  const rawClean = cleanHostString(domainInput);
  if (!rawClean) {
    return {
      cocok: false,
      merek: null,
      variasiCocok: null,
      kategori: null,
      skor: 0,
    };
  }

  // Urai komponen URL jika input berupa URL lengkap atau domain dengan TLD
  const parsed = parseUrl(rawClean.includes('://') ? rawClean : `http://${rawClean}`);
  const domainUtama = (parsed.domainUtama || rawClean).toLowerCase();
  const normalizedDomainUtama = normalizeLeetspeak(domainUtama);

  // Kandidat potongan string untuk dicocokkan
  const candidates = new Set<string>();
  candidates.add(rawClean);
  candidates.add(normalizeLeetspeak(rawClean));
  candidates.add(domainUtama);
  candidates.add(normalizedDomainUtama);

  // Jika input memuat ekstensi TLD di akhir (misal: bc@.net, sh0pee.co.id)
  // Ekstrak bagian sebelum TLD langsung dari input mentah
  const noProto = domainInput
    .trim()
    .toLowerCase()
    .replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
    .split(/[/?#]/)[0];
  const withoutTld = noProto.replace(/\.[a-z0-9-]+(?:\.[a-z0-9-]+)?$/i, '');
  if (withoutTld) {
    candidates.add(withoutTld);
    candidates.add(normalizeLeetspeak(withoutTld));
  }

  // Token-token yang dipisahkan oleh tanda hubung, garis bawah, titik, atau angka
  const tokens = domainUtama.split(/[-_.]+/).filter(Boolean);
  for (const t of tokens) {
    candidates.add(t);
    candidates.add(normalizeLeetspeak(t));
  }

  // Jika hostname memiliki beberapa bagian sebelum TLD (misal: b.c.a.co.id)
  if (parsed.subdomain) {
    const subPlusMain = `${parsed.subdomain}.${domainUtama}`.toLowerCase();
    candidates.add(subPlusMain);
    candidates.add(normalizeLeetspeak(subPlusMain));
    // Bentuk tanpa titik: b.c.a -> bca
    const dotsStripped = subPlusMain.replace(/\./g, '');
    candidates.add(dotsStripped);
    candidates.add(normalizeLeetspeak(dotsStripped));
  }

  const daftarMerek = daftarMerekJson.merek || [];

  for (const item of daftarMerek) {
    const brandName = item.nama;
    const brandLower = brandName.toLowerCase();
    const brandNormalized = normalizeLeetspeak(brandLower);
    const variasiList = (item.variasi || []).map((v: string) => v.toLowerCase());

    // 1. Cek kecocokan langsung dengan variasi yang terdaftar di JSON
    for (const v of variasiList) {
      if (candidates.has(v)) {
        return {
          cocok: true,
          merek: brandName,
          variasiCocok: v,
          kategori: item.kategori,
          skor: 3,
        };
      }
    }

    // 2. Cek apakah ada token yang setelah dinormalisasi sama dengan nama merek
    for (const cand of candidates) {
      if (cand === brandLower || cand === brandNormalized) {
        return {
          cocok: true,
          merek: brandName,
          variasiCocok: cand,
          kategori: item.kategori,
          skor: 3,
        };
      }
    }

    // 3. Cek variasi leetspeak dari daftar variasi
    for (const v of variasiList) {
      const vNorm = normalizeLeetspeak(v);
      for (const cand of candidates) {
        if (cand === vNorm) {
          return {
            cocok: true,
            merek: brandName,
            variasiCocok: v,
            kategori: item.kategori,
            skor: 3,
          };
        }
      }
    }

    // 4. Deteksi komposisi kata pada domainUtama (misal: sh0peepromo, bca-klik, danakaget)
    // Hindari false positive kata umum (misal: 'perdana' mengandung 'dana', 'brian' mengandung 'bri')
    const brandMinLength = brandLower.length;

    // Untuk merek pendek (<= 3 karakter, misal: bca, bri, bni, bsi, jne, ovo):
    // Hanya cocok jika diawali/diakhiri batas kata, token, atau diawali/diakhiri oleh kata umum seperti promo, bank, klik, login, pay
    if (brandMinLength <= 3) {
      const patternShort = new RegExp(
        `(?:^|[-_0-9]|bank|klik|promo|login|hadiah|undian|pay|cs|link|app)${brandNormalized}(?:$|[-_0-9]|bank|klik|promo|login|hadiah|undian|pay|cs|link|app|mobile|id|indo)`,
        'i'
      );
      if (patternShort.test(normalizedDomainUtama)) {
        return {
          cocok: true,
          merek: brandName,
          variasiCocok: brandLower,
          kategori: item.kategori,
          skor: 3,
        };
      }
    } else {
      // Untuk merek dengan panjang >= 4 (shopee, mandiri, tokopedia, dana, gopay, bpjs, posindonesia)
      // Periksa kecocokan substring pada domainUtama yang dinormalisasi
      if (brandLower === 'dana' && (normalizedDomainUtama === 'perdana' || normalizedDomainUtama.includes('perdana'))) {
        // Abaikan kata 'perdana' (kartu perdana)
        continue;
      }

      if (normalizedDomainUtama.includes(brandNormalized)) {
        return {
          cocok: true,
          merek: brandName,
          variasiCocok: brandLower,
          kategori: item.kategori,
          skor: 3,
        };
      }

      // Cek juga jika salah satu variasi substring ada di domainUtama
      for (const v of variasiList) {
        if (v.length >= 4 && domainUtama.includes(v)) {
          return {
            cocok: true,
            merek: brandName,
            variasiCocok: v,
            kategori: item.kategori,
            skor: 3,
          };
        }
      }
    }
  }

  return {
    cocok: false,
    merek: null,
    variasiCocok: null,
    kategori: null,
    skor: 0,
  };
}

/**
 * Mengevaluasi URL secara leksikal berdasarkan 10 aturan kecurigaan.
 *
 * Aturan:
 * 1. Google Safe Browsing match (langsung waspada tinggi: langsung_tinggi = true)
 * 2. Nama mirip merek Indonesia (+3) dengan substitusi karakter (leetspeak)
 * 3. Domain berumur < 30 hari via RDAP (+3)
 * 4. Punycode atau karakter mirip (xn--) (+3)
 * 5. Alamat berupa IP (+3) (IPv4/IPv6)
 * 6. Kata pemicu di domain atau path (+2): hadiah, klaim, undian, verifikasi, login, promo
 * 7. Lebih dari 3 subdomain, atau nama merek di subdomain dan bukan di domain utama (+2)
 * 8. TLD berisiko (+1)
 * 9. Layanan pemendek link (+1)
 * 10. Karakter '@' di URL atau URL > 200 karakter (+1)
 *
 * @param input String URL atau nama domain yang dimasukkan pengguna
 * @param options Opsi status RDAP dan Google Safe Browsing
 * @returns HasilAturan dengan skor, level, temuan, linkDitemukan, dan modusVideoDitemukan
 */
export function evaluasiLeksikalUrl(
  input: string,
  options?: EvaluasiLinkOptions
): HasilAturan {
  const trimmed = (input || '').trim();

  if (!trimmed) {
    return {
      skor: 0,
      level: 'tidak_ditemukan',
      temuan: [],
      linkDitemukan: [],
      modusVideoDitemukan: false,
    };
  }

  const parsed = parseUrl(trimmed);
  const hostClean = cleanHostString(trimmed);

  let skor = 0;
  let adaLangsungTinggi = false;
  const temuan: Temuan[] = [];

  // 1. Google Safe Browsing match (langsung waspada tinggi: langsung_tinggi = true) (Requirement 19.1)
  if (options?.isSafeBrowsingThreat === true) {
    adaLangsungTinggi = true;
    temuan.push({
      judul: 'Terdeteksi di daftar ancaman Google Safe Browsing',
      penjelasan:
        'URL ini terdaftar dalam basis data ancaman Google Safe Browsing karena terindikasi mengandung malware, phishing, atau rekayasa sosial berbahaya.',
      bukti: parsed.domainUtama || hostClean || trimmed,
      sumber: 'safe_browsing',
    });
  }

  // 2. Nama mirip merek Indonesia (+3) dengan substitusi karakter (Requirement 19.2)
  let deteksiMerekHasil = deteksiMerek(parsed.domainUtama);
  if (!deteksiMerekHasil.cocok) {
    if (parsed.subdomain) {
      const subPlusMainWithoutDots = `${parsed.subdomain}${parsed.domainUtama}`.replace(/\./g, '');
      const deteksiWithoutDots = deteksiMerek(subPlusMainWithoutDots);
      if (deteksiWithoutDots.cocok) {
        deteksiMerekHasil = deteksiWithoutDots;
      }
    } else if (hostClean) {
      const deteksiHost = deteksiMerek(hostClean);
      if (deteksiHost.cocok) {
        deteksiMerekHasil = deteksiHost;
      }
    }
  }
  if (deteksiMerekHasil.cocok && deteksiMerekHasil.merek) {
    skor += 3;
    temuan.push({
      judul: `Nama domain mirip merek resmi (${deteksiMerekHasil.merek})`,
      penjelasan: `Alamat domain menggunakan nama yang menyerupai merek terpercaya "${deteksiMerekHasil.merek}" dengan variasi ejaan atau substitusi karakter (seperti angka pengganti huruf). Pola ini sering digunakan dalam modus phishing untuk mengelabui korban.`,
      bukti: `Domain "${parsed.domainUtama || hostClean}" menyerupai merek ${deteksiMerekHasil.merek} (variasi: ${deteksiMerekHasil.variasiCocok})`,
      sumber: 'aturan',
    });
  }

  // 3. Domain berumur < 30 hari via RDAP (+3) (Requirement 19.3)
  if (typeof options?.rdapAgeDays === 'number' && options.rdapAgeDays < 30) {
    skor += 3;
    temuan.push({
      judul: 'Domain baru didaftarkan (kurang dari 30 hari)',
      penjelasan: `Domain berumur ${options.rdapAgeDays} hari berdasarkan data registrasi domain (RDAP). Situs penipuan umumnya menggunakan domain yang baru dibuat karena domain lama sering kali sudah terdeteksi dan diblokir.`,
      bukti: `Umur domain: ${options.rdapAgeDays} hari (< 30 hari)`,
      sumber: 'rdap',
    });
  }

  // 4. Punycode atau karakter mirip (xn--) (+3) (Requirement 19.4)
  const isPunycode =
    trimmed.toLowerCase().includes('xn--') ||
    hostClean.includes('xn--') ||
    /[^\x00-\x7F]/.test(hostClean);

  if (isPunycode) {
    skor += 3;
    temuan.push({
      judul: 'Penggunaan Punycode atau karakter homograf (xn--)',
      penjelasan:
        'URL menggunakan format Punycode (awalan xn--) atau karakter non-ASCII yang tampak mirip dengan huruf biasa. Teknik ini sering dimanfaatkan untuk homograph attack agar pengguna mengira sedang membuka situs asli.',
      bukti: hostClean.includes('xn--')
        ? `Host mengandung Punycode: ${hostClean}`
        : 'Domain mengandung karakter non-ASCII homograf',
      sumber: 'aturan',
    });
  }

  // 5. Alamat berupa IP (+3) (IPv4/IPv6) (Requirement 19.5)
  if (isIpAddress(hostClean) || isIpAddress(parsed.domainUtama)) {
    skor += 3;
    const ipHost = isIpAddress(hostClean) ? hostClean : parsed.domainUtama;
    temuan.push({
      judul: 'Alamat berupa IP numerik langsung tanpa nama domain',
      penjelasan:
        'URL menggunakan alamat IP langsung (bukan nama domain resmi). Penggunaan alamat IP sering dilakukan untuk menyembunyikan identitas pemilik situs atau menghindari filter reputasi domain.',
      bukti: `Alamat IP numerik: ${ipHost}`,
      sumber: 'aturan',
    });
  }

  // 6. Kata pemicu di domain atau path (+2): hadiah, klaim, undian, verifikasi, login, promo (Requirement 19.6)
  const areaPemeriksaanKata = [
    parsed.domainUtama,
    parsed.subdomain,
    parsed.path,
  ]
    .filter(Boolean)
    .join('/')
    .toLowerCase();

  const kataDitemukan: string[] = [];
  for (const kata of KATA_PEMICU_LINK) {
    if (areaPemeriksaanKata.includes(kata)) {
      kataDitemukan.push(kata);
    }
  }

  if (kataDitemukan.length > 0) {
    skor += 2;
    temuan.push({
      judul: 'Terdapat kata pemicu penipuan pada domain atau path',
      penjelasan: `Ditemukan kata pemicu ("${kataDitemukan.join(', ')}") yang sangat lazim digunakan dalam modus phishing untuk memancing calon korban mengklaim bonus palsu atau menyerahkan data kredensial.`,
      bukti: `Kata pemicu terdeteksi: ${kataDitemukan.join(', ')}`,
      sumber: 'aturan',
    });
  }

  // 7. Lebih dari 3 subdomain, atau nama merek di subdomain dan bukan di domain utama (+2) (Requirement 19.7)
  const subdomainParts = parsed.subdomain
    ? parsed.subdomain.split('.').filter(Boolean)
    : [];
  const lebihDari3Subdomain = subdomainParts.length > 3;

  let merekDiSubdomainBukanUtama = false;
  let namaMerekSubdomain = '';

  if (parsed.subdomain) {
    const deteksiSub = deteksiMerek(parsed.subdomain);
    if (deteksiSub.cocok && deteksiSub.merek) {
      namaMerekSubdomain = deteksiSub.merek;
      // Periksa apakah domainUtama memuat merek yang sama
      if (!deteksiMerekHasil.cocok || deteksiMerekHasil.merek !== deteksiSub.merek) {
        merekDiSubdomainBukanUtama = true;
      }
    }
  }

  if (lebihDari3Subdomain || merekDiSubdomainBukanUtama) {
    skor += 2;
    let buktiSub = '';
    if (lebihDari3Subdomain && merekDiSubdomainBukanUtama) {
      buktiSub = `Subdomain memiliki ${subdomainParts.length} tingkat dan mencantumkan nama merek ${namaMerekSubdomain} di subdomain ("${parsed.subdomain}") bukan di domain utama ("${parsed.domainUtama}")`;
    } else if (lebihDari3Subdomain) {
      buktiSub = `Subdomain memiliki ${subdomainParts.length} tingkat: "${parsed.subdomain}"`;
    } else {
      buktiSub = `Nama merek ${namaMerekSubdomain} diletakkan di subdomain ("${parsed.subdomain}"), sedangkan domain utama terdaftar adalah "${parsed.domainUtama}"`;
    }

    temuan.push({
      judul: 'Struktur subdomain bertingkat atau menyamarkan merek',
      penjelasan:
        'URL memiliki struktur subdomain yang tidak wajar (lebih dari 3 tingkat) atau mencantumkan nama merek terpercaya di subdomain untuk mengelabui pembaca seolah situs tersebut adalah milik entitas resmi.',
      bukti: buktiSub,
      sumber: 'aturan',
    });
  }

  // 8. TLD berisiko (+1) (Requirement 19.8)
  const candidateTlds = [
    parsed.tld.replace(/^\./, '').toLowerCase(),
    parsed.tld.split('.').pop()?.toLowerCase() || '',
  ].filter(Boolean);

  let isRiskyTld = false;
  let matchedTld = '';
  for (const t of candidateTlds) {
    if (TLD_BERISIKO_SET.has(t)) {
      isRiskyTld = true;
      matchedTld = t;
      break;
    }
  }

  if (isRiskyTld) {
    skor += 1;
    temuan.push({
      judul: `Penggunaan TLD berisiko (.${matchedTld})`,
      penjelasan: `Domain menggunakan ekstensi .${matchedTld} yang sering disalahgunakan untuk aktivitas penipuan dan phishing karena biaya pendaftaran yang sangat murah dan pengawasan yang longgar.`,
      bukti: `TLD berisiko: .${matchedTld}`,
      sumber: 'aturan',
    });
  }

  // 9. Layanan pemendek link (+1) (Requirement 19.9)
  const hostDomainTld = [parsed.domainUtama, parsed.tld].filter(Boolean).join('.');
  let isShortener = false;
  let matchedShortener = '';

  if (PEMENDEK_LINK_DOMAINS.has(hostClean)) {
    isShortener = true;
    matchedShortener = hostClean;
  } else if (PEMENDEK_LINK_DOMAINS.has(hostDomainTld)) {
    isShortener = true;
    matchedShortener = hostDomainTld;
  } else {
    for (const sh of PEMENDEK_LINK_DOMAINS) {
      if (hostClean === sh || hostClean.endsWith(`.${sh}`)) {
        isShortener = true;
        matchedShortener = sh;
        break;
      }
    }
  }

  if (isShortener) {
    skor += 1;
    temuan.push({
      judul: 'Tautan menggunakan layanan pemendek link (URL Shortener)',
      penjelasan:
        'Layanan pemendek tautan menyembunyikan alamat situs tujuan yang sebenarnya. Disarankan untuk menggunakan fitur pratinjau tautan resmi dari penyedia pemendek tersebut sebelum mengakses alamat asli.',
      bukti: `Pemendek link: ${matchedShortener}`,
      sumber: 'aturan',
    });
  }

  // 10. Karakter '@' di URL atau URL > 200 karakter (+1) (Requirement 19.10)
  const adaKarakterAt = trimmed.includes('@');
  const urlTerlaluPanjang = trimmed.length > 200;

  if (adaKarakterAt || urlTerlaluPanjang) {
    skor += 1;
    let buktiAtPanjang = '';
    if (adaKarakterAt && urlTerlaluPanjang) {
      buktiAtPanjang = `Terdapat karakter '@' dan panjang URL mencapai ${trimmed.length} karakter (> 200 karakter)`;
    } else if (adaKarakterAt) {
      buktiAtPanjang = "Terdapat karakter '@' pada tautan";
    } else {
      buktiAtPanjang = `Panjang URL mencapai ${trimmed.length} karakter (> 200 karakter)`;
    }

    temuan.push({
      judul: "Terdapat karakter '@' atau panjang URL tidak wajar",
      penjelasan:
        "Karakter '@' di dalam URL dapat mengecoh pembaca karena browser akan mengabaikan bagian sebelum '@' dan mengarah ke host di belakangnya. Panjang URL yang melebihi 200 karakter juga sering dimanfaatkan untuk mengaburkan nama domain asli.",
      bukti: buktiAtPanjang,
      sumber: 'aturan',
    });
  }

  // 11. Ditandai berbahaya oleh VirusTotal (+3) (Requirements LN-08, 18.1)
  if (options?.isVirusTotalThreat === true) {
    skor += 3;
    const detail = options.virusTotalDetail;
    const bukti = detail
      ? `${detail.jumlahVendorBerbahaya}/${detail.totalVendor} vendor keamanan mendeteksi ancaman`
      : 'Ditandai berbahaya oleh vendor VirusTotal';
    const penjelasan = detail
      ? `${detail.jumlahVendorBerbahaya} dari ${detail.totalVendor} vendor keamanan di VirusTotal mendeteksi bahwa tautan ini berpotensi berbahaya atau memuat konten penipuan/malware.`
      : 'URL ini ditandai sebagai berbahaya oleh mesin pemindai keamanan di VirusTotal.';

    temuan.push({
      judul: 'Ditandai berbahaya oleh VirusTotal',
      penjelasan,
      bukti,
      sumber: 'virustotal',
    });
  }

  const level = hitungLevel(skor, adaLangsungTinggi);

  return {
    skor,
    level,
    temuan,
    linkDitemukan: [parsed.urlBersih || trimmed],
    modusVideoDitemukan: false,
  };
}

/**
 * Menghasilkan langkah tindakan yang disarankan untuk pemeriksaan link (Requirement 5.4, 19.9).
 * Selalu mengembalikan minimal 2 langkah tindakan.
 */
function tentukanLangkahLink(hasilAturan: HasilAturan): string[] {
  const langkah: string[] = [];
  const judulSet = new Set(hasilAturan.temuan.map((t) => t.judul));

  const hasShortener = Array.from(judulSet).some((j) =>
    j.toLowerCase().includes('pemendek link')
  );

  if (hasilAturan.level === 'tinggi') {
    langkah.push(
      'Jangan membuka atau mengklik tautan ini, dan jangan memasukkan data pribadi, nomor rekening, PIN, atau kata sandi apa pun.'
    );
    langkah.push(
      'Jika kamu menerima tautan ini dari pesan singkat atau media sosial, segera abaikan atau laporkan pesan tersebut.'
    );
    langkah.push(
      'Jika sudah terlanjur membuka dan memasukkan data akun, segera ganti kata sandi akun resmi kamu dan hubungi pihak bank atau penyedia layanan terkait.'
    );
  } else if (hasilAturan.level === 'sedang') {
    langkah.push(
      'Periksa kembali alamat domain dengan teliti untuk memastikan tidak ada huruf atau angka pengganti yang menyerupai situs resmi.'
    );
    if (hasShortener) {
      langkah.push(
        'Tautan menggunakan pemendek link; gunakan fitur pratinjau (misal: tambahkan tanda + di akhir alamat pada bit.ly) untuk melihat alamat tujuan asli sebelum membuka.'
      );
    } else {
      langkah.push(
        'Jangan terburu-buru mengisi formulir atau melakukan login sebelum memverifikasi keaslian pengirim melalui kanal resmi mandiri.'
      );
    }
    langkah.push(
      'Akses layanan atau promo terkait langsung melalui aplikasi resmi atau situs yang kamu ketik sendiri di browser.'
    );
  } else {
    // level === 'tidak_ditemukan'
    langkah.push(
      'Tetap berhati-hati dan jangan pernah membagikan kode OTP, PIN, atau kata sandi perbankan di situs mana pun.'
    );
    langkah.push(
      'Selalu akses layanan resmi melalui alamat situs resmi yang tersimpan atau aplikasi terpercaya.'
    );
  }

  return langkah;
}

/**
 * Menghasilkan objek FormatDataHasil lengkap langsung di browser (tanpa API)
 * menggunakan aturan leksikal URL lokal.
 *
 * @param input String URL atau nama domain yang dianalisis
 * @param options Opsi status RDAP dan Safe Browsing (jika tersedia)
 * @returns FormatDataHasil yang sesuai dengan kontrak data bersama
 */
export function generateHasilLinkLokal(
  input: string,
  options?: EvaluasiLinkOptions
): FormatDataHasil {
  const hasilAturan = evaluasiLeksikalUrl(input, options);

  let ringkasan: string;
  if (hasilAturan.level === 'tinggi') {
    ringkasan =
      'Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi.';
  } else if (hasilAturan.level === 'sedang') {
    ringkasan = 'Ada tanda yang perlu kamu cek dulu sebelum lanjut.';
  } else {
    ringkasan =
      'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.';
  }

  const halWajar: string[] = [];
  if (hasilAturan.level === 'tidak_ditemukan') {
    halWajar.push('Format dan struktur URL tampak normal');
    halWajar.push('Tidak terdeteksi pola nama domain tiruan atau kata pemicu penipuan');
  }

  const langkah = tentukanLangkahLink(hasilAturan);

  const situasiDarurat: SituasiDarurat[] =
    hasilAturan.level === 'tidak_ditemukan'
      ? ['klik_link']
      : ['klik_link', 'isi_data'];

  const pihakKetiga: string[] = [];
  if (options?.isSafeBrowsingThreat !== undefined) {
    pihakKetiga.push('Google Safe Browsing');
  }
  if (options?.rdapAgeDays !== undefined) {
    pihakKetiga.push('RDAP');
  }
  if (options?.isVirusTotalThreat !== undefined) {
    pihakKetiga.push('VirusTotal');
  }

  const statusLayanan: Record<string, StatusLayanan> = {
    safe_browsing:
      options?.isSafeBrowsingThreat !== undefined ? 'ok' : 'tidak_dipakai',
    rdap: options?.rdapAgeDays !== undefined ? 'ok' : 'tidak_dipakai',
    virustotal:
      options?.isVirusTotalThreat !== undefined ? 'ok' : 'tidak_dipakai',
  };

  return {
    halaman: 'link',
    url: input,
    level: hasilAturan.level,
    ringkasan,
    temuan: hasilAturan.temuan,
    hal_wajar: halWajar,
    langkah,
    situasi_darurat: situasiDarurat,
    batasan:
      'Pemeriksaan leksikal ini menganalisis pola penulisan URL dan domain tanpa membuka konten halaman web. Situs berbahaya yang sangat baru atau belum dilaporkan mungkin tidak terdeteksi.',
    pihak_ketiga: pihakKetiga,
    status_layanan: statusLayanan,
  };
}
