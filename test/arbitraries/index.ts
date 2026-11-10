import fc from 'fast-check';
import type {
  FormatDataHasil,
  Temuan,
  TingkatLevel,
  HalamanCek,
  SumberTemuan,
  StatusLayanan,
  SituasiDarurat,
} from '../../lib/hasil';
import { SENSOR_PLACEHOLDER } from '../../lib/sensor';
import type {
  JawabanWizardVideo,
  SituasiVideo,
  ApaDimintaVideo,
  NomorAkunVideo,
  SiapaTampilVideo,
} from '../../lib/aturan/video-rules';
import daftarMerekJson from '../../data/merek.json';
import tldBerisikoJson from '../../data/tld-berisiko.json';

export function arbitraryTemuan(): fc.Arbitrary<Temuan> {
  return fc.record({
    judul: fc.string({ minLength: 1, maxLength: 100 }),
    penjelasan: fc.string({ minLength: 1, maxLength: 500 }),
    bukti: fc.string({ minLength: 1, maxLength: 200 }),
    sumber: fc.constantFrom<SumberTemuan>(
      'aturan',
      'ai',
      'safe_browsing',
      'rdap',
      'virustotal',
      'reality_defender'
    ),
  });
}

export function arbitraryTingkatLevel(): fc.Arbitrary<TingkatLevel> {
  return fc.constantFrom<TingkatLevel>('tinggi', 'sedang', 'tidak_ditemukan');
}

export function arbitraryFormatDataHasil(): fc.Arbitrary<FormatDataHasil> {
  return fc.record({
    halaman: fc.constantFrom<HalamanCek>('chat', 'link', 'video'),
    level: arbitraryTingkatLevel(),
    ringkasan: fc.string({ minLength: 1, maxLength: 200 }),
    temuan: fc.array(arbitraryTemuan(), { minLength: 0, maxLength: 5 }),
    hal_wajar: fc.array(fc.string({ minLength: 1 }), { maxLength: 3 }),
    langkah: fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 5 }),
    situasi_darurat: fc.array(
      fc.constantFrom<SituasiDarurat>(
        'klik_link',
        'isi_data',
        'kirim_otp',
        'transfer',
        'akun_diambil'
      ),
      { maxLength: 5 }
    ),
    batasan: fc.string({ minLength: 1 }),
    pihak_ketiga: fc.array(fc.string({ minLength: 1 })),
    status_layanan: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.constantFrom<StatusLayanan>('ok', 'gagal', 'tidak_dipakai', 'tidak_tersedia'),
      { noNullPrototype: true }
    ),
  });
}
export function arbitraryUrlWithSensitiveParams(): fc.Arbitrary<string> {
  const sensitiveKeys = fc.constantFrom(
    'email',
    'phone',
    'token',
    'session',
    'id',
    'password',
    'otp'
  );

  const sensitiveCasing = (key: string): fc.Arbitrary<string> =>
    fc.constantFrom(
      key.toLowerCase(),
      key.toUpperCase(),
      key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
    );

  const safeParamValue = fc
    .array(
      fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~'.split('')
      ),
      { minLength: 1, maxLength: 20 }
    )
    .map((chars) => chars.join(''));

  const safeKeys = fc.constantFrom(
    'safe',
    'page',
    'ref',
    'lang',
    'category',
    'product_id',
    'user_id',
    'guid',
    'sort'
  );

  const domain = fc.constantFrom(
    'example.com',
    'test.org',
    'demo.net',
    'shopee.co.id',
    'bca.co.id',
    'undian.id'
  );

  const protocol = fc.constantFrom('https://', 'http://', '');
  const path = fc.constantFrom('/path', '/promo/klaim', '/login', '/api/check', '/');
  const hash = fc.constantFrom('', '#section', '#frag');

  return fc
    .tuple(
      protocol,
      domain,
      path,
      fc.array(
        fc.tuple(sensitiveKeys.chain(sensitiveCasing), safeParamValue),
        { minLength: 1, maxLength: 4 }
      ),
      fc.dictionary(safeKeys, safeParamValue, {
        minKeys: 1,
        maxKeys: 3,
        noNullPrototype: true,
      }),
      hash
    )
    .map(([proto, d, p, sensitivePairs, safeDict, h]) => {
      const sp = new URLSearchParams();

      for (const [k, v] of Object.entries(safeDict)) {
        sp.set(k, v);
      }
      for (const [k, v] of sensitivePairs) {
        sp.set(k, v);
      }

      return `${proto}${d}${p}?${sp.toString()}${h}`;
    });
}

export type TipeSensitif = 'hp' | 'rekening' | 'email' | 'otp_pin';

