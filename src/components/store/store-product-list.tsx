'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, RefreshCw, Package, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatDateTime } from '@/utils/format'
import { syncStoreProducts, toggleStoreProductPurchased } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import SupplierPicker from './supplier-picker'

export default function StoreProductList({
    initialProducts,
    showPurchasedStyles = true,
    showSupplierColumn = true,
    showPurchasedColumn = true,
    showPurchasedAt = false
}: {
    initialProducts: any[],
    showPurchasedStyles?: boolean,
    showSupplierColumn?: boolean,
    showPurchasedColumn?: boolean,
    showPurchasedAt?: boolean
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const [localProducts, setLocalProducts] = useState(initialProducts)
    const [hoveredImage, setHoveredImage] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const { showAlert, showError } = useAlert()
    const router = useRouter()

    // Update local products when initialProducts change (e.g., after sync)
    useEffect(() => {
        setLocalProducts(initialProducts)
    }, [initialProducts])

    // Reset page to 1 when search term changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const result = await syncStoreProducts()
            if (result.success) {
                if (result.count === 0 && (result.total || 0) === 0) {
                    showAlert('Tidak ada produk yang ditemukan di WooCommerce.', 'Informasi')
                } else if ((result.errors || 0) > 0) {
                    showAlert(`Sinkronisasi selesai dengan beberapa masalah. Berhasil: ${result.count}, Gagal: ${result.errors} dari total ${result.total} produk.`, 'Selesai Parsial')
                } else {
                    showAlert(`Berhasil sinkronisasi ${result.count} produk dari WooCommerce Ichibot Store.`, 'Sinkronisasi Berhasil')
                }
                router.refresh()
            } else {
                showError(result.error || 'Gagal sinkronisasi produk. Periksa logs server untuk detailnya.')
            }
        } catch (error: any) {
            showError(error.message || 'Terjadi kesalahan sistem saat melakukan sinkronisasi.')
        } finally {
            setIsSyncing(false)
        }
    }

    const handleTogglePurchased = async (wcId: number, currentStatus: boolean) => {
        const newStatus = !currentStatus

        // Optimistic UI update
        setLocalProducts(prev => prev.map(p =>
            p.wcId === wcId ? { ...p, purchased: newStatus } : p
        ))

        try {
            const result = await toggleStoreProductPurchased(wcId, newStatus)
            if (!result.success) {
                // Revert on error
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


    const filteredProducts = useMemo(() => {
        return localProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.storeName && p.storeName.toLowerCase().includes(searchTerm.toLowerCase()))
        )
    }, [localProducts, searchTerm])

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
                        placeholder={showSupplierColumn ? "Cari produk, SKU, atau supplier..." : "Cari produk atau SKU..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className={cn(
                        "w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50 shadow-sm",
                        isSyncing && "animate-pulse"
                    )}
                >
                    <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                    {isSyncing ? 'Sinkronisasi...' : 'Sync Now'}
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                {showPurchasedColumn && <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10 text-center">Beli</th>}
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16 text-center">Gambar</th>
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Info Produk</th>
                                {showSupplierColumn && <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supplier</th>}
                                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
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
                                            showPurchasedStyles && product.purchased && "opacity-60 bg-muted/20"
                                        )}
                                    >
                                        {showPurchasedColumn && (
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
                                        )}
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
                                                <span className={cn(
                                                    "font-medium text-foreground text-sm line-clamp-1",
                                                    showPurchasedStyles && product.purchased && "line-through text-muted-foreground"
                                                )}>
                                                    {product.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-muted-foreground">ID: {product.wcId}</span>
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase",
                                                        product.status === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                    )}>
                                                        {product.status}
                                                    </span>
                                                    {product.slug && (
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
                                                {showPurchasedAt && product.purchasedAt && (
                                                    <div className="mt-1 text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                        <span className="opacity-70">Dibeli pada:</span>
                                                        <span>{formatDateTime(product.purchasedAt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {showSupplierColumn && (
                                            <td className="px-4 py-3 min-w-[180px]">
                                                <SupplierPicker
                                                    wcId={product.wcId}
                                                    initialValue={product.storeName || ''}
                                                />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-mono">
                                                {product.sku || '-'}
                                            </span>
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
                                            <div className="text-foreground">Rp {formatCurrency(product.price || 0)}</div>
                                            {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                <div className="text-[10px] text-muted-foreground line-through">
                                                    Rp {formatCurrency(product.regularPrice)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={(showSupplierColumn ? 1 : 0) + (showPurchasedColumn ? 1 : 0) + 5} className="px-4 py-24 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <Package className="w-12 h-12 opacity-10" />
                                            <p className="text-sm font-medium">Tidak ada produk ditemukan.</p>
                                            {searchTerm ? (
                                                <button onClick={() => setSearchTerm('')} className="text-primary text-xs hover:underline mt-1 font-medium">
                                                    Hapus filter pencarian
                                                </button>
                                            ) : (
                                                <p className="text-xs">Klik "Sync Now" untuk mengambil data dari WooCommerce.</p>
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
        </div>
    )
}
