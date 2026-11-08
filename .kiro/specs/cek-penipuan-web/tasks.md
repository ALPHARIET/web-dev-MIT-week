# Implementation Plan: Aplikasi Web Cek Penipuan

## Overview

Implementasi aplikasi web tanpa login untuk membantu anak muda Indonesia memeriksa chat, link, dan video/suara yang mencurigakan. Dibangun dengan Next.js 14+ App Router, TypeScript strict mode, dan Tailwind CSS, di-deploy ke Vercel. Pendekatan build mengikuti urutan: fondasi bersama → logika aturan → komponen UI → halaman → API backend → integrasi & testing → fitur P1.

## Tasks

- [x] 1. Fondasi proyek dan tipe data bersama
  - [x] 1.1 Inisialisasi proyek Next.js 14+ App Router dengan TypeScript strict mode dan Tailwind CSS
    - Jalankan `npx create-next-app@latest` dengan opsi TypeScript, Tailwind, App Router, dan ESLint
    - Konfigurasi `tsconfig.json` dengan `strict: true`
    - Konfigurasi `tailwind.config.ts` dengan tema warna untuk tiga tingkat kewaspadaan (merah, oranye, abu-abu)
    - Buat file `.env.local` dengan placeholder untuk `GEMINI_API_KEY`, `SAFE_BROWSING_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
    - _Requirements: 33.1, 33.2_

  - [x] 1.2 Buat tipe data `FormatDataHasil` dan fungsi penggabungan level di `lib/hasil.ts`
    - Definisikan tipe `TingkatLevel`, `HalamanCek`, `SumberTemuan`, `StatusLayanan`, `SituasiDarurat`
    - Definisikan interface `Temuan` dan `FormatDataHasil` sesuai desain
    - Implementasikan fungsi `hitungLevel(skor: number, adaLangsungTinggi: boolean): TingkatLevel` dengan ambang batas 6 (tinggi), 3-5 (sedang), <3 (tidak_ditemukan)
    - Implementasikan fungsi `gabungLevel(a: TingkatLevel, b: TingkatLevel): TingkatLevel` yang selalu mengambil level tertinggi
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x]* 1.3 Tulis property test untuk round-trip serialisasi FormatDataHasil
    - **Property 1: Round-trip serialisasi FormatDataHasil**
    - Buat custom generator `arbitraryFormatDataHasil()` dan `arbitraryTemuan()` di `test/arbitraries/index.ts`
    - Verifikasi bahwa `JSON.parse(JSON.stringify(hasil))` menghasilkan objek setara untuk semua input valid
    - Minimum 100 iterasi
    - **Validates: Requirements 5.5, 32.5**

  - [x]* 1.4 Tulis property test untuk monotonisitas level dan determinisme skor
    - **Property 2: Monotonisitas level — AI tidak pernah menurunkan**
    - Verifikasi `gabungLevel(a, b) >= a` untuk semua pasangan level valid
    - **Property 3: Determinisme penghitungan skor → level**
    - Verifikasi `hitungLevel` menghasilkan output deterministik dan sesuai ambang batas
    - Minimum 100 iterasi per properti
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 14.4, 20.2**

  - [x] 1.5 Buat file data bersama
    - Buat `data/langkah-darurat.json` dengan 5 situasi darurat (klik_link, isi_data, kirim_otp, transfer, akun_diambil), langkah per situasi, kanal lapor (IASC, OJK 157, bank, platform), dan peringatan
    - Buat `data/merek.json` dengan daftar merek Indonesia (BCA, BRI, BNI, Mandiri, BSI, DANA, OVO, GoPay, Shopee, Tokopedia, BPJS, JNE, J&T, Pos Indonesia) beserta variasi dan kategori
    - Buat `data/tld-berisiko.json` dengan daftar TLD yang sering disalahgunakan
    - _Requirements: 7.3, 7.4, 19.2, 19.8, 33.3, 33.4_

  - [x] 1.6 Buat data skenario contoh fiktif di `data/contoh/`
    - Buat `data/contoh/chat-contoh.json` dengan 3 skenario: tawaran kerja like & review, permintaan OTP dari kurir, pesan mengaku keluarga ganti nomor
    - Buat `data/contoh/link-contoh.json` dengan contoh URL fiktif + respons simulasi Safe Browsing dan RDAP
    - Buat `data/contoh/video-contoh.json` dengan 3 skenario: video call kakak minta transfer, voice note atasan minta voucher, video tokoh promosi investasi
    - Pastikan domain contoh fiktif tidak terdaftar aktif
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 21.1, 21.2, 33.5_

  - [x] 1.7 Buat `data/system-prompt.ts` untuk system prompt Gemini
    - Tulis system prompt dalam bahasa Indonesia sederhana dengan sapaan "kamu"
    - Atur larangan: tanpa vonis, tanpa kata terlarang ("aman", "pasti", "terbukti", "100%"), tanpa minta data pribadi, tanpa saran membalas pelaku, tolak topik di luar keamanan digital
    - Atur format keluaran JSON sesuai skema FormatDataHasil
    - Masukkan konten dari `langkah-darurat.json` agar kanal lapor konsisten antara AI dan UI
    - _Requirements: 14.2, 30.1, 30.2_

- [x] 2. Logika aturan dan utilitas bersama (isomorphic)
  - [x] 2.1 Implementasikan `lib/aturan/scoring.ts` — logika penghitungan skor dan ambang batas
    - Definisikan interface `Aturan` dengan id, pola, bobot, langsung_tinggi, judul, penjelasan, buktiExtractor
    - Definisikan interface `HasilAturan` dengan skor, level, temuan, linkDitemukan, modusVideoDitemukan
    - Implementasikan konstanta `AMBANG_TINGGI = 6` dan `AMBANG_SEDANG = 3`
    - Implementasikan fungsi `evaluasiAturan(input, daftarAturan): HasilAturan`
    - Pastikan kode murni TypeScript tanpa dependensi browser atau server
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 33.1_

  - [x] 2.2 Implementasikan `lib/aturan/chat-rules.ts` — aturan pra-pemindaian chat
    - Implementasikan 11 pola deteksi: permintaan OTP/PIN/password (langsung tinggi), transfer/pulsa/voucher (+3), biaya di muka (+3), file APK (+3), desakan waktu (+2), keluarga ganti nomor (+2), pihak resmi (+2), gaji besar (+2), hadiah/undian (+2), pindah aplikasi (+1), link dalam pesan (+1)
    - Setiap aturan memiliki teks penjelasan bawaan (fallback)
    - Deteksi link dalam teks dan simpan di `linkDitemukan`
    - Deteksi modus video call/voice note dan set `modusVideoDitemukan`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 16.4_

  - [x]* 2.3 Tulis property test untuk skor aturan chat aditif dan deterministik
    - **Property 4: Skor aturan chat aditif dan deterministik**
    - Buat generator `arbitraryChatText()` yang menghasilkan teks acak dengan 0-N pola
    - Verifikasi skor = jumlah bobot pola yang cocok, dan dua evaluasi identik untuk input sama
    - Minimum 100 iterasi
    - **Validates: Requirements 13.2**

  - [x] 2.4 Implementasikan `lib/aturan/link-rules.ts` — aturan analisis leksikal URL
    - Implementasikan deteksi: nama mirip merek Indonesia dengan substitusi karakter (+3), domain berumur <30 hari via RDAP (+3), Punycode/xn-- (+3), alamat IP (+3), kata pemicu di domain/path (+2), >3 subdomain atau merek di subdomain (+2), TLD berisiko (+1), pemendek link (+1), karakter @ atau URL >200 char (+1)
    - Muat daftar merek dari `data/merek.json` dan TLD dari `data/tld-berisiko.json`
    - Setiap aturan memiliki teks penjelasan bawaan
    - Safe Browsing match = langsung tinggi
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11_

  - [x]* 2.5 Tulis property test untuk deteksi merek dan skor leksikal URL
    - **Property 8: Deteksi kemiripan merek mencakup substitusi karakter**
    - Buat generator `arbitraryBrandVariant()` dan verifikasi semua variasi terdeteksi dengan skor +3
    - **Property 11: Deteksi pola leksikal URL bersifat aditif**
    - Buat generator `arbitraryUrlWithSignals()` dan verifikasi skor = jumlah bobot sinyal
    - Minimum 100 iterasi per properti
    - **Validates: Requirements 19.2, 19.4, 19.5, 19.6, 19.8, 19.10**

  - [x] 2.6 Implementasikan `lib/aturan/video-rules.ts` — aturan skor video & suara
    - Implementasikan bobot per jawaban wizard: OTP/PIN/data akun (+4), transfer/pulsa/voucher (+3), investasi/janji untung (+3), menolak ditelepon balik (+3), tokoh publik + janji untung + link WA/Telegram (+3), klik link/instal (+2), nomor baru ganti nomor (+2), darurat/desakan (+2), diminta rahasiakan (+2), akun medsos tidak dikenal (+1), tokoh publik (+1), setiap tanda checklist (+1)
    - Implementasikan kombinasi khusus langsung tinggi: (minta uang/OTP + darurat/rahasia) atau (tokoh publik + janji untung)
    - Generate `FormatDataHasil` langsung di browser tanpa API
    - _Requirements: 23.1, 23.2, 23.3_

  - [x]* 2.7 Tulis property test untuk skor aturan video & suara
    - **Property 5: Skor aturan video & suara sesuai bobot jawaban**
    - Buat generator `arbitraryWizardAnswers()` untuk kombinasi jawaban wizard
    - Verifikasi skor = jumlah bobot jawaban pemicu, jawaban non-pemicu tidak mengubah skor
    - Minimum 100 iterasi
    - **Validates: Requirements 23.1**

  - [x] 2.8 Implementasikan `lib/sensor.ts` — sensor otomatis teks
    - Implementasikan fungsi `sensorTeks(teks: string): { hasil: string; jumlahDiganti: number }`
    - Regex: nomor HP Indonesia `(+?62|0)\d{8,12}`, deretan 4-8 angka `\b\d{4,8}\b`, email `[\w.-]+@[\w.-]+\.\w+`, nomor rekening 10-16 digit `\b\d{10,16}\b`
    - Semua diganti dengan `[disensor]`
    - Pastikan berjalan di browser tanpa mengirim data ke server
    - _Requirements: 12.1, 12.4_

  - [x]* 2.9 Tulis property test untuk sensor otomatis
    - **Property 6: Sensor otomatis mengganti semua pola sensitif**
    - Buat generator `arbitraryTeksWithSensitif()` yang menyuntikkan pola sensitif ke teks acak
    - Verifikasi semua pola diganti `[disensor]` dan teks non-sensitif tidak berubah
    - Minimum 100 iterasi
    - **Validates: Requirements 12.1**

  - [x] 2.10 Implementasikan `lib/sanitasi-url.ts` — parsing dan sanitasi URL
    - Implementasikan `parseUrl(input: string): UrlParsed` yang mengurai URL menjadi protokol, subdomain, domainUtama, tld, path, params
    - Implementasikan `sanitasiParams(parsed: UrlParsed): UrlParsed` yang membuang parameter sensitif: email, phone, token, session, id, password, otp
    - Parameter non-sensitif harus tetap utuh
    - _Requirements: 17.3, 17.4_

  - [x]* 2.11 Tulis property test untuk sanitasi URL
    - **Property 7: Sanitasi URL membuang parameter sensitif**
    - Buat generator `arbitraryUrlWithSensitiveParams()` dengan parameter sensitif
    - Verifikasi URL bersih tidak mengandung parameter sensitif dan parameter non-sensitif utuh
    - Minimum 100 iterasi
    - **Validates: Requirements 17.4**

  - [x] 2.12 Implementasikan `lib/aturan/index.ts` — ekspor semua aturan
    - Re-export semua fungsi dari chat-rules, link-rules, video-rules, dan scoring
    - Pastikan semua modul bisa di-import oleh browser dan server
    - _Requirements: 33.1_

  - [x]* 2.13 Tulis property test untuk kata terlarang dan struktur minimum hasil
    - **Property 9: Kata terlarang tidak pernah muncul sebagai kesimpulan**
    - Verifikasi field ringkasan, temuan[].penjelasan, dan langkah[] tidak mengandung "aman", "pasti", "terbukti", "100%" sebagai kesimpulan
    - **Property 10: Hasil aturan lokal selalu memenuhi struktur minimum**
    - Verifikasi setiap hasil memiliki level valid, minimal 1 temuan jika level > tidak_ditemukan, dan minimal 2 langkah
    - Minimum 100 iterasi per properti
    - **Validates: Requirements 2.4, 5.2, 5.3, 5.4, 6.7, 29.4, 30.1, 30.3**

- [x] 3. Checkpoint — Pastikan semua test aturan dan utilitas lolos
  - Jalankan semua unit test dan property test untuk `lib/`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Layout, header, footer, dan komponen UI bersama
  - [x] 4.1 Implementasikan `app/layout.tsx` — root layout dengan Header dan Footer
    - Buat root layout Next.js dengan metadata (judul, deskripsi)
    - Import dan render Header dan Footer
    - Konfigurasi font dan styling dasar dengan Tailwind
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 4.2 Implementasikan `components/layout/Header.tsx` — navigasi bersama
    - Tampilkan nama aplikasi dan tiga tautan: Cek Chat, Cek Link, Cek Video & Suara
    - Tandai halaman aktif dengan style berbeda menggunakan `usePathname()`
    - Responsive: hamburger menu di mobile ≤640px
    - Target sentuh minimal 44px
    - _Requirements: 1.1, 1.2, 1.5, 27.2_

  - [x] 4.3 Implementasikan `components/layout/Footer.tsx`
    - Tautan ke bagian "Cara kerja dan batasan" di Beranda
    - Catatan "untuk pengguna 18 tahun ke atas"
    - Daftar layanan pihak ketiga
    - _Requirements: 1.3_

  - [x] 4.4 Implementasikan `components/hasil/TingkatKewaspadaan.tsx`
    - Render label + ikon + kalimat pembuka sesuai level
    - Tinggi: "Waspada tinggi" merah + ikon peringatan + kalimat "Ada beberapa tanda kuat..."
    - Sedang: "Perlu hati-hati" oranye + ikon + kalimat "Ada tanda yang perlu kamu cek..."
    - Tidak ditemukan: "Tidak ditemukan tanda bahaya" abu-abu + ikon + kalimat "Kami tidak menemukan..."
    - Bedakan level dengan teks label dan ikon, bukan hanya warna
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.7_

  - [x] 4.5 Implementasikan `components/hasil/KartuTemuan.tsx`
    - Render satu temuan dengan judul, penjelasan, bukti (kutipan), dan sumber
    - Tampilkan badge sumber (aturan, ai, safe_browsing, rdap, dll.)
    - _Requirements: 6.6_

  - [x] 4.6 Implementasikan `components/hasil/LangkahDisarankan.tsx`
    - Render daftar langkah yang disarankan (minimal 2)
    - Format sebagai numbered list yang jelas
    - _Requirements: 5.4_

  - [x] 4.7 Implementasikan `components/hasil/PanelDarurat.tsx` — panel "Sudah terlanjur?"
    - Render 5 situasi yang bisa dipilih: klik link, isi data, kirim OTP, transfer, akun diambil alih
    - Saat situasi dipilih, tampilkan checklist langkah darurat dari `data/langkah-darurat.json`
    - Tampilkan kanal lapor: IASC, OJK 157, bank, platform
    - Tampilkan peringatan tentang pihak yang mengaku IASC
    - Dukung `autoOpen` yang membuka panel di posisi teratas
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.8 Implementasikan `components/hasil/KomponenHasil.tsx` — komponen hasil bersama
    - Terima props `FormatDataHasil`, `halamanLain`, `onCekLagi`, dan `crossLinks`
    - Render dalam urutan: (1) TingkatKewaspadaan + ringkasan, (2) Yang perlu diwaspadai (KartuTemuan[]), (3) Yang tampak wajar, (4) LangkahDisarankan, (5) PanelDarurat, (6) Batasan + pihak ketiga, (7) Tombol "Cek lagi" + tautan halaman lain
    - Jika situasi_darurat terdeteksi, autoOpen PanelDarurat
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 34.4_

  - [x] 4.9 Implementasikan `components/shared/KotakPrivasi.tsx`
    - Tampilkan peringatan "jangan masukkan OTP, PIN, password, atau nomor rekening asli"
    - Tampilkan daftar layanan pihak ketiga per halaman
    - Cek Chat: sebutkan Google Gemini
    - Cek Link: sebutkan Google Safe Browsing dan layanan data domain
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 4.10 Implementasikan `components/shared/Akordeon.tsx` — komponen akordeon reusable
    - Buka/tutup dengan klik judul
    - Accessible dengan keyboard dan ARIA attributes
    - _Requirements: 4.5_

  - [x] 4.11 Implementasikan `components/shared/KartuMenu.tsx` — kartu menu Beranda
    - Render kartu dengan judul, deskripsi, dan link ke halaman cek
    - Full-width, stackable vertikal
    - Target sentuh minimal 44px
    - _Requirements: 3.1, 3.2_

  - [x] 4.12 Implementasikan `components/input/TombolContoh.tsx` — tombol "Coba contoh"
    - Muat data contoh dari `data/contoh/`
    - Callback `onContohDipilih` dengan data contoh yang dipilih
    - Tampilkan beberapa pilihan contoh (dropdown atau daftar)
    - _Requirements: 9.1, 9.5_

  - [x] 4.13 Implementasikan `components/PratinjauSensor.tsx` — modal pratinjau teks tersensor
    - Tampilkan teks yang sudah disensor sebelum dikirim
    - Tombol "Kirim" dan "Batal"
    - Highlight bagian yang disensor
    - _Requirements: 12.2_

- [x] 5. Checkpoint — Pastikan semua komponen UI render dengan benar
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Halaman Beranda
  - [x] 6.1 Implementasikan `app/page.tsx` — halaman Beranda
    - Panel panduan (hero) dengan judul sambutan, tujuan, 4 langkah cara pakai, catatan privasi
    - Tampilkan langsung tanpa klik
    - Tiga kartu menu bertumpuk vertikal: Cek Chat, Cek Link, Cek Video & Suara
    - Akordeon "Cara kerja dan batasan" di bawah kartu
    - Tidak memakai kata "aman", "pasti", "terbukti", "100%" sebagai janji hasil
    - Layout rapi di 360px hingga desktop
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 27.1_

- [x] 7. Halaman Cek Chat — frontend
  - [x] 7.1 Implementasikan `components/input/InputChat.tsx` — input chat
    - Dua tab: "Tempel teks" dan "Unggah screenshot"
    - Validasi: teks maks 4.000 karakter, screenshot maks 5 gambar (JPG/PNG/WebP)
    - Kolom konteks opsional
    - Cek tipe file dari isinya (magic bytes) di browser
    - Tombol Periksa disabled jika input kosong
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6, 11.7_

  - [x] 7.2 Implementasikan `lib/image-utils.ts` — kompresi gambar di browser
    - Fungsi yang mengecilkan gambar ke lebar maks 1.600 px, format JPEG
    - Pastikan total kiriman di bawah 4 MB
    - _Requirements: 11.4_

  - [x] 7.3 Implementasikan halaman `app/cek-chat/page.tsx`
    - Render KotakPrivasi dengan pemberitahuan Google Gemini
    - Render InputChat dan TombolContoh
    - Alur: input → sensor otomatis → pratinjau → pra-pemindaian aturan → kirim ke API → render KomponenHasil
    - Pengingat untuk screenshot: potong/tutup data sensitif
    - Cross-link: tombol "Cek link ini" jika link ditemukan di chat, tautan ke Cek Video & Suara jika modus video terdeteksi
    - Tombol "Cek lagi" mengosongkan input, hasil, dan riwayat
    - URL dari chat dikirim ke Cek Link via state aplikasi (bukan query string)
    - Fallback: jika API gagal, tampilkan hasil aturan + "analisis AI sedang tidak tersedia" + tombol coba lagi, input dipertahankan
    - _Requirements: 8.4, 8.6, 12.2, 12.3, 13.1, 13.5, 15.1, 15.2, 15.3, 16.1, 16.2, 16.3, 16.4, 34.1, 34.2, 34.3, 35.1, 35.2, 35.3_

- [x] 8. Halaman Cek Link — frontend
  - [x] 8.1 Implementasikan `components/input/InputLink.tsx` — input URL
    - Satu kolom input untuk URL atau domain, maks 2.000 karakter
    - Link ditampilkan sebagai teks biasa, tidak pernah bisa diklik
    - Validasi input tidak kosong
    - _Requirements: 17.1, 17.2_

  - [x] 8.2 Implementasikan halaman `app/cek-link/page.tsx`
    - Render KotakPrivasi dengan pemberitahuan Safe Browsing dan layanan data domain
    - Render InputLink dan TombolContoh
    - Alur: input → analisis leksikal di browser → kirim ke API → render KomponenHasil
    - Tampilkan status tiap sumber di hasil (Safe Browsing, RDAP, dll.)
    - Tampilkan atribusi "Advisory provided by Google" dengan tautan ke Safe Browsing Advisory
    - Tampilkan keterangan kemungkinan false positive dan false negative
    - Contoh fiktif menggunakan respons simulasi, tidak memakan kuota API
    - Link contoh sebagai teks biasa tidak bisa diklik
    - Terima URL dari Cek Chat via state aplikasi
    - _Requirements: 8.5, 8.6, 17.2, 17.5, 18.4, 20.4, 20.5, 21.1, 21.2, 21.3_

- [x] 9. Halaman Cek Video & Suara — frontend
  - [x] 9.1 Implementasikan `components/input/WizardVideoSuara.tsx` — wizard 4 langkah
    - Langkah 1: tiga kartu pilihan situasi (video call, rekaman, video tokoh)
    - Langkah 2: 5-7 pertanyaan pilihan ganda yang berbeda per situasi
    - Pertanyaan wajib: apa yang diminta, nomor/akun asal, darurat/desakan, diminta rahasiakan, bisa ditelepon balik
    - Pertanyaan khusus video tokoh: siapa yang tampil, ada janji untung/ajakan WA/Telegram
    - Langkah 3: checklist pengamatan (P1, opsional di MVP)
    - Langkah 4: hasil muncul langsung
    - Hitung skor aturan di browser dan generate FormatDataHasil tanpa API
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 23.1, 23.2, 23.3_

  - [x] 9.2 Implementasikan halaman `app/cek-video-suara/page.tsx`
    - Render KotakPrivasi (tanpa pemberitahuan pihak ketiga untuk P0)
    - Render WizardVideoSuara dan TombolContoh
    - Langkah verifikasi sesuai situasi: keluarga/teman, atasan/instansi, tokoh publik, masih tersambung
    - Hasil tampil < 1 detik (tanpa API call)
    - Tombol "Cek lagi" mengosongkan wizard
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 28.1_

- [x] 10. Checkpoint — Pastikan semua halaman frontend render dan alur berjalan
  - Pastikan navigasi antar halaman berfungsi
  - Pastikan aturan lokal berjalan di browser untuk ketiga halaman cek
  - Pastikan layout rapi di 360px
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Backend API — rate limiting dan utilitas
  - [x] 11.1 Implementasikan `lib/rate-limit.ts` — konfigurasi Upstash rate limiter
    - Konfigurasi Upstash Redis client dari environment variables
    - Buat rate limiter per menit (10 req/menit) dan per hari (100 req/hari)
    - Prefix per halaman untuk isolasi counter
    - _Requirements: 25.2_

  - [x] 11.2 Implementasikan `middleware.ts` — edge middleware rate limiting
    - Periksa rate limit di Edge Middleware sebelum request mencapai Route Handler
    - Kembalikan `429 Too Many Requests` + `Retry-After` header jika batas terlampaui
    - Fail-open jika Upstash Redis tidak tersedia (lanjutkan request)
    - _Requirements: 25.2, 25.3_

  - [x] 11.3 Implementasikan `lib/gemini.ts` — helper pemanggilan Gemini API
    - Gunakan `@google/genai` SDK
    - Fungsi `analyzeChat(input, config): Promise<FormatDataHasil | null>` dengan timeout 20 detik
    - Fungsi `explainLink(diagnostik, config): Promise<FormatDataHasil | null>` dengan timeout 10 detik
    - Return `null` jika gagal (caller gunakan fallback)
    - Validasi JSON output, filter kata terlarang dari respons
    - API key dari environment variable, tidak pernah di frontend
    - _Requirements: 14.1, 14.5, 25.1, 30.2, 30.3_

  - [x] 11.4 Implementasikan `lib/safe-browsing.ts` — helper Google Safe Browsing API
    - Fungsi `checkUrl(url: string): Promise<SafeBrowsingResult>` via HTTP POST
    - Kirim threat types: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE, POTENTIALLY_HARMFUL_APPLICATION
    - Timeout 5 detik
    - API key dari environment variable
    - _Requirements: 18.1, 18.2, 25.1_

  - [x] 11.5 Implementasikan `lib/rdap.ts` — helper pengecekan umur domain
    - Fungsi `queryDomainAge(domain: string): Promise<RdapResult>`
    - Query ke `https://rdap.org/domain/{domain}`, parse event `registration`
    - Jika TLD tidak mendukung RDAP, return `{ tersedia: false }`
    - Timeout 5 detik
    - _Requirements: 18.1, 18.2, 19.3, 19.11_

