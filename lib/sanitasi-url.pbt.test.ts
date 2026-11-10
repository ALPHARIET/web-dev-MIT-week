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
    it('Feature: cek-penipuan-web, Property 7: Sanitasi URL membuang parameter sensitif (**Validates: Requirements 17.4**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSensitiveParams(), (url) => {
          const parsed = parseUrl(url);
          const sanitized = sanitasiParams(parsed);

          for (const key of Object.keys(sanitized.params)) {
            expect(isSensitiveParam(key)).toBe(false);
          }

          for (const key of Object.keys(parsed.params)) {
            if (isSensitiveParam(key)) {
              expect(sanitized.params[key]).toBeUndefined();
            }
          }

          for (const [key, value] of Object.entries(parsed.params)) {
            if (!isSensitiveParam(key)) {
              expect(sanitized.params[key]).toBe(value);
            }
          }

          const expectedNonSensitiveKeys = Object.keys(parsed.params).filter(
            (k) => !isSensitiveParam(k)
          );
          expect(Object.keys(sanitized.params).length).toBe(
            expectedNonSensitiveKeys.length
          );

          const reParsed = parseUrl(sanitized.urlBersih);
          for (const key of Object.keys(reParsed.params)) {
            expect(isSensitiveParam(key)).toBe(false);
          }

          expect(reParsed.params).toEqual(sanitized.params);

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

            expect(sanitized.params[sensitiveKey]).toBeUndefined();
            expect(isSensitiveParam(sensitiveKey)).toBe(true);

            expect(sanitized.params[safeKey]).toBe(safeVal);

            const reParsed = parseUrl(sanitized.urlBersih);
            expect(reParsed.params[sensitiveKey]).toBeUndefined();
            expect(reParsed.params[safeKey]).toBe(safeVal);
          }
        ),
        { numRuns: 100 }
      );
    });

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

            for (const param of PARAMETER_SENSITIF) {
              expect(sanitized.params[param]).toBeUndefined();
            }

            expect(sanitized.params['safe_key']).toBe(safeValue);
            expect(Object.keys(sanitized.params)).toEqual(['safe_key']);

            const reParsed = parseUrl(sanitized.urlBersih);
            expect(reParsed.params).toEqual({ safe_key: safeValue });
          }
        ),
        { numRuns: 100 }
      );
    });

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

            expect(sanitized.params).toEqual({});

            expect(sanitized.urlBersih).toBe(`${base}${hash}`);
            expect(sanitized.urlBersih.includes('?')).toBe(false);

            const reParsed = parseUrl(sanitized.urlBersih);
            expect(reParsed.params).toEqual({});
          }
        ),
        { numRuns: 100 }
      );
    });

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

    it('tidak memutasi objek parsed asli maupun dictionary params-nya (**Validates: Requirements 17.4**)', () => {
      fc.assert(
        fc.property(arbitraryUrlWithSensitiveParams(), (url) => {
          const parsed = parseUrl(url);
          const originalParamsCopy = { ...parsed.params };
          const originalUrlBersih = parsed.urlBersih;

          const sanitized = sanitasiParams(parsed);

          expect(sanitized).not.toBe(parsed);
          expect(sanitized.params).not.toBe(parsed.params);

          expect(parsed.params).toEqual(originalParamsCopy);
          expect(parsed.urlBersih).toBe(originalUrlBersih);
        }),
        { numRuns: 100 }
      );
    });
  });
});
