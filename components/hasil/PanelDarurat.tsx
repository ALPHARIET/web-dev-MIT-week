'use client';

import React, { useState } from 'react';
import type { SituasiDarurat } from '@/lib/hasil';
import langkahDaruratJson from '@/data/langkah-darurat.json';

export interface SituasiItem {
  id: SituasiDarurat;
  label: string;
  langkah: string[];
}

export interface KanalLaporItem {
  nama: string;
  kontak: string;
  keterangan: string;
}

export interface LangkahDaruratData {
  situasi: SituasiItem[];
  kanal_lapor: KanalLaporItem[];
  peringatan: string;
}

export const DEFAULT_LANGKAH_DARURAT: LangkahDaruratData =
  langkahDaruratJson as LangkahDaruratData;

export const DAFTAR_SITUASI_ID: SituasiDarurat[] = [
  'klik_link',
  'isi_data',
  'kirim_otp',
  'transfer',
  'akun_diambil',
];

export const LABEL_RINGKAS_SITUASI: Record<SituasiDarurat, string> = {
  klik_link: 'Klik link',
  isi_data: 'Isi data akun',
  kirim_otp: 'Kirim OTP',
  transfer: 'Sudah transfer',
  akun_diambil: 'Akun diambil alih',
};

/**
 * Langkah darurat khusus ketika terindikasi pengiriman atau pemasangan file APK.
 * Memprioritaskan pemutusan jaringan dan pencopotan aplikasi berbahaya.
 */
export const LANGKAH_DARURAT_APK: string[] = [
  'Tutup halaman web tersebut segera atau batalkan proses instalasi jika masih terbuka.',
  'Segera aktifkan Mode Pesawat (matikan Wi-Fi dan data seluler) agar aplikasi tidak dapat mengirim SMS/OTP atau data ke server pelaku.',
  'Jangan memasang file .apk atau file lain yang terunduh. Jika sudah terpasang, segera copot pemasangan (Uninstall) lewat Pengaturan HP > Aplikasi.',
  'Hapus file unduhan tersebut dan hapus permanen berkas file berekstensi .apk dari perangkatmu jika sempat terunduh (periksa folder Download di File Manager).',
  'Periksa izin akses berbahaya di Pengaturan HP (Aksesibilitas dan Akses SMS). Cabut izin yang mencurigakan, lalu restart perangkatmu.',
];

export const INFORMASI_URGENSI_APK: { waktu: string; prioritas: string } = {
  waktu: 'Tindakan Segera: Putuskan Koneksi & Hapus APK',
  prioritas:
    'Segera aktifkan Mode Pesawat dan copot pemasangan aplikasi APK dari Pengaturan HP agar malware tidak dapat mencuri SMS dan kode OTP perbankan.',
};

export const INFORMASI_URGENSI_SITUASI: Record<
  SituasiDarurat,
  { waktu: string; prioritas: string }
> = {
  transfer: {
    waktu: 'Waktu Kritis: 30 - 60 Menit Pertama',
    prioritas:
      'Peluang terbesar penahanan atau pemblokiran rekening tujuan adalah sesegera mungkin setelah transaksi dilakukan.',
  },
  kirim_otp: {
    waktu: 'Tindakan Segera: Sebelum OTP Digunakan',
    prioritas:
      'Segera hubungi kontak resmi untuk membekukan akun atau membatalkan transaksi sebelum akses digunakan.',
  },
  isi_data: {
    waktu: 'Tindakan Cepat: Ubah Kredensial Utama',
    prioritas:
      'Ubah kata sandi lewat aplikasi resmi dan putuskan sesi aktif yang tidak dikenal.',
  },
  akun_diambil: {
    waktu: 'Prioritas: Beri Tahu Kontak Terdekat',
    prioritas:
      'Segera beri tahu keluarga dan teman agar mereka waspada dan tidak terjerat penipuan lanjutan.',
  },
  klik_link: {
    waktu: 'Tindakan Segera: Hentikan Akses',
    prioritas:
      'Tutup halaman dan hapus berkas mencurigakan yang sempat terunduh dari perangkatmu.',
  },
};

export type ModusPenipuan =
  | 'apk'
  | 'bank_phishing'
  | 'task_scam'
  | 'family_impersonation'
  | 'umum';

export interface KonteksSituasiItem {
  labelRingkas: string;
  labelLengkap: string;
  urgensi: { waktu: string; prioritas: string };
  langkah: string[];
}

/**
 * Deteksi modus penipuan berdasarkan konteks temuan, langkah, ringkasan, transkrip, atau url.
 */
export function deteksiModusPenipuan(params: {
  isApk?: boolean;
  temuan?: Array<{ judul: string; penjelasan: string; bukti?: string; sumber?: string }>;
  langkah?: string[];
  ringkasan?: string;
  transkrip?: string;
  url?: string;
}): ModusPenipuan {
  if (params.isApk) return 'apk';

  const teksSemua = [
    params.ringkasan || '',
    params.transkrip || '',
    params.url || '',
    ...(params.langkah || []),
    ...(params.temuan?.map((t) => `${t.judul} ${t.penjelasan} ${t.bukti || ''}`) || []),
  ]
    .join(' ')
    .toLowerCase();

  // 1. Modus APK / Malware / Trojan / Aplikasi Berbahaya
  const polaApk =
    /(?:\.apk\b|\bapk\b|malware|trojan|surat.*tilang|foto.*paket|undangan.*pernikahan|\b(?:unduh|download|pasang|instal|install|kirim|mengunduh|memasang|menginstal)\s+(?:file|berkas|aplikasi|dokumen|surat|paket|undangan)?\s*(?:berupa\s*)?(?:\.apk|apk)\b|\b(?:unduh|download|pasang|instal|install|mengunduh|memasang|menginstal)\s+(?:aplikasi|apk)\b|aplikasi\s*(?:kurir|tilang|undangan|paket|resi)|izin\s*aksesibilitas|akses\s*sms)/i;
  if (polaApk.test(teksSemua)) {
    return 'apk';
  }

  // 2. Modus Phishing Perbankan / Akun Keuangan / Login Palsu
  const polaPhishing =
    /(?:phishing|web\s*palsu|situs\s*palsu|login\s*palsu|tautan\s*palsu|perubahan\s*tarif|tarif\s*transaksi|kenaikan\s*tarif|tarif\s*(?:bca|bri|mandiri|bni)|klikbca|brimo|livin|bni\s*mobile|kartu\s*kredit|kartu\s*debit|cvv|nomor\s*kartu|m-banking|mobile\s*banking|internet\s*banking)/i;
  if (polaPhishing.test(teksSemua)) {
    return 'bank_phishing';
  }

  // 3. Modus Tugas Online / Freelance / Misi / Deposit Pekerjaan Paruh Waktu
  const polaTask =
    /(?:tugas|freelance|kerja\s*paruh\s*waktu|job\s*scam|paruh\s*waktu|misi\s*(?:harian|berbayar)|like\s*(?:dan\s*|&)?(?:subscribe|follow|review)|like\s*youtube|komisi|gaji\s*harian|deposit\s*tugas|grup\s*telegram|penghasilan\s*tambahan)/i;
  if (polaTask.test(teksSemua)) {
    return 'task_scam';
  }

  // 4. Modus Mengaku Keluarga / Kerabat Ganti Nomor
  const polaKeluarga =
    /(?:keluarga|ganti\s*nomor|nomor\s*baru|hp\s*rusak|pinjam\s*hp|mengaku\s*(?:teman|saudara|anak|ibu|ayah|mama|papa)|ini\s*nomor\s*baruku)/i;
  if (polaKeluarga.test(teksSemua)) {
    return 'family_impersonation';
  }

  return 'umum';
}

