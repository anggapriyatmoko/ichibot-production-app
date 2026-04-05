'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Package, FolderOpen, Image as ImageIcon, X, Eye } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TablePagination,
    TableHeaderContent,
} from '@/components/ui/table'
import {
    createIchicraftCategory,
    updateIchicraftCategory,
    deleteIchicraftCategory,
    createIchicraftProduct,
    updateIchicraftProduct,
    deleteIchicraftProduct,
} from '@/app/actions/ichicraft-product'

// ============================================================================
// TYPES
// ============================================================================

type Product = {
    id: string
    categoryId: string
    name: string
    keterangan: string | null
    satuan: string
    harga: number
    image: string | null
    createdAt: Date
    updatedAt: Date
}

type Category = {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
    products: Product[]
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function IchicraftProductManager({
    initialCategories
}: {
    initialCategories: Category[]
}) {
    const [categories, setCategories] = useState<Category[]>(initialCategories)
    const [loading, setLoading] = useState(false)

    // Modal states
    const [categoryModalOpen, setCategoryModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [categoryName, setCategoryName] = useState('')

    const [productModalOpen, setProductModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [productCategoryId, setProductCategoryId] = useState('')
    const [productForm, setProductForm] = useState<{
        name: string
        keterangan: string
        satuan: string
        harga: string
        image: File | null
        imagePreview: string | null
        removeImage: boolean
    }>({
        name: '',
        keterangan: '',
        satuan: '',
        harga: '',
        image: null,
        imagePreview: null,
        removeImage: false
    })

    const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'product'; id: string; name: string } | null>(null)

    // ========================================================================
    // CATEGORY HANDLERS
    // ========================================================================

    const openAddCategory = () => {
        setEditingCategory(null)
        setCategoryName('')
        setCategoryModalOpen(true)
    }

    const openEditCategory = (cat: Category) => {
        setEditingCategory(cat)
        setCategoryName(cat.name)
        setCategoryModalOpen(true)
    }

    const handleSaveCategory = async () => {
        if (!categoryName.trim()) return
        setLoading(true)
        try {
            if (editingCategory) {
                const res = await updateIchicraftCategory(editingCategory.id, { name: categoryName.trim() })
                if (res.success) {
                    setCategories(prev => prev.map(c =>
                        c.id === editingCategory.id ? { ...c, name: categoryName.trim() } : c
                    ))
                } else {
                    alert(res.error)
                }
            } else {
                const res = await createIchicraftCategory({ name: categoryName.trim() })
                if (res.success && res.data) {
                    setCategories(prev => [...prev, { ...res.data!, products: [], createdAt: new Date(), updatedAt: new Date() }])
                } else {
                    alert(res.error)
                }
            }
            setCategoryModalOpen(false)
        } catch {
            alert('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    // ========================================================================
    // PRODUCT HANDLERS
    // ========================================================================

    const openAddProduct = (categoryId: string) => {
        setEditingProduct(null)
        setProductCategoryId(categoryId)
        setProductForm({ name: '', keterangan: '', satuan: '', harga: '', image: null, imagePreview: null, removeImage: false })
        setProductModalOpen(true)
    }

    const openEditProduct = (product: Product) => {
        setEditingProduct(product)
        setProductCategoryId(product.categoryId)
        setProductForm({
            name: product.name,
            keterangan: product.keterangan || '',
            satuan: product.satuan,
            harga: product.harga.toString(),
            image: null,
            imagePreview: product.image || null,
            removeImage: false
        })
        setProductModalOpen(true)
    }

    const handleSaveProduct = async () => {
        if (!productForm.name.trim() || !productForm.satuan.trim()) return

        if (productForm.image && productForm.image.size > 1024 * 1024) {
            alert('Ukuran gambar maksimal 1MB!')
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('categoryId', productCategoryId)
            formData.append('name', productForm.name.trim())
            if (productForm.keterangan.trim()) formData.append('keterangan', productForm.keterangan.trim())
            formData.append('satuan', productForm.satuan.trim())
            formData.append('harga', (parseFloat(productForm.harga) || 0).toString())
            if (productForm.image) formData.append('image', productForm.image)
            if (productForm.removeImage) formData.append('removeImage', 'true')

            if (editingProduct) {
                const res = await updateIchicraftProduct(editingProduct.id, formData)
                if (res.success && res.data) {
                    setCategories(prev => prev.map(c => ({
                        ...c,
                        products: c.products.map(p =>
                            p.id === editingProduct.id ? { ...p, ...(res.data as Product) } : p
                        )
                    })))
                } else {
                    alert(res.error)
                }
            } else {
                const res = await createIchicraftProduct(formData)
                if (res.success && res.data) {
                    setCategories(prev => prev.map(c => {
                        if (c.id === productCategoryId) {
                            return { ...c, products: [...c.products, res.data as Product] }
                        }
                        return c
                    }))
                } else {
                    alert(res.error)
                }
            }
            setProductModalOpen(false)
        } catch {
            alert('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    // ========================================================================
    // DELETE HANDLERS
    // ========================================================================

    const confirmDelete = (type: 'category' | 'product', id: string, name: string) => {
        setDeleteTarget({ type, id, name })
        setDeleteModalOpen(true)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setLoading(true)
        try {
            if (deleteTarget.type === 'category') {
                const res = await deleteIchicraftCategory(deleteTarget.id)
                if (res.success) {
                    setCategories(prev => prev.filter(c => c.id !== deleteTarget.id))
                } else {
                    alert(res.error)
                }
            } else {
                const res = await deleteIchicraftProduct(deleteTarget.id)
                if (res.success) {
                    setCategories(prev => prev.map(c => ({
                        ...c,
                        products: c.products.filter(p => p.id !== deleteTarget.id)
                    })))
                } else {
                    alert(res.error)
                }
            }
            setDeleteModalOpen(false)
            setDeleteTarget(null)
        } catch {
            alert('Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* Header with Add Category button */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">Ichicraft Product</h1>
                    <p className="text-muted-foreground text-sm">Kelola kategori dan produk Ichicraft.</p>
                </div>
                <Button onClick={openAddCategory} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Kategori
                </Button>
            </div>

            {/* Categories */}
            {categories.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center">
                    <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                    <p className="text-muted-foreground font-medium">Belum ada kategori.</p>
                    <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Kategori" untuk memulai.</p>
                </div>
            ) : (
                categories.map(category => (
                    <CategorySection
                        key={category.id}
                        category={category}
                        onEditCategory={() => openEditCategory(category)}
                        onDeleteCategory={() => confirmDelete('category', category.id, category.name)}
                        onAddProduct={() => openAddProduct(category.id)}
                        onEditProduct={openEditProduct}
                        onDeleteProduct={(p) => confirmDelete('product', p.id, p.name)}
                        onViewProduct={setViewingProduct}
                    />
                ))
            )}

            {/* Category Modal */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title={editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setCategoryModalOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveCategory} disabled={loading || !categoryName.trim()}>
                            {loading ? 'Menyimpan...' : 'Save'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName">Nama Kategori</Label>
                        <Input
                            id="categoryName"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="Masukkan nama kategori"
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                            autoFocus
                        />
                    </div>
                </div>
            </Modal>

            {/* Product Modal */}
            <Modal
                isOpen={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                title={editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setProductModalOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveProduct}
                            disabled={loading || !productForm.name.trim() || !productForm.satuan.trim()}
                        >
                            {loading ? 'Menyimpan...' : 'Save'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="productName">Nama Produk</Label>
                        <Input
                            id="productName"
                            value={productForm.name}
                            onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Masukkan nama produk"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="productKeterangan">Keterangan</Label>
                        <textarea
                            id="productKeterangan"
                            value={productForm.keterangan}
                            onChange={(e) => setProductForm(p => ({ ...p, keterangan: e.target.value }))}
                            placeholder="Masukkan keterangan (opsional)"
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="productSatuan">Satuan</Label>
                            <Input
                                id="productSatuan"
                                value={productForm.satuan}
                                onChange={(e) => setProductForm(p => ({ ...p, satuan: e.target.value }))}
                                placeholder="pcs, kg, meter, dll"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="productHarga">Harga Satuan</Label>
                            <Input
                                id="productHarga"
                                type="number"
                                value={productForm.harga}
                                onChange={(e) => setProductForm(p => ({ ...p, harga: e.target.value }))}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Gambar Produk (Opsional, Max 1MB)</Label>
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                                {productForm.imagePreview && !productForm.removeImage ? (
                                    <>
                                        <Image src={productForm.imagePreview} alt="Preview" fill className="object-cover" />
                                        <button
                                            onClick={() => setProductForm(p => ({ ...p, image: null, imagePreview: null, removeImage: true }))}
                                            className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded-full p-0.5 text-muted-foreground hover:text-destructive transition-colors shadow-sm"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                )}
                            </div>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null
                                    if (file && file.size > 1024 * 1024) {
                                        alert('Ukuran gambar maksimal 1MB!')
                                        e.target.value = ''
                                        return
                                    }
                                    setProductForm(p => ({
                                        ...p,
                                        image: file,
                                        imagePreview: file ? URL.createObjectURL(file) : null,
                                        removeImage: false
                                    }))
                                }}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Konfirmasi Hapus"
                maxWidth="sm"
                footer={
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            {loading ? 'Menghapus...' : 'Hapus'}
                        </Button>
                    </div>
                }
            >
                <p className="text-sm text-muted-foreground">
                    Apakah Anda yakin ingin menghapus {deleteTarget?.type === 'category' ? 'kategori' : 'produk'}{' '}
                    <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
                    {deleteTarget?.type === 'category' && (
                        <span className="block mt-2 text-destructive font-medium">
                            Semua produk dalam kategori ini juga akan ikut terhapus.
                        </span>
                    )}
                </p>
                <p className="text-sm text-muted-foreground mt-2">Tindakan ini tidak dapat dibatalkan.</p>
            </Modal>

            {/* Product Detail Modal */}
            <Modal
                isOpen={!!viewingProduct}
                onClose={() => setViewingProduct(null)}
                title={viewingProduct?.name || "Detail Produk"}
                maxWidth="3xl"
            >
                {viewingProduct && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                        {/* Image Section */}
                        <div className="flex flex-col items-center justify-center bg-background border border-border rounded-xl relative aspect-square md:aspect-auto overflow-hidden shadow-sm">
                            {viewingProduct.image ? (
                                <Image src={viewingProduct.image} alt={viewingProduct.name} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <Package className="w-24 h-24 text-muted-foreground/30" />
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="flex flex-col space-y-4">
                            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight hidden md:block">
                                {viewingProduct.name}
                            </h2>
                            <div className="space-y-1">
                                <div className="text-3xl font-black text-primary">
                                    Rp {new Intl.NumberFormat('id-ID').format(viewingProduct.harga)}
                                </div>
                                <div className="text-xs font-semibold px-2 py-0.5 mt-2 rounded bg-muted border border-border text-foreground w-fit">
                                    Satuan: {viewingProduct.satuan.toUpperCase()}
                                </div>
                            </div>
                            
                            <hr className="border-border my-2" />

                            <div className="flex-1 space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                                <h3 className="font-bold text-sm">Deskripsi Produk</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {viewingProduct.keterangan || 'Tidak ada keterangan khusus untuk produk ini.'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

// ============================================================================
// CATEGORY SECTION COMPONENT
// ============================================================================

function CategorySection({
    category,
    onEditCategory,
    onDeleteCategory,
    onAddProduct,
    onEditProduct,
    onDeleteProduct,
    onViewProduct
}: {
    category: Category
    onEditCategory: () => void
    onDeleteCategory: () => void
    onAddProduct: () => void
    onEditProduct: (product: Product) => void
    onDeleteProduct: (product: Product) => void
    onViewProduct: (product: Product) => void
}) {
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)

    const products = category.products
    const totalCount = products.length
    const totalPages = Math.ceil(totalCount / itemsPerPage)

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return products.slice(start, start + itemsPerPage)
    }, [products, currentPage, itemsPerPage])

    // Reset to page 1 if current page exceeds total
    React.useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages)
        }
    }, [totalPages, currentPage])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value)
    }

    const COL_COUNT = 6

    return (
        <TableWrapper>
            <TableHeaderContent
                title={category.name}
                description={`${totalCount} produk`}
                icon={<Package className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={onAddProduct} className="gap-1.5">
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Produk
                        </Button>
                        <Button size="sm" variant="outline" onClick={onEditCategory} className="gap-1.5">
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={onDeleteCategory} className="gap-1.5 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                }
            />

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow hoverable={false}>
                            <TableHead className="w-[60px]" align="center">No</TableHead>
                            <TableHead>Nama Produk</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="w-[120px]">Satuan</TableHead>
                            <TableHead className="w-[160px]" align="right">Harga Satuan</TableHead>
                            <TableHead className="w-[100px]" align="center">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedProducts.length === 0 ? (
                            <TableEmpty
                                colSpan={COL_COUNT}
                                message="Belum ada produk"
                                description="Klik 'Tambah Produk' untuk menambahkan produk ke kategori ini."
                            />
                        ) : (
                            paginatedProducts.map((product, idx) => (
                                <TableRow key={product.id}>
                                    <TableCell align="center" className="text-muted-foreground">
                                        {(currentPage - 1) * itemsPerPage + idx + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-8 h-8 rounded shrink-0 bg-muted/50 border border-border flex items-center justify-center overflow-hidden">
                                                {product.image ? (
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                                                )}
                                            </div>
                                            <span className="font-medium">{product.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                                        {product.keterangan || '-'}
                                    </TableCell>
                                    <TableCell>{product.satuan}</TableCell>
                                    <TableCell align="right" className="font-medium tabular-nums">
                                        {formatCurrency(product.harga)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => onViewProduct(product)}
                                                className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                                title="Lihat Detail"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onEditProduct(product)}
                                                className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteProduct(product)}
                                                className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors text-muted-foreground hover:text-destructive"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableScrollArea>

            {totalCount > 0 && (
                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(val) => {
                        setItemsPerPage(val)
                        setCurrentPage(1)
                    }}
                    pageSizeOptions={[10, 20, 50, 100]}
                    totalCount={totalCount}
                />
            )}
        </TableWrapper>
    )
}
