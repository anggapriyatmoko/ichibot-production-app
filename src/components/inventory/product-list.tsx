'use client'

import { useState } from 'react'
import { createProduct, deleteProduct, addStock, updateProduct, getAllProductsForExport, moveToSparepartProject } from '@/app/actions/product'
import { getRacksWithUnusedDrawers } from '@/app/actions/rack'
import { Plus, Trash2, AlertTriangle, Search, PackagePlus, ImageIcon, Edit, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, Camera, Pencil, X, FolderKanban, Package, Weight, Box, Info, Loader2 } from 'lucide-react'
import { processImageFile } from '@/utils/image-compression'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import ImportProductModal from './import-product-modal'
import Modal from '@/components/ui/modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useEffect } from 'react'
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
    TablePagination,
    TableHeaderContent
} from '@/components/ui/table'

// Helper to simplify error messages for users
function simplifyErrorMessage(error: any): string {
    const message = error?.message || String(error)

    // Check for Next.js body size limit error
    if (message.includes('Body exceeded') || message.includes('MB limit')) {
        return 'Maximum file size is 1MB'
    }

    // Return original message if no match
    return message
}

type Product = {
    id: string
    name: string
    sku: string | null
    stock: number
    lowStockThreshold: number
    image: string | null
    notes: string | null
}

type SortConfig = {
    key: keyof Product
    direction: 'asc' | 'desc'
}

