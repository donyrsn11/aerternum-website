// /api/documents — dokumen LKPM per klien per kuartal. Wajib login.
//
//   GET  ?tahun=2026                      daftar dokumen tahun tsb
//   GET  ?unduh=<pathname>                unduh satu dokumen
//   POST ?tahun=&kuartal=&klien=&nama=    unggah (badan permintaan = isi berkas)
//   POST {aksi:'hapus', pathname}         hapus satu dokumen

import { penggunaSaatIni } from '../lib/auth.js';
import {
  daftarPengguna, dokumenLkpm, jalurDokumen, unduhDokumen, hapusDokumen,
} from '../lib/penyimpanan.js';
import { put } from '@vercel/blob';

const BATAS_UKURAN = 20 * 1024 * 1024; // 20 MB per berkas

// Runtime Node milik Vercel sudah membaca badan permintaan lebih dulu untuk
// sebagian tipe konten, sehingga req.body bisa saja berisi Buffer atau teks
// dan alirannya sudah habis terbaca. Karena itu req.body dipakai kalau ada,
// dan aliran mentah hanya dibaca kalau memang belum terbaca. (Catatan: opsi
// config.api.bodyParser hanya berlaku di Next.js, tidak di fungsi Vercel biasa.)
async function bacaBody(req) {
  const b = req.body;
  if (Buffer.isBuffer(b)) return b;
  if (typeof b === 'string') return Buffer.from(b);
  if (b && typeof b === 'object' && !Array.isArray(b) && Object.keys(b).length) {
    return Buffer.from(JSON.stringify(b));
  }
  return new Promise((resolve, reject) => {
    const potongan = [];
    let total = 0;
    req.on('data', p => {
      total += p.length;
      if (total > BATAS_UKURAN) {
        reject(Object.assign(new Error('Berkas melebihi 20 MB'), { status: 413 }));
        req.destroy();
        return;
      }
      potongan.push(p);
    });
    req.on('end', () => resolve(Buffer.concat(potongan)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  try {
    const pengguna = await penggunaSaatIni(req, daftarPengguna);
    if (!pengguna) return res.status(401).json({ error: 'Belum login' });

    const url = new URL(req.url, 'http://x');
    const q = url.searchParams;

    if (req.method === 'GET') {
      const unduh = q.get('unduh');
      if (unduh) {
        // hanya berkas di bawah lkpm/ yang boleh diambil lewat jalur ini
        if (!/^lkpm\/\d{4}\/Q[1-4]\//.test(unduh)) {
          return res.status(400).json({ error: 'Jalur berkas tidak valid' });
        }
        const { stream, headers } = await unduhDokumen(unduh);
        const nama = unduh.split('/').pop().replace(/^\d{10,}-/, '');
        res.setHeader('Content-Type', headers?.get?.('content-type') || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${nama.replace(/"/g, '')}"`);
        res.setHeader('Cache-Control', 'private, no-store');
        for await (const p of stream) res.write(p);
        return res.end();
      }
      const tahun = Number(q.get('tahun')) || new Date().getFullYear();
      return res.status(200).json({ dokumen: await dokumenLkpm(tahun) });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak didukung' });

    if (q.get('aksi') === 'hapus') {
      const pathname = q.get('pathname') || '';
      if (!/^lkpm\/\d{4}\/Q[1-4]\//.test(pathname)) {
        return res.status(400).json({ error: 'Jalur berkas tidak valid' });
      }
      await hapusDokumen(pathname);
      return res.status(200).json({ ok: true });
    }

    const tahun = Number(q.get('tahun'));
    const kuartal = String(q.get('kuartal') || '').toUpperCase();
    const klien = q.get('klien') || '';
    const nama = q.get('nama') || 'dokumen';
    if (!tahun || !/^Q[1-4]$/.test(kuartal) || !klien) {
      return res.status(400).json({ error: 'Tahun, kuartal, dan klien wajib diisi' });
    }

    const isi = await bacaBody(req);
    if (!isi.length) return res.status(400).json({ error: 'Berkas kosong' });
    if (isi.length > BATAS_UKURAN) return res.status(413).json({ error: 'Berkas melebihi 20 MB' });

    const pathname = jalurDokumen(tahun, kuartal, klien, nama);
    await put(pathname, isi, {
      access: 'private',
      contentType: req.headers['content-type'] || 'application/octet-stream',
      addRandomSuffix: false,
    });
    return res.status(200).json({ ok: true, pathname, oleh: pengguna.email });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('documents gagal:', e);
    return res.status(500).json({ error: 'Terjadi gangguan pada server.' });
  }
}
