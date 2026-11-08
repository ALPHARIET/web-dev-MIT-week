/**
 * lib/aturan/index.ts
 *
 * Titik masuk utama untuk modul aturan dan utilitas pemindaian penipuan.
 * Mengekspor seluruh tipe data, konstanta ambang batas/bobot, dan fungsi evaluasi
 * dari scoring, chat-rules, link-rules, dan video-rules.
 *
 * Modul ini dirancang secara isomorphic (murni TypeScript tanpa dependensi runtime
 * browser seperti DOM/window atau server seperti Node fs/child_process), sehingga
 * dapat di-import dengan bersih oleh komponen frontend browser maupun route handler server.
 *
 * References: Requirements 33.1, and design.md
 */

// Scoring & utilitas umum pemindaian
export * from './scoring';

// Aturan pra-pemindaian chat
export * from './chat-rules';

// Aturan analisis leksikal URL & link
export * from './link-rules';

// Aturan skor & wizard video/suara
export * from './video-rules';
