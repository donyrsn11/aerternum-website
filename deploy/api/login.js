// POST /api/login  { email, password }
import { verifyPassword, buatSesi, cookieSesi, badan } from '../lib/auth.js';
import { daftarPengguna } from '../lib/penyimpanan.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung' });
  try {
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
    return res.status(500).json({ error: 'Terjadi gangguan pada server.' });
  }
}
