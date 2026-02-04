'use client'

import { useState } from 'react'
import { createProduct, deleteProduct, addStock, updateProduct, getAllProductsForExport, moveToSparepartProject } from '@/app/actions/product'
import { getRacksWithUnusedDrawers } from '@/app/actions/rack'
import { Plus, Trash2, AlertTriangle, Search, PackagePlus, ImageIcon, Edit, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, Camera, Pencil, X, FolderKanban } from 'lucide-react'
import { processImageFile } from '@/utils/image-compression'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import ImportProductModal from './import-product-modal'
import { useEffect } from 'react'

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
    userRole
}: {
    initialProducts: Product[]
    totalPages: number
    currentPage: number
    userRole?: string
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = router

    const { showConfirmation } = useConfirmation()
    const { showError } = useAlert()
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

    // Sorting State (null = use server order, which is createdAt desc)
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

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
        setSortConfig((current) => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    const filteredProducts = sortConfig
        ? [...initialProducts].sort((a, b) => {
            const { key, direction } = sortConfig
            const aValue: any = a[key]
            const bValue: any = b[key]

            if (aValue === null || bValue === null) return 0
            if (aValue === undefined || bValue === undefined) return 0

            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
        })
        : initialProducts

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', newPage.toString())
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
            {/* Header / Controls */}
            <div className="flex justify-between items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search products or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    <div className="flex gap-2 flex-shrink-0">
                        {['ADMIN', 'HRD', 'TEKNISI', 'USER'].includes(userRole || '') && (
                            <>
                                <button
                                    onClick={handleExport}
                                    disabled={isLoading}
                                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                    title="Export"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                <ImportProductModal />
                            </>
                        )}
                        {['ADMIN', 'HRD', 'USER', 'TEKNISI'].includes(userRole || '') && (
                            <button
                                onClick={() => setIsAdding(!isAdding)}
                                className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm"
                                title="Add Product"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Product - Full Page on Mobile, Modal on Desktop */}
            {isAdding && (
                <>
                    {/* Mobile Full Page View */}
                    <div className="md:hidden fixed inset-0 z-[100] bg-background flex flex-col">
                        <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="p-2 hover:bg-accent rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h3 className="text-lg font-bold text-foreground">Tambah Produk Baru</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                            <form onSubmit={handleAddProduct} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Foto Produk</label>
                                    {addImagePreview ? (
                                        <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                            <img src={addImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAddImagePreview(null)
                                                    setAddImageFile(null)
                                                }}
                                                className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                            <div className="text-center mb-3">
                                                <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-xs text-muted-foreground">Upload gambar atau ambil foto (maks 1MB)</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <label className="flex-1 cursor-pointer">
                                                    <input type="file" name="image" accept="image/*" capture="environment" onChange={handleAddImageChange} className="hidden" />
                                                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                        <Camera className="w-4 h-4" />
                                                        Ambil Foto
                                                    </div>
                                                </label>
                                                <label className="flex-1 cursor-pointer">
                                                    <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleAddImageChange} className="hidden" />
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
                                        value={addForm.name}
                                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                        placeholder="e.g. Resistor SMD 1206"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">SKU (Lokasi Penyimpanan)</label>
                                    <input
                                        name="sku"
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
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
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
                                                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
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
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Stok Awal</label>
                                        <input
                                            name="stock"
                                            type="number"
                                            value={addForm.stock}
                                            onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                                            required
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            placeholder="0"
                                            step="any"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Min. Stok</label>
                                        <input
                                            name="lowStockThreshold"
                                            type="number"
                                            value={addForm.lowStockThreshold}
                                            onChange={(e) => setAddForm({ ...addForm, lowStockThreshold: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            step="any"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Catatan (Opsional)</label>
                                    <textarea
                                        name="notes"
                                        value={addForm.notes}
                                        onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                        rows={3}
                                        placeholder="Info tambahan, ukuran, atau penggunaan khusus..."
                                    />
                                </div>
                                <div className="pt-4">
                                    <button
                                        disabled={isLoading}
                                        type="submit"
                                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {isLoading ? 'Menyimpan...' : 'Simpan Produk'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Desktop Modal View */}
                    <div className="hidden md:flex fixed inset-0 z-[100] items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-border shrink-0 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-foreground">Create New Product</h3>
                                <button type="button" onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1">
                                <form onSubmit={handleAddProduct} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Product Image</label>
                                            {addImagePreview ? (
                                                <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                    <img src={addImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAddImagePreview(null)
                                                            setAddImageFile(null)
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                    <div className="text-center mb-3">
                                                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-xs text-muted-foreground">Upload gambar atau ambil foto (maks 1MB)</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept="image/*" capture="environment" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium">
                                                                <Camera className="w-4 h-4" />
                                                                Ambil Foto
                                                            </div>
                                                        </label>
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-xs font-medium">
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
                                            <input
                                                name="name"
                                                value={addForm.name}
                                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                                required
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                placeholder="e.g. Resistor SMD"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">SKU (Storage Location)</label>
                                            <input
                                                name="sku"
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
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
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
                                                            <span className="text-xs text-muted-foreground">Available Drawer</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Initial Stock</label>
                                            <input
                                                name="stock"
                                                type="number"
                                                value={addForm.stock}
                                                onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                                                required
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                placeholder="0"
                                                step="any"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Low Stock Threshold</label>
                                            <input
                                                name="lowStockThreshold"
                                                type="number"
                                                value={addForm.lowStockThreshold}
                                                onChange={(e) => setAddForm({ ...addForm, lowStockThreshold: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                step="any"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                                            <textarea
                                                name="notes"
                                                value={addForm.notes}
                                                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                rows={2}
                                                placeholder="Additional info, size, or specific usage..."
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                        <button disabled={isLoading} type="submit" className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm">
                                            {isLoading ? 'Creating...' : 'Create Product'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
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
                    <div className="hidden md:flex fixed inset-0 z-[100] items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-border shrink-0 flex items-center justify-between">
                                <h3 className="text-lg font-medium text-foreground">Edit Product: {editingProduct.name}</h3>
                                <button type="button" onClick={() => setEditingProduct(null)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1">
                                <form action={handleUpdateProduct} className="space-y-4">
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
                                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                                        <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                        <button disabled={isLoading} type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-sm">
                                            {isLoading ? 'Updating...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Add Stock Modal */}
            {
                stockModalProduct && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-foreground mb-2">Restock: {stockModalProduct.name}</h3>
                            <p className="text-sm text-muted-foreground mb-6">Current Stock: {stockModalProduct.stock}</p>

                            <form action={handleAddStock}>
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
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setStockModalProduct(null)} className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
                                    <button disabled={isLoading} type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                        {isLoading ? 'Processing...' : 'Confirm Add'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Products Display */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Mobile Card View */}
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
                                            <a href={product.image} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                                            </a>
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
                                <div className="flex items-center justify-between">
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
                                {['ADMIN', 'HRD', 'USER', 'TEKNISI'].includes(userRole || '') && (
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
                                )}
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
                                {['ADMIN', 'HRD'].includes(userRole || '') && (
                                    <>
                                        {userRole === 'ADMIN' && (
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
                                        )}
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
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted text-foreground uppercase font-normal">
                            <tr>
                                <th className="px-6 py-4">Image</th>
                                <th onClick={() => handleSort('name')} className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-1">Name <SortIcon column="name" /></div>
                                </th>
                                <th onClick={() => handleSort('sku')} className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-1">SKU <SortIcon column="sku" /></div>
                                </th>
                                <th onClick={() => handleSort('stock')} className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-1">Stock <SortIcon column="stock" /></div>
                                </th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProducts.map((product) => {
                                const isLowStock = product.stock <= product.lowStockThreshold
                                return (
                                    <tr
                                        key={product.id}
                                        className={cn(
                                            "hover:bg-accent/50 transition-colors group",
                                            isLowStock ? "bg-red-500/5 hover:bg-red-500/10" : ""
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="relative group/image">
                                                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border">
                                                    {product.image ? (
                                                        <a href={product.image} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                                                            <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                        </a>
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
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                                        <td className="px-6 py-4">{product.sku}</td>
                                        <td className={cn("px-6 py-4 font-bold text-base", product.stock <= 0 ? "text-red-500" : "text-emerald-500")}>
                                            {formatNumber(product.stock)}
                                        </td>
                                        <td className="px-6 py-4 max-w-[300px] whitespace-pre-wrap break-words text-muted-foreground">
                                            {product.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
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
                                                <span className="text-[10px] text-muted-foreground">Min: {product.lowStockThreshold}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {['ADMIN', 'HRD', 'USER'].includes(userRole || '') && (
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
                                                )}
                                                <button
                                                    onClick={() => setStockModalProduct(product)}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
                                                    title="Add Stock"
                                                >
                                                    <PackagePlus className="w-4 h-4" />
                                                </button>
                                                {userRole === 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleMoveToProject(product)}
                                                        className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/20"
                                                        title="Move to Sparepart Project"
                                                    >
                                                        <FolderKanban className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {['ADMIN', 'HRD'].includes(userRole || '') && (
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors group-hover:block"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        {searchTerm ? 'No products found matching your search.' : 'No products found. Start by adding one.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                    <p className="text-sm text-muted-foreground">
                        Page <span className="text-foreground font-medium">{currentPage}</span> of <span className="text-foreground font-medium">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div >
    )
}
