import { type HasilAturan } from './scoring';
import {
  type FormatDataHasil,
  type SituasiDarurat,
  type Temuan,
  hitungLevel,
} from '../hasil';

export type SituasiVideo = 'video_call' | 'rekaman' | 'tokoh';

export type ApaDimintaVideo =
  | 'otp_pin'
  | 'transfer'
  | 'investasi'
  | 'link_apk'
  | 'tidak_ada'
  | 'voucher'
  | 'pulsa';

export type NomorAkunVideo =
  | 'nomor_baru'
  | 'akun_tidak_dikenal'
  | 'nomor_lama_tersimpan'
  | 'nomor_lama';

export type SiapaTampilVideo =
  | 'tokoh_publik'
  | 'keluarga'
  | 'atasan'
  | 'lainnya';

export interface JawabanWizardVideo {
  situasi?: SituasiVideo | null;
  apa_diminta?: ApaDimintaVideo | string;
  nomor_akun?: NomorAkunVideo | string;
  darurat_desakan?: boolean;
  diminta_rahasiakan?: boolean;
  bisa_telepon_balik?: boolean;
  siapa_tampil?: SiapaTampilVideo | string;
  janji_untung_ajakan?: boolean;
  tanda_checklist?: string[];
  checklist?: string[];
  masih_tersambung?: boolean;
  [key: string]: unknown;
}

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
  menolak_telepon_balik: 3,
  siapa_tampil_tokoh_publik: 1,
  janji_untung_ajakan: 3,
  per_checklist: 1,
} as const;

export function evaluasiVideo(jawaban: JawabanWizardVideo): HasilAturan {
  let skor = 0;
  const temuan: Temuan[] = [];

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
        bukti: 'Kamu bilang dia minta kode OTP, PIN, atau data akun.',
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
        bukti: 'Kamu bilang dia minta transfer, pulsa, atau voucher.',
        sumber: 'aturan',
      });
    } else if (apaDiminta === 'investasi') {
      temuan.push({
        judul: 'Ajakan investasi atau skema imbal hasil finansial',
        penjelasan:
          'Ajakan menanamkan modal atau trading yang dipromosikan lewat video dengan janji keuntungan cepat patut diwaspadai sebagai penipuan investasi bodong tanpa izin OJK.',
        bukti: 'Kamu bilang dia mengajak investasi atau menjanjikan untung.',
        sumber: 'aturan',
      });
    } else if (apaDiminta === 'link_apk') {
      temuan.push({
        judul: 'Permintaan mengklik link atau menginstal file aplikasi (APK)',
        penjelasan:
          'Ajakan mengunduh file APK atau membuka tautan eksternal melalui pesan video/suara sering kali memuat malware pencuri SMS OTP dan data perbankan.',
        bukti: 'Kamu bilang dia minta klik link atau pasang aplikasi.',
        sumber: 'aturan',
      });
    }
  }

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
        bukti: 'Kamu bilang dia pakai nomor baru dengan alasan ganti nomor.',
        sumber: 'aturan',
      });
    } else if (nomorAkun === 'akun_tidak_dikenal') {
      temuan.push({
        judul: 'Pengirim berasal dari akun media sosial atau kontak tidak dikenal',
        penjelasan:
          'Pesan atau konten video dari akun yang tidak dikenal atau tidak terverifikasi memiliki risiko tinggi sebagai sarana penyebaran deepfake atau penipuan identitas.',
        bukti: 'Kamu bilang dia dari akun atau kontak yang tidak kamu kenal.',
        sumber: 'aturan',
      });
    }
  }

  if (jawaban.darurat_desakan === true) {
    skor += BOBOT_VIDEO.darurat_desakan;
    temuan.push({
      judul: 'Tekanan situasi darurat atau desakan batas waktu',
      penjelasan:
        'Pelaku sengaja menciptakan narasi genting (misalnya kecelakaan, penangkapan polisi, atau batas waktu hitungan menit) agar korban panik dan tidak sempat berpikir rasional atau memverifikasi kebenaran.',
      bukti: 'Kamu bilang dia mengaku darurat atau minta cepat-cepat.',
      sumber: 'aturan',
    });
  }

  if (jawaban.diminta_rahasiakan === true) {
    skor += BOBOT_VIDEO.diminta_rahasiakan;
    temuan.push({
      judul: 'Instruksi untuk merahasiakan pembicaraan dari pihak lain',
      penjelasan:
        'Permintaan agar percakapan dirahasiakan dari keluarga, atasan, atau kerabat dekat adalah taktik isolasi psikologis agar tidak ada orang sekitar yang menyadarkan korban.',
      bukti: 'Kamu bilang dia minta obrolan ini dirahasiakan.',
      sumber: 'aturan',
    });
  }

  if (jawaban.bisa_telepon_balik === false) {
    skor += BOBOT_VIDEO.menolak_telepon_balik;
    temuan.push({
      judul: 'Menolak panggilan telepon balik atau verifikasi langsung',
      penjelasan:
        'Pelaku manipulasi deepfake atau tiruan suara umumnya menolak panggilan balik dua arah dengan alasan kamera rusak, sinyal buruk, atau sedang sibuk karena keterbatasan interaksi spontan secara real-time.',
      bukti: 'Kamu bilang dia menolak ditelepon balik atau beralasan kamera rusak/sinyal jelek.',
      sumber: 'aturan',
    });
  }

  if (jawaban.siapa_tampil === 'tokoh_publik') {
    skor += BOBOT_VIDEO.siapa_tampil_tokoh_publik;
    temuan.push({
      judul: 'Menampilkan figur publik, pejabat, atau artis',
      penjelasan:
        'Pencatutan wajah atau suara tokoh ternama sering digunakan untuk membangun kredibilitas palsu dan menarik perhatian publik dalam skema penipuan massal.',
      bukti: 'Kamu bilang yang tampil adalah tokoh terkenal atau pejabat.',
      sumber: 'aturan',
    });
  }

  if (jawaban.janji_untung_ajakan === true) {
    skor += BOBOT_VIDEO.janji_untung_ajakan;
    temuan.push({
      judul: 'Janji keuntungan pasti atau ajakan masuk ke grup privat (WA/Telegram)',
      penjelasan:
        'Menjanjikan imbal hasil keuntungan tanpa risiko dan mengarahkan korban ke grup obrolan pribadi WhatsApp atau Telegram merupakan ciri khas penipuan investasi bodong.',
      bukti: 'Kamu bilang ada janji untung besar atau ajakan masuk grup WA/Telegram.',
      sumber: 'aturan',
    });
  }

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

  const isMintaUangOtp =
    apaDiminta === 'otp_pin' ||
    apaDiminta === 'transfer' ||
    apaDiminta === 'voucher' ||
    apaDiminta === 'pulsa';

  const isDaruratAtauRahasia = Boolean(
    jawaban.darurat_desakan || jawaban.diminta_rahasiakan
  );

  const kombinasiKhusus1 = isMintaUangOtp && isDaruratAtauRahasia;

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

