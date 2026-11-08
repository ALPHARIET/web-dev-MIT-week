# Requirements Document

## Introduction

Aplikasi Web Cek Penipuan adalah aplikasi web tanpa login untuk membantu anak muda Indonesia (18+) memeriksa chat, link, dan video atau suara yang mencurigakan. Aplikasi terdiri dari empat halaman: Beranda, Cek Chat, Cek Link, dan Cek Video & Suara. Ketiga halaman cek memakai satu alur yang sama (Masukkan → Hasil + alasan → Langkah tindakan → Tanya lanjut) dan satu format data hasil yang seragam.

Empat prinsip utama berlaku di seluruh aplikasi:
1. **Tanpa vonis** — Hasil berupa tingkat kewaspadaan dan alasannya, tanpa pernah memakai label "Aman".
2. **Tanpa data sensitif** — Tidak ada login, database pengguna, atau penyimpanan input setelah sesi selesai.
3. **Jujur soal pihak ketiga** — Setiap input yang dikirim ke layanan luar disebutkan di layar sebelum pengguna menekan tombol Periksa.
4. **Tetap jalan saat layanan luar gagal** — Hasil dari aturan lokal tetap tampil walau AI atau API pihak ketiga error.

Stack teknis: Next.js (App Router) + TypeScript + Tailwind CSS, deploy di Vercel.

## Glossary

- **Aplikasi**: Aplikasi Web Cek Penipuan secara keseluruhan, mencakup frontend dan backend
- **Frontend**: Bagian aplikasi yang berjalan di browser pengguna
- **Backend**: Serverless function di Vercel yang menjadi perantara ke layanan pihak ketiga
- **Komponen_Hasil**: Komponen UI bersama yang menampilkan hasil pemeriksaan dengan format seragam di ketiga halaman cek
- **Panel_Darurat**: Panel "Sudah terlanjur?" yang menampilkan langkah darurat berdasarkan situasi pengguna
- **Tingkat_Kewaspadaan**: Label tingkat risiko yang ditampilkan ke pengguna, terdiri dari tiga level: Waspada tinggi (merah), Perlu hati-hati (oranye), dan Tidak ditemukan tanda bahaya (abu-abu)
- **Aturan_Lokal**: Sekumpulan aturan berbasis pola dan skor yang dijalankan di browser tanpa memerlukan API eksternal
- **Skor_Aturan**: Nilai numerik yang dihasilkan oleh Aturan_Lokal untuk menentukan Tingkat_Kewaspadaan; hanya digunakan di belakang layar dan tidak ditampilkan ke pengguna
- **Format_Data_Hasil**: Objek JSON standar yang dikembalikan oleh semua endpoint dan logika browser, berisi halaman, level, ringkasan, temuan, hal_wajar, langkah, situasi_darurat, batasan, pihak_ketiga, dan status_layanan
- **Pra_Pemindaian**: Proses pemeriksaan awal menggunakan Aturan_Lokal di browser sebelum input dikirim ke layanan AI
- **Sensor_Otomatis**: Proses penggantian data sensitif (nomor HP, nomor rekening, email, deretan angka) dengan placeholder `[disensor]` sebelum teks dikirim ke backend
- **System_Prompt**: Instruksi yang dikirim ke Gemini API sebagai konteks, mengatur gaya bahasa, batasan topik, dan format keluaran
- **Paket_Diagnostik**: Kumpulan hasil analisis leksikal dan API yang dikirim ke Gemini untuk ditulis ulang menjadi penjelasan edukatif, tanpa menyertakan data pengguna
- **Kotak_Privasi**: Komponen UI yang menampilkan peringatan tentang data sensitif dan daftar layanan pihak ketiga yang dipakai halaman tersebut
- **Wizard**: Antarmuka bertahap (langkah demi langkah) yang digunakan di halaman Cek Video & Suara
- **RDAP**: Registration Data Access Protocol, protokol untuk mengakses data registrasi domain termasuk tanggal pendaftaran
- **Gemini_API**: Google Gemini API, layanan AI generatif dari Google yang digunakan untuk analisis chat dan penjelasan edukatif
- **Safe_Browsing_API**: Google Safe Browsing API v4, layanan pengecekan URL terhadap daftar phishing dan malware
- **Reality_Defender**: Layanan pihak ketiga untuk deteksi manipulasi gambar dan audio (fitur P1)
- **IASC**: Indonesia Anti-Scam Centre, pusat pelaporan penipuan keuangan di bawah OJK
- **Fallback**: Mekanisme cadangan yang menampilkan hasil Aturan_Lokal saat layanan AI atau API pihak ketiga gagal

## Requirements

### Requirement 1: Navigasi dan Header Bersama

**User Story:** Sebagai pengguna, saya ingin navigasi yang konsisten di semua halaman, supaya saya bisa berpindah antara halaman cek tanpa harus kembali ke Beranda.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan header di semua halaman yang memuat nama aplikasi dan tautan ke tiga halaman cek (`/cek-chat`, `/cek-link`, `/cek-video-suara`).
2. WHEN pengguna mengklik tautan halaman cek di header, THE Aplikasi SHALL membuka halaman cek yang sesuai.
3. THE Aplikasi SHALL menampilkan footer di semua halaman yang memuat tautan ke bagian "Cara kerja dan batasan" di Beranda dan catatan "untuk pengguna 18 tahun ke atas".
4. THE Aplikasi SHALL menampilkan layout yang rapi pada lebar layar 360 px hingga desktop tanpa scroll horizontal.
5. THE Aplikasi SHALL menyediakan target sentuh minimal 44 px untuk semua elemen interaktif.

