# CLAUDE.md — aerternum-website

Panduan permanen untuk Claude Code di repositori ini. Baca sebelum mengubah apa pun.

## Konteks proyek

Website **Aerternum Legal Partnership**, kantor hukum korporat/komersial di
Jakarta. Tayang di https://aerternumlegal.vercel.app melalui Vercel.

Pembacanya: UKM lokal dan investor asing yang mencari penasihat hukum di
Indonesia. Isinya profil firma, bidang praktik, profil lawyer, daftar klien,
artikel hukum, lowongan, dan formulir kontak.

**Situs ini punya 7 halaman**, semuanya dilayani oleh satu file
`deploy/index.html` (aplikasi satu halaman / SPA — perpindahan halaman
dikerjakan JavaScript, bukan oleh file HTML terpisah):

| Halaman | Alamat |
|---|---|
| Home | `/` |
| Practice Areas | `/practice-areas` |
| Our Team | `/our-team` |
| Clients | `/clients` |
| Insights | `/insights` |
| Careers | `/careers` |
| Contact | `/contact` |

Ada satu halaman lagi di luar SPA: `deploy/internal.html` (`/internal`) —
portal internal dengan halaman login sendiri.

**Bahasa konten: dwibahasa Inggris + Indonesia, dengan Inggris sebagai
default** (`state = { lang: 'en', ... }`). Pengunjung bisa menekan tombol
EN/ID. Konsekuensinya ada di bagian Konvensi kode — setiap perubahan teks
harus dikerjakan di dua tempat.

Pemilik proyek bukan programmer. Jadi setiap perubahan harus **dijelaskan
dampaknya dalam bahasa Indonesia yang sederhana** sebelum di-push — halaman mana
yang berubah, apa yang terlihat berbeda oleh pengunjung, dan apa yang bisa rusak.

## Aturan mutlak

Sembilan aturan ini tidak boleh dilanggar. Kalau sebuah permintaan bertentangan
dengan salah satunya, hentikan dan tanyakan dulu.

1. **Jangan pernah memformat ulang, merapikan, atau menjalankan
   "beautify"/"prettier"/"format document" pada `index.html` dan `404.html`.**
   Baris 3 di kedua file itu adalah satu baris sepanjang **297.891 karakter**
   berisi 23 gambar WebP yang di-encode base64 (foto lawyer dan seluruh logo
   klien). Memecah baris itu akan merusak semua gambar tersebut. Edit hanya
   baris yang memang perlu diubah; jangan pernah menyentuh baris 3.

2. **Bedakan file sumber dan file hasil build:**
   - **Sumber — boleh diedit:** `deploy/index.html`, `deploy/internal.html`,
     `deploy/sitemap.xml`, `deploy/robots.txt`. Isinya terbaca manusia:
     HTML ber-indentasi, CSS dengan nama kelas bermakna, komentar, dan objek
     konten bernama jelas.
   - **Hasil build — JANGAN diedit:** `deploy/support.js`. Baris pertamanya
     menyatakan sendiri: `// GENERATED from dc-runtime/src/*.ts — do not edit.`
     Source aslinya (`dc-runtime/`) **tidak ada di repositori ini**, jadi file
     ini tidak bisa diregenerasi dari sini. Perlakukan sebagai kotak hitam.
   - **Komponen pihak ketiga — jangan diedit, jangan dihapus:**
     `deploy/image-slot.js`. File ini **terpakai**, dipanggil lewat
     `<x-import from="./image-slot.js">` di `index.html` baris 287 (foto tim),
     327 (logo klien), dan 600 (foto tim di modal). Menghapusnya akan
     mengosongkan seluruh foto lawyer dan logo klien.

3. **`index.html` dan `404.html` adalah dua file yang isinya identik persis.**
   Kalau salah satu diedit, yang lain harus disalin agar tetap sama. Saat ini
   `404.html` tidak pernah tampil (tertelan rewrite tangkap-semua di
   `vercel.json`), tapi jangan biarkan keduanya berbeda diam-diam. Kalau ingin
   `404.html` dihapus supaya tidak jadi jebakan, tanyakan dulu.

