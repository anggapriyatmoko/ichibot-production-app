# Composable Table Components

Komponen tabel yang terstandarisasi dan dapat dikombinasikan untuk konsistensi UI di seluruh aplikasi.

## Import

```tsx
import {
  TableWrapper,
  TableScrollArea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  TablePagination,
} from '@/components/ui/table'
```

## Components Overview

| Component | Deskripsi |
|-----------|-----------|
| `TableWrapper` | Container dengan border, shadow, dan loading overlay |
| `TableScrollArea` | Scroll horizontal, mencegah scroll vertikal |
| `Table` | Element `<table>` dengan styling default |
| `TableHeader` | Element `<thead>` dengan background muted |
| `TableBody` | Element `<tbody>` dengan divider |
| `TableRow` | Element `<tr>` dengan hover effect |
| `TableHead` | Element `<th>` untuk header cell |
| `TableCell` | Element `<td>` untuk data cell |
| `TableEmpty` | Placeholder ketika tidak ada data |
| `TableLoading` | Skeleton loading rows |
| `TablePagination` | Kontrol pagination |

---

## Basic Usage

```tsx
<TableWrapper>
  <TableScrollArea>
    <Table>
      <TableHeader>
        <TableRow hoverable={false}>
          <TableHead>Nama</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead align="right">Stok</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell mono>{product.sku}</TableCell>
            <TableCell align="right">{product.stock}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableScrollArea>
</TableWrapper>
```

---

## With Loading State

```tsx
const [loading, setLoading] = useState(true)

<TableWrapper loading={loading}>
  <TableScrollArea>
    <Table>
      <TableHeader>
        <TableRow hoverable={false}>
          <TableHead>Nama</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableLoading colSpan={2} rows={5} />
        ) : (
          data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.status}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </TableScrollArea>
</TableWrapper>
```

---

## With Empty State

```tsx
<TableWrapper>
  <TableScrollArea>
    <Table>
      <TableHeader>
        <TableRow hoverable={false}>
          <TableHead>Nama</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableEmpty 
            colSpan={2} 
            message="Tidak ada data ditemukan."
            icon={<Package className="w-12 h-12 opacity-20" />}
          />
        ) : (
          data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.email}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </TableScrollArea>
</TableWrapper>
```

---

## With Pagination

```tsx
const [currentPage, setCurrentPage] = useState(1)
const itemsPerPage = 10
const totalPages = Math.ceil(data.length / itemsPerPage)
const paginatedData = data.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)

<TableWrapper>
  <TableScrollArea>
    <Table>
      <TableHeader>
        <TableRow hoverable={false}>
          <TableHead>Nama</TableHead>
          <TableHead>Tanggal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableScrollArea>
  <TablePagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    currentCount={paginatedData.length}
    totalCount={data.length}
  />
</TableWrapper>
```

---

## Desktop Only Table (Hidden on Mobile)

```tsx
<TableWrapper>
  <TableScrollArea desktopOnly>
    <Table>
      {/* ... */}
    </Table>
  </TableScrollArea>
</TableWrapper>
```

---

## Props Reference

### TableWrapper

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | `false` | Tampilkan loading overlay |
| `card` | `boolean` | `true` | Gunakan style card (border, shadow, rounded) |
| `className` | `string` | - | Class tambahan |

### TableScrollArea

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `desktopOnly` | `boolean` | `false` | Sembunyikan di mobile, tampilkan di md+ |
| `className` | `string` | - | Class tambahan |

### TableHead / TableCell

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment |
| `mono` | `boolean` | `false` | (TableCell only) Gunakan font monospace |
| `truncate` | `boolean` | `false` | (TableCell only) Potong text panjang |
| `sortable` | `boolean` | `false` | (TableHead only) Tampilkan sebagai sortable |
| `sorted` | `'asc' \| 'desc' \| false` | `false` | (TableHead only) Arah sort saat ini |

### TableRow

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hoverable` | `boolean` | `true` | Tambahkan hover effect |

### TableEmpty

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colSpan` | `number` | **required** | Jumlah kolom untuk di-span |
| `message` | `string` | `"No data found."` | Pesan yang ditampilkan |
| `icon` | `ReactNode` | - | Icon opsional |

### TableLoading

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `colSpan` | `number` | **required** | Jumlah kolom untuk di-span |
| `rows` | `number` | `3` | Jumlah skeleton rows |

### TablePagination

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPage` | `number` | **required** | Halaman saat ini (1-indexed) |
| `totalPages` | `number` | **required** | Total halaman |
| `onPageChange` | `(page: number) => void` | **required** | Callback saat halaman berubah |
| `showInfo` | `boolean` | `true` | Tampilkan info item count |
| `currentCount` | `number` | - | Jumlah item di halaman saat ini |
| `totalCount` | `number` | - | Total item keseluruhan |

---

## Full Example

```tsx
'use client'

import { useState } from 'react'
import { Pencil, Trash2, Package } from 'lucide-react'
import {
  TableWrapper,
  TableScrollArea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
  TablePagination,
} from '@/components/ui/table'

interface Product {
  id: string
  name: string
  sku: string
  stock: number
}

export default function ProductTable({ products }: { products: Product[] }) {
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const totalPages = Math.ceil(products.length / itemsPerPage)
  const paginatedProducts = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <TableWrapper loading={loading}>
      <TableScrollArea desktopOnly>
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead className="w-[40%]">Nama Produk</TableHead>
              <TableHead className="w-[20%]">SKU</TableHead>
              <TableHead className="w-[15%]" align="right">Stok</TableHead>
              <TableHead className="w-[25%]" align="center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableLoading colSpan={4} rows={5} />
            ) : paginatedProducts.length === 0 ? (
              <TableEmpty 
                colSpan={4} 
                message="Belum ada produk."
                icon={<Package className="w-12 h-12 opacity-20" />}
              />
            ) : (
              paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell mono className="text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell align="right" className="font-bold">
                    {product.stock}
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 hover:bg-primary/10 text-primary rounded-lg">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 text-destructive rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableScrollArea>
      
      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        currentCount={paginatedProducts.length}
        totalCount={products.length}
      />
    </TableWrapper>
  )
}
```

---

## Migration Guide

Untuk migrasi tabel yang sudah ada:

1. Ganti wrapper `<div className="bg-card border...">` dengan `<TableWrapper>`
2. Ganti `<div className="overflow-x-auto...">` dengan `<TableScrollArea>`
3. Ganti `<table className="...">` dengan `<Table>`
4. Ganti `<thead className="...">` dengan `<TableHeader>`
5. Ganti `<tbody className="...">` dengan `<TableBody>`
6. Ganti `<tr>` dengan `<TableRow>`
7. Ganti `<th>` dengan `<TableHead>`
8. Ganti `<td>` dengan `<TableCell>`
9. Ganti empty state `<tr><td colSpan>...</td></tr>` dengan `<TableEmpty>`
10. Ganti pagination custom dengan `<TablePagination>`