function stringOfChars(
  chars: string[],
  minLength: number,
  maxLength: number
): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...chars), { minLength, maxLength })
    .map((c) => c.join(''));
}

export interface TeksWithSensitifDetail {
  teks: string;
  prefix: string;
  sensitive: string;
  suffix: string;
  tipe: TipeSensitif;
  expected: string;
}

export function arbitraryNomorHp(): fc.Arbitrary<string> {
  const awalan = fc.constantFrom('08', '+628', '628', '0');
  const digitLanjutan = stringOfChars('0123456789'.split(''), 8, 11);

  return fc.tuple(awalan, digitLanjutan).map(([a, d]) => `${a}${d}`);
}

export function arbitraryNomorRekening(): fc.Arbitrary<string> {
  const digitPertama = fc.constantFrom(...'123456789'.split(''));
  const sisaDigit = stringOfChars('0123456789'.split(''), 9, 15);

  return fc.tuple(digitPertama, sisaDigit).map(([p, s]) => `${p}${s}`);
}

export function arbitraryEmail(): fc.Arbitrary<string> {
  const username = fc
    .tuple(
      stringOfChars('abcdefghijklmnopqrstuvwxyz0123456789'.split(''), 3, 10),
      fc.constantFrom('', '.user', '_id', '-cs', '123')
    )
    .map(([u, suf]) => `${u}${suf}`);

  const domain = fc.constantFrom(
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'perusahaan.co.id',
    'bank.id',
    'scam.org'
  );

  return fc.tuple(username, domain).map(([u, d]) => `${u}@${d}`);
}

export function arbitraryOtpPin(): fc.Arbitrary<string> {
  return stringOfChars('0123456789'.split(''), 4, 8);
}

export function arbitraryTeksNonSensitif(): fc.Arbitrary<string> {
  const kataAman = fc.constantFrom(
    'halo', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'kak', 'gan', 'bro', 'sis',
    'tolong', 'bisa', 'kirim', 'pesan', 'ini', 'ke', 'saya', 'terima', 'kasih',
    'kabar', 'baik', 'promo', 'spesial', 'hari', 'ini', 'diskon', 'besar',
    'paket', 'sudah', 'sampai', 'di', 'alamat', 'tujuan', 'mohon', 'cek',
    'info', 'lebih', 'lanjut', 'hubungi', 'layanan', 'pelanggan', 'kami',
    'peringatan', 'waspada', 'penipuan', 'jangan', 'bagikan', 'kepada', 'siapa', 'pun',
    'uang', 'sebesar', 'rupiah', 'telah', 'diterima', 'dengan', 'baik'
  );

  const kataAcak = stringOfChars(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    1,
    8
  );

  const angkaPendek = fc.integer({ min: 1, max: 999 }).map((n) => n.toString());

  const token = fc.oneof(kataAman, kataAcak, angkaPendek);

  return fc
    .array(token, { minLength: 0, maxLength: 5 })
    .map((arr) => arr.join(' '));
}

export function arbitraryPolaSensitif(): fc.Arbitrary<{
  teks: string;
  tipe: TipeSensitif;
}> {
  return fc.oneof(
    arbitraryNomorHp().map((teks) => ({ teks, tipe: 'hp' as const })),
    arbitraryNomorRekening().map((teks) => ({ teks, tipe: 'rekening' as const })),
    arbitraryEmail().map((teks) => ({ teks, tipe: 'email' as const })),
    arbitraryOtpPin().map((teks) => ({ teks, tipe: 'otp_pin' as const }))
  );
}

export function arbitraryTeksWithSensitifDetail(): fc.Arbitrary<TeksWithSensitifDetail> {
  return fc
    .tuple(
      arbitraryTeksNonSensitif(),
      arbitraryPolaSensitif(),
      arbitraryTeksNonSensitif()
    )
    .map(([prefix, { teks: sensitive, tipe }, suffix]) => {
      const p = prefix.trim();
      const s = suffix.trim();
      const prefixStr = p ? `${p} ` : '';
      const suffixStr = s ? ` ${s}` : '';
      const teks = `${prefixStr}${sensitive}${suffixStr}`;
      const expected = `${prefixStr}${SENSOR_PLACEHOLDER}${suffixStr}`;

      return {
        teks,
        prefix: prefixStr,
        sensitive,
        suffix: suffixStr,
        tipe,
        expected,
      };
    });
}