4. **Jangan mengubah teks legal tanpa diminta eksplisit.** Nama perusahaan,
   alamat, nomor izin, syarat dan ketentuan, kebijakan privasi, disclaimer,
   dan seluruh isi artikel di `INSIGHTS` — semua ini punya konsekuensi hukum.
   Ubah hanya kalau diminta kata per kata, dan tunjukkan teks lama dan barunya
   berdampingan sebelum commit.

5. **Satu permintaan, satu commit.** Pesan commit dalam bahasa Indonesia,
   jelaskan *apa yang berubah bagi pengunjung*, bukan nama file yang disentuh.
   Contoh baik: "Perbarui nomor telepon di halaman kontak".

6. **Jangan menambah framework, library, atau dependensi baru tanpa bertanya.**
   Repositori ini tidak punya `package.json` dan tidak punya proses build.
   Menambah salah satunya mengubah cara Vercel men-deploy situs dan berisiko
   mematikan situs. Situs ini sederhana dan harus tetap sederhana.

7. **Jangan commit rahasia.** API key, token, password, isi `.env` — tidak
   pernah masuk repo.
   ⚠️ **Sudah ada pelanggaran yang belum diperbaiki:** `deploy/internal.html`
   baris 214 memuat email dan password dalam teks biasa
   (`ACCOUNTS = [{ email:'dony.renato@...', pass:'...' }]`), dan baris 45
   mencetaknya di layar login sebagai teks "Demo: ...". Halaman ini publik —
   siapa pun bisa membacanya lewat "View Source". Ini portal demo, tapi
   password tersebut harus dianggap bocor dan tidak boleh dipakai di tempat
   lain. Ingatkan pemilik proyek kalau menyentuh file ini.

8. **Jangan menyentuh konfigurasi deploy tanpa diminta.** `deploy/vercel.json`,
   pengaturan **Root Directory** di dashboard Vercel, domain, dan environment
   variable. Situs ini hanya tayang karena Root Directory di Vercel diset ke
   `deploy` — salah satu huruf di sini bisa membuat situs mati total.

9. **Kalau ragu, tanya.** Menebak lalu push ke production lebih mahal daripada
   bertanya satu kalimat.

## Stack

**Situs statis, tanpa build.** Diverifikasi lewat audit repositori:

- **Tidak ada `package.json`**, tidak ada `node_modules`, tidak ada
  `tsconfig`/`*.config.js`, tidak ada `Dockerfile`, tidak ada GitHub Actions.
  Satu-satunya file konfigurasi di seluruh repo adalah `deploy/vercel.json`.
- Vercel tidak menjalankan Node sama sekali — tidak ada versi Node yang relevan.

Yang dipakai situs **saat berjalan di browser pengunjung** (bukan saat deploy):

- **React 18.3.1 + ReactDOM**, dimuat dari `unpkg.com` saat halaman dibuka,
  dikunci dengan hash SRI (`support.js` baris 1568–1571).
- **Babel Standalone 7.29** dari `unpkg.com` (`support.js` baris 1048), untuk
  menerjemahkan kode di browser.
- **Format template khusus** dari sebuah *AI website builder*: tag `<x-dc>`,
  `<sc-if>`, `<sc-for>`, `<x-import>`, dan penulisan `{{ ... }}`. Yang
  menjalankan format ini adalah `deploy/support.js`.
- **Google Fonts**: IBM Plex Sans + Source Serif 4.

Artinya: **build-nya terjadi di browser pengunjung, bukan di Vercel.**
Konsekuensi yang perlu diketahui: kalau `unpkg.com` sedang mati, situs
menampilkan halaman kosong. Ini bawaan arsitektur, bukan bug.

Di mana konten disimpan di `deploy/index.html` (nomor baris per audit terakhir —
kalau bergeser, cari nama objeknya):