- [x] 12. Backend API — endpoint Cek Chat
  - [x] 12.1 Implementasikan `app/api/cek-chat/route.ts` — POST /api/cek-chat
    - Validasi request body: ukuran ≤4MB, tipe file dari magic bytes (JPG/PNG/WebP)
    - Kirim ke Gemini dengan system prompt dan skema JSON FormatDataHasil
    - Untuk screenshot: jalankan aturan server atas transkrip dari Gemini
    - Gabung level: ambil tertinggi dari aturan lokal (dikirim client) dan AI
    - Jika JSON dari Gemini tidak valid, gunakan hasil aturan saja
    - Jika Gemini error/timeout (20 detik), kembalikan hasil aturan + `status_layanan.ai: "gagal"`
    - Log tanpa isi input: hanya status, durasi, jenis error
    - Selalu kembalikan 200 dengan hasil parsial, bukan 500
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.3, 25.4, 26.1, 26.2, 26.3, 26.4, 28.3, 32.1_

- [x] 13. Backend API — endpoint Cek Link
  - [x] 13.1 Implementasikan `app/api/cek-link/route.ts` — POST /api/cek-link
    - Parse dan sanitasi URL dari request
    - Jalankan tiga pemeriksaan paralel dengan `Promise.allSettled` dan timeout 5 detik: Safe Browsing, RDAP, analisis leksikal server
    - Hitung skor gabungan dari semua sumber
    - Kirim paket diagnostik (tanpa data pengguna) ke Gemini untuk penjelasan edukatif
    - Jika Gemini gagal, gunakan teks penjelasan bawaan per aturan
    - Gabung level: ambil tertinggi dari aturan dan data API
    - Tampilkan status tiap sumber di `status_layanan`
    - Untuk contoh fiktif: langsung kembalikan respons simulasi dari `data/contoh/`
    - Selalu kembalikan 200 dengan hasil parsial
    - _Requirements: 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 20.1, 20.2, 20.3, 28.2, 28.4, 32.2_

