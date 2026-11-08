/**
 * lib/sanitasi-url.ts
 *
 * Parsing dan sanitasi URL untuk Aplikasi Web Cek Penipuan.
 * Mengurai URL atau domain menjadi komponen-komponennya dan membuang
 * parameter sensitif (email, phone, token, session, id, password, otp).
 *
 * References: Requirements 17.3, 17.4, dan design.md
 */

/**
 * Interface komponen URL yang telah diurai sesuai spesifikasi design.md
 */
export interface UrlParsed {
  protokol: string;
  subdomain: string;
  domainUtama: string;
  tld: string;
  path: string;
  params: Record<string, string>;
  urlAsli: string;
  urlBersih: string; // URL tanpa parameter sensitif
}

/**
 * Daftar parameter yang dianggap sensitif dan harus dibuang.
 * Perbandingan dilakukan secara case-insensitive.
 */
export const PARAMETER_SENSITIF = [
  'email',
  'phone',
  'token',
  'session',
  'id',
  'password',
  'otp',
] as const;

export type ParameterSensitif = (typeof PARAMETER_SENSITIF)[number];

const SENSITIVE_PARAM_SET = new Set<string>(
  PARAMETER_SENSITIF.map((p) => p.toLowerCase())
);

/**
 * Memeriksa apakah suatu nama parameter termasuk parameter sensitif
 * (case-insensitive comparison).
 */
export function isSensitiveParam(key: string): boolean {
  return SENSITIVE_PARAM_SET.has(key.trim().toLowerCase());
}

/**
 * Daftar dua-bagian (multi-part) TLD yang umum, terutama domain Indonesia (.id)
 * dan domain internasional umum.
 */
const MULTI_PART_TLDS = new Set<string>([
  // ccSLD Indonesia (.id)
  'co.id',
  'web.id',
  'ac.id',
  'go.id',
  'mil.id',
  'sch.id',
  'or.id',
  'biz.id',
  'my.id',
  'net.id',

  // ccSLD internasional umum
  'co.uk',
  'org.uk',
  'gov.uk',
  'me.uk',
  'net.uk',
  'ac.uk',
  'ltd.uk',
  'plc.uk',

  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',

  'co.nz',
  'net.nz',
  'org.nz',
  'ac.nz',
  'govt.nz',

  'co.jp',
  'ne.jp',
  'ac.jp',
  'go.jp',
  'or.jp',

  'com.sg',
  'edu.sg',
  'gov.sg',
  'net.sg',
  'org.sg',

  'com.my',
  'edu.my',
  'gov.my',
  'net.my',
  'org.my',

  'com.br',
  'net.br',
  'org.br',
  'gov.br',

  'com.tr',
  'edu.tr',
  'gov.tr',
  'org.tr',

  'com.tw',
  'edu.tw',
  'gov.tw',
  'org.tw',

  'com.hk',
  'edu.hk',
  'gov.hk',
  'org.hk',

  'com.cn',
  'net.cn',
  'org.cn',
  'gov.cn',

  'com.ph',
  'net.ph',
  'org.ph',
  'gov.ph',

  'com.vn',
  'net.vn',
  'org.vn',
  'gov.vn',

  'com.mx',
  'org.mx',
  'gob.mx',

  'com.ar',
  'net.ar',
  'org.ar',
  'gob.ar',

  'co.za',
  'org.za',
  'gov.za',
]);

/**
 * Prefiks SLD umum untuk ccTLD 2 huruf (misal: co.ke, com.ng, dsb.)
 */
const COMMON_SLD_PREFIXES = new Set<string>([
  'co',
  'com',
  'org',
  'net',
  'edu',
  'gov',
  'gob',
  'ac',
  'sch',
  'or',
  'biz',
  'web',
]);

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Memecah hostname menjadi subdomain, domainUtama, dan tld.
 */