/**
 * Basis data langkah darurat dinamis kontekstual untuk masing-masing modus penipuan.
 */
export const KONTEKS_DARURAT_MAP: Record<
  Exclude<ModusPenipuan, 'umum'>,
  Record<SituasiDarurat, KonteksSituasiItem>
> = {
  apk: {
    klik_link: {
      labelRingkas: 'Unduh / Pasang APK',
      labelLengkap: 'Terlanjur Unduh atau Pasang File APK',
      urgensi: {
        waktu: 'Tindakan Segera: Putuskan Koneksi & Hapus APK',
        prioritas:
          'Segera aktifkan Mode Pesawat dan copot pemasangan aplikasi APK dari Pengaturan HP agar malware tidak dapat mencuri SMS dan kode OTP perbankan.',
      },
      langkah: LANGKAH_DARURAT_APK,
    },
    isi_data: {
      labelRingkas: 'Beri Izin / Akses HP',
      labelLengkap: 'Terlanjur Memberi Izin Aksesibilitas atau SMS ke APK',
      urgensi: {
        waktu: 'Tindakan Kritis: Cabut Izin & Safe Mode',
        prioritas:
          'Malware APK memanfaatkan izin Aksesibilitas dan SMS untuk menyadap kode OTP verifikasi di latar belakang tanpa disadari.',
      },
      langkah: [
        'Segera aktifkan Mode Pesawat seketika untuk menghentikan pengiriman data dan pencurian SMS OTP ke server pengendali pelaku.',
        'Buka Pengaturan HP > Aksesibilitas, cari nama aplikasi APK mencurigakan tersebut dan segera nonaktifkan (matikan) izinnya.',
        'Buka Pengaturan HP > Aplikasi > Kelola Izin, cabut izin Akses SMS, Notifikasi, dan Kontak dari aplikasi tersebut.',
        'Segera copot pemasangan (Uninstall) aplikasi. Jika tombol uninstall terkunci atau abu-abu, nyalakan HP ke Safe Mode lalu copot pemasangannya.',
        'Jika aplikasi tetap tidak bisa dihapus atau layar HP terkunci, lakukan Reset ke Setelan Pabrik (Factory Reset) setelah mencadangkan data penting.',
      ],
    },
    kirim_otp: {
      labelRingkas: 'SMS / OTP Disadap',
      labelLengkap: 'SMS atau Kode OTP Terbaca / Disadap Malware APK',
      urgensi: {
        waktu: 'Tindakan Segera: Blokir M-Banking & Hubungi Bank',
        prioritas:
          'Pelaku berpotensi membaca kode OTP langsung dari SMS HP Anda. Segera amankan rekening perbankan dari perangkat lain.',
      },
      langkah: [
        'Gunakan perangkat lain (HP keluarga atau laptop) yang bersih untuk segera login ke akun m-banking atau perbankan Anda.',
        'Hubungi call center bank atau penyedia layanan lewat nomor resmi di kartu atau aplikasi sekarang juga untuk membatalkan transaksi atau minta pemblokiran sementara transaksi atau akun yang bersangkutan.',
        'Hubungi call center penyedia dompet digital (GoPay, OVO, DANA, ShopeePay) untuk membekukan akun e-wallet yang terhubung ke nomor HP tersebut.',
        'Pindahkan sementara kartu SIM ke ponsel jadul (non-smartphone) agar panggilan verifikasi resmi dari bank tetap dapat diterima tanpa risiko sadap.',
        'Untuk WhatsApp, periksa menu Perangkat Tertaut (Linked Devices) dan segera keluarkan perangkat asing yang tidak dikenal.',
      ],
    },
    transfer: {
      labelRingkas: 'Sudah Transfer',
      labelLengkap: 'Uang Terlanjur Ditransfer atau Saldo Terkuras Akibat APK',
      urgensi: {
        waktu: 'Waktu Kritis: 30 - 60 Menit Pertama',
        prioritas:
          'Peluang terbesar penahanan atau pemblokiran rekening tujuan pelaku adalah sesegera mungkin setelah transaksi dilakukan.',
      },
      langkah: [
        'Hubungi bank pengirim sekarang juga untuk meminta pemblokiran rekening tujuan transfer dan penahanan transaksi darurat.',
        'Lapor ke Indonesia Anti-Scam Centre (IASC) di iasc.ojk.go.id secepatnya dengan melampirkan nomor rekening pelaku dan nilai kerugian.',
        'Siapkan bukti transaksi, nomor rekening pelaku, tangkapan layar pengiriman file APK, dan kronologi kejadian secara lengkap.',
        'Buat laporan kepolisian di kantor polisi terdekat (SPKT) dengan membawa berkas bukti untuk proses hukum dan syarat pemblokiran permanen oleh bank.',
      ],
    },
    akun_diambil: {
      labelRingkas: 'HP / Akun Dibobol',
      labelLengkap: 'Perangkat HP Dikuasai Jarak Jauh atau Akun Dibobol',
      urgensi: {
        waktu: 'Prioritas: Amankan Akun dari Perangkat Bersih',
        prioritas:
          'Segera putuskan kendali jarak jauh pelaku dan amankan kredensial akun perbankan serta email utama melalui perangkat bersih.',
      },
      langkah: [
        'Segera matikan daya ponsel (Power Off) atau lepaskan kartu SIM dan matikan Wi-Fi untuk memutus kendali jarak jauh pelaku.',
        'Dari perangkat lain yang bersih dan terpisah, segera ganti kata sandi akun email utama (Google/iCloud), akun medsos, dan seluruh akun perbankan.',
        'Pilih opsi "Keluarkan dari semua perangkat" (Log out all devices) pada pengaturan keamanan akun Google, Apple ID, dan WhatsApp.',
        'Pulihkan akun lewat fitur pemulihan resmi di aplikasi terkait dan kabari keluarga serta rekan kerja bahwa ponselmu mengalami insiden peretasan.',
        'Lakukan Factory Reset penuh atau bawa ponsel ke service center resmi untuk instalasi ulang sistem operasi yang bersih.',
      ],
    },
  },
  bank_phishing: {
    klik_link: {
      labelRingkas: 'Buka Link Phishing',
      labelLengkap: 'Terlanjur Membuka Halaman Web Phishing / Bank Palsu',
      urgensi: {
        waktu: 'Tindakan Segera: Tutup Halaman & Bersihkan Riwayat',
        prioritas:
          'Tutup halaman web dan jangan berikan informasi finansial apa pun pada formulir palsu tersebut.',
      },
      langkah: [
        'Tutup halaman web tersebut segera dan jangan mengklik tautan atau tombol apa pun di dalamnya.',
        'Jangan mengisi formulir atau data apa pun seperti username, PIN, nomor kartu ATM, atau kata sandi.',
        'Hapus riwayat penelusuran (browsing history) dan cache pada peramban web HP Anda.',
        'Hapus file unduhan tersebut dari perangkatmu jika sempat terunduh tanpa sengaja.',
      ],
    },
    isi_data: {
      labelRingkas: 'Isi User / PIN Bank',
      labelLengkap: 'Terlanjur Mengisi Username, Password, atau PIN Perbankan',
      urgensi: {
        waktu: 'Tindakan Cepat: Ubah Kredensial & Kunci Akun',
        prioritas:
          'Pelaku dapat segera mengakses m-banking Anda. Segera ubah PIN atau kunci akses via saluran resmi.',
      },
      langkah: [
        'Buka aplikasi resmi mobile banking langsung dari ponselmu (bukan lewat link web) dan segera ubah kata sandi / PIN m-banking.',
        'Ganti password lewat aplikasi atau situs web resmi, bukan dari link yang tadi dibuka.',
        'Jika akun m-banking sudah tidak bisa dibuka, segera hubungi call center resmi bank untuk meminta pemblokiran akun darurat.',
        'Keluarkan (log out) semua sesi perangkat yang tidak dikenal dari menu setelan akun atau minta bank mereset sesi aktif.',
      ],
    },
    kirim_otp: {
      labelRingkas: 'Kirim OTP Bank',
      labelLengkap: 'Terlanjur Mengirim Kode OTP / Token Perbankan',
      urgensi: {
        waktu: 'Tindakan Segera: Sebelum OTP Digunakan Pelaku',
        prioritas:
          'Segera hubungi bank untuk membekukan rekening dan membatalkan transaksi yang sedang diotorisasi.',
      },
      langkah: [
        'Hubungi call center bank atau penyedia layanan lewat nomor resmi di kartu atau aplikasi sekarang juga.',
        'Minta pemblokiran sementara transaksi atau akun yang bersangkutan detik ini juga.',
        'Kunci sementara kartu ATM/Debit melalui fitur kartu di aplikasi mobile banking resmi.',
        'Untuk WhatsApp, periksa menu Perangkat Tertaut (Linked Devices) dan segera keluarkan perangkat asing yang tidak dikenal jika OTP dikirim via chat.',
      ],
    },
    transfer: {
      labelRingkas: 'Sudah Transfer',
      labelLengkap: 'Sudah Mentransfer Dana atau Saldo Berkurang',
      urgensi: {
        waktu: 'Waktu Kritis: 30 - 60 Menit Pertama',
        prioritas:
          'Peluang terbesar penahanan atau pemblokiran rekening tujuan adalah sesegera mungkin setelah transaksi dilakukan.',
      },
      langkah: [
        'Hubungi bank pengirim sekarang juga untuk meminta pemblokiran rekening tujuan transfer.',
        'Lapor ke Indonesia Anti-Scam Centre (IASC) di iasc.ojk.go.id secepatnya.',
        'Siapkan bukti transaksi, nomor rekening pelaku, kronologi kejadian, dan nilai kerugian.',
        'Buat laporan kepolisian di kantor polisi terdekat untuk proses hukum lebih lanjut.',
      ],
    },
    akun_diambil: {
      labelRingkas: 'M-Banking Terkunci',
      labelLengkap: 'Akun Mobile Banking Dikuasai Pelaku atau Terkunci',
      urgensi: {
        waktu: 'Prioritas: Datangi Kantor Cabang Bank Terdekat',
        prioritas:
          'Pastikan rekening dibekukan total dan lakukan pemulihan akun langsung secara tatap muka dengan pihak bank.',
      },
      langkah: [
        'Pulihkan akun lewat fitur pemulihan resmi di aplikasi terkait atau hubungi nomor darurat bank pengirim.',
        'Segera kabari kontak, keluarga, dan teman bahwa akunmu sedang terkendala agar mereka waspada.',
        'Datangi kantor cabang bank terdekat membawa buku tabungan, kartu ATM, dan e-KTP untuk investigasi transaksi dan cetak rekening koran.',
        'Laporkan tautan website phishing tersebut ke aduankonten.id (Kominfo) agar segera ditutup.',
      ],
    },
  },
  task_scam: {
    klik_link: {
      labelRingkas: 'Masuk Grup / Link Misi',
      labelLengkap: 'Terlanjur Masuk Grup Telegram / Membuka Link Tugas',
      urgensi: {
        waktu: 'Tindakan Segera: Keluar Grup & Blokir Admin',
        prioritas:
          'Hentikan interaksi sekarang juga. Testimoni bukti transfer anggota di grup adalah sindikat bot komplotan palsu.',
      },
      langkah: [
        'Tutup halaman web tersebut segera dan keluar dari grup Telegram / WhatsApp tugas tersebut.',
        'Jangan mengisi formulir atau data apa pun seperti identitas diri, nomor rekening, atau pekerjaan.',
        'Jangan memasang file .apk atau file lain yang terunduh dari instruksi admin tugas.',
        'Blokir akun perekrut dan laporkan grup tersebut sebagai penipuan (scam) di aplikasi pesan.',
      ],
    },
    isi_data: {
      labelRingkas: 'Isi Rekening / KTP',
      labelLengkap: 'Terlanjur Mengirim Foto KTP atau Nomor Rekening',
      urgensi: {
        waktu: 'Tindakan Cepat: Waspadai Penyalahgunaan Identitas',
        prioritas:
          'Pantau rekening Anda dari aliran dana mencurigakan dan waspadai penagihan pinjol fiktif.',
      },
      langkah: [
        'Pantau mutasi rekening bank secara berkala untuk memastikan tidak ada dana mencurigakan yang masuk ke rekeningmu.',
        'Simpan tangkapan layar chat rekrutmen sebagai bukti bahwa identitas KTP kamu dicatut tanpa izin jika terjadi penyalahgunaan pihak ketiga.',
        'Ganti password lewat aplikasi atau situs web resmi dan aktifkan verifikasi dua langkah pada email dan akun keuanganmu.',
        'Periksa riwayat pinjaman di SLIK OJK (iDebKu) untuk memastikan tidak ada pengajuan kredit fiktif menggunakan KTP kamu.',
      ],
    },
    kirim_otp: {
      labelRingkas: 'Kirim OTP Akun',
      labelLengkap: 'Terlanjur Menyerahkan OTP atau Akses Akun Pesan',
      urgensi: {
        waktu: 'Tindakan Segera: Amankan Akun Pesan / Keuangan',
        prioritas:
          'Segera keluarkan sesi aktif asing dan amankan akun pesan dari pengambilalihan sindikat.',
      },
      langkah: [
        'Untuk WhatsApp atau Telegram, periksa menu Perangkat Tertaut (Linked Devices) dan segera keluarkan perangkat asing yang tidak dikenal.',
        'Aktifkan verifikasi dua langkah (2FA / Two-Factor Authentication) di aplikasi pesan agar pelaku tidak bisa login kembali.',
        'Hubungi call center bank atau penyedia layanan lewat nomor resmi di kartu atau aplikasi sekarang juga jika OTP terkait perbankan.',
        'Jangan pernah menuruti permintaan kode konfirmasi berikutnya dengan alasan "pencairan komisi".',
      ],
    },
    transfer: {
      labelRingkas: 'Transfer Deposit',
      labelLengkap: 'Terlanjur Mentransfer Uang Deposit / Penebusan Misi',
      urgensi: {
        waktu: 'Waktu Kritis: Jangan Transfer Dana Tambahan Lagi!',
        prioritas:
          'Hentikan transfer uang sekarang juga! Jangan pernah membayar biaya penalti atau top up deposit lagi.',
      },
      langkah: [
        'Hentikan transfer sekarang juga! Jangan pernah menuruti alasan pelaku bahwa uang komisi akan cair setelah deposit tambahan.',
        'Hubungi bank pengirim sekarang juga untuk meminta pemblokiran rekening tujuan transfer sindikat pelaku.',
        'Lapor ke Indonesia Anti-Scam Centre (IASC) di iasc.ojk.go.id secepatnya dengan nomor rekening penerima deposit.',
        'Siapkan bukti transaksi, nomor rekening pelaku, kronologi kejadian, dan nilai kerugian untuk laporan kepolisian.',
      ],
    },
    akun_diambil: {
      labelRingkas: 'Diancam / Akun Ditahan',
      labelLengkap: 'Diancam Somasi, Dilaporkan Polisi, atau Akun Ditahan',
      urgensi: {
        waktu: 'Prioritas: Abaikan Ancaman & Blokir Semua Kontak',
        prioritas:
          'Ancaman hukum dan denda dari admin tugas adalah manipulasi psikologis sindikat untuk memeras uang Anda.',
      },
      langkah: [
        'Jangan takut terhadap ancaman denda pidana, somasi, atau laporan polisi dari pelaku. Itu adalah intimidasi palsu sindikat penipuan.',
        'Simpan semua tangkapan layar percakapan, nomor rekening, dan ancaman pelaku sebagai bukti dokumentasi.',
        'Blokir seluruh nomor dan akun komplotan penipu di WhatsApp maupun Telegram.',
        'Segera kabari kontak, keluarga, dan teman bahwa akunmu sedang ditarget penipuan dan laporkan ke kepolisian bila diperlukan.',
      ],
    },
  },
  family_impersonation: {
    klik_link: {
      labelRingkas: 'Percaya Chat Pengirim',
      labelLengkap: 'Terlanjur Merespons Pesan Mengaku Teman / Keluarga',
      urgensi: {
        waktu: 'Tindakan Segera: Telepon Nomor Lama Kontak',
        prioritas:
          'Segera verifikasi keaslian pengirim melalui telepon langsung atau pertanyaan rahasia.',
      },
      langkah: [
        'Tutup halaman web tersebut segera jika pelaku mengirimkan tautan apa pun.',
        'Hubungi nomor HP lama teman/kerabat yang bersangkutan melalui panggilan telepon langsung (bukan chat) untuk konfirmasi.',
        'Jangan mengisi formulir atau data apa pun dan jangan percaya alasan "HP rusak" atau "pinjam HP teman".',
        'Beritahu teman/kerabat asli bahwa namanya sedang dicatut pihak tidak dikenal untuk meminta uang atau data.',
      ],
    },
    isi_data: {
      labelRingkas: 'Kirim Data Pribadi',
      labelLengkap: 'Terlanjur Mengirimkan Foto atau Informasi Sensitif',
      urgensi: {
        waktu: 'Tindakan Cepat: Hentikan Komunikasi Segera',
        prioritas:
          'Jangan berikan dokumen atau uang tambahan dan amankan akun pribadi.',
      },
      langkah: [
        'Ganti password lewat aplikasi atau situs web resmi dan aktifkan verifikasi dua langkah (2FA / Two-Factor Authentication).',
        'Keluarkan (log out) semua sesi perangkat yang tidak dikenal dari menu setelan akun.',
        'Jangan berikan informasi atau uang tambahan apa pun meskipun pelaku mengaku dalam kondisi darurat.',
        'Simpan rekaman chat sebagai bukti jika ada indikasi pemerasan atau pencemaran nama baik.',
      ],
    },
    kirim_otp: {
      labelRingkas: 'Kirim OTP Akun',
      labelLengkap: 'Terlanjur Memberikan OTP Akun WhatsApp / Pesan ke Pelaku',
      urgensi: {
        waktu: 'Tindakan Segera: Amankan WhatsApp Anda',
        prioritas:
          'Segera putuskan sesi perangkat terhubung agar pelaku tidak dapat membajak akun pesan Anda.',
      },
      langkah: [
        'Untuk WhatsApp, periksa menu Perangkat Tertaut (Linked Devices) dan segera keluarkan perangkat asing yang tidak dikenal.',
        'Hubungi call center bank atau penyedia layanan lewat nomor resmi di kartu atau aplikasi sekarang juga jika OTP terkait perbankan.',
        'Minta pemblokiran sementara transaksi atau akun yang bersangkutan.',
        'Pasang PIN Verifikasi Dua Langkah di setelan WhatsApp agar pelaku tidak bisa login ulang.',
      ],
    },
    transfer: {
      labelRingkas: 'Sudah Transfer',
      labelLengkap: 'Terlanjur Mentransfer Uang Pinjaman ke Rekening Pelaku',
      urgensi: {
        waktu: 'Waktu Kritis: 30 - 60 Menit Pertama',
        prioritas:
          'Peluang terbesar penahanan atau pemblokiran rekening tujuan adalah sesegera mungkin setelah transaksi dilakukan.',
      },
      langkah: [
        'Hubungi bank pengirim sekarang juga untuk meminta pemblokiran rekening tujuan transfer.',
        'Lapor ke Indonesia Anti-Scam Centre (IASC) di iasc.ojk.go.id secepatnya.',
        'Siapkan bukti transaksi, nomor rekening pelaku, kronologi kejadian, dan nilai kerugian.',
        'Buat laporan kepolisian di kantor polisi terdekat untuk proses hukum lebih lanjut.',
      ],
    },
    akun_diambil: {
      labelRingkas: 'Akun WhatsApp Dibajak',
      labelLengkap: 'Akun WhatsApp / Media Sosial Terlanjur Dikuasai Pelaku',
      urgensi: {
        waktu: 'Prioritas: Beri Tahu Kontak Terdekat Segera',
        prioritas:
          'Segera umumkan ke keluarga dan teman agar tidak tertipu jika dihubungi pelaku atas nama Anda.',
      },
      langkah: [
        'Segera kabari kontak, keluarga, dan teman bahwa akunmu sedang dikuasai orang lain agar mereka tidak tertipu jika dihubungi pelaku.',
        'Pulihkan akun lewat fitur pemulihan resmi di aplikasi terkait (misalnya Pusat Bantuan WhatsApp, Instagram, atau Google).',
        'Kirim email ke support@whatsapp.com dengan subjek "Hilang/Dicuri: Silakan nonaktifkan akun saya" disertai nomor telepon lengkap.',
        'Laporkan pengambilalihan akun ke penyedia platform terkait dan operator seluler.',
      ],
    },
  },
};

