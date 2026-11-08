/**
 * lib/aturan/video-rules.ts
 *
 * Implementasi aturan skor video & suara untuk wizard Cek Video & Suara.
 * Menghitung skor berdasarkan jawaban wizard, mendeteksi kombinasi khusus langsung tinggi,
 * menentukan temuan edukatif, langkah verifikasi per situasi, serta menghasilkan
 * FormatDataHasil lokal secara offline di browser tanpa API call.
 *
 * References: Requirements 22.1-22.4, 23.1-23.3, 24.1-24.4, and design.md
 */

import { type HasilAturan } from './scoring';
import {
  type FormatDataHasil,
  type SituasiDarurat,
  type Temuan,
  hitungLevel,
} from '../hasil';

/**
 * Pilihan situasi pada langkah pertama wizard Video & Suara (Requirement 22.1).
 */
export type SituasiVideo = 'video_call' | 'rekaman' | 'tokoh';

/**
 * Pilihan apa yang diminta oleh lawan bicara/pengirim (Requirement 22.3, 23.1).
 */
export type ApaDimintaVideo =
  | 'otp_pin'
  | 'transfer'
  | 'investasi'
  | 'link_apk'
  | 'tidak_ada'
  | 'voucher'
  | 'pulsa';

/**
 * Pilihan asal nomor atau akun pengirim (Requirement 22.3, 23.1).
 */
export type NomorAkunVideo =
  | 'nomor_baru'
  | 'akun_tidak_dikenal'
  | 'nomor_lama_tersimpan'
  | 'nomor_lama';

/**
 * Pilihan siapa yang tampil pada video/rekaman (Requirement 22.4, 23.1).
 */
export type SiapaTampilVideo =
  | 'tokoh_publik'
  | 'keluarga'
  | 'atasan'
  | 'lainnya';

/**
 * Struktur data jawaban wizard Video & Suara.
 */
export interface JawabanWizardVideo {
  /** Pilihan situasi: video call, rekaman suara/video, atau video tokoh */
  situasi?: SituasiVideo | null;
  /** Apa yang diminta: OTP/PIN (+4), transfer (+3), investasi (+3), link APK (+2), tidak ada (0) */
  apa_diminta?: ApaDimintaVideo | string;
  /** Nomor atau akun asal: nomor baru (+2), akun tidak dikenal (+1), nomor lama (0) */
  nomor_akun?: NomorAkunVideo | string;
  /** Apakah ada keadaan darurat atau desakan waktu (+2 jika true) */
  darurat_desakan?: boolean;
  /** Apakah diminta merahasiakan pembicaraan (+2 jika true) */
  diminta_rahasiakan?: boolean;
  /** Apakah bisa ditelepon balik / menolak (+3 jika false) */
  bisa_telepon_balik?: boolean;
  /** Siapa yang tampil: tokoh publik (+1), keluarga (0), atasan (0), lainnya (0) */
  siapa_tampil?: SiapaTampilVideo | string;
  /** Apakah ada janji untung pasti atau ajakan ke grup WA/Telegram (+3 jika true) */
  janji_untung_ajakan?: boolean;
  /** Daftar tanda kejanggalan visual/audio dari checklist pengamatan (+1 per tanda) */
  tanda_checklist?: string[];
  /** Alias checklist untuk kemudahan penggunaan di UI */
  checklist?: string[];
  /** Apakah saat ini pengguna masih tersambung dengan panggilan (Requirement 24.4) */
  masih_tersambung?: boolean;
  /** Dukungan properti dinamis */
  [key: string]: unknown;
}

/**
 * Nilai bobot skor per jawaban wizard sesuai Requirement 23.1.
 */
export const BOBOT_VIDEO = {
  apa_diminta: {
    otp_pin: 4,
    transfer: 3,
    voucher: 3,
    pulsa: 3,
    investasi: 3,
    link_apk: 2,
    tidak_ada: 0,
  },
  nomor_akun: {
    nomor_baru: 2,
    akun_tidak_dikenal: 1,
    nomor_lama_tersimpan: 0,
    nomor_lama: 0,
  },
  darurat_desakan: 2,
  diminta_rahasiakan: 2,
  menolak_telepon_balik: 3, // saat bisa_telepon_balik === false
  siapa_tampil_tokoh_publik: 1, // saat siapa_tampil === 'tokoh_publik'
  janji_untung_ajakan: 3, // saat janji_untung_ajakan === true
  per_checklist: 1, // per tanda di checklist
} as const;

