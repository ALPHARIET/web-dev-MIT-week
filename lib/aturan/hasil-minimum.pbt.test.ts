import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateHasilChatLokal } from './chat-rules';
import {
  generateHasilLinkLokal,
  type EvaluasiLinkOptions,
} from './link-rules';
import {
  generateHasilVideoLokal,
  type JawabanWizardVideo,
} from './video-rules';
import {
  type FormatDataHasil,
  type TingkatLevel,
  type HalamanCek,
  type SumberTemuan,
} from '../hasil';
import {
  arbitraryChatText,
  arbitraryTeksWithSensitif,
  arbitraryWizardAnswers,
  arbitraryNonTriggeringAnswers,
  arbitraryUrlWithSensitiveParams,
  KALIMAT_CHAT_NETRAL,
} from '../../test/arbitraries';

// ===== KONSTANTA & SET NILAI VALID =====

const SUMBER_VALID: Set<SumberTemuan> = new Set([
  'aturan',
  'ai',
  'safe_browsing',
  'rdap',
  'virustotal',
  'reality_defender',
]);

const LEVEL_VALID: Set<TingkatLevel> = new Set([
  'tinggi',
  'sedang',
  'tidak_ditemukan',
]);

// ===== ARBITRARY GENERATORS UNTUK INPUT ATURAN LOKAL =====

function arbitraryChatInput(): fc.Arbitrary<string> {
  return fc.oneof(
    arbitraryChatText(),
    arbitraryTeksWithSensitif(),
    fc
      .subarray(KALIMAT_CHAT_NETRAL, { minLength: 0, maxLength: 4 })
      .map((arr) => arr.join(' ')),
    fc.string({ minLength: 0, maxLength: 500 })
  );
}

function arbitraryUrlInput(): fc.Arbitrary<string> {
  const protocol = fc.constantFrom('https://', 'http://', '');

  const domainAman = fc.constantFrom(
    'example.com',
    'google.com',
    'bca.co.id',
    'shopee.co.id',
    'tokopedia.com',
    'kominfo.go.id',
    'wikipedia.org'
  );

  const domainMerekTiruan = fc.constantFrom(
    'sh0pee-promo.xyz',
    'bca-klik.top',
    'dana-kaget.online',
    'bankmandiri-login.cfd',
    'undian-bri.site'
  );

  const domainPunycode = fc.constantFrom(
    'xn--shope-kqa.com',
    'xn--bca-9o0a.id',
    'xn--gopay-1qa.net'
  );

  const domainIp = fc.constantFrom(
    '192.168.1.1',
    '103.20.10.5',
    '10.0.0.1:8080'
  );

  const domainPemendek = fc.constantFrom(
    'bit.ly/promo-2024',
    's.id/hadiah-gratis',
    'tinyurl.com/klaim-dana',
    't.co/xyz123'
  );

  const domainTldBerisiko = fc.constantFrom(
    'klaim-saldo.xyz',
    'pemenang-undian.top',
    'bonus-pulsa.buzz',
    'hadiah-langsung.click',
    'update-rekening.rest'
  );

  const domainBanyakSubdomain = fc.constantFrom(
    'bca.login.portal.verifikasi.scam.org',
    'a.b.c.d.promo-terbaru.net',
    'mandiri.layanan.cs.nasabah.id-update.com'
  );

  const pathKataPemicu = fc.constantFrom(
    '',
    '/klaim-hadiah-undian',
    '/login-verifikasi',
    '/promo-spesial/voucher',
    '/dana-kaget/ambil',
    '/user/dashboard'
  );

  const candidateDomains = fc.oneof(
    domainAman,
    domainMerekTiruan,
    domainPunycode,
    domainIp,
    domainPemendek,
    domainTldBerisiko,
    domainBanyakSubdomain
  );

  const regularUrl = fc
    .tuple(protocol, candidateDomains, pathKataPemicu)
    .map(([proto, dom, path]) => `${proto}${dom}${path}`);

  const longUrl = fc
    .tuple(
      protocol,
      domainMerekTiruan,
      fc
        .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')), {
          minLength: 201,
          maxLength: 250,
        })
        .map((chars) => chars.join(''))
    )
    .map(([proto, dom, p]) => `${proto}${dom}/${p}`);

  const atUrl = fc
    .tuple(protocol, candidateDomains)
    .map(([proto, dom]) => `${proto}user:password@${dom}/login`);

  return fc.oneof(
    regularUrl,
    longUrl,
    atUrl,
    arbitraryUrlWithSensitiveParams(),
    fc.webUrl(),
    fc.string({ minLength: 0, maxLength: 50 })
  );
}

function arbitraryLinkOptions(): fc.Arbitrary<EvaluasiLinkOptions> {
  return fc.record(
    {
      isSafeBrowsingThreat: fc.boolean(),
      rdapAgeDays: fc.integer({ min: 1, max: 365 }),
    },
    { requiredKeys: [] }
  );
}