- [x] 14. Checkpoint — Pastikan endpoint backend berfungsi dan fallback benar
  - Uji cek-chat dengan teks contoh dan screenshot
  - Uji cek-link dengan URL contoh
  - Uji fallback saat API key kosong atau layanan mati
  - Pastikan contoh fiktif tidak memakan kuota API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Integrasi frontend-backend dan pengujian end-to-end
  - [x] 15.1 Hubungkan halaman Cek Chat frontend dengan endpoint `/api/cek-chat`
    - Pastikan alur lengkap: input → sensor → pratinjau → pra-pemindaian → API → hasil
    - Pastikan fallback ke aturan lokal saat API gagal
    - Pastikan contoh fiktif berfungsi tanpa API call
    - _Requirements: 14.1, 15.1, 15.2, 28.3, 29.1_

  - [x] 15.2 Hubungkan halaman Cek Link frontend dengan endpoint `/api/cek-link`
    - Pastikan alur lengkap: input → analisis leksikal → API → hasil + status sumber
    - Pastikan contoh fiktif menggunakan respons simulasi
    - Pastikan atribusi Google Safe Browsing tampil
    - _Requirements: 20.1, 20.4, 20.5, 28.2, 29.1_

  - [x] 15.3 Pastikan Cek Video & Suara berfungsi sepenuhnya offline (P0)
    - Semua perhitungan skor di browser tanpa API call
    - Hasil muncul < 1 detik
    - _Requirements: 23.3, 28.1, 29.1_

  - [x] 15.4 Uji navigasi antar halaman dan cross-link
    - Cek Chat → Cek Link: tombol "Cek link ini" dengan URL terisi via state
    - Cek Chat → Cek Video & Suara: tautan saat modus video terdeteksi
    - Semua halaman: tautan ke dua halaman cek lainnya di hasil
    - Header: navigasi ke semua halaman cek
    - _Requirements: 1.1, 1.2, 34.1, 34.2, 34.3, 34.4_

  - [x] 15.5 Uji ketahanan saat semua layanan pihak ketiga mati
    - Matikan API key atau mock layanan gagal
    - Pastikan ketiga halaman cek tetap menampilkan hasil dari aturan lokal
    - Pastikan setiap hasil memuat minimal 1 alasan dan 2 langkah
    - Pastikan status layanan menampilkan "gagal" atau "tidak tersedia" yang sesuai
    - _Requirements: 29.1, 29.2, 29.3, 29.4_

  - [x] 15.6 Uji responsivitas dan aksesibilitas
    - Layout rapi di 360px tanpa scroll horizontal
    - Target sentuh minimal 44px
    - Kontras teks WCAG AA
    - Semua input memiliki label
    - Chrome Android, Safari iOS, Chrome desktop, Firefox desktop
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

  - [x] 15.7 Uji privasi dan pengelolaan data
    - Pastikan tidak ada penyimpanan input setelah sesi
    - Pastikan gambar dibuang setelah respons dikirim
    - Pastikan tidak ada login, riwayat permanen, atau database pengguna
    - Pastikan tidak ada analitik yang mengidentifikasi pengguna
    - _Requirements: 31.1, 31.2, 31.3, 31.4_

  - [x] 15.8 Cari dan hilangkan kata terlarang di seluruh kode
    - Cari kata "aman", "pasti", "terbukti", "100%" di semua file kode, prompt, dan teks UI
    - Pastikan tidak dipakai sebagai kesimpulan (penggunaan dalam konteks negasi diperbolehkan)
    - _Requirements: 2.4, 6.7, 30.1_