/**
 * Mengevaluasi jawaban wizard Video & Suara dan menghasilkan HasilAturan.
 *
 * Menerapkan bobot skor aditif (Requirement 23.1) dan dua kombinasi khusus
 * langsung tinggi (Requirement 23.2):
 * 1. (minta uang/transfer/OTP) AND (darurat/desakan ATAU diminta_rahasiakan)
 * 2. (tokoh_publik ATAU situasi === 'tokoh') AND (janji_untung_ajakan ATAU apa_diminta === 'investasi')
 *
 * Ambang batas:
 * - skor >= 6 atau kombinasi khusus -> 'tinggi'
 * - 3 <= skor <= 5 -> 'sedang'
 * - skor < 3 -> 'tidak_ditemukan'
 *
 * @param jawaban Objek jawaban wizard Video & Suara
 * @returns HasilAturan dengan skor, level, temuan, linkDitemukan, dan modusVideoDitemukan
 */
export function evaluasiVideo(jawaban: JawabanWizardVideo): HasilAturan {
  let skor = 0;
  const temuan: Temuan[] = [];

  // 1. Evaluasi apa_diminta
  const apaDiminta = jawaban.apa_diminta;
  if (apaDiminta && apaDiminta in BOBOT_VIDEO.apa_diminta) {
    const bobot =
      BOBOT_VIDEO.apa_diminta[apaDiminta as keyof typeof BOBOT_VIDEO.apa_diminta];
    skor += bobot;

    if (apaDiminta === 'otp_pin') {
      temuan.push({
        judul: 'Permintaan kode OTP, PIN, atau data kredensial akun',
        penjelasan:
          'Pihak resmi tidak pernah meminta kode OTP, PIN, kata sandi, atau data login melalui panggilan video maupun pesan suara. Menyerahkan data ini berisiko pencurian akun dan kerugian dana.',
        bukti: 'Jawaban wizard: Meminta OTP, PIN, atau data kredensial akun (+4)',
        sumber: 'aturan',
      });
    } else if (
      apaDiminta === 'transfer' ||
      apaDiminta === 'voucher' ||
      apaDiminta === 'pulsa'
    ) {
      temuan.push({
        judul: 'Permintaan transfer dana, pulsa, atau pembelian voucher',
        penjelasan:
          'Pelaku penipuan kerap memanfaatkan panggilan video atau pesan rekaman untuk meminta transfer uang atau kode voucher dengan dalih musibah, hutang darurat, atau keperluan mendesak.',
        bukti: `Jawaban wizard: Meminta transfer dana, pulsa, atau voucher (${apaDiminta}) (+3)`,
        sumber: 'aturan',
      });
    } else if (apaDiminta === 'investasi') {
      temuan.push({
        judul: 'Ajakan investasi atau skema imbal hasil finansial',
        penjelasan:
          'Ajakan menanamkan modal atau trading yang dipromosikan lewat video dengan janji keuntungan cepat patut diwaspadai sebagai penipuan investasi bodong tanpa izin OJK.',
        bukti: 'Jawaban wizard: Mengajak investasi atau menjanjikan keuntungan (+3)',
        sumber: 'aturan',
      });
    } else if (apaDiminta === 'link_apk') {
      temuan.push({
        judul: 'Permintaan mengklik link atau menginstal file aplikasi (APK)',
        penjelasan:
          'Ajakan mengunduh file APK atau membuka tautan eksternal melalui pesan video/suara sering kali memuat malware pencuri SMS OTP dan data perbankan.',
        bukti: 'Jawaban wizard: Meminta klik link atau instal aplikasi APK (+2)',
        sumber: 'aturan',
      });
    }
  }

  // 2. Evaluasi nomor_akun
  const nomorAkun = jawaban.nomor_akun;
  if (nomorAkun && nomorAkun in BOBOT_VIDEO.nomor_akun) {
    const bobot =
      BOBOT_VIDEO.nomor_akun[nomorAkun as keyof typeof BOBOT_VIDEO.nomor_akun];
    skor += bobot;

    if (nomorAkun === 'nomor_baru') {
      temuan.push({
        judul: 'Menghubungi menggunakan nomor baru dengan alasan ganti nomor',
        penjelasan:
          'Modus mengaku sebagai keluarga atau teman yang baru ganti nomor bertujuan mengecoh korban agar tidak mengecek ke nomor lama yang tersimpan di kontak.',
        bukti: 'Jawaban wizard: Menggunakan nomor baru dengan dalih ganti nomor (+2)',
        sumber: 'aturan',
      });
    } else if (nomorAkun === 'akun_tidak_dikenal') {
      temuan.push({
        judul: 'Pengirim berasal dari akun media sosial atau kontak tidak dikenal',
        penjelasan:
          'Pesan atau konten video dari akun yang tidak dikenal atau tidak terverifikasi memiliki risiko tinggi sebagai sarana penyebaran deepfake atau penipuan identitas.',
        bukti: 'Jawaban wizard: Berasal dari akun media sosial atau kontak tidak dikenal (+1)',
        sumber: 'aturan',
      });
    }
  }

  // 3. Evaluasi darurat_desakan (+2 jika true)
  if (jawaban.darurat_desakan === true) {
    skor += BOBOT_VIDEO.darurat_desakan;
    temuan.push({
      judul: 'Tekanan situasi darurat atau desakan batas waktu',
      penjelasan:
        'Pelaku sengaja menciptakan narasi genting (misalnya kecelakaan, penangkapan polisi, atau batas waktu hitungan menit) agar korban panik dan tidak sempat berpikir rasional atau memverifikasi kebenaran.',
      bukti: 'Jawaban wizard: Menyatakan situasi darurat atau ada desakan waktu (+2)',
      sumber: 'aturan',
    });
  }

  // 4. Evaluasi diminta_rahasiakan (+2 jika true)
  if (jawaban.diminta_rahasiakan === true) {
    skor += BOBOT_VIDEO.diminta_rahasiakan;
    temuan.push({
      judul: 'Instruksi untuk merahasiakan pembicaraan dari pihak lain',
      penjelasan:
        'Permintaan agar percakapan dirahasiakan dari keluarga, atasan, atau kerabat dekat adalah taktik isolasi psikologis agar tidak ada orang sekitar yang menyadarkan korban.',
      bukti: 'Jawaban wizard: Diminta merahasiakan percakapan dari orang lain (+2)',
      sumber: 'aturan',
    });
  }

  // 5. Evaluasi bisa_telepon_balik (+3 jika false)
  if (jawaban.bisa_telepon_balik === false) {
    skor += BOBOT_VIDEO.menolak_telepon_balik;
    temuan.push({
      judul: 'Menolak panggilan telepon balik atau verifikasi langsung',
      penjelasan:
        'Pelaku manipulasi deepfake atau tiruan suara umumnya menolak panggilan balik dua arah dengan alasan kamera rusak, sinyal buruk, atau sedang sibuk karena keterbatasan interaksi spontan secara real-time.',
      bukti: 'Jawaban wizard: Menolak atau tidak bisa ditelepon balik / kamera rusak / sinyal buruk (+3)',
      sumber: 'aturan',
    });
  }

  // 6. Evaluasi siapa_tampil (+1 jika tokoh_publik)
  if (jawaban.siapa_tampil === 'tokoh_publik') {
    skor += BOBOT_VIDEO.siapa_tampil_tokoh_publik;
    temuan.push({
      judul: 'Menampilkan figur publik, pejabat, atau artis',
      penjelasan:
        'Pencatutan wajah atau suara tokoh ternama sering digunakan untuk membangun kredibilitas palsu dan menarik perhatian publik dalam skema penipuan massal.',
      bukti: 'Jawaban wizard: Menampilkan tokoh publik, pejabat, atau figur terkenal (+1)',
      sumber: 'aturan',
    });
  }

  // 7. Evaluasi janji_untung_ajakan (+3 jika true)
  if (jawaban.janji_untung_ajakan === true) {
    skor += BOBOT_VIDEO.janji_untung_ajakan;
    temuan.push({
      judul: 'Janji keuntungan pasti atau ajakan masuk ke grup privat (WA/Telegram)',
      penjelasan:
        'Menjanjikan imbal hasil keuntungan tanpa risiko dan mengarahkan korban ke grup obrolan pribadi WhatsApp atau Telegram merupakan ciri khas penipuan investasi bodong.',
      bukti: 'Jawaban wizard: Ada janji untung pasti atau ajakan ke grup WA/Telegram (+3)',
      sumber: 'aturan',
    });
  }

  // 8. Evaluasi tanda_checklist (+1 per tanda)
  const checklist = Array.isArray(jawaban.tanda_checklist)
    ? jawaban.tanda_checklist
    : Array.isArray(jawaban.checklist)
    ? jawaban.checklist
    : [];

  if (checklist.length > 0) {
    skor += checklist.length * BOBOT_VIDEO.per_checklist;
    for (const tanda of checklist) {
      temuan.push({
        judul: `Kejanggalan visual atau audio teramati: ${tanda}`,
        penjelasan:
          'Ketidakwajaran fisik pada video atau suara (seperti bibir tidak sinkron, kedipan tidak alami, tepi wajah buram, atau nada suara datar) merupakan indikator fisik video deepfake atau voice cloning.',
        bukti: `Ciri pengamatan terdeteksi: ${tanda} (+1)`,
        sumber: 'aturan',
      });
    }
  }

  // Kombinasi khusus langsung tinggi (Requirement 23.2):
  // 1. (minta uang/transfer/OTP) AND (darurat/desakan ATAU diminta_rahasiakan)
  const isMintaUangOtp =
    apaDiminta === 'otp_pin' ||
    apaDiminta === 'transfer' ||
    apaDiminta === 'voucher' ||
    apaDiminta === 'pulsa';

  const isDaruratAtauRahasia = Boolean(
    jawaban.darurat_desakan || jawaban.diminta_rahasiakan
  );

  const kombinasiKhusus1 = isMintaUangOtp && isDaruratAtauRahasia;

  // 2. (tokoh_publik ATAU situasi === 'tokoh') AND (janji_untung_ajakan ATAU apa_diminta === 'investasi')
  const isTokoh =
    jawaban.siapa_tampil === 'tokoh_publik' || jawaban.situasi === 'tokoh';

  const isUntungAtauInvestasi = Boolean(
    jawaban.janji_untung_ajakan || apaDiminta === 'investasi'
  );

  const kombinasiKhusus2 = isTokoh && isUntungAtauInvestasi;

  const adaLangsungTinggi = Boolean(kombinasiKhusus1 || kombinasiKhusus2);

  const level = hitungLevel(skor, adaLangsungTinggi);

  return {
    skor,
    level,
    temuan,
    linkDitemukan: [],
    modusVideoDitemukan: true,
  };
}

