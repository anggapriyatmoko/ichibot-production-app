'use client'

import { useState } from 'react'
import { createProduct, deleteProduct, addStock } from '@/app/actions/product'
import { Plus, Trash2, AlertTriangle, Search, Filter, PackagePlus, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type Product = {
    id: string
    name: string
    sku: string
    stock: number
    lowStockThreshold: number
    image: string | null
}

export default function ProductList({ initialProducts }: { initialProducts: Product[] }) {
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc'>('name')

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

    async function handleAddStock(formData: FormData) {
        if (!stockModalProduct) return
        setIsLoading(true)
        const quantity = parseInt(formData.get('quantity') as string)
        await addStock(stockModalProduct.id, quantity)
        setIsLoading(false)
        setStockModalProduct(null)
    }

    // Filter and Sort
    const filteredProducts = initialProducts
        .filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name)
            if (sortBy === 'stock_asc') return a.stock - b.stock
            if (sortBy === 'stock_desc') return b.stock - a.stock
            return 0
        })

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search products or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-white text-sm focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2.5 bg-black/20 border border-white/10 rounded-lg text-gray-300 text-sm focus:border-blue-500 outline-none cursor-pointer"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="stock_asc">Stock: Low to High</option>
                        <option value="stock_desc">Stock: High to Low</option>
                    </select>

                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </button>
                </div>
            </div>

            {/* Add Product Form */}
            {isAdding && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 animate-in slide-in-from-top-4 fade-in duration-200">
                    <h3 className="text-lg font-semibold text-white mb-4">New Product</h3>
                    <form action={handleAddProduct} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Product Image</label>
                                <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                                    <input type="file" name="image" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                    <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Click or Drag to upload thumbnail</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Product Name</label>
                                <input name="name" required className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g. Tepung Terigu" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">SKU</label>
                                <input name="sku" required className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g. RM-001" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Stock</label>
                                <input name="stock" type="number" required className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Low Stock Threshold</label>
                                <input name="lowStockThreshold" type="number" defaultValue={5} className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button disabled={isLoading} type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                                {isLoading ? 'Saving...' : 'Save Product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Add Stock Modal */}
            {stockModalProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white mb-2">Restock: {stockModalProduct.name}</h3>
                        <p className="text-sm text-gray-400 mb-6">Current Stock: {stockModalProduct.stock}</p>

                        <form action={handleAddStock}>
                            <div className="mb-6">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Quantity to Add</label>
                                <input
                                    name="quantity"
                                    type="number"
                                    min="1"
                                    autoFocus
                                    required
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white text-lg focus:border-emerald-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStockModalProduct(null)} className="flex-1 px-4 py-3 text-sm text-gray-400 hover:bg-white/5 rounded-lg transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors">
                                    {isLoading ? 'Processing...' : 'Confirm Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-white/5 text-gray-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Image</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProducts.map((product) => {
                                const isLowStock = product.stock <= product.lowStockThreshold
                                return (
                                    <tr
                                        key={product.id}
                                        className={cn(
                                            "hover:bg-white/5 transition-colors group",
                                            isLowStock ? "bg-red-500/10 hover:bg-red-500/20" : ""
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden relative border border-white/10">
                                                {product.image ? (
                                                    <Image src={product.image} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-600">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                                        <td className="px-6 py-4">{product.sku}</td>
                                        <td className={cn("px-6 py-4 font-bold text-base", isLowStock ? "text-red-400" : "text-emerald-400")}>
                                            {product.stock}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isLowStock ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/20">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    In Stock
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setStockModalProduct(product)}
                                                    className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors border border-emerald-400/20"
                                                    title="Add Stock"
                                                >
                                                    <PackagePlus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors group-hover:block"
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm ? 'No products found matching your search.' : 'No products found. Start by adding one.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
