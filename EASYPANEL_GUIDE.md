# Panduan Lengkap Deploy VPS (EasyPanel) & Update Aplikasi

Panduan ini mencakup langkah dari **Nol** sampai **Live**, serta cara **Update** aplikasi di masa depan.

---

## 🧐 Apa itu `npx prisma db push`?
Perintah ini berfungsi untuk **"Mencetak Tabel"** ke dalam database kosong.
*   Schema Prisma Anda adalah "Cetak Biru" (Blueprint).
*   Database di VPS awalnya kosong (tanpa tabel User, Product, dll).
*   `db push` memaksa database membuat tabel sesuai cetakan tersebut agar aplikasi bisa menyimpan data.

---

## BAGIAN 1: Persiapan di Laptop (Sekali Saja)

Pastikan file-file ini sudah benar (sudah saya setkan, jangan diubah kecuali paham):

1.  **`package.json`**:
    *   Harus ada `"engines": { "node": ">=18.0.0" }`.
2.  **`Dockerfile`**:
    *   Harus menggunakan `FROM node:20-alpine`.
    *   Harus ada `RUN apk add --no-cache openssl`.
3.  **`prisma/schema.prisma`**:
    *   Binary target harus ada: `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]`.

---

## BAGIAN 2: Setup Awal VPS (EasyPanel)

### 1. Buat Database (MySQL)
Agar performa maksimal, database harus satu rumah (satu project) dengan aplikasi.
1.  Buka EasyPanel -> Project Anda (misal: `evolution`).
2.  Klik **+ Service** -> **MySQL**.
3.  Setelah jadi, klik service MySQL tersebut -> **Credentials**.
4.  Copy **Connection URL** yang menggunakan user **ROOT**.
    *   Format: `mysql://root:PASSWORD_PANJANG@nama-service:3306/nama-db`
    *   *Penting: Pakai user `root` agar izin akses penuh.*

### 2. Buat Aplikasi
1.  Klik **+ Service** -> **App**.
2.  Beri nama (misal: `production-app`).
3.  **Tab Source**:
    *   Pilih **GitHub**.
    *   Owner: `username-github-anda`.
    *   Repository: `nama-repo-anda`.
    *   Branch: `main`.
    *   (Jika repo Private, isi Password dengan *Personal Access Token* GitHub).
4.  **Tab Build**:
    *   Pilih **Dockerfile** (Biarkan path kosong/default).

### 3. Konfigurasi Penting (Wajib!)
Sebelum deploy, setting ini harus diisi:

*   **Tab Environment**:
    Isi variabel berikut:
    ```ini
    PORT=3000
    DATABASE_URL="mysql://root:PASSWORD_TADI@..."
    NEXTAUTH_URL="https://subdomain.anda.com"
    NEXTAUTH_SECRET="copy-dari-local-env"
    ```

*   **Tab General (Settings)**:
    *   Cari kolom **App Port**.
    *   Isi dengan angka **`3000`**.
    *   *Kenapa? Karena di Dockerfile dan Env kita set port 3000. Kalau ini salah, akan muncul error "Service Not Reachable".*

*   **Tab Domains**:
    *   Tambahkan domain Anda: `production.ichibot.id`.

*   **Tab Storage (PENTING AGAR GAMBAR TIDAK HILANG)**:
    *   Klik **Add Mount**.
    *   **Type**: Volume.
    *   **Name**: `uploads`.
    *   **Mount Path**: `/app/public/uploads`.
    *   *Tanpa ini, setiap kali deploy ulang, semua gambar produk akan terhapus!*

### 4. Deploy Pertama
Klik tombol **Deploy** (Warna Hijau). Tunggu sampai status **Running**.

---

## BAGIAN 3: Koneksi Domain (cPanel ke VPS)

Agar `production.ichibot.id` mengarah ke VPS, bukan ke hosting lama.

1.  Login cPanel Niagahoster.
2.  Menu **Zone Editor** -> **Manage**.
3.  Cari/Buat record `production.ichibot.id`.
4.  Ubah Tipe jadi **A Record**.
5.  Ubah Value jadi **IP Address VPS** (Angka IP VPS EasyPanel).
6.  Save.

---

## BAGIAN 4: Inisialisasi Database

Setelah aplikasi Running, website mungkin masih error (500) karena tabel belum ada.
1.  Buka EasyPanel -> Klik Aplikasi `production-app`.
2.  Klik Tab **Console**.
3.  Ketik (Gunakan versi 5.22.0 agar cocok):
    ```bash
    npx prisma@5.22.0 db push --skip-generate
    ```
4.  Enter. Tunggu sukses. Website siap digunakan!

### Buat User Admin Pertama (Manual)
Karena kita tidak bisa menjalankan seed file di VPS, gunakan perintah "Magic" ini di Console EasyPanel untuk membuat user admin:

```bash
node -e 'const { PrismaClient } = require("@prisma/client"); const prisma = new PrismaClient(); prisma.user.create({ data: { email: "admin@ichibot.id", username: "admin", name: "Super Admin", password: "$2b$12$ANKWkbmCHA2dlJsU92IYUekamPy8DRTJJCMrh4Fv2SksvUZI2ZVTS", role: "ADMIN" } }).then(() => console.log("✅ SUKSES")).catch(e => console.error(e))'
```
*   **Email:** `admin@ichibot.id`
*   **Password:** `admin1234567890`

---

## 🔄 BAGIAN 5: CARA UPDATE KODE (Rutinitas)

Setiap kali Anda mengubah kode di laptop (misal: ganti warna, tambah fitur), lakukan ini:

### 1. Di Laptop (Kirim Kode)
Buka terminal VS Code:
```bash
git add .
git commit -m "Keterangan update apa yang diubah"
git push
```
*(Tunggu sampai upload ke GitHub selesai).*

### 2. Di EasyPanel (Deploy)
EasyPanel tidak otomatis update (kecuali disetting Webhook). Cara manual paling aman:
1.  Buka EasyPanel -> Aplikasi `production-app`.
2.  Klik tombol **Deploy** (Pojok Kiri Atas).
3.  Tunggu sebentar sampai "Running".
4.  Selesai! Perubahan sudah live.
5.  *(Opsional)* Jika mengubah database, jalankan `npx prisma@5.22.0 db push --skip-generate` di Console.

--- 

**Tips Tambahan:**
*   **Web Error?** Selalu cek tab **Logs** di EasyPanel untuk melihat penyebabnya.

