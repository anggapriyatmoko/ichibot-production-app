# Changelog: Payment Gateway DOKU - Ichibot Production App

**Tanggal:** 10 April 2026  
**Branch:** `didi`  
**Tujuan:** Menambahkan fitur payment gateway DOKU untuk menerima pembayaran online di halaman Store.

---

## JAMINAN KEAMANAN DATA PRODUCTION

Fitur ini adalah **penambahan baru** (fitur baru, tabel baru). Tidak ada tabel atau data yang sudah ada yang diubah atau dihapus.

- TIDAK mengubah tabel yang sudah ada
- TIDAK menghapus data apapun
- TIDAK mengubah kolom atau relasi yang sudah ada
- Menambah 1 tabel baru: `StorePayment`
- Menambah 1 menu baru di sidebar: "Payment"
- Semua fitur lama tetap berjalan 100% normal

---

## Daftar Semua File

### File BARU (6 file)

| # | File | Fungsi |
|---|------|--------|
| 1 | `src/lib/doku.ts` | Library inti DOKU: generate signature, verify webhook |
| 2 | `src/app/api/webhook/doku/route.ts` | Webhook endpoint untuk menerima notifikasi dari DOKU |
| 3 | `src/app/actions/store-payment.ts` | Server actions: create, get, check status, delete payment |
| 4 | `src/app/(dashboard)/store/payment/page.tsx` | Halaman payment di dashboard |
| 5 | `src/components/store/create-payment-modal.tsx` | Modal form buat payment baru |
| 6 | `src/components/store/store-payment-list.tsx` | Tabel list payment + search, filter, pagination |

### File yang DIEDIT (2 file)

| # | File | Perubahan |
|---|------|-----------|
| 7 | `prisma/schema.prisma` | Tambah model `StorePayment` (tabel baru) |
| 8 | `src/components/layout/sidebar.tsx` | Tambah menu "Payment" di grup Store |

---

## Detail Setiap File

---

### 1. `src/lib/doku.ts` (BARU)

**Fungsi:** Library inti untuk komunikasi dengan DOKU API.

**Isi:**
- `getDokuBaseUrl()` — Menentukan URL API DOKU (sandbox atau production) berdasarkan `DOKU_ENV`
- `generateDigest()` — Membuat SHA-256 digest dari request body
- `generateSignature()` — Membuat HMAC-SHA256 signature untuk autentikasi API DOKU
- `generateRequestHeaders()` — Membuat semua header yang dibutuhkan DOKU (Client-Id, Request-Id, Request-Timestamp, Signature)
- `verifyDokuSignature()` — Memverifikasi signature webhook dari DOKU (memastikan notifikasi asli dari DOKU)

**Environment variables yang dipakai:**
- `DOKU_ENV` — `'production'` untuk live, selain itu sandbox
- `Client_ID` — Client ID dari akun DOKU
- `Active_Secret_Key` — Secret key dari akun DOKU

---

### 2. `src/app/api/webhook/doku/route.ts` (BARU)

**Fungsi:** Endpoint webhook di `/api/webhook/doku` yang menerima notifikasi pembayaran dari DOKU.

**Alur kerja:**
1. DOKU mengirim POST request saat status pembayaran berubah
2. Server memverifikasi signature (memastikan benar dari DOKU, bukan pihak lain)
3. Membaca status dari payload:
   - `SUCCESS` → update status jadi `lunas`, set `paidAt`
   - `FAILED` → update status jadi `gagal`
   - `EXPIRED` → update status jadi `expired`
4. Update record `StorePayment` di database
5. Return 200 OK ke DOKU

**Penting:** Return 200 bahkan saat error processing, agar DOKU tidak retry terus-menerus.

---

### 3. `src/app/actions/store-payment.ts` (BARU)

**Fungsi:** Server actions untuk semua operasi payment.

**Fungsi-fungsi:**