function extractDomainParts(rawHost: string): {
  subdomain: string;
  domainUtama: string;
  tld: string;
} {
  const host = rawHost.toLowerCase().trim();
  if (!host) {
    return { subdomain: '', domainUtama: '', tld: '' };
  }

  // 1. Periksa IPv4
  if (IPV4_REGEX.test(host)) {
    return {
      subdomain: '',
      domainUtama: host,
      tld: '',
    };
  }

  // 2. Periksa IPv6 (format [::1] atau alamat heksadesimal dengan titik dua)
  if (host.startsWith('[') || (host.includes(':') && !host.includes('.'))) {
    const cleanIpv6 = host.replace(/^\[|\]$/g, '');
    return {
      subdomain: '',
      domainUtama: cleanIpv6,
      tld: '',
    };
  }

  const parts = host.split('.').filter(Boolean);

  if (parts.length === 0) {
    return { subdomain: '', domainUtama: '', tld: '' };
  }

  if (parts.length === 1) {
    // e.g. "localhost"
    return {
      subdomain: '',
      domainUtama: parts[0],
      tld: '',
    };
  }

  // 3. Periksa multi-part TLD (misal: shopee.co.id, bbc.co.uk)
  if (parts.length >= 3) {
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    const candidateTld = `${secondLastPart}.${lastPart}`;

    const isMultiPart =
      MULTI_PART_TLDS.has(candidateTld) ||
      (lastPart.length === 2 && COMMON_SLD_PREFIXES.has(secondLastPart));

    if (isMultiPart) {
      const tld = candidateTld;
      const domainUtama = parts[parts.length - 3];
      const subdomain = parts.slice(0, parts.length - 3).join('.');
      return { subdomain, domainUtama, tld };
    }
  }

  // 4. Jika hanya 2 bagian dan merupakan multi-part TLD (misal input berupa "co.id")
  if (parts.length === 2) {
    const candidateTld = `${parts[0]}.${parts[1]}`;
    if (MULTI_PART_TLDS.has(candidateTld)) {
      return {
        subdomain: '',
        domainUtama: '',
        tld: candidateTld,
      };
    }
  }

  // 5. Single-part TLD standar (misal: example.com, bca.id, s.id-update-akun.invalid)
  const tld = parts[parts.length - 1];
  const domainUtama = parts[parts.length - 2];
  const subdomain = parts.slice(0, parts.length - 2).join('.');

  return { subdomain, domainUtama, tld };
}

/**
 * Mengurai URL atau nama domain menjadi komponen-komponennya.
 * Mendukung input dengan atau tanpa protokol (misal: "example.com", "https://sh0pee.co.id/promo?id=123").
 *
 * @param input String URL atau domain yang dimasukkan pengguna
 * @returns Objek UrlParsed dengan seluruh komponen URL
 */