export function arbitraryTeksWithMultipleSensitif(): fc.Arbitrary<{
  teks: string;
  count: number;
  sensitives: string[];
}> {
  return fc
    .array(
      fc.tuple(arbitraryTeksNonSensitif(), arbitraryPolaSensitif()),
      { minLength: 1, maxLength: 4 }
    )
    .chain((parts) =>
      arbitraryTeksNonSensitif().map((trailing) => {
        const sensitives: string[] = [];
        const textParts: string[] = [];

        for (const [nonSens, sens] of parts) {
          const trimmedNonSens = nonSens.trim();
          if (trimmedNonSens) {
            textParts.push(trimmedNonSens);
          }
          textParts.push(sens.teks);
          sensitives.push(sens.teks);
        }

        const trimmedTrailing = trailing.trim();
        if (trimmedTrailing) {
          textParts.push(trimmedTrailing);
        }

        return {
          teks: textParts.join(' '),
          count: sensitives.length,
          sensitives,
        };
      })
    );
}

export function arbitraryTeksWithSensitif(): fc.Arbitrary<string> {
  return fc.oneof(
    arbitraryTeksWithSensitifDetail().map((d) => d.teks),
    arbitraryTeksWithMultipleSensitif().map((m) => m.teks)
  );
}

export function arbitrarySituasiVideo(): fc.Arbitrary<SituasiVideo | null | undefined> {
  return fc.constantFrom<SituasiVideo | null | undefined>(
    'video_call',
    'rekaman',
    'tokoh',
    null,
    undefined
  );
}

export function arbitraryApaDimintaVideo(): fc.Arbitrary<ApaDimintaVideo | undefined> {
  return fc.constantFrom<ApaDimintaVideo | undefined>(
    'otp_pin',
    'transfer',
    'voucher',
    'pulsa',
    'investasi',
    'link_apk',
    'tidak_ada',
    undefined
  );
}

export function arbitraryNomorAkunVideo(): fc.Arbitrary<NomorAkunVideo | undefined> {
  return fc.constantFrom<NomorAkunVideo | undefined>(
    'nomor_baru',
    'akun_tidak_dikenal',
    'nomor_lama_tersimpan',
    'nomor_lama',
    undefined
  );
}

export function arbitrarySiapaTampilVideo(): fc.Arbitrary<SiapaTampilVideo | undefined> {
  return fc.constantFrom<SiapaTampilVideo | undefined>(
    'tokoh_publik',
    'keluarga',
    'atasan',
    'lainnya',
    undefined
  );
}

export const DAFTAR_TANDA_CHECKLIST = [
  'bibir tidak sinkron',
  'kedipan aneh',
  'tepi wajah blur',
  'wajah rusak',
  'cahaya beda',
  'suara datar',
  'jeda janggal',
] as const;

export function arbitraryChecklistVideo(): fc.Arbitrary<string[]> {
  return fc.subarray([...DAFTAR_TANDA_CHECKLIST], { minLength: 0, maxLength: 7 });
}

export function arbitraryWizardAnswers(): fc.Arbitrary<JawabanWizardVideo> {
  return fc
    .record({
      situasi: arbitrarySituasiVideo(),
      apa_diminta: arbitraryApaDimintaVideo(),
      nomor_akun: arbitraryNomorAkunVideo(),
      darurat_desakan: fc.constantFrom<boolean | undefined>(true, false, undefined),
      diminta_rahasiakan: fc.constantFrom<boolean | undefined>(true, false, undefined),
      bisa_telepon_balik: fc.constantFrom<boolean | undefined>(true, false, undefined),
      siapa_tampil: arbitrarySiapaTampilVideo(),
      janji_untung_ajakan: fc.constantFrom<boolean | undefined>(true, false, undefined),
      checklistFormat: fc.constantFrom<'tanda_checklist' | 'checklist' | 'keduanya' | 'kosong'>(
        'tanda_checklist',
        'checklist',
        'keduanya',
        'kosong'
      ),
      checklistItems: arbitraryChecklistVideo(),
      masih_tersambung: fc.constantFrom<boolean | undefined>(true, false, undefined),
      extraData: fc.dictionary(
        fc.constantFrom('catatan', 'waktu_detik', 'asal_kontak', 'keterangan_user'),
        fc.string({ minLength: 1, maxLength: 20 }),
        { maxKeys: 2, noNullPrototype: true }
      ),
    })
    .map(
      ({
        situasi,
        apa_diminta,
        nomor_akun,
        darurat_desakan,
        diminta_rahasiakan,
        bisa_telepon_balik,
        siapa_tampil,
        janji_untung_ajakan,
        checklistFormat,
        checklistItems,
        masih_tersambung,
        extraData,
      }) => {
        const jawaban: JawabanWizardVideo = {};

        if (situasi !== undefined) jawaban.situasi = situasi;
        if (apa_diminta !== undefined) jawaban.apa_diminta = apa_diminta;
        if (nomor_akun !== undefined) jawaban.nomor_akun = nomor_akun;
        if (darurat_desakan !== undefined) jawaban.darurat_desakan = darurat_desakan;
        if (diminta_rahasiakan !== undefined)
          jawaban.diminta_rahasiakan = diminta_rahasiakan;
        if (bisa_telepon_balik !== undefined)
          jawaban.bisa_telepon_balik = bisa_telepon_balik;
        if (siapa_tampil !== undefined) jawaban.siapa_tampil = siapa_tampil;
        if (janji_untung_ajakan !== undefined)
          jawaban.janji_untung_ajakan = janji_untung_ajakan;
        if (masih_tersambung !== undefined)
          jawaban.masih_tersambung = masih_tersambung;

        if (checklistFormat === 'tanda_checklist') {
          jawaban.tanda_checklist = checklistItems;
        } else if (checklistFormat === 'checklist') {
          jawaban.checklist = checklistItems;
        } else if (checklistFormat === 'keduanya') {
          jawaban.tanda_checklist = checklistItems;
          jawaban.checklist = checklistItems;
        }

        for (const [k, v] of Object.entries(extraData)) {
          jawaban[k] = v;
        }

        return jawaban;
      }
    );
}