/** Alias untuk evaluasiVideo agar konsisten dengan konvensi penamaan */
export const evaluasiAturanVideo = evaluasiVideo;

/**
 * Menentukan daftar langkah verifikasi tindakan berdasarkan situasi spesifik
 * sesuai Requirement 24.1, 24.2, 24.3, dan 24.4.
 * Selalu menghasilkan minimal 2 langkah tindakan.
 *
 * @param jawaban Objek jawaban wizard Video & Suara
 * @returns Array langkah verifikasi tindakan
 */
export function tentukanLangkahVideo(jawaban: JawabanWizardVideo): string[] {
  const langkah: string[] = [];

  // Requirement 24.4: Jika pengguna masih tersambung dengan panggilan
  if (jawaban.masih_tersambung) {
    langkah.push(
      'Minta lawan bicara menoleh penuh ke samping atau melambaikan tangan di depan wajah untuk menguji keaslian video (catatan: cara ini tidak selalu berhasil mendeteksi deepfake mutakhir).'
    );
  }

  // Tindakan pencegahan berdasarkan jenis permintaan
  if (jawaban.apa_diminta === 'otp_pin') {
    langkah.push(
      'Jangan pernah membagikan kode OTP, PIN, kata sandi, atau data rahasia akun perbankan kepada siapa pun.'
    );
  }
  if (
    jawaban.apa_diminta === 'transfer' ||
    jawaban.apa_diminta === 'voucher' ||
    jawaban.apa_diminta === 'pulsa'
  ) {
    langkah.push(
      'Segera tutup panggilan atau hentikan percakapan dan jangan lakukan transfer dana, isi pulsa, atau pembelian voucher dalam bentuk apa pun.'
    );
  }
  if (jawaban.apa_diminta === 'link_apk') {
    langkah.push(
      'Jangan mengklik tautan atau mengunduh dan memasang file aplikasi .apk dari pengirim pesan.'
    );
  }

  // Requirement 24.1: Situasi keluarga atau teman
  const isKeluargaTeman =
    jawaban.siapa_tampil === 'keluarga' ||
    jawaban.situasi === 'video_call' ||
    jawaban.nomor_akun === 'nomor_baru';

  if (
    isKeluargaTeman &&
    jawaban.siapa_tampil !== 'atasan' &&
    jawaban.siapa_tampil !== 'tokoh_publik'
  ) {
    langkah.push(
      'Tutup panggilan dan telepon balik ke nomor lama yang tersimpan di kontak ponsel kamu, bukan nomor baru yang menghubungi.'
    );
    langkah.push(
      'Tanyakan hal rahasia yang hanya diketahui kalian berdua atau gunakan kode rahasia keluarga untuk memastikan identitas pengirim.'
    );
    langkah.push(
      'Hubungi anggota keluarga atau rekan terdekat lainnya untuk memastikan keberadaan orang yang bersangkutan.'
    );
  }

  // Requirement 24.2: Situasi atasan, dosen, atau instansi
  if (jawaban.siapa_tampil === 'atasan') {
    langkah.push(
      'Konfirmasikan instruksi lewat jalur resmi kantor atau kampus seperti nomor telepon atau email resmi kantor, bukan kontak dari si pengirim.'
    );
    langkah.push(
      'Temui langsung atasan/dosen bersangkutan atau tanyakan kepada rekan kerja satu divisi sebelum menuruti permintaan.'
    );
  }

  // Requirement 24.3: Situasi tokoh publik atau penawaran investasi
  const isTokohPublikAtauInvestasi =
    jawaban.siapa_tampil === 'tokoh_publik' ||
    jawaban.situasi === 'tokoh' ||
    jawaban.apa_diminta === 'investasi' ||
    Boolean(jawaban.janji_untung_ajakan);

  if (isTokohPublikAtauInvestasi) {
    langkah.push(
      'Cek akun media sosial dan situs web resmi terverifikasi milik tokoh tersebut untuk memastikan keaslian video.'
    );
    langkah.push(
      'Cek legalitas entitas penawaran investasi melalui Kontak OJK 157 (telepon 157, WhatsApp 081-157-157-157, atau email konsumen@ojk.go.id).'
    );
    langkah.push(
      'Jangan mengklik tautan yang mengarahkan ke grup privat WhatsApp atau Telegram.'
    );
  }

  // Fallback memastikan minimal 2 langkah tindakan (Requirement 5.4)
  if (langkah.length < 2) {
    langkah.push(
      'Verifikasi identitas pengirim melalui saluran komunikasi mandiri sebelum mengambil tindakan apa pun.'
    );
  }
  if (langkah.length < 2) {
    langkah.push(
      'Jangan membagikan data sensitif atau mengirimkan dana kepada pihak yang identitasnya belum terkonfirmasi.'
    );
  }

  // Hilangkan duplikasi jika ada langkah serupa
  return Array.from(new Set(langkah));
}

