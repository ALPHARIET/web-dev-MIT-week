import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logoFinal from './LogoFinal.png';

export function Footer() {
  return (
    <footer className="w-full bg-limestone mt-4 sm:mt-6 text-gray-600 text-sm">
      <div className="max-w-5xl lg:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.5fr)] gap-8 lg:gap-12 items-start">
          {/* Kolom 1: Tentang Aplikasi & Catatan Batasan */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center gap-2">
              <Image
                src={logoFinal}
                alt="Logo Cek Penipuan"
                width={24}
                height={24}
                className="w-5 h-5 object-contain flex-shrink-0"
              />
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
          <div className="space-y-3 md:min-w-[240px]">
            <h3 className="font-semibold text-gray-900 text-sm tracking-wide uppercase">
              Informasi & Panduan
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/#cara-kerja"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-transparent border-0 min-h-[44px] py-0 leading-normal"
                >
                  Cara kerja dan batasan deteksi
                </Link>
              </li>
              <li>
                <Link
                  href="/cek-chat"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-transparent border-0 min-h-[44px] py-0 leading-normal"
                >
                  Periksa pesan chat mencurigakan
                </Link>
              </li>
              <li>
                <Link
                  href="/cek-link"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-transparent border-0 min-h-[44px] py-0 leading-normal"
                >
                  Periksa tautan (link / URL)
                </Link>
              </li>
              <li>
                <Link
                  href="/cek-video-suara"
                  className="inline-flex items-center text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-transparent border-0 min-h-[44px] py-0 leading-normal"
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