export function arbitraryNonTriggeringAnswers(): fc.Arbitrary<JawabanWizardVideo> {
  return fc
    .record({
      situasi: fc.constantFrom<SituasiVideo | null | undefined>(
        'video_call',
        'rekaman',
        'tokoh',
        null,
        undefined
      ),
      apa_diminta: fc.constantFrom<ApaDimintaVideo | undefined>('tidak_ada', undefined),
      nomor_akun: fc.constantFrom<NomorAkunVideo | undefined>(
        'nomor_lama_tersimpan',
        'nomor_lama',
        undefined
      ),
      darurat_desakan: fc.constantFrom<boolean | undefined>(false, undefined),
      diminta_rahasiakan: fc.constantFrom<boolean | undefined>(false, undefined),
      bisa_telepon_balik: fc.constantFrom<boolean | undefined>(true, undefined),
      siapa_tampil: fc.constantFrom<SiapaTampilVideo | undefined>(
        'keluarga',
        'atasan',
        'lainnya',
        undefined
      ),
      janji_untung_ajakan: fc.constantFrom<boolean | undefined>(false, undefined),
      masih_tersambung: fc.constantFrom<boolean | undefined>(true, false, undefined),
      emptyChecklist: fc.constantFrom<boolean>(true, false),
      extraField: fc.dictionary(
        fc.constantFrom('keterangan', 'sumber_info', 'platform'),
        fc.string({ minLength: 1, maxLength: 20 }),
        { maxKeys: 2, noNullPrototype: true }
      ),
    })
    .map(
      ({
        situasi,
        apa_diminta,
        nomor_akun,
        darurat_desakan,
        diminta_rahasiakan,
        bisa_telepon_balik,
        siapa_tampil,
        janji_untung_ajakan,
        masih_tersambung,
        emptyChecklist,
        extraField,
      }) => {
        const j: JawabanWizardVideo = {};
        if (situasi !== undefined) j.situasi = situasi;
        if (apa_diminta !== undefined) j.apa_diminta = apa_diminta;
        if (nomor_akun !== undefined) j.nomor_akun = nomor_akun;
        if (darurat_desakan !== undefined) j.darurat_desakan = darurat_desakan;
        if (diminta_rahasiakan !== undefined) j.diminta_rahasiakan = diminta_rahasiakan;
        if (bisa_telepon_balik !== undefined) j.bisa_telepon_balik = bisa_telepon_balik;
        if (siapa_tampil !== undefined) j.siapa_tampil = siapa_tampil;
        if (janji_untung_ajakan !== undefined)
          j.janji_untung_ajakan = janji_untung_ajakan;
        if (masih_tersambung !== undefined) j.masih_tersambung = masih_tersambung;
        if (emptyChecklist) {
          j.tanda_checklist = [];
          j.checklist = [];
        }
        for (const [k, v] of Object.entries(extraField)) {
          j[k] = v;
        }
        return j;
      }
    );
}


// ===== GENERATOR UNTUK TEKS CHAT DAN POLA PENIPUAN CHAT =====

export const FRASE_POLA_CHAT: Record<
  string,
  { bobot: number; langsung_tinggi: boolean; contoh: string[] }