/**
 * Mendeteksi situasi darurat yang relevan berdasarkan jawaban wizard
 * untuk pembukaan cepat Panel Darurat.
 *
 * @param jawaban Objek jawaban wizard Video & Suara
 * @returns Array SituasiDarurat yang terdeteksi
 */
export function tentukanSituasiDaruratVideo(
  jawaban: JawabanWizardVideo
): SituasiDarurat[] {
  const situasi = new Set<SituasiDarurat>();

  if (
    jawaban.apa_diminta === 'transfer' ||
    jawaban.apa_diminta === 'voucher' ||
    jawaban.apa_diminta === 'pulsa' ||
    jawaban.apa_diminta === 'investasi'
  ) {
    situasi.add('transfer');
  }

  if (jawaban.apa_diminta === 'otp_pin') {
    situasi.add('kirim_otp');
  }

  if (
    jawaban.apa_diminta === 'link_apk' ||
    jawaban.janji_untung_ajakan === true
  ) {
    situasi.add('klik_link');
  }

  return Array.from(situasi);
}

/**
 * Menghasilkan objek FormatDataHasil lengkap langsung di browser (tanpa API call)
 * berdasarkan evaluasi aturan lokal Video & Suara (Requirement 23.3, 24.1-24.4).
 *
 * @param jawaban Objek jawaban wizard Video & Suara
 * @returns FormatDataHasil yang sesuai dengan kontrak data bersama
 */
