import { describe, it, expect } from 'vitest';
import {
  parseUrl,
  sanitasiParams,
  isSensitiveParam,
  PARAMETER_SENSITIF,
} from './sanitasi-url';

describe('lib/sanitasi-url.ts', () => {
  describe('isSensitiveParam', () => {
    it('mendeteksi semua 7 parameter sensitif dalam huruf kecil', () => {
      for (const param of PARAMETER_SENSITIF) {
        expect(isSensitiveParam(param)).toBe(true);
      }
    });

    it('mendeteksi parameter sensitif secara case-insensitive', () => {
      expect(isSensitiveParam('EMAIL')).toBe(true);
      expect(isSensitiveParam('Phone')).toBe(true);
      expect(isSensitiveParam('TOKEN')).toBe(true);
      expect(isSensitiveParam('Session')).toBe(true);
      expect(isSensitiveParam('ID')).toBe(true);
      expect(isSensitiveParam('Password')).toBe(true);
      expect(isSensitiveParam('OTP')).toBe(true);
      expect(isSensitiveParam('  token  ')).toBe(true);
    });

    it('tidak menandai parameter non-sensitif sebagai sensitif', () => {
      expect(isSensitiveParam('page')).toBe(false);
      expect(isSensitiveParam('search')).toBe(false);
      expect(isSensitiveParam('utm_source')).toBe(false);
      expect(isSensitiveParam('product_id')).toBe(false);
      expect(isSensitiveParam('user_id')).toBe(false);
      expect(isSensitiveParam('auth_token')).toBe(false);
      expect(isSensitiveParam('guid')).toBe(false);
    });
  });

  describe('parseUrl — Protokol dan Format Dasar', () => {
    it('mengurai URL lengkap dengan protokol HTTPS', () => {
      const parsed = parseUrl('https://www.example.com/path?q=test');
      expect(parsed.protokol).toBe('https');
      expect(parsed.subdomain).toBe('www');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('/path');
      expect(parsed.params).toEqual({ q: 'test' });
      expect(parsed.urlAsli).toBe('https://www.example.com/path?q=test');
      expect(parsed.urlBersih).toBe('https://www.example.com/path?q=test');
    });

    it('mengurai URL lengkap dengan protokol HTTP', () => {
      const parsed = parseUrl('http://example.org/');
      expect(parsed.protokol).toBe('http');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.tld).toBe('org');
      expect(parsed.path).toBe('/');
    });

    it('mengurai input tanpa protokol', () => {
      const parsed = parseUrl('example.com/login?ref=home');
      expect(parsed.protokol).toBe('');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('/login');
      expect(parsed.params).toEqual({ ref: 'home' });
    });

    it('mengurai domain saja tanpa protokol dan tanpa path', () => {
      const parsed = parseUrl('example.com');
      expect(parsed.protokol).toBe('');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('');
      expect(parsed.params).toEqual({});
    });

    it('menangani protokol dengan huruf besar', () => {
      const parsed = parseUrl('HTTPS://EXAMPLE.COM/BERANDA');
      expect(parsed.protokol).toBe('https');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('/BERANDA');
    });

    it('menangani protokol relatif //', () => {
      const parsed = parseUrl('//sub.domain.com/path');
      expect(parsed.protokol).toBe('');
      expect(parsed.subdomain).toBe('sub');
      expect(parsed.domainUtama).toBe('domain');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('/path');
    });

    it('menangani URL dengan port', () => {
      const parsed = parseUrl('https://example.com:8080/dashboard?view=1');
      expect(parsed.protokol).toBe('https');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('/dashboard');
      expect(parsed.params).toEqual({ view: '1' });
    });

    it('menangani URL dengan kredensial pengguna (user:pass@)', () => {
      const parsed = parseUrl('https://admin:secret123@secure.bank.com/panel');
      expect(parsed.protokol).toBe('https');
      expect(parsed.subdomain).toBe('secure');
      expect(parsed.domainUtama).toBe('bank');
      expect(parsed.tld).toBe('com');
      expect(parsed.path).toBe('/panel');
    });

    it('menangani URL dengan anchor/hash fragment', () => {
      const parsed = parseUrl('https://example.com/docs#bab-1');
      expect(parsed.protokol).toBe('https');
      expect(parsed.path).toBe('/docs');
    });

    it('menghapus whitespace di awal dan akhir input', () => {
      const parsed = parseUrl('   https://example.com/test?a=1   ');
      expect(parsed.protokol).toBe('https');
      expect(parsed.domainUtama).toBe('example');
      expect(parsed.path).toBe('/test');
      expect(parsed.params).toEqual({ a: '1' });
    });

    it('menangani input string kosong secara graceful', () => {
      const parsed = parseUrl('');
      expect(parsed.protokol).toBe('');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('');
      expect(parsed.tld).toBe('');
      expect(parsed.path).toBe('');
      expect(parsed.params).toEqual({});
      expect(parsed.urlAsli).toBe('');
      expect(parsed.urlBersih).toBe('');
    });
  });

  describe('parseUrl — Penanganan Domain, Subdomain, dan TLD', () => {
    it('mengurai domain Indonesia dengan multi-part TLD .co.id', () => {
      const parsed = parseUrl('https://shopee.co.id/promo');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('shopee');
      expect(parsed.tld).toBe('co.id');
    });

    it('mengurai subdomain dengan multi-part TLD .co.id', () => {
      const parsed = parseUrl('https://m.shopee.co.id/item/123');
      expect(parsed.subdomain).toBe('m');
      expect(parsed.domainUtama).toBe('shopee');
      expect(parsed.tld).toBe('co.id');
    });

    it('mengurai multi-level subdomain dengan multi-part TLD .co.id', () => {
      const parsed = parseUrl('https://undian.promo.bca.co.id/login');
      expect(parsed.subdomain).toBe('undian.promo');
      expect(parsed.domainUtama).toBe('bca');
      expect(parsed.tld).toBe('co.id');
      expect(parsed.path).toBe('/login');
    });

    it('mengurai domain Indonesia single-part TLD .id', () => {
      const parsed = parseUrl('https://bca.id/');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('bca');
      expect(parsed.tld).toBe('id');
    });

    it('mengurai subdomain pada domain .id', () => {
      const parsed = parseUrl('https://klik.bca.id/');
      expect(parsed.subdomain).toBe('klik');
      expect(parsed.domainUtama).toBe('bca');
      expect(parsed.tld).toBe('id');
    });

    it('mengurai domain pendek seperti s.id', () => {
      const parsed = parseUrl('https://s.id/dana-kaget');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('s');
      expect(parsed.tld).toBe('id');
      expect(parsed.path).toBe('/dana-kaget');
    });

    it('mengurai berbagai ccSLD Indonesia lainnya (.web.id, .ac.id, .go.id, .biz.id)', () => {
      expect(parseUrl('https://kampus.ac.id').tld).toBe('ac.id');
      expect(parseUrl('https://pemerintah.go.id').tld).toBe('go.id');
      expect(parseUrl('https://komunitas.web.id').tld).toBe('web.id');
      expect(parseUrl('https://toko.biz.id').tld).toBe('biz.id');
    });

    it('mengurai multi-part TLD internasional (.co.uk, .com.au, .co.jp)', () => {
      const uk = parseUrl('https://news.bbc.co.uk/world');
      expect(uk.subdomain).toBe('news');
      expect(uk.domainUtama).toBe('bbc');
      expect(uk.tld).toBe('co.uk');

      const au = parseUrl('https://shop.myer.com.au/');
      expect(au.subdomain).toBe('shop');
      expect(au.domainUtama).toBe('myer');
      expect(au.tld).toBe('com.au');
    });

    it('mengurai domain punycode', () => {
      const parsed = parseUrl('https://xn--shpe-5qa.co.id/promo');
      expect(parsed.domainUtama).toBe('xn--shpe-5qa');
      expect(parsed.tld).toBe('co.id');
    });

    it('mengurai alamat IP IPv4 sebagai domainUtama tanpa TLD', () => {
      const parsed = parseUrl('http://192.168.1.1:8080/admin?user=root');
      expect(parsed.protokol).toBe('http');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('192.168.1.1');
      expect(parsed.tld).toBe('');
      expect(parsed.path).toBe('/admin');
      expect(parsed.params).toEqual({ user: 'root' });
    });

    it('mengurai localhost sebagai domainUtama tanpa TLD', () => {
      const parsed = parseUrl('http://localhost:3000/api/cek');
      expect(parsed.subdomain).toBe('');
      expect(parsed.domainUtama).toBe('localhost');
      expect(parsed.tld).toBe('');
      expect(parsed.path).toBe('/api/cek');
    });

    it('mengurai contoh URL fiktif dari PRD / link-contoh.json', () => {
      const contoh1 = parseUrl('https://undian-bca-gebyar.example/klaim-hadiah');
      expect(contoh1.domainUtama).toBe('undian-bca-gebyar');
      expect(contoh1.tld).toBe('example');
      expect(contoh1.path).toBe('/klaim-hadiah');

      const contoh2 = parseUrl('https://sh0pee-promo-spesial.test/login-verifikasi');
      expect(contoh2.domainUtama).toBe('sh0pee-promo-spesial');
      expect(contoh2.tld).toBe('test');
      expect(contoh2.path).toBe('/login-verifikasi');

      const contoh3 = parseUrl('https://s.id-update-akun.invalid/dana-kaget');
      expect(contoh3.subdomain).toBe('s');
      expect(contoh3.domainUtama).toBe('id-update-akun');
      expect(contoh3.tld).toBe('invalid');
      expect(contoh3.path).toBe('/dana-kaget');
    });
  });

  describe('parseUrl — Parameter Query', () => {
    it('mengurai parameter query tunggal dan ganda', () => {
      const parsed = parseUrl('https://example.com?foo=bar&baz=qux');
      expect(parsed.params).toEqual({
        foo: 'bar',
        baz: 'qux',
      });
    });

    it('menangani parameter dengan nilai URL-encoded', () => {
      const parsed = parseUrl('https://example.com/search?q=cek%20penipuan&kota=Jakarta%20Pusat');
      expect(parsed.params).toEqual({
        q: 'cek penipuan',
        kota: 'Jakarta Pusat',
      });
    });

    it('menangani parameter tanpa nilai atau nilai kosong', () => {
      const parsed = parseUrl('https://example.com?flag=&active');
      expect(parsed.params.flag).toBe('');
      expect(parsed.params.active).toBe('');
    });
  });

  describe('sanitasiParams — Pembuangan Parameter Sensitif', () => {
    it('membuang parameter email', () => {
      const parsed = parseUrl('https://example.com/action?email=korban@example.com&lang=id');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ lang: 'id' });
      expect(sanitized.urlBersih).toBe('https://example.com/action?lang=id');
      expect(sanitized.urlAsli).toBe('https://example.com/action?email=korban@example.com&lang=id');
    });

    it('membuang parameter phone', () => {
      const parsed = parseUrl('https://example.com?phone=081234567890&ref=promo');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ ref: 'promo' });
      expect(sanitized.urlBersih).toBe('https://example.com?ref=promo');
    });

    it('membuang parameter token', () => {
      const parsed = parseUrl('https://example.com/auth?token=secret-token-xyz&page=2');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ page: '2' });
      expect(sanitized.urlBersih).toBe('https://example.com/auth?page=2');
    });

    it('membuang parameter session', () => {
      const parsed = parseUrl('https://example.com?session=sess_123456&tab=dashboard');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ tab: 'dashboard' });
      expect(sanitized.urlBersih).toBe('https://example.com?tab=dashboard');
    });

    it('membuang parameter id', () => {
      const parsed = parseUrl('https://example.com?id=user999&filter=active');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ filter: 'active' });
      expect(sanitized.urlBersih).toBe('https://example.com?filter=active');
    });

    it('membuang parameter password', () => {
      const parsed = parseUrl('https://example.com/login?password=mysecret&username=john');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ username: 'john' });
      expect(sanitized.urlBersih).toBe('https://example.com/login?username=john');
    });

    it('membuang parameter otp', () => {
      const parsed = parseUrl('https://example.com/verify?otp=555123&flow=register');
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ flow: 'register' });
      expect(sanitized.urlBersih).toBe('https://example.com/verify?flow=register');
    });

    it('membuang semua 7 parameter sensitif sekaligus', () => {
      const url =
        'https://example.com/api?email=a@b.com&phone=081&token=xyz&session=s1&id=10&password=pass&otp=123&keep=safe';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ keep: 'safe' });
      expect(sanitized.urlBersih).toBe('https://example.com/api?keep=safe');
    });

    it('melakukan sanitasi secara case-insensitive pada nama parameter', () => {
      const url =
        'https://example.com?EMAIL=a@b.com&Phone=081&TOKEN=t1&Session=s1&ID=99&PASSWORD=p1&OTP=999&Safe=true';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ Safe: 'true' });
      expect(sanitized.urlBersih).toBe('https://example.com?Safe=true');
    });

    it('menghilangkan tanda tanya jika seluruh parameter adalah sensitif', () => {
      const url = 'https://example.com/klaim?token=secret123&otp=888999';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({});
      expect(sanitized.urlBersih).toBe('https://example.com/klaim');
    });

    it('mempertahankan parameter non-sensitif yang mirip substring parameter sensitif', () => {
      const url =
        'https://example.com/item?product_id=456&user_token=abc&guid=789&id=123&token=xyz';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({
        product_id: '456',
        user_token: 'abc',
        guid: '789',
      });
      expect(sanitized.urlBersih).toContain('product_id=456');
      expect(sanitized.urlBersih).toContain('user_token=abc');
      expect(sanitized.urlBersih).toContain('guid=789');
      expect(sanitized.urlBersih).not.toContain('id=123');
      expect(sanitized.urlBersih).not.toContain('token=xyz');
    });

    it('bekerja pada URL tanpa protokol', () => {
      const url = 'sh0pee.co.id/promo?token=secret&id=123&ref=telegram';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ ref: 'telegram' });
      expect(sanitized.urlBersih).toBe('sh0pee.co.id/promo?ref=telegram');
    });

    it('mempertahankan hash fragment pada URL setelah sanitasi', () => {
      const url = 'https://example.com/page?token=secret&page=1#komentar';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({ page: '1' });
      expect(sanitized.urlBersih).toBe('https://example.com/page?page=1#komentar');
    });

    it('tidak mengubah objek parsed asli (immutability)', () => {
      const url = 'https://example.com?token=secret&page=1';
      const parsed = parseUrl(url);
      const originalParams = { ...parsed.params };

      const sanitized = sanitasiParams(parsed);

      expect(parsed.params).toEqual(originalParams);
      expect(sanitized).not.toBe(parsed);
      expect(sanitized.params).not.toBe(parsed.params);
    });

    it('menangani URL tanpa parameter query sama sekali', () => {
      const url = 'https://example.com/tentang-kami';
      const parsed = parseUrl(url);
      const sanitized = sanitasiParams(parsed);

      expect(sanitized.params).toEqual({});
      expect(sanitized.urlBersih).toBe('https://example.com/tentang-kami');
    });
  });
});
