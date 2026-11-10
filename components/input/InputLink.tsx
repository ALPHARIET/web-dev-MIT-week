'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface InputLinkProps {
  onSubmit: (url: string) => void | Promise<void>;
  isLoading?: boolean;
  initialUrl?: string;
  className?: string;
  onFocus?: () => void;
  onSubmitEmpty?: () => void;
  onTyping?: () => void;
}

export function InputLink({
  onSubmit,
  isLoading = false,
  initialUrl = '',
  className = '',
  onFocus,
  onSubmitEmpty,
  onTyping,
}: InputLinkProps): React.JSX.Element {
  const [url, setUrl] = useState<string>(initialUrl);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialUrl !== undefined) {
      setUrl(initialUrl);
      if (initialUrl.trim()) {
        setError('');
      }
    }
  }, [initialUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 2000) {
      setUrl(val);
      if (error && val.trim()) {
        setError('');
      }
      onTyping?.();
    }
  };

  const handleClear = () => {
    setUrl('');
    setError('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Masukkan URL atau nama domain yang ingin diperiksa.');
      inputRef.current?.focus();
      onSubmitEmpty?.();
      return;
    }

    setError('');
    onSubmit(trimmed);
  };

  const isFilled = url.length > 0;
  const trimmedUrl = url.trim();

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-testid="form-input-link"
      className={`w-full flex flex-col gap-4 ${className}`.trim()}
    >
      {/* ===== BAGIAN INPUT URL ===== */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="input-link-field"
          data-testid="label-input-link"
          className="text-sm font-semibold text-gray-800"
        >
          Alamat URL atau Domain
        </label>
        <p className="text-xs text-gray-500">
          Tempel atau ketik tautan mencurigakan yang ingin kamu periksa (maksimal 2.000 karakter).
        </p>

        <div className="relative flex items-center mt-1">
          {/* ===== IKON TAUTAN DI SISI KIRI INPUT ===== */}
          <div
            className="absolute left-3.5 flex items-center pointer-events-none text-gray-400"
            aria-hidden="true"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
          </div>

          <input
            ref={inputRef}
            id="input-link-field"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            maxLength={2000}
            value={url}
            onChange={handleChange}
            onFocus={() => {
              onFocus?.();
            }}
            onTouchStart={() => {
              onFocus?.();
            }}
            disabled={isLoading}
            placeholder="Contoh: https://undian-hadiah.my.id atau sh0pee.co.id"
            aria-invalid={!!error}
            aria-describedby={error ? 'input-link-error' : 'input-link-hint'}
            data-testid="input-link"
            className={`w-full pl-11 pr-12 py-3 min-h-[48px] text-sm sm:text-base text-gray-900 bg-white border rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${
              error
                ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                : 'border-gray-300 hover:border-gray-400 focus:border-blue-600'
            } disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed`}
          />

          {/* ===== TOMBOL BERSIHKAN INPUT ===== */}
          {isFilled && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              data-testid="tombol-bersihkan"
              aria-label="Bersihkan input URL"
              title="Bersihkan input URL"
              className="absolute right-1.5 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ===== COUNTER KARAKTER & INFO BAWAH INPUT ===== */}
        <div
          id="input-link-hint"
          className="flex items-center justify-between text-xs text-gray-500 px-1 mt-0.5"
        >
          <span>Bisa berupa domain saja atau URL lengkap</span>
          <span
            data-testid="counter-karakter"
            className={`font-mono ${url.length >= 2000 ? 'text-red-600 font-semibold' : 'text-gray-400'}`}
          >
            {url.length}/2.000
          </span>
        </div>

        {error && (
          <p
            id="input-link-error"
            role="alert"
            data-testid="pesan-validasi"
            className="text-sm font-medium text-red-600 flex items-center gap-1.5 mt-1 animate-fadeIn"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{error}</span>
          </p>
        )}
      </div>

      {/* ===== PRATINJAU TEKS ALAMAT ===== */}
      {trimmedUrl && (
        <div
          data-testid="pratinjau-alamat"
          className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Pratinjau Alamat yang Akan Diperiksa:
            </span>
            <span
              data-testid="badge-keamanan-teks"
              className="text-[11px] font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
            >
              teks biasa (tidak aktif)
            </span>
          </div>

          <div
            data-testid="teks-pratinjau-url"
            className="font-mono text-sm text-gray-900 break-all select-all bg-white p-3 rounded-lg border border-gray-200 leading-relaxed shadow-xs"
          >
            {trimmedUrl}
          </div>

          <p className="text-xs text-gray-500 flex items-start gap-1.5 leading-normal">
            <svg
              className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            <span>
              Tautan di atas ditampilkan sebagai teks biasa demi keamanan. Sistem tidak akan membuka
              atau mengunjungi alamat tersebut.
            </span>
          </p>
        </div>
      )}

      {/* ===== TOMBOL UTAMA PERIKSA ===== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3 pt-1">
        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          data-testid="tombol-periksa"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors shadow-sm text-sm sm:text-base"
        >
          {isLoading ? (
            <>
              <svg
                data-testid="spinner-loading"
                className="animate-spin w-5 h-5 text-white flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>Memeriksa...</span>
            </>
          ) : (
            <>
              <span>Periksa</span>
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default InputLink;