| Fungsi | Kegunaan |
|--------|----------|
| `generateInvoiceNumber()` | Buat nomor invoice unik: `INV/ICBT-DK/[BULAN_ROMAWI]/[NOMOR]` |
| `createPayment(data)` | Buat payment baru ke DOKU API, simpan ke database |
| `getPayments()` | Ambil semua payment dari database |
| `checkPaymentStatus(invoiceNumber)` | Cek status pembayaran langsung ke DOKU API |
| `deletePayment(id)` | Hapus payment (hanya yang berstatus pending/expired) |

**Format Invoice:** `INV/ICBT-DK/IV/0001` (contoh: bulan April, nomor ke-1)

**Catatan:** File ini masih ada `console.log` untuk debugging DOKU. Setelah payment gateway stabil, sebaiknya dihapus.

---

### 4. `src/app/(dashboard)/store/payment/page.tsx` (BARU)

**Fungsi:** Halaman utama payment di dashboard (`/store/payment`).

**Fitur:**
- Server component dengan proteksi auth (`requireAuth`)
- Cek role-based access (`isAllowedForPage('/store/payment')`)
- Redirect ke `/dashboard` jika tidak punya akses
- Load data payment via `getPayments()`
- Suspense boundary dengan skeleton loading

---

### 5. `src/components/store/create-payment-modal.tsx` (BARU)

**Fungsi:** Modal form untuk membuat payment baru.

**Field form:**
- **Nama Pelanggan** (wajib) — nama customer
- **Nominal** (wajib) — jumlah pembayaran, format Rupiah otomatis
- **Kode Unik** (opsional) — angka 1-99 yang ditambahkan ke nominal, bisa di-generate random
- **Keterangan** (opsional) — catatan/deskripsi

**Setelah berhasil:**
- Tampilkan nomor invoice dan link pembayaran
- Tombol copy link ke clipboard
- Tombol buka link pembayaran di tab baru

---

### 6. `src/components/store/store-payment-list.tsx` (BARU)

**Fungsi:** Tabel list payment dengan fitur lengkap.

**Fitur:**
- Tabel responsive (desktop) + card view (mobile)
- Search berdasarkan nama, keterangan, atau nomor invoice
- Filter berdasarkan status (All, Pending, Lunas, Gagal, Expired)
- Pagination 20 item per halaman
- Status badge berwarna:
  - Pending = orange
  - Lunas = hijau
  - Gagal = merah
  - Expired = abu-abu
- Tombol aksi per item:
  - **Cek Status** — cek langsung ke DOKU API
  - **Lihat Link** — modal tampilkan link pembayaran + copy
  - **Hapus** — hanya untuk payment pending/expired
- Tombol **Buat Payment** di header

---

### 7. `prisma/schema.prisma` (DIEDIT)

**Perubahan:** Tambah model `StorePayment` di akhir file (baris 968-989).

```prisma
model StorePayment {
  id              String    @id @default(cuid())
  invoiceNumber   String    @unique
  nama            String
  keterangan      String?   @db.Text
  nominal         Float
  status          String    @default("pending")
  paymentUrl      String?   @db.Text
  tokenId         String?
  sessionId       String?
  paymentMethod   String?
  paymentChannel  String?
  dokuRequestId   String?
  dokuResponse    Json?
  paidAt          DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([status])
  @@index([createdAt])
  @@map("StorePayment")
}
```

**Kolom-kolom:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | String (CUID) | Primary key |
| `invoiceNumber` | String (unique) | Nomor invoice unik |
| `nama` | String | Nama pelanggan |
| `keterangan` | String? (Text) | Catatan opsional |
| `nominal` | Float | Jumlah pembayaran |
| `status` | String | `pending` / `lunas` / `gagal` / `expired` |
| `paymentUrl` | String? (Text) | URL halaman checkout DOKU |
| `tokenId` | String? | Token dari DOKU |
| `sessionId` | String? | Session ID dari DOKU |
| `paymentMethod` | String? | Metode bayar (e.g., CREDIT_CARD) |
| `paymentChannel` | String? | Channel pembayaran |
| `dokuRequestId` | String? | Request ID ke DOKU |
| `dokuResponse` | Json? | Full response dari DOKU |
| `paidAt` | DateTime? | Waktu pembayaran berhasil |
| `createdAt` | DateTime | Waktu dibuat |
| `updatedAt` | DateTime | Waktu terakhir diupdate |

