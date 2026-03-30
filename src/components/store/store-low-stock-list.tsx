'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Package, ExternalLink, ChevronRight, AlertTriangle, CheckCircle2, Circle, X, ChevronDown, Edit2, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency } from '@/utils/format'
import { toggleStoreProductPurchased, toggleStoreProductPriority, syncSingleStoreProduct } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
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
    TableResponsive,
    TableMobileCard,
    TableMobileCardHeader,
    TableMobileCardContent,
    TableMobileCardFooter
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
    kursUsd,
    additionalFee = 0,
    shopeeAdminFee = 0,
    shopeeServiceFee = 0,
    tokpedAdminFee = 0,
    tokpedServiceFee = 0
}: {
    initialProducts: any[],
    suppliers?: any[],
    kursYuan?: number,
    kursUsd?: number,
    additionalFee?: number,
    shopeeAdminFee?: number,
    shopeeServiceFee?: number,
    tokpedAdminFee?: number,
    tokpedServiceFee?: number
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
    const [showOnlySimulation, setShowOnlySimulation] = useState(false)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
        key: 'stok',
        direction: 'asc'
    })
    const { showError, showAlert } = useAlert()
    const { showConfirmation } = useConfirmation()
    const router = useRouter()

    const handleTogglePriority = async (product: any) => {
        const wcId = product.wcId
        const newPriority = !product.priority

        showConfirmation({
            title: newPriority ? 'Tambah Prioritas' : 'Hapus Prioritas',
            message: (
                <div className="flex flex-col gap-2">
                    <p>Apakah Anda yakin ingin {newPriority ? 'menambahkan' : 'menghapus'} prioritas untuk produk:</p>
                    <p className="font-bold text-foreground text-sm">"{product.name}"?</p>
                </div>
            ),
            confirmLabel: newPriority ? 'Tambah' : 'Hapus',
            type: newPriority ? 'alert' : 'confirm',
            action: async () => {
                setLocalProducts(prev => prev.map(p =>
                    p.wcId === wcId ? { ...p, priority: newPriority } : p
                ))

                try {
                    const result = await toggleStoreProductPriority(wcId, newPriority)
                    if (!result.success) {
                        setLocalProducts(prev => prev.map(p =>
                            p.wcId === wcId ? { ...p, priority: product.priority } : p
                        ))
                        showError('Gagal memperbarui status prioritas.')
                    } else {
                        showAlert(newPriority ? 'Produk ditandai sebagai prioritas.' : 'Prioritas produk dihapus.')
                    }
                } catch (error) {
                    setLocalProducts(prev => prev.map(p =>
                        p.wcId === wcId ? { ...p, priority: product.priority } : p
                    ))
                    showError('Terjadi kesalahan sistem.')
                }
            }
        })
    }

    // Update local products when initialProducts change
    useEffect(() => {
        setLocalProducts(initialProducts)
    }, [initialProducts])

    // Reset page to 1 when search term or filter changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedSuppliers, showOnlySimulation])

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

            if (showOnlySimulation) {
                if (p.simulationQty > 0) return true
                // If it's a parent, check if any of its variations have simulation data
                const hasSimVariations = localProducts.some(v => v.parentId === p.wcId && v.simulationQty > 0)
                if (hasSimVariations) return true
                return false
            }

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

                if (sortConfig.key === 'stok') {
                    const aStock = a.stockQuantity || 0
                    const bStock = b.stockQuantity || 0
                    const aIsRed = aStock <= 0
                    const bIsRed = bStock <= 0

                    if (aIsRed !== bIsRed) {
                        return (aIsRed ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1)
                    }

                    if (aIsRed && a.priority !== b.priority) {
                        return (a.priority ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1)
                    }

                    return (aStock - bStock) * (sortConfig.direction === 'asc' ? 1 : -1)
                }

                let aValue = a[sortConfig.key]
                let bValue = b[sortConfig.key]

                if (sortConfig.key === 'priority') {
                    aValue = a.priority ? 1 : 0
                    bValue = b.priority ? 1 : 0
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
                } else if (sortConfig.key === 'simulationQty') {
                    aValue = a.simulationQty || 0
                    bValue = b.simulationQty || 0
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

                    if (sortConfig.key === 'stok') {
                        const aStock = a.stockQuantity || 0
                        const bStock = b.stockQuantity || 0
                        const aIsRed = aStock <= 0
                        const bIsRed = bStock <= 0

                        if (aIsRed !== bIsRed) {
                            return (aIsRed ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1)
                        }

                        if (aIsRed && a.priority !== b.priority) {
                            return (a.priority ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1)
                        }

                        return (aStock - bStock) * (sortConfig.direction === 'asc' ? 1 : -1)
                    }

                    let aValue = a[sortConfig.key]
                    let bValue = b[sortConfig.key]

                    if (sortConfig.key === 'priority') {
                        aValue = a.priority ? 1 : 0
                        bValue = b.priority ? 1 : 0
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
                    } else if (sortConfig.key === 'simulationQty') {
                        aValue = a.simulationQty || 0
                        bValue = b.simulationQty || 0
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
    }, [localProducts, searchTerm, selectedSuppliers, showOnlySimulation, expandedRows, sortConfig])

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
                            onClick={() => {
                                setShowOnlySimulation(!showOnlySimulation)
                                if (selectedSuppliers.length > 0) setSelectedSuppliers([])
                            }}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2",
                                showOnlySimulation
                                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                    : "bg-background text-muted-foreground border-border hover:border-amber-500/50 hover:text-amber-500"
                            )}
                        >
                            {showOnlySimulation ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                            Simulasi
                        </button>
                        <button
                            onClick={() => {
                                setSelectedSuppliers([])
                                setShowOnlySimulation(false)
                            }}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                                selectedSuppliers.length === 0 && !showOnlySimulation
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
                <TableResponsive
                    data={paginatedProducts}
                    renderMobileCard={(product) => (
                        <TableMobileCard key={product.wcId}>
                            <TableMobileCardHeader>
                                <div className="flex gap-3">
                                    <div className={cn(
                                        "rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border flex-shrink-0 transition-transform active:scale-95 group relative",
                                        product.isVariation ? "w-10 h-10" : "w-14 h-14"
                                    )}>
                                        {product.images?.[0]?.src ? (
                                            <img
                                                src={product.images[0].src}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Package className={product.isVariation ? "w-4 h-4 text-muted-foreground" : "w-6 h-6 text-muted-foreground"} />
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleTogglePriority(product); }}
                                            className={cn(
                                                "absolute top-0.5 right-0.5 p-0.5 rounded-full bg-white/80 shadow-sm transition-all",
                                                product.priority ? "opacity-100 text-amber-500" : "text-muted-foreground/30"
                                            )}
                                        >
                                            <Star className={cn("w-3 h-3", product.priority && "fill-amber-500")} />
                                        </button>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {product.isVariation && <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 rounded uppercase leading-none py-0.5">Varian</span>}
                                            <span className={cn(
                                                "font-bold text-foreground text-sm line-clamp-2 leading-tight",
                                                product.purchased && "line-through text-muted-foreground",
                                                product.isVariation && "text-muted-foreground font-medium"
                                            )}>
                                                {product.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">
                                                ID: {product.wcId}
                                            </span>
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-tighter",
                                                product.status === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                            )}>
                                                {product.status}
                                            </span>
                                            {product.sku && (
                                                <span className="text-[10px] text-primary font-bold font-mono">
                                                    {product.sku}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTogglePurchased(product)}
                                        className={cn(
                                            "transition-colors p-1 rounded-full hover:bg-muted",
                                            product.purchased ? "text-primary" : "text-muted-foreground hover:text-primary"
                                        )}
                                    >
                                        {product.purchased ? (
                                            <CheckCircle2 className="w-6 h-6" />
                                        ) : (
                                            <Circle className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>
                            </TableMobileCardHeader>

                            <TableMobileCardContent>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Sisa Stok
                                    </p>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-sm font-black",
                                            (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-amber-600"
                                        )}>
                                            {formatNumber(product.stockQuantity || 0)} item
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Estimasi Laba</p>
                                    <div className="flex flex-col gap-0.5">
                                        {product.purchasePrice ? (() => {
                                            const buyPrice = product.purchasePrice || 0
                                            const paket = product.purchasePackage || 1
                                            const currency = product.purchaseCurrency || 'IDR'
                                            let buyPriceIdr = buyPrice
                                            if (currency === 'CNY' && kursYuan) buyPriceIdr *= kursYuan
                                            else if (currency === 'USD' && kursUsd) buyPriceIdr *= kursUsd

                                            const totalCapital = buyPriceIdr * paket * (1 + (additionalFee || 0) / 100)
                                            const costPerPcs = totalCapital / ((paket * (product.purchaseQty || 1)) || 1)

                                            const sellPrice = product.price || 0
                                            const shopeeFee = sellPrice * (shopeeAdminFee + shopeeServiceFee) / 100
                                            const tokpedFee = sellPrice * (tokpedAdminFee + tokpedServiceFee) / 100

                                            const labaShopee = sellPrice - costPerPcs - shopeeFee
                                            const labaTokped = sellPrice - costPerPcs - tokpedFee

                                            return (
                                                <>
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="font-bold text-[#EE4D2D]">Shopee</span>
                                                        <span className={cn("font-black", labaShopee >= 0 ? "text-emerald-600" : "text-destructive")}>
                                                            {labaShopee >= 0 ? '+' : ''}{formatCurrency(Math.round(labaShopee))}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px]">
                                                        <span className="font-bold text-[#00AA5B]">Tokped</span>
                                                        <span className={cn("font-black", labaTokped >= 0 ? "text-emerald-600" : "text-destructive")}>
                                                            {labaTokped >= 0 ? '+' : ''}{formatCurrency(Math.round(labaTokped))}
                                                        </span>
                                                    </div>
                                                </>
                                            )
                                        })() : (
                                            <span className="text-muted-foreground/30 text-[10px] font-bold">—</span>
                                        )}
                                    </div>
                                </div>

                                {product.simulationQty > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-[#EE4D2D] uppercase font-black tracking-wider">Simulasi</p>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-amber-600">
                                                {formatNumber(product.simulationQty)} item
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Harga Jual</p>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-foreground">{formatCurrency(product.price || 0)}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-blue-600 uppercase font-black tracking-wider">Harga Beli Cina</p>
                                    <div className="flex flex-col">
                                        {product.purchasePrice ? (() => {
                                            const originalPrice = product.purchasePrice || 0
                                            const currency = product.purchaseCurrency || 'IDR'
                                            let priceIdr = originalPrice
                                            let symbol = ''
                                            
                                            if (currency === 'CNY') {
                                                if (kursYuan) priceIdr *= kursYuan
                                                symbol = '¥'
                                            } else if (currency === 'USD') {
                                                if (kursUsd) priceIdr *= kursUsd
                                                symbol = '$'
                                            }

                                            return (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-blue-600">{formatCurrency(Math.round(priceIdr))}</span>
                                                    {currency !== 'IDR' && (
                                                        <span className="text-[9px] text-muted-foreground font-bold italic uppercase tracking-tighter">
                                                            {symbol}{formatNumber(originalPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })() : (
                                            <span className="text-sm font-black text-muted-foreground/30">—</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Supplier</p>
                                    <div className="scale-90 origin-top-left -ml-1">
                                        <SupplierPicker
                                            wcId={product.wcId}
                                            initialValue={product.storeName || ''}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Keterangan</p>
                                    <div className="scale-95 origin-top-left">
                                        <KeteranganEdit
                                            wcId={product.wcId}
                                            initialValue={product.keterangan}
                                            productName={product.name}
                                            compact
                                        />
                                    </div>
                                </div>

                                {product.isVariation && product.attributes && Array.isArray(product.attributes) && (
                                    <div className="col-span-2 flex flex-wrap gap-1.5">
                                        {product.attributes.map((attr: any) => (
                                            <span key={attr.name} className="px-2 py-0.5 rounded-md bg-primary/5 text-[10px] border border-primary/10 text-primary font-bold uppercase">
                                                {attr.name}: {attr.option}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </TableMobileCardContent>

                            <TableMobileCardFooter>
                                <div className="flex flex-wrap items-center gap-1.5 w-full">
                                    <button
                                        onClick={() => setEditingProduct(product)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-[10px] font-black uppercase transition-all border border-border/50 active:scale-95"
                                    >
                                        <Edit2 className="w-3 h-3" /> Edit
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
                                                }
                                            } catch { /* ignore */ } finally {
                                                setSyncingItems(prev => { const n = new Set(prev); n.delete(id); return n })
                                            }
                                        }}
                                        disabled={syncingItems.has(product.wcId)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-border/50 active:scale-95",
                                            syncingItems.has(product.wcId) ? "bg-primary text-white" : "bg-muted text-foreground hover:bg-muted/80"
                                        )}
                                    >
                                        <RefreshCw className={cn("w-3 h-3", syncingItems.has(product.wcId) && "animate-spin")} />
                                        {syncingItems.has(product.wcId) ? "Sync..." : "Sync"}
                                    </button>
                                    {product.purchased && (
                                        <button
                                            onClick={() => setPurchaseTarget(product)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase transition-all shadow-sm shadow-amber-500/20 active:scale-95"
                                        >
                                            <ShoppingCart className="w-3 h-3" /> Beli
                                        </button>
                                    )}
                                    {product.hasVariations && (
                                        <button
                                            onClick={() => toggleRow(product.wcId)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border shadow-sm active:scale-95",
                                                expandedRows.includes(product.wcId)
                                                    ? "bg-blue-600 text-white border-blue-600"
                                                    : "bg-blue-50 text-blue-600 border-blue-100"
                                            )}
                                        >
                                            {expandedRows.includes(product.wcId) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            Varian
                                        </button>
                                    )}
                                </div>
                            </TableMobileCardFooter>
                        </TableMobileCard>
                    )}
                >
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
                                <TableHead align="right" onClick={() => handleSort('price')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Harga Jual <SortIcon columnKey="price" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead align="right">
                                    Harga Beli Cina
                                </TableHead>
                                <TableHead align="right" onClick={() => handleSort('stok')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Stok <SortIcon columnKey="stok" sortConfig={sortConfig} />
                                </TableHead>
                                <TableHead align="right">
                                    Laba/Pcs
                                </TableHead>
                                <TableHead align="right" onClick={() => handleSort('simulationQty')} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                    Planning <SortIcon columnKey="simulationQty" sortConfig={sortConfig} />
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
                                                className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border cursor-zoom-in group relative"
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
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleTogglePriority(product); }}
                                                    className={cn(
                                                        "absolute top-0.5 right-0.5 p-0.5 rounded-full bg-white/80 shadow-sm transition-all opacity-0 group-hover:opacity-100",
                                                        product.priority ? "opacity-100 text-amber-500" : "text-muted-foreground/30 hover:text-amber-400"
                                                    )}
                                                >
                                                    <Star className={cn("w-3 h-3", product.priority && "fill-amber-500")} />
                                                </button>
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
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">
                                                            ID: {product.wcId} {product.weight ? `• ${product.weight} kg` : ''}
                                                        </span>
                                                        <div className="scale-90 origin-left max-w-[200px]">
                                                            <KeteranganEdit
                                                                wcId={product.wcId}
                                                                initialValue={product.keterangan}
                                                                productName={product.name}
                                                                compact
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter",
                                                            product.status === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                        )}>
                                                            {product.status}
                                                        </span>
                                                        {product.sku && (
                                                            <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-black bg-muted text-muted-foreground uppercase tracking-tighter border border-border/50">
                                                                {product.sku}
                                                            </span>
                                                        )}
                                                        {product.backupGudang && (
                                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-[4px] text-[10px] font-black border border-blue-100 uppercase tracking-tighter">
                                                                {product.backupGudang}
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-1 ml-1 scale-90 origin-left">
                                                            <button
                                                                onClick={() => setEditingProduct(product)}
                                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[8px] font-black uppercase border border-border/40"
                                                                title="Edit Produk"
                                                            >
                                                                <Edit2 className="w-2 h-2" />
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
                                                                        }
                                                                    } catch { /* ignore */ } finally {
                                                                        setSyncingItems(prev => { const n = new Set(prev); n.delete(id); return n })
                                                                        setFinishedItems(prev => new Set(prev).add(id))
                                                                        setTimeout(() => setFinishedItems(prev => { const n = new Set(prev); n.delete(id); return n }), 5000)
                                                                    }
                                                                }}
                                                                disabled={syncingItems.has(product.wcId)}
                                                                className={cn(
                                                                    "p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[8px] font-black uppercase border border-border/40",
                                                                    syncingItems.has(product.wcId) && "text-primary"
                                                                )}
                                                            >
                                                                <RefreshCw className={cn("w-2 h-2", syncingItems.has(product.wcId) && "animate-spin")} />
                                                                {finishedItems.has(product.wcId) ? "Selesai" : "Sync"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {product.hasVariations && (
                                                    <button
                                                        onClick={() => toggleRow(product.wcId)}
                                                        className="flex items-center gap-1 text-primary hover:underline text-[10px] mt-1 font-bold bg-primary/5 px-2 py-0.5 rounded w-fit"
                                                    >
                                                        {expandedRows.includes(product.wcId) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        {expandedRows.includes(product.wcId) ? 'Sembunyikan Varian' : 'Lihat Varian'}
                                                    </button>
                                                )}
                                                {product.isVariation && product.attributes && Array.isArray(product.attributes) && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {product.attributes.map((attr: any) => (
                                                            <span key={attr.name} className="px-1.5 py-0.5 rounded bg-muted text-[10px] border border-border text-muted-foreground font-medium">
                                                                {attr.name}: {attr.option}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[150px]">
                                            <div className="scale-90 origin-left">
                                                <SupplierPicker
                                                    wcId={product.wcId}
                                                    initialValue={product.storeName || ''}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap font-medium">
                                            <div className="text-foreground text-sm font-black">{formatCurrency(product.price || 0)}</div>
                                            {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                <div className="text-[10px] text-muted-foreground line-through decoration-destructive/30">
                                                    {formatCurrency(product.regularPrice)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap">
                                            {product.purchasePrice ? (() => {
                                                const originalPrice = product.purchasePrice || 0
                                                const currency = product.purchaseCurrency || 'IDR'
                                                let priceIdr = originalPrice
                                                let symbol = ''
                                                
                                                if (currency === 'CNY') {
                                                    if (kursYuan) priceIdr *= kursYuan
                                                    symbol = '¥'
                                                } else if (currency === 'USD') {
                                                    if (kursUsd) priceIdr *= kursUsd
                                                    symbol = '$'
                                                }

                                                return (
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-blue-600 text-sm font-black">{formatCurrency(Math.round(priceIdr))}</div>
                                                        {currency !== 'IDR' && (
                                                            <div className="text-[10px] text-muted-foreground font-bold italic uppercase tracking-tighter">
                                                                {symbol}{formatNumber(originalPrice)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })() : (
                                                <span className="text-muted-foreground/30 text-[10px] font-bold tracking-widest">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap">
                                            <span className={cn(
                                                "text-sm font-black",
                                                (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-amber-600"
                                            )}>
                                                {formatNumber(product.stockQuantity || 0)}
                                            </span>
                                            <span className="text-[10px] block text-muted-foreground uppercase font-bold tracking-tighter">
                                                {product.stockStatus === 'outofstock' ? '' : product.stockStatus}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap">
                                            {product.purchasePrice ? (() => {
                                                const buyPrice = product.purchasePrice || 0
                                                const paket = product.purchasePackage || 1
                                                const currency = product.purchaseCurrency || 'IDR'
                                                let buyPriceIdr = buyPrice
                                                if (currency === 'CNY' && kursYuan) buyPriceIdr *= kursYuan
                                                else if (currency === 'USD' && kursUsd) buyPriceIdr *= kursUsd

                                                const totalCapital = buyPriceIdr * paket * (1 + (additionalFee || 0) / 100)
                                                const costPerPcs = totalCapital / ((paket * (product.purchaseQty || 1)) || 1)

                                                const sellPrice = product.price || 0
                                                const shopeeFee = sellPrice * (shopeeAdminFee + shopeeServiceFee) / 100
                                                const tokpedFee = sellPrice * (tokpedAdminFee + tokpedServiceFee) / 100

                                                const labaShopee = sellPrice - costPerPcs - shopeeFee
                                                const labaTokped = sellPrice - costPerPcs - tokpedFee

                                                return (
                                                    <div className="flex flex-col items-end gap-0.5 min-w-[100px]">
                                                        <div className="flex items-center gap-1.5 justify-between w-full">
                                                            <span className="text-[9px] font-black text-[#EE4D2D] uppercase tracking-tighter">Shopee</span>
                                                            <span className={cn("text-xs font-black", labaShopee >= 0 ? "text-emerald-600" : "text-destructive")}>
                                                                {labaShopee >= 0 ? '+' : ''}{formatCurrency(Math.round(labaShopee))}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 justify-between w-full">
                                                            <span className="text-[9px] font-black text-[#00AA5B] uppercase tracking-tighter">Tokped</span>
                                                            <span className={cn("text-xs font-black", labaTokped >= 0 ? "text-emerald-600" : "text-destructive")}>
                                                                {labaTokped >= 0 ? '+' : ''}{formatCurrency(Math.round(labaTokped))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })() : (
                                                <span className="text-muted-foreground/30 text-[10px] font-bold tracking-widest">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="right" className="whitespace-nowrap">
                                            {product.simulationQty > 0 ? (
                                                <span className="text-sm font-black text-amber-600">
                                                    {formatNumber(product.simulationQty)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/30 text-[10px] font-bold tracking-widest">—</span>
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
                </TableResponsive>

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