function arbitraryVideoInput(): fc.Arbitrary<JawabanWizardVideo> {
  return fc.oneof(
    arbitraryWizardAnswers(),
    arbitraryNonTriggeringAnswers(),
    fc.constant<JawabanWizardVideo>({})
  );
}

// ===== HELPER VALIDASI PROPERTY 9 & PROPERTY 10 =====

function cekKataTerlarangSebagaiKesimpulan(teks: string): {
  melanggar: boolean;
  alasan?: string;
} {
  if (/100%/i.test(teks)) {
    return { melanggar: true, alasan: `Mengandung "100%": "${teks}"` };
  }

  if (/\bterbukti\b/i.test(teks)) {
    return { melanggar: true, alasan: `Mengandung kata "terbukti": "${teks}"` };
  }

  const pastiMatches = teks.match(/\bpasti\b/gi);
  if (pastiMatches) {
    const negatedPastiMatches =
      teks.match(/(?:tidak|bukan)\s+berarti\s+pasti(?:\s+aman)?/gi) || [];
    if (pastiMatches.length > negatedPastiMatches.length) {
      return {
        melanggar: true,
        alasan: `Mengandung kata "pasti" di luar konteks negasi: "${teks}"`,
      };
    }
  }

  const amanMatches = teks.match(/\baman\b/gi);
  if (amanMatches) {
    const negatedAmanMatches =
      teks.match(/(?:tidak|bukan)\s+(?:berarti\s+(?:pasti\s+)?)?aman/gi) ||
      teks.match(/(?:bukan|tidak)\s+(?:jaminan|menjamin)\s+aman/gi) ||
      [];
    if (amanMatches.length > negatedAmanMatches.length) {
      return {
        melanggar: true,
        alasan: `Mengandung kata "aman" di luar konteks negasi: "${teks}"`,
      };
    }
  }

  return { melanggar: false };
}

function verifikasiBebasKataTerlarang(hasil: FormatDataHasil): void {
  const resRingkasan = cekKataTerlarangSebagaiKesimpulan(hasil.ringkasan);
  expect(
    resRingkasan.melanggar,
    `Ringkasan memuat kata terlarang sebagai kesimpulan: ${resRingkasan.alasan}`
  ).toBe(false);

  for (const t of hasil.temuan) {
    const resPenjelasan = cekKataTerlarangSebagaiKesimpulan(t.penjelasan);
    expect(
      resPenjelasan.melanggar,
      `Penjelasan temuan "${t.judul}" memuat kata terlarang: ${resPenjelasan.alasan}`
    ).toBe(false);

    expect(t.penjelasan).not.toMatch(/\b(pasti|terbukti|100%|aman)\b/i);
  }

  for (const l of hasil.langkah) {
    const resLangkah = cekKataTerlarangSebagaiKesimpulan(l);
    expect(
      resLangkah.melanggar,
      `Langkah tindakan memuat kata terlarang: ${resLangkah.alasan}`
    ).toBe(false);

    expect(l).not.toMatch(/\b(pasti|terbukti|100%|aman)\b/i);
  }
}

function verifikasiStrukturMinimum(
  hasil: FormatDataHasil,
  expectedHalaman: HalamanCek
): void {
  expect(hasil.halaman).toBe(expectedHalaman);

  expect(LEVEL_VALID.has(hasil.level)).toBe(true);

  if (hasil.level === 'tinggi' || hasil.level === 'sedang') {
    expect(
      hasil.temuan.length,
      `Level ${hasil.level} harus memiliki minimal 1 temuan`
    ).toBeGreaterThanOrEqual(1);
  }

  for (const t of hasil.temuan) {
    expect(typeof t.judul).toBe('string');
    expect(t.judul.trim().length).toBeGreaterThan(0);

    expect(typeof t.penjelasan).toBe('string');
    expect(t.penjelasan.trim().length).toBeGreaterThan(0);

    expect(typeof t.bukti).toBe('string');
    expect(t.bukti.trim().length).toBeGreaterThan(0);

    expect(
      SUMBER_VALID.has(t.sumber),
      `Sumber temuan "${t.sumber}" harus merupakan salah satu sumber yang valid`
    ).toBe(true);
  }

  expect(Array.isArray(hasil.langkah)).toBe(true);
  expect(
    hasil.langkah.length,
    'Setiap hasil harus memiliki minimal 2 langkah tindakan'
  ).toBeGreaterThanOrEqual(2);

  for (const l of hasil.langkah) {
    expect(typeof l).toBe('string');
    expect(l.trim().length).toBeGreaterThan(0);
  }

  expect(typeof hasil.ringkasan).toBe('string');
  expect(hasil.ringkasan.trim().length).toBeGreaterThan(0);

  expect(Array.isArray(hasil.hal_wajar)).toBe(true);
  expect(Array.isArray(hasil.situasi_darurat)).toBe(true);

  expect(typeof hasil.batasan).toBe('string');
  expect(hasil.batasan.trim().length).toBeGreaterThan(0);

  expect(Array.isArray(hasil.pihak_ketiga)).toBe(true);
  expect(typeof hasil.status_layanan).toBe('object');
  expect(hasil.status_layanan).not.toBeNull();
}

