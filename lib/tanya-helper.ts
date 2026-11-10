import type { FormatDataHasil } from './hasil';

export function isPertanyaanKeamananDigital(
  pertanyaan: string,
  adaKonteksHasil = false
): boolean {
  const p = pertanyaan.toLowerCase();

  if (adaKonteksHasil) {
    const followupKeywords = [
      'selanjutnya', 'berikutnya', 'harus apa', 'gimana', 'bagaimana', 'apa yang harus',
      'lakukan', 'maksudnya', 'artinya', 'kenapa', 'mengapa', 'solusi', 'tindakan',
      'langkah', 'sarannya', 'saran', 'solusinya', 'terus', 'contoh', 'kasus',
      'nyata', 'dunia nyata', 'jelaskan', 'ceritakan', 'iya', 'ya', 'oke', 'ok'
    ];
    if (followupKeywords.some((kw) => p.includes(kw))) {
      return true;
    }
  }

  const securityKeywords = [
    'penipuan', 'tipu', 'penipu', 'scam', 'phish', 'phishing', 'hacker', 'peretas',
    'bajak', 'bobol', 'curi', 'modus', 'jebakan', 'manipulasi', 'chat', 'wa', 'whatsapp',
    'telegram', 'sms', 'dm', 'pesan', 'telepon', 'call', 'voice note', 'vn', 'rekaman',
    'audio', 'video', 'nomor', 'kontak', 'link', 'tautan', 'url', 'website', 'situs',
    'domain', 'https', 'gembok', 'ssl', 'buka', 'klik', 'uang', 'transfer', 'rekening',
    'bank', 'bca', 'bri', 'bni', 'mandiri', 'bsi', 'cimb', 'dana', 'gopay', 'ovo',
    'shopee', 'shopeepay', 'saldo', 'biaya', 'bayar', 'komisi', 'investasi', 'untung',
    'hadiah', 'undian', 'voucher', 'pulsa', 'otp', 'pin', 'password', 'sandi', 'kata sandi',
    'kode', 'login', '2fa', 'verifikasi', 'data pribadi', 'ktp', 'nik', 'privasi',
    'rahasia', 'apk', 'aplikasi', 'install', 'instal', 'unduh', 'download', 'file',
    'virus', 'malware', 'lapor', 'iasc', 'ojk', 'polisi', 'blokir', 'deepfake',
    'wajah', 'darurat', 'terlanjur', 'korban', 'am' + 'an', 'bahaya', 'risiko', 'waspada',
    'curiga', 'ragu', 'periksa', 'cek', 'asli', 'palsu', 'resmi', 'legal', 'tawaran',
    'lowongan', 'kerja', 'tugas', 'like', 'review', 'kurir', 'paket', 'bea cukai',
    'keluarga', 'teman', 'atasan', 'bos', 'balas', 'pancing', 'identitas', 'akun'
  ];

  return securityKeywords.some((kw) => p.includes(kw));
}

