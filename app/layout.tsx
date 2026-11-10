import React from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const dmSans = localFont({
  src: "../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
});
const display = localFont({
  src: "../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan",
  description:
    "Cek Penipuan - Periksa pesan chat, tautan link, dan rekaman video atau suara mencurigakan tanpa perlu login. Bantu deteksi potensi penipuan digital sedini mungkin.",
  applicationName: "Cek Penipuan",
  authors: [{ name: "Cek Penipuan" }],
  keywords: [
    "cek penipuan",
    "deteksi penipuan",
    "cek link mencurigakan",
    "cek chat scam",
    "deepfake video suara",
    "keamanan digital indonesia",
  ],
  openGraph: {
    title: "Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan",
    description:
      "Cek Penipuan - Periksa pesan chat, tautan link, dan rekaman video atau suara mencurigakan tanpa perlu login. Bantu deteksi potensi penipuan digital sedini mungkin.",
    type: "website",
    locale: "id_ID",
    siteName: "Cek Penipuan",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cek Penipuan - Periksa Chat, Link, & Video Mencurigakan",
    description:
      "Periksa pesan chat, tautan link, dan rekaman video atau suara mencurigakan tanpa perlu login.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full">
      <body
        className={`${dmSans.variable} ${display.variable} font-sans antialiased min-h-screen flex flex-col bg-pumice text-obsidian overflow-x-hidden`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-md focus:outline-none min-h-[44px] flex items-center"
        >
          Menuju ke konten utama
        </a>

        {/* ===== HEADER NAVIGASI BERSAMA ===== */}
        <Header />

        {/* ===== KONTEN HALAMAN UTAMA ===== */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-5xl lg:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 focus:outline-none"
          tabIndex={-1}
        >
          {children}
        </main>

        {/* ===== FOOTER BERSAMA ===== */}
        <Footer />
      </body>
    </html>
  );
}
