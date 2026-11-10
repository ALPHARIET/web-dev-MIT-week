import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeChat,
  explainLink,
  tanyaGemini,
  filterKataTerlarang,
  filterFormatDataHasil,
  isValidFormatDataHasil,
  parseBase64DataUrl,
  tryParseJson,
  type AnalyzeChatInput,
  type PaketDiagnostikLink,
} from './gemini';
import type { FormatDataHasil } from './hasil';

describe('lib/gemini.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createSampleHasil = (overrides?: Partial<FormatDataHasil>): FormatDataHasil => ({
    halaman: 'chat',
    level: 'sedang',
    ringkasan: 'Ada indikasi yang perlu kamu waspadai dalam pesan ini.',
    temuan: [
      {
        judul: 'Meminta transfer mendesak',
        penjelasan: 'Pelaku menciptakan rasa panik agar korban segera transfer uang.',
        bukti: 'Transfer sekarang sebelum akun diblokir!',
        sumber: 'ai',
      },
    ],
    hal_wajar: ['Pengirim menggunakan bahasa sopan di awal'],
    langkah: [
      'Jangan transfer uang ke rekening yang diminta.',
      'Hubungi pihak resmi melalui saluran terverifikasi.',
    ],
    situasi_darurat: [],
    batasan: 'Analisis berbasis teks yang kamu berikan.',
    pihak_ketiga: ['Google Gemini'],
    status_layanan: { ai: 'ok' },
    ...overrides,
  });

  const createGeminiApiResponse = (hasilObj: unknown) => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify(hasilObj),
            },
          ],
          role: 'model',
        },
        finishReason: 'STOP',
      },
    ],
  });

  describe('filterKataTerlarang', () => {
    it('mengganti kata "aman" ketika dipakai sebagai kesimpulan/afirmasi', () => {
      const teks = 'Pesan ini aman untuk ditanggapi.';
      const filtered = filterKataTerlarang(teks);
      expect(filtered).not.toContain('aman');
      expect(filtered).toBe('Pesan ini tidak ditemukan tanda bahaya untuk ditanggapi.');
    });

    it('mengganti kata "Aman" di awal kalimat dengan mempertahankan kapitalisasi', () => {
      const teks = 'Aman untuk kamu klik.';
      const filtered = filterKataTerlarang(teks);
      expect(filtered.startsWith('Tidak ditemukan tanda bahaya')).toBe(true);
    });

    it('mengganti kombinasi "pasti aman", "terbukti aman", dan "100% aman"', () => {
      expect(filterKataTerlarang('Link ini pasti aman.')).toBe(
        'Link ini tidak ditemukan tanda bahaya.'
      );
      expect(filterKataTerlarang('Toko ini terbukti aman.')).toBe(
        'Toko ini tidak ditemukan tanda bahaya.'
      );
      expect(filterKataTerlarang('Situs ini 100% aman.')).toBe(
        'Situs ini tidak ditemukan tanda bahaya.'
      );
    });

    it('mengganti vonis "pasti penipuan" dan "terbukti penipuan" menjadi indikasi', () => {
      expect(filterKataTerlarang('Pesan ini pasti penipuan.')).toBe(
        'Pesan ini berindikasi penipuan.'
      );
      expect(filterKataTerlarang('Akun tersebut terbukti penipu.')).toBe(
        'Akun tersebut berindikasi penipu.'
      );
      expect(filterKataTerlarang('Pesan ini terbukti penipuan.')).toBe(
        'Pesan ini berindikasi penipuan.'
      );
    });

    it('mengganti klaim "pasti asli" dan "terbukti asli"', () => {
      expect(filterKataTerlarang('Surat ini pasti asli.')).toBe(
        'Surat ini terindikasi asli.'
      );
      expect(filterKataTerlarang('Dokumen ini terbukti resmi.')).toBe(
        'Dokumen ini terindikasi resmi.'
      );
    });

    it('mengganti standalone "100%", "pasti", dan "terbukti"', () => {
      expect(filterKataTerlarang('Kami yakin 100% dengan hasil ini.')).toBe(
        'Kami yakin sepenuhnya dengan hasil ini.'
      );
      expect(filterKataTerlarang('Pelaku pasti akan menghubungi lagi.')).toBe(
        'Pelaku kemungkinan besar akan menghubungi lagi.'
      );
      expect(filterKataTerlarang('Modus ini terbukti sering terjadi.')).toBe(
        'Modus ini terindikasi sering terjadi.'
      );
    });

    it('mempertahankan penggunaan dalam konteks negasi/peringatan (Requirement 30.1 & 30.4)', () => {
      const klausa304 =
        'Kami tidak menemukan tanda bahaya yang kami kenali. Ini tidak berarti pasti aman.';
      expect(filterKataTerlarang(klausa304)).toBe(klausa304);

      expect(filterKataTerlarang('Ini bukan berarti pasti aman.')).toBe(
        'Ini bukan berarti pasti aman.'
      );
      expect(filterKataTerlarang('Situs ini tidak aman.')).toBe(
        'Situs ini tidak aman.'
      );
      expect(filterKataTerlarang('Data kamu belum tentu aman.')).toBe(
        'Data kamu belum tentu aman.'
      );
      expect(filterKataTerlarang('Hasil ini tidak 100% menjamin.')).toBe(
        'Hasil ini tidak 100% menjamin.'
      );
      expect(filterKataTerlarang('Informasi tersebut belum terbukti.')).toBe(
        'Informasi tersebut belum terbukti.'
      );
    });

    it('tidak mengubah kata lain yang mengandung substring serupa (keamanan, halaman, nyaman, memastikan)', () => {
      const teks =
        'Halaman ini berisi panduan keamanan akun agar kamu merasa nyaman dan dapat memastikan keaslian pesan.';
      expect(filterKataTerlarang(teks)).toBe(teks);
    });

    it('menangani input kosong atau bukan string secara aman', () => {
      expect(filterKataTerlarang('')).toBe('');
      // @ts-expect-error test non-string input
      expect(filterKataTerlarang(null)).toBe(null);
    });
  });

  describe('filterFormatDataHasil', () => {
    it('membersihkan kata terlarang dari ringkasan, judul temuan, penjelasan, hal_wajar, langkah, dan batasan', () => {
      const raw = createSampleHasil({
        ringkasan: 'Chat ini aman dan pasti asli.',
        temuan: [
          {
            judul: 'Tawaran pasti untung',
            penjelasan: 'Investasi ini terbukti aman 100%.',
            bukti: 'Dijamin 100% untung pasti cair!',
            sumber: 'ai',
          },
        ],
        hal_wajar: ['Profil pengirim terbukti terdaftar'],
        langkah: ['Pastikan akun aman dari peretasan.'],
        batasan: 'Keterangan ini belum terbukti tetapi pasti akurat.',
      });

      const filtered = filterFormatDataHasil(raw);

      expect(filtered.ringkasan).not.toContain('aman');
      expect(filtered.ringkasan).not.toContain('pasti');

      expect(filtered.temuan[0].penjelasan).not.toContain('terbukti');
      expect(filtered.temuan[0].penjelasan).not.toContain('100%');

      expect(filtered.temuan[0].bukti).toBe('Dijamin 100% untung pasti cair!');

      expect(filtered.hal_wajar[0]).not.toContain('terbukti');
      expect(filtered.batasan).toContain('belum terbukti');
    });
  });

  describe('parseBase64DataUrl', () => {
    it('mengurai data URL base64 dengan mimeType dan data terpisah', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA';
      const parsed = parseBase64DataUrl(dataUrl);
      expect(parsed.mimeType).toBe('image/png');
      expect(parsed.data).toBe('iVBORw0KGgoAAAANSUhEUgAA');
    });

    it('mengurai data URL jpeg dan webp', () => {
      const jpgUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
      expect(parseBase64DataUrl(jpgUrl)).toEqual({
        mimeType: 'image/jpeg',
        data: '/9j/4AAQSkZJRgABAQEASABIAAD',
      });

      const webpUrl = 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4';
      expect(parseBase64DataUrl(webpUrl)).toEqual({
        mimeType: 'image/webp',
        data: 'UklGRmYAAABXRUJQVlA4',
      });
    });

    it('default ke image/jpeg jika string berupa raw base64 tanpa awalan data URL', () => {
      const raw = 'iVBORw0KGgoAAAANSUhEUgAA';
      const parsed = parseBase64DataUrl(raw);
      expect(parsed.mimeType).toBe('image/jpeg');
      expect(parsed.data).toBe('iVBORw0KGgoAAAANSUhEUgAA');
    });

    it('menangani string kosong atau undefined', () => {
      expect(parseBase64DataUrl('')).toEqual({
        mimeType: 'image/jpeg',
        data: '',
      });
      // @ts-expect-error non-string input
      expect(parseBase64DataUrl(null)).toEqual({
        mimeType: 'image/jpeg',
        data: '',
      });
    });
  });

  describe('tryParseJson', () => {
    it('mem-parsing string JSON valid', () => {
      const obj = { nama: 'uji', skor: 42 };
      expect(tryParseJson(JSON.stringify(obj))).toEqual(obj);
    });

    it('membersihkan markdown code fences ```json ... ```', () => {
      const obj = { halaman: 'chat', level: 'sedang' };
      const raw = '```json\n' + JSON.stringify(obj) + '\n```';
      expect(tryParseJson(raw)).toEqual(obj);
    });

    it('mengekstrak JSON di dalam teks pengantar', () => {
      const obj = { halaman: 'chat' };
      const raw = 'Berikut adalah analisisnya:\n{"halaman":"chat"}\nSemoga membantu!';
      expect(tryParseJson(raw)).toEqual(obj);
    });

    it('mengembalikan null jika JSON tidak valid sama sekali', () => {
      expect(tryParseJson('bukan json')).toBeNull();
      expect(tryParseJson('')).toBeNull();
      // @ts-expect-error non-string
      expect(tryParseJson(null)).toBeNull();
    });
  });

  describe('isValidFormatDataHasil', () => {
    it('mengembalikan true untuk objek FormatDataHasil yang lengkap dan valid', () => {
      expect(isValidFormatDataHasil(createSampleHasil())).toBe(true);
    });

    it('mengembalikan false jika bukan objek atau bernilai null/array', () => {
      expect(isValidFormatDataHasil(null)).toBe(false);
      expect(isValidFormatDataHasil(undefined)).toBe(false);
      expect(isValidFormatDataHasil('string')).toBe(false);
      expect(isValidFormatDataHasil([])).toBe(false);
    });

    it('mengembalikan false jika nilai halaman tidak valid', () => {
      expect(isValidFormatDataHasil(createSampleHasil({ halaman: 'audio' as any }))).toBe(
        false
      );
    });

    it('mengembalikan false jika nilai level tidak valid', () => {
      expect(isValidFormatDataHasil(createSampleHasil({ level: 'bahaya' as any }))).toBe(
        false
      );
    });

    it('mengembalikan false jika ringkasan kosong', () => {
      expect(isValidFormatDataHasil(createSampleHasil({ ringkasan: '' }))).toBe(false);
      expect(isValidFormatDataHasil(createSampleHasil({ ringkasan: '   ' }))).toBe(false);
    });

    it('mengembalikan false jika temuan kosong saat level tinggi atau sedang', () => {
      expect(isValidFormatDataHasil(createSampleHasil({ level: 'tinggi', temuan: [] }))).toBe(
        false
      );
      expect(isValidFormatDataHasil(createSampleHasil({ level: 'sedang', temuan: [] }))).toBe(
        false
      );
    });

    it('mengembalikan true jika temuan kosong saat level tidak_ditemukan', () => {
      expect(
        isValidFormatDataHasil(
          createSampleHasil({ level: 'tidak_ditemukan', temuan: [] })
        )
      ).toBe(true);
    });

    it('mengembalikan false jika temuan tidak memiliki properti yang disyaratkan', () => {
      expect(
        isValidFormatDataHasil(
          createSampleHasil({
            temuan: [
              { judul: '', penjelasan: 'x', bukti: 'y', sumber: 'ai' },
            ] as any,
          })
        )
      ).toBe(false);
    });

    it('mengembalikan false jika langkah atau hal_wajar bukan array string', () => {
      expect(isValidFormatDataHasil(createSampleHasil({ langkah: [123] as any }))).toBe(
        false
      );
      expect(isValidFormatDataHasil(createSampleHasil({ hal_wajar: [null] as any }))).toBe(
        false
      );
    });
  });

  describe('analyzeChat', () => {
    const validApiKey = 'test-gemini-key-12345';

    it('Requirement 25.1: Mengembalikan null jika API key kosong (options & env)', async () => {
      delete process.env.GEMINI_API_KEY;

      const hasil = await analyzeChat({ mode: 'teks', teks: 'halo' }, { apiKey: '' });
      expect(hasil).toBeNull();

      const hasilTanpaOptions = await analyzeChat({ mode: 'teks', teks: 'halo' });
      expect(hasilTanpaOptions).toBeNull();
    });

    it('Requirement 14.1: Berhasil menganalisis teks chat dan mengembalikan FormatDataHasil', async () => {
      const mockHasil = createSampleHasil({
        halaman: 'chat',
        level: 'sedang',
        ringkasan: 'Ditemukan indikasi mencurigakan dalam pesan ini.',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const input: AnalyzeChatInput = {
        mode: 'teks',
        teks: 'Selamat kamu menang undian 100jt, kirim kode OTP kamu!',
        konteks: 'Pesan dari nomor +62812345678',
      };

      const hasil = await analyzeChat(input, {
        apiKey: validApiKey,
        fetchFn: mockFetch as any,
      });

      expect(hasil).not.toBeNull();
      expect(hasil?.halaman).toBe('chat');
      expect(hasil?.level).toBe('sedang');
      expect(hasil?.pihak_ketiga).toContain('Google Gemini');
      expect(hasil?.status_layanan.ai).toBe('ok');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, requestInit] = mockFetch.mock.calls[0];
      expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/');
      expect(url).toContain(`key=${validApiKey}`);
      expect(requestInit.method).toBe('POST');

      const body = JSON.parse(requestInit.body);
      expect(body.generationConfig.responseMimeType).toBe('application/json');
      expect(body.contents[0].parts[0].text).toContain(input.teks);
    });

    it('Berhasil menangani mode screenshot multimodal dengan gambar base64', async () => {
      const mockHasil = createSampleHasil({
        halaman: 'chat',
        level: 'tinggi',
        transkrip: 'Selamat! Klaim hadiahmu di link berikut bit.ly/undian',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const input: AnalyzeChatInput = {
        mode: 'screenshot',
        gambar: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA'],
        teks: 'Catatan tambahan pengirim mengaku admin bank',
      };

      const hasil = await analyzeChat(input, {
        apiKey: validApiKey,
        fetchFn: mockFetch as any,
      });

      expect(hasil).not.toBeNull();
      expect(hasil?.transkrip).toBe(
        'Selamat! Klaim hadiahmu di link berikut bit.ly/undian'
      );

      const requestInit = mockFetch.mock.calls[0][1];
      const body = JSON.parse(requestInit.body);
      const parts = body.contents[0].parts;

      expect(parts[0].inlineData).toEqual({
        mimeType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAA',
      });
      expect(parts[1].text).toContain('tangkapan layar');
      expect(parts[1].text).toContain('Catatan tambahan pengirim mengaku admin bank');
    });

    it('Requirement 14.4: Menjamin level minimum dari aturan lokal tidak diturunkan oleh AI', async () => {
      const mockHasil = createSampleHasil({
        level: 'tidak_ditemukan',
        temuan: [],
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const hasil = await analyzeChat(
        {
          mode: 'teks',
          teks: 'Halo',
          levelMinimum: 'tinggi',
        },
        {
          apiKey: validApiKey,
          fetchFn: mockFetch as any,
        }
      );

      expect(hasil).not.toBeNull();
      expect(hasil?.level).toBe('tinggi');
    });

    it('Requirement 14.5: Mengembalikan null jika keluaran JSON dari Gemini tidak valid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Bukan format JSON yang valid {[' }],
              },
            },
          ],
        }),
      });

      const hasil = await analyzeChat(
        { mode: 'teks', teks: 'Halo' },
        { apiKey: validApiKey, fetchFn: mockFetch as any }
      );

      expect(hasil).toBeNull();
    });

    it('Mengembalikan null jika HTTP response error (500, 429, 403)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const hasil = await analyzeChat(
        { mode: 'teks', teks: 'Halo' },
        { apiKey: validApiKey, fetchFn: mockFetch as any }
      );

      expect(hasil).toBeNull();
    });

    it('Mengembalikan null jika terjadi timeout pada request', async () => {
      const mockFetch = vi.fn().mockImplementation((_url, init) => {
        return new Promise((_, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(new Error('Timeout abort'));
          });
        });
      });

      const hasil = await analyzeChat(
        { mode: 'teks', teks: 'Halo' },
        {
          apiKey: validApiKey,
          timeoutMs: 50,
          fetchFn: mockFetch as any,
        }
      );

      expect(hasil).toBeNull();
    });

    it('Requirement 30.3: Menyaring kata terlarang dari respons AI', async () => {
      const mockHasil = createSampleHasil({
        ringkasan: 'Pesan ini pasti asli dan 100% aman.',
        temuan: [
          {
            judul: 'Tawaran terbukti aman',
            penjelasan: 'Pesan ini aman untuk kamu balas.',
            bukti: 'Klaim kupon undian',
            sumber: 'ai',
          },
        ],
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const hasil = await analyzeChat(
        { mode: 'teks', teks: 'Halo' },
        { apiKey: validApiKey, fetchFn: mockFetch as any }
      );

      expect(hasil).not.toBeNull();
      expect(hasil?.ringkasan).not.toContain('pasti');
      expect(hasil?.ringkasan).not.toContain('100%');
      expect(hasil?.ringkasan).not.toContain('aman');
      expect(hasil?.temuan[0].penjelasan).not.toContain('aman');
    });

    it('Membaca GEMINI_API_KEY dari process.env jika options.apiKey tidak diberikan', async () => {
      process.env.GEMINI_API_KEY = 'env-api-key-999';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(createSampleHasil()),
      });

      const hasil = await analyzeChat(
        { mode: 'teks', teks: 'Halo' },
        { fetchFn: mockFetch as any }
      );

      expect(hasil).not.toBeNull();
      expect(mockFetch.mock.calls[0][0]).toContain('key=env-api-key-999');
    });
  });

  describe('explainLink', () => {
    const validApiKey = 'test-gemini-key-12345';

    const sampleDiagnostik: PaketDiagnostikLink = {
      url: 'https://bca-klik-promo.xyz/login',
      levelMinimum: 'tinggi',
      temuanAturan: [
        {
          judul: 'Nama merek dalam subdomain asing',
          penjelasan: 'Domain menggunakan nama BCA tetapi TLD .xyz tidak resmi.',
          bukti: 'bca-klik-promo.xyz',
          sumber: 'aturan',
        },
      ],
      safeBrowsingDitemukan: true,
      umurDomainHari: 5,
    };

    it('Requirement 25.1: Mengembalikan null jika API key kosong', async () => {
      delete process.env.GEMINI_API_KEY;
      const hasil = await explainLink(sampleDiagnostik, { apiKey: '' });
      expect(hasil).toBeNull();
    });

    it('Berhasil mengirim paket diagnostik dan mengembalikan FormatDataHasil dengan halaman "link"', async () => {
      const mockHasil = createSampleHasil({
        halaman: 'link',
        level: 'tinggi',
        ringkasan: 'Link ini sangat mencurigakan dan menyerupai situs phishing.',
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const hasil = await explainLink(sampleDiagnostik, {
        apiKey: validApiKey,
        fetchFn: mockFetch as any,
      });

      expect(hasil).not.toBeNull();
      expect(hasil?.halaman).toBe('link');
      expect(hasil?.level).toBe('tinggi');
      expect(hasil?.pihak_ketiga).toContain('Google Gemini');
      expect(hasil?.pihak_ketiga).toContain('Google Safe Browsing');
      expect(hasil?.pihak_ketiga).toContain('RDAP');
      expect(hasil?.status_layanan.ai).toBe('ok');

      const requestInit = mockFetch.mock.calls[0][1];
      const body = JSON.parse(requestInit.body);
      const userText = body.contents[0].parts[0].text;
      expect(userText).toContain('https://bca-klik-promo.xyz/login');
      expect(userText).toContain('Nama merek dalam subdomain asing');
      expect(userText).toContain('5 hari');
    });

    it('Mempertahankan level minimum dari paket diagnostik (rules-first)', async () => {
      const mockHasil = createSampleHasil({
        halaman: 'link',
        level: 'tidak_ditemukan',
        temuan: [],
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const hasil = await explainLink(sampleDiagnostik, {
        apiKey: validApiKey,
        fetchFn: mockFetch as any,
      });

      expect(hasil).not.toBeNull();
      expect(hasil?.level).toBe('tinggi');
    });

    it('Mengembalikan null jika terjadi timeout atau fetch error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const hasil = await explainLink(sampleDiagnostik, {
        apiKey: validApiKey,
        fetchFn: mockFetch as any,
      });

      expect(hasil).toBeNull();
    });

    it('Menyaring kata terlarang dari penjelasan link', async () => {
      const mockHasil = createSampleHasil({
        halaman: 'link',
        level: 'sedang',
        ringkasan: 'Link ini aman jika kamu hanya membaca.',
        temuan: [
          {
            judul: 'Link pasti berbahaya',
            penjelasan: 'Sudah terbukti penipuan phishing.',
            bukti: 'xyz.com',
            sumber: 'ai',
          },
        ],
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createGeminiApiResponse(mockHasil),
      });

      const hasil = await explainLink(sampleDiagnostik, {
        apiKey: validApiKey,
        fetchFn: mockFetch as any,
      });

      expect(hasil).not.toBeNull();
      expect(hasil?.ringkasan).not.toContain('aman');
      expect(hasil?.temuan[0].judul).not.toContain('pasti');
      expect(hasil?.temuan[0].penjelasan).not.toContain('terbukti');
    });
  });

  describe('tanyaGemini', () => {
    const validApiKey = 'test-gemini-key-12345';

    it('mengembalikan null jika API key kosong', async () => {
      delete process.env.GEMINI_API_KEY;
      const hasil = await tanyaGemini(
        { pertanyaan: 'Apakah ini aman?' },
        { apiKey: '' }
      );
      expect(hasil).toBeNull();
    });

    it('berhasil memanggil REST API v1beta dan mengembalikan jawaban teks', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Jangan klik link tersebut karena berindikasi phishing.',
                  },
                ],
              },
            },
          ],
        }),
      });

      const hasil = await tanyaGemini(
        {
          pertanyaan: 'Apakah link ini berisiko?',
          riwayat: [
            { peran: 'pengguna', isi: 'Saya dapat pesan mencurigakan' },
            { peran: 'asisten', isi: 'Bisa jelaskan lebih lanjut?' },
          ],
        },
        {
          apiKey: validApiKey,
          fetchFn: mockFetch as any,
        }
      );

      expect(hasil).toBe('Jangan klik link tersebut karena berindikasi phishing.');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.contents.length).toBe(3);
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[1].role).toBe('model');
      expect(body.contents[2].role).toBe('user');
      expect(body.contents[2].parts[0].text).toBe('Apakah link ini berisiko?');
    });

    it('menyaring kata terlarang dari teks respons Gemini', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Link tersebut pasti aman untuk dibuka 100%.',
                  },
                ],
              },
            },
          ],
        }),
      });

      const hasil = await tanyaGemini(
        { pertanyaan: 'Apakah aman?' },
        {
          apiKey: validApiKey,
          fetchFn: mockFetch as any,
        }
      );

      expect(hasil).not.toBeNull();
      expect(hasil).not.toContain('pasti aman');
      expect(hasil).not.toContain('100%');
    });

    it('mengembalikan null jika respons HTTP error atau timeout', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const hasil = await tanyaGemini(
        { pertanyaan: 'Halo' },
        {
          apiKey: validApiKey,
          fetchFn: mockFetch as any,
        }
      );

      expect(hasil).toBeNull();
    });
  });
});