export function parseUrl(input: string): UrlParsed {
  const trimmed = (input || '').trim();

  if (!trimmed) {
    return {
      protokol: '',
      subdomain: '',
      domainUtama: '',
      tld: '',
      path: '',
      params: {},
      urlAsli: input,
      urlBersih: trimmed,
    };
  }

  // 1. Ekstrak protokol jika ada
  let protokol = '';
  let rest = trimmed;

  const protoMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
  if (protoMatch) {
    protokol = protoMatch[1].toLowerCase();
    rest = trimmed.slice(protoMatch[0].length);
  } else if (trimmed.startsWith('//')) {
    protokol = '';
    rest = trimmed.slice(2);
  }

  // 2. Pisahkan authority (host + port + userinfo) dari sisa URL (path, query, hash)
  let firstDelim = -1;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === '/' || c === '?' || c === '#') {
      firstDelim = i;
      break;
    }
  }

  let authority = '';
  let pathAndAfter = '';
  if (firstDelim === -1) {
    authority = rest;
    pathAndAfter = '';
  } else {
    authority = rest.slice(0, firstDelim);
    pathAndAfter = rest.slice(firstDelim);
  }

  // 3. Ekstrak hostname dari authority (buang user:pass@ dan :port)
  const atIndex = authority.lastIndexOf('@');
  const hostAndPort = atIndex >= 0 ? authority.slice(atIndex + 1) : authority;

  let host = hostAndPort;
  if (host.startsWith('[')) {
    // Format IPv6: [::1]:8080
    const closeBracket = host.indexOf(']');
    if (closeBracket >= 0) {
      host = host.slice(0, closeBracket + 1);
    }
  } else {
    const colonIndex = host.lastIndexOf(':');
    if (colonIndex >= 0) {
      host = host.slice(0, colonIndex);
    }
  }

  const domainParts = extractDomainParts(host);

  // 4. Ekstrak path, query, dan hash
  let path = '';
  let queryAndHash = '';

  if (pathAndAfter.startsWith('/')) {
    let queryOrHashIdx = -1;
    for (let i = 0; i < pathAndAfter.length; i++) {
      const c = pathAndAfter[i];
      if (c === '?' || c === '#') {
        queryOrHashIdx = i;
        break;
      }
    }
    if (queryOrHashIdx === -1) {
      path = pathAndAfter;
      queryAndHash = '';
    } else {
      path = pathAndAfter.slice(0, queryOrHashIdx);
      queryAndHash = pathAndAfter.slice(queryOrHashIdx);
    }
  } else {
    path = '';
    queryAndHash = pathAndAfter;
  }

  let queryString = '';
  if (queryAndHash.startsWith('?')) {
    const hashIdx = queryAndHash.indexOf('#');
    if (hashIdx >= 0) {
      queryString = queryAndHash.slice(1, hashIdx);
    } else {
      queryString = queryAndHash.slice(1);
    }
  }

  // 5. Parsing query parameter ke bentuk Record<string, string>
  const params: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
  }

  return {
    protokol,
    subdomain: domainParts.subdomain,
    domainUtama: domainParts.domainUtama,
    tld: domainParts.tld,
    path,
    params,
    urlAsli: input,
    urlBersih: trimmed,
  };
}

/**
 * Membuang parameter sensitif dari objek UrlParsed:
 * `email`, `phone`, `token`, `session`, `id`, `password`, `otp` (case-insensitive).
 *
 * Parameter non-sensitif tetap utuh. Field `urlBersih` diperbarui dengan URL yang telah
 * disanitasi tanpa parameter sensitif.
 *
 * @param parsed Objek UrlParsed hasil dari parseUrl
 * @returns Objek UrlParsed baru dengan parameter dan urlBersih yang telah disanitasi
 */
export function sanitasiParams(parsed: UrlParsed): UrlParsed {
  // 1. Filter dictionary params
  const cleanParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.params)) {
    if (!isSensitiveParam(key)) {
      cleanParams[key] = value;
    }
  }

  // 2. Buat urlBersih tanpa parameter sensitif
  const raw = parsed.urlAsli || parsed.urlBersih;
  let urlBersih = raw;

  if (raw) {
    const qIndex = raw.indexOf('?');
    if (qIndex >= 0) {
      const base = raw.slice(0, qIndex);
      const afterQ = raw.slice(qIndex + 1);
      const hashIndex = afterQ.indexOf('#');
      const queryString = hashIndex >= 0 ? afterQ.slice(0, hashIndex) : afterQ;
      const hashString = hashIndex >= 0 ? afterQ.slice(hashIndex) : '';

      const searchParams = new URLSearchParams(queryString);
      const keysToDelete: string[] = [];

      searchParams.forEach((_, key) => {
        if (isSensitiveParam(key)) {
          keysToDelete.push(key);
        }
      });

      for (const k of keysToDelete) {
        searchParams.delete(k);
      }

      const newQuery = searchParams.toString();
      urlBersih = newQuery ? `${base}?${newQuery}${hashString}` : `${base}${hashString}`;
    }
  } else {
    // Fallback rekonstruksi jika raw string kosong
    let rebuilt = '';
    if (parsed.protokol) rebuilt += `${parsed.protokol}://`;
    const hostParts = [parsed.subdomain, parsed.domainUtama, parsed.tld]
      .filter(Boolean)
      .join('.');
    rebuilt += hostParts;
    if (parsed.path) rebuilt += parsed.path;
    const sp = new URLSearchParams(cleanParams);
    const q = sp.toString();
    if (q) rebuilt += `?${q}`;
    urlBersih = rebuilt;
  }

  return {
    ...parsed,
    params: cleanParams,
    urlBersih,
  };
}