- [x] 16. Checkpoint akhir P0 — Pastikan semua fitur P0 lolos
  - Jalankan semua contoh fiktif di ketiga halaman cek
  - Matikan API key untuk menguji fallback
  - Uji di viewport 360px dan desktop
  - Pastikan alur utama selesai tanpa error dalam waktu kurang dari 2 menit
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Fitur P1 — Tanya lanjut (chatbot) 
  - [x] 17.1 Implementasikan `app/api/tanya/route.ts` — POST /api/tanya
    - Terima pertanyaan, konteks hasil, dan riwayat percakapan
    - Kirim ke Gemini dengan konteks pemeriksaan sebelumnya
    - Batasi topik ke keamanan digital
    - Maksimal 10 pertanyaan per sesi
    - _Requirements: 32.4_

  - [x] 17.2 Implementasikan komponen Tanya Lanjut bersama
    - Tampilkan 2-3 pertanyaan cepat sebagai tombol
    - Input teks untuk pertanyaan bebas
    - Riwayat disimpan di memori browser saja (bukan server)
    - Integrasikan ke ketiga halaman cek di bawah KomponenHasil
    - _Requirements: 31.5_

- [x] 18. Fitur P1 — Sorotan bukti dan pemecahan URL
  - [x] 18.1 Implementasikan sorotan kalimat pemicu di transkrip Cek Chat
    - Highlight kalimat yang memicu temuan di hasil
    - _Requirements: CH-07 (P1)_

  - [x] 18.2 Implementasikan pemecahan URL per bagian dengan sorotan di Cek Link
    - Tampilkan URL dipecah: protokol, subdomain, domain, TLD, path, params
    - Sorot bagian yang mencurigakan
    - _Requirements: LN-07 (P1)_

