/**
 * lib/sensor.pbt.test.ts
 *
 * Property-based tests untuk utilitas sensor otomatis teks:
 * - Property 6: Sensor otomatis mengganti semua pola sensitif
 *
 * References: Requirements 12.1, and design.md
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  sensorTeks,
  SENSOR_PLACEHOLDER,
  POLA_EMAIL,
  POLA_NOMOR_HP,
  POLA_NOMOR_REKENING,
  POLA_DERETAN_ANGKA,
} from './sensor';
import {
  arbitraryTeksWithSensitif,
  arbitraryTeksWithSensitifDetail,
  arbitraryTeksWithMultipleSensitif,
  arbitraryNomorHp,
  arbitraryNomorRekening,
  arbitraryEmail,
  arbitraryOtpPin,
  arbitraryTeksNonSensitif,
} from '../test/arbitraries';

describe('lib/sensor.pbt.test.ts', () => {
  describe('Property 6: Sensor otomatis mengganti semua pola sensitif', () => {
    /**
     * Feature: cek-penipuan-web, Property 6: Sensor otomatis mengganti semua pola sensitif
     * **Validates: Requirements 12.1**
     *
     * Invariant: Untuk setiap teks input yang mengandung pola sensitif
     * (nomor HP Indonesia, deretan 4-8 angka, alamat email, nomor rekening 10-16 digit):
     * - Semua kemunculan pola sensitif diganti dengan `[disensor]`
     * - Teks non-sensitif di sekitarnya tidak rusak
     * - Fungsi idempoten jika dijalankan ulang pada teks yang sudah disensor
     */
    it('Feature: cek-penipuan-web, Property 6: Sensor otomatis mengganti semua pola sensitif (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(arbitraryTeksWithSensitifDetail(), (detail) => {
          const res = sensorTeks(detail.teks);

          // 1. Pola sensitif diganti dengan [disensor]
          expect(res.hasil).toBe(detail.expected);
          expect(res.hasil).toContain(SENSOR_PLACEHOLDER);
          expect(res.jumlahDiganti).toBeGreaterThanOrEqual(1);

          // 2. Teks non-sensitif di sekitarnya tidak rusak
          if (detail.prefix) {
            expect(res.hasil.startsWith(detail.prefix)).toBe(true);
          }
          if (detail.suffix) {
            expect(res.hasil.endsWith(detail.suffix)).toBe(true);
          }

          // 3. Fungsi idempoten jika dijalankan ulang pada teks yang sudah disensor
          const reCek = sensorTeks(res.hasil);
          expect(reCek.hasil).toBe(res.hasil);
          expect(reCek.jumlahDiganti).toBe(0);
        }),
        { numRuns: 200 }
      );
    });

    it('mengganti nomor HP Indonesia (+62, 62, 0) dengan [disensor] tanpa merusak teks sekitarnya (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(
          arbitraryTeksNonSensitif(),
          arbitraryNomorHp(),
          arbitraryTeksNonSensitif(),
          (prefix, hp, suffix) => {
            const p = prefix.trim();
            const s = suffix.trim();
            const prefixStr = p ? `${p} ` : '';
            const suffixStr = s ? ` ${s}` : '';
            const teks = `${prefixStr}${hp}${suffixStr}`;
            const expected = `${prefixStr}${SENSOR_PLACEHOLDER}${suffixStr}`;

            const res = sensorTeks(teks);

            expect(res.hasil).toBe(expected);
            expect(res.jumlahDiganti).toBe(1);
            if (prefixStr) expect(res.hasil.startsWith(prefixStr)).toBe(true);
            if (suffixStr) expect(res.hasil.endsWith(suffixStr)).toBe(true);

            // Idempoten
            const reCek = sensorTeks(res.hasil);
            expect(reCek.hasil).toBe(res.hasil);
            expect(reCek.jumlahDiganti).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('mengganti deretan 4-8 digit angka (OTP / PIN) dengan [disensor] tanpa merusak teks sekitarnya (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(
          arbitraryTeksNonSensitif(),
          arbitraryOtpPin(),
          arbitraryTeksNonSensitif(),
          (prefix, otpPin, suffix) => {
            const p = prefix.trim();
            const s = suffix.trim();
            const prefixStr = p ? `${p} ` : '';
            const suffixStr = s ? ` ${s}` : '';
            const teks = `${prefixStr}${otpPin}${suffixStr}`;
            const expected = `${prefixStr}${SENSOR_PLACEHOLDER}${suffixStr}`;

            const res = sensorTeks(teks);

            expect(res.hasil).toBe(expected);
            expect(res.jumlahDiganti).toBe(1);
            if (prefixStr) expect(res.hasil.startsWith(prefixStr)).toBe(true);
            if (suffixStr) expect(res.hasil.endsWith(suffixStr)).toBe(true);

            // Idempoten
            const reCek = sensorTeks(res.hasil);
            expect(reCek.hasil).toBe(res.hasil);
            expect(reCek.jumlahDiganti).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('mengganti alamat email dengan [disensor] tanpa merusak teks sekitarnya (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(
          arbitraryTeksNonSensitif(),
          arbitraryEmail(),
          arbitraryTeksNonSensitif(),
          (prefix, email, suffix) => {
            const p = prefix.trim();
            const s = suffix.trim();
            const prefixStr = p ? `${p} ` : '';
            const suffixStr = s ? ` ${s}` : '';
            const teks = `${prefixStr}${email}${suffixStr}`;
            const expected = `${prefixStr}${SENSOR_PLACEHOLDER}${suffixStr}`;

            const res = sensorTeks(teks);

            expect(res.hasil).toBe(expected);
            expect(res.jumlahDiganti).toBe(1);
            if (prefixStr) expect(res.hasil.startsWith(prefixStr)).toBe(true);
            if (suffixStr) expect(res.hasil.endsWith(suffixStr)).toBe(true);

            // Idempoten
            const reCek = sensorTeks(res.hasil);
            expect(reCek.hasil).toBe(res.hasil);
            expect(reCek.jumlahDiganti).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('mengganti nomor rekening bank (10-16 digit) dengan [disensor] tanpa merusak teks sekitarnya (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(
          arbitraryTeksNonSensitif(),
          arbitraryNomorRekening(),
          arbitraryTeksNonSensitif(),
          (prefix, rekening, suffix) => {
            const p = prefix.trim();
            const s = suffix.trim();
            const prefixStr = p ? `${p} ` : '';
            const suffixStr = s ? ` ${s}` : '';
            const teks = `${prefixStr}${rekening}${suffixStr}`;
            const expected = `${prefixStr}${SENSOR_PLACEHOLDER}${suffixStr}`;

            const res = sensorTeks(teks);

            expect(res.hasil).toBe(expected);
            expect(res.jumlahDiganti).toBe(1);
            if (prefixStr) expect(res.hasil.startsWith(prefixStr)).toBe(true);
            if (suffixStr) expect(res.hasil.endsWith(suffixStr)).toBe(true);

            // Idempoten
            const reCek = sensorTeks(res.hasil);
            expect(reCek.hasil).toBe(res.hasil);
            expect(reCek.jumlahDiganti).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('mengganti beberapa pola sensitif majemuk sekaligus dan memastikan tidak ada pola sensitif tersisa (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(arbitraryTeksWithMultipleSensitif(), (multi) => {
          const res = sensorTeks(multi.teks);

          // Jumlah penggantian harus tepat sama dengan jumlah pola yang disuntikkan
          expect(res.jumlahDiganti).toBe(multi.count);

          // Teks hasil harus memuat [disensor]
          expect(res.hasil).toContain(SENSOR_PLACEHOLDER);

          // Tidak boleh ada pola sensitif yang lolos di hasil
          expect(new RegExp(POLA_EMAIL.source, 'g').test(res.hasil)).toBe(false);
          expect(new RegExp(POLA_NOMOR_HP.source, 'g').test(res.hasil)).toBe(false);
          expect(new RegExp(POLA_NOMOR_REKENING.source, 'g').test(res.hasil)).toBe(false);
          expect(new RegExp(POLA_DERETAN_ANGKA.source, 'g').test(res.hasil)).toBe(false);

          // Idempoten
          const reCek = sensorTeks(res.hasil);
          expect(reCek.hasil).toBe(res.hasil);
          expect(reCek.jumlahDiganti).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('mempertahankan teks non-sensitif seutuhnya tanpa penggantian (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(arbitraryTeksNonSensitif(), (teks) => {
          const res = sensorTeks(teks);
          expect(res.hasil).toBe(teks);
          expect(res.jumlahDiganti).toBe(0);
        }),
        { numRuns: 100 }
      );
    });

    it('menjamin sifat idempoten universal untuk setiap teks yang dihasilkan arbitraryTeksWithSensitif (**Validates: Requirements 12.1**)', () => {
      fc.assert(
        fc.property(arbitraryTeksWithSensitif(), (teks) => {
          const run1 = sensorTeks(teks);
          const run2 = sensorTeks(run1.hasil);

          // Menjalankan ulang sensor pada hasil tidak mengubah string
          expect(run2.hasil).toBe(run1.hasil);
          // Menjalankan ulang sensor pada hasil tidak mengganti apa pun lagi
          expect(run2.jumlahDiganti).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