> = {
  minta_otp: {
    bobot: 0,
    langsung_tinggi: true,
    contoh: [
      'mohon sebutkan kode OTP 6 digit yang masuk ke SMS',
      'ketikkan PIN ATM Anda untuk proses verifikasi data',
      'berikan password akun kamu kepada kami',
      'kirimkan kata sandi Anda kepada kami',
      'masukkan 6 digit kode keamanan sekarang',
      'sebutkan kode verifikasi sms rahasia',
    ],
  },
  minta_transfer: {
    bobot: 3,
    langsung_tinggi: false,
    contoh: [
      'tolong transfer uang sebesar seratus ribu rupiah',
      'bisa tolong tf saldo dana ke rekening ini ya',
      'minta tolong belikan pulsa lima puluh ribu ke nomor ini',
      'tolong kirimkan voucher game google play sekarang',
      'bisa bantu top up gopay saya',
      'butuh pulsa darurat ke nomor handphone',
    ],
  },
  biaya_dimuka: {
    bobot: 3,
    langsung_tinggi: false,
    contoh: [
      'kamu perlu membayar biaya pendaftaran peserta baru',
      'ada biaya admin untuk proses pencairan dana',
      'harus deposit dulu sebesar seratus ribu',
      'wajib menyetorkan uang jaminan awal',
      'silakan bayar deposit untuk aktivasi akun',
      'diperlukan biaya administrasi sebelum verifikasi',
    ],
  },
  kirim_apk: {
    bobot: 3,
    langsung_tinggi: false,
    contoh: [
      'silakan unduh berkas undangan.apk untuk info lengkap',
      'berikut adalah file foto paket.apk pesanan Anda',
      'buka berkas surat tilang.apk yang terlampir di pesan',
      'tolong pasang aplikasi pembaruan sistem di HP',
      'unduh file berkas berupa berkas.apk ini',
      'instal aplikasi pengiriman barang ini',
    ],
  },
  desakan_waktu: {
    bobot: 2,
    langsung_tinggi: false,
    contoh: [
      'peringatan akun Anda akan segera diblokir',
      'kesempatan istimewa ini hanya berlaku hari ini saja',
      'batas waktu pengisian hanya 24 jam saja buruan',
      'lakukan segera sebelum terlambat ya',
      'slot terbatas hanya tersisa dalam hitungan menit',
      'proses sekarang juga sebelum akses ditutup',
    ],
  },
  keluarga_ganti_nomor: {
    bobot: 2,
    langsung_tinggi: false,
    contoh: [
      'halo nak ini nomor baru simpan ya',
      'aku baru ganti nomor karena handphone rusak',
      'ini nomor sementara aku kawan',
      'ponsel saya jatuh pecah kemarin ganti nomor',
      'pinjam hp kawan sebentar nomor lama mati',
    ],
  },
  pihak_resmi: {
    bobot: 2,
    langsung_tinggi: false,
    contoh: [
      'kami dari bank pusat melayani nasabah',
      'halo kak saya Budi kurir J&T mengantarkan barang',
      'pemberitahuan panggilan resmi kantor polisi',
      'layanan customer service BPJS Kesehatan menginfokan',
      'kami dari pihak kepolisian menghubungi Anda',
      'hubungi call center bank resmi kami',
    ],
  },
  gaji_besar: {
    bobot: 2,
    langsung_tinggi: false,
    contoh: [
      'tawaran gaji harian jutaan tanpa pengalaman',
      'lowongan kerja dari HP santai dan mudah',
      'pekerjaan ringan tugas like dan review video',
      'komisi langsung cair setiap hari ke tangan Anda',
      'penghasilan tambahan mudah tanpa modal apapun',
      'gaji besar paruh waktu mudah setiap hari',
    ],
  },
  hadiah_undian: {
    bobot: 2,
    langsung_tinggi: false,
    contoh: [
      'selamat anda menjadi pemenang utama',
      'silakan klaim hadiah kejutan spesial Anda',
      'anda terpilih memenangkan gebyar undian tahunan',
      'pemberitahuan pemenang undian berhadiah mobil',
      'klaim bonus reward tunai spesial sekarang',
    ],
  },
  pindah_aplikasi: {
    bobot: 1,
    langsung_tinggi: false,
    contoh: [
      'untuk penjelasan detail lanjut di Telegram ya',
      'silakan pindah ke telegram sekarang kawan',
      'bisa langsung chat WA saya untuk info',
      'silakan hubungi whatsapp admin kami',
      'japri wa saya untuk koordinasi lebih lanjut',
    ],
  },
  ada_link: {
    bobot: 1,
    langsung_tinggi: false,
    contoh: [
      'kunjungi https://portal-informasi-berita.org/survei',
      'buka tautan https://halaman-bantuan-pelanggan.net/baca',
      'akses situs www.portal-layanan-terpadu.co.id/cek',
      'klik alamat https://web-berita-update.com/artikel',
      'silakan lihat http://situs-informasi-publik.id/pengumuman',
    ],
  },
};

