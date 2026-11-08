import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-limestone mt-16 text-gray-600 text-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Kolom 1: Tentang Aplikasi & Catatan Batasan */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="font-bold text-gray-900 text-base">Cek Penipuan</span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              Alat bantu mandiri untuk mengenali indikasi penipuan digital pada chat, link tautan, dan rekaman media. Hasil analisis bersifat edukatif dan bukan merupakan vonis mutlak.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                Khusus pengguna 18 tahun ke atas
              </span>
            </div>
          </div>

          {/* Kolom 2: Navigasi & Informasi */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm tracking-wide uppercase">
              Informasi & Panduan
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/#cara-kerja"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded min-h-[44px] py-2"
                >
                  Cara kerja dan batasan deteksi
                </Link>
              </li>
              <li>
                <Link
                  href="/cek-chat"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded min-h-[44px] py-2"
                >
                  Periksa pesan chat mencurigakan
                </Link>
              </li>
              <li>
                <Link
                  href="/cek-link"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded min-h-[44px] py-2"
                >
                  Periksa tautan (link / URL)
                </Link>
              </li>
              <li>
                <Link
                  href="/cek-video-suara"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 rounded min-h-[44px] py-2"
                >
                  Periksa panggilan video & suara
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Layanan Pihak Ketiga */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm tracking-wide uppercase">
              Layanan Pihak Ketiga
            </h3>
            <p className="text-gray-500 text-xs">
              Aplikasi ini memanfaatkan layanan pihak ketiga untuk pemeriksaan mendalam:
            </p>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400 select-none">•</span>
                <span><strong>Google Gemini:</strong> Analisis konteks pesan chat & ringkasan edukatif</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400 select-none">•</span>
                <span><strong>Google Safe Browsing:</strong> Pengecekan reputasi malware & situs berbahaya</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-gray-400 select-none">•</span>
                <span><strong>Layanan Data Domain (RDAP):</strong> Pengecekan umur pendaftaran domain</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Garis batas bawah & Hak cipta / Disclaimer */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} Cek Penipuan. Disediakan untuk membantu meningkatkan kewaspadaan digital masyarakat Indonesia.
          </p>
          <p className="text-gray-400">
            Tanpa login • Data input tidak disimpan di server
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
