# Cek Penipuan

## Deskripsi Web

Cek Penipuan adalah aplikasi web edukasi dan pemeriksaan keamanan digital yang membantu pengguna mengenali indikasi penipuan daring sebelum mengambil tindakan berisiko seperti membuka tautan asing, membagikan kode rahasia, atau mengirim uang. Aplikasi ini menggabungkan mesin aturan deterministik lokal di peramban dengan analisis dari layanan keamanan eksternal serta model kecerdasan buatan. Seluruh hasil pemeriksaan disajikan tanpa memberikan vonis mutlak agar pengguna tetap melakukan verifikasi mandiri melalui jalur resmi.

Aplikasi ini menyediakan tiga jalur pemeriksaan utama sesuai bentuk pesan atau interaksi yang diterima pengguna:

1. **Cek Chat Mencurigakan**
   Memeriksa teks percakapan atau tangkapan layar pesan singkat dari aplikasi pesan maupun media sosial. Sebelum data dikirim ke server untuk dianalisis lebih lanjut oleh Google Gemini, sistem di peramban secara otomatis menyensor informasi sensitif seperti nomor telepon, nomor rekening, alamat surel, serta nomor kartu identitas. Mesin aturan lokal mendeteksi pola rekayasa sosial seperti desakan waktu, ancaman pemblokiran akun, permintaan kode OTP atau PIN, janji keuntungan investasi tidak wajar, hingga tawaran kerja paruh waktu fiktif.

2. **Cek Link Mencurigakan**
   Menganalisis struktur alamat web atau nama domain tanpa pernah membuka maupun mengunjungi tautan tersebut. Sistem menguraikan komponen URL dan memeriksa pola peniruan merek populer di Indonesia (typosquatting dan substitusi karakter), penggunaan karakter samaran punycode, penggunaan alamat IP numerik, struktur subdomain pengecoh, ekstensi domain berisiko, serta layanan pemendek tautan. Di sisi server, aplikasi memadukan hasil aturan leksikal tersebut dengan pemeriksaan reputasi ancaman dari Google Safe Browsing, VirusTotal, serta pengecekan usia registrasi domain melalui protokol RDAP.

3. **Cek Video dan Suara Mencurigakan**
   Membantu pengguna menilai kejanggalan pada panggilan video, pesan suara, maupun rekaman media yang berpotensi direkayasa menggunakan teknologi deepfake atau kloning suara. Pengguna dipandu melalui kuesioner bertahap mengenai konteks percakapan, siapa sosok yang tampil, apa yang diminta oleh penelepon, serta daftar periksa pengamatan visual dan audio. Pengguna juga dapat mengunggah berkas gambar, suara, atau video untuk dianalisis secara teknis di peramban dan melalui Google Gemini multimodal tanpa menyimpan berkas tersebut di server.

Setiap hasil pemeriksaan menampilkan tingkat kewaspadaan (Perlu Hati Hati, Waspada Tinggi, atau Belum Ditemukan Tanda Bahaya), daftar temuan beserta bukti bagian yang memicu peringatan, daftar langkah pencegahan kontekstual yang dapat dicentang secara berurutan, templat pesan peringatan untuk dibagikan kepada kerabat, panel tindakan darurat beserta daftar kanal pelaporan resmi di Indonesia, serta fitur tanya jawab lanjutan terkait hasil pemeriksaan.

## Cara Menjalankan di Lokal

Pastikan perangkat sudah terpasang Node.js versi 18 ke atas dan pengelola paket npm.

1. Masuk ke direktori proyek melalui terminal:

```bash
cd web_project_folder
```

2. Pasang seluruh dependensi paket yang dibutuhkan:

```bash
npm install
```

3. Buat berkas konfigurasi lingkungan bernama `.env` di direktori utama proyek (dapat menyalin isi dari berkas `.env.example`), lalu isi variabel kunci API berikut:

```env
GEMINI_API_KEY=isi_kunci_api_google_gemini
SAFE_BROWSING_API_KEY=isi_kunci_api_google_safe_browsing
```

Catatan konfigurasi:
Aplikasi tetap dapat berjalan di lokal meskipun kunci API eksternal dikosongkan, karena setiap fitur memiliki mekanisme cadangan otomatis yang mengandalkan analisis aturan lokal di perangkat pengguna. Kunci `GEMINI_API_KEY` dan `SAFE_BROWSING_API_KEY` diperlukan apabila ingin mengaktifkan penjelasan kontekstual AI dan pemindaian basis data ancaman Google Safe Browsing secara langsung.

4. Jalankan server pengembangan lokal:

```bash
npm run dev
```

5. Buka peramban dan akses alamat berikut:

```text
http://localhost:3000
```
