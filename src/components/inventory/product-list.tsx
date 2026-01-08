'use client'

import { useState } from 'react'
import { createProduct, deleteProduct, addStock, updateProduct, getAllProductsForExport } from '@/app/actions/product'
import { Plus, Trash2, AlertTriangle, Search, PackagePlus, ImageIcon, Edit, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react'
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

    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })

    // Add Stock Modal State
    const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null)
    const [addImagePreview, setAddImagePreview] = useState<string | null>(null)
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
    const [addImageFile, setAddImageFile] = useState<File | null>(null)
    const [editImageFile, setEditImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    const handleAddImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAddImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAddImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setEditImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
            setRemoveImage(false) // Reset remove flag if new image selected
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
            const data = await getAllProductsForExport()
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
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    const filteredProducts = initialProducts
        .sort((a, b) => {
            const { key, direction } = sortConfig
            const aValue: any = a[key]
            const bValue: any = b[key]

            if (aValue === null || bValue === null) return 0
            if (aValue === undefined || bValue === undefined) return 0

            if (aValue < bValue) return direction === 'asc' ? -1 : 1
            if (aValue > bValue) return direction === 'asc' ? 1 : -1
            return 0
        })

    const handlePageChange = (newPage: number) => {
        router.push(`/inventory?page=${newPage}`)
    }

    // Helper to render sort icon
    const SortIcon = ({ column }: { column: keyof Product }) => {
        if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground/30" />
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
                    {userRole === 'ADMIN' && (
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
                    {(userRole === 'ADMIN' || userRole === 'USER') && (
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

            {/* Add Product Form */}
            {isAdding && (
                <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-in slide-in-from-top-4 fade-in duration-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-foreground mb-4">New Product</h3>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
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
                                    <div className="border border-dashed border-border rounded-lg p-4 text-center hover:bg-accent transition-colors cursor-pointer relative bg-background/50">
                                        <input type="file" name="image" accept="image/*" onChange={handleAddImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">Click or Drag to upload thumbnail</p>
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
                                    placeholder="e.g. Tepung Terigu"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">SKU</label>
                                <input
                                    name="sku"
                                    value={addForm.sku}
                                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                    placeholder="e.g. RM-001"
                                />
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
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                                <textarea
                                    name="notes"
                                    value={addForm.notes}
                                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                    rows={2}
                                    placeholder="Additional information..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                            <button disabled={isLoading} type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-sm">
                                {isLoading ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 mt-10 mb-10">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Edit Product: {editingProduct.name}</h3>
                        <form action={handleUpdateProduct} className="space-y-4">
                            <input type="hidden" name="id" value={editingProduct.id} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
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
                                                    <input type="file" name="image" accept="image/*" onChange={handleEditImageChange} className="hidden" />
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
                                        <div className="border border-dashed border-border rounded-lg p-4 text-center hover:bg-accent transition-colors cursor-pointer relative bg-background/50">
                                            <input type="file" name="image" accept="image/*" onChange={handleEditImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                            <p className="text-sm text-muted-foreground">Click or Drag to upload new thumbnail</p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name</label>
                                    <input name="name" defaultValue={editingProduct.name} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">SKU</label>
                                    <input name="sku" defaultValue={editingProduct.sku || ''} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Low Stock Threshold</label>
                                    <input name="lowStockThreshold" type="number" defaultValue={editingProduct.lowStockThreshold} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" step="any" />
                                </div>
                                <div className="md:col-span-2">
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
            )}

            {/* Add Stock Modal */}
            {stockModalProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
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
            )}

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
                                    "p-4 transition-colors",
                                    isLowStock ? "bg-red-500/5" : ""
                                )}
                            >
                                <div className="flex gap-3 mb-3">
                                    {/* Image */}
                                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden relative border border-border flex-shrink-0">
                                        {product.image ? (
                                            <Image src={product.image} alt={product.name} fill className="object-cover" />
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
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Stock</p>
                                        <p className={cn("text-xl font-bold", isLowStock ? "text-red-500" : "text-emerald-500")}>
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

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-border">
                                    {(userRole === 'ADMIN' || userRole === 'USER') && (
                                        <button
                                            onClick={() => setEditingProduct(product)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 text-sm font-medium"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setStockModalProduct(product)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20 text-sm font-medium"
                                    >
                                        <PackagePlus className="w-4 h-4" />
                                        Restock
                                    </button>
                                    {userRole === 'ADMIN' && (
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
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

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted text-foreground uppercase font-medium">
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
                                                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border cursor-pointer">
                                                    {product.image ? (
                                                        <Image src={product.image} alt={product.name} fill className="object-cover" />
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
                                        <td className={cn("px-6 py-4 font-bold text-base", isLowStock ? "text-red-500" : "text-emerald-500")}>
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
                                                {(userRole === 'ADMIN' || userRole === 'USER') && (
                                                    <button
                                                        onClick={() => setEditingProduct(product)}
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
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors group-hover:block"
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
        </div>
    )
}