---

### Requirement 2: Beranda — Panel Panduan (Hero)

**User Story:** Sebagai pengguna baru, saya ingin memahami tujuan dan cara pakai aplikasi dengan cepat, supaya saya bisa langsung memilih halaman cek yang sesuai.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan panel panduan (hero) di halaman Beranda (`/`) yang memuat judul sambutan, tujuan aplikasi, empat langkah cara pakai, dan catatan privasi.
2. THE Aplikasi SHALL menampilkan panel panduan langsung tanpa memerlukan klik atau interaksi.
3. THE Aplikasi SHALL menampilkan catatan privasi yang menyebutkan: tanpa login, input tidak disimpan, sebagian pengecekan dikirim ke layanan pihak ketiga yang selalu disebutkan sebelum tombol Periksa ditekan, dan hasil bersifat membantu menilai bukan keputusan akhir.
4. THE Aplikasi SHALL menampilkan teks panel panduan tanpa memakai kata "aman", "pasti", "terbukti", atau "100%" sebagai janji hasil.

---

### Requirement 3: Beranda — Tiga Kartu Menu

**User Story:** Sebagai pengguna, saya ingin melihat tiga pilihan pengecekan yang jelas, supaya saya bisa langsung memilih jenis pemeriksaan yang saya butuhkan.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan tiga kartu menu bertumpuk vertikal dan selebar layar di halaman Beranda, dengan urutan: Cek Chat, Cek Link, Cek Video & Suara.
2. THE Aplikasi SHALL menampilkan judul dan deskripsi singkat pada setiap kartu menu.
3. WHEN pengguna mengklik kartu Cek Chat, THE Aplikasi SHALL membuka halaman `/cek-chat`.
4. WHEN pengguna mengklik kartu Cek Link, THE Aplikasi SHALL membuka halaman `/cek-link`.
5. WHEN pengguna mengklik kartu Cek Video & Suara, THE Aplikasi SHALL membuka halaman `/cek-video-suara`.

---

### Requirement 4: Beranda — Akordeon Cara Kerja dan Batasan

**User Story:** Sebagai pengguna yang ingin tahu lebih lanjut, saya ingin memahami cara penilaian, batasan, dan data yang dikirim ke pihak ketiga, supaya saya bisa menggunakan aplikasi dengan pemahaman yang tepat.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan akordeon "Cara kerja dan batasan" di halaman Beranda, di bawah tiga kartu menu.
2. THE Aplikasi SHALL menjelaskan cara penilaian tiap halaman cek di dalam akordeon.
3. THE Aplikasi SHALL menjelaskan hal-hal yang tidak bisa dideteksi aplikasi di dalam akordeon.
4. THE Aplikasi SHALL menjelaskan data apa yang dikirim ke layanan mana di dalam akordeon.
5. WHEN pengguna mengklik judul akordeon, THE Aplikasi SHALL membuka atau menutup isi akordeon yang bersangkutan.

---

### Requirement 5: Format Data Hasil Bersama

**User Story:** Sebagai pengembang, saya ingin semua endpoint dan logika browser menghasilkan objek hasil dengan format yang sama, supaya satu Komponen_Hasil bisa dipakai di ketiga halaman cek.

#### Acceptance Criteria

1. THE Backend SHALL mengembalikan objek Format_Data_Hasil yang memuat field: `halaman`, `level`, `ringkasan`, `temuan`, `hal_wajar`, `langkah`, `situasi_darurat`, `batasan`, `pihak_ketiga`, dan `status_layanan`.
2. THE Aplikasi SHALL menggunakan nilai `level` berupa `tinggi`, `sedang`, atau `tidak_ditemukan` pada objek Format_Data_Hasil.
3. THE Aplikasi SHALL menyertakan minimal satu alasan pada setiap temuan di dalam field `temuan`, beserta judul, penjelasan, bukti, dan sumber.
4. THE Aplikasi SHALL menyertakan minimal dua langkah pada field `langkah` di setiap hasil pemeriksaan.
5. FOR ALL halaman cek, parsing Format_Data_Hasil lalu rendering ke Komponen_Hasil lalu pembacaan kembali data dari Komponen_Hasil SHALL menghasilkan informasi yang setara dengan objek Format_Data_Hasil asli (round-trip property).

---

### Requirement 6: Komponen Hasil Bersama — Susunan dan Tampilan

**User Story:** Sebagai pengguna, saya ingin melihat hasil pemeriksaan yang terstruktur dan konsisten di semua halaman cek, supaya saya bisa memahami temuan, alasan, dan langkah yang perlu diambil.

#### Acceptance Criteria

1. THE Komponen_Hasil SHALL menampilkan blok hasil dalam urutan: (1) Tingkat_Kewaspadaan + ringkasan satu kalimat, (2) Yang perlu diwaspadai dengan temuan, (3) Yang tampak wajar jika ada, (4) Langkah yang disarankan, (5) Panel_Darurat, (6) Batasan + layanan pihak ketiga, (7) Tombol "Cek lagi" dan tautan ke dua halaman cek lainnya.
2. WHEN Tingkat_Kewaspadaan bernilai "tinggi", THE Komponen_Hasil SHALL menampilkan label "Waspada tinggi" dengan warna merah beserta kalimat pembuka "Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi."
3. WHEN Tingkat_Kewaspadaan bernilai "sedang", THE Komponen_Hasil SHALL menampilkan label "Perlu hati-hati" dengan warna oranye beserta kalimat pembuka "Ada tanda yang perlu kamu cek dulu sebelum lanjut."
4. WHEN Tingkat_Kewaspadaan bernilai "tidak_ditemukan", THE Komponen_Hasil SHALL menampilkan label "Tidak ditemukan tanda bahaya" dengan warna abu-abu beserta kalimat pembuka "Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman."
5. THE Komponen_Hasil SHALL membedakan Tingkat_Kewaspadaan menggunakan teks label dan ikon, tidak hanya warna.
6. THE Komponen_Hasil SHALL menampilkan sumber setiap temuan (aturan, ai, safe_browsing, rdap, virustotal, atau reality_defender).
7. THE Aplikasi SHALL menampilkan teks hasil tanpa memakai kata "aman", "pasti", "terbukti", atau "100%" sebagai kesimpulan.

