// /api/users — modul Pengguna. Hanya untuk akun yang berhak mengelola.
//
//   GET                      daftar pengguna (tanpa hash)
//   POST   {aksi:'tambah'}   tambah pengguna, server yang membuatkan password
//   POST   {aksi:'ubah'}     ubah nama, jabatan, dan hak kelola
//   POST   {aksi:'reset'}    buat password baru untuk satu pengguna
//   POST   {aksi:'hapus'}    hapus pengguna
//
// Password acak hanya dikembalikan SEKALI, pada respons aksi yang membuatnya.
// Setelah itu tidak tersimpan di mana pun selain sebagai hash.

import { penggunaSaatIni, passwordAcak, badan } from '../lib/auth.js';
import { daftarPengguna, tambahPengguna, hapusPengguna, ubahPassword, ubahProfil } from '../lib/penyimpanan.js';

export default async function handler(req, res) {
  try {
    const saya = await penggunaSaatIni(req, daftarPengguna);
    if (!saya) return res.status(401).json({ error: 'Belum login' });
    if (!saya.kelolaPengguna) return res.status(403).json({ error: 'Tidak berwenang' });

    if (req.method === 'GET') {
      const users = (await daftarPengguna()).map(({ hash, ...u }) => u);
      return res.status(200).json({ users });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung' });

    const { aksi, email, nama, jabatan, kelolaPengguna } = badan(req);

    if (aksi === 'tambah') {
      if (!email || !nama) return res.status(400).json({ error: 'Nama dan email wajib diisi' });
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email).trim())) {
        return res.status(400).json({ error: 'Format email tidak valid' });
      }
      const password = passwordAcak();
      await tambahPengguna({ email, nama, jabatan, kelolaPengguna, password, oleh: saya.email });
      return res.status(200).json({ ok: true, email: String(email).trim().toLowerCase(), password });
    }

    if (aksi === 'ubah') {
      if (!email || !nama) return res.status(400).json({ error: 'Nama dan email wajib diisi' });
      await ubahProfil({ email, nama, jabatan, kelolaPengguna });
      return res.status(200).json({ ok: true, email: String(email).trim().toLowerCase() });
    }

    if (aksi === 'reset') {
      if (!email) return res.status(400).json({ error: 'Email wajib diisi' });
      const password = passwordAcak();
      await ubahPassword(email, password);
      return res.status(200).json({ ok: true, email, password });
    }

    if (aksi === 'hapus') {
      if (!email) return res.status(400).json({ error: 'Email wajib diisi' });
      if (String(email).trim().toLowerCase() === saya.email) {
        return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
      }
      await hapusPengguna(email);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('users gagal:', e);
    return res.status(500).json({ error: 'Terjadi gangguan pada server.' });
  }
}
