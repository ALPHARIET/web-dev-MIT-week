/**
 * lib/sensor.ts
 * Utilitas sensor otomatis untuk menyamarkan data sensitif sebelum dikirim ke backend / AI.
 *
 * Murni TypeScript tanpa dependensi eksternal, kompatibel di browser dan server.
 * References: Requirements 12.1, 12.4
 */

/**
 * Placeholder yang digunakan untuk mengganti data sensitif.
 */
export const SENSOR_PLACEHOLDER = '[disensor]';

/**
 * Regex untuk mendeteksi alamat email: [\w.-]+@[\w.-]+\.\w+
 */
export const POLA_EMAIL = /[\w.-]+@[\w.-]+\.\w+/g;

/**
 * Regex untuk mendeteksi nomor HP Indonesia:
 * Diawali (+62, 62, atau 0) diikuti 8-12 digit lanjutan.
 * Lookaround (?<!\d) dan (?!\d) digunakan untuk mencegah pemotongan sebagian digit
 * dari nomor yang lebih panjang (misalnya nomor rekening 16 digit).
 */
export const POLA_NOMOR_HP = /(?<!\d)(?:\+?62|0)\d{8,12}(?!\d)/g;

/**
 * Regex untuk mendeteksi nomor rekening bank (10-16 digit) dengan batas kata (\b).
 */
export const POLA_NOMOR_REKENING = /\b\d{10,16}\b/g;

/**
 * Regex untuk mendeteksi deretan 4-8 angka (PIN, OTP, kode verifikasi) dengan batas kata (\b).
 */
export const POLA_DERETAN_ANGKA = /\b\d{4,8}\b/g;

/**
 * Objek hasil sensor otomatis teks.
 */
export interface HasilSensor {
  hasil: string;
  jumlahDiganti: number;
}

/**
 * Mengganti data sensitif dalam teks dengan placeholder `[disensor]`.
 * Pola sensitif yang dideteksi:
 * 1. Alamat email
 * 2. Nomor HP Indonesia (+62, 62, atau 0 diikuti 8-12 digit)
 * 3. Nomor rekening (10-16 digit)
 * 4. Deretan 4-8 angka (PIN, OTP, kode verifikasi)
 *
 * @param teks - Teks masukan yang akan disensor
 * @returns Objek `{ hasil: string, jumlahDiganti: number }`
 */
export function sensorTeks(teks: string): HasilSensor {
  if (!teks) {
    return { hasil: '', jumlahDiganti: 0 };
  }

  let jumlahDiganti = 0;

  // 1. Alamat email (dijalankan lebih dulu agar angka di dalam email tidak terpotong)
  let hasil = teks.replace(new RegExp(POLA_EMAIL.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  // 2. Nomor HP Indonesia (+62, 62, atau 0 diikuti 8-12 digit)
  hasil = hasil.replace(new RegExp(POLA_NOMOR_HP.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  // 3. Nomor rekening (10-16 digit)
  hasil = hasil.replace(new RegExp(POLA_NOMOR_REKENING.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  // 4. Deretan 4-8 angka (PIN, OTP, kode verifikasi)
  hasil = hasil.replace(new RegExp(POLA_DERETAN_ANGKA.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  return {
    hasil,
    jumlahDiganti,
  };
}