---

### Requirement 7: Panel Darurat — Sudah Terlanjur

**User Story:** Sebagai pengguna yang sudah terlanjur bertindak (klik link, isi data, kirim OTP, atau transfer), saya ingin langkah darurat yang sesuai situasi saya, supaya saya bisa meminimalkan kerugian.

#### Acceptance Criteria

1. THE Panel_Darurat SHALL menampilkan daftar situasi yang bisa dipilih: sudah klik link, sudah mengisi password atau data akun, sudah mengirim OTP, sudah transfer, dan akun diambil alih.
2. WHEN pengguna memilih satu situasi, THE Panel_Darurat SHALL menampilkan checklist langkah darurat yang sesuai dengan situasi tersebut.
3. THE Panel_Darurat SHALL memuat langkah darurat yang bersumber dari satu file data `langkah-darurat.json`.
4. THE Panel_Darurat SHALL menampilkan kanal lapor resmi: IASC (iasc.ojk.go.id), Kontak OJK (157, WhatsApp 081-157-157-157, email konsumen@ojk.go.id), call center bank resmi, dan fitur Laporkan di platform pesan.
5. THE Panel_Darurat SHALL menampilkan peringatan untuk mewaspadai pihak yang mengaku perwakilan IASC dan menjanjikan uang kembali.
6. WHEN Aturan_Lokal atau AI mendeteksi pengguna sudah transfer atau mengirim OTP, THE Komponen_Hasil SHALL menampilkan Panel_Darurat terbuka di posisi teratas.

---

### Requirement 8: Kotak Privasi dan Pemberitahuan Pihak Ketiga

**User Story:** Sebagai pengguna, saya ingin tahu data apa yang dikirim ke layanan mana sebelum menekan tombol Periksa, supaya saya bisa memutuskan apakah ingin melanjutkan.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan Kotak_Privasi di setiap halaman cek sebelum area input.
2. THE Kotak_Privasi SHALL memuat peringatan "jangan masukkan OTP, PIN, password, atau nomor rekening asli".
3. THE Kotak_Privasi SHALL memuat daftar layanan pihak ketiga yang dipakai halaman tersebut.
4. WHEN pengguna berada di halaman Cek Chat, THE Kotak_Privasi SHALL menyebutkan bahwa teks atau screenshot dikirim ke Google Gemini untuk dianalisis.
5. WHEN pengguna berada di halaman Cek Link, THE Kotak_Privasi SHALL menyebutkan bahwa alamat link dikirim ke Google Safe Browsing dan layanan data domain, serta link tidak akan dibuka.
6. THE Aplikasi SHALL menampilkan Kotak_Privasi sebelum pengguna menekan tombol "Periksa".

---

### Requirement 9: Tombol Coba Contoh

**User Story:** Sebagai pengguna atau juri, saya ingin mencoba aplikasi dengan skenario fiktif yang sudah disediakan, supaya saya bisa melihat cara kerja aplikasi tanpa harus membuat input sendiri.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan tombol "Coba contoh" di setiap halaman cek.
2. WHEN pengguna menekan tombol "Coba contoh" di halaman Cek Chat, THE Aplikasi SHALL mengisi area input dengan salah satu dari tiga skenario fiktif (tawaran kerja like dan review, permintaan OTP dari "kurir", atau pesan mengaku keluarga ganti nomor).
3. WHEN pengguna menekan tombol "Coba contoh" di halaman Cek Link, THE Aplikasi SHALL mengisi kolom input dengan URL fiktif dan menggunakan respons API simulasi yang tidak memakan kuota API dan tidak menyentuh domain nyata.
4. WHEN pengguna menekan tombol "Coba contoh" di halaman Cek Video & Suara, THE Aplikasi SHALL mengisi jawaban wizard dengan salah satu dari tiga skenario fiktif (video call kakak minta transfer, voice note atasan minta voucher, atau video tokoh promosi investasi).
5. THE Aplikasi SHALL menggunakan data contoh dari folder `data/contoh/`.

---

### Requirement 10: Penentuan Tingkat Kewaspadaan

**User Story:** Sebagai pengguna, saya ingin tingkat kewaspadaan ditentukan secara konsisten di semua halaman cek, supaya saya mendapat penilaian yang bisa diandalkan.

#### Acceptance Criteria

