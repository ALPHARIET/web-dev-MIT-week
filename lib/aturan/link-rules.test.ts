import { describe, it, expect } from 'vitest';
import {
  evaluasiLeksikalUrl,
  generateHasilLinkLokal,
  deteksiMerek,
  normalizeLeetspeak,
  isIpAddress,
  KATA_PEMICU_LINK,
  PEMENDEK_LINK_DOMAINS,
  TLD_BERISIKO_SET,
} from './link-rules';

describe('lib/aturan/link-rules.ts', () => {
  describe('normalizeLeetspeak & isIpAddress helpers', () => {
    it('mengubah substitusi angka dan simbol menjadi huruf yang sesuai', () => {
      expect(normalizeLeetspeak('sh0p3e')).toBe('shopee');
      expect(normalizeLeetspeak('bc4')).toBe('bca');
      expect(normalizeLeetspeak('br1')).toBe('bri');
      expect(normalizeLeetspeak('bpj5')).toBe('bpjs');
      expect(normalizeLeetspeak('bc@')).toBe('bca');
      expect(normalizeLeetspeak('d4n4')).toBe('dana');
      expect(normalizeLeetspeak('m4ndir1')).toBe('mandiri');
      expect(normalizeLeetspeak('')).toBe('');
    });

    it('mendeteksi alamat IPv4 dan IPv6 dengan benar', () => {
      expect(isIpAddress('192.168.1.1')).toBe(true);
      expect(isIpAddress('10.0.0.1')).toBe(true);
      expect(isIpAddress('255.255.255.255')).toBe(true);
      expect(isIpAddress('::1')).toBe(true);
      expect(isIpAddress('[::1]')).toBe(true);
      expect(isIpAddress('2001:db8::1')).toBe(true);

      expect(isIpAddress('google.com')).toBe(false);
      expect(isIpAddress('192.168.1.256')).toBe(false);
      expect(isIpAddress('')).toBe(false);
    });
  });

  describe('deteksiMerek (Requirement 19.2, Property 8)', () => {
    const brandChecks = [
      { input: 'bca.co.id', expected: 'BCA' },
      { input: 'bc4.com', expected: 'BCA' },
      { input: 'b.c.a.co.id', expected: 'BCA' },
      { input: 'bc@.net', expected: 'BCA' },
      { input: 'klikbca.com', expected: 'BCA' },
      { input: 'bca-klik.xyz', expected: 'BCA' },
      { input: 'bri.co.id', expected: 'BRI' },
      { input: 'br1.com', expected: 'BRI' },
      { input: 'br1m0.id', expected: 'BRI' },
      { input: 'bankbri.com', expected: 'BRI' },
      { input: 'bni.co.id', expected: 'BNI' },
      { input: 'bn1.com', expected: 'BNI' },
      { input: 'bnimobile.net', expected: 'BNI' },
      { input: 'mandiri.co.id', expected: 'Mandiri' },
      { input: 'm4ndiri.com', expected: 'Mandiri' },
      { input: 'mandir1.net', expected: 'Mandiri' },
      { input: 'l1v1n.id', expected: 'Mandiri' },
      { input: 'bsi.co.id', expected: 'BSI' },
      { input: 'bs1.com', expected: 'BSI' },
      { input: 'dana.id', expected: 'DANA' },
      { input: 'd4na.id', expected: 'DANA' },
      { input: 'd4n4.com', expected: 'DANA' },
      { input: 'ovo.id', expected: 'OVO' },
      { input: '0v0.com', expected: 'OVO' },
      { input: 'gopay.co.id', expected: 'GoPay' },
      { input: 'g0pay.com', expected: 'GoPay' },
      { input: 'g0p4y.net', expected: 'GoPay' },
      { input: 'shopee.co.id', expected: 'Shopee' },
      { input: 'sh0pee.com', expected: 'Shopee' },
      { input: 'shop3e.id', expected: 'Shopee' },
      { input: 'sh0p3e.xyz', expected: 'Shopee' },
      { input: 'tokopedia.com', expected: 'Tokopedia' },
      { input: 't0k0pedia.net', expected: 'Tokopedia' },
      { input: 'tokoped1a.id', expected: 'Tokopedia' },
      { input: 't0kped.xyz', expected: 'Tokopedia' },
      { input: 'bpjs.go.id', expected: 'BPJS' },
      { input: 'bpj5.com', expected: 'BPJS' },
      { input: 'jne.co.id', expected: 'JNE' },
      { input: 'jn3.com', expected: 'JNE' },
      { input: 'jnt.co.id', expected: 'J&T' },
      { input: 'posindonesia.co.id', expected: 'Pos Indonesia' },
      { input: 'p0sindonesia.com', expected: 'Pos Indonesia' },
      { input: 'p0spay.id', expected: 'Pos Indonesia' },
    ];

    it('mendeteksi seluruh 14 merek Indonesia dengan berbagai variasi leetspeak', () => {
      for (const item of brandChecks) {
        const res = deteksiMerek(item.input);
        expect(res.cocok).toBe(true);
        expect(res.merek).toBe(item.expected);
        expect(res.skor).toBe(3);
        expect(res.variasiCocok).toBeTruthy();
        expect(res.kategori).toBeTruthy();
      }
    });

    it('mendeteksi merek dari bare string token tanpa domain TLD', () => {
      expect(deteksiMerek('sh0pee').cocok).toBe(true);
      expect(deteksiMerek('sh0pee').merek).toBe('Shopee');
      expect(deteksiMerek('bc4').cocok).toBe(true);
      expect(deteksiMerek('bc4').merek).toBe('BCA');
      expect(deteksiMerek('d4na').cocok).toBe(true);
      expect(deteksiMerek('d4na').merek).toBe('DANA');
    });

    it('tidak mencocokkan kata biasa yang bukan merek (menghindari false positive)', () => {
      expect(deteksiMerek('google.com').cocok).toBe(false);
      expect(deteksiMerek('example.org').cocok).toBe(false);
      expect(deteksiMerek('github.com').cocok).toBe(false);
      expect(deteksiMerek('brian.com').cocok).toBe(false);
      expect(deteksiMerek('bridge.net').cocok).toBe(false);
      expect(deteksiMerek('celebrity.org').cocok).toBe(false);
      expect(deteksiMerek('perdana.co.id').cocok).toBe(false);
      expect(deteksiMerek('').cocok).toBe(false);
    });
  });

  describe('Aturan 1: Google Safe Browsing match (Requirement 19.1)', () => {
    it('langsung menetapkan level "tinggi" saat isSafeBrowsingThreat bernilai true', () => {
      const res = evaluasiLeksikalUrl('https://example.com', {
        isSafeBrowsingThreat: true,
      });

      expect(res.level).toBe('tinggi');
      expect(res.temuan.some((t) => t.sumber === 'safe_browsing')).toBe(true);
      const safeFinding = res.temuan.find((t) => t.sumber === 'safe_browsing');
      expect(safeFinding?.judul).toContain('Google Safe Browsing');
    });

    it('tidak memicu temuan Safe Browsing jika isSafeBrowsingThreat false atau undefined', () => {
      const resFalse = evaluasiLeksikalUrl('https://example.com', {
        isSafeBrowsingThreat: false,
      });
      expect(resFalse.temuan.some((t) => t.sumber === 'safe_browsing')).toBe(false);

      const resUndef = evaluasiLeksikalUrl('https://example.com');
      expect(resUndef.temuan.some((t) => t.sumber === 'safe_browsing')).toBe(false);
    });
  });

  describe('Aturan 2: Nama mirip merek Indonesia (+3) (Requirement 19.2)', () => {
    it('memberikan skor +3 dan temuan merek untuk domain tiruan', () => {
      const resShopee = evaluasiLeksikalUrl('https://sh0pee.co.id');
      expect(resShopee.skor).toBe(3);
      expect(resShopee.level).toBe('sedang');
      expect(resShopee.temuan).toHaveLength(1);
      expect(resShopee.temuan[0].judul).toContain('Shopee');
      expect(resShopee.temuan[0].sumber).toBe('aturan');

      const resBca = evaluasiLeksikalUrl('http://bc4.net');
      expect(resBca.skor).toBe(3);
      expect(resBca.temuan[0].judul).toContain('BCA');
    });
  });

  describe('Aturan 3: Domain berumur < 30 hari via RDAP (+3) (Requirement 19.3, 19.11)', () => {
    it('memberikan skor +3 dan temuan RDAP jika domain berumur < 30 hari', () => {
      const res = evaluasiLeksikalUrl('https://example.com', {
        rdapAgeDays: 14,
      });

      expect(res.skor).toBe(3);
      expect(res.level).toBe('sedang');
      const rdapFinding = res.temuan.find((t) => t.sumber === 'rdap');
      expect(rdapFinding).toBeDefined();
      expect(rdapFinding?.judul).toContain('kurang dari 30 hari');
      expect(rdapFinding?.bukti).toContain('14 hari');
    });

    it('tidak memicu aturan RDAP jika domain berumur >= 30 hari atau tidak tersedia', () => {
      const res30 = evaluasiLeksikalUrl('https://example.com', {
        rdapAgeDays: 30,
      });
      expect(res30.temuan.some((t) => t.sumber === 'rdap')).toBe(false);

      const resOld = evaluasiLeksikalUrl('https://example.com', {
        rdapAgeDays: 365,
      });
      expect(resOld.temuan.some((t) => t.sumber === 'rdap')).toBe(false);

      const resNone = evaluasiLeksikalUrl('https://example.com', {});
      expect(resNone.temuan.some((t) => t.sumber === 'rdap')).toBe(false);
    });
  });

  describe('Aturan 4: Punycode atau karakter mirip (xn--) (+3) (Requirement 19.4)', () => {
    it('memberikan skor +3 saat URL memuat format xn--', () => {
      const res = evaluasiLeksikalUrl('https://xn--e1afmkfd.com');
      expect(res.skor).toBe(3);
      expect(res.level).toBe('sedang');
      const finding = res.temuan.find((t) => t.judul.includes('Punycode'));
      expect(finding).toBeDefined();
      expect(finding?.bukti).toContain('xn--');
    });

    it('menggabungkan skor Punycode (+3) dan merek (+3) saat domain memuat keduanya', () => {
      const res = evaluasiLeksikalUrl('https://xn--bca-10a.com');
      // xn-- (+3) + bca (+3) = 6 -> tinggi
      expect(res.skor).toBe(6);
      expect(res.level).toBe('tinggi');
      expect(res.temuan.some((t) => t.judul.includes('Punycode'))).toBe(true);
      expect(res.temuan.some((t) => t.judul.includes('BCA'))).toBe(true);
    });

    it('memberikan skor +3 saat hostname memuat karakter non-ASCII homograf', () => {
      const res = evaluasiLeksikalUrl('https://bса.com'); // 'с' dan 'а' Cyrillic
      expect(res.skor).toBeGreaterThanOrEqual(3);
      expect(res.temuan.some((t) => t.judul.includes('Punycode') || t.judul.includes('homograf'))).toBe(true);
    });
  });

  describe('Aturan 5: Alamat berupa IP (+3) (Requirement 19.5)', () => {
    it('memberikan skor +3 jika alamat berupa IPv4', () => {
      const res = evaluasiLeksikalUrl('http://192.168.1.100');
      expect(res.skor).toBe(3);
      expect(res.level).toBe('sedang');
      const finding = res.temuan.find((t) => t.judul.includes('IP numerik'));
      expect(finding).toBeDefined();
      expect(finding?.bukti).toContain('192.168.1.100');
    });

    it('memberikan skor +3 jika alamat berupa IPv6', () => {
      const res = evaluasiLeksikalUrl('http://[2001:db8::1]:8080/index');
      expect(res.skor).toBe(3);
      expect(res.level).toBe('sedang');
      expect(res.temuan.some((t) => t.judul.includes('IP numerik'))).toBe(true);
    });
  });

  describe('Aturan 6: Kata pemicu di domain atau path (+2) (Requirement 19.6)', () => {
    it('mendeteksi masing-masing dari 6 kata pemicu (hadiah, klaim, undian, verifikasi, login, promo)', () => {
      for (const kata of KATA_PEMICU_LINK) {
        const res = evaluasiLeksikalUrl(`https://site-biasa.com/${kata}`);
        expect(res.skor).toBe(2);
        expect(res.level).toBe('tidak_ditemukan'); // skor 2 < 3
        const finding = res.temuan.find((t) => t.judul.includes('kata pemicu'));
        expect(finding).toBeDefined();
        expect(finding?.bukti.toLowerCase()).toContain(kata);
      }
    });

    it('mendeteksi kata pemicu di domain utama maupun subdomain', () => {
      const resSub = evaluasiLeksikalUrl('https://login.example.com');
      expect(resSub.skor).toBe(2);
      expect(resSub.temuan.some((t) => t.judul.includes('kata pemicu'))).toBe(true);

      const resMain = evaluasiLeksikalUrl('https://promo-diskon.com');
      expect(resMain.skor).toBe(2);
      expect(resMain.temuan.some((t) => t.judul.includes('kata pemicu'))).toBe(true);
    });

    it('hanya menambahkan skor +2 sekali meskipun terdapat lebih dari satu kata pemicu', () => {
      const res = evaluasiLeksikalUrl('https://example.com/promo/hadiah/login');
      expect(res.skor).toBe(2);
      expect(res.temuan).toHaveLength(1);
    });
  });

  describe('Aturan 7: Struktur subdomain mencurigakan (+2) (Requirement 19.7)', () => {
    it('memberikan skor +2 jika memiliki lebih dari 3 subdomain', () => {
      const res = evaluasiLeksikalUrl('https://a.b.c.d.example.com');
      expect(res.skor).toBe(2);
      const finding = res.temuan.find((t) => t.judul.includes('subdomain'));
      expect(finding).toBeDefined();
      expect(finding?.bukti).toContain('4 tingkat');
    });

    it('memberikan skor +2 jika nama merek berada di subdomain dan bukan di domain utama', () => {
      const res = evaluasiLeksikalUrl('https://bca.pembayaran-tagihan.com');
      expect(res.skor).toBe(2);
      const finding = res.temuan.find((t) => t.judul.includes('subdomain'));
      expect(finding).toBeDefined();
      expect(finding?.bukti).toContain('BCA');
      expect(finding?.bukti).toContain('pembayaran-tagihan');
    });

    it('tidak memicu aturan jika nama merek ada di subdomain DAN di domain utama', () => {
      const res = evaluasiLeksikalUrl('https://bca.bca-klik.com');
      // Subdomain BCA, domainUtama bca-klik (juga BCA).
      // Aturan 7 tidak memicu, Aturan 2 (merek di domainUtama) memicu +3
      const findingSub = res.temuan.find((t) => t.judul.includes('subdomain'));
      expect(findingSub).toBeUndefined();
      expect(res.skor).toBe(3);
    });
  });

  describe('Aturan 8: TLD berisiko (+1) (Requirement 19.8)', () => {
    it('memberikan skor +1 untuk TLD yang terdaftar di tld-berisiko.json', () => {
      expect(TLD_BERISIKO_SET.has('xyz')).toBe(true);
      expect(TLD_BERISIKO_SET.has('top')).toBe(true);

      const resXyz = evaluasiLeksikalUrl('https://example.xyz');
      expect(resXyz.skor).toBe(1);
      const finding = resXyz.temuan.find((t) => t.judul.includes('TLD berisiko'));
      expect(finding).toBeDefined();
      expect(finding?.bukti).toContain('.xyz');

      const resTop = evaluasiLeksikalUrl('https://example.top');
      expect(resTop.skor).toBe(1);
    });

    it('tidak memicu aturan untuk TLD standar seperti .com atau .id', () => {
      const res = evaluasiLeksikalUrl('https://example.com');
      expect(res.skor).toBe(0);
      expect(res.temuan).toEqual([]);
    });
  });

  describe('Aturan 9: Layanan pemendek link (+1) (Requirement 19.9)', () => {
    it('memberikan skor +1 untuk layanan pemendek link populer (bit.ly, s.id, tinyurl, linktr.ee)', () => {
      const shorteners = ['https://bit.ly/3xyz', 'https://s.id/kupon', 'https://tinyurl.com/abc', 'https://linktr.ee/official'];

      for (const url of shorteners) {
        const res = evaluasiLeksikalUrl(url);
        expect(res.skor).toBe(1);
        const finding = res.temuan.find((t) => t.judul.includes('pemendek link'));
        expect(finding).toBeDefined();
      }
    });

    it('mengenali domain pemendek link yang diawali www.', () => {
      const res = evaluasiLeksikalUrl('https://www.bit.ly/promo');
      // skor: pemendek link (1) + promo (2) = 3
      expect(res.skor).toBe(3);
      expect(res.level).toBe('sedang');
    });
  });

  describe('Aturan 10: Karakter @ di URL atau URL > 200 karakter (+1) (Requirement 19.10)', () => {
    it('memberikan skor +1 jika URL memuat karakter @', () => {
      const res = evaluasiLeksikalUrl('https://google.com@evil-phishing.com');
      expect(res.skor).toBe(1);
      const finding = res.temuan.find((t) => t.judul.includes("karakter '@'"));
      expect(finding).toBeDefined();
    });

    it('memberikan skor +1 jika panjang URL melebihi 200 karakter', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(210);
      const res = evaluasiLeksikalUrl(longUrl);
      expect(res.skor).toBe(1);
      const finding = res.temuan.find((t) => t.judul.includes('panjang URL'));
      expect(finding).toBeDefined();
      expect(finding?.bukti).toContain('karakter');
    });

    it('hanya memberikan skor +1 jika memiliki keduanya (@ dan > 200 karakter)', () => {
      const longUrlWithAt = 'https://example.com/@' + 'b'.repeat(210);
      const res = evaluasiLeksikalUrl(longUrlWithAt);
      expect(res.skor).toBe(1);
    });
  });

  describe('Aturan 11: Ditandai berbahaya oleh VirusTotal (+3) (Requirements LN-08, 18.1)', () => {
    it('memberikan skor +3 dan temuan bersumber virustotal saat isVirusTotalThreat bernilai true', () => {
      const res = evaluasiLeksikalUrl('https://example.com', {
        isVirusTotalThreat: true,
        virusTotalDetail: { jumlahVendorBerbahaya: 4, totalVendor: 75 },
      });

      expect(res.skor).toBe(3);
      expect(res.level).toBe('sedang');
      const finding = res.temuan.find((t) => t.sumber === 'virustotal');
      expect(finding).toBeDefined();
      expect(finding?.judul).toContain('VirusTotal');
      expect(finding?.bukti).toContain('4/75');
    });

    it('tidak menambahkan skor VirusTotal jika isVirusTotalThreat bernilai false atau tidak diberikan', () => {
      const res = evaluasiLeksikalUrl('https://example.com', {
        isVirusTotalThreat: false,
      });

      expect(res.skor).toBe(0);
      expect(res.temuan.some((t) => t.sumber === 'virustotal')).toBe(false);
    });
  });

  describe('Skor aditif dan penentuan tingkat kewaspadaan', () => {
    it('menggabungkan skor dari beberapa aturan secara aditif (Requirement 10.1, 10.2, 10.3, 10.4)', () => {
      // http://sh0pee-promo.xyz/login
      // - Merek Shopee (+3)
      // - Kata pemicu promo/login (+2)
      // - TLD berisiko .xyz (+1)
      // Total = 6 -> level 'tinggi'
      const res = evaluasiLeksikalUrl('http://sh0pee-promo.xyz/login');
      expect(res.skor).toBe(6);
      expect(res.level).toBe('tinggi');
      expect(res.temuan).toHaveLength(3);
    });

    it('menghasilkan level "sedang" untuk skor 3 sampai 5', () => {
      // http://192.168.1.1/promo
      // - IP numerik (+3)
      // - Kata pemicu promo (+2)
      // Total = 5 -> level 'sedang'
      const res = evaluasiLeksikalUrl('http://192.168.1.1/promo');
      expect(res.skor).toBe(5);
      expect(res.level).toBe('sedang');
    });

    it('menghasilkan level "tidak_ditemukan" untuk domain bersih tanpa indikasi', () => {
      const res = evaluasiLeksikalUrl('https://google.com');
      expect(res.skor).toBe(0);
      expect(res.level).toBe('tidak_ditemukan');
      expect(res.temuan).toHaveLength(0);
    });

    it('mengembalikan hasil kosong jika input berupa string kosong', () => {
      const res = evaluasiLeksikalUrl('');
      expect(res.skor).toBe(0);
      expect(res.level).toBe('tidak_ditemukan');
      expect(res.temuan).toHaveLength(0);
      expect(res.linkDitemukan).toEqual([]);
      expect(res.modusVideoDitemukan).toBe(false);
    });
  });

  describe('generateHasilLinkLokal', () => {
    it('menghasilkan FormatDataHasil lengkap dengan level "tinggi" saat skor >= 6', () => {
      const hasil = generateHasilLinkLokal('http://sh0pee-promo.xyz/login');

      expect(hasil.halaman).toBe('link');
      expect(hasil.level).toBe('tinggi');
      expect(hasil.ringkasan).toContain('Ada beberapa tanda kuat yang mirip pola penipuan');
      expect(hasil.temuan.length).toBeGreaterThanOrEqual(1);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasil.situasi_darurat).toContain('klik_link');
      expect(hasil.batasan).toBeTruthy();
    });

    it('menghasilkan FormatDataHasil dengan level "sedang" dan saran pratinjau pemendek link', () => {
      const hasil = generateHasilLinkLokal('https://bit.ly/promo123');

      expect(hasil.halaman).toBe('link');
      expect(hasil.level).toBe('sedang');
      expect(hasil.ringkasan).toContain('Ada tanda yang perlu kamu cek dulu');
      expect(hasil.langkah.some((l) => l.toLowerCase().includes('pratinjau'))).toBe(true);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
    });

    it('menghasilkan FormatDataHasil dengan level "tidak_ditemukan" dan hal_wajar untuk link biasa', () => {
      const hasil = generateHasilLinkLokal('https://wikipedia.org');

      expect(hasil.halaman).toBe('link');
      expect(hasil.level).toBe('tidak_ditemukan');
      expect(hasil.ringkasan).toContain('Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.');
      expect(hasil.hal_wajar.length).toBeGreaterThan(0);
      expect(hasil.langkah.length).toBeGreaterThanOrEqual(2);
      expect(hasil.situasi_darurat).toEqual(['klik_link']);
    });

    it('mencatat pihak ketiga dan status layanan saat opsi diberikan', () => {
      const hasil = generateHasilLinkLokal('https://example.com', {
        isSafeBrowsingThreat: true,
        rdapAgeDays: 5,
      });

      expect(hasil.level).toBe('tinggi');
      expect(hasil.pihak_ketiga).toContain('Google Safe Browsing');
      expect(hasil.pihak_ketiga).toContain('RDAP');
      expect(hasil.status_layanan.safe_browsing).toBe('ok');
      expect(hasil.status_layanan.rdap).toBe('ok');
    });

    it('tidak memuat kata terlarang (aman, pasti, terbukti, 100%) sebagai klaim kesimpulan (Requirement 30.1)', () => {
      const forbiddenRegex = /\b(pasti|terbukti|100%)\b/i;

      const urls = [
        'http://sh0pee-promo.xyz/login',
        'https://bit.ly/promo',
        'https://example.com',
      ];

      for (const u of urls) {
        const hasil = generateHasilLinkLokal(u);
        for (const l of hasil.langkah) {
          expect(l).not.toMatch(forbiddenRegex);
        }
        for (const t of hasil.temuan) {
          expect(t.penjelasan).not.toMatch(forbiddenRegex);
        }
        for (const hw of hasil.hal_wajar) {
          expect(hw).not.toMatch(forbiddenRegex);
        }
      }
    });
  });
});
