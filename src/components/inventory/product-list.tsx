'use client'

import { useState } from 'react'
import { createProduct, deleteProduct, addStock, updateProduct } from '@/app/actions/product'
import { Plus, Trash2, AlertTriangle, Search, PackagePlus, ImageIcon, Edit, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Product = {
    id: string
    name: string
    sku: string
    stock: number
    lowStockThreshold: number
    image: string | null
}

type SortConfig = {
    key: keyof Product
    direction: 'asc' | 'desc'
}

export default function ProductList({
    initialProducts,
    totalPages,
    currentPage
}: {
    initialProducts: Product[]
    totalPages: number
    currentPage: number
}) {
    const router = useRouter()
    const [isAdding, setIsAdding] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' })

    // Add Stock Modal State
    const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null)

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure?')) {
            await deleteProduct(id)
        }
    }

    async function handleAddProduct(formData: FormData) {
        setIsLoading(true)
        await createProduct(formData)
        setIsLoading(false)
        setIsAdding(false)
    }

    async function handleUpdateProduct(formData: FormData) {
        setIsLoading(true)
        await updateProduct(formData)
        setIsLoading(false)
        setEditingProduct(null)
    }

    async function handleAddStock(formData: FormData) {
        if (!stockModalProduct) return
        setIsLoading(true)
        const quantity = parseInt(formData.get('quantity') as string)
        await addStock(stockModalProduct.id, quantity)
        setIsLoading(false)
        setStockModalProduct(null)
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
        .filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const { key, direction } = sortConfig
            const aValue = a[key]
            const bValue = b[key]

            if (aValue === null || bValue === null) return 0

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search products or SKU (current page)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium text-sm whitespace-nowrap shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Add Product Form */}
            {isAdding && (
                <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-in slide-in-from-top-4 fade-in duration-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-foreground mb-4">New Product</h3>
                    <form action={handleAddProduct} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Product Image</label>
                                <div className="border border-dashed border-border rounded-lg p-4 text-center hover:bg-accent transition-colors cursor-pointer relative bg-background/50">
                                    <input type="file" name="image" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">Click or Drag to upload thumbnail</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name</label>
                                <input name="name" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" placeholder="e.g. Tepung Terigu" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">SKU</label>
                                <input name="sku" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" placeholder="e.g. RM-001" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Initial Stock</label>
                                <input name="stock" type="number" required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Low Stock Threshold</label>
                                <input name="lowStockThreshold" type="number" defaultValue={5} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
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
                                    <div className="border border-dashed border-border rounded-lg p-4 text-center hover:bg-accent transition-colors cursor-pointer relative bg-background/50">
                                        <input type="file" name="image" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground">Click or Drag to upload new thumbnail</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name</label>
                                    <input name="name" defaultValue={editingProduct.name} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">SKU</label>
                                    <input name="sku" defaultValue={editingProduct.sku} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Low Stock Threshold</label>
                                    <input name="lowStockThreshold" type="number" defaultValue={editingProduct.lowStockThreshold} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
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
                                    min="1"
                                    autoFocus
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-lg focus:border-emerald-500 outline-none"
                                    placeholder="0"
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

            {/* Products Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
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
                                            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border">
                                                {product.image ? (
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-600">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                                        <td className="px-6 py-4">{product.sku}</td>
                                        <td className={cn("px-6 py-4 font-bold text-base", isLowStock ? "text-red-500" : "text-emerald-500")}>
                                            {product.stock}
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
                                                <button
                                                    onClick={() => setEditingProduct(product)}
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
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors group-hover:block"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
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