1. THE Aturan_Lokal SHALL menentukan Tingkat_Kewaspadaan minimum berdasarkan Skor_Aturan.
2. WHEN Skor_Aturan lebih besar atau sama dengan 6, THE Aturan_Lokal SHALL menetapkan Tingkat_Kewaspadaan menjadi "tinggi".
3. WHEN Skor_Aturan bernilai 3 sampai 5, THE Aturan_Lokal SHALL menetapkan Tingkat_Kewaspadaan menjadi "sedang".
4. WHEN Skor_Aturan bernilai kurang dari 3, THE Aturan_Lokal SHALL menetapkan Tingkat_Kewaspadaan menjadi "tidak_ditemukan".
5. THE Aplikasi SHALL menggunakan level tertinggi dari Aturan_Lokal dan AI sebagai Tingkat_Kewaspadaan akhir; AI hanya boleh menaikkan level, tidak pernah menurunkan level dari Aturan_Lokal.
6. THE Aplikasi SHALL menampilkan Skor_Aturan hanya di belakang layar; pengguna hanya melihat label Tingkat_Kewaspadaan dan alasannya.

---

### Requirement 11: Cek Chat — Input dan Validasi

**User Story:** Sebagai pengguna, saya ingin menempel teks chat atau mengunggah screenshot, supaya aplikasi bisa memeriksa pesan mencurigakan yang saya terima.

#### Acceptance Criteria

1. THE Aplikasi SHALL menyediakan dua tab input di halaman Cek Chat: "Tempel teks" dan "Unggah screenshot".
2. THE Aplikasi SHALL menerima input teks dengan panjang maksimal 4.000 karakter.
3. THE Aplikasi SHALL menerima unggahan screenshot maksimal 5 gambar dengan format JPG, PNG, atau WebP.
4. THE Frontend SHALL mengecilkan setiap gambar yang diunggah ke lebar maksimal 1.600 px dengan format JPEG sebelum dikirim, supaya total kiriman di bawah 4 MB.
5. THE Aplikasi SHALL menyediakan kolom konteks opsional, misalnya "dari nomor tidak dikenal" atau "mengaku dari bank".
6. IF input kosong, THEN THE Aplikasi SHALL menampilkan pesan validasi dan mencegah pengiriman.
7. THE Aplikasi SHALL memeriksa tipe file dari isinya, bukan hanya ekstensi.

---

### Requirement 12: Cek Chat — Sensor Otomatis dan Pratinjau

**User Story:** Sebagai pengguna, saya ingin data sensitif di teks chat otomatis disensor sebelum dikirim, supaya privasi saya dan pihak lain terlindungi.

#### Acceptance Criteria

1. WHEN pengguna memasukkan teks chat, THE Frontend SHALL mengganti deretan 4-8 angka, nomor HP, nomor rekening, dan alamat email dengan placeholder `[disensor]`.
2. WHEN pengguna menekan tombol Periksa untuk input teks, THE Aplikasi SHALL menampilkan pratinjau teks yang sudah disensor sebelum teks dikirim ke backend.
3. WHEN pengguna mengunggah screenshot, THE Aplikasi SHALL menampilkan pengingat untuk memotong atau menutup data sensitif di gambar karena gambar tidak bisa disensor otomatis.
4. THE Sensor_Otomatis SHALL memproses teks di browser tanpa mengirim data ke server.

---

### Requirement 13: Cek Chat — Pra-Pemindaian Aturan

**User Story:** Sebagai pengguna, saya ingin mendapat hasil penilaian cepat dari aturan lokal di browser, supaya saya tetap mendapat informasi walau layanan AI tidak tersedia.

#### Acceptance Criteria

1. WHEN input berupa teks, THE Frontend SHALL menjalankan Aturan_Lokal di browser dan menghasilkan Tingkat_Kewaspadaan minimum sebelum mengirim input ke backend.
2. THE Aturan_Lokal untuk Cek Chat SHALL mendeteksi pola: permintaan OTP/PIN/password (langsung waspada tinggi), permintaan transfer/pulsa/voucher (+3), biaya di muka (+3), kirim file APK (+3), desakan waktu (+2), mengaku keluarga ganti nomor (+2), mengaku pihak resmi (+2), gaji besar tanpa syarat (+2), hadiah/undian (+2), pindah aplikasi (+1), dan keberadaan link di pesan (+1).
3. WHEN Aturan_Lokal mendeteksi pola permintaan OTP, PIN, atau password, THE Aturan_Lokal SHALL langsung menetapkan Tingkat_Kewaspadaan menjadi "tinggi".
4. WHEN Aturan_Lokal mendeteksi kombinasi "minta uang/OTP" dan "desakan/rahasia", THE Aturan_Lokal SHALL menetapkan Tingkat_Kewaspadaan menjadi "tinggi".
5. WHEN Aturan_Lokal mendeteksi link di dalam teks chat, THE Komponen_Hasil SHALL menampilkan tombol "Cek link ini" yang membuka halaman Cek Link dengan URL sudah terisi melalui state aplikasi, bukan query string.

---

### Requirement 14: Cek Chat — Analisis AI via Gemini

**User Story:** Sebagai pengguna, saya ingin mendapat analisis mendalam dari AI tentang pola penipuan di chat saya, supaya saya memahami cara kerja modusnya.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol Periksa, THE Backend SHALL mengirim input (teks yang sudah disensor atau screenshot) ke Gemini_API dengan System_Prompt dan skema JSON Format_Data_Hasil.
2. THE System_Prompt SHALL mengatur: bahasa Indonesia sederhana dengan sapaan "kamu", tanpa vonis, setiap temuan disertai alasan dan bukti kutipan, setiap jawaban ditutup dengan langkah praktis, tidak meminta data pribadi, mengingatkan pengguna yang mengirim data sensitif, tidak menyarankan membalas pelaku, menolak permintaan membuat pesan penipuan, dan menolak pertanyaan di luar topik keamanan digital.
3. WHEN Gemini_API mengembalikan keluaran yang memuat screenshot, THE Backend SHALL menjalankan Aturan_Lokal atas transkrip yang dihasilkan Gemini dari screenshot tersebut.
4. THE Aplikasi SHALL menggunakan level tertinggi dari Aturan_Lokal dan Gemini_API sebagai Tingkat_Kewaspadaan akhir.
5. IF keluaran JSON dari Gemini_API tidak valid, THEN THE Backend SHALL menggunakan hasil Aturan_Lokal saja.

