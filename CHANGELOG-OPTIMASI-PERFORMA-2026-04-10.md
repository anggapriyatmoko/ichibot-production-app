# Changelog: Optimasi Performa Ichibot Production App

**Tanggal:** 10 April 2026  
**Branch:** `didi`  
**Tujuan:** Memperbaiki web yang sangat lambat di production — klik sidebar tidak pindah halaman, harus klik berkali-kali, dan makin parah saat AI scan expense berjalan.

---

## JAMINAN KEAMANAN DATA

Semua perubahan dalam changelog ini:

- TIDAK menjalankan `DROP TABLE`
- TIDAK menjalankan `DELETE FROM`
- TIDAK menjalankan `ALTER COLUMN` (mengubah/menghapus kolom)
- TIDAK menjalankan `TRUNCATE`
- TIDAK mengubah struktur tabel (field, tipe data, relasi tetap sama)
- CRUD (Create, Read, Update, Delete) tetap berjalan normal di semua halaman

---

## Daftar File yang Diubah

| # | File | Jenis Perubahan |
|---|------|-----------------|
| 1 | `src/lib/prisma.ts` | Perbaikan koneksi database |
| 2 | `src/components/keuangan/expense-list-user.tsx` | Perbaikan polling loop + UI image |
| 3 | `src/app/actions/rbac.ts` | Tambah cache lintas request |
| 4 | `src/app/actions/expense.ts` | Optimasi query + fungsi baru |
| 5 | `src/components/keuangan/expense-dashboard-admin.tsx` | UI image on-demand |
| 6 | `prisma/schema.prisma` | Tambah 2 baris index |
| 7 | `sql/add-expense-indexes.sql` | File SQL baru untuk production |

---

## Detail Perubahan Per File

---

### 1. `src/lib/prisma.ts` — Perbaikan Koneksi Database

**Masalah:**  
Di production, `globalThis.prismaGlobal_v5` tidak pernah di-set karena ada kondisi `if (process.env.NODE_ENV !== 'production')`. Akibatnya, potensi setiap request membuat koneksi database baru tanpa connection pooling.

**Sebelum:**
```typescript
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prismaGlobal_v5: PrismaClient | undefined
}

const prisma = globalThis.prismaGlobal_v5 ?? new PrismaClient()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal_v5 = prisma
```

**Sesudah:**
```typescript
import { PrismaClient } from '@prisma/client'

declare global {
    var prismaGlobal_v5: PrismaClient | undefined
}

const prisma = globalThis.prismaGlobal_v5 ?? new PrismaClient()

globalThis.prismaGlobal_v5 = prisma

export default prisma
```

**Apa yang berubah:**
- Hapus fungsi `prismaClientSingleton()` yang tidak pernah dipakai (dead code)
- `globalThis.prismaGlobal_v5 = prisma` sekarang dijalankan di SEMUA environment (dev & production)
- Koneksi database di-reuse, bukan dibuat baru terus-menerus

**Dampak ke data:** TIDAK ADA. Ini hanya mengubah cara koneksi ke database, bukan mengubah data.

---

### 2. `src/components/keuangan/expense-list-user.tsx` — Perbaikan Polling + UI Image

**Masalah Polling:**  
Saat ada expense dengan status `scanning` (AI scan), komponen melakukan polling setiap 5 detik. Tapi dependency `[expenses]` membuat interval terus di-recreate karena setiap `fetchExpenses` menghasilkan array reference baru. Ini menyebabkan request bertumpuk dan server kewalahan.

**Sebelum (polling):**
```typescript
useEffect(() => {
    const hasScanning = expenses.some(e => e.status === 'scanning')
    if (!hasScanning) return
    const interval = setInterval(() => { fetchExpenses(true) }, 5000)
    return () => clearInterval(interval)
}, [expenses])  // <-- MASALAH: expenses berubah setiap fetch
```

**Sesudah (polling):**
```typescript
const hasScanning = useMemo(
    () => expenses.some(e => e.status === 'scanning'),
    [expenses]
)

useEffect(() => {
    if (!hasScanning) return
    const interval = setInterval(() => { fetchExpenses(true) }, 5000)
    return () => clearInterval(interval)
}, [hasScanning])  // <-- FIX: boolean stabil, hanya berubah saat true↔false
```

