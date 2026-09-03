// POST /api/login  { email, password }
import { verifyPassword, buatSesi, cookieSesi, badan, sesiSiap } from '../lib/auth.js';
import { daftarPengguna } from '../lib/penyimpanan.js';

// Pesan yang menuntun ke halaman pemeriksaan, dipakai untuk kegagalan yang
// disebabkan konfigurasi server — bukan karena pengguna salah ketik.
const PESAN_KONFIGURASI = 'Konfigurasi server belum lengkap. Buka /api/health untuk melihat bagian mana yang belum siap.';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung' });
  try {
    // Diperiksa lebih dulu supaya kekurangan konfigurasi tidak muncul sebagai
    // "gangguan pada server" yang tidak menjelaskan apa-apa.
    if (!sesiSiap()) {
      return res.status(503).json({ error: PESAN_KONFIGURASI });
    }

    const { email = '', password = '' } = badan(req);
    const bersih = String(email).trim().toLowerCase();
    const pengguna = (await daftarPengguna()).find(u => u.email === bersih);

    // Pesan yang sama untuk email salah maupun password salah, supaya tidak
    // bisa dipakai menebak email mana yang terdaftar.
    if (!pengguna || !verifyPassword(String(password), pengguna.hash)) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    res.setHeader('Set-Cookie', cookieSesi(buatSesi(pengguna.email)));
    const { hash, ...aman } = pengguna;
    return res.status(200).json({ pengguna: aman });
  } catch (e) {
    console.error('login gagal:', e);
    // Kegagalan menulis ke penyimpanan hampir selalu berarti token Blob belum
    // sampai ke deployment ini — arahkan ke halaman pemeriksaan, jangan
    // biarkan pengguna menebak.
    const pesan = String((e && e.message) || '');
    if (/blob|token|credential|store/i.test(pesan)) {
      return res.status(503).json({ error: PESAN_KONFIGURASI });
    }
    return res.status(500).json({ error: 'Terjadi gangguan pada server.' });
  }
}
