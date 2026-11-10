import {
  type Aturan,
  type HasilAturan,
  evaluasiAturan,
  ekstrakUrl,
} from './scoring';
import {
  type FormatDataHasil,
  type SituasiDarurat,
} from '../hasil';

const POLA_MINTA_UANG_OTP =
  /\b(?:otp|pin|password|kata\s*sandi|passcode|transfer|tf|kirim\s*(?:uang|dana|saldo|pulsa|voucher)|top\s*up|(?:beli(?:kan)?|isi(?:kan)?|minta)?\s*pulsa|pulsa|voucher|biaya\s*(?:admin|pendaftaran)|deposit)\b/i;

const POLA_DESAKAN =
  /\b(?:segera|hari\s*ini\s*(?:juga|saja|terakhir)|(?:1x|2x)?24\s*jam|sekarang\s*juga|buruan|batas\s*waktu|slot\s*terbatas|penting\s*banget(?:\s*sekarang)?|di(?:blokir|tutup|nonaktifkan)|terancam\s*di(?:blokir|tutup)|hitungan\s*menit|sebelum\s*terlambat|akan\s*hangus|hangus\s*dalam)\b/i;

const POLA_MERAHASIAKAN =
  /\b(?:rahasia|merahasiakan|jangan\s*(?:beritahu|kasih\s*tahu|bilang|cerita)|diam[- ]diam|tutup\s*mulut|jangan\s*sampai\s*ada\s*yang\s*tahu)\b/i;