**Dampak ke data production:** TIDAK ADA dampak ke tabel yang sudah ada. Ini menambah tabel BARU.

---

### 8. `src/components/layout/sidebar.tsx` (DIEDIT)

**Perubahan:**
- Tambah import icon `CreditCard` dari `lucide-react` (baris 39)
- Tambah menu item `{ name: "Payment", href: "/store/payment", icon: CreditCard }` di grup Store (baris 105)

**Dampak:** Menu "Payment" muncul di sidebar di bawah "POS Store".

---

## Environment Variables yang HARUS Ditambahkan

### Di Easypanel VPS (Service Environment):

```env
# === DOKU Payment Gateway ===
DOKU_ENV=production
Client_ID=isi_dengan_client_id_dari_doku
Active_Secret_Key=isi_dengan_secret_key_dari_doku
```

### Cara set di Easypanel:

1. Buka **Easypanel** dashboard
2. Pilih service/app **ichibot-production-app**
3. Buka tab **Environment** (atau **Variables**)
4. Tambahkan 3 variabel baru:

| Key | Value | Keterangan |
|-----|-------|------------|
| `DOKU_ENV` | `production` | WAJIB `production` untuk live. Jika isi lain, pakai sandbox (testing) |
| `Client_ID` | `(dari dashboard DOKU)` | Login ke dashboard.doku.com → ambil Client ID |
| `Active_Secret_Key` | `(dari dashboard DOKU)` | Login ke dashboard.doku.com → ambil Secret Key |

5. Klik **Save** / **Deploy**

### Cara dapat credential DOKU:

1. Login ke **https://dashboard.doku.com** (atau sandbox: https://sandbox.doku.com)
2. Masuk ke menu **Settings** atau **API Keys**
3. Copy **Client ID** dan **Secret Key** yang aktif
4. Paste ke Easypanel

### Untuk testing lokal (.env):

```env
DOKU_ENV=sandbox
Client_ID=isi_client_id_sandbox
Active_Secret_Key=isi_secret_key_sandbox
```

---

## Langkah-Langkah Deploy ke Production

### Langkah 1: Tambahkan Environment Variables

Set 3 variabel di Easypanel **SEBELUM** deploy code:
- `DOKU_ENV=production`
- `Client_ID=...`
- `Active_Secret_Key=...`

(Lihat bagian "Cara set di Easypanel" di atas)

### Langkah 2: Deploy Code

```bash
git add .
git commit -m "feat: add DOKU payment gateway for store"
git push
```

Atau merge branch `didi` ke `main` seperti biasa.

### Langkah 3: Buat Tabel StorePayment di Database Production

Buka **phpMyAdmin** di VPS, pilih database, klik tab **SQL**, lalu jalankan:

```sql
CREATE TABLE IF NOT EXISTS `StorePayment` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NOT NULL,
  `nama` VARCHAR(191) NOT NULL,
  `keterangan` TEXT NULL,
  `nominal` DOUBLE NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `paymentUrl` TEXT NULL,
  `tokenId` VARCHAR(191) NULL,
  `sessionId` VARCHAR(191) NULL,
  `paymentMethod` VARCHAR(191) NULL,
  `paymentChannel` VARCHAR(191) NULL,
  `dokuRequestId` VARCHAR(191) NULL,
  `dokuResponse` JSON NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `StorePayment_invoiceNumber_key` (`invoiceNumber`),
  INDEX `StorePayment_status_idx` (`status`),
  INDEX `StorePayment_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**SQL ini AMAN:**
- `CREATE TABLE IF NOT EXISTS` — hanya buat tabel kalau belum ada
- Tidak menyentuh tabel lain
- Tidak menghapus data apapun

### Langkah 4: Setup Webhook URL di DOKU Dashboard

1. Login ke **https://dashboard.doku.com**
2. Masuk ke menu **Configuration** atau **Webhook Settings**
3. Set **Notification URL** ke:
   ```
   https://[domain-anda]/api/webhook/doku
   ```
   Contoh: `https://app.ichibot.id/api/webhook/doku`