| Objek | Baris | Isi |
|---|---|---|
| `CONTENT` | 785 (`en:` 786, `id:` 875) | Hampir semua teks situs, dua bahasa |
| `SERVICES` | 965 (`en:` 966, `id:` 986) | Daftar bidang praktik, dua bahasa |
| `TEAM` | 1008 (`en:` 1009, `id:` 1031) | Profil lawyer, dua bahasa |
| `INSIGHTS` | 1059 | Artikel hukum — **satu bahasa saja**, tidak dipisah en/id |
| `CLIENT_DOMAINS` | 1082 | Nama klien → domain (untuk logo) |
| `TEXTS` | 1093 (`en:` 1094, `id:` 1106) | Privacy policy & disclaimer, dua bahasa |
| `ROUTES` | 1152 | Peta halaman → alamat URL |

## Alur deploy

```
ubah file  →  commit  →  push  →  Vercel menyalin isi deploy/  →  situs berubah
```

Fakta yang diverifikasi dari repositori:

- **Build command: tidak ada.** Tidak ada yang bisa dijalankan karena tidak ada
  `package.json`. Vercel hanya menyalin file apa adanya.
- **Output / folder yang dipublikasikan: `deploy/`.** Karena `vercel.json`
  berada di dalam `deploy/` (bukan di root repo), pengaturan **Root Directory
  di dashboard Vercel pasti diset ke `deploy`** — kalau tidak, `vercel.json`
  tidak akan berlaku dan `index.html` tidak akan berada di akar situs.
- **`Website sesuai dokumen.zip` di root repo tidak pernah ikut ter-deploy** —
  file itu di luar Root Directory. Isinya salinan lama `deploy/` per commit
  `a1a98e1`, sudah tertinggal 4 kali perubahan `index.html`, dan belum memuat
  `internal.html`. Anggap sisa lama.

Isi `deploy/vercel.json` selengkapnya:

```json
{
  "cleanUrls": true,
  "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ]
}
```

- `cleanUrls: true` → alamat ditulis `/contact`, bukan `/contact.html`.
- Rewrite tangkap-semua → **semua** alamat menampilkan `index.html`, lalu
  JavaScript memutuskan halaman mana yang tampil. Inilah yang membuat
  `/our-team` bisa dibuka langsung dan di-bookmark. Ini juga sebabnya
  `404.html` tidak pernah tampil. File statis yang benar-benar ada
  (`/assets/...`, `/robots.txt`, `/internal.html`) tetap dilayani lebih dulu
  dan tidak tertelan rewrite ini.

Soal branch:

- Push ke branch selain `main` → Vercel membuat **Preview deployment**
  (URL sementara, aman untuk dicek dulu, tidak menyentuh situs asli)
- Push ke `main` → Vercel deploy ke **Production** (situs asli langsung berubah)

**Default: commit dan push langsung ke `main`.** Tanpa branch, tanpa preview.
Pemilik proyek memilih alur ini pada 3 September 2026.

**Tapi WAJIB minta izin lebih dulu sebelum setiap push.** Ini syarat yang
tidak bisa ditawar, berlaku untuk setiap perubahan sekecil apa pun. Urutannya:

1. Kerjakan perubahannya, jangan di-commit dulu.
2. Jelaskan ke pemilik proyek dalam bahasa Indonesia sederhana: halaman mana
   yang berubah, apa yang terlihat berbeda oleh pengunjung, apa yang bisa rusak.
3. **Tunggu persetujuan eksplisit.** Diam bukan berarti setuju.
4. Baru commit dan push ke `main`.

Karena tidak ada preview, push ke `main` langsung mengubah situs yang dilihat
publik. Satu-satunya jaring pengaman adalah izin di langkah 3 — jangan
lewati.

## Konvensi kode

