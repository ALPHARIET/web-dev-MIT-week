// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import Header, { NAV_ITEMS } from './Header';

// Default mock for next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('components/layout/Header.tsx (Requirement 1.1, 1.2, 1.5, 27.2)', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Rendering Dasar & Navigasi (Requirement 1.1)', () => {
    it('merender logo / nama aplikasi dengan tautan ke Beranda (/)', () => {
      render(<Header />);
      const logoLink = screen.getByRole('link', { name: /cek penipuan - beranda/i });
      expect(logoLink).toBeDefined();
      expect(logoLink.getAttribute('href')).toBe('/');
    });

    it('merender tautan ke tiga halaman cek pada navigasi desktop', () => {
      render(<Header />);
      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      expect(navDesktop).toBeDefined();

      const links = within(navDesktop).getAllByRole('link');
      expect(links.length).toBe(3);

      expect(within(navDesktop).getByText('Cek Chat').getAttribute('href')).toBe('/cek-chat');
      expect(within(navDesktop).getByText('Cek Link').getAttribute('href')).toBe('/cek-link');
      expect(within(navDesktop).getByText('Cek Video & Suara').getAttribute('href')).toBe('/cek-video-suara');
    });

    it('memastikan NAV_ITEMS memuat ketiga halaman cek sesuai spesifikasi', () => {
      expect(NAV_ITEMS).toEqual([
        { label: 'Cek Chat', href: '/cek-chat', id: 'nav-cek-chat' },
        { label: 'Cek Link', href: '/cek-link', id: 'nav-cek-link' },
        { label: 'Cek Video & Suara', href: '/cek-video-suara', id: 'nav-cek-video' },
      ]);
    });
  });

  describe('Penanda Halaman Aktif (Requirement 1.2)', () => {
    it('menandai halaman aktif dengan aria-current="page" dan style berbeda saat di /cek-chat', () => {
      render(<Header currentPath="/cek-chat" />);
      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      const activeLink = within(navDesktop).getByText('Cek Chat');
      const inactiveLink = within(navDesktop).getByText('Cek Link');

      expect(activeLink.getAttribute('aria-current')).toBe('page');
      expect(activeLink.classList.contains('bg-blue-50')).toBe(true);
      expect(activeLink.classList.contains('text-blue-700')).toBe(true);

      expect(inactiveLink.getAttribute('aria-current')).toBeNull();
      expect(inactiveLink.classList.contains('text-gray-600')).toBe(true);
    });

    it('menandai halaman aktif saat di /cek-link', () => {
      render(<Header currentPath="/cek-link" />);
      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      const activeLink = within(navDesktop).getByText('Cek Link');

      expect(activeLink.getAttribute('aria-current')).toBe('page');
      expect(activeLink.classList.contains('bg-blue-50')).toBe(true);
    });

    it('menandai halaman aktif saat di /cek-video-suara', () => {
      render(<Header currentPath="/cek-video-suara" />);
      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      const activeLink = within(navDesktop).getByText('Cek Video & Suara');

      expect(activeLink.getAttribute('aria-current')).toBe('page');
      expect(activeLink.classList.contains('bg-blue-50')).toBe(true);
    });

    it('tidak ada tautan cek yang aktif jika di halaman Beranda (/)', () => {
      render(<Header currentPath="/" />);
      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      const links = within(navDesktop).getAllByRole('link');

      links.forEach((link) => {
        expect(link.getAttribute('aria-current')).toBeNull();
      });
    });
  });

  describe('Menu Mobile Hamburger (Requirement 1.1, 1.4, 27.2)', () => {
    it('secara bawaan menu mobile tidak tampil dan tombol memiliki aria-expanded="false"', () => {
      render(<Header />);
      const hamburgerButton = screen.getByRole('button', { name: /buka menu navigasi/i });
      expect(hamburgerButton.getAttribute('aria-expanded')).toBe('false');

      const mobileNav = screen.queryByRole('navigation', { name: 'Navigasi Menu Mobile' });
      expect(mobileNav).toBeNull();
    });

    it('membuka menu mobile saat tombol hamburger diklik', () => {
      render(<Header />);
      const hamburgerButton = screen.getByRole('button', { name: /buka menu navigasi/i });

      // Klik untuk membuka
      fireEvent.click(hamburgerButton);

      expect(hamburgerButton.getAttribute('aria-expanded')).toBe('true');
      expect(hamburgerButton.getAttribute('aria-label')).toBe('Tutup menu navigasi');

      const mobileNav = screen.getByRole('navigation', { name: 'Navigasi Menu Mobile' });
      expect(mobileNav).toBeDefined();

      const mobileLinks = within(mobileNav).getAllByRole('link');
      expect(mobileLinks.length).toBe(3);
    });

    it('menutup menu mobile saat tombol hamburger diklik kembali', () => {
      render(<Header />);
      const hamburgerButton = screen.getByRole('button', { name: /buka menu navigasi/i });

      // Buka
      fireEvent.click(hamburgerButton);
      expect(screen.getByRole('navigation', { name: 'Navigasi Menu Mobile' })).toBeDefined();

      // Tutup
      fireEvent.click(hamburgerButton);
      expect(hamburgerButton.getAttribute('aria-expanded')).toBe('false');
      expect(screen.queryByRole('navigation', { name: 'Navigasi Menu Mobile' })).toBeNull();
    });

    it('menutup menu mobile saat salah satu tautan di dalamnya diklik', () => {
      render(<Header />);
      const hamburgerButton = screen.getByRole('button', { name: /buka menu navigasi/i });

      // Buka menu mobile
      fireEvent.click(hamburgerButton);
      const mobileNav = screen.getByRole('navigation', { name: 'Navigasi Menu Mobile' });
      const linkCekChat = within(mobileNav).getByText('Cek Chat');

      // Klik link
      fireEvent.click(linkCekChat);

      // Menu mobile harus otomatis tertutup
      expect(screen.queryByRole('navigation', { name: 'Navigasi Menu Mobile' })).toBeNull();
      expect(hamburgerButton.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Target Sentuh & Aksesibilitas (Requirement 1.5, 27.2)', () => {
    it('memiliki target sentuh minimal 44px pada logo, tautan desktop, dan tombol hamburger', () => {
      render(<Header />);
      const logoLink = screen.getByRole('link', { name: /cek penipuan - beranda/i });
      expect(logoLink.classList.contains('min-h-[44px]')).toBe(true);

      const navDesktop = screen.getByRole('navigation', { name: 'Navigasi Utama' });
      const desktopLinks = within(navDesktop).getAllByRole('link');
      desktopLinks.forEach((link) => {
        expect(link.classList.contains('min-h-[44px]')).toBe(true);
      });

      const hamburgerButton = screen.getByRole('button', { name: /buka menu navigasi/i });
      expect(hamburgerButton.classList.contains('min-h-[44px]')).toBe(true);
      expect(hamburgerButton.classList.contains('min-w-[44px]')).toBe(true);
    });

    it('memiliki target sentuh minimal 44px pada tautan menu mobile', () => {
      render(<Header />);
      const hamburgerButton = screen.getByRole('button', { name: /buka menu navigasi/i });
      fireEvent.click(hamburgerButton);

      const mobileNav = screen.getByRole('navigation', { name: 'Navigasi Menu Mobile' });
      const mobileLinks = within(mobileNav).getAllByRole('link');
      mobileLinks.forEach((link) => {
        expect(link.classList.contains('min-h-[44px]')).toBe(true);
      });
    });
  });
});