---

### Requirement 15: Cek Chat — Fallback saat AI Gagal

**User Story:** Sebagai pengguna, saya ingin tetap melihat hasil pemeriksaan meskipun layanan AI tidak tersedia, supaya saya tetap mendapat informasi tentang tanda bahaya.

#### Acceptance Criteria

1. IF Gemini_API mengembalikan error atau tidak merespons dalam 20 detik, THEN THE Aplikasi SHALL menampilkan hasil dari Aturan_Lokal beserta keterangan "analisis AI sedang tidak tersedia".
2. IF Gemini_API gagal, THEN THE Aplikasi SHALL menampilkan tombol "Coba lagi" dan mempertahankan input pengguna.
3. THE Aplikasi SHALL menampilkan hasil Aturan_Lokal yang tetap mengikuti susunan Komponen_Hasil bersama meskipun tanpa analisis AI.

---

### Requirement 16: Cek Chat — Kondisi Khusus

**User Story:** Sebagai pengguna, saya ingin mendapat respons yang tepat ketika input saya tidak ideal, supaya saya tahu apa yang harus dilakukan.

#### Acceptance Criteria

1. IF screenshot yang diunggah buram atau tidak terbaca, THEN THE Aplikasi SHALL meminta pengguna mengunggah ulang atau menempel teksnya.
2. IF input bukan percakapan, THEN THE Aplikasi SHALL menjelaskan bahwa tidak ada chat yang bisa dianalisis.
3. IF teks chat terlalu pendek, THEN THE Aplikasi SHALL menyampaikan keterbatasan analisis dan menyarankan pengguna menambah konteks.
4. WHEN Aturan_Lokal atau Gemini_API mendeteksi modus video call atau voice note di dalam chat, THE Komponen_Hasil SHALL menampilkan tautan ke halaman Cek Video & Suara.

---

### Requirement 17: Cek Link — Input dan Sanitasi

**User Story:** Sebagai pengguna, saya ingin memeriksa URL atau domain mencurigakan tanpa harus membukanya, supaya saya bisa menilai keamanannya terlebih dahulu.

#### Acceptance Criteria

1. THE Aplikasi SHALL menyediakan satu kolom input di halaman Cek Link untuk URL atau domain dengan panjang maksimal 2.000 karakter.
2. THE Aplikasi SHALL menampilkan link sebagai teks biasa, tidak pernah sebagai tautan yang bisa diklik.
3. WHEN pengguna memasukkan URL, THE Frontend dan Backend SHALL mengurai URL menjadi protokol, subdomain, domain utama, TLD, path, dan parameter.
4. THE Aplikasi SHALL membuang parameter yang terlihat sensitif (email, nomor HP, token, session, id) sebelum mengirim URL ke layanan pihak ketiga.
5. THE Aplikasi SHALL menolak membuka, mengambil HTML, atau mengikuti URL yang dimasukkan pengguna.

---

### Requirement 18: Cek Link — Pemeriksaan Paralel

**User Story:** Sebagai pengguna, saya ingin link diperiksa dari beberapa sumber secara bersamaan, supaya hasil pemeriksaan lebih menyeluruh dan cepat.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol Periksa di halaman Cek Link, THE Backend SHALL menjalankan tiga pemeriksaan secara paralel: analisis leksikal lokal, pengecekan Google Safe_Browsing_API, dan pengecekan umur domain via RDAP.
2. THE Backend SHALL menerapkan batas waktu 5 detik per sumber pemeriksaan.
3. IF satu sumber pemeriksaan melewati batas waktu 5 detik, THEN THE Aplikasi SHALL melanjutkan dengan hasil dari sumber lain yang sudah selesai.
4. THE Aplikasi SHALL menampilkan status tiap sumber di hasil, misalnya "Google Safe Browsing: tidak ada di daftar ancaman (bukan jaminan aman)" atau "tidak tersedia".

---

### Requirement 19: Cek Link — Analisis Leksikal Lokal

**User Story:** Sebagai pengguna, saya ingin URL diperiksa terhadap pola-pola yang sering dipakai penipu, supaya saya tahu tanda bahaya yang tersembunyi di alamat link.

#### Acceptance Criteria

1. THE Aturan_Lokal untuk Cek Link SHALL mendeteksi URL yang ada di daftar Google Safe_Browsing_API dan langsung menetapkan Tingkat_Kewaspadaan menjadi "tinggi".
2. THE Aturan_Lokal SHALL mendeteksi nama domain yang mirip merek Indonesia (BCA, BRI, BNI, Mandiri, BSI, DANA, OVO, GoPay, Shopee, Tokopedia, BPJS, JNE, J&T, Pos Indonesia) termasuk angka pengganti huruf seperti `sh0pee` (+3).
3. THE Aturan_Lokal SHALL mendeteksi domain berumur kurang dari 30 hari berdasarkan data RDAP (+3).
4. THE Aturan_Lokal SHALL mendeteksi Punycode atau karakter mirip (`xn--`) (+3).
5. THE Aturan_Lokal SHALL mendeteksi alamat berupa IP (+3).
6. THE Aturan_Lokal SHALL mendeteksi kata pemicu di domain atau path: hadiah, klaim, undian, verifikasi, login, promo (+2).
7. THE Aturan_Lokal SHALL mendeteksi lebih dari 3 subdomain atau nama merek di subdomain tapi bukan di domain utama (+2).
8. THE Aturan_Lokal SHALL mendeteksi TLD yang sering disalahgunakan (+1).
9. THE Aturan_Lokal SHALL mendeteksi layanan pemendek link (+1) disertai saran membuka pratinjau tujuan link dari layanan pemendeknya.
10. THE Aturan_Lokal SHALL mendeteksi karakter `@` di URL atau URL lebih dari 200 karakter (+1).
11. WHEN umur domain tidak tersedia dari RDAP, THE Aplikasi SHALL menampilkan status "tidak tersedia" dan tidak menganggap domain tersebut aman.

