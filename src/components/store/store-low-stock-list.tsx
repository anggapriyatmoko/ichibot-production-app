'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Package, ExternalLink, ChevronRight, AlertTriangle, CheckCircle2, Circle, X, ChevronDown, Edit2, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency } from '@/utils/format'
import { toggleStoreProductPurchased, syncSingleStoreProduct } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import SupplierPicker from './supplier-picker'
import KeteranganEdit from './keterangan-edit'
import EditProductModal from './edit-product-modal'
import PurchaseInputModal from './purchase-input-modal'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableHeaderContent,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TablePagination,
} from '@/components/ui/table'

function SortIcon({ columnKey, sortConfig }: { columnKey: string, sortConfig: { key: string, direction: 'asc' | 'desc' | null } }) {
    if (sortConfig.key !== columnKey || !sortConfig.direction) {
        return <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 inline-block ml-1" />
    }
    return sortConfig.direction === 'asc'
        ? <ArrowUp className="w-3 h-3 text-primary inline-block ml-1" />
        : <ArrowDown className="w-3 h-3 text-primary inline-block ml-1" />
}

export default function StoreLowStockList({
    initialProducts,
    suppliers = [],
    kursYuan,
    additionalFee = 0
}: {
    initialProducts: any[],
    suppliers?: any[],
    kursYuan?: number,
    additionalFee?: number
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const [syncingItems, setSyncingItems] = useState<Set<number>>(new Set())
    const [finishedItems, setFinishedItems] = useState<Set<number>>(new Set())
    const [localProducts, setLocalProducts] = useState(initialProducts)
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
    const [hoveredImage, setHoveredImage] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [expandedRows, setExpandedRows] = useState<number[]>([])
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [purchaseTarget, setPurchaseTarget] = useState<any>(null)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
        key: 'stok',
        direction: 'asc'
    })
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

    const handleTogglePurchased = async (product: any) => {
        if (!product.purchased) {
            // Open purchase input modal for unpurchased items
            setPurchaseTarget(product)
            return
        }

        // Directly toggle back to unpurchased
        const wcId = product.wcId
        setLocalProducts(prev => prev.map(p =>
            p.wcId === wcId ? { ...p, purchased: false } : p
        ))

        try {
            const result = await toggleStoreProductPurchased(wcId, false)
            if (!result.success) {
                setLocalProducts(prev => prev.map(p =>
                    p.wcId === wcId ? { ...p, purchased: true } : p
                ))
                showError('Gagal memperbarui status pembelian.')
            }
        } catch (error) {
            setLocalProducts(prev => prev.map(p =>
                p.wcId === wcId ? { ...p, purchased: true } : p
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

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
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
            const productSuppliers = p.storeName.split('||').map((n: string) => n.trim()).filter(Boolean)
            return selectedSuppliers.some(s => productSuppliers.includes(s))
        }

        const parents = localProducts.filter(p => !p.parentId)
        const variations = localProducts.filter(p => p.parentId)

        // Apply Sorting to Parents
        if (sortConfig.direction) {
            parents.sort((a, b) => {
                let aValue = a[sortConfig.key]
                let bValue = b[sortConfig.key]

                if (sortConfig.key === 'stok') {
                    aValue = a.stockQuantity || 0
                    bValue = b.stockQuantity || 0
                } else if (sortConfig.key === 'name') {
                    aValue = a.name.toLowerCase()
                    bValue = b.name.toLowerCase()
                } else if (sortConfig.key === 'supplier') {
                    aValue = (a.storeName || '').toLowerCase()
                    bValue = (b.storeName || '').toLowerCase()
                } else if (sortConfig.key === 'sku') {
                    aValue = (a.sku || '').toLowerCase()
                    bValue = (b.sku || '').toLowerCase()
                } else if (sortConfig.key === 'keterangan') {
                    aValue = (a.keterangan || '').toLowerCase()
                    bValue = (b.keterangan || '').toLowerCase()
                } else if (sortConfig.key === 'price') {
                    aValue = a.price || 0
                    bValue = b.price || 0
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        let result: any[] = []
        parents.forEach(parent => {
            const children = variations.filter(v => v.parentId === parent.wcId)
            const parentMatches = matchesSearch(parent)
            const matchingChildren = children.filter(matchesSearch)

            // Sort variations
            if (sortConfig.direction) {
                matchingChildren.sort((a, b) => {
                    let aValue = a[sortConfig.key]
                    let bValue = b[sortConfig.key]

                    if (sortConfig.key === 'stok') {
                        aValue = a.stockQuantity || 0
                        bValue = b.stockQuantity || 0
                    } else if (sortConfig.key === 'name') {
                        aValue = a.name.toLowerCase()
                        bValue = b.name.toLowerCase()
                    } else if (sortConfig.key === 'supplier') {
                        aValue = (a.storeName || '').toLowerCase()
                        bValue = (b.storeName || '').toLowerCase()
                    } else if (sortConfig.key === 'sku') {
                        aValue = (a.sku || '').toLowerCase()
                        bValue = (b.sku || '').toLowerCase()
                    } else if (sortConfig.key === 'keterangan') {
                        aValue = (a.keterangan || '').toLowerCase()
                        bValue = (b.keterangan || '').toLowerCase()
                    } else if (sortConfig.key === 'price') {
                        aValue = a.price || 0
                        bValue = b.price || 0
                    }

                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                    return 0
                })
            }

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
    }, [localProducts, searchTerm, selectedSuppliers, expandedRows, sortConfig])

    // Pagination calculation
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)

    const handlePageChange = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }

    return (
        <div className="space-y-6">
            <TableWrapper>
                <TableHeaderContent
                    title="Produk Stok Rendah Store"
                    description="Monitoring stok produk WooCommerce yang menipis. Urut berdasarkan stok terkecil."
                    icon={<AlertTriangle className="w-5 h-5" />}
                    actions={
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Cari produk atau supplier..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                            />
                        </div>
                    }
                />

                {/* Supplier Filter Bar */}
                {suppliers.length > 0 && (
                    <div className="flex items-center gap-3 overflow-x-auto px-6 py-3 border-b border-border scrollbar-none">
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
                )}
                <TableScrollArea minHeight="400px">
                    <Table>
                        <TableHeader>
                            <TableRow hoverable={false}>
                                <TableHead align="center" className="w-10">Beli</TableHead>
                                <TableHead align="center" className="w-16">Gambar</TableHead>
                                <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Info Produk <SortIcon columnKey="name" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead onClick={() => handleSort('supplier')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Supplier <SortIcon columnKey="supplier" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead onClick={() => handleSort('sku')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    SKU <SortIcon columnKey="sku" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead onClick={() => handleSort('keterangan')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Keterangan <SortIcon columnKey="keterangan" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead align="right" onClick={() => handleSort('stok')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Stok <SortIcon columnKey="stok" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead align="right" onClick={() => handleSort('price')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Harga <SortIcon columnKey="price" sortConfig={sortConfig} />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.length > 0 ? (
                                paginatedProducts.map((product) => (
                                    <TableRow
                                        key={product.wcId}
                                        className={cn(
                                            product.purchased && "opacity-60 bg-muted/20",
                                            product.isVariation && "bg-muted/10 border-l-4 border-l-primary/30"
                                        )}
                                    >
                                        <TableCell align="center">
                                            <button
                                                onClick={() => handleTogglePurchased(product)}
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
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell>
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
                                                    <button
                                                        onClick={async () => {
                                                            const id = product.wcId
                                                            if (syncingItems.has(id)) return
                                                            setSyncingItems(prev => new Set(prev).add(id))
                                                            try {
                                                                const result = await syncSingleStoreProduct(id, product.parentId)
                                                                if (result.success && result.product) {
                                                                    setLocalProducts(prev => prev.map(p => p.wcId === id ? result.product : p))
                                                                } else {
                                                                    router.refresh()
                                                                }
                                                            } catch { /* ignore */ } finally {
                                                                setSyncingItems(prev => { const n = new Set(prev); n.delete(id); return n })
                                                                setFinishedItems(prev => new Set(prev).add(id))
                                                                setTimeout(() => setFinishedItems(prev => { const n = new Set(prev); n.delete(id); return n }), 5000)
                                                            }
                                                        }}
                                                        disabled={syncingItems.has(product.wcId)}
                                                        className={cn(
                                                            "p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase bg-muted/50 px-1.5",
                                                            syncingItems.has(product.wcId) && "text-primary"
                                                        )}
                                                        title="Sync dari WooCommerce"
                                                    >
                                                        <RefreshCw className={cn("w-2.5 h-2.5", syncingItems.has(product.wcId) && "animate-spin")} />
                                                        {finishedItems.has(product.wcId) ? "Selesai" : "Sync"}
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
                                        </TableCell>
                                        <TableCell className="min-w-[180px]">
                                            <SupplierPicker
                                                wcId={product.wcId}
                                                initialValue={product.storeName || ''}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
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
                                        </TableCell>
                                        <TableCell className="min-w-[200px]">
                                            <KeteranganEdit
                                                wcId={product.wcId}
                                                initialValue={product.keterangan}
                                                productName={product.name}
                                            />
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap">
                                            <span className={cn(
                                                "text-sm font-semibold",
                                                (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-green-600"
                                            )}>
                                                {formatNumber(product.stockQuantity || 0)}
                                            </span>
                                            <span className="text-[10px] block text-muted-foreground uppercase">
                                                {product.stockStatus === 'outofstock' ? '' : product.stockStatus}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap font-medium">
                                            <div className="text-foreground">{formatCurrency(product.price || 0)}</div>
                                            {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                <div className="text-[10px] text-muted-foreground line-through">
                                                    {formatCurrency(product.regularPrice)}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableEmpty
                                    colSpan={8}
                                    icon={<Package className="w-12 h-12 opacity-10" />}
                                    message="Tidak ada produk low stock ditemukan."
                                    description={searchTerm ? (
                                        <button onClick={() => setSearchTerm('')} className="text-primary text-xs hover:underline mt-1 font-medium">
                                            Hapus filter pencarian
                                        </button>
                                    ) : undefined}
                                />
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>

                {filteredProducts.length > 0 && (
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(count) => {
                            setItemsPerPage(count)
                            setCurrentPage(1)
                        }}
                        totalCount={filteredProducts.length}
                    />
                )}
            </TableWrapper>

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

            <PurchaseInputModal
                isOpen={!!purchaseTarget}
                onClose={() => setPurchaseTarget(null)}
                product={purchaseTarget || { wcId: 0, name: '' }}
                kursYuan={kursYuan}
                additionalFee={additionalFee}
            />
        </div>
    )
}