**Apa yang berubah:**
- Dependency useEffect diganti dari `[expenses]` (selalu berubah) ke `[hasScanning]` (boolean stabil)
- Interval hanya dibuat/dihapus saat status scanning berubah, bukan setiap fetch

**Masalah UI Image:**  
Sebelumnya, setiap expense membawa data `image` (base64 LongText, bisa ratusan KB per item). Sekarang list hanya membawa `hasImage: boolean` dan image di-load on-demand saat diklik.

**Perubahan interface:**
```typescript
// Sebelum:
interface Expense {
    // ...
    image: string | null
}

// Sesudah:
interface Expense {
    // ...
    hasImage?: boolean
}
```

**Perubahan tombol "Lihat Bukti" (mobile & desktop):**
```typescript
// Sebelum:
{item.image ? (
    <button onClick={() => {
        setPreviewImage(item.image)
        setIsPreviewOpen(true)
    }}>

// Sesudah:
{item.hasImage ? (
    <button onClick={async () => {
        const res = await getExpenseImage(item.id)
        if (res.success && res.data) {
            setPreviewImage(res.data)
            setIsPreviewOpen(true)
        }
    }}>
```

**Perubahan handleOpenModal (edit expense):**
```typescript
// Sebelum:
const handleOpenModal = (expense?: Expense) => {
    if (expense) {
        setFormData({ ...data, image: expense.image })
    }
    setIsModalOpen(true)
}

// Sesudah:
const handleOpenModal = async (expense?: Expense) => {
    if (expense) {
        setFormData({ ...data, image: null })
        setIsModalOpen(true)
        // Load image on-demand
        if (expense.hasImage) {
            const res = await getExpenseImage(expense.id)
            if (res.success && res.data) {
                setFormData(prev => ({ ...prev, image: res.data }))
            }
        }
        return
    }
    setIsModalOpen(true)
}
```

**Dampak ke data:** TIDAK ADA. Hanya mengubah cara menampilkan data di browser.

---

### 3. `src/app/actions/rbac.ts` — Cache RBAC Config Lintas Request

**Masalah:**  
`getRbacConfig()` sebelumnya menggunakan `React.cache()` yang hanya deduplicate dalam 1 request. Setiap klik sidebar = request baru = query database + decrypt lagi. RBAC config jarang berubah, tapi di-query setiap navigasi.

**Sebelum:**
```typescript
import { revalidatePath } from 'next/cache'
import { cache } from 'react'

export const getRbacConfig = cache(async (): Promise<RbacConfig | null> => {
    // ... query database setiap request
})

// Di saveRbacConfig:
revalidatePath('/settings')
revalidatePath('/')
```

**Sesudah:**
```typescript
import { revalidatePath, revalidateTag } from 'next/cache'
import { unstable_cache } from 'next/cache'

export const getRbacConfig = unstable_cache(
    async (): Promise<RbacConfig | null> => {
        // ... query database
    },
    ['rbac-config'],
    { revalidate: 60, tags: ['rbac-config'] }  // cache 60 detik
)

// Di saveRbacConfig:
revalidateTag('rbac-config')  // BARU: langsung invalidate cache saat admin ubah RBAC
revalidatePath('/settings')
revalidatePath('/')
```

**Apa yang berubah:**
- `React.cache()` diganti `unstable_cache` dari `next/cache` dengan TTL 60 detik
- Saat admin save RBAC config, `revalidateTag('rbac-config')` langsung menghapus cache lama
- Navigasi sidebar tidak perlu query database setiap klik (pakai cache)

**Dampak ke data:** TIDAK ADA. Hanya mengubah cara membaca konfigurasi (di-cache, bukan query ulang).

**Catatan:** Setelah admin ubah RBAC, perubahan langsung berlaku (karena `revalidateTag`). Dalam kondisi normal, cache refresh setiap 60 detik.

---

### 4. `src/app/actions/expense.ts` — Optimasi Query + Fungsi Baru

**Masalah:**  
`getExpenses()` dan `getAllExpenses()` menggunakan `...expense` (spread semua field) yang menyertakan kolom `image` (LongText base64, bisa ratusan KB per row). Setiap polling 5 detik mengirim semua data image ke browser.