---

### Requirement 20: Cek Link — Penjelasan AI dan Fallback

**User Story:** Sebagai pengguna, saya ingin penjelasan yang mudah dipahami tentang mengapa link ini mencurigakan, supaya saya bisa belajar mengenali pola serupa di kemudian hari.

#### Acceptance Criteria

1. WHEN pemeriksaan paralel selesai, THE Backend SHALL mengirim Paket_Diagnostik (tanpa data pengguna) ke Gemini_API untuk ditulis ulang menjadi penjelasan edukatif sesuai Format_Data_Hasil.
2. THE Aplikasi SHALL menentukan Tingkat_Kewaspadaan berdasarkan Aturan_Lokal dan data API, bukan berdasarkan keluaran Gemini_API.
3. IF Gemini_API gagal, THEN THE Aplikasi SHALL menampilkan teks penjelasan bawaan yang dimiliki setiap aturan.
4. THE Aplikasi SHALL menampilkan atribusi "Advisory provided by Google" dengan tautan ke Safe Browsing Advisory sesuai ketentuan Google Safe_Browsing_API.
5. THE Aplikasi SHALL menampilkan keterangan bahwa hasil Google Safe_Browsing_API memiliki kemungkinan false positive dan false negative.

---

### Requirement 21: Cek Link — Contoh Fiktif Tanpa Kuota

**User Story:** Sebagai pengguna atau juri, saya ingin contoh fiktif di Cek Link menggunakan respons simulasi, supaya demo tidak memakan kuota API dan tidak menyentuh domain nyata.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Coba contoh" di halaman Cek Link, THE Aplikasi SHALL menggunakan respons API simulasi dari folder `data/contoh/`.
2. THE Aplikasi SHALL memastikan domain yang dipakai di contoh fiktif tidak terdaftar dan aktif di dunia nyata.
3. THE Aplikasi SHALL menampilkan link contoh sebagai teks biasa yang tidak bisa diklik.

---

### Requirement 22: Cek Video & Suara — Wizard Pilih Situasi

**User Story:** Sebagai pengguna yang menerima video call, voice note, atau video tokoh mencurigakan, saya ingin menjawab beberapa pertanyaan konteks, supaya aplikasi bisa menilai tingkat risiko berdasarkan situasi saya.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan tiga kartu pilihan situasi di langkah pertama Wizard: (a) sedang atau baru menerima video call/telepon, (b) menerima rekaman video atau voice note, (c) melihat video tokoh, pejabat, atau artis di media sosial.
2. WHEN pengguna memilih satu situasi, THE Wizard SHALL menampilkan 5-7 pertanyaan pilihan ganda yang sedikit berbeda per situasi.
3. THE Wizard SHALL menyertakan pertanyaan: apa yang diminta, dari nomor atau akun mana, ada keadaan darurat atau desakan waktu, diminta merahasiakan, dan bisa ditelepon balik atau diverifikasi.
4. WHEN pengguna memilih situasi video tokoh, THE Wizard SHALL menyertakan pertanyaan tambahan: siapa yang tampil (+1 jika tokoh publik) dan ada janji untung pasti atau ajakan ke WA/Telegram (+3 jika ya).

---

### Requirement 23: Cek Video & Suara — Skor Aturan dan Bobot

**User Story:** Sebagai pengguna, saya ingin penilaian risiko yang akurat berdasarkan konteks situasi saya, supaya saya tahu seberapa waspada saya harus bertindak.

#### Acceptance Criteria

1. THE Aturan_Lokal untuk Cek Video & Suara SHALL memberikan bobot: permintaan OTP/PIN/data akun (+4), permintaan transfer/pulsa/voucher (+3), ajakan investasi/janji keuntungan (+3), menolak ditelepon balik/kamera "rusak"/sinyal selalu buruk (+3), tokoh publik + janji untung + link ke WA/Telegram (+3), klik link atau instal aplikasi (+2), nomor baru dengan alasan ganti nomor (+2), keadaan darurat/desakan waktu (+2), diminta merahasiakan (+2), akun media sosial tidak dikenal (+1), tokoh publik (+1), dan setiap tanda di checklist pengamatan (+1).
2. WHEN Skor_Aturan mencapai 6 atau lebih, ATAU WHEN kombinasi "minta uang/OTP" dan "darurat/rahasia" terdeteksi, ATAU WHEN kombinasi "tokoh publik" dan "janji untung" terdeteksi, THE Aturan_Lokal SHALL menetapkan Tingkat_Kewaspadaan menjadi "tinggi".
3. THE Aturan_Lokal SHALL menghasilkan hasil di browser tanpa memanggil API eksternal, sehingga halaman Cek Video & Suara berfungsi sepenuhnya offline untuk fitur P0.

---

### Requirement 24: Cek Video & Suara — Langkah Verifikasi per Situasi