4. Save

**Penting:** URL webhook HARUS bisa diakses dari internet (public). DOKU akan mengirim POST request ke URL ini saat ada perubahan status pembayaran.

### Langkah 5: Verifikasi

1. **Buka halaman Payment** — `/store/payment` harus muncul dan bisa diakses
2. **Buat payment test** — klik "Buat Payment", isi form, submit
3. **Cek link pembayaran** — pastikan link DOKU bisa dibuka
4. **Cek status** — klik tombol "Cek Status" di list payment
5. **Cek sidebar** — menu "Payment" harus muncul di grup Store

---

## YANG HARUS DILAKUKAN

1. **Set environment variables di Easypanel SEBELUM deploy** — tanpa ini, semua request ke DOKU akan gagal

2. **Jalankan SQL CREATE TABLE di phpMyAdmin** — tanpa ini, semua operasi payment akan error karena tabel belum ada

3. **Set webhook URL di dashboard DOKU** — tanpa ini, DOKU tidak bisa mengirim notifikasi pembayaran (status tidak otomatis update)

4. **Test payment end-to-end** setelah deploy:
   - Buat payment → dapat link → buka link → bayar (sandbox) → cek status berubah

5. **Backup database** sebelum jalankan SQL (untuk jaga-jaga):
   ```bash
   mysqldump -u [user] -p production-app > backup_sebelum_payment.sql
   ```

6. **Hapus console.log di `store-payment.ts`** setelah payment gateway sudah stabil (baris 60-62, 71-72)

7. **Pastikan domain bisa diakses publik** — webhook DOKU butuh URL publik

---

## YANG DILARANG

1. **JANGAN deploy tanpa set environment variables** — aplikasi akan crash saat akses payment

2. **JANGAN isi `DOKU_ENV=sandbox` di production** — transaksi tidak akan diproses secara real, hanya testing

3. **JANGAN share `Client_ID` dan `Active_Secret_Key`** ke publik — ini credential rahasia, siapa saja yang punya bisa membuat transaksi atas nama akun DOKU Anda

4. **JANGAN hapus tabel `StorePayment`** di production — semua data transaksi pembayaran akan hilang

5. **JANGAN ubah nama kolom `invoiceNumber`** — DOKU menggunakan field ini untuk mencocokkan transaksi

6. **JANGAN ubah endpoint webhook** (`/api/webhook/doku`) tanpa update juga di dashboard DOKU — notifikasi tidak akan sampai

7. **JANGAN hapus `verifyDokuSignature` di webhook** — ini validasi keamanan untuk memastikan request benar dari DOKU, bukan pihak lain

8. **JANGAN jalankan `prisma migrate` di production** untuk fitur ini — gunakan SQL manual di phpMyAdmin saja

---

## Alur Kerja Payment (Untuk Referensi)

```
User klik "Buat Payment"
    ↓
Isi form (nama, nominal, keterangan)
    ↓
Server kirim request ke DOKU API (createPayment)
    ↓
DOKU return link pembayaran + token
    ↓
Simpan ke tabel StorePayment (status: pending)
    ↓
User copy link, kirim ke pelanggan
    ↓
Pelanggan buka link → bayar via DOKU checkout
    ↓
DOKU kirim webhook ke /api/webhook/doku
    ↓
Server update status: pending → lunas/gagal/expired
    ↓
List payment otomatis menampilkan status terbaru
```

---

## Ringkasan

| Item | Detail |
|------|--------|
| **File baru** | 6 file |
| **File diedit** | 2 file |
| **Tabel baru** | `StorePayment` (1 tabel) |
| **Tabel yang diubah** | TIDAK ADA |
| **Data yang dihapus** | TIDAK ADA |
| **Environment variables** | 3 variabel (`DOKU_ENV`, `Client_ID`, `Active_Secret_Key`) |
| **Webhook URL** | `https://[domain]/api/webhook/doku` |
| **Menu sidebar** | "Payment" di grup Store |
| **Halaman baru** | `/store/payment` |