**Perubahan di `getExpenses()` (baris 39-51):**
```typescript
// Sebelum:
const decryptedExpenses = expenses.map((expense: any) => ({
    ...expense,                                    // <-- termasuk image (LongText)
    amount: decrypt(expense.amountEnc) || '0',
    name: decrypt(expense.nameEnc) || 'Unknown'
}))

// Sesudah:
const decryptedExpenses = expenses.map((expense: any) => ({
    id: expense.id,
    userId: expense.userId,
    categoryId: expense.categoryId,
    date: expense.date,
    status: expense.status,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    category: expense.category,
    amount: decrypt(expense.amountEnc) || '0',
    name: decrypt(expense.nameEnc) || 'Unknown',
    hasImage: !!expense.image,                     // <-- boolean saja, bukan full base64
}))
```

**Perubahan yang sama di `getAllExpenses()` (baris 86-99):**
- Sama seperti di atas, plus `userName` tetap ada
- `image` diganti `hasImage: !!expense.image`

**Fungsi baru `getExpenseImage(id)` (baris 367-388):**
```typescript
export async function getExpenseImage(id: string) {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' }
        }

        const expense = await (prisma as any).expense.findUnique({
            where: { id },
            select: { image: true, userId: true }
        })

        if (!expense) {
            return { success: false, error: 'Expense not found' }
        }

        return { success: true, data: expense.image }
    } catch (error) {
        console.error('Error fetching expense image:', error)
        return { success: false, error: 'Failed to fetch image' }
    }
}
```

**Apa yang berubah:**
- List expense TIDAK lagi mengirim data `image` ke browser (hemat ratusan KB - MB)
- Sebagai gantinya, `hasImage: boolean` memberi tahu UI apakah ada lampiran
- Image di-load on-demand lewat `getExpenseImage(id)` saat user klik "Lihat Bukti"

**Fungsi yang TIDAK berubah (tetap sama persis):**
- `createExpense()` — tetap bisa upload image
- `updateExpense()` — tetap bisa update image
- `updateExpenseAdmin()` — tetap bisa update image
- `deleteExpense()` — tetap bisa hapus expense
- `createExpenseDraft()` — tetap bisa buat draft scan
- `updateExpenseFromScan()` — tetap bisa update dari AI scan
- `approveExpense()` — tetap bisa approve expense
- `getAllExpensesForYear()` — tetap sama

**Dampak ke data:** TIDAK ADA. Data tetap disimpan sama persis. Hanya cara mengirim ke browser yang berubah.

---

### 5. `src/components/keuangan/expense-dashboard-admin.tsx` — UI Image On-Demand

**Perubahan identik dengan file #2, khusus untuk halaman admin:**

- Interface `Expense`: `image: string | null` → `hasImage?: boolean`
- Import tambah `getExpenseImage`
- Tombol "Pratinjau Bukti" (mobile & desktop): load image on-demand via `getExpenseImage(item.id)`
- `handleOpenModal`: load image on-demand saat edit

**Dampak ke data:** TIDAK ADA. Hanya UI.

---

### 6. `prisma/schema.prisma` — Tambah 2 Baris Index

**Sebelum:**
```prisma
model expense {
  // ... field-field tetap sama ...

  @@index([userId])
  @@index([categoryId])
  @@map("Expense")
}
```

**Sesudah:**
```prisma
model expense {
  // ... field-field tetap sama persis, tidak ada yang berubah ...

  @@index([userId])
  @@index([categoryId])
  @@index([userId, date])   // BARU
  @@index([date])            // BARU
  @@map("Expense")
}
```

**Apa yang berubah:**
- Hanya menambah 2 baris `@@index` — TIDAK ada field yang ditambah, diubah, atau dihapus
- `@@index` = `CREATE INDEX` di SQL = menambah "daftar isi" untuk mempercepat pencarian
- Semua kolom, tipe data, relasi, constraint tetap 100% sama

**Dampak ke data:** TIDAK ADA. Index hanya membuat query lebih cepat menemukan data.

---

### 7. `sql/add-expense-indexes.sql` — File SQL Baru untuk Production