**User Story:** Sebagai pengguna, saya ingin langkah verifikasi yang sesuai dengan situasi spesifik saya, supaya saya bisa memastikan apakah kontak tersebut benar-benar orang yang diaku.

#### Acceptance Criteria

1. WHEN situasi melibatkan keluarga atau teman, THE Komponen_Hasil SHALL menyarankan: tutup panggilan, telepon balik ke nomor lama yang tersimpan, tanyakan hal yang hanya mereka tahu atau pakai kode rahasia keluarga, hubungi anggota keluarga lain.
2. WHEN situasi melibatkan atasan, dosen, atau instansi, THE Komponen_Hasil SHALL menyarankan: konfirmasi lewat jalur resmi seperti nomor atau email kantor, bukan kontak dari si penelepon.
3. WHEN situasi melibatkan tokoh publik atau investasi, THE Komponen_Hasil SHALL menyarankan: cek akun dan situs resmi tokoh tersebut, lalu cek legalitas penawaran di Kontak OJK 157.
4. WHEN pengguna masih tersambung dengan panggilan mencurigakan, THE Komponen_Hasil SHALL menyarankan: minta lawan bicara menoleh penuh ke samping atau melambaikan tangan di depan wajah, dengan catatan bahwa cara ini tidak selalu berhasil.

---

### Requirement 25: Keamanan API Key dan Batas Permintaan

**User Story:** Sebagai pengembang, saya ingin API key terlindungi dan ada pembatasan permintaan, supaya kuota tidak habis dan keamanan terjaga.

#### Acceptance Criteria

1. THE Backend SHALL menyimpan semua API key sebagai environment variable di server, tidak pernah di kode frontend.
2. THE Backend SHALL menerapkan batas permintaan per IP, misalnya 10 cek per menit dan 100 per hari per halaman.
3. THE Backend SHALL menolak permintaan yang melebihi batas dan mengembalikan respons yang sesuai.
4. THE Backend SHALL tidak mencatat isi input di log; log hanya berisi status, durasi, dan jenis error.

---

### Requirement 26: Keamanan Upload dan Validasi File

**User Story:** Sebagai pengembang, saya ingin upload dibatasi tipe dan ukuran, supaya aplikasi terlindungi dari file berbahaya.

#### Acceptance Criteria

1. THE Backend SHALL membatasi total ukuran body request hingga 4 MB (di bawah batas Vercel 4,5 MB).
2. THE Backend SHALL memeriksa tipe file dari isinya (magic bytes), bukan hanya ekstensi.
3. THE Backend SHALL hanya menerima file gambar berformat JPG, PNG, atau WebP untuk fitur Cek Chat.
4. IF file yang diunggah tidak sesuai tipe atau melebihi batas ukuran, THEN THE Backend SHALL mengembalikan pesan error yang jelas.

---

### Requirement 27: Responsivitas dan Aksesibilitas

**User Story:** Sebagai pengguna HP, saya ingin aplikasi tampil rapi dan bisa digunakan dengan nyaman, supaya saya bisa memeriksa pesan mencurigakan kapan saja dari perangkat apa saja.

#### Acceptance Criteria

1. THE Aplikasi SHALL menampilkan layout yang rapi pada lebar layar 360 px tanpa memerlukan scroll horizontal.
2. THE Aplikasi SHALL menyediakan target sentuh minimal 44 px pada semua elemen interaktif.
3. THE Aplikasi SHALL memenuhi kontras teks WCAG AA pada semua teks.
4. THE Aplikasi SHALL menyediakan label pada semua input form.
5. THE Aplikasi SHALL berfungsi pada Chrome Android dan Safari iOS versi terbaru, serta Chrome dan Firefox desktop.

---

### Requirement 28: Kecepatan Respons

**User Story:** Sebagai pengguna, saya ingin hasil pemeriksaan muncul dengan cepat, supaya saya tidak kehilangan waktu saat menghadapi situasi yang mendesak.

#### Acceptance Criteria

1. WHEN pengguna memeriksa di halaman Cek Video & Suara tanpa upload, THE Aplikasi SHALL menampilkan hasil dalam waktu kurang dari 1 detik.
2. WHEN pengguna memeriksa di halaman Cek Link, THE Aplikasi SHALL menampilkan hasil dalam waktu kurang dari 10 detik.
3. WHEN pengguna memeriksa di halaman Cek Chat, THE Aplikasi SHALL menampilkan hasil dalam waktu kurang dari 15 detik.
4. THE Backend SHALL menerapkan timeout per panggilan API pihak ketiga dan melakukan fallback ke hasil Aturan_Lokal jika timeout terlampaui.

---

### Requirement 29: Ketahanan saat Layanan Pihak Ketiga Gagal

**User Story:** Sebagai pengguna, saya ingin alur utama tetap selesai meskipun semua API pihak ketiga mati, supaya saya tetap mendapat penilaian dan langkah tindakan.

#### Acceptance Criteria

1. WHILE semua API pihak ketiga (Gemini, Safe Browsing, RDAP) tidak tersedia, THE Aplikasi SHALL tetap menampilkan hasil dari Aturan_Lokal yang mengikuti susunan Komponen_Hasil bersama.
2. WHILE Gemini_API tidak tersedia, THE Aplikasi SHALL menampilkan keterangan "analisis AI sedang tidak tersedia" pada bagian status layanan.
3. WHILE Safe_Browsing_API tidak tersedia, THE Aplikasi SHALL menampilkan status "Google Safe Browsing: tidak tersedia" dan melanjutkan dengan sumber lain.
4. THE Aplikasi SHALL memastikan setiap hasil dari Aturan_Lokal tetap memuat minimal satu alasan dan dua langkah tindakan.

