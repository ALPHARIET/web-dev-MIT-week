# PRD Aplikasi Web Cek Penipuan

Nov 8, 2026 · @redexxx

## Ringkasan

Aplikasi web tanpa login untuk membantu anak muda Indonesia memeriksa chat, link, dan video atau suara yang mencurigakan. Aplikasi menunjukkan tanda bahaya, alasannya, dan langkah yang perlu diambil. Ada empat halaman: **Beranda**, **Cek Chat**, **Cek Link**, dan **Cek Video & Suara**.

Ketiga halaman cek memakai satu alur yang sama: **Masukkan → Hasil + alasan → Langkah tindakan → Tanya lanjut**. Pengguna yang pindah dari satu halaman cek ke halaman lain melihat susunan hasil, label, dan tombol yang sama.

Empat prinsip berlaku di semua halaman:

- **Tanpa vonis.** Hasil berupa tingkat kewaspadaan dan alasannya. Label "Aman" tidak pernah dipakai.
- **Tanpa data sensitif.** Tidak ada login, tidak ada database pengguna, dan input tidak disimpan setelah sesi selesai.
- **Jujur soal pihak ketiga.** Setiap input yang dikirim ke layanan luar disebutkan di layar sebelum pengguna menekan tombol periksa.
- **Tetap jalan saat layanan luar gagal.** Hasil dari aturan lokal tetap tampil walau AI atau API pihak ketiga error.

## Latar belakang dan masalah

Penipuan digital di Indonesia terus naik, dan korbannya sering terlambat bertindak. Studi kasus "The Trust Trap" (MIT-Week 2026, tema *Guardians of the Digital Space*) meminta aplikasi web yang sudah di-deploy untuk membantu anak muda mengenali tipuan, belajar memutuskan dengan aman, dan bertindak.

Data yang mendasari fokus produk:

