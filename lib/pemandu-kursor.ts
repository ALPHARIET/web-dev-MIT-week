export interface PesanPemandu {
  judul: string;
  pesan: string;
}

const uji = (id: string) => `[data-testid="${id}"]`;
const awalan = (id: string) => `[data-testid^="${id}"]`;

const ATURAN: ReadonlyArray<readonly [string, string, string]> = [
  ['a[href="/cek-chat"]', 'Cek Chat', 'Dapat tawaran kerja, minta OTP, atau ngaku dari bank? Mulai dari sini, tempel isi chatnya.'],
  ['a[href="/cek-link"]', 'Cek Link', 'Dapat link hadiah atau verifikasi akun? Jangan dibuka dulu, periksa alamatnya di sini.'],
  ['a[href="/cek-video-suara"]', 'Cek Video & Suara', 'Video call atau voice note minta uang? Unggah rekamannya biar dicek AI, atau jawab beberapa pertanyaan.'],
  ['a[href="/"]', 'Beranda', 'Balik ke halaman awal untuk memilih pemeriksaan lain.'],
  ['a[href="/#cara-kerja"]', 'Cara kerja', 'Lihat cara penilaiannya, batas kemampuannya, dan data apa yang dikirim ke mana.'],
  ['button[aria-controls="mobile-navigation"]', 'Menu', 'Buka daftar halaman cek.'],

  [uji('hero-judul'), 'Mulai dari sini', 'Pilih salah satu kartu di bawah sesuai yang bikin kamu ragu. Tidak perlu daftar akun.'],
  [uji('hero-tujuan'), 'Hasilnya apa?', 'Kamu dapat tingkat kewaspadaan, alasannya, dan langkah yang perlu diambil.'],
  [awalan('hero-langkah-'), 'Cara pakai', 'Empat langkah ini sama di semua halaman cek, jadi cukup hafal sekali.'],
  [uji('hero-catatan-privasi'), 'Privasi', 'Yang kamu periksa tidak disimpan. Tetap jangan masukkan OTP, PIN, atau password asli.'],
  [uji('section-cara-kerja'), 'Cara kerja', 'Buka tiap pertanyaan untuk tahu cara penilaian dan batasan alat ini.'],

  [uji('demo-tab'), 'Contoh lain', 'Pilih jenis contoh yang mau kamu lihat.'],
  [uji('demo-tanda'), 'Tanda bahaya', 'Tunjuk tiap tanda untuk melihat alasannya di teks.'],
  [uji('demo-pemeriksaan'), 'Contoh fiktif', 'Begini kira-kira alurnya: isi dibaca, tanda bahaya ditandai, lalu keluar hasil dan sarannya.'],

  [`${uji('input-chat-container')} textarea`, 'Isi chat', 'Tempel percakapannya apa adanya. Nomor HP dan rekening disensor otomatis sebelum dikirim.'],
  [`${uji('input-chat-container')} input[type="file"]`, 'Screenshot', 'Tutup dulu nama dan nomor HP di gambarnya kalau bisa.'],
  [uji('input-link'), 'Kolom link', 'Tempel alamat lengkapnya. Link tidak akan dibuka, cuma alamatnya yang diperiksa.'],
  [uji('pratinjau-alamat'), 'Pratinjau', 'Ini alamat yang akan diperiksa, setelah bagian sensitifnya dibuang.'],
  [uji('tombol-periksa'), 'Periksa', 'Sebelum dikirim, cek lagi: jangan ada OTP, PIN, atau password di dalamnya.'],
  [uji('tombol-coba-contoh'), 'Coba contoh', 'Mau lihat cara kerjanya dulu? Ini memakai skenario fiktif, bukan data asli.'],
  [uji('tombol-pilih-dropdown'), 'Pilih skenario', 'Pilih modus penipuan yang mau kamu coba.'],
  [awalan('opsi-skenario-'), 'Skenario fiktif', 'Klik untuk mengisi formulir dengan contoh ini.'],
  [uji('kotak-privasi'), 'Privasi', 'Di sini tertulis layanan luar mana yang menerima data kamu sebelum tombol Periksa ditekan.'],
  [uji('input-tanya-lanjut'), 'Tanya lanjut', 'Tanya soal hasil ini. Jangan tulis data pribadi di sini.'],
  [awalan('btn-pertanyaan-cepat-'), 'Pertanyaan cepat', 'Klik kalau bingung mau tanya apa.'],

  [awalan('kartu-situasi-'), 'Situasi', 'Pilih yang paling mirip dengan kejadian yang kamu alami.'],
  [uji('pertanyaan-siapa-tampil'), 'Siapa yang tampil', 'Wajah dan suara bisa ditiru AI. Kenal sosoknya belum berarti orangnya asli.'],
  [uji('pertanyaan-apa-diminta'), 'Apa yang diminta', 'Permintaan uang, OTP, atau data akun adalah tanda paling penting di sini.'],
  [uji('pertanyaan-janji-untung'), 'Janji untung', 'Tokoh terkenal yang menjanjikan untung tetap adalah pola investasi bodong.'],
  [uji('pertanyaan-nomor-akun'), 'Nomor atau akun', 'Penipu sering beralasan ganti nomor. Coba hubungi nomor lama yang kamu simpan.'],
  [uji('pertanyaan-darurat-desakan'), 'Desakan', 'Situasi darurat dibuat supaya kamu tidak sempat berpikir. Tarik napas dulu.'],
  [uji('pertanyaan-diminta-rahasiakan'), 'Diminta rahasia', 'Disuruh merahasiakan berarti kamu dijauhkan dari orang yang bisa mengecek.'],
  [uji('pertanyaan-bisa-telepon-balik'), 'Telepon balik', 'Tutup, lalu telepon balik ke nomor yang sudah kamu simpan. Penipu biasanya menolak.'],
  [uji('pertanyaan-masih-tersambung'), 'Masih tersambung', 'Kalau masih tersambung, jangan sebut data apa pun sampai selesai memeriksa.'],
  [awalan('item-checklist-'), 'Pengamatan', 'Centang kalau kamu melihatnya. Tidak melihat tanda ini belum berarti videonya asli.'],
  [uji('dropzone-media'), 'Unggah file', 'Pilih video, voice note, atau screenshot video call. Video utuh tidak dikirim, cuma beberapa gambar dan maksimal 60 detik suara.'],
  [uji('konteks-opsional'), 'Konteks', 'Opsional, tapi bikin hasil lebih tepat. Permintaan uang dan desakan waktu adalah tanda paling kuat.'],
  [uji('tombol-periksa-media'), 'Periksa', 'AI mengecek wajah, suara, dan omongannya. Hasilnya perkiraan, bukan vonis.'],
  [uji('tab-mode-kuis'), 'Tanpa rekaman', 'Video call-nya tidak terekam? Jawab pertanyaan soal situasinya saja.'],
  [uji('panel-analisis-media'), 'Hasil AI', 'Makin panjang garisnya, makin besar kemungkinan wajah atau suaranya dibuat AI. AI tetap bisa salah.'],
  [uji('tombol-lanjut'), 'Lanjut', 'Jawabanmu diproses di browser dan tidak dikirim ke mana pun.'],
  [uji('tombol-kembali'), 'Kembali', 'Ubah jawaban di langkah sebelumnya.'],

  ['[data-level="tinggi"]', 'Waspada tinggi', 'Ada tanda kuat. Stop dulu, jangan kirim apa pun sebelum memverifikasi lewat jalur lain.'],
  ['[data-level="sedang"]', 'Perlu hati-hati', 'Ada tanda yang perlu dicek. Baca alasannya sebelum lanjut.'],
  ['[data-level="tidak_ditemukan"]', 'Belum ada tanda', 'Belum ketemu pola yang kami kenali, tapi modus baru bisa saja lolos. Tetap verifikasi.'],
  [uji('sorotan-domainUtama'), 'Domain utama', 'Bagian paling penting dari link. Bandingkan hurufnya dengan situs resminya.'],
  [uji('sorotan-subdomain'), 'Subdomain', 'Nama merek di bagian ini bisa menipu, karena pemilik aslinya ada di domain utama.'],
  [uji('sorotan-tld'), 'Akhiran domain', 'Akhiran yang murah sering dipakai untuk situs sekali pakai.'],
  [uji('sorotan-path'), 'Path', 'Kata seperti hadiah atau verifikasi di sini sering jadi pancingan.'],
  [uji('sorotan-params'), 'Parameter', 'Bagian ini bisa membawa data. Parameter sensitif sudah dibuang sebelum diperiksa.'],
  [uji('sorotan-transkrip'), 'Sorotan', 'Kalimat yang ditandai adalah yang memicu temuan.'],
  [uji('kartu-temuan'), 'Temuan', 'Baca alasannya, supaya lain kali kamu bisa mengenali pola yang sama sendiri.'],
  [uji('blok-hal-wajar'), 'Tampak wajar', 'Bagian yang tampak wajar tidak menghapus tanda bahaya yang lain.'],
  [uji('blok-langkah-disarankan'), 'Langkah', 'Kerjakan dari yang paling atas.'],
  [awalan('tab-situasi-'), 'Sudah terlanjur', 'Pilih yang paling cocok dengan yang sudah terjadi, lalu kerjakan langkahnya berurutan.'],
  [uji('seksi-kanal-lapor'), 'Tempat lapor', 'Makin cepat lapor makin baik. Siapkan bukti transfer dan kronologinya.'],
  [uji('blok-panel-darurat'), 'Sudah terlanjur?', 'Sudah klik, kirim OTP, atau transfer? Buka bagian ini sekarang, waktunya penting.'],
  [uji('blok-batasan-layanan'), 'Batasan', 'Hasil ini bantuan untuk menilai, bukan keputusan akhir.'],
  [uji('tombol-kirim-peringatan'), 'Peringatkan', 'Kirim templat pesan ke keluarga atau teman supaya mereka tidak ikut kena.'],
  [uji('blok-tanya-lanjut'), 'Tanya lanjut', 'Masih bingung soal hasilnya? Tanya di sini.'],
  [uji('tombol-cek-lagi'), 'Cek lagi', 'Hapus hasil ini dan mulai pemeriksaan baru.'],
  [awalan('btn-cross-link-'), 'Periksa juga', 'Chat ini memuat hal yang bisa diperiksa di halaman lain.'],
  [awalan('link-halaman-lain-'), 'Halaman lain', 'Pindah ke jenis pemeriksaan lain.'],

  ['footer', 'Info', 'Aplikasi ini untuk pengguna 18 tahun ke atas dan tidak menyimpan yang kamu periksa.'],
];

