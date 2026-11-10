export const SENSOR_PLACEHOLDER = '[disensor]';

export const POLA_EMAIL = /[\w.-]+@[\w.-]+\.\w+/g;

export const POLA_NOMOR_HP = /(?<!\d)(?:\+?62|0)\d{8,12}(?!\d)/g;

export const POLA_NOMOR_REKENING = /\b\d{10,16}\b/g;

export const POLA_DERETAN_ANGKA = /\b\d{4,8}\b/g;

export interface HasilSensor {
  hasil: string;
  jumlahDiganti: number;
}

export function sensorTeks(teks: string): HasilSensor {
  if (!teks) {
    return { hasil: '', jumlahDiganti: 0 };
  }

  let jumlahDiganti = 0;

  let hasil = teks.replace(new RegExp(POLA_EMAIL.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  hasil = hasil.replace(new RegExp(POLA_NOMOR_HP.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  hasil = hasil.replace(new RegExp(POLA_NOMOR_REKENING.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  hasil = hasil.replace(new RegExp(POLA_DERETAN_ANGKA.source, 'g'), () => {
    jumlahDiganti++;
    return SENSOR_PLACEHOLDER;
  });

  return {
    hasil,
    jumlahDiganti,
  };
}
