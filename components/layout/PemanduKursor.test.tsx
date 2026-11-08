// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { PemanduKursor } from './PemanduKursor';
import { cariPesan, salamWaktu } from '@/lib/pemandu-kursor';

const pesan = () => screen.getByTestId('pemandu-pesan').textContent ?? '';

describe('PemanduKursor', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('menyapa saat landing page baru dibuka', () => {
    render(<PemanduKursor pathname="/" />);
    expect(screen.getByTestId('pemandu-judul').textContent).toBe('Halo!');
    expect(pesan()).toContain('selamat datang');
  });

  it('isinya berganti mengikuti elemen yang ditunjuk kursor', () => {
    render(
      <>
        <PemanduKursor pathname="/" />
        <a href="/cek-chat">Cek Chat</a>
        <a href="/cek-link">Cek Link</a>
      </>
    );
    fireEvent.pointerOver(screen.getByText('Cek Chat'));
    expect(screen.getByTestId('pemandu-judul').textContent).toBe('Cek Chat');
    fireEvent.pointerOver(screen.getByText('Cek Link'));
    expect(screen.getByTestId('pemandu-judul').textContent).toBe('Cek Link');
  });

  it('mengetik pesan per huruf dan mulai lagi saat kursor pindah', () => {
    vi.useFakeTimers();
    render(
      <>
        <PemanduKursor pathname="/" />
        <a href="/cek-link">Cek Link</a>
      </>
    );
    const ketikan = () => screen.getByTestId('pemandu-ketikan').textContent ?? '';

    fireEvent.pointerOver(screen.getByText('Cek Link'));
    expect(ketikan()).toBe('');

    act(() => {
      vi.advanceTimersByTime(18 * 5);
    });
    expect(ketikan()).toBe(pesan().slice(0, 5));
    expect(screen.getByTestId('pemandu-caret')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(18 * pesan().length);
    });
    expect(ketikan()).toBe(pesan());
    expect(screen.queryByTestId('pemandu-caret')).toBeNull();
  });

  it('juga mengikuti fokus keyboard', () => {
    render(
      <>
        <PemanduKursor pathname="/cek-link" />
        <input data-testid="input-link" />
      </>
    );
    fireEvent.focusIn(screen.getByTestId('input-link'));
    expect(screen.getByTestId('pemandu-judul').textContent).toBe('Kolom link');
  });

  it('kembali ke pesan bawaan saat kursor pindah ke area tanpa saran, tanpa mengulang sapaan', () => {
    vi.useFakeTimers();
    render(
      <>
        <PemanduKursor pathname="/" />
        <a href="/cek-chat">Cek Chat</a>
        <div data-testid="kosong" />
      </>
    );
    fireEvent.pointerOver(screen.getByText('Cek Chat'));
    fireEvent.pointerOver(screen.getByTestId('kosong'));
    expect(screen.getByTestId('pemandu-judul').textContent).toBe('Cek Chat');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByTestId('pemandu-judul').textContent).toBe('Pemandu');
  });

  it('di halaman cek, pesan bawaan berganti saat hasil muncul', async () => {
    render(<PemanduKursor pathname="/cek-link" />);
    expect(pesan()).toContain('Tempel alamat link');

    const hasil = document.createElement('div');
    hasil.setAttribute('data-testid', 'komponen-hasil');
    await act(async () => {
      document.body.appendChild(hasil);
      await Promise.resolve();
    });
    expect(pesan()).toContain('Hasilnya sudah keluar');
    hasil.remove();
  });
});

describe('lib/pemandu-kursor', () => {
  it('memakai aturan dari induk terdekat', () => {
    const luar = document.createElement('a');
    luar.setAttribute('href', '/cek-chat');
    const dalam = document.createElement('span');
    luar.appendChild(dalam);
    document.body.appendChild(luar);
    expect(cariPesan(dalam)?.judul).toBe('Cek Chat');
    luar.remove();
  });

  it('mengembalikan null untuk elemen tanpa aturan', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(cariPesan(el)).toBeNull();
    el.remove();
  });

  it('menentukan salam dari jam', () => {
    expect(salamWaktu(8)).toBe('Selamat pagi');
    expect(salamWaktu(12)).toBe('Selamat siang');
    expect(salamWaktu(16)).toBe('Selamat sore');
    expect(salamWaktu(21)).toBe('Selamat malam');
    expect(salamWaktu(2)).toBe('Selamat malam');
  });
});