export function cariPesan(awal: Element | null): PesanPemandu | null {
  for (let el = awal; el && el !== document.body; el = el.parentElement) {
    for (const [selector, judul, pesan] of ATURAN) {
      if (el.matches(selector)) return { judul, pesan };
    }
  }
  return null;
}

export function salamWaktu(jam: number): string {
  if (jam >= 4 && jam < 11) return 'Selamat pagi';
  if (jam >= 11 && jam < 15) return 'Selamat siang';
  if (jam >= 15 && jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export interface KonteksPemandu {
  pathname: string;
  adaHasil: boolean;
  salam: string | null;
  sentuh: boolean;
  sudahBergerak: boolean;
}

const PETUNJUK_HALAMAN: Record<string, { judul: string; sebelum: string; sesudah: string }> = {
  '/cek-chat': {
    judul: 'Cek Chat',
    sebelum: 'Tempel isi chat atau unggah screenshot, lalu tekan Periksa.',
    sesudah: 'Hasilnya sudah keluar. Baca alasannya dulu, lalu ikuti langkahnya.',
  },
  '/cek-link': {
    judul: 'Cek Link',
    sebelum: 'Tempel alamat link di kolomnya. Link tidak akan dibuka.',
    sesudah: 'Hasilnya sudah keluar. Jangan buka link-nya sebelum baca alasannya.',
  },
  '/cek-video-suara': {
    judul: 'Cek Video & Suara',
    sebelum: 'Unggah video atau voice note-nya, lalu tekan Periksa. Tidak punya rekaman? Pilih tab Jawab pertanyaan.',
    sesudah: 'Hasilnya sudah keluar. Verifikasi lewat nomor yang sudah kamu simpan.',
  },
};

export function pesanBawaan(k: KonteksPemandu): PesanPemandu {
  const halaman = PETUNJUK_HALAMAN[k.pathname];
  if (halaman) {
    return { judul: halaman.judul, pesan: k.adaHasil ? halaman.sesudah : halaman.sebelum };
  }
  const aksi = k.sentuh ? 'Ketuk' : 'Arahkan kursor ke';
  if (k.sudahBergerak) {
    return { judul: 'Pemandu', pesan: `${aksi} bagian lain, nanti aku bantu jelasin.` };
  }
  return {
    judul: 'Halo!',
    pesan: `${k.salam ?? 'Halo'}, selamat datang. ${aksi} bagian mana pun, nanti aku kasih tahu gunanya.`,
  };
}
