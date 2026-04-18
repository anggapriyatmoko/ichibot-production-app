# Standard Pattern: Server-Side Table Pagination

## Catatan Penting (WAJIB DIBACA)

1. **Fokus pada Data Fetching**: Implementasi ini **HANYA** mengubah cara pengambilan data dari database ke klien agar sesuai porsi yang ditampilkan (misal: hanya ambil 20 data untuk halaman aktif).
2. **JANGAN Merubah Tampilan**: Dilarang keras merubah User Interface, struktur HTML tabel, kolom data, atau desain visual yang sudah ada. Tampilan dan fungsionalitas visual tabel **harus 100% sama persis** dengan versi client-side paginasi sebelumnya.
3. Setiap kali mengoptimasi tabel yang sudah ada ke server-side pagination, **ikuti pola di bawah ini** agar performa ringan tanpa merusak *user experience*.

---

## Arsitektur 3 Layer

### Layer 1: Server Action (src/app/actions/*.ts)

Buat fungsi server action dengan signature standar:

```typescript
export async function get[Entity]Paginated(params: {
    page?: number           // default 1
    perPage?: number        // default 10
    search?: string         // search keyword (enter-based)
    sortKey?: string        // column key to sort
    sortDirection?: 'asc' | 'desc' | null
    filters?: {             // advanced filters
        [filterName]: string  // 'all' | 'with' | 'without' | custom
    }
}) {
    // 1. Build WHERE clause dari search & filters
    // 2. Build ORDER BY dari sortKey & sortDirection
    // 3. COUNT total yang match
    // 4. FETCH hanya halaman yang diminta (skip + take)
    // 5. Jika ada relasi parent-child, fetch children terpisah
    // 6. Return { products, totalCount, totalPages, page, perPage }
}
```

**Referensi implementasi:** `getStoreProductsPaginated()` di `src/app/actions/store-product.ts`

Poin penting:
- `where.AND` push secara dinamis untuk setiap kondisi
- `parentId: null` untuk filter parent saja (child di-fetch terpisah)
- Sort mapping: `sortMap[sortKey] → Prisma orderBy`
- Filter `'all'` → tidak ada kondisi, `'with'` / `'without'` → push kondisi
- Price range: parse string → float, filter `gte`/`lte`
- Return `_variations` embedded di parent untuk variable products

### Layer 2: Page Component (src/app/(dashboard)/**/page.tsx)

```typescript
async function Content() {
    // Hanya ambil halaman pertama
    const result = await get[Entity]Paginated({ page: 1, perPage: 10 });
    return (
        <ListComponent
            initialProducts={result.products}
            initialTotalCount={result.totalCount}
            initialTotalPages={result.totalPages}
            serverSidePagination={true}
            // ... props lain
        />
    );
}
```

### Layer 3: Client Component (src/components/**/list.tsx)

Props yang wajib ditambahkan:
```typescript
serverSidePagination?: boolean    // flag mode server-side
initialTotalCount?: number        // total data dari server
initialTotalPages?: number        // total halaman dari server
```

---

## Aturan Client Component (saat serverSidePagination=true)

### 1. Search: Enter-to-Search
- Ada 2 state: `pendingSearch` (ketikan user) dan `searchTerm` (aktif)
- `onChange` → update `pendingSearch` saja
- `onKeyDown Enter` → copy `pendingSearch` ke `searchTerm` → panggil `fetchServerData()`
- Tambahkan tombol X untuk clear search
- Placeholder: "Cari lalu tekan Enter..."

### 2. Pagination: Fetch per Page
- `handlePageChange()` → panggil `fetchServerData({ page: newPage })`
- `onItemsPerPageChange()` → panggil `fetchServerData({ page: 1, perPage: count })`

### 3. Sort: Re-fetch dari Server
- `handleSort()` → panggil `fetchServerData({ page: 1, sortKey, sortDirection })`
- Reset ke page 1 saat sort berubah

### 4. Filter: Re-fetch dari Server  
- Gunakan `useEffect` yang watch `JSON.stringify(filters)`
- Skip first render dengan `isFirstRender` ref
- Reset ke page 1 saat filter berubah

### 5. Loading State
- State `isServerLoading` → tampilkan overlay transparan di atas tabel
- Overlay: `bg-background/60 backdrop-blur-[1px]` dengan spinner

### 6. Data Display (Tanpa Merubah UI Header/Row)
- JANGAN merubah `TableRow`, `TableCell`, warna, formating angka, atau letak tombol aksi di dalam component.
- Cukup rubah variabel sumber data tabelnya saja dari array asli menjadi versi paginated lokal:
  - `paginatedProducts = serverSidePagination ? localProducts : filteredProducts.slice(...)`
  - `totalPages = serverSidePagination ? serverTotalPages : Math.ceil(...)`
  - `totalCount = serverSidePagination ? serverTotalCount : filteredProducts.length`

### 7. Analisa / Statistik Section
- **DISABLE** section yang membutuhkan semua data (seperti "Analisa Produk")
- Tampilkan placeholder: "Fitur ini dinonaktifkan pada mode server-side pagination"
- Atau buat server-side aggregation terpisah jika dibutuhkan

### 8. Post-Sync Refresh
- Saat sync selesai, panggil `fetchServerData()` (bukan `getStoreProducts()`)

---

## Fungsi fetchServerData (Template)

```typescript
const fetchServerData = useCallback(async (params: {
    page?: number,
    perPage?: number,
    search?: string,
    sortKey?: string,
    sortDirection?: 'asc' | 'desc' | null,
    filters?: any
}) => {
    if (!serverSidePagination) return
    setIsServerLoading(true)
    try {
        const result = await get[Entity]Paginated({
            page: params.page ?? 1,
            perPage: params.perPage ?? itemsPerPage,
            search: params.search ?? searchTerm,
            sortKey: params.sortKey,
            sortDirection: params.sortDirection,
            filters: params.filters ?? filtersRef.current,
        })
        // Flatten variations if needed
        const flatProducts = flattenResult(result.products)
        setLocalProducts(flatProducts)
        setServerTotalCount(result.totalCount)
        setServerTotalPages(result.totalPages)
    } catch (error) {
        console.error('Server fetch error:', error)
    } finally {
        setIsServerLoading(false)
    }
}, [serverSidePagination, itemsPerPage, searchTerm])
```

---

## Kompatibilitas Mundur

- **JANGAN hapus** fungsi lama (`getStoreProducts()`) karena masih digunakan page lain
- Props `serverSidePagination` default `false` → page lain tetap client-side
- Semua logika `filteredProducts` useMemo tetap ada → berjalan saat `serverSidePagination=false`
- Komponen yang sama bisa digunakan di 2 mode