- [x] 19. Fitur P1 — VirusTotal integrasi
  - [x] 19.1 Implementasikan integrasi VirusTotal di `lib/virustotal.ts` dan `app/api/cek-link/route.ts`
    - Public API: 500 req/hari, 4 req/menit
    - Tambahkan sebagai sumber paralel di cek-link dengan timeout 5 detik
    - Jika ditandai berbahaya: +3
    - _Requirements: LN-08 (P1)_

- [x] 20. Fitur P1 — Cek Video & Suara lanjutan
  - [x] 20.1 Implementasikan checklist pengamatan visual dan audio di wizard
    - Tambahkan checklist: bibir tidak sinkron, kedipan aneh, tepi wajah blur, wajah rusak, cahaya beda, suara datar, jeda janggal
    - Catatan: "Deepfake yang bagus bisa tidak menunjukkan tanda ini."
    - Setiap tanda +1 skor
    - _Requirements: VS-05 (P1)_

  - [x] 20.2 Implementasikan upload video/audio dan integrasi Reality Defender
    - Ekstrak 3-5 frame dari video di browser via `<canvas>`
    - Audio dikirim apa adanya via backend
    - Implementasikan `app/api/cek-media/route.ts`
    - Hasil API sebagai "sinyal tambahan", bukan vonis
    - Toggle default mati
    - _Requirements: VS-06 (P1), 32.3_

