import React from 'react';
import type { Metadata } from 'next';
import { KartuMenu } from '@/components/shared/KartuMenu';
import { Akordeon, type ItemAkordeon } from '@/components/shared/Akordeon';
import { DemoPemeriksaan } from '@/components/beranda/DemoPemeriksaan';

export const metadata: Metadata = {
  title: 'Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan',
  description:
    'Ragu sama chat, link, atau video call yang kamu terima? Cek dulu di sini tanpa login untuk mengenali indikasi penipuan digital sedini mungkin.',
};

/**
 * Daftar 4 langkah cara pakai aplikasi untuk Panel Panduan (Hero).
 * References: Requirement 2.1
 */
const LANGKAH_CARA_PAKAI = [
  {
    nomor: 1,
    judul: 'Pilih yang mau dicek',
    deskripsi: 'Pilih antara pesan chat, tautan web, atau panggilan video dan suara.',
  },
  {
    nomor: 2,
    judul: 'Tempel isinya atau jawab beberapa pertanyaan',
    deskripsi: 'Tempel teks pesan, URL tautan, atau jawab beberapa pertanyaan panduan singkat.',
  },
  {
    nomor: 3,
    judul: 'Lihat tanda bahaya dan alasannya',
    deskripsi: 'Periksa tingkat kewaspadaan serta temuan indikasi mencurigakan yang terdeteksi.',
  },
  {
    nomor: 4,
    judul: 'Ikuti langkah yang disarankan',
    deskripsi: 'Jalankan panduan pencegahan atau buka langkah darurat jika sudah terlanjur berinteraksi.',
  },
] as const;

/**
 * Daftar item untuk Akordeon "Cara kerja dan batasan" (#cara-kerja).
 * Memuat minimal 3 bagian:
 * 1. Cara penilaian tiap halaman cek (aturan lokal browser, AI Gemini, Safe Browsing, RDAP, skor ambang batas, 3 tingkat kewaspadaan)
 * 2. Batasan deteksi (hal-hal yang tidak bisa dideteksi, tidak menjamin seratus persen, false positive/negative)
 * 3. Data apa yang dikirim ke mana (sensor otomatis di browser, data tanpa login, transparansi pihak ketiga)
 *
 * Seluruh teks mematuhi aturan bebas kata terlarang ("aman", "pasti", "terbukti", "100%") sebagai kesimpulan.
 * References: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 30.1
 */
