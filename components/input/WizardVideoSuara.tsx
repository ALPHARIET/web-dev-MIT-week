'use client';

import React, { useState, useEffect } from 'react';
import type { FormatDataHasil } from '../../lib/hasil';
import {
  generateHasilVideoLokal,
  type JawabanWizardVideo,
  type SituasiVideo,
  type ApaDimintaVideo,
  type NomorAkunVideo,
  type SiapaTampilVideo,
} from '../../lib/aturan/video-rules';

export interface WizardVideoSuaraProps {
  onHasilReady: (hasil: FormatDataHasil) => void;
  initialJawaban?: Partial<JawabanWizardVideo>;
  className?: string;
}

export type LangkahWizard = 1 | 2 | 3 | 4;

export interface DefinisiSituasi {
  id: SituasiVideo;
  judul: string;
  deskripsi: string;
}

export const DAFTAR_SITUASI_VIDEO: DefinisiSituasi[] = [
  {
    id: 'video_call',
    judul: 'Video Call / Telepon',
    deskripsi: 'Sedang atau baru saja menerima video call / telepon',
  },
  {
    id: 'rekaman',
    judul: 'Rekaman Video / Voice Note',
    deskripsi: 'Menerima rekaman video atau voice note',
  },
  {
    id: 'tokoh',
    judul: 'Video Tokoh / Pejabat / Artis',
    deskripsi: 'Melihat video tokoh, pejabat, atau artis di media sosial',
  },
];

export interface ItemChecklist {
  id: string;
  label: string;
  deskripsi: string;
}

export const DAFTAR_CHECKLIST_PENGAMATAN: ItemChecklist[] = [
  {
    id: 'bibir_tidak_sinkron',
    label: 'Bibir tidak sinkron',
    deskripsi: 'Gerakan bibir tidak pas dengan suara',
  },
  {
    id: 'kedipan_aneh',
    label: 'Kedipan aneh',
    deskripsi: 'Mata jarang berkedip atau pola kedipan kaku',
  },
  {
    id: 'tepi_wajah_blur',
    label: 'Tepi wajah blur saat menoleh',
    deskripsi: 'Garis batas rahang, dagu, rambut tampak buram',
  },
  {
    id: 'wajah_rusak_tangan',
    label: 'Wajah rusak saat tangan lewat',
    deskripsi: 'Distorsi saat tangan/benda melintas di depan kamera',
  },
  {
    id: 'cahaya_beda',
    label: 'Cahaya wajah beda dengan latar',
    deskripsi: 'Arah/warna pencahayaan wajah tidak konsisten dengan latar',
  },
  {
    id: 'suara_datar_napas',
    label: 'Suara datar tanpa tarikan napas',
    deskripsi: 'Nada bicara monoton tanpa tarikan napas alami',
  },
  {
    id: 'jeda_janggal',
    label: 'Jeda janggal sebelum menjawab',
    deskripsi: 'Jeda hening canggung dalam komunikasi dua arah',
  },
];

export function isChecklistSelected(item: ItemChecklist, list: string[]): boolean {
  return list.some((val) => {
    if (val === item.id || val === item.label) return true;
    const vLower = val.toLowerCase().trim();
    const lLower = item.label.toLowerCase().trim();
    if (vLower === lLower) return true;
    if (item.id === 'tepi_wajah_blur' && (vLower.includes('tepi wajah blur') || vLower === 'tepi wajah blur')) return true;
    if (item.id === 'cahaya_beda' && (vLower.includes('cahaya beda') || vLower.includes('cahaya wajah beda'))) return true;
    if (item.id === 'jeda_janggal' && (vLower.includes('jeda janggal') || vLower === 'jeda janggal')) return true;
    if (item.id === 'wajah_rusak_tangan' && (vLower.includes('wajah rusak') || vLower.includes('wajah rusak saat tangan lewat'))) return true;
    if (item.id === 'suara_datar_napas' && (vLower.includes('suara datar') || vLower.includes('suara datar tanpa tarikan napas'))) return true;
    return false;
  });
}

