// GET /api/health — pemeriksaan konfigurasi server.
//
// Dibuat untuk menjawab satu pertanyaan: kalau login gagal, bagian mana yang
// belum beres? Halaman ini SENGAJA tidak menampilkan nilai apa pun — tidak
// password, tidak token, tidak panjang karakternya. Hanya "sudah" atau
// "belum", supaya aman dibuka siapa pun yang kebetulan menemukannya.

import { list } from '@vercel/blob';
import { sesiSiap } from '../lib/auth.js';

const PANJANG_ADMIN_PASSWORD = 12;

export default async function handler(req, res) {
  const env = process.env;
  const ada = n => typeof env[n] === 'string' && env[n].length > 0;
  const cukup = (n, min) => ada(n) && env[n].length >= min;

  const periksa = {
    ADMIN_EMAIL: ada('ADMIN_EMAIL') ? 'sudah diisi' : 'BELUM ADA',
    ADMIN_PASSWORD: !ada('ADMIN_PASSWORD')
      ? 'BELUM ADA'
      : cukup('ADMIN_PASSWORD', PANJANG_ADMIN_PASSWORD)
        ? 'sudah diisi'
        : `TERLALU PENDEK (minimal ${PANJANG_ADMIN_PASSWORD} karakter)`,
    BLOB_READ_WRITE_TOKEN: ada('BLOB_READ_WRITE_TOKEN') ? 'sudah diisi' : 'BELUM ADA',
  };

  // Penandatanganan sesi tidak lagi menuntut SESSION_SECRET sepanjang tertentu:
  // kuncinya diturunkan dari bahan rahasia yang tersedia.
  const sesi = !sesiSiap()
    ? 'BELUM SIAP (isi SESSION_SECRET, atau sambungkan penyimpanan Blob)'
    : ada('SESSION_SECRET')
      ? 'siap (memakai SESSION_SECRET)'
      : 'siap (diturunkan dari token penyimpanan)';

  // Uji sambungan ke penyimpanan, sekaligus melihat apakah akun sudah terbentuk.
  let penyimpanan = 'tidak diuji';
  let akunSudahDibuat = null;
  try {
    const { blobs } = await list({ prefix: 'system/', limit: 10 });
    penyimpanan = 'tersambung';
    akunSudahDibuat = blobs.some(b => b.pathname === 'system/users.json');
  } catch (e) {
    penyimpanan = 'GAGAL: ' + (e && e.message ? e.message : String(e));
  }

  const semuaBeres = Object.values(periksa).every(v => v === 'sudah diisi')
    && penyimpanan === 'tersambung'
    && sesi.startsWith('siap');

  const langkah = [];
  for (const [nama, hasil] of Object.entries(periksa)) {
    if (hasil !== 'sudah diisi') langkah.push(`Perbaiki variabel ${nama}: ${hasil.toLowerCase()}`);
  }
  if (penyimpanan.startsWith('GAGAL')) langkah.push('Penyimpanan Blob belum tersambung — periksa BLOB_READ_WRITE_TOKEN, lalu Redeploy');
  if (!sesi.startsWith('siap')) langkah.push('Penandatanganan sesi belum siap — isi SESSION_SECRET atau sambungkan penyimpanan Blob');
  if (!langkah.length && !akunSudahDibuat) langkah.push('Konfigurasi lengkap. Akun dibuat otomatis saat login pertama.');
  if (!langkah.length && akunSudahDibuat) langkah.push('Konfigurasi lengkap dan akun sudah ada. Login seharusnya berhasil.');

  res.setHeader('Cache-Control', 'no-store');
  return res.status(semuaBeres ? 200 : 503).json({
    siap: semuaBeres,
    variabel: periksa,
    sesi,
    penyimpanan,
    akunSudahDibuat,
    langkahBerikutnya: langkah,
    catatan: 'Halaman ini tidak menampilkan nilai variabel apa pun.',
  });
}