export const KALIMAT_CHAT_NETRAL = [
  'Halo selamat siang kak, apa kabar?',
  'Semoga harimu menyenangkan dan berkah selalu.',
  'Apakah ada dokumen lain yang perlu saya siapkan untuk besok?',
  'Nanti kita kabari lagi perkembangannya lewat email.',
  'Terima kasih banyak atas kerjasamanya ya.',
  'Sampai jumpa besok di kantor jam sembilan pagi.',
  'Tolong dikabari kalau berkasnya sudah diterima.',
  'Baik kak, saya akan tunggu kabar selanjutnya.',
  'Semoga acaranya berjalan lancar.',
];

export type PolaChatId = keyof typeof FRASE_POLA_CHAT;

export interface ChatTextDetail {
  teks: string;
  selectedPatternIds: string[];
  expectedScore: number;
  hasLangsungTinggi: boolean;
}

export function arbitraryChatTextDetail(): fc.Arbitrary<ChatTextDetail> {
  const allIds = Object.keys(FRASE_POLA_CHAT);

  return fc
    .tuple(
      fc.subarray(allIds, { minLength: 0, maxLength: allIds.length }),
      fc.subarray(KALIMAT_CHAT_NETRAL, { minLength: 0, maxLength: 3 })
    )
    .chain(([selectedIds, neutralSentences]) => {
      const phraseArbs = selectedIds.map((id) =>
        fc.constantFrom(...FRASE_POLA_CHAT[id].contoh)
      );

      const phraseTuple =
        phraseArbs.length > 0 ? fc.tuple(...phraseArbs) : fc.constant<string[]>([]);

      return phraseTuple.map((phrases) => {
        let expectedScore = 0;
        let hasLangsungTinggi = false;
        for (const id of selectedIds) {
          expectedScore += FRASE_POLA_CHAT[id].bobot;
          if (FRASE_POLA_CHAT[id].langsung_tinggi) {
            hasLangsungTinggi = true;
          }
        }

        const combined = [...phrases, ...neutralSentences];
        const teks = combined.join(' ');

        return {
          teks,
          selectedPatternIds: selectedIds,
          expectedScore,
          hasLangsungTinggi,
        };
      });
    });
}

export function arbitraryChatText(): fc.Arbitrary<string> {
  return fc.oneof(
    arbitraryChatTextDetail().map((d) => d.teks),
    fc.subarray(KALIMAT_CHAT_NETRAL, { minLength: 1, maxLength: 4 }).map((s) => s.join(' ')),
    fc.constant('')
  );
}

export interface BrandVariantSample {
  merek: string;
  domain: string;
}

export function arbitraryBrandVariant(): fc.Arbitrary<BrandVariantSample> {
  const brands = daftarMerekJson.merek || [];

  return fc.constantFrom(...brands).chain((brand) => {
    const baseVariations = [
      brand.nama.toLowerCase(),
      ...(brand.variasi || []).map((v: string) => v.toLowerCase()),
    ];

    return fc.constantFrom(...baseVariations).chain((baseWord) => {
      const charArbs: fc.Arbitrary<string>[] = [];
      for (let i = 0; i < baseWord.length; i++) {
        const char = baseWord[i];
        const lower = char.toLowerCase();
        if (lower === 'o') {
          charArbs.push(fc.constantFrom('o', '0'));
        } else if (lower === 'i') {
          charArbs.push(fc.constantFrom('i', '1'));
        } else if (lower === 'e') {
          charArbs.push(fc.constantFrom('e', '3'));
        } else if (lower === 'a') {
          charArbs.push(fc.constantFrom('a', '4'));
        } else if (lower === 's') {
          charArbs.push(fc.constantFrom('s', '5'));
        } else {
          charArbs.push(fc.constant(char));
        }
      }

      const mutatedArb =
        charArbs.length > 0 ? fc.tuple(...charArbs).map((c) => c.join('')) : fc.constant(baseWord);

      const protoArb = fc.constantFrom('https://', 'http://', '');
      const tldArb = fc.constantFrom('.com', '.co.id', '.id', '.net', '.xyz', '.org', '.info');
      const pathArb = fc.constantFrom('', '/login', '/promo', '/klaim', '/hadiah');

      return fc
        .tuple(mutatedArb, protoArb, tldArb, pathArb, fc.boolean())
        .map(([mutated, proto, tld, path, isBare]) => {
          const useBare = isBare && !baseWord.includes('.');
          const domain = useBare ? mutated : `${proto}${mutated}${tld}${path}`;

          return {
            merek: brand.nama,
            domain,
          };
        });
    });
  });
}

