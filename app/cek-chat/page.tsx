'use client';

import React, { useState, useMemo } from 'react';
import { KotakPrivasi } from '@/components/shared/KotakPrivasi';
import { KARTU_FORMULIR, TATA_CEK } from '@/components/shared/tata-letak-cek';
import { TombolContoh, type SkenarioContoh, type SkenarioChat } from '@/components/input/TombolContoh';
import { InputChat, type ChatInputData } from '@/components/input/InputChat';
import { PratinjauSensor } from '@/components/PratinjauSensor';
import { KomponenHasil, type CrossLink } from '@/components/hasil/KomponenHasil';
import { sensorTeks } from '@/lib/sensor';
import { generateHasilChatLokal } from '@/lib/aturan/chat-rules';
import { ekstrakUrl, deteksiModusVideo } from '@/lib/aturan/scoring';
import { kompresGambar } from '@/lib/image-utils';
import type { FormatDataHasil } from '@/lib/hasil';

async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof (blob as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function') {
    try {
      const buffer = await (blob as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${blob.type || 'image/jpeg'};base64,${base64}`;
    } catch {
    }
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  return '';
}

export default function CekChatPage(): React.JSX.Element {
  const [hasil, setHasil] = useState<FormatDataHasil | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [pesanFallback, setPesanFallback] = useState<string | null>(null);

  const [initialTeks, setInitialTeks] = useState<string>('');
  const [initialKonteks, setInitialKonteks] = useState<string>('');
  const [formKey, setFormKey] = useState<number>(0);

  const [preservedInput, setPreservedInput] = useState<ChatInputData | null>(null);

  const [isPratinjauOpen, setIsPratinjauOpen] = useState<boolean>(false);
  const [teksAsliPratinjau, setTeksAsliPratinjau] = useState<string>('');
  const [teksTersensorPratinjau, setTeksTersensorPratinjau] = useState<string>('');
  const [jumlahDigantiPratinjau, setJumlahDigantiPratinjau] = useState<number>(0);
  const [pendingInput, setPendingInput] = useState<ChatInputData | null>(null);

  const [evaluatedTeks, setEvaluatedTeks] = useState<string>('');
  const [evaluatedKonteks, setEvaluatedKonteks] = useState<string>('');

  const jalankanPemeriksaan = async (
    data: ChatInputData,
    teksSudahDisensor?: string
  ) => {
    setIsLoading(true);
    setPesanFallback(null);

    const teksBersih = data.mode === 'teks' ? (teksSudahDisensor ?? data.teks ?? '') : '';
    const konteks = data.konteks?.trim();

    setEvaluatedTeks(data.mode === 'teks' ? (data.teks ?? '') : '');
    setEvaluatedKonteks(konteks ?? '');

    const teksEvaluasiLokal = [teksBersih, konteks].filter(Boolean).join('\n');
    let hasilLokal = generateHasilChatLokal(teksEvaluasiLokal);

    if (data.mode === 'teks' && (data.teks ?? '').trim().length < 20) {
      hasilLokal = {
        ...hasilLokal,
        batasan: `${hasilLokal.batasan} Teks chat sangat singkat sehingga analisis terbatas. Disarankan menambah konteks percakapan.`.trim(),
      };
    }

    const payload: {
      mode: 'teks' | 'screenshot';
      teks?: string;
      gambar?: string[];
      konteks?: string;
      levelMinimum: string;
      temuanAturan: typeof hasilLokal.temuan;
    } = {
      mode: data.mode,
      konteks: konteks || undefined,
      levelMinimum: hasilLokal.level,
      temuanAturan: hasilLokal.temuan,
    };

    if (data.mode === 'teks') {
      payload.teks = teksBersih;
    } else if (data.mode === 'screenshot' && data.gambar && data.gambar.length > 0) {
      try {
        const compressedBlobs = await Promise.all(
          data.gambar.map((file) => kompresGambar(file))
        );
        const base64List = await Promise.all(
          compressedBlobs.map((blob) => blobToBase64(blob))
        );
        payload.gambar = base64List;
      } catch (err) {
        console.warn('Gagal memproses gambar sebelum pengiriman:', err);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      const response = await fetch('/api/cek-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const dataHasil: FormatDataHasil = await response.json();
        if (!dataHasil.transkrip && data.mode === 'teks' && data.teks) {
          dataHasil.transkrip = data.teks;
        }
        setHasil(dataHasil);
        if (dataHasil.status_layanan?.ai === 'gagal') {
          setIsFallback(true);
          setPesanFallback('analisis AI sedang tidak tersedia');
        } else {
          setIsFallback(false);
          setPesanFallback(null);
        }
      } else {
        throw new Error(`API mengembalikan status error ${response.status}`);
      }
    } catch {
      clearTimeout(timeoutId);

      const fallbackHasil: FormatDataHasil = {
        ...hasilLokal,
        transkrip: data.mode === 'teks' ? data.teks : hasilLokal.transkrip,
        batasan: `${hasilLokal.batasan} Catatan: analisis AI sedang tidak tersedia, sehingga hasil di bawah ini didasarkan sepenuhnya pada aturan lokal.`.trim(),
        pihak_ketiga: ['Google Gemini'],
        status_layanan: {
          ...hasilLokal.status_layanan,
          ai: 'gagal',
        },
      };

      setHasil(fallbackHasil);
      setIsFallback(true);
      setPesanFallback('analisis AI sedang tidak tersedia');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitInput = (data: ChatInputData) => {
    setPreservedInput(data);

    if (data.mode === 'teks') {
      const teksInput = data.teks || '';
      const { hasil: teksTersensor, jumlahDiganti } = sensorTeks(teksInput);

      setTeksAsliPratinjau(teksInput);
      setTeksTersensorPratinjau(teksTersensor);
      setJumlahDigantiPratinjau(jumlahDiganti);
      setPendingInput(data);

      setIsPratinjauOpen(true);
    } else {
      setPendingInput(null);
      void jalankanPemeriksaan(data);
    }
  };

  const handleKonfirmasiPratinjau = () => {
    setIsPratinjauOpen(false);
    if (pendingInput) {
      void jalankanPemeriksaan(pendingInput, teksTersensorPratinjau);
    }
  };

  const handleBatalPratinjau = () => {
    setIsPratinjauOpen(false);
  };

  const handlePilihContoh = (contoh: SkenarioContoh) => {
    if ('teks' in contoh && 'hasilSimulasi' in contoh) {
      const skenarioChat = contoh as SkenarioChat;
      setInitialTeks(skenarioChat.teks);
      setInitialKonteks(skenarioChat.konteks || '');
      setPreservedInput({
        mode: 'teks',
        teks: skenarioChat.teks,
        konteks: skenarioChat.konteks,
      });
      setEvaluatedTeks(skenarioChat.teks);
      setEvaluatedKonteks(skenarioChat.konteks || '');

      setHasil({
        ...skenarioChat.hasilSimulasi,
        transkrip: skenarioChat.hasilSimulasi.transkrip || skenarioChat.teks,
      });
      setIsFallback(false);
      setPesanFallback(null);
    }
  };

  const handleCekLagi = () => {
    setHasil(null);
    setIsFallback(false);
    setPesanFallback(null);
    setInitialTeks('');
    setInitialKonteks('');
    setPreservedInput(null);
    setPendingInput(null);
    setEvaluatedTeks('');
    setEvaluatedKonteks('');
    setFormKey((prev) => prev + 1);
  };

  const handleCobaLagi = () => {
    if (preservedInput) {
      if (preservedInput.mode === 'teks') {
        const { hasil: tersensor } = sensorTeks(preservedInput.teks || '');
        void jalankanPemeriksaan(preservedInput, tersensor);
      } else {
        void jalankanPemeriksaan(preservedInput);
      }
    }
  };

  const crossLinks = useMemo<CrossLink[]>(() => {
    if (!hasil) return [];

    const list: CrossLink[] = [];
    const teksGabungan = [evaluatedTeks, evaluatedKonteks].filter(Boolean).join('\n');

    const urls = ekstrakUrl(teksGabungan);
    if (urls.length > 0) {
      const urlPertama = urls[0];
      list.push({
        label: 'Cek link ini',
        href: '/cek-link',
        deskripsi: `Periksa tautan ${urlPertama} di Cek Link`,
        onClick: () => {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            try {
              window.sessionStorage.setItem('url_dari_chat', urlPertama);
            } catch {
            }
          }
        },
      });
    }

    const adaModusVideo =
      deteksiModusVideo(teksGabungan) ||
      Boolean(
        hasil.temuan?.some((t) =>
          deteksiModusVideo(`${t.judul} ${t.penjelasan} ${t.bukti}`)
        )
      );

    if (adaModusVideo) {
      list.push({
        label: 'Cek Video & Suara',
        href: '/cek-video-suara',
        deskripsi: 'Pemeriksaan lanjutan untuk modus panggilan video atau rekaman suara mencurigakan',
      });
    }

    return list;
  }, [hasil, evaluatedTeks, evaluatedKonteks]);

  return (
    <div className="w-full max-w-4xl lg:max-w-none mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4">
      {/* ===== JUDUL & DESKRIPSI HALAMAN CEK CHAT ===== */}
      <section data-testid="header-cek-chat" className="space-y-2">
        <h1 className="text-gray-900">
          Cek Chat Mencurigakan
        </h1>
        <p className="text-base text-gray-600 leading-relaxed max-w-[70ch]">
          Periksa teks percakapan atau screenshot chat yang mencurigakan (WhatsApp, Telegram, SMS,
          atau media sosial) untuk mengenali indikasi penipuan digital sedini mungkin.
        </p>
      </section>

      <div className={hasil ? TATA_CEK.bertumpuk : TATA_CEK.wadah}>
      {!hasil && <KotakPrivasi halaman="chat" className={TATA_CEK.samping} />}

      {!hasil ? (
        <section data-testid="area-input-chat" className={`${KARTU_FORMULIR} ${TATA_CEK.utama} space-y-5`}>
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Masukkan Pesan untuk Diperiksa
            </h2>
            {/* ===== TOMBOL CONTOH SKENARIO FIKTIF ===== */}
            <TombolContoh
              halaman="chat"
              onPilihContoh={handlePilihContoh}
              onContohDipilih={handlePilihContoh}
            />
          </div>

          {/* ===== FORM INPUT CHAT ===== */}
          <InputChat
            key={formKey}
            onSubmit={handleSubmitInput}
            isLoading={isLoading}
            initialTeks={initialTeks}
            initialKonteks={initialKonteks}
          />
        </section>
      ) : (
        <section data-testid="area-hasil-chat" className="space-y-6">
          {isFallback && (
            <div
              role="alert"
              data-testid="banner-fallback-ai"
              className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="text-xs sm:text-sm">
                  <span className="font-semibold block sm:inline">
                    Pemberitahuan Sistem: {pesanFallback || 'analisis AI sedang tidak tersedia'}.
                  </span>{' '}
                  <span>
                    Hasil di bawah ini dihasilkan menggunakan aturan lokal di peramban kamu.
                  </span>
                </div>
              </div>

              <button
                type="button"
                data-testid="tombol-coba-lagi"
                onClick={handleCobaLagi}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>Coba lagi</span>
              </button>
            </div>
          )}

          <KomponenHasil
            hasil={hasil}
            onCekLagi={handleCekLagi}
            crossLinks={crossLinks}
            transkrip={
              preservedInput?.mode === 'teks'
                ? preservedInput.teks
                : hasil.transkrip
            }
          />
        </section>
      )}
      </div>

      {/* ===== MODAL DIALOG PRATINJAU SENSOR TEKS OTOMATIS ===== */}
      <PratinjauSensor
        isOpen={isPratinjauOpen}
        teksAsli={teksAsliPratinjau}
        teksTersensor={teksTersensorPratinjau}
        jumlahDiganti={jumlahDigantiPratinjau}
        onKonfirmasi={handleKonfirmasiPratinjau}
        onBatal={handleBatalPratinjau}
        isLoading={isLoading}
      />
    </div>
  );
}
