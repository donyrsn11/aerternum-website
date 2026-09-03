// Akses ke Vercel Blob: daftar pengguna dan dokumen LKPM.
//
// Semua blob memakai access:'private' — hanya bisa dibaca dengan token
// BLOB_READ_WRITE_TOKEN yang tersimpan di server Vercel dan tidak pernah
// sampai ke browser. Tidak ada URL publik yang bisa dibagikan keluar.

import { put, get, list, del } from '@vercel/blob';
import { hashPassword } from './auth.js';

const BERKAS_PENGGUNA = 'system/users.json';

// ---------- pengguna ----------

async function bacaJson(pathname) {
  try {
    const { stream } = await get(pathname, { access: 'private' });
    const potongan = [];
    for await (const p of stream) potongan.push(p);
    return JSON.parse(Buffer.concat(potongan).toString());
  } catch (e) {
    return null; // belum ada
  }
}

// Akun pertama dibuat dari variabel lingkungan, sekali saja, saat daftar
// pengguna masih kosong. Setelah itu daftar dikelola lewat modul Pengguna.
//
// ADMIN_PASSWORD diisi sendiri oleh pemilik akun di dashboard Vercel, dan
// langsung diubah jadi hash di sini. Password aslinya tidak pernah disimpan,
// tidak pernah dikirim ke browser, dan tidak pernah melewati siapa pun selain
// pemiliknya. Setelah login pertama berhasil, variabel itu boleh dihapus dari
// Vercel — daftar pengguna sudah berdiri sendiri di penyimpanan.
function akunAwal() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 12) return null;
  return {
    email,
    nama: process.env.ADMIN_NAME || 'Dony Renato',
    jabatan: process.env.ADMIN_ROLE || 'Partner',
    kelolaPengguna: true,   // penanda internal; tidak pernah ditampilkan
    hash: hashPassword(password),
    dibuatPada: new Date().toISOString(),
    dibuatOleh: 'sistem',
  };
}

export async function daftarPengguna() {
  const isi = await bacaJson(BERKAS_PENGGUNA);
  if (isi && Array.isArray(isi.users) && isi.users.length) return isi.users;
  const awal = akunAwal();
  if (!awal) return [];
  await simpanPengguna([awal]);
  return [awal];
}

export async function simpanPengguna(users) {
  await put(BERKAS_PENGGUNA, JSON.stringify({ users }, null, 2), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

export async function tambahPengguna({ email, nama, jabatan, kelolaPengguna, password, oleh }) {
  const users = await daftarPengguna();
  const bersih = String(email).trim().toLowerCase();
  if (users.some(u => u.email === bersih)) {
    const e = new Error('Email tersebut sudah terdaftar');
    e.status = 409;
    throw e;
  }
  users.push({
    email: bersih,
    nama: String(nama).trim(),
    jabatan: String(jabatan || '').trim(),
    kelolaPengguna: !!kelolaPengguna,
    hash: hashPassword(password),
    dibuatPada: new Date().toISOString(),
    dibuatOleh: oleh,
  });
  await simpanPengguna(users);
}

export async function hapusPengguna(email) {
  const users = await daftarPengguna();
  const sisa = users.filter(u => u.email !== String(email).trim().toLowerCase());
  // jangan sampai tidak ada lagi yang bisa mengelola pengguna
  if (!sisa.some(u => u.kelolaPengguna)) {
    const e = new Error('Tidak bisa menghapus pengelola pengguna yang terakhir');
    e.status = 400;
    throw e;
  }
  await simpanPengguna(sisa);
}

export async function ubahPassword(email, password) {
  const users = await daftarPengguna();
  const u = users.find(x => x.email === String(email).trim().toLowerCase());
  if (!u) { const e = new Error('Pengguna tidak ditemukan'); e.status = 404; throw e; }
  u.hash = hashPassword(password);
  await simpanPengguna(users);
}

// ---------- dokumen LKPM ----------

export function slug(teks) {
  return String(teks).toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function jalurDokumen(tahun, kuartal, klien, namaBerkas) {
  const aman = String(namaBerkas).replace(/[^\w.\- ]+/g, '_').slice(-120);
  return `lkpm/${Number(tahun)}/${String(kuartal).toUpperCase()}/${slug(klien)}/${Date.now()}-${aman}`;
}

export async function dokumenLkpm(tahun) {
  const { blobs } = await list({ prefix: `lkpm/${Number(tahun)}/`, limit: 1000 });
  return blobs.map(b => {
    const bagian = b.pathname.split('/');           // lkpm/tahun/kuartal/klien/berkas
    const berkas = bagian.slice(4).join('/');
    return {
      pathname: b.pathname,
      kuartal: bagian[2] || '',
      klien: bagian[3] || '',
      nama: berkas.replace(/^\d{10,}-/, ''),
      ukuran: b.size,
      diunggahPada: b.uploadedAt,
    };
  });
}

export async function hapusDokumen(pathname) {
  await del(pathname);
}

export async function unduhDokumen(pathname) {
  return get(pathname, { access: 'private' });
}