- [x] 21. Fitur P1 — Pemandu halaman dan templat peringatan
  - [x] 21.1 Implementasikan pemandu halaman berbasis skrip di Cek Link
    - Tooltip kontekstual saat kolom input disentuh, saat Periksa ditekan sebelum kolom terisi, atau setelah diam 8 detik
    - Berjalan sepenuhnya di browser, tidak mengirim data
    - _Requirements: LN-09 (P1)_

  - [x] 21.2 Implementasikan templat pesan peringatan untuk keluarga
    - Tombol "Kirim peringatan" yang membuka templat pesan
    - Bisa disalin atau dibagikan ke WhatsApp
    - Templat tidak memuat data pengguna
    - _Requirements: P1 — Peringatkan orang lain_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Property 1-11)
- Unit tests validate specific examples and edge cases
- Fitur P1 (tasks 17-21) hanya dikerjakan setelah semua P0 lolos uji
- Semua kode aturan di `lib/aturan/` ditulis sebagai TypeScript murni tanpa dependensi browser/server agar isomorphic
- Contoh fiktif menggunakan respons simulasi agar tidak memakan kuota API
- Fallback ke aturan lokal selalu tersedia saat layanan pihak ketiga gagal

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.5", "1.6", "1.7"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1", "2.8", "2.10"] },
    { "id": 3, "tasks": ["2.2", "2.4", "2.6", "2.9", "2.11", "2.12"] },
    { "id": 4, "tasks": ["2.3", "2.5", "2.7", "2.13"] },
    { "id": 5, "tasks": ["4.1", "4.4", "4.5", "4.6", "4.10", "4.11"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.7", "4.8", "4.9", "4.12", "4.13"] },
    { "id": 7, "tasks": ["6.1", "7.1", "7.2", "8.1", "9.1"] },
    { "id": 8, "tasks": ["7.3", "8.2", "9.2"] },
    { "id": 9, "tasks": ["11.1", "11.3", "11.4", "11.5"] },
    { "id": 10, "tasks": ["11.2"] },
    { "id": 11, "tasks": ["12.1", "13.1"] },
    { "id": 12, "tasks": ["15.1", "15.2", "15.3"] },
    { "id": 13, "tasks": ["15.4", "15.5", "15.6", "15.7", "15.8"] },
    { "id": 14, "tasks": ["17.1", "17.2", "18.1", "18.2", "19.1", "20.1", "20.2", "21.1", "21.2"] }
  ]
}
```
