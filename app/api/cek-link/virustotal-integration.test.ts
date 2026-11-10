import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { checkVirusTotal } from '@/lib/virustotal';
import { checkSafeBrowsing } from '@/lib/safe-browsing';
import { queryDomainAge } from '@/lib/rdap';
import { explainLink } from '@/lib/gemini';

vi.mock('@/lib/virustotal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/virustotal')>();
  return {
    ...actual,
    checkVirusTotal: vi.fn(),
  };
});

vi.mock('@/lib/safe-browsing', () => ({
  checkSafeBrowsing: vi.fn(),
}));

vi.mock('@/lib/rdap', () => ({
  queryDomainAge: vi.fn(),
}));

vi.mock('@/lib/gemini', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/gemini')>();
  return {
    ...actual,
    explainLink: vi.fn(),
  };
});

describe('POST /api/cek-link — Integrasi VirusTotal (Task 19.1, Requirement LN-08)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(checkSafeBrowsing).mockResolvedValue({
      ditemukan: false,
      ancaman: [],
      status: 'ok',
      keterangan: 'Tidak ada ancaman',
    });

    vi.mocked(queryDomainAge).mockResolvedValue({
      tersedia: true,
      umurHari: 365,
      status: 'ok',
      keterangan: 'Domain lama',
    });

    vi.mocked(checkVirusTotal).mockResolvedValue({
      ditemukan: false,
      jumlahVendorBerbahaya: 0,
      totalVendor: 75,
      status: 'ok',
      keterangan: '0 dari 75 vendor',
    });

    vi.mocked(explainLink).mockResolvedValue(null);
  });

  it('memanggil checkVirusTotal secara paralel sebagai sumber ke-4 dalam Promise.allSettled', async () => {
    const req = new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example-berita.com/artikel' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(checkSafeBrowsing).toHaveBeenCalledWith(
      'https://example-berita.com/artikel',
      { timeoutMs: 5000 }
    );
    expect(queryDomainAge).toHaveBeenCalledWith(
      'https://example-berita.com/artikel',
      { timeoutMs: 5000 }
    );
    expect(checkVirusTotal).toHaveBeenCalledWith(
      'https://example-berita.com/artikel',
      { timeoutMs: 5000 }
    );
  });

  it('menambahkan temuan bersumber "virustotal" dan menaikkan skor +3 (level minimal "sedang") jika jumlahVendorBerbahaya >= 2', async () => {
    vi.mocked(checkVirusTotal).mockResolvedValue({
      ditemukan: true,
      jumlahVendorBerbahaya: 4,
      totalVendor: 80,
      status: 'ok',
      keterangan: '4 dari 80 vendor mendeteksi ancaman',
    });

    const req = new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://contoh-normal.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.level).toBe('sedang');

    const vtFinding = data.temuan.find(
      (t: { sumber: string }) => t.sumber === 'virustotal'
    );
    expect(vtFinding).toBeDefined();
    expect(vtFinding.judul).toContain('VirusTotal');
    expect(vtFinding.bukti).toContain('4/80');
    expect(data.pihak_ketiga).toContain('VirusTotal');
    expect(data.status_layanan.virustotal).toBe('ok');
  });

  it('tidak menambahkan temuan atau bobot +3 jika jumlahVendorBerbahaya < 2 (hanya 1 vendor)', async () => {
    vi.mocked(checkVirusTotal).mockResolvedValue({
      ditemukan: true,
      jumlahVendorBerbahaya: 1,
      totalVendor: 80,
      status: 'ok',
      keterangan: '1 dari 80 vendor mendeteksi ancaman',
    });

    const req = new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://contoh-normal.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.level).toBe('tidak_ditemukan');
    expect(
      data.temuan.some((t: { sumber: string }) => t.sumber === 'virustotal')
    ).toBe(false);
    expect(data.pihak_ketiga).toContain('VirusTotal');
    expect(data.status_layanan.virustotal).toBe('ok');
  });

  it('mencatat status_layanan.virustotal sebagai "tidak_tersedia" jika VirusTotal mengembalikan tidak_tersedia', async () => {
    vi.mocked(checkVirusTotal).mockResolvedValue({
      ditemukan: false,
      jumlahVendorBerbahaya: 0,
      totalVendor: 0,
      status: 'tidak_tersedia',
      keterangan: 'API key VirusTotal tidak tersedia',
    });

    const req = new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://contoh-normal.com' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.status_layanan.virustotal).toBe('tidak_tersedia');
  });

  it('mencatat status_layanan.virustotal sebagai "gagal" jika checkVirusTotal throw error / timeout', async () => {
    vi.mocked(checkVirusTotal).mockRejectedValue(new Error('Network error'));

    const req = new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://contoh-normal.com' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.status_layanan.virustotal).toBe('gagal');
    expect(data.status_layanan.safe_browsing).toBe('ok');
    expect(data.status_layanan.rdap).toBe('ok');
  });

  it('mempertahankan temuan VirusTotal saat penjelasan Gemini AI berhasil dipanggil', async () => {
    vi.mocked(checkVirusTotal).mockResolvedValue({
      ditemukan: true,
      jumlahVendorBerbahaya: 6,
      totalVendor: 78,
      status: 'ok',
      keterangan: '6 dari 78 vendor',
    });

    vi.mocked(explainLink).mockResolvedValue({
      halaman: 'link',
      level: 'tinggi',
      ringkasan: 'AI: URL ini berpotensi berbahaya',
      temuan: [
        {
          judul: 'Penjelasan AI',
          penjelasan: 'Detail ancaman dari AI',
          bukti: 'https://contoh-phish.com',
          sumber: 'ai',
        },
      ],
      hal_wajar: [],
      langkah: ['Jangan buka link', 'Laporkan pengirim'],
      situasi_darurat: ['klik_link'],
      batasan: 'Batasan AI',
      pihak_ketiga: ['Google Gemini'],
      status_layanan: { ai: 'ok' },
    });

    const req = new Request('http://localhost:3000/api/cek-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://contoh-phish.com' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.level).toBe('tinggi');
    expect(data.pihak_ketiga).toContain('VirusTotal');
    expect(data.pihak_ketiga).toContain('Google Gemini');
    expect(data.status_layanan.virustotal).toBe('ok');
    expect(data.status_layanan.ai).toBe('ok');

    const vt = data.temuan.find(
      (t: { sumber: string }) => t.sumber === 'virustotal'
    );
    expect(vt).toBeDefined();
    expect(vt.bukti).toContain('6/78');
  });
});
