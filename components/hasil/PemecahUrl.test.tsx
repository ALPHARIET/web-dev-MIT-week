// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  PemecahUrl,
  bedahBagianUrl,
  getBadgeRisikoBagian,
} from './PemecahUrl';
import type { Temuan } from '@/lib/hasil';

describe('components/hasil/PemecahUrl.tsx (Task 18.2 / LN-07)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('1. Penguraian Komponen URL (URL Breakdown)', () => {
    it('mengurai URL lengkap menjadi 6 komponen: protokol, subdomain, domain utama, TLD, path, dan params', () => {
      const url = 'https://admin.shopee.co.id/promo/diskon?ref=twitter&id=123';
      render(<PemecahUrl url={url} />);

      expect(screen.getByTestId('pemecah-url')).toBeDefined();
      expect(screen.getByTestId('bar-pemecah-url')).toBeDefined();

      const kartuProtokol = screen.getByTestId('kartu-bagian-protokol');
      expect(kartuProtokol.textContent).toContain('https://');

      const kartuSubdomain = screen.getByTestId('kartu-bagian-subdomain');
      expect(kartuSubdomain.textContent).toContain('admin');

      const kartuDomain = screen.getByTestId('kartu-bagian-domainUtama');
      expect(kartuDomain.textContent).toContain('shopee');

      const kartuTld = screen.getByTestId('kartu-bagian-tld');
      expect(kartuTld.textContent).toContain('.co.id');

      const kartuPath = screen.getByTestId('kartu-bagian-path');
      expect(kartuPath.textContent).toContain('/promo/diskon');

      const kartuParams = screen.getByTestId('kartu-bagian-params');
      expect(kartuParams.textContent).toContain('?ref=twitter');
      expect(kartuParams.textContent).toContain('id=123');
    });

    it('mengurai URL tanpa protokol dengan benar', () => {
      const url = 'shopee.co.id/bantuan';
      render(<PemecahUrl url={url} />);

      const kartuDomain = screen.getByTestId('kartu-bagian-domainUtama');
      expect(kartuDomain.textContent).toContain('shopee');

      const kartuTld = screen.getByTestId('kartu-bagian-tld');
      expect(kartuTld.textContent).toContain('.co.id');

      const kartuPath = screen.getByTestId('kartu-bagian-path');
      expect(kartuPath.textContent).toContain('/bantuan');
    });

    it('mengurai URL tanpa subdomain, path, atau parameter', () => {
      const url = 'https://google.com';
      render(<PemecahUrl url={url} />);

      const kartuSubdomain = screen.getByTestId('kartu-bagian-subdomain');
      expect(kartuSubdomain.textContent).toContain('(tidak ada)');

      const kartuDomain = screen.getByTestId('kartu-bagian-domainUtama');
      expect(kartuDomain.textContent).toContain('google');

      const kartuTld = screen.getByTestId('kartu-bagian-tld');
      expect(kartuTld.textContent).toContain('.com');

      const kartuPath = screen.getByTestId('kartu-bagian-path');
      expect(kartuPath.textContent).toContain('/');

      const kartuParams = screen.getByTestId('kartu-bagian-params');
      expect(kartuParams.textContent).toContain('(tidak ada)');
    });
  });

  describe('2. Deteksi dan Sorotan Bagian Mencurigakan', () => {
    it('menyoroti domain yang mirip merek resmi (typosquatting) dengan risiko tinggi', () => {
      const url = 'https://sh0pee-promo.co.id/login';
      render(<PemecahUrl url={url} />);

      const kartuDomain = screen.getByTestId('kartu-bagian-domainUtama');
      expect(kartuDomain.textContent).toContain('sh0pee-promo');

      const badgeDomain = screen.getByTestId('badge-risiko-domainUtama');
      expect(badgeDomain.textContent).toContain('Mencurigakan');

      const penjelasanDomain = screen.getByTestId('penjelasan-domainUtama');
      expect(penjelasanDomain.textContent).toContain('Shopee');

      const sorotanDomain = screen.getByTestId('sorotan-domainUtama');
      expect(sorotanDomain.classList.contains('bg-red-100')).toBe(true);
    });

    it('menyoroti alamat host berupa IP numerik langsung', () => {
      const url = 'http://192.168.1.1/admin/login';
      render(<PemecahUrl url={url} />);

      const kartuDomain = screen.getByTestId('kartu-bagian-domainUtama');
      expect(kartuDomain.textContent).toContain('192.168.1.1');

      const badgeDomain = screen.getByTestId('badge-risiko-domainUtama');
      expect(badgeDomain.textContent).toContain('Mencurigakan');

      const penjelasanDomain = screen.getByTestId('penjelasan-domainUtama');
      expect(penjelasanDomain.textContent).toContain('IP numerik');
    });

    it('menyoroti penggunaan protokol HTTP yang tidak terenkripsi', () => {
      const url = 'http://example.com/';
      render(<PemecahUrl url={url} />);

      const badgeProtokol = screen.getByTestId('badge-risiko-protokol');
      expect(badgeProtokol.textContent).toContain('Perlu Diwaspadai');

      const penjelasan = screen.getByTestId('penjelasan-protokol');
      expect(penjelasan.textContent).toContain('tanpa enkripsi');
    });

    it('menyoroti penggunaan TLD berisiko (.xyz, .top, .click)', () => {
      const url = 'https://undian-kupon.xyz/hadiah';
      render(<PemecahUrl url={url} />);

      const badgeTld = screen.getByTestId('badge-risiko-tld');
      expect(badgeTld.textContent).toContain('Perlu Diwaspadai');

      const penjelasanTld = screen.getByTestId('penjelasan-tld');
      expect(penjelasanTld.textContent).toContain('TLD berisiko');
    });

    it('menyoroti kata pemicu penipuan pada path URL (hadiah, klaim, login)', () => {
      const url = 'https://perusahaan-resmi.com/klaim-hadiah-undian';
      render(<PemecahUrl url={url} />);

      const badgePath = screen.getByTestId('badge-risiko-path');
      expect(badgePath.textContent).toContain('Perlu Diwaspadai');

      const penjelasanPath = screen.getByTestId('penjelasan-path');
      expect(penjelasanPath.textContent).toContain('kata pemicu');
      expect(penjelasanPath.textContent).toContain('klaim');
      expect(penjelasanPath.textContent).toContain('hadiah');
    });

    it('menyoroti jalur unduhan file APK yang berbahaya pada path URL', () => {
      const url = 'https://kurir-paket.com/undangan-pernikahan.apk';
      render(<PemecahUrl url={url} />);

      const badgePath = screen.getByTestId('badge-risiko-path');
      expect(badgePath.textContent).toContain('Mencurigakan');

      const penjelasanPath = screen.getByTestId('penjelasan-path');
      expect(penjelasanPath.textContent).toContain('.apk');
    });

    it('menyoroti nama merek yang disamarkan pada subdomain', () => {
      const url = 'https://bca.layanan-keuangan-palsu.com/';
      render(<PemecahUrl url={url} />);

      const badgeSub = screen.getByTestId('badge-risiko-subdomain');
      expect(badgeSub.textContent).toContain('Mencurigakan');

      const penjelasanSub = screen.getByTestId('penjelasan-subdomain');
      expect(penjelasanSub.textContent).toContain('BCA');
      expect(penjelasanSub.textContent).toContain('subdomain');
    });

    it('menyoroti subdomain bertingkat banyak (> 3 tingkat)', () => {
      const url = 'https://satu.dua.tiga.empat.example.com/';
      render(<PemecahUrl url={url} />);

      const badgeSub = screen.getByTestId('badge-risiko-subdomain');
      expect(badgeSub.textContent).toContain('Perlu Diwaspadai');

      const penjelasanSub = screen.getByTestId('penjelasan-subdomain');
      expect(penjelasanSub.textContent).toContain('tingkatan');
    });

    it('menyoroti parameter sensitif (token, id, password, otp)', () => {
      const url = 'https://example.com/reset?token=secret123&otp=889900';
      render(<PemecahUrl url={url} />);

      const badgeParams = screen.getByTestId('badge-risiko-params');
      expect(badgeParams.textContent).toContain('Perlu Diwaspadai');

      const penjelasanParams = screen.getByTestId('penjelasan-params');
      expect(penjelasanParams.textContent).toContain('data sensitif');

      expect(screen.getByTestId('param-item-token')).toBeDefined();
      expect(screen.getByTestId('param-item-otp')).toBeDefined();
    });

    it('menyoroti penggunaan karakter "@" di URL', () => {
      const url = 'https://bca.co.id@phishing-site.com/login';
      render(<PemecahUrl url={url} />);

      const badgePath = screen.getByTestId('badge-risiko-path');
      expect(badgePath.textContent).toContain('Mencurigakan');

      const penjelasanPath = screen.getByTestId('penjelasan-path');
      expect(penjelasanPath.textContent).toContain('@');
    });
  });

  describe('3. Integrasi Temuan Eksternal / Aturan', () => {
    it('memperkaya penjelasan domain saat terdapat temuan Safe Browsing atau RDAP', () => {
      const url = 'https://situs-berbahaya.com/index';
      const temuan: Temuan[] = [
        {
          judul: 'Terdeteksi di daftar ancaman Google Safe Browsing',
          penjelasan: 'Situs ini terdaftar sebagai ancaman phishing aktif.',
          bukti: 'situs-berbahaya.com',
          sumber: 'safe_browsing',
        },
      ];

      render(<PemecahUrl url={url} temuan={temuan} />);

      const badgeDomain = screen.getByTestId('badge-risiko-domainUtama');
      expect(badgeDomain.textContent).toContain('Mencurigakan');

      const penjelasanDomain = screen.getByTestId('penjelasan-domainUtama');
      expect(penjelasanDomain.textContent).toContain('Safe Browsing');
    });

    it('memperkaya penjelasan saat domain terindikasi baru berumur kurang dari 30 hari via RDAP', () => {
      const url = 'https://toko-baru.com/';
      const temuan: Temuan[] = [
        {
          judul: 'Domain baru didaftarkan (kurang dari 30 hari)',
          penjelasan: 'Domain berumur 3 hari berdasarkan RDAP.',
          bukti: '3 hari',
          sumber: 'rdap',
        },
      ];

      render(<PemecahUrl url={url} temuan={temuan} />);

      const penjelasanDomain = screen.getByTestId('penjelasan-domainUtama');
      expect(penjelasanDomain.textContent).toContain('kurang dari 30 hari');
    });
  });

  describe('4. URL Bersih / Normal (Tidak Mencurigakan)', () => {
    it('menampilkan status normal untuk URL yang tidak memiliki keanehan', () => {
      const url = 'https://kemdikbud.go.id/tentang-kami';
      render(<PemecahUrl url={url} />);

      const badgeNormal = screen.getByTestId('badge-ringkasan-normal');
      expect(badgeNormal.textContent).toContain('Struktur URL Normal');

      expect(screen.getByTestId('badge-risiko-protokol').textContent).toContain('Wajar');
      expect(screen.getByTestId('badge-risiko-domainUtama').textContent).toContain('Wajar');
      expect(screen.getByTestId('badge-risiko-tld').textContent).toContain('Wajar');
      expect(screen.getByTestId('badge-risiko-path').textContent).toContain('Wajar');
    });
  });

  describe('5. Kepatuhan Keamanan (Requirement 17.2)', () => {
    it('tidak pernah merender URL atau bagiannya sebagai tautan yang bisa diklik (<a> tag)', () => {
      const url = 'https://malicious-phishing.xyz/steal?id=123';
      const { container } = render(<PemecahUrl url={url} />);

      const linkElements = container.querySelectorAll('a');
      expect(linkElements.length).toBe(0);
    });
  });

  describe('6. Fungsi Pembantu bedahBagianUrl dan getBadgeRisikoBagian', () => {
    it('mengembalikan array kosong dan jumlah 0 jika input URL kosong', () => {
      const hasil = bedahBagianUrl('');
      expect(hasil.bagianList).toHaveLength(0);
      expect(hasil.jumlahMencurigakan).toBe(0);
    });

    it('menghasilkan konfigurasi badge risiko yang benar', () => {
      const badgeNormal = getBadgeRisikoBagian('normal', false);
      expect(badgeNormal.label).toBe('Wajar');

      const badgeTinggi = getBadgeRisikoBagian('tinggi', true);
      expect(badgeTinggi.label).toContain('Mencurigakan');

      const badgeSedang = getBadgeRisikoBagian('sedang', true);
      expect(badgeSedang.label).toContain('Perlu Diwaspadai');
    });
  });

  describe('7. Dukungan Kustomisasi className', () => {
    it('menggabungkan class tambahan ke elemen kontainer utama', () => {
      const url = 'https://example.com';
      render(<PemecahUrl url={url} className="custom-pemecah-style my-4" />);

      const container = screen.getByTestId('pemecah-url');
      expect(container.classList.contains('custom-pemecah-style')).toBe(true);
      expect(container.classList.contains('my-4')).toBe(true);
    });
  });
});