export type SinyalLeksikalUrl =
  | 'merek'
  | 'punycode'
  | 'ip'
  | 'kata_pemicu'
  | 'subdomain'
  | 'tld_berisiko'
  | 'at_atau_panjang';

export interface UrlWithSignals {
  url: string;
  signals: SinyalLeksikalUrl[];
  expectedScore: number;
}

export interface UrlSignalPair {
  before: UrlWithSignals;
  after: UrlWithSignals;
  addedSignal: SinyalLeksikalUrl;
  addedWeight: number;
}

export const BOBOT_SINYAL_LEKSIKAL: Record<SinyalLeksikalUrl, number> = {
  merek: 3,
  punycode: 3,
  ip: 3,
  kata_pemicu: 2,
  subdomain: 2,
  tld_berisiko: 1,
  at_atau_panjang: 1,
};

export const CONTOH_KATA_PEMICU = ['promo', 'login', 'hadiah', 'klaim', 'undian', 'verifikasi'] as const;
export const CONTOH_TLD_BERISIKO = ['xyz', 'top', 'click', 'buzz', 'fit', 'icu', 'sbs'] as const;
export const CONTOH_MEREK_URL = ['sh0pee', 'bc4', 'danaindonesia', 'tokoped1a', 'mandir1', 'bpj5'] as const;
export const CONTOH_DOMAIN_NETRAL = ['portal-berita', 'info-terkini', 'layanan-web', 'situs-artikel'] as const;
export const CONTOH_TLD_NETRAL = ['com', 'net', 'org', 'id'] as const;

export function buildDomainUrlWithSignals(flags: {
  merek: boolean;
  punycode: boolean;
  kata_pemicu: boolean;
  subdomain: boolean;
  tld_berisiko: boolean;
  at_atau_panjang: boolean;
  brandChoice?: string;
  neutralDomainChoice?: string;
  triggerChoice?: string;
  riskyTldChoice?: string;
  neutralTldChoice?: string;
  protoChoice?: string;
}): UrlWithSignals {
  const proto = flags.protoChoice || 'https://';
  const signals: SinyalLeksikalUrl[] = [];
  let expectedScore = 0;

  let subdomainStr = '';
  if (flags.subdomain) {
    signals.push('subdomain');
    expectedScore += 2;
    if (flags.punycode) {
      signals.push('punycode');
      expectedScore += 3;
      subdomainStr = 'a.b.c.xn--auth';
    } else {
      subdomainStr = 'a.b.c.d';
    }
  } else {
    if (flags.punycode) {
      signals.push('punycode');
      expectedScore += 3;
      subdomainStr = 'xn--auth';
    } else {
      subdomainStr = '';
    }
  }

  let domainUtama = '';
  if (flags.merek) {
    signals.push('merek');
    expectedScore += 3;
    domainUtama = flags.brandChoice || CONTOH_MEREK_URL[0];
  } else {
    domainUtama = flags.neutralDomainChoice || CONTOH_DOMAIN_NETRAL[0];
  }

  let tld = '';
  if (flags.tld_berisiko) {
    signals.push('tld_berisiko');
    expectedScore += 1;
    tld = flags.riskyTldChoice || CONTOH_TLD_BERISIKO[0];
  } else {
    tld = flags.neutralTldChoice || CONTOH_TLD_NETRAL[0];
  }

  let path = '';
  if (flags.kata_pemicu) {
    signals.push('kata_pemicu');
    expectedScore += 2;
    path = `/${flags.triggerChoice || CONTOH_KATA_PEMICU[0]}`;
  } else {
    path = '/article/detail';
  }

  let atPart = '';
  if (flags.at_atau_panjang) {
    signals.push('at_atau_panjang');
    expectedScore += 1;
    atPart = 'user@';
  }

  const hostParts = [subdomainStr, domainUtama, tld].filter(Boolean);
  const host = hostParts.join('.');
  const url = `${proto}${atPart}${host}${path}`;

  return {
    url,
    signals,
    expectedScore,
  };
}

export function buildIpUrlWithSignals(flags: {
  kata_pemicu: boolean;
  at_atau_panjang: boolean;
  ipChoice?: string;
  triggerChoice?: string;
  protoChoice?: string;
}): UrlWithSignals {
  const proto = flags.protoChoice || 'http://';
  const ipHost = flags.ipChoice || '192.168.1.1';
  const signals: SinyalLeksikalUrl[] = ['ip'];
  let expectedScore = 3;

  let path = '/';
  if (flags.kata_pemicu) {
    signals.push('kata_pemicu');
    expectedScore += 2;
    path = `/${flags.triggerChoice || CONTOH_KATA_PEMICU[0]}`;
  }

  let atPart = '';
  if (flags.at_atau_panjang) {
    signals.push('at_atau_panjang');
    expectedScore += 1;
    atPart = 'user@';
  }

  const url = `${proto}${atPart}${ipHost}${path}`;

  return {
    url,
    signals,
    expectedScore,
  };
}

