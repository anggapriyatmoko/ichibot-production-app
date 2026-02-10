'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Package, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertTriangle, CheckCircle2, Circle, X, ChevronDown, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency } from '@/utils/format'
import { toggleStoreProductPurchased } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import SupplierPicker from './supplier-picker'
import KeteranganEdit from './keterangan-edit'
import EditProductModal from './edit-product-modal'

export default function StoreLowStockList({
    initialProducts,
    suppliers = []
}: {
    initialProducts: any[],
    suppliers?: any[]
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const [localProducts, setLocalProducts] = useState(initialProducts)
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
    const [hoveredImage, setHoveredImage] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [expandedRows, setExpandedRows] = useState<number[]>([])
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const { showError, showAlert } = useAlert()
    const router = useRouter()

    // Update local products when initialProducts change
    useEffect(() => {
        setLocalProducts(initialProducts)
    }, [initialProducts])

    // Reset page to 1 when search term or filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedSuppliers])

    const handleTogglePurchased = async (wcId: number, currentStatus: boolean) => {
        const newStatus = !currentStatus

        // Optimistic UI update
        setLocalProducts(prev => prev.map(p =>
            p.wcId === wcId ? { ...p, purchased: newStatus } : p
        ))

        try {
            const result = await toggleStoreProductPurchased(wcId, newStatus)
            if (!result.success) {
                setLocalProducts(prev => prev.map(p =>
                    p.wcId === wcId ? { ...p, purchased: currentStatus } : p
                ))
                showError('Gagal memperbarui status pembelian.')
            }
        } catch (error) {
            setLocalProducts(prev => prev.map(p =>
                p.wcId === wcId ? { ...p, purchased: currentStatus } : p
            ))
            showError('Terjadi kesalahan sistem.')
        }
    }

    const toggleSupplierFilter = (name: string) => {
        if (name === 'All') {
            setSelectedSuppliers([])
            return
        }

        setSelectedSuppliers(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        )
    }

    const toggleRow = (wcId: number) => {
        setExpandedRows(prev =>
            prev.includes(wcId)
                ? prev.filter(id => id !== wcId)
                : [...prev, wcId]
        )
    }

    const filteredProducts = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean)

        const matchesSearch = (p: any) => {
            const searchMatch = searchWords.length === 0 || searchWords.every(word =>
                p.name.toLowerCase().includes(word) ||
                (p.sku && p.sku.toLowerCase().includes(word)) ||
                (p.storeName && p.storeName.toLowerCase().includes(word))
            )
            if (!searchMatch) return false

            if (selectedSuppliers.length === 0) return true
            if (!p.storeName) return false
            const productSuppliers = p.storeName.split(',').map((n: string) => n.trim()).filter(Boolean)
            return selectedSuppliers.some(s => productSuppliers.includes(s))
        }

        const parents = localProducts.filter(p => !p.parentId)
        const variations = localProducts.filter(p => p.parentId)

        let result: any[] = []
        parents.forEach(parent => {
            const children = variations.filter(v => v.parentId === parent.wcId)
            const parentMatches = matchesSearch(parent)
            const matchingChildren = children.filter(matchesSearch)

            if (parentMatches || matchingChildren.length > 0) {
                result.push({ ...parent, hasVariations: children.length > 0 })

                if (expandedRows.includes(parent.wcId) || (searchWords.length > 0 && matchingChildren.length > 0)) {
                    const childrenToShow = searchWords.length > 0 ? matchingChildren : children
                    childrenToShow.forEach(child => {
                        result.push({ ...child, isVariation: true })
                    })
                }
            }
        })

        return result
    }, [localProducts, searchTerm, selectedSuppliers, expandedRows])

    // Pagination calculation
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)

    const handlePageChange = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari produk atau supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">Urut berdasarkan stok terkecil</span>
                </div>
            </div>

            {/* Supplier Filter Bar */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => toggleSupplierFilter('All')}
                    className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                        selectedSuppliers.length === 0
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                    )}
                >
                    All
                </button>
                {suppliers.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => toggleSupplierFilter(s.name)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2",
                            selectedSuppliers.includes(s.name)
                                ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                                : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                        )}
                    >
                        {s.name}
                        {selectedSuppliers.includes(s.name) && (
                            <X className="w-3 h-3" onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleSupplierFilter(s.name); }} />
                        )}
                    </button>
                ))}
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10 text-center">Beli</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16 text-center">Gambar</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Info Produk</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keterangan</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Stok</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Harga</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedProducts.length > 0 ? (
                                paginatedProducts.map((product) => (
                                    <tr
                                        key={product.wcId}
                                        className={cn(
                                            "hover:bg-accent/50 transition-colors group",
                                            product.purchased && "opacity-60 bg-muted/20",
                                            product.isVariation && "bg-muted/10 border-l-4 border-l-primary/30"
                                        )}
                                    >
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleTogglePurchased(product.wcId, product.purchased)}
                                                className={cn(
                                                    "transition-colors",
                                                    product.purchased ? "text-primary" : "text-muted-foreground hover:text-primary"
                                                )}
                                            >
                                                {product.purchased ? (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                ) : (
                                                    <Circle className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div
                                                className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border cursor-zoom-in"
                                                onMouseEnter={() => product.images?.[0]?.src && setHoveredImage(product.images[0].src)}
                                                onMouseLeave={() => setHoveredImage(null)}
                                                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                            >
                                                {product.images?.[0]?.src ? (
                                                    <img
                                                        src={product.images[0].src}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className="w-6 h-6 text-muted-foreground" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col text-left">
                                                <span
                                                    className={cn(
                                                        "font-medium text-foreground text-sm line-clamp-2",
                                                        product.purchased && "line-through text-muted-foreground",
                                                        product.isVariation && "text-xs italic"
                                                    )}
                                                    title={product.name}
                                                >
                                                    {product.isVariation && <span className="text-primary font-bold mr-1">[Varian]</span>}
                                                    {product.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">
                                                        ID: {product.wcId} {product.weight ? `• ${product.weight} kg` : ''}
                                                    </span>
                                                    <button
                                                        onClick={() => setEditingProduct(product)}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase bg-muted/50 px-1.5"
                                                        title="Edit Produk"
                                                    >
                                                        <Edit2 className="w-2.5 h-2.5" />
                                                        Edit
                                                    </button>
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase",
                                                        product.status === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                    )}>
                                                        {product.status}
                                                    </span>
                                                    {product.type === 'variable' && (
                                                        <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                                                            Variable
                                                        </span>
                                                    )}
                                                    {product.isMissingFromWoo && (
                                                        <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                                            Tidak ditemukan di woocomerce
                                                        </span>
                                                    )}
                                                    {product.slug && !product.isVariation && (
                                                        <a
                                                            href={`${process.env.NEXT_PUBLIC_WC_URL}/shop/${product.slug}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            <span className="text-[10px]">Shop</span>
                                                        </a>
                                                    )}
                                                </div>

                                                {product.hasVariations && (
                                                    <button
                                                        onClick={() => toggleRow(product.wcId)}
                                                        className="flex items-center gap-1 text-primary hover:underline text-[10px] mt-1 font-bold bg-primary/5 px-2 py-0.5 rounded"
                                                    >
                                                        {expandedRows.includes(product.wcId) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        {expandedRows.includes(product.wcId) ? 'Sembunyikan Varian' : 'Lihat Varian'}
                                                    </button>
                                                )}

                                                {product.isVariation && product.attributes && Array.isArray(product.attributes) && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {product.attributes.map((attr: any) => (
                                                            <span key={attr.name} className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border text-muted-foreground">
                                                                <span className="font-semibold">{attr.name}:</span> {attr.option}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 min-w-[180px]">
                                            <SupplierPicker
                                                wcId={product.wcId}
                                                initialValue={product.storeName || ''}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-[10px] font-mono">
                                                    {product.sku || '-'}
                                                </span>
                                                {product.backupGudang && (
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-[4px] text-[10px] font-bold border border-blue-100 uppercase tracking-tighter">
                                                        {product.backupGudang}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 min-w-[200px]">
                                            <KeteranganEdit
                                                wcId={product.wcId}
                                                initialValue={product.keterangan}
                                                productName={product.name}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-green-600"
                                            )}>
                                                {formatNumber(product.stockQuantity || 0)}
                                            </span>
                                            <span className="text-[10px] block text-muted-foreground uppercase">
                                                {product.stockStatus || 'outofstock'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-sm">
                                            <div className="text-foreground">{formatCurrency(product.price || 0)}</div>
                                            {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                <div className="text-[10px] text-muted-foreground line-through">
                                                    {formatCurrency(product.regularPrice)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-4 py-24 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Package className="w-12 h-12 opacity-10" />
                                            <p className="text-sm font-medium">Tidak ada produk low stock ditemukan.</p>
                                            {searchTerm && (
                                                <button onClick={() => setSearchTerm('')} className="text-primary text-xs hover:underline mt-1 font-medium">
                                                    Hapus filter pencarian
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredProducts.length > 0 && (
                    <div className="px-4 py-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Baris per halaman:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value))
                                        setCurrentPage(1)
                                    }}
                                    className="bg-background border border-border rounded px-2 py-1 text-xs outline-none focus:border-primary"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Menampilkan <span className="font-medium text-foreground">{startIndex + 1}</span> - <span className="font-medium text-foreground">{Math.min(startIndex + itemsPerPage, filteredProducts.length)}</span> dari <span className="font-medium text-foreground">{filteredProducts.length}</span> produk
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                title="First Page"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                title="Previous Page"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1 px-2">
                                <span className="text-xs font-medium">Halaman {currentPage} dari {totalPages}</span>
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                title="Next Page"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                title="Last Page"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Image Preview */}
            {hoveredImage && (
                <div
                    className="fixed z-[100] pointer-events-none animate-in fade-in zoom-in duration-200 hidden md:block"
                    style={{
                        left: mousePos.x + 20,
                        top: mousePos.y - 150,
                        transform: 'translateY(0)'
                    }}
                >
                    <div className="bg-background border-2 border-primary/20 rounded-2xl p-2 shadow-2xl overflow-hidden">
                        <img
                            src={hoveredImage}
                            alt="Preview"
                            className="w-[300px] h-[300px] object-cover rounded-xl"
                        />
                    </div>
                </div>
            )}

            {editingProduct && (
                <EditProductModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onSuccess={() => {
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}