describe('bangunGeminiRequest (GEMINI_BASE_URL)', () => {
  it('memakai alamat resmi Google jika base URL kosong', async () => {
    const { bangunGeminiRequest } = await import('./gemini');
    const r = bangunGeminiRequest('gemini-2.5-flash', 'k1', '');
    expect(r.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=k1'
    );
    expect(r.headers['x-goog-api-key']).toBe('k1');
  });

  it('menambahkan /v1beta ke alamat proxy tanpa segmen versi', async () => {
    const { bangunGeminiRequest } = await import('./gemini');
    const r = bangunGeminiRequest('gemini-2.5-flash', 'k2', 'http://10.0.0.5:20128/');
    expect(r.url).toBe('http://10.0.0.5:20128/v1beta/models/gemini-2.5-flash:generateContent?key=k2');
  });

  it('tidak menggandakan segmen versi yang sudah ada', async () => {
    const { bangunGeminiRequest } = await import('./gemini');
    expect(bangunGeminiRequest('m', 'k', 'http://proxy/v1beta').url).toBe(
      'http://proxy/v1beta/models/m:generateContent?key=k'
    );
    expect(bangunGeminiRequest('m', 'k', 'http://proxy/v1').url).toBe(
      'http://proxy/v1/models/m:generateContent?key=k'
    );
  });

  it('membaca GEMINI_BASE_URL dari environment', async () => {
    const { bangunGeminiRequest } = await import('./gemini');
    const lama = process.env.GEMINI_BASE_URL;
    process.env.GEMINI_BASE_URL = 'http://proxy.test:9000';
    try {
      expect(bangunGeminiRequest('m', 'k').url).toBe('http://proxy.test:9000/v1beta/models/m:generateContent?key=k');
    } finally {
      if (lama === undefined) delete process.env.GEMINI_BASE_URL;
      else process.env.GEMINI_BASE_URL = lama;
    }
  });
});