export const evaluasiAturanVideo = evaluasiVideo;

export function tentukanLangkahVideo(jawaban: JawabanWizardVideo): string[] {
  const langkah: string[] = [];

  if (jawaban.masih_tersambung) {
    langkah.push(
      'Minta lawan bicara menoleh penuh ke samping atau melambaikan tangan di depan wajah untuk menguji keaslian video (catatan: cara ini tidak selalu berhasil mendeteksi deepfake mutakhir).'
    );
  }

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

  if (jawaban.siapa_tampil === 'atasan') {
    langkah.push(
      'Konfirmasikan instruksi lewat jalur resmi kantor atau kampus seperti nomor telepon atau email resmi kantor, bukan kontak dari si pengirim.'
    );
    langkah.push(
      'Temui langsung atasan/dosen bersangkutan atau tanyakan kepada rekan kerja satu divisi sebelum menuruti permintaan.'
    );
  }

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

  return Array.from(new Set(langkah));
}

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

export function generateHasilVideoLokal(
  jawaban: JawabanWizardVideo
): FormatDataHasil {
  const hasilAturan = evaluasiVideo(jawaban);

  let ringkasan: string;
  if (hasilAturan.level === 'tinggi') {
    if (jawaban.situasi === 'tokoh' || jawaban.siapa_tampil === 'tokoh_publik') {
      ringkasan =
        'Ini mirip modus video tokoh terkenal palsu yang mengajak investasi.';
    } else if (jawaban.situasi === 'rekaman') {
      ringkasan =
        'Ini mirip modus tiruan suara orang yang kamu kenal.';
    } else {
      ringkasan =
        'Ini mirip modus video call palsu yang minta uang atau kode rahasia.';
    }
  } else if (hasilAturan.level === 'sedang') {
    ringkasan =
      'Beberapa jawabanmu mirip modus penipuan. Pastikan dulu sebelum lanjut.';
  } else {
    ringkasan =
      'Dari jawabanmu, belum terlihat modus penipuan yang kami kenal. Ini tidak berarti pasti aman; tetap telepon balik orangnya.';
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
