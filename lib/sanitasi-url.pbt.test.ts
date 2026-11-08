/**
 * lib/sanitasi-url.pbt.test.ts
 *
 * Property-based tests untuk sanitasi URL:
 * - Property 7: Sanitasi URL membuang parameter sensitif
 *
 * References: Requirements 17.4, and design.md
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseUrl,
  sanitasiParams,
  isSensitiveParam,
  PARAMETER_SENSITIF,
  type ParameterSensitif,
} from './sanitasi-url';
import { arbitraryUrlWithSensitiveParams } from '../test/arbitraries';

describe('lib/sanitasi-url.pbt.test.ts', () => {
  describe('Property 7: Sanitasi URL membuang parameter sensitif', () => {
    /**
     * Feature: cek-penipuan-web, Property 7: Sanitasi URL membuang parameter sensitif
     * **Validates: Requirements 17.4**
     *
     * Invariant: Untuk setiap URL yang mengandung parameter sensitif
     * (email, phone, token, session, id, password, otp):
     * 1. URL bersih `urlBersih` dan `params` tidak lagi mengandung parameter-parameter tersebut
     * 2. Parameter non-sensitif tetap utuh nilainya
     */
    it('Feature: cek-penipuan-web, Property 7: Sanitasi URL membuang parameter sensitif (**Validates: Requirements 17.4**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSensitiveParams(), (url) => {
          const parsed = parseUrl(url);
          const sanitized = sanitasiParams(parsed);

          // 1. Verifikasi sanitized.params tidak lagi mengandung parameter sensitif apa pun
          for (const key of Object.keys(sanitized.params)) {
            expect(isSensitiveParam(key)).toBe(false);
          }

          // 2. Verifikasi semua parameter sensitif dari parsed asli telah dibuang dari sanitized.params
          for (const key of Object.keys(parsed.params)) {
            if (isSensitiveParam(key)) {
              expect(sanitized.params[key]).toBeUndefined();
            }
          }

          // 3. Verifikasi parameter non-sensitif tetap utuh nilainya di sanitized.params
          for (const [key, value] of Object.entries(parsed.params)) {
            if (!isSensitiveParam(key)) {
              expect(sanitized.params[key]).toBe(value);
            }
          }

          // 4. Verifikasi jumlah parameter non-sensitif pada sanitized.params tepat sama
          const expectedNonSensitiveKeys = Object.keys(parsed.params).filter(
            (k) => !isSensitiveParam(k)
          );
          expect(Object.keys(sanitized.params).length).toBe(
            expectedNonSensitiveKeys.length
          );

          // 5. Verifikasi urlBersih tidak lagi mengandung parameter sensitif
          // Parsing ulang urlBersih harus menghasilkan parameter bebas dari parameter sensitif
          const reParsed = parseUrl(sanitized.urlBersih);
          for (const key of Object.keys(reParsed.params)) {
            expect(isSensitiveParam(key)).toBe(false);
          }

          // Parameter non-sensitif di urlBersih harus persis sama dengan sanitized.params
          expect(reParsed.params).toEqual(sanitized.params);

          // 6. Verifikasi langsung pada query string urlBersih tidak ada kunci sensitif
          const qIndex = sanitized.urlBersih.indexOf('?');
          if (qIndex >= 0) {
            const queryPart = sanitized.urlBersih
              .slice(qIndex + 1)
              .split('#')[0];
            const searchParams = new URLSearchParams(queryPart);
            searchParams.forEach((_, key) => {
              expect(isSensitiveParam(key)).toBe(false);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Verifikasi khusus untuk setiap 7 parameter sensitif secara individual:
     * email, phone, token, session, id, password, otp.
     * Masing-masing diuji dengan variasi huruf besar/kecil/campuran.
     * **Validates: Requirements 17.4**
     */
    it('memastikan setiap parameter sensitif dari 7 parameter yang ditentukan selalu dibuang (**Validates: Requirements 17.4**)', () => {
      const arbitrarySensitiveKey = fc.constantFrom<ParameterSensitif>(
        ...PARAMETER_SENSITIF
      );

      const arbitraryCasing = (key: string): fc.Arbitrary<string> =>
        fc.constantFrom(
          key.toLowerCase(),
          key.toUpperCase(),
          key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
        );

      const arbitrarySafeKey = fc.constantFrom(
        'page',
        'safe',
        'search',
        'ref',
        'category',
        'product_id',
        'lang'
      );

      const arbitraryValue = fc
        .array(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~'.split(
              ''
            )
          ),
          { minLength: 1, maxLength: 20 }
        )
        .map((chars) => chars.join(''));

      const arbitraryDomain = fc.constantFrom(
        'example.com',
        'shopee.co.id',
        'bca.co.id',
        'test.org'
      );

      fc.assert(
        fc.property(
          arbitraryDomain,
          arbitrarySensitiveKey.chain(arbitraryCasing),
          arbitraryValue,
          arbitrarySafeKey,
          arbitraryValue,
          (domain, sensitiveKey, sensitiveVal, safeKey, safeVal) => {
            const url = `https://${domain}/promo?${sensitiveKey}=${encodeURIComponent(
              sensitiveVal
            )}&${safeKey}=${encodeURIComponent(safeVal)}`;

            const parsed = parseUrl(url);
            const sanitized = sanitasiParams(parsed);

            // Parameter sensitif harus dibuang
            expect(sanitized.params[sensitiveKey]).toBeUndefined();
            expect(isSensitiveParam(sensitiveKey)).toBe(true);

            // Parameter non-sensitif harus tetap utuh nilainya
            expect(sanitized.params[safeKey]).toBe(safeVal);

            // urlBersih tidak memuat parameter sensitif
            const reParsed = parseUrl(sanitized.urlBersih);
            expect(reParsed.params[sensitiveKey]).toBeUndefined();
            expect(reParsed.params[safeKey]).toBe(safeVal);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Verifikasi ketika SEMUA 7 parameter sensitif hadir bersamaan dalam satu URL:
     * Seluruhnya dibuang dan parameter non-sensitif tetap terjaga.
     * **Validates: Requirements 17.4**
     */
    it('membuang seluruh 7 parameter sensitif jika hadir bersamaan (**Validates: Requirements 17.4**)', () => {
      const arbitraryValue = fc
        .array(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
              ''
            )
          ),
          { minLength: 1, maxLength: 15 }
        )
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(
          fc.array(arbitraryValue, { minLength: 7, maxLength: 7 }),
          arbitraryValue,
          (sensitiveValues, safeValue) => {
            const sp = new URLSearchParams();
            sp.append('safe_key', safeValue);

            PARAMETER_SENSITIF.forEach((param, idx) => {
              sp.append(param, sensitiveValues[idx]);
            });

            const url = `https://example.com/checkout?${sp.toString()}`;
            const parsed = parseUrl(url);
            const sanitized = sanitasiParams(parsed);

            // Semua 7 parameter sensitif harus dibuang
            for (const param of PARAMETER_SENSITIF) {
              expect(sanitized.params[param]).toBeUndefined();
            }

            // Parameter non-sensitif tetap utuh
            expect(sanitized.params['safe_key']).toBe(safeValue);
            expect(Object.keys(sanitized.params)).toEqual(['safe_key']);

            // urlBersih tidak memuat satu pun parameter sensitif
            const reParsed = parseUrl(sanitized.urlBersih);
            expect(reParsed.params).toEqual({ safe_key: safeValue });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Verifikasi ketika URL HANYA memuat parameter sensitif (tanpa parameter non-sensitif):
     * `params` menjadi kosong `{}` dan `urlBersih` tidak memiliki tanda tanya `?`
     * **Validates: Requirements 17.4**
     */
    it('menghilangkan tanda tanya dan query string saat seluruh parameter adalah sensitif (**Validates: Requirements 17.4**)', () => {
      const arbitrarySensitiveSubset = fc.subarray(
        [...PARAMETER_SENSITIF],
        { minLength: 1 }
      );

      const arbitraryValue = fc
        .array(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
          ),
          { minLength: 1, maxLength: 10 }
        )
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(
          arbitrarySensitiveSubset,
          arbitraryValue,
          fc.constantFrom('', '#fragment', '#step2'),
          (sensitiveKeys, val, hash) => {
            const sp = new URLSearchParams();
            for (const k of sensitiveKeys) {
              sp.append(k, val);
            }

            const base = 'https://example.com/login';
            const url = `${base}?${sp.toString()}${hash}`;
            const parsed = parseUrl(url);
            const sanitized = sanitasiParams(parsed);

            // params harus kosong
            expect(sanitized.params).toEqual({});

            // urlBersih tidak boleh memiliki query string '?param=...'
            expect(sanitized.urlBersih).toBe(`${base}${hash}`);
            expect(sanitized.urlBersih.includes('?')).toBe(false);

            // Parsing kembali urlBersih menghasilkan params kosong
            const reParsed = parseUrl(sanitized.urlBersih);
            expect(reParsed.params).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Sifat aljabar: Idempotensi sanitasiParams.
     * Melakukan sanitasi dua kali menghasilkan output yang identik:
     * sanitasiParams(sanitasiParams(parsed)) == sanitasiParams(parsed).
     * **Validates: Requirements 17.4**
     */
    it('memenuhi sifat idempoten: sanitasiParams(sanitasiParams(parsed)) identik (**Validates: Requirements 17.4**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSensitiveParams(), (url) => {
          const parsed = parseUrl(url);
          const sanitizedOnce = sanitasiParams(parsed);
          const sanitizedTwice = sanitasiParams(sanitizedOnce);

          expect(sanitizedTwice.params).toEqual(sanitizedOnce.params);
          expect(sanitizedTwice.urlBersih).toBe(sanitizedOnce.urlBersih);
          expect(sanitizedTwice.urlAsli).toBe(sanitizedOnce.urlAsli);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Sifat immutability:
     * sanitasiParams tidak boleh memutasi objek parsed asli atau parsed.params.
     * **Validates: Requirements 17.4**
     */
    it('tidak memutasi objek parsed asli maupun dictionary params-nya (**Validates: Requirements 17.4**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSensitiveParams(), (url) => {
          const parsed = parseUrl(url);
          const originalParamsCopy = { ...parsed.params };
          const originalUrlBersih = parsed.urlBersih;

          const sanitized = sanitasiParams(parsed);

          // Objek dan dictionary params yang dikembalikan adalah referensi baru
          expect(sanitized).not.toBe(parsed);
          expect(sanitized.params).not.toBe(parsed.params);

          // Objek parsed asli tidak termutasi
          expect(parsed.params).toEqual(originalParamsCopy);
          expect(parsed.urlBersih).toBe(originalUrlBersih);
        }),
        { numRuns: 100 }
      );
    });
  });
});
