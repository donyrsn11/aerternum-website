// POST /api/password  { lama, baru }
//
// Ganti password sendiri. Berbeda dengan /api/users, jalur ini terbuka untuk
// SEMUA pengguna yang sudah login — bukan hanya yang berhak mengelola — sebab
// setiap orang berhak mengganti passwordnya sendiri. Yang bisa diubah hanya
// password milik akun yang sedang masuk; email diambil dari cookie sesi,
// tidak pernah dari badan permintaan.

import { penggunaSaatIni, verifyPassword, badan } from '../lib/auth.js';
import { daftarPengguna, ubahPassword } from '../lib/penyimpanan.js';

const PANJANG_MINIMAL = 12;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung' });
  try {
    const saya = await penggunaSaatIni(req, daftarPengguna);
    if (!saya) return res.status(401).json({ error: 'Belum login' });

    const { lama = '', baru = '' } = badan(req);

    const akun = (await daftarPengguna()).find(u => u.email === saya.email);
    if (!akun) return res.status(401).json({ error: 'Belum login' });

    if (!verifyPassword(String(lama), akun.hash)) {
      return res.status(401).json({ error: 'Password lama salah.' });
    }
    if (String(baru).length < PANJANG_MINIMAL) {
      return res.status(400).json({ error: 'Password baru minimal ' + PANJANG_MINIMAL + ' karakter.' });
    }
    if (String(baru) === String(lama)) {
      return res.status(400).json({ error: 'Password baru harus berbeda dari yang lama.' });
    }

    await ubahPassword(saya.email, String(baru));
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('ganti password gagal:', e);
    return res.status(500).json({ error: 'Terjadi gangguan pada server.' });
  }
}