- **Setiap perubahan teks yang tampil ke pengunjung harus dikerjakan DUA KALI:
  sekali di blok `en:` dan sekali di blok `id:`.** Situs ini dwibahasa dengan
  Inggris sebagai default. Mengubah satu sisi saja membuat versi bahasa yang
  lain tertinggal tanpa ada peringatan apa pun di layar. Berlaku untuk
  `CONTENT`, `SERVICES`, `TEAM`, dan `TEXTS`.
  Pengecualian: `INSIGHTS` memang hanya satu bahasa.
- Nama file, variabel, dan fungsi: bahasa Inggris — ikuti gaya yang sudah ada
  (`insightCards`, `searchResults`, `navCta`). Jangan menerjemahkan nama
  variabel ke bahasa Indonesia.
- Pertahankan gaya penulisan file yang sudah ada. Jangan reformat file utuh
  hanya karena gaya berbeda — diff yang besar menyulitkan pengecekan, dan di
  file ini juga berbahaya (lihat Aturan 1).
- Perubahan sekecil mungkin. Ubah hanya yang diminta.
- Styling ditulis inline sebagai atribut `style="..."`, dengan beberapa kelas
  `.alp-*` di blok `<style>` untuk animasi dan hover. Ikuti pola itu; jangan
  memperkenalkan file CSS terpisah atau framework CSS.
- Jangan hapus file tanpa menjelaskan kenapa file itu tidak terpakai —
  dan verifikasi dulu dengan mencarinya di seluruh repo. (`image-slot.js`
  sempat terlihat seperti sisa scaffolding, ternyata terpakai.)
- Kalau menambah atau mengganti halaman, `deploy/sitemap.xml` dan `ROUTES`
  harus ikut diperbarui.

## Yang harus dihindari

- Jangan merapikan atau "memperbaiki" kode yang tidak diminta.
- Jangan menambah halaman, section, atau fitur baru atas inisiatif sendiri.
- Jangan mengganti gambar, warna, atau font tanpa diminta.
- Jangan membuat abstraksi untuk kasus yang belum ada.
- Jangan memecah `index.html` menjadi banyak file atau memindahkannya ke
  framework. Format `<x-dc>`/`<sc-if>` hanya dimengerti oleh `support.js`, dan
  source runtime-nya tidak ada di repo ini — memecahnya berarti menulis ulang
  seluruh situs.
- Jangan menulis ulang riwayat Git (`filter-repo`, force-push) untuk
  mengecilkan ukuran repo. Repo memang berat (~98 MB, `.git` 51 MB karena
  menyimpan zip 23,6 MB dan `hero.mp4` 12,8 MB), tapi itu tidak mengganggu
  Vercel sama sekali.
- Jangan melaporkan pekerjaan selesai sebelum benar-benar ter-push dan
  deployment Vercel-nya berhasil.

## Masalah yang sudah diketahui (belum diperbaiki)

Jangan perbaiki tanpa diminta — daftar ini hanya supaya tidak "ditemukan
ulang" setiap sesi.

1. **Kredensial terbuka** di `internal.html` baris 45 dan 214 (lihat Aturan 7).
   Prioritas tertinggi kalau pemilik proyek minta perbaikan.
2. **Domain tidak konsisten.** Tiga versi dipakai bersamaan:
   `aerternumlegal.com` (5×, di tag canonical dan og:image),
   `aerternum-legal.com` — pakai tanda hubung (34×, di sitemap, robots.txt,
   alamat email, dan structured data), sedangkan situs tayang di
   `aerternumlegal.vercel.app`. Merugikan SEO: sitemap menunjuk domain yang
   berbeda dari canonical.
3. **`404.html` duplikat `index.html`** — 424 KB kembar yang harus dijaga
   sinkron, padahal tidak pernah tampil (lihat Aturan 3).
4. **`Website sesuai dokumen.zip`** (23,6 MB) di root adalah salinan lama yang
   sudah tertinggal. Aman dihapus dari working tree, tapi menghapusnya tidak
   mengecilkan `.git`.