/**
 * Mengambil informasi langkah dan label kontekstual berdasarkan situasi dan modus.
 */
export function getKonteksSituasi(
  situasiId: SituasiDarurat,
  modus: ModusPenipuan,
  langkahDaruratData: LangkahDaruratData = DEFAULT_LANGKAH_DARURAT
): KonteksSituasiItem {
  if (modus !== 'umum' && KONTEKS_DARURAT_MAP[modus]?.[situasiId]) {
    return KONTEKS_DARURAT_MAP[modus][situasiId];
  }

  // Fallback ke data umum bawaan
  const item = langkahDaruratData.situasi.find((s) => s.id === situasiId);
  return {
    labelRingkas: LABEL_RINGKAS_SITUASI[situasiId] || situasiId,
    labelLengkap: item?.label || LABEL_RINGKAS_SITUASI[situasiId] || situasiId,
    urgensi: INFORMASI_URGENSI_SITUASI[situasiId] || {
      waktu: 'Tindakan Segera: Lakukan Pencegahan',
      prioritas: 'Ikuti langkah penyelamatan berikut secara berurutan secepatnya.',
    },
    langkah: item?.langkah || [],
  };
}

export interface PanelDaruratProps {
  situasiAktif?: SituasiDarurat | SituasiDarurat[];
  langkahDarurat?: LangkahDaruratData;
  autoOpen?: boolean;
  className?: string;
  onSelectSituasi?: (situasi: SituasiDarurat) => void;
  onToggleStep?: (
    situasi: SituasiDarurat,
    stepIndex: number,
    checked: boolean
  ) => void;
  /** Daftar temuan dari hasil analisis untuk penyesuaian kontekstual */
  temuan?: Array<{ judul: string; penjelasan: string; bukti?: string; sumber?: string }>;
  /** Daftar langkah pencegahan praktis dari hasil analisis */
  langkah?: string[];
  /** Ringkasan hasil analisis */
  ringkasan?: string;
  /** Halaman asal pemeriksaan */
  halaman?: string;
  /** Teks transkrip atau pesan chat */
  transkrip?: string;
  /** URL target yang diperiksa */
  url?: string;
  /** Flag eksplisit penanda konteks APK */
  isApk?: boolean;
}