export function removeChecklistItem(item: ItemChecklist, list: string[]): string[] {
  return list.filter((val) => {
    if (val === item.id || val === item.label) return false;
    const vLower = val.toLowerCase().trim();
    const lLower = item.label.toLowerCase().trim();
    if (vLower === lLower) return false;
    if (item.id === 'tepi_wajah_blur' && (vLower.includes('tepi wajah blur') || vLower === 'tepi wajah blur')) return false;
    if (item.id === 'cahaya_beda' && (vLower.includes('cahaya beda') || vLower.includes('cahaya wajah beda'))) return false;
    if (item.id === 'jeda_janggal' && (vLower.includes('jeda janggal') || vLower === 'jeda janggal')) return false;
    if (item.id === 'wajah_rusak_tangan' && (vLower.includes('wajah rusak') || vLower.includes('wajah rusak saat tangan lewat'))) return false;
    if (item.id === 'suara_datar_napas' && (vLower.includes('suara datar') || vLower.includes('suara datar tanpa tarikan napas'))) return false;
    return true;
  });
}

function isLangkah2Lengkap(
  situasi: SituasiVideo | null,
  jawaban: JawabanWizardVideo
): boolean {
  if (!situasi) return false;

  const hasApaDiminta = Boolean(
    jawaban.apa_diminta && String(jawaban.apa_diminta).trim() !== ''
  );
  const hasNomorAkun = Boolean(
    jawaban.nomor_akun && String(jawaban.nomor_akun).trim() !== ''
  );
  const hasDarurat = typeof jawaban.darurat_desakan === 'boolean';
  const hasRahasia = typeof jawaban.diminta_rahasiakan === 'boolean';
  const hasBisaTelepon = typeof jawaban.bisa_telepon_balik === 'boolean';

  if (!hasApaDiminta || !hasNomorAkun || !hasDarurat || !hasRahasia || !hasBisaTelepon) {
    return false;
  }

  if (situasi === 'tokoh') {
    const hasSiapaTampil = Boolean(
      jawaban.siapa_tampil && String(jawaban.siapa_tampil).trim() !== ''
    );
    const hasJanjiUntung = typeof jawaban.janji_untung_ajakan === 'boolean';
    return hasSiapaTampil && hasJanjiUntung;
  }

  return true;
}