export const ATURAN_CHAT: Aturan[] = [
  {
    id: 'minta_otp',
    bobot: 0,
    langsung_tinggi: true,
    judul: 'Permintaan kode OTP, PIN, atau kata sandi',
    penjelasan:
      'Pihak resmi seperti bank, aplikasi pesan, atau penyedia layanan tidak pernah meminta kode OTP, PIN, password, atau kode verifikasi kepada pengguna. Menyerahkan kode ini berisiko mengakibatkan pengambilalihan akun atau kerugian dana.',
    pola: /\b(?:otp|pin|password|kata\s*sandi|passcode|pass\s*code|kode\s*(?:verifikasi|keamanan|rahasia|sms|token|\d+\s*digit)|(?:6|\d+)\s*digit\s*(?:kode|otp|sms))\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'kode OTP atau PIN'),
  },

  {
    id: 'minta_transfer',
    bobot: 3,
    langsung_tinggi: false,
    judul: 'Permintaan transfer uang, pulsa, atau voucher',
    penjelasan:
      'Permintaan pengiriman dana, pengisian pulsa, atau pembelian voucher dari pihak yang belum diverifikasi sering kali merupakan indikasi penipuan. Jangan pernah melakukan transfer ke rekening perorangan atau pihak asing.',
    pola: /\b(?:transfer(?:\s*(?:uang|dana|saldo|ke|dulu|sekarang|biaya|rp))?|tf(?:\s*(?:uang|dana|saldo|ke))?|kirim(?:\s*kan)?\s*(?:uang|dana|saldo|pulsa|voucher)|top\s*up(?:\s*(?:saldo|dana|gopay|ovo|shopeepay))?|(?:beli(?:kan)?|isi(?:kan)?|minta|butuh)\s*(?:pulsa|voucher)|voucher\s*(?:game|belanja|google\s*play|steam|token|elektronik|\d+)|pulsa|(?:saldo|topup)\s*(?:dana|ovo|gopay|shopeepay|rek))\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'permintaan transfer'),
  },

  {
    id: 'biaya_dimuka',
    bobot: 3,
    langsung_tinggi: false,
    judul: 'Permintaan biaya di muka atau deposit',
    penjelasan:
      'Pemberi kerja resmi, penyelenggara undian, atau instansi tidak memungut biaya pendaftaran, deposit, biaya admin, atau uang jaminan di muka. Modus ini meminta uang awal dengan iming-iming imbalan atau pencairan yang tidak kunjung datang.',
    pola: /\b(?:biaya\s*(?:admin(?:istrasi)?|pendaftaran|registrasi|aktivasi(?:\s*akun)?|pencairan|materai|asuransi|ongkir|penanganan)|deposit(?:\s*(?:dulu|awal|saldo|dana))?|uang\s*(?:muka|jaminan|registrasi|pendaftaran|deposit)|bayar\s*(?:deposit|admin|pendaftaran))\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'biaya di muka'),
  },

  {
    id: 'kirim_apk',
    bobot: 3,
    langsung_tinggi: false,
    judul: 'Pengiriman atau ajakan memasang file aplikasi (APK)',
    penjelasan:
      'Pengiriman file berformat .apk melalui pesan singkat sering kali memuat malware atau trojan pencuri SMS/OTP. Memasang aplikasi dari luar toko resmi berisiko membahayakan data perbankan dan privasi perangkat.',
    pola: /(?:\.apk\b|undangan.*\.apk|foto.*paket.*\.apk|paket.*\.apk|surat.*tilang.*\.apk|\b(?:kirim|instal|install|pasang|unduh|download)\s*(?:file|berkas|aplikasi)?\s*(?:berupa\s*)?(?:\.apk|apk)\b|\b(?:unduh|download|instal|install|pasang)\s+aplikasi\b)/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'file aplikasi APK'),
  },

  {
    id: 'desakan_waktu',
    bobot: 2,
    langsung_tinggi: false,
    judul: 'Desakan waktu dan ancaman mendesak',
    penjelasan:
      'Pelaku sengaja menciptakan batas waktu sempit atau ancaman akun diblokir agar korban panik, tergesa-gesa, dan tidak sempat memverifikasi kebenaran informasi.',
    pola: /\b(?:segera|hari\s*ini\s*(?:juga|saja|terakhir)|(?:1x|2x)?24\s*jam|sekarang\s*juga|buruan|batas\s*waktu|slot\s*terbatas|penting\s*banget(?:\s*sekarang)?|di(?:blokir|tutup|nonaktifkan)|terancam\s*di(?:blokir|tutup)|hitungan\s*menit|sebelum\s*terlambat|akan\s*hangus|hangus\s*dalam)\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'desakan waktu'),
  },

  {
    id: 'keluarga_ganti_nomor',
    bobot: 2,
    langsung_tinggi: false,
    judul: 'Mengaku sebagai keluarga atau kerabat yang ganti nomor',
    penjelasan:
      'Pelaku mengaku sebagai anggota keluarga dekat dengan dalih baru ganti nomor atau meminjam ponsel teman untuk menghindari kecurigaan bahwa nomornya tidak tersimpan di daftar kontak.',
    pola: /\b(?:ini\s*nomor\s*baru|ganti\s*nomor|nomor\s*(?:baru|sementara)|(?:hp|ponsel|handphone)(?:-nya)?\s*(?:rusak|hilang|jatuh|pecah|mati)|pinjam\s*(?:hp|ponsel|handphone|nomor)\s*(?:teman|kawan))\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'mengaku keluarga ganti nomor'),
  },

  {
    id: 'pihak_resmi',
    bobot: 2,
    langsung_tinggi: false,
    judul: 'Mengaku sebagai pihak resmi atau institusi',
    penjelasan:
      'Pelaku mencatut nama institusi terpercaya (bank, layanan kurir ekspedisi, kepolisian, atau instansi pemerintah) untuk membangun kredibilitas palsu dan memperdaya penerima pesan.',
    pola: /\b(?:dari\s*bank|cs(?:\s*(?:bank|resmi|pusat))?|customer\s*service|kurir(?:\s*(?:j&t|jne|sicepat|pos|shopee|lazada|paket|ekspedisi))?|pihak\s*(?:kepolisian|polisi|resmi|berwenang|bank)|kantor\s*(?:polisi|pajak)|polisi|bpjs(?:\s*(?:kesehatan|ketenagakerjaan))?|halo\s*bca|call\s*center\s*(?:bank|resmi)?|ditjen\s*pajak)\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'mengaku pihak resmi'),
  },

  {
    id: 'gaji_besar',
    bobot: 2,
    langsung_tinggi: false,
    judul: 'Penawaran gaji besar atau komisi tanpa syarat',
    penjelasan:
      'Penawaran penghasilan tinggi untuk tugas yang sangat ringan (seperti like video atau review produk) tanpa memerlukan kualifikasi adalah ciri khas penipuan lowongan kerja paruh waktu (task scam).',
    pola: /\b(?:gaji\s*(?:harian|besar|jutaan)|tanpa\s*(?:pengalaman|syarat|modal)|kerja\s*(?:dari\s*(?:hp|rumah)|sampingan\s*mudah|paruh\s*waktu\s*mudah|online\s*mudah)|like\s*(?:dan|&)\s*review|komisi\s*(?:harian|langsung\s*cair|setiap\s*hari)|tugas\s*(?:like|follow|review)|penghasilan\s*tambahan\s*mudah)\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'tawaran gaji besar'),
  },

  {
    id: 'hadiah_undian',
    bobot: 2,
    langsung_tinggi: false,
    judul: 'Pemberitahuan hadiah atau kemenangan undian',
    penjelasan:
      'Kabar kemenangan undian yang tidak pernah diikuti sering kali digunakan untuk memikat korban agar mau membayar biaya pencairan, pajak hadiah palsu, atau memberikan data pribadi.',
    pola: /\b(?:selamat\s*(?:anda|kamu)|pemenang(?:\s*(?:undian|hadiah|resmi))?|klaim\s*(?:hadiah|bonus|reward|saldo)|anda\s*terpilih|memenangkan\s*(?:hadiah|undian|uang)|gebyar\s*undian|hadiah\s*(?:uang|tunai|mobil|spesial)|undian\s*berhadiah)\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'pemberitahuan hadiah atau undian'),
  },

  {
    id: 'pindah_aplikasi',
    bobot: 1,
    langsung_tinggi: false,
    judul: 'Ajakan mengalihkan percakapan ke aplikasi lain',
    penjelasan:
      'Pelaku kerap mengarahkan percakapan dari platform umum ke aplikasi perpesanan seperti Telegram atau WhatsApp pribadi agar percakapan terhindar dari pengawasan sistem keamanan platform asal.',
    pola: /\b(?:lanjut(?:\s*(?:di|ke))\s*telegram|pindah(?:\s*ke)?\s*telegram|chat\s*(?:wa|whatsapp|telegram)(?:\s*(?:saya|ke|admin))?|hubungi\s*(?:wa|whatsapp|telegram)|(?:wa|whatsapp|telegram)\s*admin|japri\s*(?:wa|telegram)|chat\s*ke\s*wa)\b/i,
    buktiExtractor: (_input, match) => (match ? match[0] : 'ajakan pindah aplikasi'),
  },

  {
    id: 'ada_link',
    bobot: 1,
    langsung_tinggi: false,
    judul: 'Tautan (link) di dalam pesan',
    penjelasan:
      'Pesan mencurigakan sering kali menyertakan tautan untuk mengarahkan korban ke situs web phishing, formulir pencurian data, atau file unduhan berbahaya. Kamu dapat memeriksa link ini di Cek Link.',
    pola: /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`]+|(?:bit\.ly|t\.me|wa\.me)\/[^\s<>"'{}|\\^`]+/i,
    buktiExtractor: (input, match) => {
      const urls = ekstrakUrl(input);
      return urls[0] || (match ? match[0] : 'tautan dalam pesan');
    },
  },
];