/**
 * Komponen PanelDarurat
 *
 * Menampilkan panduan darurat "Sudah terlanjur?" untuk 5 situasi:
 * 1. klik_link: Sudah klik link / unduh APK
 * 2. isi_data: Sudah mengisi password atau data akun
 * 3. kirim_otp: Sudah mengirim OTP
 * 4. transfer: Sudah transfer
 * 5. akun_diambil: Akun diambil alih
 *
 * Secara dinamis menyesuaikan seluruh tab, judul langkah, urgensi, dan checklist
 * sesuai dengan modus penipuan yang terdeteksi (APK, Phishing Bank, Task Scam, Impersonation).
 *
 * References: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 27.2
 */
export function PanelDarurat({
  situasiAktif,
  langkahDarurat = DEFAULT_LANGKAH_DARURAT,
  autoOpen = false,
  className = '',
  onSelectSituasi,
  onToggleStep,
  temuan,
  langkah,
  ringkasan,
  halaman,
  transkrip,
  url,
  isApk,
}: PanelDaruratProps): React.JSX.Element {
  // Deteksi modus penipuan kontekstual
  const modus = deteksiModusPenipuan({
    isApk,
    temuan,
    langkah,
    ringkasan,
    transkrip,
    url,
  });

  const normalisasiSituasiAktif: SituasiDarurat[] = Array.isArray(situasiAktif)
    ? situasiAktif
    : situasiAktif
    ? [situasiAktif]
    : [];

  const adaSituasiAktif = normalisasiSituasiAktif.length > 0;
  const defaultSituasi: SituasiDarurat =
    normalisasiSituasiAktif[0] ?? 'klik_link';

  const [isOpen, setIsOpen] = useState<boolean>(
    () => autoOpen || adaSituasiAktif
  );
  const [selectedSituasiId, setSelectedSituasiId] =
    useState<SituasiDarurat>(defaultSituasi);
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [salinDaruratStatus, setSalinDaruratStatus] = useState<boolean>(false);
  const [templateCopied, setTemplateCopied] = useState<boolean>(false);

  const konteksAktif = getKonteksSituasi(
    selectedSituasiId,
    modus,
    langkahDarurat
  );
  const selectedSteps = konteksAktif.langkah;
  const judulSituasiTampil = konteksAktif.labelLengkap;
  const urgensi = konteksAktif.urgensi;

  const completedDaruratCount = selectedSteps.filter((_, idx) =>
    Boolean(checkedState[`${selectedSituasiId}-${idx}`])
  ).length;

  const progressPct =
    selectedSteps.length > 0
      ? Math.round((completedDaruratCount / selectedSteps.length) * 100)
      : 0;

  const handleSelectTab = (id: SituasiDarurat) => {
    setSelectedSituasiId(id);
    onSelectSituasi?.(id);
  };

  const handleToggleCheck = (stepIndex: number) => {
    const key = `${selectedSituasiId}-${stepIndex}`;
    const nextVal = !checkedState[key];
    setCheckedState((prev) => ({ ...prev, [key]: nextVal }));
    onToggleStep?.(selectedSituasiId, stepIndex, nextVal);
  };

  const handleSalinDarurat = async () => {
    const lines = selectedSteps.map((teks, idx) => {
      const isChecked = Boolean(checkedState[`${selectedSituasiId}-${idx}`]);
      return `${isChecked ? '[Selesai]' : '[Belum]'} Tindakan ${idx + 1}: ${teks}`;
    });

    const output = `Status Tindakan Darurat (${judulSituasiTampil}):\n${lines.join('\n')}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(output);
        setSalinDaruratStatus(true);
        setTimeout(() => setSalinDaruratStatus(false), 2500);
      }
    } catch {
      // Fallback diam
    }
  };

  const handleSalinTemplateBukti = async () => {
    const template = `DRAF KRONOLOGI PENIPUAN UNTUK BANK/IASC:
1. Waktu Kejadian: [Hari, Tanggal, Jam]
2. Rekening Korban: [Bank Anda, No Rekening, Atas Nama]
3. Rekening Tujuan / Pelaku: [Bank Pelaku, No Rekening, Atas Nama]
4. Jumlah Kerugian: Rp [Nominal Transfer]
5. Saluran Komunikasi: [WhatsApp / Telegram / SMS / Telepon]
6. Modus Penipuan: [Misal: link phishing, transfer mendesak, tawaran kerja, file APK]
7. Kronologi Singkat: [Jelaskan singkat kejadian]`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(template);
        setTemplateCopied(true);
        setTimeout(() => setTemplateCopied(false), 2500);
      }
    } catch {
      // Fallback diam
    }
  };

  return (
    <section
      data-testid="panel-darurat-section"
      aria-label="Panel darurat: Sudah terlanjur?"
      className={`rounded-2xl border border-red-300 bg-white shadow-sm overflow-hidden transition-all duration-200 ${className}`.trim()}
    >
      {/* Header Accordion Toggle */}
      <button
        type="button"
        data-testid="panel-darurat-toggle"
        aria-expanded={isOpen}
        aria-controls="panel-darurat-content"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 sm:p-5 bg-gradient-to-r from-red-50 to-rose-50 hover:bg-red-100/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 transition-colors min-h-[44px] text-left border-b border-red-200"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600 text-white shrink-0 shadow-sm"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-red-950 tracking-tight">
                Sudah Terlanjur?
              </h3>
              {adaSituasiAktif && (
                <span
                  data-testid="badge-darurat-terdeteksi"
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse"
                >
                  Tindakan Terdeteksi
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-red-800 font-medium mt-0.5">
              Panduan penyelamatan cepat jika kamu sudah sempat klik link, kirim OTP, atau transfer.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="hidden sm:inline text-xs font-bold text-red-700 uppercase tracking-wider">
            {isOpen ? 'Tutup' : 'Buka'}
          </span>
          <svg
            className={`w-5 h-5 text-red-700 transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Konten Utama Saat Terbuka */}
      {isOpen && (
        <div
          id="panel-darurat-content"
          data-testid="panel-darurat-content"
          className="p-4 sm:p-6 space-y-6 bg-white"
        >
          {/* Banner situasi terdeteksi jika terpicu */}
          {adaSituasiAktif && (
            <div
              data-testid="banner-situasi-terdeteksi"
              className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-xl text-red-900 text-xs sm:text-sm shadow-sm space-y-1"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-red-600" aria-hidden="true" />
                <span>Peringatan Tindakan Berisiko Terdeteksi:</span>
              </div>
              <p className="leading-relaxed">
                Pemeriksaan mendeteksi indikasi{' '}
                <strong className="font-bold underline">
                  {normalisasiSituasiAktif
                    .map((id) => getKonteksSituasi(id, modus, langkahDarurat).labelRingkas)
                    .join(' dan ')}
                </strong>
                . Segera ikuti langkah penyelamatan di bawah tanpa menunda.
              </p>
            </div>
          )}

          {/* Tablist Pemilihan Situasi Dinamis Sesuai Modus (Requirement 7.1) */}
          <div>
            <span
              id="label-situasi-tablist"
              className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700 mb-2.5"
            >
              Pilih situasi yang kamu alami:
            </span>
            <div
              role="tablist"
              aria-labelledby="label-situasi-tablist"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
            >
              {DAFTAR_SITUASI_ID.map((situasiId) => {
                const isSelected = situasiId === selectedSituasiId;
                const isDetected = normalisasiSituasiAktif.includes(situasiId);
                const showIndicator = isDetected && !isSelected;
                const tabKonteks = getKonteksSituasi(
                  situasiId,
                  modus,
                  langkahDarurat
                );
                const ringkas = tabKonteks.labelRingkas;

                return (
                  <button
                    key={situasiId}
                    type="button"
                    role="tab"
                    id={`tab-${situasiId}`}
                    data-testid={`tab-situasi-${situasiId}`}
                    aria-selected={isSelected}
                    aria-controls={`panel-langkah-${situasiId}`}
                    onClick={() => handleSelectTab(situasiId)}
                    className={`relative p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center text-center ${
                      isSelected
                        ? 'bg-red-700 text-white border-red-700 shadow-sm'
                        : isDetected
                        ? 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100'
                        : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <span className="leading-tight">{ringkas}</span>
                    {showIndicator && (
                      <span
                        data-testid={`badge-terdeteksi-${situasiId}`}
                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-sm"
                        title="Situasi ini terdeteksi dari pesan"
                      >
                        !
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist Langkah Darurat per Situasi (Requirement 7.2, 7.3) */}
          <div
            id={`panel-langkah-${selectedSituasiId}`}
            role="tabpanel"
            aria-labelledby={`tab-${selectedSituasiId}`}
            data-testid={`panel-langkah-${selectedSituasiId}`}
            className="bg-white rounded-xl border border-red-200 p-4 sm:p-5 shadow-sm space-y-4"
          >
            {/* Header Tab Panel & Status Singkat */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" aria-hidden="true" />
                <h4 className="text-sm sm:text-base font-bold text-gray-900">
                  Langkah Penyelamatan: {judulSituasiTampil}
                </h4>
              </div>
              {completedDaruratCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {completedDaruratCount} dari {selectedSteps.length} langkah dijalankan
                </span>
              )}
            </div>

            {/* Banner Urgensi / Waktu Kritis Situasi (Golden Time) */}
            {urgensi && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 text-xs text-red-950">
                <div className="flex items-center gap-1 font-bold shrink-0 px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] shadow-xs">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{urgensi.waktu}</span>
                </div>
                <p className="leading-relaxed font-medium">
                  {urgensi.prioritas}
                </p>
              </div>
            )}

            {/* Progress Bar Interaktif Langkah Darurat */}
            <div
              className="p-3 bg-gray-50 rounded-xl border border-gray-200"
              aria-label={`Progres penyelamatan darurat untuk ${judulSituasiTampil}`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      completedDaruratCount === selectedSteps.length
                        ? 'bg-emerald-600'
                        : completedDaruratCount > 0
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {completedDaruratCount === selectedSteps.length
                      ? 'Semua tindakan darurat telah ditandai selesai'
                      : `${completedDaruratCount} dari ${selectedSteps.length} tindakan darurat selesai`}
                  </span>
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    completedDaruratCount === selectedSteps.length
                      ? 'text-emerald-700'
                      : 'text-red-700'
                  }`}
                >
                  {progressPct}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progres penyelamatan: ${progressPct} persen`}
                className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full transition-all duration-300 ease-out rounded-full ${
                    completedDaruratCount === selectedSteps.length
                      ? 'bg-emerald-600'
                      : completedDaruratCount > 0
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Lakukan langkah-langkah darurat berikut secara berurutan secepatnya:
            </p>

            <ol className="space-y-2.5 pt-1" role="list">
              {selectedSteps.map((teks, idx) => {
                const checkKey = `${selectedSituasiId}-${idx}`;
                const isChecked = Boolean(checkedState[checkKey]);
                const inputId = `darurat-input-${checkKey}`;

                const isIascStep = teks.includes('iasc.ojk.go.id') || teks.includes('IASC');
                const isBankStep =
                  teks.toLowerCase().includes('bank pengirim') ||
                  teks.toLowerCase().includes('call center bank');
                const isWaStep =
                  teks.includes('Perangkat Tertaut') || teks.includes('Linked Devices');
                const isBuktiStep =
                  teks.toLowerCase().includes('bukti transaksi') ||
                  teks.toLowerCase().includes('nomor rekening pelaku');
                const isApkStep = modus === 'apk';

                return (
                  <li
                    key={idx}
                    data-testid={`darurat-step-${selectedSituasiId}-${idx}`}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      isChecked
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] -m-2">
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(idx)}
                        aria-label={`Tandai langkah darurat ${idx + 1} sudah dilakukan: ${teks}`}
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer transition-colors"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <label
                        htmlFor={inputId}
                        className={`block text-xs sm:text-sm leading-relaxed font-semibold cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'text-gray-500 line-through'
                            : 'text-gray-900'
                        }`}
                      >
                        <span className="sr-only">Langkah {idx + 1}: </span>
                        {teks}
                      </label>

                      {/* Status Selesai Badge */}
                      {isChecked && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Sudah dilakukan
                        </span>
                      )}

                      {/* Quick Helper khusus konteks APK */}
                      {isApkStep && selectedSituasiId === 'klik_link' && idx === 1 && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-800 font-semibold bg-red-50/90 px-2.5 py-1.5 rounded-lg border border-red-200">
                          <svg className="w-3.5 h-3.5 shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Wajib: Putuskan koneksi internet seketika agar malware tidak mentransfer data atau SMS OTP.</span>
                        </div>
                      )}

                      {isApkStep && selectedSituasiId === 'klik_link' && idx === 2 && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 font-normal leading-relaxed">
                          <strong className="font-semibold text-amber-900 block mb-0.5">Panduan Mencopot APK Berbahaya:</strong>
                          Buka Pengaturan HP &gt; Aplikasi / Manajemen Aplikasi &gt; Cari aplikasi yang mencurigakan, tanpa ikon, atau baru saja dipasang &gt; Pilih <strong>Copot Pemasangan (Uninstall)</strong>.
                        </div>
                      )}

                      {isApkStep && selectedSituasiId === 'klik_link' && idx === 3 && (
                        <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 leading-relaxed">
                          Tip: Buka aplikasi File Manager / Pengelola File &gt; Folder <strong>Download / Unduhan</strong> &gt; Hapus berkas file berekstensi <strong>.apk</strong> secara permanen agar tidak sengaja terpasang kembali.
                        </div>
                      )}

                      {isApkStep && selectedSituasiId === 'klik_link' && idx === 4 && (
                        <div className="mt-2 p-2.5 rounded-lg bg-blue-50/90 border border-blue-200 text-xs text-blue-950 font-normal leading-relaxed">
                          <strong className="font-semibold text-blue-900 block mb-0.5">Perhatian Izin Khusus:</strong>
                          Buka Pengaturan &gt; Aksesibilitas. Periksa apakah ada aplikasi asing yang memiliki izin aktif. Jika ada, segera matikan izinnya lalu mulai ulang (restart) perangkat.
                        </div>
                      )}

                      {/* Quick Helper: Tautan Langsung ke Form IASC */}
                      {isIascStep && (
                        <div className="pt-2">
                          <a
                            href="https://iasc.ojk.go.id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs"
                            aria-label="Buka form laporan resmi di situs IASC OJK di tab baru"
                          >
                            <span>Buka Form Aduan IASC</span>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}

                      {/* Quick Helper: Salin Template Draf Laporan */}
                      {isBuktiStep && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSalinTemplateBukti}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
                            title="Salin template format laporan penipuan transaksi"
                          >
                            {templateCopied ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-emerald-700">Format Draf Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Salin Format Draf Laporan</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Quick Helper: Panduan Keluar Sesi WA */}
                      {isWaStep && (
                        <div className="mt-2 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-xs text-amber-950 font-normal leading-relaxed">
                          <strong className="font-semibold text-amber-900 block mb-0.5">Panduan Cepat Putus Akses WhatsApp:</strong>
                          Buka WhatsApp &gt; Ketuk Setelan (titik tiga) &gt; Perangkat Tertaut &gt; Ketuk sesi komputer/perangkat yang tidak dikenal &gt; Pilih <strong>Keluar</strong>.
                        </div>
                      )}

                      {/* Quick Helper: Tip Nomor Bank */}
                      {isBankStep && (
                        <div className="mt-1.5 text-xs text-gray-700">
                          Tip: Hubungi nomor resmi yang tercetak di kartu fisik debit/ATM atau menu bantuan aplikasi resmi bank Anda.
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Footer Panel: Salin Catatan Status Penyelamatan */}
            <div className="pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs text-gray-700">
                Pantau tindakan yang sudah selesai Anda ambil untuk penyelamatan dana atau akun.
              </span>

              <button
                type="button"
                onClick={handleSalinDarurat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 min-h-[36px]"
                title="Salin catatan status tindakan darurat ke clipboard"
              >
                {salinDaruratStatus ? (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700">Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Salin Status Penyelamatan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seksi 4 Kanal Lapor Resmi (Requirement 7.4) */}
          <div
            data-testid="seksi-kanal-lapor"
            className="space-y-3 pt-2 border-t border-gray-100"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900">
                Kanal Lapor Resmi:
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. IASC */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Indonesia Anti-Scam Centre (IASC)
                  </h5>
                  <span className="text-[11px] font-mono font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">
                    iasc.ojk.go.id
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Laporan penipuan keuangan resmi dari OJK dan perbankan. Siapkan identitas korban, kronologi, nomor rekening pelaku, nilai kerugian, dan bukti transaksi. Semakin cepat melapor, semakin besar peluang dana diselamatkan.
                </p>
                <div className="pt-1">
                  <a
                    href="https://iasc.ojk.go.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Buka situs resmi Indonesia Anti-Scam Centre (IASC) di tab baru"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors min-h-[44px]"
                  >
                    <span>Buka Situs Resmi IASC</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* 2. Kontak OJK 157 */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Kontak OJK 157
                  </h5>
                  <span className="text-[11px] font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                    157
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Layanan informasi dan pengaduan konsumen sektor jasa keuangan resmi dari Otoritas Jasa Keuangan.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="tel:157"
                    aria-label="Telepon 157"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 transition-colors min-h-[44px]"
                  >
                    <span>Telepon 157</span>
                  </a>
                  <a
                    href="https://wa.me/6281157157157"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp OJK"
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors min-h-[44px]"
                  >
                    <span>WhatsApp OJK</span>
                  </a>
                </div>
              </div>

              {/* 3. Call Center Bank / Dompet Digital */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Call Center Bank / Dompet Digital
                  </h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Hubungi call center resmi yang tertera di kartu ATM atau aplikasi mobile banking / dompet digitalmu untuk meminta pemblokiran rekening atau akun.
                </p>
                <div className="text-xs font-semibold text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
                  Nomor resmi di kartu ATM atau aplikasi resmi
                </div>
              </div>

              {/* 4. Fitur Laporkan di Platform Pesan */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900">
                    Fitur Laporkan di Platform Pesan
                  </h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Gunakan fitur Laporkan (Report) dan Blokir (Block) pada WhatsApp, Telegram, Instagram, TikTok, atau platform tempat pesan diterima.
                </p>
                <div className="text-xs font-semibold text-gray-800 bg-gray-50 p-2 rounded border border-gray-200">
                  Fitur Laporkan & Blokir di aplikasi
                </div>
              </div>
            </div>
          </div>

          {/* Peringatan Resmi Mengaku IASC (Requirement 7.5) */}
          <div
            data-testid="peringatan-resmi-iasc"
            className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 flex items-start gap-3 shadow-sm"
            role="alert"
          >
            <div className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-amber-950">
              <p className="font-bold">Peringatan Penting:</p>
              <p className="leading-relaxed font-medium">
                {langkahDarurat.peringatan}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PanelDarurat;