export function WizardVideoSuara({
  onHasilReady,
  initialJawaban,
  className = '',
}: WizardVideoSuaraProps): React.JSX.Element {
  const [langkah, setLangkah] = useState<LangkahWizard>(1);
  const [situasi, setSituasi] = useState<SituasiVideo | null>(
    (initialJawaban?.situasi as SituasiVideo) ?? null
  );
  const [jawaban, setJawaban] = useState<JawabanWizardVideo>(() => {
    return (initialJawaban as JawabanWizardVideo) || {};
  });
  const [checklist, setChecklist] = useState<string[]>(() => {
    const initialList = Array.isArray(initialJawaban?.checklist)
      ? initialJawaban.checklist
      : Array.isArray(initialJawaban?.tanda_checklist)
      ? initialJawaban.tanda_checklist
      : [];
    return initialList;
  });

  useEffect(() => {
    if (initialJawaban) {
      if (initialJawaban.situasi) {
        setSituasi(initialJawaban.situasi as SituasiVideo);
      }
      const incomingList = Array.isArray(initialJawaban.checklist)
        ? initialJawaban.checklist
        : Array.isArray(initialJawaban.tanda_checklist)
        ? initialJawaban.tanda_checklist
        : null;
      if (incomingList !== null) {
        setChecklist(incomingList);
      }
      setJawaban((prev) => ({
        ...prev,
        ...initialJawaban,
      }));
    }
  }, [initialJawaban]);

  const handlePilihSituasi = (id: SituasiVideo) => {
    setSituasi(id);
    setJawaban((prev) => ({
      ...prev,
      situasi: id,
    }));
  };

  const handleUpdateJawaban = (
    field: keyof JawabanWizardVideo,
    value: unknown
  ) => {
    setJawaban((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToggleChecklist = (item: ItemChecklist) => {
    setChecklist((prev) => {
      const isSelected = isChecklistSelected(item, prev);
      if (isSelected) {
        return removeChecklistItem(item, prev);
      } else {
        return [...prev, item.label];
      }
    });
  };

  const handleKeLangkah2 = () => {
    if (situasi) {
      setLangkah(2);
    }
  };

  const handleKeLangkah3 = () => {
    if (isLangkah2Lengkap(situasi, jawaban)) {
      setLangkah(3);
    }
  };

  const handleKembaliKeLangkah1 = () => {
    setLangkah(1);
  };

  const handleKembaliKeLangkah2 = () => {
    setLangkah(2);
  };

  const selesaikanWizard = (checklistFinal: string[]) => {
    const jawabanLengkap: JawabanWizardVideo = {
      ...jawaban,
      situasi,
      checklist: checklistFinal,
      tanda_checklist: checklistFinal,
    };

    setLangkah(4);
    const hasil = generateHasilVideoLokal(jawabanLengkap);
    onHasilReady(hasil);
  };

  const handleResetWizard = () => {
    setLangkah(1);
    setSituasi(null);
    setJawaban({});
    setChecklist([]);
  };

  const langkah2Siap = isLangkah2Lengkap(situasi, jawaban);

  return (
    <div
      data-testid="wizard-video-suara"
      className={`w-full max-w-3xl lg:max-w-none mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-5 sm:p-6 lg:p-8 ${className}`.trim()}
    >
      {/* ===== HEADER WIZARD & INDIKATOR LANGKAH ===== */}
      <div className="mb-6 sm:mb-8 border-b border-gray-100 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Cek Video Call, Suara, atau Video Medsos
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Jawab pertanyaan konteks situasi untuk memeriksa tingkat kewaspadaan penipuan
            </p>
          </div>
          <div
            data-testid="indikator-langkah"
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            Langkah {langkah} dari 4
          </div>
        </div>

        {/* ===== PROGRESS BAR VISUAL ===== */}
        <div className="grid grid-cols-4 gap-2 pt-1" aria-label="Progress langkah wizard">
          {[
            { no: 1, label: 'Situasi' },
            { no: 2, label: 'Konteks' },
            { no: 3, label: 'Checklist' },
            { no: 4, label: 'Selesai' },
          ].map((step) => {
            const isCompleted = langkah > step.no;
            const isCurrent = langkah === step.no;
            return (
              <div key={step.no} className="flex flex-col gap-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600'
                      : isCurrent
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`text-[11px] truncate hidden sm:block ${
                    isCurrent
                      ? 'font-bold text-blue-700'
                      : isCompleted
                      ? 'text-gray-700 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  {step.no}. {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== LANGKAH 1: PILIH SITUASI ===== */}
      {langkah === 1 && (
        <section aria-labelledby="heading-langkah-1" className="space-y-6">
          <div>
            <h3
              id="heading-langkah-1"
              className="text-base sm:text-lg font-bold text-gray-900"
            >
              Langkah 1: Pilih Situasi yang Kamu Alami
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Pilih salah satu kondisi yang paling menggambarkan komunikasi atau konten yang mencurigakan.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Pilihan situasi video atau suara"
            className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 sm:gap-4"
          >
            {DAFTAR_SITUASI_VIDEO.map((item) => {
              const isSelected = situasi === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-testid={`kartu-situasi-${item.id}`}
                  onClick={() => handlePilihSituasi(item.id)}
                  className={`w-full text-left p-4 sm:p-5 rounded-xl border-2 transition-all flex items-start gap-4 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50/70 text-gray-900'
                  }`}
                >
                  {/* ===== INDIKATOR RADIO LINGKARAN ===== */}
                  <span
                    className={`flex h-5 w-5 mt-0.5 rounded-full border-2 items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-400 bg-white'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm sm:text-base leading-snug">
                        {item.judul}
                      </span>
                      {isSelected && (
                        <span
                          data-testid="indikator-terpilih-situasi"
                          className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md flex-shrink-0"
                        >
                          Terpilih
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">
                      {item.deskripsi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ===== NAVIGASI LANGKAH 1 ===== */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              data-testid="tombol-lanjut"
              onClick={handleKeLangkah2}
              disabled={!situasi}
              className={`inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-sm min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                situasi
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                  : 'bg-gray-200 text-gray-600 cursor-not-allowed'
              }`}
            >
              Lanjut ke Pertanyaan
            </button>
          </div>
        </section>
      )}

      {/* ===== LANGKAH 2: PERTANYAAN KONTEKS ===== */}
      {langkah === 2 && (
        <section aria-labelledby="heading-langkah-2" className="space-y-6">
          <div>
            <h3
              id="heading-langkah-2"
              className="text-base sm:text-lg font-bold text-gray-900"
            >
              Langkah 2: Pertanyaan Konteks Komunikasi
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Jawab pertanyaan berikut sesuai apa yang kamu amati dari pesan, panggilan, atau video tersebut.
            </p>
          </div>

          <div className="space-y-6">
            {situasi === 'tokoh' && (
              <fieldset
                data-testid="pertanyaan-siapa-tampil"
                className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
              >
                <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                  1. Siapa figur yang tampil dalam video?
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { val: 'tokoh_publik', label: 'Tokoh publik, pejabat, atau artis' },
                    { val: 'keluarga', label: 'Keluarga atau kerabat dekat' },
                    { val: 'atasan', label: 'Atasan, dosen, atau pimpinan kerja' },
                    { val: 'lainnya', label: 'Lainnya / figur tidak dikenal' },
                  ].map((opt) => {
                    const isChecked = jawaban.siapa_tampil === opt.val;
                    const id = `siapa_tampil_${opt.val}`;
                    return (
                      <label
                        key={opt.val}
                        htmlFor={id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="siapa_tampil"
                          value={opt.val}
                          checked={isChecked}
                          onChange={() =>
                            handleUpdateJawaban('siapa_tampil', opt.val as SiapaTampilVideo)
                          }
                          data-testid={`opsi-siapa_tampil-${opt.val}`}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-xs sm:text-sm leading-tight">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset
              data-testid="pertanyaan-apa-diminta"
              className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
            >
              <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                {situasi === 'tokoh' ? '2.' : '1.'} Apa yang diminta atau ditawarkan?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  {
                    val: 'otp_pin',
                    label: 'OTP, PIN, password, atau data akun',
                    bobotText: 'Risiko Tinggi (+4)',
                  },
                  {
                    val: 'transfer',
                    label: 'Transfer uang atau dana',
                    bobotText: 'Risiko Tinggi (+3)',
                  },
                  {
                    val: 'voucher',
                    label: 'Voucher belanja atau pulsa',
                    bobotText: 'Risiko Tinggi (+3)',
                  },
                  {
                    val: 'investasi',
                    label: 'Investasi atau keuntungan modal',
                    bobotText: 'Risiko Tinggi (+3)',
                  },
                  {
                    val: 'link_apk',
                    label: 'Klik link atau pasang file APK',
                    bobotText: 'Waspada (+2)',
                  },
                  {
                    val: 'tidak_ada',
                    label: 'Tidak ada permintaan apa-apa',
                    bobotText: 'Netral (0)',
                  },
                ].map((opt) => {
                  const isChecked = jawaban.apa_diminta === opt.val;
                  const id = `apa_diminta_${opt.val}`;
                  return (
                    <label
                      key={opt.val}
                      htmlFor={id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name="apa_diminta"
                        value={opt.val}
                        checked={isChecked}
                        onChange={() =>
                          handleUpdateJawaban('apa_diminta', opt.val as ApaDimintaVideo)
                        }
                        data-testid={`opsi-apa_diminta-${opt.val}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm leading-tight">
                          {opt.label}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {situasi === 'tokoh' && (
              <fieldset
                data-testid="pertanyaan-janji-untung"
                className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
              >
                <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                  3. Ada janji untung atau ajakan ke grup WA/Telegram?
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { val: true, label: 'Ya, ada janji untung atau ajakan ke grup WA/Telegram' },
                    { val: false, label: 'Tidak ada janji untung atau ajakan grup' },
                  ].map((opt) => {
                    const isChecked = jawaban.janji_untung_ajakan === opt.val;
                    const id = `janji_untung_${String(opt.val)}`;
                    return (
                      <label
                        key={String(opt.val)}
                        htmlFor={id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="janji_untung_ajakan"
                          value={String(opt.val)}
                          checked={isChecked}
                          onChange={() =>
                            handleUpdateJawaban('janji_untung_ajakan', opt.val)
                          }
                          data-testid={`opsi-janji_untung-${String(opt.val)}`}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-xs sm:text-sm leading-tight">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset
              data-testid="pertanyaan-nomor-akun"
              className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
            >
              <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                {situasi === 'tokoh' ? '4.' : '2.'} Dari nomor atau akun mana pesan / video berasal?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {[
                  {
                    val: 'nomor_baru',
                    label: 'Nomor baru mengaku ganti nomor',
                  },
                  {
                    val: 'akun_tidak_dikenal',
                    label: 'Akun medsos atau kontak tak dikenal',
                  },
                  {
                    val: 'nomor_lama_tersimpan',
                    label: 'Nomor lama yang tersimpan di kontak',
                  },
                ].map((opt) => {
                  const isChecked =
                    jawaban.nomor_akun === opt.val ||
                    (opt.val === 'nomor_lama_tersimpan' &&
                      jawaban.nomor_akun === 'nomor_lama');
                  const id = `nomor_akun_${opt.val}`;
                  return (
                    <label
                      key={opt.val}
                      htmlFor={id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name="nomor_akun"
                        value={opt.val}
                        checked={isChecked}
                        onChange={() =>
                          handleUpdateJawaban('nomor_akun', opt.val as NomorAkunVideo)
                        }
                        data-testid={`opsi-nomor_akun-${opt.val}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-xs sm:text-sm leading-tight">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset
              data-testid="pertanyaan-darurat-desakan"
              className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
            >
              <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                {situasi === 'tokoh' ? '5.' : '3.'} Ada keadaan darurat atau desakan batas waktu?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  { val: true, label: 'Ya, ada keadaan darurat atau desakan waktu' },
                  { val: false, label: 'Tidak ada keadaan darurat' },
                ].map((opt) => {
                  const isChecked = jawaban.darurat_desakan === opt.val;
                  const id = `darurat_${String(opt.val)}`;
                  return (
                    <label
                      key={String(opt.val)}
                      htmlFor={id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name="darurat_desakan"
                        value={String(opt.val)}
                        checked={isChecked}
                        onChange={() =>
                          handleUpdateJawaban('darurat_desakan', opt.val)
                        }
                        data-testid={`opsi-darurat-${String(opt.val)}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-xs sm:text-sm leading-tight">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset
              data-testid="pertanyaan-diminta-rahasiakan"
              className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
            >
              <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                {situasi === 'tokoh' ? '6.' : '4.'} Diminta merahasiakan dari orang lain?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  { val: true, label: 'Ya, diminta jangan memberi tahu siapa pun' },
                  { val: false, label: 'Tidak diminta merahasiakan' },
                ].map((opt) => {
                  const isChecked = jawaban.diminta_rahasiakan === opt.val;
                  const id = `rahasiakan_${String(opt.val)}`;
                  return (
                    <label
                      key={String(opt.val)}
                      htmlFor={id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name="diminta_rahasiakan"
                        value={String(opt.val)}
                        checked={isChecked}
                        onChange={() =>
                          handleUpdateJawaban('diminta_rahasiakan', opt.val)
                        }
                        data-testid={`opsi-rahasiakan-${String(opt.val)}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-xs sm:text-sm leading-tight">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset
              data-testid="pertanyaan-bisa-telepon-balik"
              className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
            >
              <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                {situasi === 'tokoh' ? '7.' : '5.'} Bisa ditelepon balik atau diverifikasi?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  {
                    val: true,
                    label: 'Bisa ditelepon balik atau dikonfirmasi langsung',
                  },
                  {
                    val: false,
                    label: 'Menolak, kamera rusak, sinyal buruk, atau menghindar',
                  },
                ].map((opt) => {
                  const isChecked = jawaban.bisa_telepon_balik === opt.val;
                  const id = `telepon_balik_${String(opt.val)}`;
                  return (
                    <label
                      key={String(opt.val)}
                      htmlFor={id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      <input
                        id={id}
                        type="radio"
                        name="bisa_telepon_balik"
                        value={String(opt.val)}
                        checked={isChecked}
                        onChange={() =>
                          handleUpdateJawaban('bisa_telepon_balik', opt.val)
                        }
                        data-testid={`opsi-telepon_balik-${String(opt.val)}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-xs sm:text-sm leading-tight">
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {situasi === 'video_call' && (
              <fieldset
                data-testid="pertanyaan-masih-tersambung"
                className="space-y-2 border border-gray-200 rounded-xl p-3.5 sm:p-4 bg-gray-50/50"
              >
                <legend className="text-xs sm:text-sm font-bold text-gray-900 px-1">
                  6. Apakah saat ini kamu masih tersambung dalam panggilan tersebut?
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { val: true, label: 'Ya, saat ini masih tersambung' },
                    { val: false, label: 'Tidak, panggilan sudah selesai' },
                  ].map((opt) => {
                    const isChecked = jawaban.masih_tersambung === opt.val;
                    const id = `masih_tersambung_${String(opt.val)}`;
                    return (
                      <label
                        key={String(opt.val)}
                        htmlFor={id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer min-h-[44px] transition-colors ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold'
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <input
                          id={id}
                          type="radio"
                          name="masih_tersambung"
                          value={String(opt.val)}
                          checked={isChecked}
                          onChange={() =>
                            handleUpdateJawaban('masih_tersambung', opt.val)
                          }
                          data-testid={`opsi-masih_tersambung-${String(opt.val)}`}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-xs sm:text-sm leading-tight">
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>

          {/* ===== NAVIGASI LANGKAH 2 ===== */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-2 flex-wrap">
            <button
              type="button"
              data-testid="tombol-kembali"
              onClick={handleKembaliKeLangkah1}
              className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Kembali
            </button>

            <button
              type="button"
              data-testid="tombol-lanjut"
              onClick={handleKeLangkah3}
              disabled={!langkah2Siap}
              className={`inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-sm min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                langkah2Siap
                  ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm'
                  : 'bg-gray-200 text-gray-600 cursor-not-allowed'
              }`}
            >
              Lanjut ke Checklist
            </button>
          </div>
        </section>
      )}

      {/* ===== LANGKAH 3: CHECKLIST PENGAMATAN ===== */}
      {langkah === 3 && (
        <section aria-labelledby="heading-langkah-3" className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3
                id="heading-langkah-3"
                className="text-base sm:text-lg font-bold text-gray-900"
              >
                Langkah 3: Checklist Pengamatan Visual & Audio
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                Opsional
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Centang tanda-tanda kejanggalan fisik yang sempat kamu perhatikan. Kamu juga bisa langsung melewati langkah ini.
            </p>
          </div>

          {/* ===== CATATAN EDUKATIF DEEPFAKE ===== */}
          <div
            data-testid="catatan-deepfake"
            className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed"
          >
            <span className="font-semibold">Catatan: </span>
            Deepfake yang bagus bisa tidak menunjukkan tanda ini. Tidak menemukan tanda bukan berarti video itu asli.
          </div>

          {/* ===== DAFTAR CHECKLIST 7 TANDA ===== */}
          <div
            role="group"
            aria-label="Checklist ciri kejanggalan fisik video atau suara"
            className="space-y-2.5"
          >
            {DAFTAR_CHECKLIST_PENGAMATAN.map((item) => {
              const isChecked = isChecklistSelected(item, checklist);
              const inputId = `checklist_${item.id}`;
              return (
                <label
                  key={item.id}
                  htmlFor={inputId}
                  data-testid={`item-checklist-${item.id}`}
                  className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border cursor-pointer min-h-[44px] transition-colors ${
                    isChecked
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-medium'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleChecklist(item)}
                    data-testid={`checkbox-${item.id}`}
                    className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-semibold block leading-snug">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 block mt-0.5 leading-relaxed font-normal">
                      {item.deskripsi}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* ===== NAVIGASI LANGKAH 3 ===== */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 gap-2 flex-wrap">
            <button
              type="button"
              data-testid="tombol-kembali"
              onClick={handleKembaliKeLangkah2}
              className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
            >
              Kembali
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="tombol-lewati-checklist"
                onClick={() => selesaikanWizard([])}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-100 border border-gray-300 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50"
              >
                Lewati checklist
              </button>

              <button
                type="button"
                data-testid="tombol-lanjut"
                onClick={() => selesaikanWizard(checklist)}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 shadow-sm disabled:opacity-50"
              >
                Lihat Hasil
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== LANGKAH 4: PENYELESAIAN & KALKULASI LOKAL ===== */}
      {langkah === 4 && (
        <section
          aria-labelledby="heading-langkah-4"
          data-testid="langkah-selesai"
          className="text-center py-6 sm:py-8 space-y-4"
        >
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <div>
            <h3
              id="heading-langkah-4"
              className="text-lg sm:text-xl font-bold text-gray-900"
            >
              Pemeriksaan Selesai
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mt-1 leading-relaxed">
              Hasil penilaian konteks komunikasi telah dihitung di perambanmu tanpa mengirimkan file rekaman ke server luar.
            </p>
          </div>

          <div className="pt-4">
            <button
              type="button"
              data-testid="tombol-reset-wizard"
              onClick={handleResetWizard}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Ulangi Pemeriksaan
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default WizardVideoSuara;