describe('model & header saat memakai proxy', () => {
  it('nama model proxy dipakai apa adanya dan garis miring tidak di-encode', async () => {
    const { bangunGeminiRequest, resolveGeminiModel } = await import('./gemini');
    const lamaBase = process.env.GEMINI_BASE_URL;
    const lamaModel = process.env.GEMINI_MODEL;
    process.env.GEMINI_BASE_URL = 'http://proxy.test:20128';
    process.env.GEMINI_MODEL = ' ag/gemini-3.8-flash';
    try {
      const model = resolveGeminiModel();
      expect(model).toBe('ag/gemini-3.8-flash');
      const r = bangunGeminiRequest(model, ' sk-abc');
      expect(r.url).toBe('http://proxy.test:20128/v1beta/models/ag/gemini-3.8-flash:generateContent?key=sk-abc');
      expect(r.headers.Authorization).toBe('Bearer sk-abc');
    } finally {
      if (lamaBase === undefined) delete process.env.GEMINI_BASE_URL; else process.env.GEMINI_BASE_URL = lamaBase;
      if (lamaModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = lamaModel;
    }
  });

  it('tanpa proxy, nama model dipakai apa adanya dan tanpa header Bearer', async () => {
    const { bangunGeminiRequest, resolveGeminiModel } = await import('./gemini');
    const lamaBase = process.env.GEMINI_BASE_URL;
    delete process.env.GEMINI_BASE_URL;
    try {
      expect(resolveGeminiModel('gemini-3.8-flash')).toBe('gemini-3.8-flash');
      const { DEFAULT_GEMINI_MODEL } = await import('./gemini');
      expect(resolveGeminiModel('gemini-1.5-flash')).toBe(DEFAULT_GEMINI_MODEL);
      expect(bangunGeminiRequest('gemini-3.8-flash', 'k').headers.Authorization).toBeUndefined();
    } finally {
      if (lamaBase !== undefined) process.env.GEMINI_BASE_URL = lamaBase;
    }
  });
});

describe('model cadangan & batas waktu per model', () => {
  it('alamat resmi Google tidak dianggap proxy (tanpa header Bearer)', async () => {
    const { memakaiProxyGemini, bangunGeminiRequest } = await import('./gemini');
    expect(memakaiProxyGemini('https://generativelanguage.googleapis.com')).toBe(false);
    expect(memakaiProxyGemini('http://100.1.2.3:20128')).toBe(true);
    expect(memakaiProxyGemini('')).toBe(false);
    expect(
      bangunGeminiRequest('gemini-3.8-flash', 'k', 'https://generativelanguage.googleapis.com').headers.Authorization
    ).toBeUndefined();
  });

  it('urutan model: utama lalu cadangan, tanpa gemini-2.5', async () => {
    const { daftarModelGemini } = await import('./gemini');
    const daftar = daftarModelGemini('gemini-3.8-flash');
    expect(daftar[0]).toBe('gemini-3.8-flash');
    expect(daftar).toContain('gemini-3.5-flash');
    expect(daftar.some((m) => m.startsWith('gemini-2.5'))).toBe(false);
  });

  it('fetchModelGemini melempar GeminiModelTimeout jika model menggantung', async () => {
    const { fetchModelGemini, GeminiModelTimeout } = await import('./gemini');
    const gantung = vi.fn(
      (_u: unknown, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );
    await expect(
      fetchModelGemini(gantung as unknown as typeof fetch, 'http://x', {}, 'gemini-3.8-flash', 20)
    ).rejects.toBeInstanceOf(GeminiModelTimeout);
  });

  it('model yang membalas 503 dilewati pada pemeriksaan media berikutnya', async () => {
    const { daftarModelGemini, tandaiDariError, resetModelSibuk } = await import('./gemini');
    resetModelSibuk();
    expect(tandaiDariError('gemini-3.8-flash', 503, 'high demand')).toBe(true);
    expect(daftarModelGemini('gemini-3.8-flash')[0]).toBe('gemini-3.5-flash');
    resetModelSibuk();
    expect(daftarModelGemini('gemini-3.8-flash')[0]).toBe('gemini-3.8-flash');
  });

  it('model sibuk kembali dicoba setelah jeda habis', async () => {
    const { daftarModelGemini, tandaiModelSibuk, resetModelSibuk, JEDA_MODEL_SIBUK_MS } = await import('./gemini');
    resetModelSibuk();
    tandaiModelSibuk('gemini-3.8-flash', 1_000);
    expect(daftarModelGemini('gemini-3.8-flash', 1_000)).not.toContain('gemini-3.8-flash');
    expect(daftarModelGemini('gemini-3.8-flash', 1_000 + JEDA_MODEL_SIBUK_MS + 1)[0]).toBe('gemini-3.8-flash');
    resetModelSibuk();
  });
});

describe('kuota harian habis (HTTP 429)', () => {
  const errKuota = JSON.stringify({
    error: {
      code: 429,
      message: 'You exceeded your current quota',
      details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '68517s' }],
    },
  });

  it('membaca retryDelay dari isi error', async () => {
    const { bacaJedaUlangGemini } = await import('./gemini');
    expect(bacaJedaUlangGemini(errKuota)).toBe(68_517_000);
    expect(bacaJedaUlangGemini('{"error":{}}')).toBeUndefined();
  });

  it('model yang kuotanya habis dilewati lama dan tidak dicoba ulang', async () => {
    const { tandaiDariError, daftarModelGemini, resetModelSibuk, JEDA_MODEL_SIBUK_MS } = await import('./gemini');
    resetModelSibuk();
    expect(tandaiDariError('gemini-3.8-flash', 429, errKuota)).toBe(false);
    const nanti = Date.now() + JEDA_MODEL_SIBUK_MS + 60_000;
    expect(daftarModelGemini('gemini-3.8-flash', nanti)).not.toContain('gemini-3.8-flash');
    expect(tandaiDariError('gemini-3.5-flash', 503, 'high demand')).toBe(true);
    resetModelSibuk();
  });
});