export function evaluasiChat(teks: string): HasilAturan {
  const hasil = evaluasiAturan(teks, ATURAN_CHAT);

  const aturanMap = new Map(ATURAN_CHAT.map((a) => [a.judul, a.id]));
  const idsCocok = new Set(
    hasil.temuan.map((t) => aturanMap.get(t.judul)).filter(Boolean)
  );

  const adaMintaUangOtp =
    idsCocok.has('minta_otp') ||
    idsCocok.has('minta_transfer') ||
    idsCocok.has('biaya_dimuka') ||
    (typeof teks === 'string' && POLA_MINTA_UANG_OTP.test(teks));

  const adaDesakanWaktu =
    idsCocok.has('desakan_waktu') ||
    (typeof teks === 'string' && POLA_DESAKAN.test(teks));

  const adaMerahasiakan =
    typeof teks === 'string' && POLA_MERAHASIAKAN.test(teks);

  if (adaMintaUangOtp && (adaDesakanWaktu || adaMerahasiakan)) {
    hasil.level = 'tinggi';
  }

  return hasil;
}

export const evaluasiAturanChat = evaluasiChat;

function tentukanLangkahChat(hasil: HasilAturan): string[] {
  const langkah: string[] = [];
  const aturanMap = new Map(ATURAN_CHAT.map((a) => [a.judul, a.id]));
  const idsCocok = new Set(
    hasil.temuan.map((t) => aturanMap.get(t.judul)).filter(Boolean)
  );

  if (hasil.level === 'tinggi') {
    if (idsCocok.has('minta_otp')) {
      langkah.push(
        'Jangan pernah membagikan kode OTP, PIN, atau kata sandi kepada siapa pun, termasuk pihak yang mengaku petugas resmi.'
      );
    }
    if (
      idsCocok.has('minta_transfer') ||
      idsCocok.has('biaya_dimuka')
    ) {
      langkah.push(
        'Jangan mentransfer dana atau membayar deposit dalam jumlah berapa pun ke rekening perorangan atau pihak tidak dikenal.'
      );
    }
    if (idsCocok.has('kirim_apk')) {
      langkah.push(
        'Jangan mengunduh atau memasang file .apk dari pesan ini karena berisiko memuat malware pencuri data.'
      );
    }
    if (hasil.linkDitemukan.length > 0 || idsCocok.has('ada_link')) {
      langkah.push(
        'Jangan mengklik tautan di dalam pesan; periksa alamat link tersebut di menu Cek Link terlebih dahulu.'
      );
    }
    if (idsCocok.has('keluarga_ganti_nomor')) {
      langkah.push(
        'Hubungi nomor lama kontak keluarga kamu secara langsung atau tanyakan hal rahasia keluarga untuk memastikan identitas pengirim.'
      );
    }
    if (idsCocok.has('pihak_resmi')) {
      langkah.push(
        'Konfirmasikan langsung ke kontak atau call center resmi instansi bersangkutan melalui saluran mandiri.'
      );
    }

    if (langkah.length < 2) {
      langkah.push(
        'Tutup percakapan dan jangan menuruti instruksi atau permintaan apa pun dari pesan tersebut.'
      );
    }
    if (langkah.length < 2) {
      langkah.push(
        'Blokir kontak pengirim dan laporkan pesan melalui fitur laporkan spam atau penipuan di aplikasi pesan kamu.'
      );
    }
  } else if (hasil.level === 'sedang') {
    if (hasil.linkDitemukan.length > 0 || idsCocok.has('ada_link')) {
      langkah.push(
        'Periksa alamat tautan menggunakan fitur Cek Link sebelum memutuskan untuk membukanya.'
      );
    }
    langkah.push(
      'Verifikasi identitas pengirim melalui saluran komunikasi resmi lain sebelum mengambil tindakan.'
    );
    langkah.push(
      'Jangan terburu-buru menuruti permintaan pengirim sebelum memastikan kebenarannya.'
    );
  } else {
    langkah.push(
      'Tetap waspada dan jangan mudah membagikan informasi rahasia kepada pihak mana pun.'
    );
    langkah.push(
      'Selalu verifikasi transaksi atau informasi penting melalui kanal resmi.'
    );
  }

  return langkah;
}