---

### Requirement 30: Larangan Label dan Kata Terlarang

**User Story:** Sebagai pengguna, saya ingin tidak mendapat klaim keamanan yang menyesatkan, supaya saya tetap waspada dan tidak salah mengambil keputusan.

#### Acceptance Criteria

1. THE Aplikasi SHALL tidak memakai kata "aman", "pasti", "terbukti", atau "100%" sebagai kesimpulan, baik di UI maupun di jawaban AI.
2. THE System_Prompt SHALL melarang Gemini_API menggunakan kata-kata tersebut sebagai kesimpulan.
3. THE Backend SHALL menyaring keluaran AI untuk memastikan tidak ada kata terlarang yang lolos sebagai kesimpulan.
4. WHEN Tingkat_Kewaspadaan bernilai "tidak_ditemukan", THE Komponen_Hasil SHALL menampilkan kalimat "Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman."

---

### Requirement 31: Privasi dan Pengelolaan Data

**User Story:** Sebagai pengguna, saya ingin data saya tidak disimpan setelah sesi selesai, supaya privasi saya terlindungi.

#### Acceptance Criteria

1. THE Aplikasi SHALL tidak menyimpan input pengguna setelah sesi selesai.
2. THE Backend SHALL membuang gambar yang diunggah setelah respons dikirim.
3. THE Aplikasi SHALL tidak menyediakan fitur login, riwayat permanen, atau database pengguna.
4. THE Aplikasi SHALL tidak menggunakan analitik yang mengidentifikasi pengguna secara individual.
5. THE Frontend SHALL menyimpan riwayat Tanya lanjut (P1) hanya di memori browser, bukan di server.

---

### Requirement 32: Endpoint API Backend

**User Story:** Sebagai pengembang, saya ingin endpoint API yang terstruktur dan konsisten, supaya frontend bisa berkomunikasi dengan backend secara seragam.

#### Acceptance Criteria

1. THE Backend SHALL menyediakan endpoint `POST /api/cek-chat` untuk menerima teks atau screenshot dan mengembalikan objek Format_Data_Hasil.
2. THE Backend SHALL menyediakan endpoint `POST /api/cek-link` untuk menerima URL dan mengembalikan objek Format_Data_Hasil.
3. THE Backend SHALL menyediakan endpoint `POST /api/cek-media` untuk menerima data media (P1) dan mengembalikan objek Format_Data_Hasil.
4. THE Backend SHALL menyediakan endpoint `POST /api/tanya` untuk menerima pertanyaan lanjut (P1) dan mengembalikan jawaban dalam konteks yang sama.
5. FOR ALL endpoint, THE Backend SHALL mengembalikan objek Format_Data_Hasil yang valid; parsing respons lalu serialisasi ulang lalu parsing kembali SHALL menghasilkan objek yang setara (round-trip property).

---

### Requirement 33: Kode Bersama dan Struktur Proyek

**User Story:** Sebagai pengembang, saya ingin logika aturan dan skema data berada di satu folder bersama, supaya kode bisa dipakai oleh browser dan server tanpa duplikasi.

#### Acceptance Criteria

1. THE Aplikasi SHALL menyimpan logika aturan di folder `lib/aturan/` yang bisa dipakai oleh browser dan server.
2. THE Aplikasi SHALL menyimpan skema hasil dan penggabungan level di file `lib/hasil.ts`.
3. THE Aplikasi SHALL menyimpan data langkah darurat di file `data/langkah-darurat.json` yang dipakai oleh Panel_Darurat dan System_Prompt.
4. THE Aplikasi SHALL menyimpan daftar merek Indonesia di file `data/merek.json`.
5. THE Aplikasi SHALL menyimpan data skenario contoh di folder `data/contoh/`.

---

### Requirement 34: Navigasi Antar Halaman Cek

**User Story:** Sebagai pengguna yang menerima chat berisi link, saya ingin bisa langsung memeriksa link tersebut tanpa menyalinnya manual, supaya alur pengecekan lebih lancar.

#### Acceptance Criteria

1. WHEN Aturan_Lokal mendeteksi link di dalam teks chat di halaman Cek Chat, THE Komponen_Hasil SHALL menampilkan tombol "Cek link ini" yang membuka halaman Cek Link dengan URL sudah terisi.
2. THE Aplikasi SHALL mengoper URL dari Cek Chat ke Cek Link melalui state aplikasi, bukan melalui query string.
3. WHEN Aturan_Lokal mendeteksi modus video call atau voice note di dalam chat, THE Komponen_Hasil SHALL menampilkan tautan ke halaman Cek Video & Suara.
4. THE Komponen_Hasil SHALL menampilkan tautan ke dua halaman cek lainnya di bagian bawah setiap hasil.

---

### Requirement 35: Halaman Cek Chat — Cek Lagi

**User Story:** Sebagai pengguna, saya ingin bisa memeriksa chat lain setelah melihat hasil, supaya saya bisa mengecek beberapa pesan dalam satu sesi.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Cek lagi" di halaman Cek Chat, THE Aplikasi SHALL mengosongkan area input, hasil, dan riwayat tanya jawab.
2. THE Aplikasi SHALL menampilkan tombol "Cek lagi" di bagian bawah Komponen_Hasil.
3. WHEN pengguna menekan tombol "Cek lagi", THE Aplikasi SHALL mengembalikan halaman ke kondisi awal siap menerima input baru.
