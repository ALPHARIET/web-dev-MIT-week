// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractFramesFromVideo,
  isSupportedVideoFormat,
  isSupportedAudioFormat,
  SUPPORTED_VIDEO_EXTENSIONS,
  SUPPORTED_AUDIO_EXTENSIONS,
} from './video-frame-extractor';

describe('lib/video-frame-extractor.ts — Ekstraksi Frame Video di Browser (Requirement VS-06)', () => {
  describe('1. Validasi Format Ekstensi File Video & Audio', () => {
    it('mengenali ekstensi file video yang didukung', () => {
      for (const ext of SUPPORTED_VIDEO_EXTENSIONS) {
        expect(isSupportedVideoFormat(`video_rekaman.${ext}`)).toBe(true);
      }
      expect(isSupportedVideoFormat('video/mp4')).toBe(true);
      expect(isSupportedVideoFormat('video/webm')).toBe(true);
    });

    it('menolak format bukan video', () => {
      expect(isSupportedVideoFormat('foto.jpg')).toBe(false);
      expect(isSupportedVideoFormat('dokumen.pdf')).toBe(false);
      expect(isSupportedVideoFormat('')).toBe(false);
    });

    it('mengenali ekstensi file audio yang didukung', () => {
      for (const ext of SUPPORTED_AUDIO_EXTENSIONS) {
        expect(isSupportedAudioFormat(`voicenote.${ext}`)).toBe(true);
      }
      expect(isSupportedAudioFormat('audio/mp3')).toBe(true);
      expect(isSupportedAudioFormat('audio/wav')).toBe(true);
    });

    it('menolak format bukan audio', () => {
      expect(isSupportedAudioFormat('file.exe')).toBe(false);
      expect(isSupportedAudioFormat('animasi.gif')).toBe(false);
      expect(isSupportedAudioFormat('')).toBe(false);
    });
  });

  describe('2. Ekstraksi Frame Menggunakan Mock Canvas & Video Element', () => {
    beforeEach(() => {
      if (typeof window !== 'undefined') {
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-video-url');
        window.URL.revokeObjectURL = vi.fn();
      }
    });

    const createMockVideo = (duration = 12, width = 640, height = 360) => {
      const el: any = {
        duration,
        videoWidth: width,
        videoHeight: height,
        style: {},
        muted: true,
        playsInline: true,
        preload: 'auto',
        _currentTime: 0,
        get currentTime() {
          return this._currentTime;
        },
        set currentTime(val: number) {
          this._currentTime = val;
          setTimeout(() => {
            if (this.onseeked) this.onseeked();
          }, 5);
        },
        set src(url: string) {
          setTimeout(() => {
            if (this.onloadedmetadata) this.onloadedmetadata();
          }, 5);
        },
        remove: vi.fn(),
      };
      return el;
    };

    const createMockCanvas = () => {
      const el: any = {
        width: 0,
        height: 0,
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mock-extracted-frame-jpeg'),
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
        }),
      };
      return el;
    };

    it('mengekstrak 3 frame secara default dalam bentuk base64 JPEG', async () => {
      const mockFile = new File(['dummy-video-data'], 'test-video.mp4', {
        type: 'video/mp4',
      });

      const originalCreateElement = document.createElement.bind(document);

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'video') {
          return createMockVideo(12, 640, 360);
        }
        if (tagName.toLowerCase() === 'canvas') {
          return createMockCanvas();
        }
        return originalCreateElement(tagName);
      });

      const res = await extractFramesFromVideo(mockFile, { jumlahFrame: 3 });

      expect(res.frames).toHaveLength(3);
      expect(res.frames[0]).toContain('data:image/jpeg;base64,mock-extracted-frame-jpeg');
      expect(res.durasiDetik).toBe(12);
      expect(res.lebar).toBe(640);
      expect(res.tinggi).toBe(360);
    });

    it('membatasi jumlah frame dalam rentang minimal 3 dan maksimal 12', async () => {
      const mockFile = new File(['dummy-video-data'], 'test-video.mp4', {
        type: 'video/mp4',
      });

      const originalCreateElement = document.createElement.bind(document);

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'video') {
          return createMockVideo(20, 800, 600);
        }
        if (tagName.toLowerCase() === 'canvas') {
          return createMockCanvas();
        }
        return originalCreateElement(tagName);
      });

      const resMax = await extractFramesFromVideo(mockFile, { jumlahFrame: 20 });
      expect(resMax.frames.length).toBe(12);

      const resMin = await extractFramesFromVideo(mockFile, { jumlahFrame: 1 });
      expect(resMin.frames.length).toBe(3);
    });
  });
});
