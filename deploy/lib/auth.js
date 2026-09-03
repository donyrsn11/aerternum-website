// Login, sesi, dan hash password untuk Internal System.
//
// Semua pemeriksaan di berkas ini berjalan DI SERVER. Tidak ada password,
// hash, maupun daftar pengguna yang pernah dikirim ke browser.
//
// Tidak memakai pustaka luar — hanya modul crypto bawaan Node.

import crypto from 'node:crypto';

const COOKIE = 'alp_session';
const MASA_BERLAKU_JAM = 12;

// ---------- password ----------

// Format tersimpan: scrypt$<salt hex>$<hash hex>
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [skema, saltHex, hashHex] = String(stored).split('$');
    if (skema !== 'scrypt' || !saltHex || !hashHex) return false;
    const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
    const tersimpan = Buffer.from(hashHex, 'hex');
    // panjang harus sama sebelum timingSafeEqual, kalau tidak ia melempar
    if (hash.length !== tersimpan.length) return false;
    return crypto.timingSafeEqual(hash, tersimpan);
  } catch (e) {
    return false;
  }
}

// Password acak yang mudah dibacakan lewat telepon (tanpa huruf/angka rancu).
export function passwordAcak(panjang = 14) {
  const abjad = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (const b of crypto.randomBytes(panjang)) out += abjad[b % abjad.length];
  return out;
}

// ---------- sesi ----------

function rahasia() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET belum diatur, atau kurang dari 32 karakter');
  }
  return s;
}

function tandaTangan(data) {
  return crypto.createHmac('sha256', rahasia()).update(data).digest('base64url');
}

export function buatSesi(email) {
  const isi = Buffer.from(JSON.stringify({
    email,
    exp: Date.now() + MASA_BERLAKU_JAM * 3600 * 1000,
  })).toString('base64url');
  return `${isi}.${tandaTangan(isi)}`;
}

export function bacaSesi(token) {
  if (!token || typeof token !== 'string') return null;
  const [isi, sig] = token.split('.');
  if (!isi || !sig) return null;
  // bandingkan tanda tangan secara timing-safe
  const harusnya = tandaTangan(isi);
  const a = Buffer.from(sig), b = Buffer.from(harusnya);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(isi, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function cookieSesi(token) {
  const umur = MASA_BERLAKU_JAM * 3600;
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${umur}`;
}

export function cookieKosong() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function ambilCookie(req, nama) {
  const raw = req.headers?.cookie || '';
  for (const bagian of raw.split(';')) {
    const [k, ...v] = bagian.trim().split('=');
    if (k === nama) return v.join('=');
  }
  return null;
}

// Kembalikan data pengguna yang sedang login, atau null.
export async function penggunaSaatIni(req, daftarPengguna) {
  const sesi = bacaSesi(ambilCookie(req, COOKIE));
  if (!sesi) return null;
  const pengguna = (await daftarPengguna()).find(u => u.email === sesi.email);
  if (!pengguna) return null;           // akun sudah dihapus -> sesi mati
  const { hash, ...aman } = pengguna;   // hash tidak pernah keluar dari server
  return aman;
}

// req.body pada fungsi Vercel bisa berupa objek yang sudah terurai, teks JSON,
// atau tidak ada sama sekali. Satu pintu supaya penanganannya seragam.
export function badan(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b); } catch (e) { return {}; } }
  if (Buffer.isBuffer(b)) { try { return JSON.parse(b.toString()); } catch (e) { return {}; } }
  return b;
}