- Indonesia Anti-Scam Centre (IASC) menerima 702.342 laporan penipuan sejak 22 November 2024 hingga 30 September 2026 ([Katadata](https://katadata.co.id/finansial/keuangan/6ad1a3875e700/ojk-terima-702-ribu-laporan-penipuan-simak-cara-melindungi-uang)).
- OJK mencatat 1.379 laporan penipuan yang terindikasi memakai AI hingga Juni 2026. Modus terbanyak adalah investasi bodong dengan deepfake tokoh publik ([iNews/RCTI+](https://www.rctiplus.com/news/detail/berita-utama/5444343/ojk-terima-1-379-laporan-penipuan-berbasis-ai--deepfake-tokoh-publik-jadi-modus-terbanyak)).
- Modus yang paling sering dilaporkan pada Juli 2026 memakai tiruan suara atau video call keluarga, pejabat, atau atasan dalam keadaan darurat ([JournalArta](https://journalarta.com/news/2026/07/20/waspada-penipuan-daring-2026-pakai-ai-rugi-rp75-triliun/)).
- Menurut OJK, 80% pelapor ke IASC baru melapor lebih dari 12 jam setelah kejadian ([detikFinance](https://finance.detik.com/moneter/d-8552960/ojk-bongkar-modus-tipu-tipu-nasabah-hingga-bobol-rekening)). Banyak korban juga tidak tahu harus melapor ke mana ([Katadata](https://katadata.co.id/amp/finansial/keuangan/6a4324b291318/korban-scam-tak-tahu-harus-lapor-ke-mana-kenali-layanan-iasc)).

Masalah yang diselesaikan aplikasi ini ada tiga. Pengguna ragu apakah chat, link, atau video yang mereka terima bisa dipercaya. Mereka tidak tahu tanda bahaya mana yang perlu diperhatikan. Dan setelah sadar menjadi target, mereka tidak tahu langkah pertama yang harus diambil.

## Tujuan dan indikator keberhasilan

Produk berhasil kalau juri bisa membuka tautan live, memilih satu halaman cek, dan sampai ke hasil beserta langkah tindakan tanpa error dalam waktu kurang dari dua menit.

Tujuan produk:

1. **Recognize.** Pengguna melihat tanda bahaya yang spesifik pada chat, link, atau video/suara yang mereka bawa, beserta alasannya.
2. **Learn.** Setiap temuan menjelaskan cara kerja modusnya, sehingga pengguna bisa mengenali pola yang sama di lain waktu.
3. **Act.** Setiap hasil memberi langkah konkret, termasuk untuk yang sudah terlanjur klik, mengirim OTP, atau transfer.

| Indikator | Target | Cara cek |
| --- | --- | --- |
| Alur utama tiap halaman cek selesai tanpa error | 3 dari 3 halaman | Uji alur memakai tombol "Coba contoh" di tautan live |
| Waktu sampai hasil tampil | Cek Video & Suara (tanpa upload) < 1 detik, Cek Link < 10 detik, Cek Chat < 15 detik | Ukur 10 kali per halaman di jaringan seluler |
| Hasil tetap tampil saat AI atau API gagal | Ya, di ketiga halaman | Matikan API key di staging, lalu jalankan contoh |
| Setiap hasil memuat alasan dan langkah | Minimal 1 alasan + 2 langkah | Review semua skenario contoh |
| Tidak ada label "Aman" atau klaim pasti | 0 kemunculan | Cari kata "aman", "pasti", "100%" di kode dan prompt |
| Pemberitahuan pihak ketiga tampil sebelum kirim | Ya, di setiap input yang keluar dari browser | Review UI per halaman |
| Tampilan layak di HP | Lebar 360 px tanpa scroll ke samping | Uji di Chrome DevTools dan satu HP asli |

## Target pengguna dan skenario

Pengguna utama adalah anak muda usia 18 tahun ke atas: mahasiswa, pencari kerja, dan pekerja awal yang aktif di WhatsApp, Telegram, dan media sosial. Batas 18+ ini dipilih karena ketentuan Gemini API melarang pemakaiannya di aplikasi yang ditujukan atau kemungkinan diakses pengguna di bawah 18 tahun ([Gemini API Additional Terms, berlaku 23 Maret 2026](https://ai.google.dev/terms)). Lihat keputusan terbuka di bagian terakhir.

Pengguna kedua adalah anak muda yang membantu orang tua atau kerabat. Mereka memakai aplikasi untuk memeriksa pesan yang diteruskan keluarga, lalu mengirim peringatan lewat templat pesan.

| Situasi pengguna | Halaman | Contoh fiktif untuk tombol "Coba contoh" |
| --- | --- | --- |
| Ditawari kerja paruh waktu "like dan review" dengan gaji harian besar | Cek Chat | Rekruter minta pindah ke Telegram dan membayar "biaya pendaftaran" Rp150.000 |
| Kurir atau "bank" minta kode OTP | Cek Chat | Pesan "paket tertahan, sebutkan kode 6 digit yang masuk" |
| Dapat link "klaim hadiah" atau "verifikasi akun" | Cek Link | Domain mirip merek bank dengan TLD murah dan kata "hadiah" |
| Link pendek dari grup keluarga | Cek Link | Link pemendek yang mengarah ke domain baru |
| Video call "kakak" dari nomor baru, minta transfer karena kecelakaan | Cek Video & Suara | Situasi darurat + nomor baru + menolak ditelepon balik |
| Voice note "atasan" minta dibelikan voucher | Cek Video & Suara | Suara mirip, minta dirahasiakan, desakan waktu |
| Video tokoh publik mempromosikan investasi untung pasti | Cek Video & Suara | Tokoh terkenal + janji untung + link ke WhatsApp |

## Ruang lingkup

MVP adalah empat halaman dengan satu alur cek yang stabil per halaman. Fitur P1 dikerjakan setelah semua P0 lolos uji di tautan live.

| Fitur | Halaman | Prioritas |
| --- | --- | --- |
| Panel panduan, tiga kartu menu, ringkasan privasi dan batasan | Beranda | P0 |
| Komponen hasil bersama (tingkat kewaspadaan, temuan, langkah, batasan) | Semua halaman cek | P0 |
| Tombol "Coba contoh" dengan skenario fiktif | Semua halaman cek | P0 |
| Panel "Sudah terlanjur?" berisi langkah darurat dan kanal lapor | Semua halaman cek | P0 |
| Input teks dan screenshot, pra-pemindaian aturan, analisis Gemini | Cek Chat | P0 |
| Analisis leksikal lokal, Google Safe Browsing, umur domain via RDAP | Cek Link | P0 |
| Pilih situasi, pertanyaan konteks, skor aturan, langkah verifikasi | Cek Video & Suara | P0 |
| Tanya lanjut (chatbot) dengan 2-3 pertanyaan cepat, dibangun sekali sebagai komponen bersama | Semua halaman cek | P1 |
| Sorotan kalimat atau bagian URL yang mencurigakan | Cek Chat, Cek Link | P1 |
| VirusTotal sebagai sumber reputasi kedua | Cek Link | P1 |
| Checklist pengamatan visual dan audio | Cek Video & Suara | P1 |
| Unggah video/audio, ekstrak frame di browser, Reality Defender | Cek Video & Suara | P1 |
| Templat pesan untuk memperingatkan keluarga dan teman | Semua halaman cek | P1 |
| Pemandu halaman berbasis skrip (tooltip kontekstual) | Semua halaman cek | P1 |

Tidak dikerjakan di versi ini:

- Login, riwayat permanen, dan database laporan penipuan.
- Unduh otomatis video dari link YouTube, TikTok, atau Instagram.
- Membuka atau mengambil HTML halaman yang dicek (risiko SSRF dan konten berbahaya).
- Cek nomor telepon atau nomor rekening.
- Integrasi langsung ke WhatsApp atau aplikasi lain.
- Pelacakan gerak kursor yang dikirim ke server.

## Arsitektur informasi dan alur

Aplikasi punya empat halaman dan satu komponen hasil yang dipakai bersama. Beranda hanya mengarahkan, sedangkan ketiga halaman cek berbeda di cara input tapi sama di cara menampilkan hasil.

&#91;embedded content: alur antarhalaman · 4 halaman, 1 komponen hasil\]

Apa pun inputnya, setiap halaman cek menghasilkan objek format data yang sama, sehingga pengguna selalu melihat level, alasan, langkah, dan panel "Sudah terlanjur?" di urutan yang sama.

Navigasi antarhalaman:

- Header di semua halaman memuat tautan ke ketiga halaman cek, jadi pengguna bisa pindah tanpa kembali ke Beranda.
- Kalau Cek Chat menemukan link di dalam chat, hasilnya menampilkan tombol "Cek link ini" yang membuka Cek Link dengan URL sudah terisi. URL dioper lewat state aplikasi, bukan query string.
- Kalau Cek Chat menemukan modus video call atau voice note, hasilnya menampilkan tautan ke Cek Video & Suara.

## Standar bersama lintas halaman

Ketiga halaman cek memakai label, susunan hasil, format data, dan gaya bahasa yang sama. Standar ini menggantikan istilah berbeda di deskripsi awal tiap halaman.

### Tingkat kewaspadaan

| Label | Warna | Dipakai saat | Kalimat pembuka di hasil |
| --- | --- | --- | --- |
| Waspada tinggi | Merah | Kombinasi tanda berbahaya ditemukan, skor aturan ≥ ambang tinggi, atau sumber reputasi menandai link | "Ada beberapa tanda kuat yang mirip pola penipuan. Jangan lanjutkan sebelum memverifikasi." |
| Perlu hati-hati | Oranye | Ada tanda bahaya, tapi belum cukup kuat | "Ada tanda yang perlu kamu cek dulu sebelum lanjut." |
| Tidak ditemukan tanda bahaya | Abu-abu, bukan hijau | Tidak ada aturan yang terpicu dan sumber luar tidak menandai | "Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman." |

Aturan penentuan level:

- Aturan lokal menentukan level minimum. AI dan API pihak ketiga hanya boleh menaikkan level, tidak pernah menurunkannya.
- Angka skor dipakai di belakang layar saja. Pengguna hanya melihat label dan alasannya.
- Kata "aman", "pasti", "terbukti", dan "100%" tidak dipakai sebagai kesimpulan, baik di UI maupun di jawaban AI.

### Susunan halaman hasil

Urutan blok ini sama di ketiga halaman cek:

1. **Tingkat kewaspadaan** + ringkasan satu kalimat.
2. **Yang perlu diwaspadai.** Setiap temuan berisi judul, alasan kenapa berisiko, bukti (kutipan kalimat atau bagian URL), dan sumbernya (aturan, AI, atau nama API).
3. **Yang tampak wajar** (jika ada), supaya hasil seimbang dan tidak menakut-nakuti.
4. **Langkah yang disarankan**, minimal dua langkah.
5. **Panel "Sudah terlanjur?"** untuk yang sudah klik, mengisi data, mengirim OTP, atau transfer.
6. **Batasan + layanan pihak ketiga** yang dipakai untuk hasil ini.
7. **Tanya lanjut** (P1).
8. Tombol **"Cek lagi"** dan tautan ke dua halaman cek lainnya.

### Format data hasil

Semua endpoint backend dan logika di browser mengembalikan objek yang sama, sehingga satu komponen hasil bisa dipakai di tiga halaman.

```json
{
  "halaman": "chat | link | video",
  "level": "tinggi | sedang | tidak_ditemukan",
  "ringkasan": "1-2 kalimat",
  "temuan": [
    {
      "judul": "Meminta kode OTP",
      "penjelasan": "Kenapa ini berisiko dan cara kerja modusnya",
      "bukti": "kutipan kalimat atau bagian URL",
      "sumber": "aturan | ai | safe_browsing | rdap | virustotal | reality_defender"
    }
  ],
  "hal_wajar": ["..."],
  "langkah": ["..."],
  "situasi_darurat": ["klik_link", "isi_data", "kirim_otp", "transfer"],
  "batasan": "...",
  "pihak_ketiga": ["Google Gemini"],
  "status_layanan": { "ai": "ok | gagal | tidak_dipakai" }
}
```

### Nama, alamat, dan gaya bahasa

| Halaman | Nama di menu | Alamat |
| --- | --- | --- |
| Beranda | Beranda | `/` |
| Cek Chat | Cek Chat | `/cek-chat` |
| Cek Link | Cek Link | `/cek-link` |
| Cek Video & Suara | Cek Video & Suara | `/cek-video-suara` |

- Sapaan memakai "kamu", bahasa sederhana, tidak menggurui.
- Tombol utama di semua halaman cek berlabel **"Periksa"**.
- Setiap temuan selalu disertai alasan. Setiap hasil selalu ditutup dengan langkah praktis.

### Komponen UI bersama

- **Header**: nama aplikasi + tautan ke tiga halaman cek, tampil di semua halaman.
- **Kotak privasi**: peringatan "jangan masukkan OTP, PIN, password, atau nomor rekening asli" + daftar layanan pihak ketiga yang dipakai halaman itu.
- **Tombol "Coba contoh"**: mengisi input dengan skenario fiktif.
- **Kartu hasil**: blok 1-6 di atas, dibentuk dari objek format data.
- **Panel "Sudah terlanjur?"** dan **panel Tanya lanjut**.
- **Footer**: tautan ke bagian "Cara kerja dan batasan" di Beranda.

## Halaman 1: Beranda

Beranda adalah gerbang ke tiga halaman cek. Tata letak mengikuti wireframe tim: panel panduan memanjang di atas, lalu tiga kartu menu bertumpuk di bawahnya. Tidak ada login dan tidak ada pop-up yang harus ditutup.

### Susunan

1. **Panel panduan (hero)**, tampil langsung tanpa klik.
2. **Tiga kartu menu**, bertumpuk vertikal dan selebar layar. Urutan yang disarankan: Cek Chat, Cek Link, Cek Video & Suara (lihat keputusan terbuka).
3. **Cara kerja dan batasan**, berupa akordeon di bawah kartu. Bagian ini menggantikan halaman "Tentang" terpisah.
4. **Footer** berisi daftar layanan pihak ketiga dan catatan "untuk pengguna 18 tahun ke atas".

### Teks yang disarankan

**Judul hero:** Ragu sama chat, link, atau video call yang kamu terima? Cek dulu di sini.

**Cara pakai (4 langkah):** Pilih yang mau dicek → Tempel isinya atau jawab beberapa pertanyaan → Lihat tanda bahaya dan alasannya → Ikuti langkah yang disarankan.

**Catatan privasi:** Tanpa login. Kami tidak menyimpan isi yang kamu periksa. Sebagian pengecekan dikirim ke layanan pihak ketiga, dan kami selalu menyebutkannya sebelum kamu menekan Periksa. Hasil di sini membantu kamu menilai, bukan keputusan akhir.

| Kartu | Judul | Deskripsi singkat |
| --- | --- | --- |
| 1 | Cek Chat | Tempel isi chat atau unggah screenshot. Untuk tawaran kerja, permintaan OTP, atau pesan yang mengaku dari bank. |
| 2 | Cek Link | Periksa alamat link tanpa membukanya. Untuk link hadiah, verifikasi akun, atau link pendek. |
| 3 | Cek Video & Suara | Jawab beberapa pertanyaan tentang video call, voice note, atau video tokoh yang kamu terima. |

### Kebutuhan fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| LP-01 | Panel panduan memuat sambutan, tujuan aplikasi, 4 langkah cara pakai, dan catatan privasi | P0 |
| LP-02 | Klik kartu membuka halaman cek terkait (`/cek-chat`, `/cek-link`, `/cek-video-suara`) | P0 |
| LP-03 | Akordeon "Cara kerja dan batasan" menjelaskan cara penilaian tiap halaman, apa yang tidak bisa dideteksi, dan data apa yang dikirim ke mana | P0 |
| LP-04 | Tampilan rapi di lebar 360 px sampai desktop | P0 |
| LP-05 | Teks tidak memakai kata "aman" atau "pasti" sebagai janji hasil | P0 |

## Halaman 2: Cek Chat

Pengguna menempel teks chat atau mengunggah screenshot, lalu mendapat tingkat kewaspadaan, penjelasan setiap pola yang mencurigakan, dan langkah yang disarankan. Alur dan gaya respons mengikuti deskripsi fitur dari tim, dengan tiga tambahan: pra-pemindaian aturan di browser, label tingkat kewaspadaan bersama, dan sensor otomatis sebelum teks dikirim.

### Alur

1. **Masuk halaman.** Penjelasan singkat cara kerja, catatan "hasil bersifat edukasi, bukan keputusan akhir", dan kotak privasi.
2. **Input.** Pilih tab *Tempel teks* atau *Unggah screenshot* (maksimal 5 gambar). Kolom konteks opsional, misalnya "dari nomor tidak dikenal" atau "mengaku dari bank".
3. **Validasi.** Input tidak boleh kosong. Teks maksimal 4.000 karakter. Gambar berformat JPG, PNG, atau WebP. Browser mengecilkan setiap gambar (lebar maksimal 1.600 px, JPEG) sebelum dikirim, supaya total kiriman di bawah 4 MB.
4. **Sensor dan pratinjau.** Browser mengganti deretan 4-8 angka, nomor HP, nomor rekening, dan alamat email dengan `[disensor]`, lalu menampilkan pratinjau teks yang akan dikirim. Screenshot tidak bisa disensor otomatis, jadi pengguna diingatkan untuk memotong atau menutup data sensitif.
5. **Pra-pemindaian aturan.** Untuk input teks, aturan lokal berjalan di browser dan menghasilkan level minimum. Hasil ini tetap tampil walau AI gagal.
6. **Analisis AI.** Backend mengirim input ke Gemini dengan system prompt dan skema JSON format data bersama. Untuk screenshot, Gemini juga mengembalikan transkrip teks, lalu aturan dijalankan di server atas transkrip itu. Level akhir = level tertinggi dari aturan dan AI.
7. **Hasil.** Memakai susunan hasil bersama. Kalimat yang memicu temuan disorot di transkrip (P1).
8. **Tanya lanjut (P1).** Pengguna bertanya dalam konteks yang sama. Riwayat disimpan di memori browser saja, maksimal 10 pertanyaan per sesi.
9. **Cek chat lain.** Mengosongkan input, hasil, dan riwayat tanya jawab.

### Aturan pra-pemindaian (awal)

| Pola | Contoh kata atau frasa | Bobot |
| --- | --- | --- |
| Meminta OTP, PIN, atau password | "kode OTP", "6 digit", "kode verifikasi", "PIN" | Langsung waspada tinggi |
| Meminta transfer, pulsa, atau voucher | "transfer", "top up", "kirim pulsa", "voucher" | +3 |
| Biaya di muka | "biaya admin", "biaya pendaftaran", "deposit dulu" | +3 |
| Desakan waktu | "segera", "hari ini juga", "24 jam", "diblokir" | +2 |
| Mengaku keluarga ganti nomor | "ini nomor baru", "HP rusak", "pinjam HP teman" | +2 |
| Mengaku pihak resmi | "dari bank", "CS", "kurir", "polisi", "BPJS" | +2 |
| Gaji besar tanpa syarat | "gaji harian", "tanpa pengalaman", "kerja dari HP", "like dan review" | +2 |
| Pindah aplikasi | "lanjut di Telegram", "chat WA saya" | +1 |
| Hadiah atau undian | "selamat anda", "pemenang", "klaim hadiah" | +2 |
| Kirim file aplikasi | ".apk", "undangan.apk", "lihat foto paket" | +3 |
| Ada link di pesan | pola URL | +1 (link diteruskan ke Cek Link) |

Ambang: skor ≥ 6 atau kombinasi "minta uang/OTP" + "desakan/rahasia" = Waspada tinggi. Skor 3-5 = Perlu hati-hati.

### Perilaku AI (system prompt)

- Bahasa Indonesia sederhana, sapaan "kamu", tidak menggurui.
- Tidak memberi vonis. Memakai frasa seperti "ada beberapa tanda yang mirip pola penipuan".
- Setiap temuan disertai alasan dan bukti kutipan. Setiap jawaban ditutup dengan langkah praktis.
- Tidak meminta data pribadi. Kalau pengguna menulis data sensitif, AI mengingatkan dan tidak mengulanginya.
- Tidak menyarankan membalas pelaku dan menolak membantu membuat pesan penipuan.
- Pertanyaan di luar topik keamanan digital ditolak dengan sopan.
- Keluaran mengikuti skema JSON bersama. Kalau JSON tidak valid, backend memakai hasil aturan saja.

### Kondisi khusus

| Kondisi | Respons |
| --- | --- |
| Screenshot buram atau tidak terbaca | Minta unggah ulang atau tempel teksnya |
| Input bukan percakapan | Jelaskan bahwa tidak ada chat yang bisa dianalisis |
| Chat terlalu pendek | Sampaikan keterbatasan dan sarankan menambah konteks |
| Error API atau timeout 20 detik | Tampilkan hasil aturan + "analisis AI sedang tidak tersedia" + tombol coba lagi. Input tidak hilang |
| Pengguna sudah transfer atau mengirim OTP | Buka panel "Sudah terlanjur?" di posisi teratas |

### Kebutuhan fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| CH-01 | Input teks dan screenshot dengan validasi | P0 |
| CH-02 | Sensor otomatis dan pratinjau teks sebelum dikirim | P0 |
| CH-03 | Pra-pemindaian aturan di browser dengan level minimum | P0 |
| CH-04 | Analisis Gemini melalui backend, keluaran sesuai skema bersama | P0 |
| CH-05 | Tiga contoh fiktif di tombol "Coba contoh" | P0 |
| CH-06 | Fallback ke hasil aturan saat AI gagal | P0 |
| CH-07 | Sorotan kalimat pemicu di transkrip | P1 |
| CH-08 | Tanya lanjut dengan pertanyaan cepat | P1 |

## Halaman 3: Cek Link

Pengguna menempel URL atau nama domain, lalu aplikasi memeriksanya tanpa pernah membuka link itu. Hasilnya berupa tingkat kewaspadaan, bagian URL yang mencurigakan, dan alasannya. Lima fase dari workflow tim tetap dipakai, tetapi level ditentukan oleh aturan dan data API. AI hanya menjelaskan dan tidak lagi menyatakan "Aman" atau memberi skor angka.

### Alur

1. **Masuk halaman.** Kotak privasi dan tombol "Coba contoh". Pemandu halaman (P1) memberi petunjuk berbasis skrip saat kolom input disentuh, saat tombol Periksa ditekan sebelum kolom terisi, atau setelah pengguna diam 8 detik. Pemandu tidak memanggil AI dan tidak mengirim data apa pun.
2. **Input.** Satu kolom untuk URL atau domain, maksimal 2.000 karakter. Link ditampilkan sebagai teks, tidak pernah bisa diklik.
3. **Sanitasi.** Browser dan backend mengurai URL menjadi protokol, subdomain, domain utama, TLD, path, dan parameter. Parameter yang terlihat sensitif (email, nomor HP, token, session, id) dibuang sebelum dikirim ke pihak ketiga.
4. **Pemeriksaan paralel** (batas 5 detik per sumber):
   - **Analisis leksikal lokal** (selalu jalan, tanpa API).
   - **Google Safe Browsing**: apakah URL ada di daftar phishing atau malware.
   - **Umur domain lewat RDAP**: tanggal registrasi domain.
   - **VirusTotal** (P1): reputasi dari banyak mesin pemindai.
5. **Penentuan level** oleh aturan dari paket diagnostik (lihat tabel di bawah).
6. **Penjelasan AI.** Paket diagnostik (tanpa data pengguna) dikirim ke Gemini untuk ditulis ulang menjadi penjelasan edukatif sesuai skema bersama. Kalau AI gagal, setiap aturan punya teks penjelasan bawaan.
7. **Hasil.** Susunan hasil bersama + URL yang dipecah per bagian dengan bagian mencurigakan disorot (P1) + status tiap sumber, misalnya "Google Safe Browsing: tidak ada di daftar ancaman (bukan jaminan aman)".
8. **Tanya lanjut (P1)** dengan pertanyaan cepat seperti "Saya sudah terlanjur klik, terus gimana?" dan "Kenapa situs phishing bisa punya gembok HTTPS?"

### Aturan dan sinyal

| Sinyal | Sumber | Bobot |
| --- | --- | --- |
| Ada di daftar Google Safe Browsing | API | Langsung waspada tinggi |
| Nama mirip merek (BCA, BRI, BNI, Mandiri, BSI, DANA, OVO, GoPay, Shopee, Tokopedia, BPJS, JNE, J&T, Pos Indonesia), termasuk angka pengganti huruf seperti `sh0pee` | Leksikal | +3 |
| Domain berumur kurang dari 30 hari | RDAP | +3 |
| Punycode atau karakter mirip (`xn--`) | Leksikal | +3 |
| Alamat berupa IP | Leksikal | +3 |
| Kata pemicu di domain atau path: hadiah, klaim, undian, verifikasi, login, promo | Leksikal | +2 |
| Lebih dari 3 subdomain, atau nama merek di subdomain dan bukan di domain utama | Leksikal | +2 |
| TLD yang sering disalahgunakan (daftar dikelola tim) | Leksikal | +1 |
| Layanan pemendek link | Leksikal | +1, disertai saran membuka pratinjau tujuan link dari layanan pemendeknya |
| Karakter `@` di URL atau URL lebih dari 200 karakter | Leksikal | +1 |
| Ditandai berbahaya oleh VirusTotal | API (P1) | +3 |

Ambang sama dengan halaman lain: skor ≥ 6 atau kombinasi "mirip merek" + "domain baru" = Waspada tinggi. Skor 3-5 = Perlu hati-hati. Umur domain yang tidak tersedia ditampilkan sebagai "tidak tersedia", bukan dihitung aman.

### Ketentuan dari penyedia API

- Google Safe Browsing API hanya untuk penggunaan non-komersial. Peringatan wajib mencantumkan atribusi "Advisory provided by Google" dengan tautan ke Safe Browsing Advisory, dan pengguna wajib diberi tahu bahwa ada kemungkinan *false positive* dan *false negative* ([Google Developers](https://developers.google.com/safe-browsing/v4/usage-limits)).
- VirusTotal Public API dibatasi 500 permintaan per hari dan 4 per menit, serta tidak boleh dipakai di produk komersial ([VirusTotal Docs](https://docs.virustotal.com/docs/public-vs-premium-api)).

### Kebutuhan fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| LN-01 | Input URL/domain, link tidak pernah dibuka atau dibuat bisa diklik | P0 |
| LN-02 | Analisis leksikal lokal dengan daftar merek Indonesia | P0 |
| LN-03 | Pengecekan Google Safe Browsing dan umur domain via RDAP, paralel dengan timeout | P0 |
| LN-04 | Level ditentukan aturan, penjelasan oleh AI dengan fallback teks bawaan | P0 |
| LN-05 | Contoh fiktif memakai respons API simulasi, sehingga tidak memakan kuota dan tidak menyentuh domain nyata | P0 |
| LN-06 | Sensor parameter sensitif sebelum dikirim ke pihak ketiga | P0 |
| LN-07 | URL dipecah per bagian dengan sorotan | P1 |
| LN-08 | VirusTotal sebagai sumber kedua | P1 |
| LN-09 | Pemandu halaman berbasis skrip | P1 |

## Halaman 4: Cek Video & Suara

Pengguna menjawab beberapa pertanyaan tentang video call, voice note, atau video tokoh yang mereka terima. Aplikasi lalu menilai konteksnya dengan aturan di browser dan memberi langkah verifikasi. Penilaian utama berasal dari konteks karena deteksi deepfake otomatis tidak bisa diandalkan dan brief melarang klaim deteksi pasti. Unggah file ke API deteksi adalah sinyal tambahan (P1) yang hanya boleh menaikkan level.

Nama halaman di Beranda diubah dari "Deteksi Video AI (Deepfake)" menjadi "Cek Video & Suara", supaya tidak menjanjikan deteksi yang tidak bisa dipenuhi.

### Alur (wizard 4 langkah)

1. **Pilih situasi**, berupa tiga kartu:
   - Sedang atau baru saja menerima video call/telepon
   - Menerima rekaman video atau voice note
   - Melihat video tokoh, pejabat, atau artis di media sosial
2. **Pertanyaan konteks**: 5-7 pilihan ganda, sedikit berbeda per situasi (tabel di bawah).
3. **Checklist pengamatan** (P1, opsional). Pengguna mencentang yang mereka lihat atau dengar: bibir tidak sinkron, kedipan aneh, tepi wajah blur saat menoleh, wajah rusak saat tangan lewat, cahaya wajah beda dengan latar, suara datar tanpa tarikan napas, jeda janggal sebelum menjawab. Ada catatan: "Deepfake yang bagus bisa tidak menunjukkan tanda ini. Tidak menemukan tanda bukan berarti video itu asli."
4. **Analisis file dengan AI** (P1, toggle default mati). Penjelasannya ada di bawah.

Hasil muncul langsung di browser tanpa API, memakai susunan hasil bersama.

### Pertanyaan dan bobot

| Pertanyaan | Jawaban yang memicu | Bobot |
| --- | --- | --- |
| Apa yang diminta? | OTP, PIN, atau data akun | +4 |
|  | Transfer, pulsa, atau voucher | +3 |
|  | Klik link atau instal aplikasi | +2 |
|  | Investasi atau janji keuntungan | +3 |
| Dari nomor atau akun mana? | Nomor baru dengan alasan "ganti nomor" | +2 |
|  | Akun media sosial yang tidak dikenal | +1 |
| Ada keadaan darurat atau desakan waktu? | Kecelakaan, ditahan, sakit, "sekarang juga" | +2 |
| Diminta merahasiakan dari orang lain? | Ya | +2 |
| Bisa ditelepon balik atau diverifikasi? | Menolak, kamera "rusak", sinyal selalu buruk | +3 |
| Siapa yang tampil? | Tokoh publik (khusus situasi video tokoh) | +1 |
| Ada janji untung pasti, hadiah, atau ajakan ke WA/Telegram? | Ya (khusus situasi video tokoh) | +3 |
| Tanda di checklist pengamatan | Per tanda yang dicentang | +1 |

Ambang: skor ≥ 6 atau kombinasi (minta uang/OTP + darurat/rahasia) atau (tokoh publik + janji untung) = Waspada tinggi. Skor 3-5 = Perlu hati-hati.

### Langkah verifikasi per situasi

- **Keluarga atau teman:** tutup panggilan, telepon balik ke nomor lama yang tersimpan, tanyakan hal yang hanya kalian tahu atau pakai kode rahasia keluarga, hubungi anggota keluarga lain.
- **Atasan, dosen, atau instansi:** konfirmasi lewat jalur resmi seperti nomor atau email kantor, bukan kontak dari si penelepon.
- **Tokoh publik atau investasi:** cek akun dan situs resmi tokoh itu, lalu cek legalitas penawaran di Kontak OJK 157.
- **Saat masih tersambung:** minta dia menoleh penuh ke samping atau melambaikan tangan di depan wajah. Sebagian deepfake rusak saat itu, tapi cara ini tidak selalu berhasil.

### Analisis file dengan AI (P1)

- **Video:** browser memutar file di elemen `<video>` tersembunyi, mengambil 3-5 frame lewat `<canvas>`, lalu hanya mengirim frame sebagai gambar. Video utuh tidak pernah keluar dari perangkat dan tidak butuh ffmpeg atau server container.
- **Audio:** file dikirim apa adanya lewat backend.
- **Penyedia:** Reality Defender. Paket gratisnya tanpa kartu kredit, maksimal 50 scan per bulan, untuk audio dan gambar. Deteksi video hanya ada di paket berbayar. Audio harus berdurasi 12 detik sampai 5 menit, dan bahasa yang didukung tidak termasuk bahasa Indonesia ([Reality Defender](https://www.realitydefender.com/api-email-campaign)). Keterbatasan bahasa ini ditulis di hasil.
- **Aturan tampilan:** hasil API ditampilkan sebagai "sinyal tambahan", bukan vonis. Kalau konteks berlevel tinggi tapi API menyebut "kemungkinan asli", level tetap Waspada tinggi.
- **Kuota habis atau API gagal:** hasil konteks tetap tampil dengan catatan "analisis file sedang tidak tersedia".

### Kebutuhan fungsional

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| VS-01 | Pilih situasi dan pertanyaan konteks per situasi | P0 |
| VS-02 | Skor aturan di browser dan hasil dengan susunan bersama | P0 |
| VS-03 | Langkah verifikasi sesuai situasi dan jawaban | P0 |
| VS-04 | Tiga skenario fiktif di tombol "Coba contoh" | P0 |
| VS-05 | Checklist pengamatan visual dan audio | P1 |
| VS-06 | Unggah video/audio, ekstrak frame di browser, panggil Reality Defender lewat backend | P1 |
| VS-07 | Tanya lanjut dengan konteks jawaban (tanpa file) | P1 |

## Panduan tindakan bersama

Bagian "Act" tidak dibuat sebagai halaman kelima. Isinya tampil sebagai panel "Sudah terlanjur?" di setiap hasil, dari satu sumber data `langkah-darurat.json`. File yang sama juga dimasukkan ke system prompt AI, supaya kanal lapor yang disebut AI sama dengan yang tampil di UI.

### Panel "Sudah terlanjur?"

Pengguna memilih satu situasi, lalu checklist yang sesuai terbuka. Kalau AI atau aturan mendeteksi pengguna sudah transfer atau mengirim OTP, panel ini otomatis terbuka di posisi teratas.

| Situasi | Langkah utama |
| --- | --- |
| Sudah klik link, belum mengisi apa pun | Tutup halamannya. Jangan mengisi apa pun. Jangan memasang file `.apk` yang terunduh. Hapus file unduhan itu. |
| Sudah mengisi password atau data akun | Ganti password lewat aplikasi atau situs resmi, bukan dari link tadi. Aktifkan verifikasi dua langkah. Keluarkan semua perangkat yang tidak dikenal. |
| Sudah mengirim OTP | Hubungi call center bank atau penyedia layanan lewat nomor resmi di kartu atau aplikasi, sekarang juga. Untuk WhatsApp, cek menu Perangkat Tertaut dan keluarkan perangkat asing. |
| Sudah transfer | Hubungi bank pengirim untuk meminta pemblokiran, lalu lapor ke IASC secepatnya. Siapkan kronologi, nomor rekening pelaku, nilai kerugian, dan bukti transaksi. |
| Akun diambil alih | Pulihkan akun lewat fitur resmi aplikasinya. Kabari kontak bahwa akunmu sedang dipakai orang lain. |

### Kanal lapor

- **Indonesia Anti-Scam Centre (IASC)**: laporan penipuan keuangan hanya lewat situs resmi [iasc.ojk.go.id](https://iasc.ojk.go.id) ([Investortrust](https://investortrust.id/financial/61278/ojk-iasc-tenerima-74243-laporan-kasus-penipuan-hingga-23-maret-2025-kerugian-capai-rp-1-4-triliun)). Formulirnya meminta identitas korban, kronologi, nomor rekening pelaku, nilai kerugian, dan bukti transaksi. Semakin cepat laporan masuk, semakin besar peluang dana diselamatkan ([Katadata](https://katadata.co.id/amp/finansial/keuangan/6a4324b291318/korban-scam-tak-tahu-harus-lapor-ke-mana-kenali-layanan-iasc)).
- **Kontak OJK**: telepon 157, WhatsApp 081-157-157-157, atau email konsumen@ojk.go.id ([Kontan](https://nasional.kontan.co.id/news/waspada-penipuan-keuangan-melonjak-awal-ramadan-2026-begini-cara-lapor-ojk)).
- **Bank atau dompet digital**: nomor call center resmi yang tertera di kartu atau aplikasi.
- **Platform tempat pesan diterima**: fitur Laporkan dan Blokir di WhatsApp, Telegram, Instagram, atau TikTok.

Panel ini juga memuat peringatan: waspadai pihak yang mengaku sebagai perwakilan IASC dan menjanjikan uang kembali.

### Peringatkan orang lain (P1)

Tombol "Kirim peringatan" membuka templat pesan yang bisa disalin atau langsung dibagikan ke WhatsApp. Templat tidak memuat data pengguna. Contoh:

> Hati-hati, ada pesan yang mengaku dari \[pihak\] dan minta \[OTP/transfer/klik link\]. Tandanya: \[tanda utama\]. Kalau kamu dapat pesan serupa, jangan dibalas dan cek dulu lewat nomor resmi.

## Privasi, keamanan, dan transparansi

Aplikasi tidak menyimpan apa pun tentang pengguna. Semua yang keluar dari browser disebutkan di layar sebelum tombol Periksa ditekan, dan input yang dikirim dikurangi seminimal mungkin.

| Halaman | Yang keluar dari browser | Dikirim ke | Disimpan |
| --- | --- | --- | --- |
| Beranda | Tidak ada | - | Tidak |
| Cek Chat | Teks yang sudah disensor atau screenshot, konteks tambahan, riwayat tanya lanjut | Backend → Google Gemini | Tidak. Gambar dibuang setelah respons |
| Cek Link | URL tanpa parameter sensitif | Backend → Google Safe Browsing, server RDAP, VirusTotal (P1). Paket diagnostik tanpa data pengguna → Google Gemini | Tidak |
| Cek Video & Suara | Tidak ada untuk penilaian konteks. Frame gambar atau audio hanya jika toggle AI dinyalakan | Backend → Reality Defender (P1). Jawaban konteks tanpa file → Google Gemini untuk tanya lanjut (P1) | Tidak |

### Catatan penting soal Gemini tier gratis

Menurut ketentuan Gemini API yang berlaku sejak 23 Maret 2026, input pada layanan gratis dipakai Google untuk mengembangkan produknya. Peninjau manusia juga bisa membaca input dan output tersebut, dan Google meminta agar data sensitif, rahasia, atau pribadi tidak dikirim ke layanan gratis. Akses Gemini API dihitung sebagai layanan berbayar hanya jika lewat Cloud Project dengan akun billing aktif ([Gemini API Additional Terms](https://ai.google.dev/terms)).

Screenshot chat hampir selalu memuat nama dan nomor orang lain. Karena itu, PRD ini menyarankan akun billing aktif dengan batas anggaran kecil, plus sensor otomatis. Kalau tim tetap memakai tier gratis, kotak privasi Cek Chat wajib menyebutkan bahwa input bisa dibaca peninjau Google.

### Teks pemberitahuan per halaman

- **Cek Chat:** "Teks atau screenshot akan dikirim ke Google Gemini untuk dianalisis. Jangan sertakan OTP, PIN, password, atau nomor rekening. Tutup nama dan nomor HP di screenshot kalau bisa."
- **Cek Link:** "Alamat link dikirim ke Google Safe Browsing dan layanan data domain untuk dicek. Link tidak akan kami buka."
- **Cek Video & Suara (toggle AI):** "Frame gambar atau audio akan dikirim ke Reality Defender. Video utuh tetap di perangkatmu. File tidak kami simpan."

### Keamanan teknis

- Semua API key disimpan sebagai environment variable di server, tidak pernah di kode frontend.
- Batas permintaan per IP: misalnya 10 cek per menit dan 100 per hari per halaman, supaya kuota tidak habis saat demo.
- Backend tidak mencatat isi input di log. Log hanya berisi status, durasi, dan jenis error.
- Aplikasi tidak pernah mengambil atau membuka URL yang dicek pengguna, sehingga tidak ada risiko SSRF dari fitur Cek Link.
- Upload dibatasi tipe dan ukuran. Tipe file dicek dari isinya, bukan hanya ekstensi.
- Prompt AI melarang meminta data pribadi, melarang vonis, dan membatasi topik ke keamanan digital.

## Arsitektur teknis dan kebutuhan non-fungsional

Aplikasi dibangun sebagai satu proyek web dengan backend tipis berupa serverless function. Semua logika aturan ada di satu folder bersama yang dipakai browser dan server.

### Stack yang disarankan

- **Frontend dan backend:** Next.js (App Router) + TypeScript, styling Tailwind CSS. Deploy di Vercel. Stack ini asumsi, karena tim belum menetapkannya (lihat keputusan terbuka).
- **Endpoint:** `POST /api/cek-chat`, `POST /api/cek-link`, `POST /api/cek-media`, `POST /api/tanya`.
- **Kode bersama:** `lib/aturan/` (aturan chat, link, video), `lib/hasil.ts` (skema hasil + penggabungan level), `data/langkah-darurat.json`, `data/merek.json`, `data/contoh/`.
- **Batas permintaan:** penyimpanan counter sederhana (misalnya Upstash Redis) untuk batas per IP.

&#91;embedded content: arsitektur · browser, 4 endpoint, 5 layanan\]

Setiap halaman cek punya jalurnya sendiri ke server, tetapi aturan selalu dijalankan di browser lebih dulu. Garis putus-putus berarti jalur Cek Video & Suara hanya dipakai saat toggle analisis AI dinyalakan.

### Layanan pihak ketiga

| Layanan | Dipakai di | Fungsi | Batas yang perlu diingat |
| --- | --- | --- | --- |
| Google Gemini API | Cek Chat, Cek Link, Tanya lanjut | Analisis chat dan penjelasan edukatif | Tier gratis: input dipakai Google dan bisa dibaca peninjau. Pengguna aplikasi harus 18+ ([ketentuan](https://ai.google.dev/terms)) |
| Google Safe Browsing API v4 | Cek Link | Daftar phishing dan malware | Non-komersial, wajib atribusi Google ([ketentuan](https://developers.google.com/safe-browsing/v4/usage-limits)) |
| RDAP | Cek Link | Tanggal registrasi domain | Tanpa API key. Sebagian TLD mungkin tidak tersedia, tampilkan "tidak tersedia" |
| VirusTotal Public API (P1) | Cek Link | Reputasi dari banyak pemindai | 500 permintaan/hari, 4/menit, non-komersial ([ketentuan](https://docs.virustotal.com/docs/public-vs-premium-api)) |
| Reality Defender (P1) | Cek Video & Suara | Deteksi manipulasi gambar dan audio | 50 scan/bulan gratis, video hanya berbayar, audio 12 detik-5 menit, tanpa bahasa Indonesia ([ketentuan](https://www.realitydefender.com/api-email-campaign)) |

### Kebutuhan non-fungsional

| Aspek | Kebutuhan |
| --- | --- |
| Ukuran kiriman | Body request ke Vercel Function maksimal 4,5 MB ([Vercel](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)). Gambar dikompres di browser dan audio dibatasi maksimal 4 MB |
| Kecepatan | Sesuai target di bagian Tujuan. Setiap panggilan API punya timeout, lalu jatuh ke hasil aturan |
| Ketersediaan | Alur utama setiap halaman tetap selesai saat semua API pihak ketiga mati |
| Responsif | Rapi dari lebar 360 px. Target sentuh minimal 44 px |
| Aksesibilitas | Level tidak hanya dibedakan warna: selalu ada teks label dan ikon. Kontras teks memenuhi WCAG AA. Semua input punya label |
| Peramban | Chrome Android dan Safari iOS versi terbaru, Chrome dan Firefox desktop |
| Pelacakan | Tanpa analitik yang mengidentifikasi pengguna. Pemandu halaman berjalan sepenuhnya di browser |

## Prioritas dan rencana pengerjaan

Fondasi bersama dikerjakan lebih dulu supaya keempat halaman memakai komponen dan format yang sama sejak awal. Setelah itu, setiap pemilik halaman mengerjakan P0 secara paralel. Fitur P1 baru dimulai setelah semua P0 lolos uji di tautan live.

### Urutan fase

1. **Kesepakatan.** Tetapkan stack, nama aplikasi, dan jawaban untuk keputusan terbuka di bagian terakhir.
2. **Fondasi bersama.** Repo, layout, header dan footer, komponen kartu hasil, skema `lib/hasil.ts`, `langkah-darurat.json`, templat endpoint dengan batas permintaan, lalu deploy pertama ke Vercel.
3. **P0 per halaman**, paralel oleh masing-masing pemilik.
4. **Integrasi dan uji.** Jalankan semua contoh di tautan live, matikan API key untuk menguji fallback, uji di HP, dan cari kata terlarang ("aman", "pasti", "100%").
5. **P1 sesuai sisa waktu**, mulai dari Tanya lanjut dan sorotan bukti.
6. **Rilis.** README yang menjelaskan pendekatan Recognize-Learn-Act, batasan, dan layanan pihak ketiga, lalu video demo yang menjalankan satu alur penuh per halaman.

### Pembagian per pemilik halaman

| Pemilik | Fondasi bersama | P0 | P1 |
| --- | --- | --- | --- |
| Beranda | Layout, header, footer, kartu hasil, panel "Sudah terlanjur?" | LP-01 sampai LP-05 | Templat pesan peringatan, pemandu halaman berbasis skrip |
| Cek Chat | Skema `lib/hasil.ts`, helper pemanggilan Gemini, system prompt dasar | CH-01 sampai CH-06 | CH-07, komponen Tanya lanjut untuk ketiga halaman |
| Cek Link | Batas permintaan per IP, utilitas sanitasi dan sensor | LN-01 sampai LN-06 | LN-07 sampai LN-09 |
| Cek Video & Suara | Pola data `data/contoh/` dan mode contoh dengan respons simulasi | VS-01 sampai VS-04 | VS-05 sampai VS-07 |

Definisi selesai untuk setiap kebutuhan P0: berjalan di tautan live, lolos contoh fiktif, tampil rapi di lebar 360 px, dan tetap menampilkan hasil saat layanan luar dimatikan.

## Risiko dan mitigasi

Risiko terbesar adalah alur gagal saat juri mencoba, karena kuota habis atau AI error. Mitigasinya adalah aturan lokal yang selalu jalan dan contoh dengan respons simulasi.

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Kuota API gratis habis saat penjurian | Hasil tidak muncul, nilai fungsionalitas turun | Batas per IP, contoh memakai respons simulasi, fallback ke hasil aturan |
| AI memberi vonis atau penjelasan keliru | Melanggar batasan brief, menyesatkan pengguna | System prompt + skema JSON, saring kata terlarang di server, AI tidak bisa menurunkan level |
| Data pribadi terkirim ke Gemini tier gratis | Data bisa dibaca peninjau Google | Sensor otomatis, peringatan sebelum kirim, akun billing aktif |
| Pengguna di bawah 18 tahun memakai fitur Gemini | Melanggar ketentuan Gemini API | Target 18+ ditulis di Beranda, atau ganti penyedia AI (keputusan terbuka) |
| Penipuan baru tidak terdeteksi (*false negative*) | Pengguna merasa aman padahal tidak | Label "tidak ditemukan tanda bahaya" + kalimat "bukan jaminan", langkah verifikasi tetap tampil |
| Halaman video dianggap mengklaim deteksi deepfake | Juri menilai klaim berlebihan | Nama "Cek Video & Suara", penilaian berbasis konteks, batasan API ditulis di hasil |
| Upload melebihi 4,5 MB | Error 413 dari Vercel | Kompresi gambar di browser, batas ukuran audio, validasi sebelum kirim |
| Domain di contoh fiktif ternyata terdaftar dan aktif | Aplikasi tidak sengaja mempromosikan situs berbahaya | Cek domain sebelum dipakai, link tidak bisa diklik, contoh tidak memanggil API |
| Halaman tidak konsisten karena dikerjakan paralel | Pengalaman terasa seperti empat aplikasi berbeda | Fondasi bersama dikerjakan lebih dulu, review silang sebelum rilis |

## Catatan penyelarasan dan keputusan terbuka

Sebagian besar isi deskripsi awal tetap dipakai. Perubahan di bawah dibuat supaya keempat halaman konsisten dan memenuhi batasan brief.

| Dokumen asal | Isi awal | Di PRD ini | Alasan |
| --- | --- | --- | --- |
| Landing page | Urutan kartu: Video, Link, Chat | Chat, Link, Video & Suara | Situasi paling sering di depan. Cek Chat juga fitur paling kuat untuk demo |
| Landing page | "Sistem aman, tidak menyimpan data pribadi" | "Tidak menyimpan isi" + pemberitahuan pihak ketiga | Brief melarang klaim aman dan mewajibkan transparansi pihak ketiga |
| Landing page | Menu "Deteksi Video AI (Deepfake)" | "Cek Video & Suara" | Tidak menjanjikan deteksi yang tidak bisa dipenuhi |
| Landing page | 3 langkah cara pakai | 4 langkah + akordeon "Cara kerja dan batasan" | Langkah tindakan (Act) terlihat sejak awal, tanpa halaman Tentang terpisah |
| Cek Chat | Hasil tanpa label atau skor | Tingkat kewaspadaan bersama, tanpa angka | Konsisten dengan dua halaman lain. Hasil tetap edukatif dan tanpa vonis |
| Cek Chat | Analisis sepenuhnya oleh AI | Pra-pemindaian aturan + fallback | Hasil tetap muncul saat API gagal |
| Cek Chat | Peringatan data sensitif saja | Sensor otomatis + pratinjau sebelum kirim | Ketentuan tier gratis Gemini |
| Cek Chat | Batas ukuran per gambar | Kompresi di browser, total di bawah 4 MB | Batas body request Vercel 4,5 MB |
| Cek Link | Status Aman / Mencurigakan / Palsu + skor | Tiga label bersama, skor hanya di belakang layar | Brief melarang label aman dan klaim pasti |
| Cek Link | AI menentukan status | Aturan menentukan level, AI menjelaskan | Hasil bisa dijelaskan dan tidak bergantung pada AI |
| Cek Link | Analisis struktur HTML halaman | Tidak dikerjakan | Membuka URL pengguna berisiko SSRF dan konten berbahaya |
| Cek Link | Safe Browsing, VirusTotal, IPQualityScore, Whois | Safe Browsing + RDAP (P0), VirusTotal (P1) | Cukup untuk demo dan mengurangi jumlah integrasi |
| Cek Link | AI merespons posisi kursor secara real-time | Pemandu berbasis skrip (fokus, klik, diam 8 detik), tanpa kirim data | HP tidak punya kursor. Panggilan AI per gerakan boros dan lambat |
| Cek Link | Tanya lanjut tentang topik apa pun | Topik keamanan digital, maksimal 10 pertanyaan per sesi | Menjaga kuota dan fokus |
| Cek Video & Suara | Upload dan deteksi deepfake sebagai inti | Penilaian konteks sebagai inti, upload jadi P1 | Deteksi otomatis tidak bisa diandalkan dan API gratis tidak mendukung video |

### Keputusan yang perlu disepakati tim

- [ ] Nama aplikasi.
- [ ] Stack final. PRD ini mengasumsikan Next.js di Vercel.
- [ ] Tetap memakai Gemini dengan target pengguna 18+, atau mengganti penyedia AI supaya pelajar di bawah 18 tahun bisa menjadi target.
- [ ] Mengaktifkan billing Gemini dengan batas anggaran kecil, atau tetap di tier gratis dengan pemberitahuan tambahan.
- [ ] Urutan kartu di Beranda.
- [ ] Siapa yang membangun komponen bersama Tanya lanjut.
- [ ] Tenggat lomba dan tanggal pembekuan fitur.

## Sumber

Diakses 8 November 2026. Dokumen masukan: brief studi kasus "The Trust Trap", deskripsi fitur Cek Chat, deskripsi Landing Page, dan workflow deteksi URL dari tim.

- [Gemini API Additional Terms of Service](https://ai.google.dev/terms)
- [Google Safe Browsing API: Usage Limits](https://developers.google.com/safe-browsing/v4/usage-limits)
- [VirusTotal: Public vs Premium API](https://docs.virustotal.com/docs/public-vs-premium-api)
- [Reality Defender API: paket dan spesifikasi](https://www.realitydefender.com/api-email-campaign)
- [Vercel: batas body request 4,5 MB](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [Katadata: OJK terima 702 ribu laporan penipuan](https://katadata.co.id/finansial/keuangan/6ad1a3875e700/ojk-terima-702-ribu-laporan-penipuan-simak-cara-melindungi-uang)
- [Katadata: Korban scam tak tahu harus lapor ke mana](https://katadata.co.id/amp/finansial/keuangan/6a4324b291318/korban-scam-tak-tahu-harus-lapor-ke-mana-kenali-layanan-iasc)
- [iNews/RCTI+: 1.379 laporan penipuan berbasis AI](https://www.rctiplus.com/news/detail/berita-utama/5444343/ojk-terima-1-379-laporan-penipuan-berbasis-ai--deepfake-tokoh-publik-jadi-modus-terbanyak)
- [JournalArta: modus penipuan daring 2026](https://journalarta.com/news/2026/07/20/waspada-penipuan-daring-2026-pakai-ai-rugi-rp75-triliun/)
- [detikFinance: 80% pelapor IASC melapor setelah 12 jam](https://finance.detik.com/moneter/d-8552960/ojk-bongkar-modus-tipu-tipu-nasabah-hingga-bobol-rekening)
- [Investortrust: pelaporan IASC hanya lewat iasc.ojk.go.id](https://investortrust.id/financial/61278/ojk-iasc-tenerima-74243-laporan-kasus-penipuan-hingga-23-maret-2025-kerugian-capai-rp-1-4-triliun)
- [Kontan: kanal pengaduan OJK](https://nasional.kontan.co.id/news/waspada-penipuan-keuangan-melonjak-awal-ramadan-2026-begini-cara-lapor-ojk)
