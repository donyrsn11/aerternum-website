// GET /api/session — siapa yang sedang login
import { penggunaSaatIni } from '../lib/auth.js';
import { daftarPengguna } from '../lib/penyimpanan.js';

export default async function handler(req, res) {
  try {
    const pengguna = await penggunaSaatIni(req, daftarPengguna);
    if (!pengguna) return res.status(401).json({ error: 'Belum login' });
    return res.status(200).json({ pengguna });
  } catch (e) {
    console.error('session gagal:', e);
    return res.status(500).json({ error: 'Terjadi gangguan pada server.' });
  }
}