// ===== TEST SUITE: LIB/ATURAN/HASIL-MINIMUM.PBT.TEST.TS =====

describe('lib/aturan/hasil-minimum.pbt.test.ts', () => {
  describe('Property 9: Kata terlarang tidak pernah muncul sebagai kesimpulan', () => {
    it('Feature: cek-penipuan-web, Property 9: Kata terlarang tidak pernah muncul sebagai kesimpulan (**Validates: Requirements 2.4, 6.7, 30.1, 30.3**)', () => {
      fc.assert(
        fc.property(arbitraryChatInput(), (chatInput) => {
          const hasil = generateHasilChatLokal(chatInput);
          verifikasiBebasKataTerlarang(hasil);
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(
          arbitraryUrlInput(),
          arbitraryLinkOptions(),
          (urlInput, options) => {
            const hasil = generateHasilLinkLokal(urlInput, options);
            verifikasiBebasKataTerlarang(hasil);
          }
        ),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(arbitraryVideoInput(), (videoInput) => {
          const hasil = generateHasilVideoLokal(videoInput);
          verifikasiBebasKataTerlarang(hasil);
        }),
        { numRuns: 100 }
      );
    });

    it('memastikan aturan lokal chat tidak menghasilkan kata terlarang sebagai kesimpulan (**Validates: Requirements 2.4, 6.7, 30.1, 30.3**)', () => {
      fc.assert(
        fc.property(arbitraryChatInput(), (chatInput) => {
          const hasil = generateHasilChatLokal(chatInput);
          verifikasiBebasKataTerlarang(hasil);
        }),
        { numRuns: 100 }
      );
    });

    it('memastikan aturan lokal link tidak menghasilkan kata terlarang sebagai kesimpulan (**Validates: Requirements 2.4, 6.7, 30.1, 30.3**)', () => {
      fc.assert(
        fc.property(
          arbitraryUrlInput(),
          arbitraryLinkOptions(),
          (urlInput, options) => {
            const hasil = generateHasilLinkLokal(urlInput, options);
            verifikasiBebasKataTerlarang(hasil);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('memastikan aturan lokal video tidak menghasilkan kata terlarang sebagai kesimpulan (**Validates: Requirements 2.4, 6.7, 30.1, 30.3**)', () => {
      fc.assert(
        fc.property(arbitraryVideoInput(), (videoInput) => {
          const hasil = generateHasilVideoLokal(videoInput);
          verifikasiBebasKataTerlarang(hasil);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Hasil aturan lokal selalu memenuhi struktur minimum', () => {
    it('Feature: cek-penipuan-web, Property 10: Hasil aturan lokal selalu memenuhi struktur minimum (**Validates: Requirements 5.2, 5.3, 5.4, 6.6, 29.4**)', () => {
      fc.assert(
        fc.property(arbitraryChatInput(), (chatInput) => {
          const hasil = generateHasilChatLokal(chatInput);
          verifikasiStrukturMinimum(hasil, 'chat');
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(
          arbitraryUrlInput(),
          arbitraryLinkOptions(),
          (urlInput, options) => {
            const hasil = generateHasilLinkLokal(urlInput, options);
            verifikasiStrukturMinimum(hasil, 'link');
          }
        ),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(arbitraryVideoInput(), (videoInput) => {
          const hasil = generateHasilVideoLokal(videoInput);
          verifikasiStrukturMinimum(hasil, 'video');
        }),
        { numRuns: 100 }
      );
    });

    it('memastikan hasil aturan lokal chat memenuhi seluruh struktur minimum (**Validates: Requirements 5.2, 5.3, 5.4, 6.6, 29.4**)', () => {
      fc.assert(
        fc.property(arbitraryChatInput(), (chatInput) => {
          const hasil = generateHasilChatLokal(chatInput);
          verifikasiStrukturMinimum(hasil, 'chat');
        }),
        { numRuns: 100 }
      );
    });

    it('memastikan hasil aturan lokal link memenuhi seluruh struktur minimum (**Validates: Requirements 5.2, 5.3, 5.4, 6.6, 29.4**)', () => {
      fc.assert(
        fc.property(
          arbitraryUrlInput(),
          arbitraryLinkOptions(),
          (urlInput, options) => {
            const hasil = generateHasilLinkLokal(urlInput, options);
            verifikasiStrukturMinimum(hasil, 'link');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('memastikan hasil aturan lokal video memenuhi seluruh struktur minimum (**Validates: Requirements 5.2, 5.3, 5.4, 6.6, 29.4**)', () => {
      fc.assert(
        fc.property(arbitraryVideoInput(), (videoInput) => {
          const hasil = generateHasilVideoLokal(videoInput);
          verifikasiStrukturMinimum(hasil, 'video');
        }),
        { numRuns: 100 }
      );
    });
  });
});