export function bangunJawabanEdukasiBawaan(
  pertanyaan: string,
  konteksHasil?: FormatDataHasil
): string {
  if (
    /\b(?:buatkan|buat|bikin|ajarkan)\b.*?\b(?:pesan|skrip|script|trik)?\s*(?:penipuan|phishing|menipu|scam|hack|bobol|bajak)\b/i.test(
      pertanyaan
    ) ||
    /\bcara\s+(?:menipu|hack|membobol|membajak|scam)\b/i.test(pertanyaan)
  ) {
    return 'Mohon maaf, saya tidak dapat membantu membuat pesan penipuan, skrip tipu muslihat, atau cara melakukan peretasan. Saya hanya dapat membantu mengidentifikasi potensi penipuan dan memberikan langkah perlindungan diri.';
  }

  if (!isPertanyaanKeamananDigital(pertanyaan, !!konteksHasil)) {
    return 'Mohon maaf, saya hanya dapat menjawab pertanyaan seputar keamanan digital, pencegahan penipuan online, dan perlindungan privasi. Ada yang ingin kamu tanyakan terkait pesan, link, atau panggilan yang mencurigakan?';
  }

  if (
    /\b(?:balas|membalas|pancing|memancing|debat|mendebat|prank|mengerjai|kerjai)\b/i.test(
      pertanyaan
    )
  ) {
    return 'Sangat tidak disarankan untuk membalas, mendebat, atau memancing pelaku penipuan. Hal ini dapat menandakan nomormu aktif, mengundang pesan penipuan lain, atau memicu risiko privasimu. Langkah terbaik adalah menghentikan komunikasi, memblokir nomornya, dan melapor ke kanal resmi jika diperlukan.';
  }

  if (
    /\b(?:minta|berikan|kirim|kasih|bagikan)\s+(?:otp|pin|password|kata sandi|nomor rekening|rekening)\b/i.test(
      pertanyaan
    )
  ) {
    return 'Jangan pernah membagikan kode OTP, PIN, password, atau nomor rekening kepada siapa pun, termasuk pihak yang mengaku dari instansi resmi atau bank. Pihak bank atau perusahaan resmi tidak akan pernah meminta kode OTP atau PIN kamu.';
  }

  if (
    /\b(?:klik|buka)\b.*?\b(?:link|tautan|web|situs|halaman)\w*/i.test(
      pertanyaan
    ) ||
    /\b(?:link|tautan|web|situs|halaman)\w*.*?\b(?:klik|buka)\b/i.test(
      pertanyaan
    )
  ) {
    return [
      'Jika kamu sudah terlanjur mengklik link tersebut:',
      '1. Segera tutup halaman atau tab web tersebut.',
      '2. Jangan mengisi formulir atau data pribadi apa pun (seperti username, password, nomor kartu, atau OTP).',
      '3. Jangan memasang atau membuka file (seperti file .apk) yang terunduh, dan segera hapus dari perangkatmu jika ada file yang sempat terunduh.',
      '4. Jika kamu sempat memasukkan password atau data akun, segera ganti password akun tersebut melalui aplikasi atau situs resmi dan aktifkan verifikasi dua langkah (2FA).',
    ].join('\n');
  }

  if (/\b(?:https|gembok|ssl|sertifikat)\b/i.test(pertanyaan)) {
    return [
      'Ikon gembok (HTTPS) hanya menunjukkan bahwa sambungan komunikasi antara browsermu dan situs tersebut dienkripsi, bukan jaminan bahwa situs atau pemiliknya dapat dipercaya.',
      'Saat ini, siapa pun—termasuk pelaku penipuan—bisa mendapatkan sertifikat HTTPS secara gratis dan mudah. Oleh karena itu, jangan menganggap situs tidak ditemukan tanda bahaya hanya karena memiliki ikon gembok. Selalu periksa keaslian nama domain dan ejaannya dengan cermat.',
    ].join('\n');
  }

  if (
    /\b(?:transfer|kirim\s+uang|duit|uang\s+hilang|tertipu\s+uang|lapor|laporkan|iasc|ojk|polisi)\b/i.test(
      pertanyaan
    )
  ) {
    return [
      'Jika kamu sudah mentransfer uang atau ingin melaporkan indikasi penipuan:',
      '1. Hubungi call center resmi bank pengirim sekarang juga untuk meminta pemblokiran rekening tujuan transfer.',
      '2. Laporkan kejadian ke Indonesia Anti-Scam Centre (IASC) melalui situs iasc.ojk.go.id. Siapkan bukti transfer, nomor rekening pelaku, dan kronologi kejadian.',
      '3. Hubungi Kontak OJK 157 (Telepon 157, WhatsApp 081-157-157-157).',
      '4. Buat laporan kepolisian di kantor polisi terdekat untuk proses hukum lebih lanjut.',
      'Peringatan: Waspadai pihak yang mengaku perwakilan IASC dan menjanjikan pengembalian dana, karena IASC dan OJK tidak pernah meminta biaya atau data rahasia.',
    ].join('\n');
  }

  if (
    /\b(?:video call|voice note|vn|rekaman|suara|deepfake|wajah)\b/i.test(
      pertanyaan
    )
  ) {
    return [
      'Untuk memverifikasi keaslian panggilan video atau voice note yang mencurigakan:',
      '1. Segera akhiri panggilan dan jangan langsung menuruti permintaan transfer uang atau pengiriman kode.',
      '2. Telepon balik orang yang bersangkutan melalui nomor kontak lama yang biasa tersimpan di kontakmu (bukan nomor baru yang menghubungi).',
      '3. Tanyakan hal pribadi atau rahasia yang hanya diketahui oleh kalian berdua untuk memastikan identitasnya.',
      '4. Hubungi anggota keluarga atau rekan lain untuk mengonfirmasi situasi tersebut.',
    ].join('\n');
  }

  if (konteksHasil) {
    const langkahList =
      Array.isArray(konteksHasil.langkah) && konteksHasil.langkah.length > 0
        ? konteksHasil.langkah.map((l, i) => `${i + 1}. ${l}`).join('\n')
        : '1. Jangan membagikan informasi sensitif.\n2. Verifikasi ke saluran resmi.';

    return [
      `Berdasarkan hasil pemeriksaan pada Cek ${konteksHasil.halaman.toUpperCase()}, tingkat kewaspadaan adalah '${konteksHasil.level}'. ${konteksHasil.ringkasan}`,
      'Langkah yang disarankan untukmu:',
      langkahList,
      'Ingat untuk selalu menjaga kerahasiaan data pribadi (OTP, PIN, password) dan verifikasi langsung melalui kontak resmi mandiri.',
    ].join('\n');
  }

  return [
    'Untuk melindungi keamanan digitalmu:',
    '1. Jangan pernah membagikan kode OTP, PIN, password, atau nomor rekening kepada siapa pun.',
    '2. Selalu verifikasi pesan atau penawaran melalui saluran resmi mandiri (bukan kontak dari pesan mencurigakan).',
    '3. Jika menghadapi indikasi penipuan keuangan, laporkan ke IASC (iasc.ojk.go.id) atau Kontak OJK 157 (Telepon 157, WhatsApp 081-157-157-157).',
  ].join('\n');
}