export default function ProductList({
    initialProducts,
    totalPages,
    currentPage,
    itemsPerPage: initialItemsPerPage = 20,
    totalItems,
    userRole
}: {
    initialProducts: Product[]
    totalPages: number
    currentPage: number
    itemsPerPage?: number
    totalItems?: number
    userRole?: string
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = router

    const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

    const { showConfirmation } = useConfirmation()
    const { showError } = useAlert()
    const isDesktop = useMediaQuery('(min-width: 768px)')
    const [addForm, setAddForm] = useState<{
        name: string
        sku: string
        stock: string | number
        lowStockThreshold: string | number
        notes: string
    }>({
        name: '',
        sku: '',
        stock: '',
        lowStockThreshold: 5,
        notes: ''
    })

    const [isAdding, setIsAdding] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search')?.toString() || '')
    const [imagePreview, setImagePreview] = useState<{ url: string, name: string } | null>(null)
    const [imageSize, setImageSize] = useState<string>('')
    const [fileSize, setFileSize] = useState<string>('')

    // Sync URL with Search Term (Debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams)
            const currentSearch = params.get('search') || ''

            // Only update if search term has changed from what's in URL
            if (searchTerm !== currentSearch) {
                if (searchTerm) {
                    params.set('search', searchTerm)
                    params.set('page', '1') // Reset to page 1 on search
                } else {
                    params.delete('search')
                }
                replace(`${pathname}?${params.toString()}`)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, replace, pathname, searchParams])

    // Sorting State (Sync with URL)
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(() => {
        const sortBy = searchParams.get('sortBy') as keyof Product
        const order = searchParams.get('order') as 'asc' | 'desc'
        if (sortBy && order) {
            return { key: sortBy, direction: order }
        }
        return null
    })

    // Add Stock Modal State
    const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null)
    const [addImagePreview, setAddImagePreview] = useState<string | null>(null)
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
    const [addImageFile, setAddImageFile] = useState<File | null>(null)
    const [editImageFile, setEditImageFile] = useState<File | null>(null)

    // Mobile Action Modal State
    const [mobileActionItem, setMobileActionItem] = useState<Product | null>(null)

    // SKU Suggestion State
    const [allUnusedDrawers, setAllUnusedDrawers] = useState<string[]>([])
    const [skuSuggestions, setSkuSuggestions] = useState<string[]>([])
    const [showSkuSuggestions, setShowSkuSuggestions] = useState(false)
    const [editSkuValue, setEditSkuValue] = useState('')
    const [showEditSkuSuggestions, setShowEditSkuSuggestions] = useState(false)

    // Fetch unused drawers for SKU suggestions
    useEffect(() => {
        async function fetchUnusedDrawers() {
            try {
                const racks = await getRacksWithUnusedDrawers()
                const allDrawers = racks.flatMap(r => r.unusedDrawersList || [])
                setAllUnusedDrawers(allDrawers)
            } catch (error) {
                console.log('Could not fetch unused drawers', error)
            }
        }
        fetchUnusedDrawers()
    }, [])
    const [removeImage, setRemoveImage] = useState(false)

    // Lock body scroll when any modal is open
    useEffect(() => {
        const isAnyModalOpen = isAdding || !!editingProduct || !!stockModalProduct || !!mobileActionItem
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isAdding, editingProduct, stockModalProduct, mobileActionItem])

    const handleAddImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const processedFile = await processImageFile(file, showError)
            if (!processedFile) {
                e.target.value = ''
                return
            }

            setAddImageFile(processedFile)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAddImagePreview(reader.result as string)
            }
            reader.readAsDataURL(processedFile)
        }
    }

    const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const processedFile = await processImageFile(file, showError)
            if (!processedFile) {
                e.target.value = ''
                return
            }

            setEditImageFile(processedFile)
            const reader = new FileReader()
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string)
            }
            reader.readAsDataURL(processedFile)
            setRemoveImage(false)
        }
    }

    const handleDelete = async (id: string) => {
        showConfirmation({
            title: 'Delete Product',
            message: 'Are you sure you want to delete this item? This action cannot be undone.',
            type: 'confirm',
            action: async () => {
                await deleteProduct(id)
            }
        })
    }

    const handleMoveToProject = async (product: Product) => {
        showConfirmation({
            title: 'Pindah ke Sparepart Project',
            message: `Apakah Anda yakin ingin memindah "${product.name}" ke Sparepart Project? Produk akan dihapus dari Inventory.`,
            type: 'confirm',
            action: async () => {
                setIsLoading(true)
                try {
                    const result = await moveToSparepartProject(product.id)
                    if (result.success) {
                        router.refresh()
                    } else {
                        showError(result.error || 'Gagal memindah produk')
                    }
                } catch (error: any) {
                    showError(error.message || 'Terjadi kesalahan')
                } finally {
                    setIsLoading(false)
                }
            }
        })
    }

    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData()
        formData.append('name', addForm.name)
        formData.append('sku', addForm.sku)
        formData.append('stock', String(addForm.stock))
        formData.append('lowStockThreshold', String(addForm.lowStockThreshold))
        formData.append('notes', addForm.notes)

        if (addImageFile) {
            formData.set('image', addImageFile)
        }

        try {
            const result = await createProduct(formData)
            if (result?.error) {
                showError(`Failed to save product: ${result.error}`)
                return
            }
            setIsAdding(false)
            setAddImagePreview(null)
            setAddImageFile(null)
            setAddForm({ name: '', sku: '', stock: '', lowStockThreshold: 5, notes: '' })
        } catch (error: any) {
            console.error(error)
            showError(simplifyErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleUpdateProduct(formData: FormData) {
        if (editImageFile) {
            formData.set('image', editImageFile)
        }
        if (removeImage) {
            formData.set('removeImage', 'true')
        }
        setIsLoading(true)
        try {
            const result = await updateProduct(formData)
            if (result?.error) {
                showError(`Failed to update product: ${result.error}`)
                return
            }
            setEditingProduct(null)
            setEditImagePreview(null)
            setEditImageFile(null)
            setRemoveImage(false)
        } catch (error: any) {
            console.error(error)
            showError(simplifyErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAddStock(formData: FormData) {
        if (!stockModalProduct) return
        setIsLoading(true)
        const quantity = parseFloat(formData.get('quantity') as string)
        await addStock(stockModalProduct.id, quantity)
        setIsLoading(false)
        setStockModalProduct(null)
    }

    async function handleExport() {
        setIsLoading(true)
        try {
            const data = await getAllProductsForExport(window.location.origin)
            const headers = ['Product Name', 'SKU', 'Stock', 'Low Stock Threshold', 'Notes', 'Image URL']
            const rows = data.map(p => [
                p.name,
                p.sku || '',
                p.stock,
                p.lowStockThreshold,
                p.notes || '',
                p.image || ''
            ])

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
            XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
            XLSX.writeFile(wb, `Inventory_Export_${new Date().toISOString().split('T')[0]}.xlsx`)

        } catch (error) {
            console.error(error)
            showError('Failed to export inventory')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSort = (key: keyof Product) => {
        const newDirection = sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
        const params = new URLSearchParams(searchParams)
        params.set('sortBy', key)
        params.set('order', newDirection)
        params.set('page', '1') // Reset to page 1 on sort
        replace(`${pathname}?${params.toString()}`)
        setSortConfig({ key, direction: newDirection })
    }

    const filteredProducts = initialProducts

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', newPage.toString())
        params.set('limit', itemsPerPage.toString())
        replace(`${pathname}?${params.toString()}`)
    }

    const handleItemsPerPageChange = (count: number) => {
        setItemsPerPage(count)
        const params = new URLSearchParams(searchParams)
        params.set('page', '1')
        params.set('limit', count.toString())
        replace(`${pathname}?${params.toString()}`)
    }

    // Helper to render sort icon
    const SortIcon = ({ column }: { column: keyof Product }) => {
        if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground/30" />
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
            : <ArrowDown className="w-3 h-3 ml-1 text-primary" />
    }

    return (
        <div className="space-y-6">
            <TableWrapper>
                <TableHeaderContent
                    title="Data Sparepart Produksi & Riset"
                    description="Kelola stok dan data produk di gudang utama."
                    icon={<Package className="w-5 h-5 font-bold text-primary" />}
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Cari produk atau SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full sm:w-auto">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExport}
                                        disabled={isLoading}
                                        className="h-9 w-9 flex items-center justify-center border border-border hover:bg-muted text-foreground rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                        title="Export"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <div className="h-9 flex items-center">
                                        <ImportProductModal />
                                    </div>
                                    <button
                                        onClick={() => setIsAdding(!isAdding)}
                                        className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 shadow-sm flex items-center gap-2 whitespace-nowrap"
                                        title="Add Product"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Tambah
                                    </button>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* Add Product Form */}
                {isAdding && (
                    isDesktop ? (
                        <Modal
                            isOpen={isAdding}
                            onClose={() => setIsAdding(false)}
                            title="Tambah Produk Baru"
                            maxWidth="3xl"
                            footer={
                                <div className="flex justify-end gap-3 w-full">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        form="addProductForm"
                                        disabled={isLoading}
                                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Simpan Produk
                                    </button>
                                </div>
                            }
                        >
                            <form id="addProductForm" onSubmit={handleAddProduct} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Image Column */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 mt-1 tracking-wider">Foto Produk</label>
                                        <div className="relative group border-2 border-dashed border-border rounded-xl p-4 bg-background/50 hover:bg-background hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3">
                                            {addImagePreview ? (
                                                <div className="relative w-full">
                                                    <img src={addImagePreview} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAddImagePreview(null);
                                                            setAddImageFile(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 shadow-lg"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-muted/50 rounded-full text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors text-center">
                                                        <div className="flex gap-4 items-center justify-center">
                                                            <Camera className="w-6 h-6" />
                                                            <ImageIcon className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold">Kamera / Galeri</p>
                                                        <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP (Max 1MB)</p>
                                                    </div>
                                                    <div className="flex gap-2 w-full mt-2">
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" accept="image/*" capture="environment" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-center text-xs font-bold hover:bg-primary/90">Ambil Foto</div>
                                                        </label>
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" accept="image/*" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg text-center text-xs font-bold hover:bg-secondary/80">Pilih File</div>
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Form Column */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Nama Produk</label>
                                            <input
                                                type="text"
                                                value={addForm.name}
                                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm"
                                                required
                                                placeholder="e.g. Resistor SMD 1206"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">SKU (Lokasi Penyimpanan)</label>
                                            <input
                                                type="text"
                                                value={addForm.sku}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase()
                                                    setAddForm({ ...addForm, sku: val })
                                                    if (val.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowSkuSuggestions(true)
                                                    } else {
                                                        setSkuSuggestions([])
                                                        setShowSkuSuggestions(false)
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (addForm.sku.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(addForm.sku.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowSkuSuggestions(true)
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
                                                autoComplete="off"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm font-mono"
                                                placeholder="e.g. RK01-04"
                                            />
                                            {showSkuSuggestions && skuSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {skuSuggestions.map(sku => (
                                                        <button
                                                            key={sku}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddForm({ ...addForm, sku })
                                                                setShowSkuSuggestions(false)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="font-mono text-emerald-600">{sku}</span>
                                                            <span className="text-xs text-muted-foreground">Available</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider underline">Stok Awal</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={addForm.stock}
                                                        onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm"
                                                        required
                                                        placeholder="0"
                                                        step="any"
                                                    />
                                                    <Box className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Min. Stok</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={addForm.lowStockThreshold}
                                                        onChange={(e) => setAddForm({ ...addForm, lowStockThreshold: e.target.value })}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm"
                                                        placeholder="5"
                                                        step="any"
                                                    />
                                                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider leading-relaxed">Catatan (Opsional)</label>
                                            <textarea
                                                value={addForm.notes}
                                                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                                rows={2}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm resize-none"
                                                placeholder="Info tambahan..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </Modal>
                    ) : (
                        <div className="p-6 border-b border-border bg-muted/5 animate-in slide-in-from-top-4 duration-200">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                                <h3 className="text-lg font-bold">Tambah Produk Baru</h3>
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleAddProduct} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Image Column */}
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 mt-1 tracking-wider">Foto Produk</label>
                                        <div className="relative group border-2 border-dashed border-border rounded-xl p-4 bg-background/50 hover:bg-background hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3">
                                            {addImagePreview ? (
                                                <div className="relative w-full">
                                                    <img src={addImagePreview} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAddImagePreview(null);
                                                            setAddImageFile(null);
                                                        }}
                                                        className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 shadow-lg"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-4 bg-muted/50 rounded-full text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors text-center">
                                                        <div className="flex gap-4 items-center justify-center">
                                                            <Camera className="w-6 h-6" />
                                                            <ImageIcon className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold">Kamera / Galeri</p>
                                                        <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP (Max 1MB)</p>
                                                    </div>
                                                    <div className="flex gap-2 w-full mt-2">
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" accept="image/*" capture="environment" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-center text-xs font-bold hover:bg-primary/90">Ambil Foto</div>
                                                        </label>
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" accept="image/*" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg text-center text-xs font-bold hover:bg-secondary/80">Pilih File</div>
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Form Column */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Nama Produk</label>
                                            <input
                                                type="text"
                                                value={addForm.name}
                                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm"
                                                required
                                                placeholder="e.g. Resistor SMD 1206"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">SKU (Lokasi Penyimpanan)</label>
                                            <input
                                                type="text"
                                                value={addForm.sku}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase()
                                                    setAddForm({ ...addForm, sku: val })
                                                    if (val.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowSkuSuggestions(true)
                                                    } else {
                                                        setSkuSuggestions([])
                                                        setShowSkuSuggestions(false)
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (addForm.sku.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(addForm.sku.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowSkuSuggestions(true)
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
                                                autoComplete="off"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm font-mono"
                                                placeholder="e.g. RK01-04"
                                            />
                                            {showSkuSuggestions && skuSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {skuSuggestions.map(sku => (
                                                        <button
                                                            key={sku}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddForm({ ...addForm, sku })
                                                                setShowSkuSuggestions(false)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="font-mono text-emerald-600">{sku}</span>
                                                            <span className="text-xs text-muted-foreground">Available</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider underline">Stok Awal</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={addForm.stock}
                                                        onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm"
                                                        required
                                                        placeholder="0"
                                                        step="any"
                                                    />
                                                    <Box className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider">Min. Stok</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={addForm.lowStockThreshold}
                                                        onChange={(e) => setAddForm({ ...addForm, lowStockThreshold: e.target.value })}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm"
                                                        placeholder="5"
                                                        step="any"
                                                    />
                                                    <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-wider leading-relaxed">Catatan (Opsional)</label>
                                            <textarea
                                                value={addForm.notes}
                                                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                                rows={2}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all shadow-sm resize-none"
                                                placeholder="Info tambahan..."
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Simpan Produk
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )
                )}

                {/* Edit Product - Full Page on Mobile, Modal on Desktop */}
                {editingProduct && (
                    <>
                        {/* Mobile Full Page View */}
                        <div className="md:hidden fixed inset-0 z-[100] bg-background flex flex-col">
                            <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-lg font-bold text-foreground">Edit Produk</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                                <form action={handleUpdateProduct} className="space-y-4">
                                    <input type="hidden" name="id" value={editingProduct.id} />
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Ganti Gambar (Opsional)</label>
                                        {editImagePreview ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={editImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditImagePreview(null)
                                                        setEditImageFile(null)
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ) : editingProduct.image && !removeImage ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={editingProduct.image} alt="Current" className="w-full h-48 object-contain rounded" />
                                                <div className="flex justify-between mt-2 gap-2">
                                                    <label className="cursor-pointer flex-1 text-center py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium">
                                                        Ganti Gambar
                                                        <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRemoveImage(true)}
                                                        className="px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                <div className="text-center mb-3">
                                                    <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground">Upload gambar atau ambil foto (maks 1MB)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" name="image" accept="image/*" capture="environment" onChange={handleEditImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                            <Camera className="w-4 h-4" />
                                                            Ambil Foto
                                                        </div>
                                                    </label>
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                            <ImageIcon className="w-4 h-4" />
                                                            Pilih File
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Produk</label>
                                        <input
                                            name="name"
                                            defaultValue={editingProduct.name}
                                            required
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">SKU (Lokasi Penyimpanan)</label>
                                        <input
                                            name="sku"
                                            value={editSkuValue}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase()
                                                setEditSkuValue(val)
                                                if (val.length > 0) {
                                                    const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                    setSkuSuggestions(filtered.slice(0, 10))
                                                    setShowEditSkuSuggestions(true)
                                                } else {
                                                    setSkuSuggestions([])
                                                    setShowEditSkuSuggestions(false)
                                                }
                                            }}
                                            onFocus={() => {
                                                const currentVal = editSkuValue || editingProduct.sku || ''
                                                if (currentVal.length > 0) {
                                                    const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(currentVal.toLowerCase()))
                                                    setSkuSuggestions(filtered.slice(0, 10))
                                                    setShowEditSkuSuggestions(true)
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setShowEditSkuSuggestions(false), 200)}
                                            autoComplete="off"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                        />
                                        {showEditSkuSuggestions && skuSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {skuSuggestions.map(sku => (
                                                    <button
                                                        key={sku}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditSkuValue(sku)
                                                            setShowEditSkuSuggestions(false)
                                                        }}
                                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="font-mono text-emerald-600">{sku}</span>
                                                        <span className="text-xs text-muted-foreground">Available</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Min. Stok</label>
                                        <input
                                            name="lowStockThreshold"
                                            type="number"
                                            defaultValue={editingProduct.lowStockThreshold}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            step="any"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Catatan</label>
                                        <textarea
                                            name="notes"
                                            defaultValue={editingProduct.notes || ''}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            disabled={isLoading}
                                            type="submit"
                                            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Desktop Modal View */}
                        <div className="hidden md:block">
                            <Modal
                                isOpen={!!editingProduct}
                                onClose={() => setEditingProduct(null)}
                                title={`Edit Product: ${editingProduct.name}`}
                                maxWidth="2xl"
                                footer={
                                    <div className="flex justify-end gap-3 w-full">
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct(null)}
                                            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled={isLoading}
                                            type="submit"
                                            form="editProductDesktopForm"
                                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {isLoading ? 'Updating...' : 'Save Changes'}
                                        </button>
                                    </div>
                                }
                            >
                                <form id="editProductDesktopForm" action={handleUpdateProduct} className="space-y-4">
                                    <input type="hidden" name="id" value={editingProduct.id} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Change Image (Optional)</label>
                                            {editImagePreview ? (
                                                <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                    <img src={editImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditImagePreview(null)
                                                            setEditImageFile(null)
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : editingProduct.image && !removeImage ? (
                                                <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                    <img src={editingProduct.image} alt="Current" className="w-full h-48 object-contain rounded" />
                                                    <div className="flex justify-between mt-2 gap-2">
                                                        <label className="cursor-pointer flex-1 text-center py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-xs font-medium">
                                                            Change Image
                                                            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemoveImage(true)}
                                                            className="px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-medium"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                    <div className="text-center mb-3">
                                                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-sm text-muted-foreground">Upload gambar atau ambil foto</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Format: JPG, PNG, WEBP, GIF (maks 1MB)</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept="image/*" capture="environment" onChange={handleEditImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                                <Camera className="w-4 h-4" />
                                                                Ambil Foto
                                                            </div>
                                                        </label>
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                                <ImageIcon className="w-4 h-4" />
                                                                Pilih File
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name</label>
                                            <input name="name" defaultValue={editingProduct.name} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">SKU</label>
                                            <input
                                                name="sku"
                                                value={editSkuValue}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase()
                                                    setEditSkuValue(val)
                                                    if (val.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowEditSkuSuggestions(true)
                                                    } else {
                                                        setSkuSuggestions([])
                                                        setShowEditSkuSuggestions(false)
                                                    }
                                                }}
                                                onFocus={() => {
                                                    const currentVal = editSkuValue || editingProduct.sku || ''
                                                    if (currentVal.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(currentVal.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowEditSkuSuggestions(true)
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setShowEditSkuSuggestions(false), 200)}
                                                autoComplete="off"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                            />
                                            {showEditSkuSuggestions && skuSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {skuSuggestions.map(sku => (
                                                        <button
                                                            key={sku}
                                                            type="button"
                                                            onClick={() => {
                                                                setEditSkuValue(sku)
                                                                setShowEditSkuSuggestions(false)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="font-mono text-emerald-600">{sku}</span>
                                                            <span className="text-xs text-muted-foreground">Available</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Low Stock Threshold</label>
                                            <input name="lowStockThreshold" type="number" defaultValue={editingProduct.lowStockThreshold} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" step="any" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                                            <textarea name="notes" defaultValue={editingProduct.notes || ''} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" rows={3} />
                                        </div>
                                    </div>
                                </form>
                            </Modal>
                        </div>
                    </>
                )}

                {/* Add Stock Modal */}
                {
                    stockModalProduct && (
                        <Modal
                            isOpen={!!stockModalProduct}
                            onClose={() => setStockModalProduct(null)}
                            title={`Restock: ${stockModalProduct.name}`}
                            maxWidth="sm"
                            footer={
                                <div className="flex justify-end gap-3 w-full">
                                    <button
                                        type="button"
                                        onClick={() => setStockModalProduct(null)}
                                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-transparent"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={isLoading}
                                        type="submit"
                                        form="addStockForm"
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {isLoading ? 'Processing...' : 'Confirm Add'}
                                    </button>
                                </div>
                            }
                        >
                            <p className="text-sm text-muted-foreground mb-6">Current Stock: {stockModalProduct.stock}</p>
                            <form id="addStockForm" action={handleAddStock}>
                                <div className="mb-6">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity to Add</label>
                                    <input
                                        name="quantity"
                                        type="number"
                                        min="0"
                                        autoFocus
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-lg focus:border-emerald-500 outline-none"
                                        placeholder="0"
                                        step="0.001"
                                        title="Allow decimals (e.g. 1.5)"
                                    />
                                </div>
                            </form>
                        </Modal>
                    )
                }

                {/* Products Display */}
                {/* Header/Toolbar moved to TableHeaderContent at 387 */}

                {/* Mobile Card View - Using divide-y for items */}
                <div className="md:hidden divide-y divide-border">
                    {filteredProducts.map((product) => {
                        const isLowStock = product.stock <= product.lowStockThreshold
                        return (
                            <div
                                key={product.id}
                                className={cn(
                                    "p-4 transition-colors relative",
                                    isLowStock ? "bg-red-500/5" : ""
                                )}
                            >
                                {/* Action Pencil Button - Top Right */}
                                <button
                                    onClick={() => setMobileActionItem(product)}
                                    className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                                >
                                    <Pencil className="w-5 h-5" />
                                </button>

                                <div className="flex gap-3 mb-3 pr-10">
                                    {/* Image */}
                                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden relative border border-border flex-shrink-0">
                                        {product.image ? (
                                            <button type="button" onClick={() => { setImagePreview({ url: product.image!, name: product.name }); setImageSize(''); setFileSize('') }} className="block w-full h-full cursor-pointer">
                                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-600">
                                                <ImageIcon className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Name and SKU */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-foreground text-sm mb-1 truncate">{product.name}</h3>
                                        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                                        {product.notes && (
                                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">{product.notes}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Stock and Status */}
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Stock</p>
                                        <p className={cn("text-xl font-bold", product.stock <= 0 ? "text-red-500" : "text-emerald-500")}>
                                            {formatNumber(product.stock)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {isLowStock ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                <AlertTriangle className="w-3 h-3" />
                                                Low Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                In Stock
                                            </span>
                                        )}
                                        <p className="text-[10px] text-muted-foreground mt-1">Min: {product.lowStockThreshold}</p>
                                    </div>
                                </div>

                                {/* Mobile Quick Actions */}
                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                                    <button
                                        onClick={() => setStockModalProduct(product)}
                                        className="py-2 px-3 flex-1 flex items-center justify-center gap-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20 text-xs font-semibold bg-emerald-500/5"
                                        title="Add Stock"
                                    >
                                        <PackagePlus className="w-4 h-4" />
                                        Add Stock
                                    </button>
                                    <button
                                        onClick={() => handleMoveToProject(product)}
                                        className="py-2 px-3 flex-1 flex items-center justify-center gap-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/20 text-xs font-semibold bg-orange-500/5"
                                        title="Move to Sparepart Project"
                                    >
                                        <FolderKanban className="w-4 h-4" />
                                        To Project
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {filteredProducts.length === 0 && (
                        <div className="px-6 py-12 text-center text-muted-foreground">
                            {searchTerm ? 'No products found matching your search.' : 'No products found. Start by adding one.'}
                        </div>
                    )}
                </div>

                {/* Mobile Actions Modal */}
                {mobileActionItem && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setMobileActionItem(null)}
                    >
                        <div
                            className="bg-card border border-border rounded-xl p-5 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-foreground text-lg truncate max-w-[200px]">{mobileActionItem.name}</h3>
                                    <p className="text-xs text-muted-foreground">Select an action</p>
                                </div>
                                <button
                                    onClick={() => setMobileActionItem(null)}
                                    className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setEditSkuValue(mobileActionItem.sku || '')
                                        setEditingProduct(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-3 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors border border-blue-500/20 text-sm font-medium"
                                >
                                    <Edit className="w-5 h-5" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        setStockModalProduct(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-3 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors border border-emerald-500/20 text-sm font-medium"
                                >
                                    <PackagePlus className="w-5 h-5" />
                                    Restock
                                </button>
                                <button
                                    onClick={() => {
                                        handleMoveToProject(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="col-span-2 flex flex-row items-center justify-center gap-2 p-3 text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors border border-orange-500/20 text-sm font-medium"
                                >
                                    <FolderKanban className="w-5 h-5" />
                                    Move to Project
                                </button>
                                <button
                                    onClick={() => {
                                        handleDelete(mobileActionItem.id)
                                        setMobileActionItem(null)
                                    }}
                                    className="col-span-2 flex flex-row items-center justify-center gap-2 p-3 text-muted-foreground hover:text-white hover:bg-destructive rounded-xl transition-colors border border-border hover:border-destructive text-sm font-medium"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Delete Product
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                <TableScrollArea className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Image</TableHead>
                                <TableHead
                                    onClick={() => handleSort('name')}
                                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    Name <SortIcon column="name" />
                                </TableHead>
                                <TableHead
                                    onClick={() => handleSort('sku')}
                                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    SKU <SortIcon column="sku" />
                                </TableHead>
                                <TableHead
                                    onClick={() => handleSort('stock')}
                                    align="right"
                                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                                >
                                    Stock <SortIcon column="stock" />
                                </TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead align="center">Status</TableHead>
                                <TableHead align="right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => {
                                    const isLowStock = product.stock <= product.lowStockThreshold
                                    return (
                                        <TableRow
                                            key={product.id}
                                            className={cn(
                                                "group",
                                                isLowStock && "bg-destructive/5 hover:bg-destructive/10"
                                            )}
                                        >
                                            <TableCell>
                                                <div className="relative group/image">
                                                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border">
                                                        {product.image ? (
                                                            <button type="button" onClick={() => { setImagePreview({ url: product.image!, name: product.name }); setImageSize('') }} className="block w-full h-full cursor-pointer">
                                                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-gray-600">
                                                                <ImageIcon className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Hover Preview - Auto position left or right */}
                                                    {product.image && (
                                                        <>
                                                            {/* Show on right side by default */}
                                                            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover/image:opacity-100 group-hover/image:visible transition-all duration-200 pointer-events-none xl:block hidden">
                                                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-border p-2 w-52 h-52">
                                                                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                                                                        <Image src={product.image} alt={product.name} fill className="object-contain" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Show on left side for smaller screens or right edge */}
                                                            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover/image:opacity-100 group-hover/image:visible transition-all duration-200 pointer-events-none xl:hidden block">
                                                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-border p-2 w-52 h-52">
                                                                    <div className="relative w-full h-full rounded-lg overflow-hidden">
                                                                        <Image src={product.image} alt={product.name} fill className="object-contain" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                                            <TableCell align="right" className={cn("font-bold text-base", product.stock <= 0 ? "text-destructive" : "text-emerald-500")}>
                                                {formatNumber(product.stock)}
                                            </TableCell>
                                            <TableCell className="max-w-[300px] whitespace-pre-wrap break-words text-muted-foreground text-xs">
                                                {product.notes || '-'}
                                            </TableCell>
                                            <TableCell align="center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {isLowStock ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Low Stock
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            In Stock
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground uppercase font-medium">Min: {product.lowStockThreshold}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell align="right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditSkuValue(product.sku || '')
                                                            setEditingProduct(product)
                                                        }}
                                                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                                        title="Edit Product"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setStockModalProduct(product)}
                                                        className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
                                                        title="Add Stock"
                                                    >
                                                        <PackagePlus className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveToProject(product)}
                                                        className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/20"
                                                        title="Move to Sparepart Project"
                                                    >
                                                        <FolderKanban className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableEmpty
                                    colSpan={7}
                                    icon={<PackagePlus className="w-12 h-12 opacity-10" />}
                                    message="No products found."
                                    description={searchTerm ? 'Try adjusting your search filters.' : 'Start by adding your first product to the inventory.'}
                                />
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>

                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    totalCount={totalItems}
                />
            </TableWrapper>

            {/* Image Preview Modal */}
            {imagePreview && (
                <Modal
                    isOpen={!!imagePreview}
                    onClose={() => setImagePreview(null)}
                    title={imagePreview.name}
                    maxWidth="2xl"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground">{imageSize}{fileSize && ` (${fileSize})`}</span>
                            <div className="flex gap-2">
                                <a
                                    href={imagePreview.url}
                                    download={imagePreview.name}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download
                                </a>
                                <button
                                    onClick={() => setImagePreview(null)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="flex items-center justify-center p-4">
                        <img
                            src={imagePreview.url}
                            alt={imagePreview.name}
                            className="max-w-full max-h-[60vh] object-contain rounded-lg"
                            onLoad={(e) => {
                                const img = e.currentTarget
                                setImageSize(`${img.naturalWidth} × ${img.naturalHeight} px`)
                                fetch(img.src).then(res => res.blob()).then(blob => {
                                    const bytes = blob.size
                                    if (bytes >= 1024 * 1024) {
                                        setFileSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`)
                                    } else {
                                        setFileSize(`${(bytes / 1024).toFixed(1)} KB`)
                                    }
                                }).catch(() => { })
                            }}
                        />
                    </div>
                </Modal>
            )}
        </div>
    )
}