export function generateHasilVideoLokal(
  jawaban: JawabanWizardVideo
): FormatDataHasil {
  const hasilAturan = evaluasiVideo(jawaban);

  let ringkasan: string;
  if (hasilAturan.level === 'tinggi') {
    if (jawaban.situasi === 'tokoh' || jawaban.siapa_tampil === 'tokoh_publik') {
      ringkasan =
        'Ada beberapa tanda kuat yang mirip pola penipuan manipulasi video figur publik untuk promosi investasi atau penipuan. Jangan lanjutkan sebelum memverifikasi.';
    } else if (jawaban.situasi === 'rekaman') {
      ringkasan =
        'Ada beberapa tanda kuat yang mirip pola penipuan tiruan suara atau pesan rekaman. Jangan lanjutkan sebelum memverifikasi.';
    } else {
      ringkasan =
        'Ada beberapa tanda kuat yang mirip pola penipuan panggilan video rekayasa sosial atau manipulasi AI. Jangan lanjutkan sebelum memverifikasi.';
    }
  } else if (hasilAturan.level === 'sedang') {
    ringkasan =
      'Ada beberapa indikasi yang perlu kamu periksa dan verifikasi lebih dulu sebelum melanjutkan interaksi.';
  } else {
    ringkasan =
      'Kami tidak menemukan tanda bahaya yang kuat dari jawaban yang kamu berikan. Ini tidak berarti pasti aman; tetap lakukan verifikasi langsung.';
  }

  const hal_wajar: string[] = [];
  if (jawaban.situasi === 'video_call') {
    hal_wajar.push(
      'Wajah sekilas terlihat mirip kerabat karena teknologi manipulasi video dapat memanfaatkan foto atau video asli.'
    );
  } else if (jawaban.situasi === 'rekaman') {
    hal_wajar.push(
      'Karakteristik nada suara dan gaya bicara terdengar meyakinkan karena teknologi kloning suara dapat meniru intonasi.'
    );
  } else if (
    jawaban.situasi === 'tokoh' ||
    jawaban.siapa_tampil === 'tokoh_publik'
  ) {
    hal_wajar.push(
      'Kualitas rekaman video tampak rapi karena menggunakan potongan siaran berita atau podcast resmi yang disunting.'
    );
  }

  const langkah = tentukanLangkahVideo(jawaban);
  const situasi_darurat = tentukanSituasiDaruratVideo(jawaban);

  return {
    halaman: 'video',
    level: hasilAturan.level,
    ringkasan,
    temuan: hasilAturan.temuan,
    hal_wajar,
    langkah,
    situasi_darurat,
    batasan:
      'Penilaian dilakukan berdasarkan aturan konteks situasi komunikasi tanpa memproses data video di server, berfungsi penuh di peramban.',
    pihak_ketiga: [],
    status_layanan: {
      ai: 'tidak_dipakai',
    },
  };
}