const CARA_KERJA_ITEMS: ItemAkordeon[] = [
  {
    id: 'cara-penilaian',
    judul: 'Bagaimana cara penilaian di setiap halaman cek?',
    konten: (
      <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          Setiap halaman cek menggunakan kombinasi pemeriksaan bertingkat yang transparan dan dapat diandalkan:
        </p>
        <ul className="space-y-2 list-disc list-inside">
          <li>
            <strong className="text-gray-900">Aturan lokal di browser:</strong> Sistem memeriksa pola teks mencurigakan, struktur URL, atau jawaban kuisioner langsung di browser tanpa menunggu respons server.
          </li>
          <li>
            <strong className="text-gray-900">Analisis AI Gemini:</strong> Untuk pemeriksaan chat dan tangkapan layar, AI menganalisis konteks percakapan untuk mengenali modus manipulasi psikologis serta memberikan penjelasan edukatif.
          </li>
          <li>
            <strong className="text-gray-900">Google Safe Browsing:</strong> Untuk pemeriksaan link, alamat web dicek terhadap basis data ancaman phishing dan situs berbahaya milik Google.
          </li>
          <li>
            <strong className="text-gray-900">Layanan Data Domain (RDAP):</strong> Memeriksa tanggal pendaftaran domain. Domain yang baru didaftarkan (kurang dari 30 hari) memiliki indikasi risiko lebih tinggi.
          </li>
        </ul>
        <div className="pt-2">
          <p className="font-semibold text-gray-900 mb-1">
            Penghitungan skor ambang batas dan 3 tingkat kewaspadaan:
          </p>
          <p className="mb-2">
            Setiap temuan memiliki bobot risiko tertentu. Skor digabungkan untuk menentukan tingkat kewaspadaan tanpa vonis sepihak:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200">
              <span className="font-bold text-red-800 block text-xs">Waspada tinggi</span>
              <span className="text-xs text-red-700">Ditemukan indikasi kuat seperti permintaan OTP/PIN, transfer dana darurat, atau situs berbahaya.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="font-bold text-amber-800 block text-xs">Perlu hati-hati</span>
              <span className="text-xs text-amber-700">Ditemukan indikasi yang perlu dicermati, seperti desakan waktu atau domain baru terdaftar.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
              <span className="font-bold text-gray-800 block text-xs">Tidak ditemukan tanda bahaya</span>
              <span className="text-xs text-gray-700">Tidak terdeteksi pola bahaya yang dikenali sistem pada konten yang dimasukkan.</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'batasan-deteksi',
    judul: 'Apa saja batasan deteksi aplikasi ini?',
    konten: (
      <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          Aplikasi ini dirancang sebagai panduan pertimbangan mandiri, bukan otoritas hukum atau penyidik digital. Ketahui batasannya:
        </p>
        <ul className="space-y-2 list-disc list-inside">
          <li>
            <strong className="text-gray-900">Hal-hal yang tidak bisa dideteksi:</strong> Kami tidak dapat memeriksa saldo atau mutasi rekening bank asli, tidak dapat melacak lokasi fisik pelaku, tidak menyadap sambungan telepon, dan tidak memiliki akses ke database internal penipu.
          </li>
          <li>
            <strong className="text-gray-900">Bukan jaminan mutlak:</strong> Tidak ada teknologi yang menjamin seratus persen bebas risiko. Modus penipuan terus berganti format dan teknik manipulasi baru muncul setiap saat.
          </li>
          <li>
            <strong className="text-gray-900">Kemungkinan positif palsu dan negatif palsu:</strong> Pesan resmi terkadang memiliki kemiripan kata mendesak sehingga terindikasi perlu diwaspadai (positif palsu). Sebaliknya, penipuan modus mutakhir yang belum terdata bisa jadi belum memicu indikator bahaya (negatif palsu).
          </li>
        </ul>
        <p className="text-xs text-gray-500 italic">
          Hasil pemeriksaan membantu kamu menilai situasi secara lebih teliti, bukan sebagai keputusan akhir atau sertifikasi.
        </p>
      </div>
    ),
  },
  {
    id: 'data-dan-privasi',
    judul: 'Data apa yang dikirim ke mana?',
    konten: (
      <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          Privasi dan perlindungan data kamu adalah prinsip mendasar aplikasi ini:
        </p>
        <ul className="space-y-2 list-disc list-inside">
          <li>
            <strong className="text-gray-900">Sensor otomatis di browser:</strong> Sebelum teks dikirim keluar dari browser kamu, sistem secara otomatis mengganti deretan angka sensitif, nomor ponsel Indonesia, nomor rekening bank, dan alamat email dengan placeholder <code className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-xs text-blue-800">[disensor]</code>.
          </li>
          <li>
            <strong className="text-gray-900">Tanpa login dan tanpa penyimpanan data:</strong> Kamu tidak perlu mendaftar atau login. Kami tidak menyimpan isi percakapan, URL tautan, maupun tangkapan layar yang kamu periksa di server kami setelah sesi analisis selesai.
          </li>
          <li>
            <strong className="text-gray-900">Layanan pihak ketiga yang digunakan:</strong>
            <ul className="mt-1 ml-4 space-y-1 list-circle list-inside text-gray-600">
              <li>Google Gemini: Menerima teks atau gambar yang telah disensor untuk analisis konteks bahasa.</li>
              <li>Google Safe Browsing: Menerima URL untuk pemeriksaan reputasi situs web berbahaya.</li>
              <li>Server RDAP: Menerima nama domain untuk melihat tanggal registrasi domain.</li>
            </ul>
          </li>
        </ul>
        <p className="text-xs text-gray-500">
          Keterangan mengenai layanan pihak ketiga yang terlibat selalu dicantumkan secara transparan di setiap formulir sebelum kamu menekan tombol Periksa.
        </p>
      </div>
    ),
  },
];

export default function Home(): React.JSX.Element {
  return (
    <div className="w-full space-y-8 sm:space-y-12">
      {/* =========================================================================
          Bagian 1: Panel Panduan (Hero)
          - Ditampilkan langsung tanpa klik
          - Memuat judul sambutan, tujuan aplikasi, 4 langkah cara pakai, catatan privasi
          - References: Requirements 2.1, 2.2, 2.3, 2.4, 27.1
          ========================================================================= */}
      <section
        data-testid="hero-panduan"
        aria-labelledby="hero-judul"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch"
      >
        <div className="py-2 lg:py-6 flex flex-col justify-center">
          <h1
            id="hero-judul"
            data-testid="hero-judul"
            className="text-obsidian"
          >
            Ragu sama chat, link, atau video call yang kamu terima? Cek dulu di sini.
          </h1>

          <p
            data-testid="hero-tujuan"
            className="mt-5 text-base sm:text-lg text-gray-700 leading-relaxed max-w-[60ch]"
          >
            Bantu kamu mengenali potensi penipuan digital sedini mungkin secara mandiri. Dapatkan penilaian tingkat kewaspadaan, rincian tanda bahaya, dan langkah tindakan yang perlu diambil.
          </p>
        </div>

        <DemoPemeriksaan />
      </section>

      {/* =========================================================================
          Bagian 2: Tiga Kartu Menu Navigasi
          - Tiga kartu menu bertumpuk vertikal dan selebar layar
          - Urutan: Cek Chat, Cek Link, Cek Video & Suara
          - Menggunakan komponen KartuMenu
          - References: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 27.1, 27.2
          ========================================================================= */}
      <section
        data-testid="menu-kartu-container"
        aria-labelledby="menu-heading"
        className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4"
      >
        <h2 id="menu-heading" className="sr-only">
          Pilihan Menu Pengecekan
        </h2>

        {/* Kartu 1: Cek Chat */}
        <KartuMenu
          nomor={1}
          judul="Cek Chat"
          deskripsi="Tempel isi chat atau unggah screenshot. Untuk tawaran kerja, permintaan OTP, atau pesan yang mengaku dari bank."
          href="/cek-chat"
          ikon={
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
        />

        {/* Kartu 2: Cek Link */}
        <KartuMenu
          nomor={2}
          judul="Cek Link"
          deskripsi="Periksa alamat link tanpa membukanya. Untuk link hadiah, verifikasi akun, atau link pendek."
          href="/cek-link"
          ikon={
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          }
        />

        {/* Kartu 3: Cek Video & Suara */}
        <KartuMenu
          nomor={3}
          judul="Cek Video & Suara"
          deskripsi="Jawab beberapa pertanyaan tentang video call, voice note, atau video tokoh yang kamu terima."
          href="/cek-video-suara"
          ikon={
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          }
        />
      </section>

      <section aria-label="Cara pakai dan privasi" className="rounded-2xl bg-limestone p-6 sm:p-10">
        {/* 4 Langkah Cara Pakai */}
        <div>
          <h2 className="text-obsidian">
            Cara pakai
          </h2>
          <div
            data-testid="hero-langkah-list"
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {LANGKAH_CARA_PAKAI.map((langkah) => (
              <div
                key={langkah.nomor}
                data-testid={`hero-langkah-${langkah.nomor}`}
                className="flex items-start gap-3"
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm"
                  aria-hidden="true"
                >
                  {langkah.nomor}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 leading-snug">
                    {langkah.judul}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {langkah.deskripsi}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Catatan Privasi Transparan */}
        <div
          data-testid="hero-catatan-privasi"
          className="mt-8 p-5 rounded-xl bg-sulfur text-obsidian text-sm leading-relaxed flex items-start gap-3"
        >
          <div
            className="p-1.5 shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <span className="font-semibold text-gray-900 block mb-0.5">
              Catatan Privasi:
            </span>
            <p>
              Tanpa login. Kami tidak menyimpan isi yang kamu periksa. Sebagian pengecekan dikirim ke layanan pihak ketiga yang selalu disebutkan sebelum menekan tombol Periksa. Hasil di sini membantu kamu menilai, bukan keputusan akhir.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          Bagian 3: Akordeon "Cara kerja dan batasan"
          - Tautan anchor target: #cara-kerja (terhubung dari Footer)
          - Menjelaskan cara penilaian tiap halaman, batasan deteksi, dan data dikirim ke mana
          - Menggunakan komponen Akordeon
          - References: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 27.1
          ========================================================================= */}
      <section
        id="cara-kerja"
        data-testid="section-cara-kerja"
        aria-labelledby="cara-kerja-heading"
        className="scroll-mt-40 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start"
      >
        <div className="mb-4 sm:mb-6 lg:mb-0">
          <h2
            id="cara-kerja-heading"
            data-testid="cara-kerja-judul"
            className="text-obsidian"
          >
            Cara kerja dan batasan
          </h2>
          <p className="mt-2 text-base text-gray-600 leading-relaxed max-w-[60ch]">
            Pelajari transparansi metode penilaian kami, batas kemampuan deteksi, serta bagaimana privasi data kamu dilindungi.
          </p>
        </div>

        <Akordeon items={CARA_KERJA_ITEMS} allowMultiple={true} />
      </section>
    </div>
  );
}