**File ini baru dibuat.** Isinya:
```sql
CREATE INDEX idx_expense_user_date ON Expense(userId, date);
CREATE INDEX idx_expense_date ON Expense(date);
```

**Kegunaan:** Dijalankan manual di phpMyAdmin VPS production karena kita tidak menggunakan `prisma migrate` di production.

---

## Langkah Deploy ke Production

### Urutan yang HARUS Diikuti:

**Langkah 1: Deploy code**
```
git push (atau merge ke main seperti biasa)
```
Rebuild dan restart service di VPS.

**Langkah 2: Jalankan SQL di phpMyAdmin**
1. Buka phpMyAdmin di VPS
2. Pilih database `production-app`
3. Klik tab **"SQL"**
4. Copy-paste isi file `sql/add-expense-indexes.sql`:
   ```sql
   CREATE INDEX idx_expense_user_date ON Expense(userId, date);
   CREATE INDEX idx_expense_date ON Expense(date);
   ```
5. Klik **"Go"** / **"Execute"**
6. Selesai

**Langkah 3: Verifikasi**
- Buka web, coba klik-klik sidebar — harus lebih cepat
- Buka halaman pengeluaran — list harus load lebih cepat
- Coba scan struk — polling harus stabil (tidak membuat web lag)
- Coba klik "Lihat Bukti" — image harus tetap muncul

---

## YANG HARUS DILAKUKAN

1. **Backup database SEBELUM jalankan SQL di production** (untuk jaga-jaga):
   ```bash
   mysqldump -u [user] -p production-app > backup_2026-04-10.sql
   ```

2. **Jalankan SQL di phpMyAdmin** setelah code di-deploy (lihat Langkah 2 di atas)

3. **Test semua fitur expense** setelah deploy:
   - Buat expense baru (manual) — harus berhasil
   - Buat expense via scan AI — harus berhasil
   - Edit expense — harus berhasil, image harus bisa di-load
   - Hapus expense — harus berhasil
   - Approve expense (draft) — harus berhasil
   - Lihat bukti/image — harus muncul saat diklik
   - Dashboard admin expense — harus tampil normal

4. **Test navigasi sidebar** — klik cepat antar halaman, harus responsif

5. **Test RBAC** — jika admin ubah konfigurasi role, pastikan perubahan berlaku (maks 60 detik)

---

## YANG DILARANG

1. **JANGAN jalankan `prisma migrate deploy` di production** — gunakan file SQL manual saja via phpMyAdmin

2. **JANGAN hapus file `sql/add-expense-indexes.sql`** — ini referensi untuk production

3. **JANGAN ubah `globalThis.prismaGlobal_v5 = prisma` di `prisma.ts`** menjadi conditional lagi — ini harus unconditional agar singleton bekerja di production

4. **JANGAN ubah dependency `[hasScanning]` di useEffect polling** menjadi `[expenses]` lagi — ini yang menyebabkan infinite loop

5. **JANGAN kembalikan `...expense` (spread) di `getExpenses()` dan `getAllExpenses()`** — ini yang menyebabkan image base64 dikirim ke browser setiap request

6. **JANGAN hapus `revalidateTag('rbac-config')` di `saveRbacConfig()`** — tanpa ini, cache RBAC tidak akan ter-invalidate saat admin ubah konfigurasi

7. **JANGAN jalankan `DROP INDEX` di production** kecuali ada masalah — index hanya mempercepat, menghapusnya hanya memperlambat

8. **JANGAN deploy saat jam sibuk** — jalankan SQL index saat traffic rendah (malam/pagi) untuk menghindari potensi lock singkat di MySQL

---

## Ringkasan Dampak

| Sebelum | Sesudah |
|---------|---------|
| Koneksi DB baru tiap request (production) | Koneksi DB di-reuse (singleton) |
| RBAC query DB setiap navigasi | RBAC di-cache 60 detik |
| Polling expense infinite loop saat AI scan | Polling stabil 5 detik, berhenti saat selesai |
| List expense kirim image base64 (ratusan KB-MB) | List kirim `hasImage: boolean`, image on-demand |
| Query expense tanpa compound index (full scan) | Query expense pakai compound index (instant) |
| Klik sidebar harus tunggu lama | Klik sidebar responsif |