export function tentukanSituasiDaruratChat(
  teks: string,
  hasil: HasilAturan
): SituasiDarurat[] {
  const situasi = new Set<SituasiDarurat>();
  const teksLower = (teks || '').toLowerCase();
  const aturanMap = new Map(ATURAN_CHAT.map((a) => [a.judul, a.id]));
  const idsCocok = new Set(
    hasil.temuan.map((t) => aturanMap.get(t.judul)).filter(Boolean)
  );

  if (
    idsCocok.has('minta_transfer') ||
    idsCocok.has('biaya_dimuka') ||
    /\b(?:sudah|udah|sempat|terlanjur)\s*(?:transfer|tf|kirim\s*(?:uang|dana)|bayar)\b/i.test(
      teksLower
    )
  ) {
    situasi.add('transfer');
  }

  if (
    idsCocok.has('minta_otp') ||
    /\b(?:sudah|udah|sempat|terlanjur)\s*(?:kasih|kirim|berikan|masukkan)?\s*otp\b/i.test(
      teksLower
    )
  ) {
    situasi.add('kirim_otp');
  }

  if (
    hasil.linkDitemukan.length > 0 ||
    idsCocok.has('ada_link') ||
    idsCocok.has('kirim_apk') ||
    /\b(?:sudah|udah|sempat|terlanjur)\s*(?:klik|buka|download|unduh|instal|install|pasang)\b/i.test(
      teksLower
    )
  ) {
    situasi.add('klik_link');
  }

  if (
    /\b(?:sudah|udah|sempat|terlanjur)\s*(?:isi|masukkan|input)\s*(?:data|password|sandi|form|formulir)\b/i.test(
      teksLower
    )
  ) {
    situasi.add('isi_data');
  }

  if (
    /\b(?:akun|wa|whatsapp|telegram|ig|instagram)\s*(?:diambil|dibajak|dikuasai|tidak\s*bisa\s*login|keluar\s*sendiri)\b/i.test(
      teksLower
    )
  ) {
    situasi.add('akun_diambil');
  }

  return Array.from(situasi);
}

export function generateHasilChatLokal(teks: string): FormatDataHasil {
  const hasilAturan = evaluasiChat(teks);

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

  const langkah = tentukanLangkahChat(hasilAturan);
  const situasiDarurat = tentukanSituasiDaruratChat(teks, hasilAturan);

  return {
    halaman: 'chat',
    level: hasilAturan.level,
    ringkasan,
    temuan: hasilAturan.temuan,
    hal_wajar: [],
    langkah,
    situasi_darurat: situasiDarurat,
    batasan:
      'Hasil analisis ini merupakan pra-pemindaian cepat berbasis aturan pola teks di browser, bukan keputusan hukum atau jaminan mutlak.',
    pihak_ketiga: [],
    status_layanan: {
      ai: 'tidak_dipakai',
    },
  };
}
