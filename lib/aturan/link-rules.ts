import { parseUrl } from '../sanitasi-url';
import {
  hitungLevel,
  type Temuan,
  type FormatDataHasil,
  type StatusLayanan,
  type SituasiDarurat,
} from '../hasil';
import { type HasilAturan } from './scoring';
import daftarMerekJson from '../../data/merek.json';
import tldBerisikoJson from '../../data/tld-berisiko.json';

export interface EvaluasiLinkOptions {
  rdapAgeDays?: number;
  isSafeBrowsingThreat?: boolean;
  isVirusTotalThreat?: boolean;
  virusTotalDetail?: {
    jumlahVendorBerbahaya: number;
    totalVendor: number;
  };
}

export interface HasilDeteksiMerek {
  cocok: boolean;
  merek: string | null;
  variasiCocok: string | null;
  kategori: string | null;
  skor: number;
}

export const KATA_PEMICU_LINK = [
  'hadiah',
  'klaim',
  'undian',
  'verifikasi',
  'login',
  'promo',
] as const;

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

export const TLD_BERISIKO_SET = new Set<string>(
  (tldBerisikoJson.tld || []).map((t: string) => t.toLowerCase().trim())
);

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export function isIpAddress(host: string): boolean {
  if (!host) return false;
  const clean = host.replace(/^\[|\]$/g, '').trim();

  if (IPV4_REGEX.test(clean)) return true;

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

function cleanHostString(input: string): string {
  let s = (input || '').trim().toLowerCase();
  s = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  s = s.replace(/^\/\//, '');
  s = s.split(/[/?#]/)[0];
  const atIdx = s.lastIndexOf('@');
  if (atIdx >= 0 && !s.slice(atIdx).startsWith('@.')) {
    const afterAt = s.slice(atIdx + 1);
    if (afterAt.includes('.') && !afterAt.startsWith('.')) {
      s = afterAt;
    }
  }
  const colonIdx = s.lastIndexOf(':');
  if (colonIdx >= 0 && !s.includes(']')) {
    s = s.slice(0, colonIdx);
  }
  return s;
}

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

  const parsed = parseUrl(rawClean.includes('://') ? rawClean : `http://${rawClean}`);
  const domainUtama = (parsed.domainUtama || rawClean).toLowerCase();
  const normalizedDomainUtama = normalizeLeetspeak(domainUtama);

  const candidates = new Set<string>();
  candidates.add(rawClean);
  candidates.add(normalizeLeetspeak(rawClean));
  candidates.add(domainUtama);
  candidates.add(normalizedDomainUtama);

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

  const tokens = domainUtama.split(/[-_.]+/).filter(Boolean);
  for (const t of tokens) {
    candidates.add(t);
    candidates.add(normalizeLeetspeak(t));
  }

  if (parsed.subdomain) {
    const subPlusMain = `${parsed.subdomain}.${domainUtama}`.toLowerCase();
    candidates.add(subPlusMain);
    candidates.add(normalizeLeetspeak(subPlusMain));
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

    const brandMinLength = brandLower.length;

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
      if (brandLower === 'dana' && (normalizedDomainUtama === 'perdana' || normalizedDomainUtama.includes('perdana'))) {
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

  if (typeof options?.rdapAgeDays === 'number' && options.rdapAgeDays < 30) {
    skor += 3;
    temuan.push({
      judul: 'Domain baru didaftarkan (kurang dari 30 hari)',
      penjelasan: `Domain berumur ${options.rdapAgeDays} hari berdasarkan data registrasi domain (RDAP). Situs penipuan umumnya menggunakan domain yang baru dibuat karena domain lama sering kali sudah terdeteksi dan diblokir.`,
      bukti: `Umur domain: ${options.rdapAgeDays} hari (< 30 hari)`,
      sumber: 'rdap',
    });
  }

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

function tentukanLangkahLink(
  hasilAturan: HasilAturan,
  inputUrl?: string,
  options?: EvaluasiLinkOptions
): string[] {
  const langkah: string[] = [];
  const rawUrl = (inputUrl || hasilAturan.linkDitemukan[0] || '').trim();
  const parsed = rawUrl
    ? parseUrl(rawUrl.includes('://') ? rawUrl : `http://${rawUrl}`)
    : null;
  const hostDariParsed = parsed
    ? [parsed.subdomain, parsed.domainUtama, parsed.tld].filter(Boolean).join('.')
    : '';
  const hostname = hostDariParsed || cleanHostString(rawUrl) || 'tautan ini';
  const pathLower = (parsed?.path || rawUrl).toLowerCase();

  const infoMerek = rawUrl ? deteksiMerek(rawUrl) : { cocok: false, merek: null };
  const merek = infoMerek.cocok && infoMerek.merek ? infoMerek.merek : null;

  const judulLower = hasilAturan.temuan.map((t) => t.judul.toLowerCase());
  const hasShortener = judulLower.some((j) => j.includes('pemendek link'));
  const hasPunycode = judulLower.some(
    (j) => j.includes('punycode') || j.includes('homograf')
  );
  const hasIp = judulLower.some((j) => j.includes('ip numerik'));
  const hasSubdomainTrick = judulLower.some((j) => j.includes('subdomain'));
  const hasRiskyTld = judulLower.some((j) => j.includes('tld berisiko'));
  const hasTriggerWord = judulLower.some((j) => j.includes('kata pemicu'));
  const hasApkOrExec = /\.(apk|exe|msi|scr|bat|zip|rar)(\b|$)/i.test(pathLower);
  const hasMalwarePath = /malware|virus|trojan|payload/i.test(pathLower);

  if (hasilAturan.level === 'tinggi') {
    if (merek) {
      langkah.push(
        `Jangan memasukkan PIN, kata sandi, atau kode OTP akun ${merek} di domain "${hostname}", karena alamat ini terindikasi mencatut nama ${merek}.`
      );
      langkah.push(
        `Tutup halaman "${hostname}" dan buka langsung aplikasi resmi ${merek} di ponsel kamu atau ketik sendiri alamat situs resmi ${merek} untuk mengecek kebenaran informasi tersebut.`
      );
    } else if (hasApkOrExec || hasMalwarePath || options?.isSafeBrowsingThreat) {
      langkah.push(
        `Jangan membuka atau mengunduh file apa pun dari "${hostname}" karena tautan ini terdeteksi berisiko menyusupkan program berbahaya (malware) atau halaman jebakan.`
      );
      langkah.push(
        `Jika halaman "${hostname}" sudah terlanjur terbuka di peramban, segera tutup tab tersebut, tolak semua permintaan izin unduhan atau notifikasi, dan pindai keamanan perangkat kamu.`
      );
    } else {
      langkah.push(
        `Jangan membuka atau memasukkan data pribadi, nomor rekening, PIN, maupun kata sandi apa pun pada halaman "${hostname}".`
      );
    }

    if (hasShortener) {
      langkah.push(
        `Tautan "${hostname}" menggunakan layanan pemendek link; gunakan fitur pratinjau URL untuk memeriksa domain tujuan asli tanpa membukanya.`
      );
    } else if (options?.rdapAgeDays !== undefined && options.rdapAgeDays < 30) {
      langkah.push(
        `Domain "${hostname}" baru terdaftar ${options.rdapAgeDays} hari yang lalu; hindari bertransaksi dan blokir pengirim yang menyebarkan tautan baru ini.`
      );
    }

    langkah.push(
      `Jika kamu sudah terlanjur mengisi data sensitif di "${hostname}", segera ubah kata sandi akun terkait dan hubungi layanan pelanggan resmi atau bank kamu untuk pemblokiran darurat.`
    );
  } else if (hasilAturan.level === 'sedang') {
    if (hasShortener) {
      langkah.push(
        `Tautan "${hostname}" menggunakan pemendek link; gunakan fitur pratinjau (misal: tambahkan tanda + di akhir alamat pada bit.ly atau gunakan pemeriksa tujuan URL) untuk melihat alamat tujuan asli sebelum membuka.`
      );
    }

    if (merek) {
      langkah.push(
        `Periksa kembali ejaan domain "${hostname}" dengan teliti karena terdapat kemiripan dengan nama ${merek}; pastikan kamu hanya mengakses aplikasi atau kanal resmi ${merek}.`
      );
    } else if (hasPunycode) {
      langkah.push(
        `Waspadai karakter samaran (punycode/homograf) pada domain "${hostname}"; jangan mengklik tautan tersebut dan ketik sendiri alamat situs resmi di peramban.`
      );
    } else if (hasIp) {
      langkah.push(
        `Hindari memasukkan akun atau data sensitif pada alamat berbasis angka IP (${hostname}), karena layanan resmi selalu menggunakan nama domain terdaftar.`
      );
    } else if (hasSubdomainTrick) {
      langkah.push(
        `Perhatikan struktur subdomain pada "${hostname}"; pastikan domain utamanya benar-benar milik instansi resmi dan bukan sekadar awalan mengecoh.`
      );
    } else {
      langkah.push(
        `Periksa kembali ejaan domain "${hostname}" dengan teliti untuk memastikan tidak ada huruf atau angka pengganti yang menyerupai situs resmi.`
      );
    }

    if (options?.rdapAgeDays !== undefined && options.rdapAgeDays < 30) {
      langkah.push(
        `Karena domain "${hostname}" baru berumur ${options.rdapAgeDays} hari, tunda pengisian formulir atau transaksi apa pun hingga kamu memverifikasi keaslian layanan melalui kanal resmi.`
      );
    } else if (hasTriggerWord || hasRiskyTld) {
      langkah.push(
        `Jangan terburu-buru mengisi formulir login atau klaim di "${hostname}" sebelum memverifikasi informasi tersebut langsung melalui aplikasi resmi terkait.`
      );
    } else {
      langkah.push(
        `Akses layanan atau informasi terkait langsung melalui aplikasi resmi atau situs yang kamu ketik sendiri di peramban, bukan dari tautan "${hostname}".`
      );
    }
  } else {
    if (hasShortener) {
      langkah.push(
        `Meskipun belum tampak indikasi bahaya, tautan "${hostname}" adalah pemendek link; gunakan fitur pratinjau untuk melihat domain tujuan sebenarnya sebelum mengaksesnya.`
      );
    } else {
      langkah.push(
        `Pastikan ejaan domain "${hostname}" pada bilah alamat peramban kamu tetap sesuai dan tidak dialihkan (redirect) ke domain asing saat halaman dibuka.`
      );
    }
    langkah.push(
      `Jika kamu hendak masuk (login) atau bertransaksi di "${hostname}", pastikan koneksi menggunakan HTTPS dan jangan pernah membagikan kode OTP atau PIN kepada siapa pun.`
    );
    langkah.push(
      `Simpan alamat resmi "${hostname}" di markah (bookmark) peramban kamu agar ke depannya terhindar dari salah ketik atau tautan tiruan.`
    );
  }

  return langkah;
}

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

  const langkah = tentukanLangkahLink(hasilAturan, input, options);

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