export function arbitraryUrlWithSignals(): fc.Arbitrary<UrlWithSignals> {
  const domainArb = fc
    .record({
      merek: fc.boolean(),
      punycode: fc.boolean(),
      kata_pemicu: fc.boolean(),
      subdomain: fc.boolean(),
      tld_berisiko: fc.boolean(),
      at_atau_panjang: fc.boolean(),
      brandChoice: fc.constantFrom(...CONTOH_MEREK_URL),
      neutralDomainChoice: fc.constantFrom(...CONTOH_DOMAIN_NETRAL),
      triggerChoice: fc.constantFrom(...CONTOH_KATA_PEMICU),
      riskyTldChoice: fc.constantFrom(...CONTOH_TLD_BERISIKO),
      neutralTldChoice: fc.constantFrom(...CONTOH_TLD_NETRAL),
      protoChoice: fc.constantFrom('https://', 'http://'),
    })
    .map(buildDomainUrlWithSignals);

  const ipArb = fc
    .record({
      kata_pemicu: fc.boolean(),
      at_atau_panjang: fc.boolean(),
      ipChoice: fc.constantFrom('192.168.1.1', '10.0.0.1', '172.16.0.1'),
      triggerChoice: fc.constantFrom(...CONTOH_KATA_PEMICU),
      protoChoice: fc.constantFrom('http://', 'https://'),
    })
    .map(buildIpUrlWithSignals);

  return fc.oneof(domainArb, ipArb);
}

export function arbitraryUrlSignalPair(): fc.Arbitrary<UrlSignalPair> {
  const DOMAIN_SIGNALS: Array<
    'merek' | 'punycode' | 'kata_pemicu' | 'subdomain' | 'tld_berisiko' | 'at_atau_panjang'
  > = ['merek', 'punycode', 'kata_pemicu', 'subdomain', 'tld_berisiko', 'at_atau_panjang'];

  return fc
    .record({
      flags: fc.record({
        merek: fc.boolean(),
        punycode: fc.boolean(),
        kata_pemicu: fc.boolean(),
        subdomain: fc.boolean(),
        tld_berisiko: fc.boolean(),
        at_atau_panjang: fc.boolean(),
      }),
      brandChoice: fc.constantFrom(...CONTOH_MEREK_URL),
      neutralDomainChoice: fc.constantFrom(...CONTOH_DOMAIN_NETRAL),
      triggerChoice: fc.constantFrom(...CONTOH_KATA_PEMICU),
      riskyTldChoice: fc.constantFrom(...CONTOH_TLD_BERISIKO),
      neutralTldChoice: fc.constantFrom(...CONTOH_TLD_NETRAL),
      protoChoice: fc.constantFrom('https://', 'http://'),
    })
    .chain((config) => {
      const inactiveSignals = DOMAIN_SIGNALS.filter((s) => !config.flags[s]);
      const signalsToPickFrom = inactiveSignals.length > 0 ? inactiveSignals : DOMAIN_SIGNALS;

      return fc.constantFrom(...signalsToPickFrom).map((signalToAdd) => {
        const initialFlags = { ...config.flags };
        initialFlags[signalToAdd] = false;

        const updatedFlags = { ...initialFlags };
        updatedFlags[signalToAdd] = true;

        const before = buildDomainUrlWithSignals({
          ...initialFlags,
          brandChoice: config.brandChoice,
          neutralDomainChoice: config.neutralDomainChoice,
          triggerChoice: config.triggerChoice,
          riskyTldChoice: config.riskyTldChoice,
          neutralTldChoice: config.neutralTldChoice,
          protoChoice: config.protoChoice,
        });

        const after = buildDomainUrlWithSignals({
          ...updatedFlags,
          brandChoice: config.brandChoice,
          neutralDomainChoice: config.neutralDomainChoice,
          triggerChoice: config.triggerChoice,
          riskyTldChoice: config.riskyTldChoice,
          neutralTldChoice: config.neutralTldChoice,
          protoChoice: config.protoChoice,
        });

        return {
          before,
          after,
          addedSignal: signalToAdd,
          addedWeight: BOBOT_SINYAL_LEKSIKAL[signalToAdd],
        };
      });
    });
}
