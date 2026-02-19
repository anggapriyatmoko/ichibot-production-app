'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, RefreshCw, Package, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, Circle, ChevronDown, Edit2, Plus, Filter, X, Image as ImageIcon, Weight, DollarSign, Tag, Info, ArrowUpDown, ArrowUp, ArrowDown, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, formatCurrency, formatDateTime } from '@/utils/format'
import { syncStoreProducts, toggleStoreProductPurchased, syncSingleStoreProduct } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import SupplierPicker from './supplier-picker'
import KeteranganEdit from './keterangan-edit'
import { useConfirmation } from '@/components/providers/modal-provider'
import EditProductModal from './edit-product-modal'
import PurchaseInputModal from './purchase-input-modal'
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

function SortIcon({ columnKey, sortConfig }: { columnKey: string, sortConfig: { key: string, direction: 'asc' | 'desc' | null } }) {
    if (sortConfig.key !== columnKey || !sortConfig.direction) {
        return <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
    }
    return sortConfig.direction === 'asc'
        ? <ArrowUp className="w-3 h-3 text-primary" />
        : <ArrowDown className="w-3 h-3 text-primary" />
}

export default function StoreProductList({
    initialProducts,
    showPurchasedStyles = true,
    showSupplierColumn = true,
    showPurchasedColumn = true,
    showPurchasedAt = false,
    showSyncButton = true,
    showPurchaseColumns = false,
    kursYuan,
    kursUsd
}: {
    initialProducts: any[],
    showPurchasedStyles?: boolean,
    showSupplierColumn?: boolean,
    showPurchasedColumn?: boolean,
    showPurchasedAt?: boolean,
    showSyncButton?: boolean,
    showPurchaseColumns?: boolean,
    kursYuan?: number,
    kursUsd?: number
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    const [localProducts, setLocalProducts] = useState(initialProducts)
    const [hoveredImage, setHoveredImage] = useState<string | null>(null)
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [expandedRows, setExpandedRows] = useState<number[]>([])
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [isAddingProduct, setIsAddingProduct] = useState(false)
    const [editPurchaseProduct, setEditPurchaseProduct] = useState<any>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        sku: 'all', // all, with, without
        type: 'all', // all, variable
        discount: 'all', // all, with, without
        photo: 'all', // all, with, without
        price: 'all', // all, with, without
        weight: 'all', // all, with, without
        backup: 'all', // all, with, without
        minPrice: '',
        maxPrice: ''
    })
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
        key: 'name',
        direction: null
    })
    const [syncingItems, setSyncingItems] = useState<Set<number>>(new Set())
    const [finishedItems, setFinishedItems] = useState<Set<number>>(new Set())
    const { showConfirmation } = useConfirmation()
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

    const handleSingleSync = async (product: any) => {
        const id = product.wcId
        if (syncingItems.has(id)) return

        setSyncingItems(prev => new Set(prev).add(id))
        try {
            const result = await syncSingleStoreProduct(id, product.parentId)
            if (result.success) {
                // Remove from syncing and add to finished
                setSyncingItems(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
                setFinishedItems(prev => new Set(prev).add(id))

                // Clear finished state after 5 seconds
                setTimeout(() => {
                    setFinishedItems(prev => {
                        const next = new Set(prev)
                        next.delete(id)
                        return next
                    })
                }, 5000)

                router.refresh()
            } else {
                showError(result.error || 'Gagal sinkronisasi produk.')
                setSyncingItems(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
            }
        } catch (error: any) {
            showError(error.message || 'Terjadi kesalahan sistem.')
            setSyncingItems(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    const handleTogglePurchased = async (wcId: number, currentStatus: boolean) => {
        const executeToggle = async () => {
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
                } else {
                    router.refresh()
                }
            } catch (error) {
                setLocalProducts(prev => prev.map(p =>
                    p.wcId === wcId ? { ...p, purchased: currentStatus } : p
                ))
                showError('Terjadi kesalahan sistem.')
            }
        }

        // Only show confirmation when UNCHECKING (currentStatus is true)
        if (currentStatus) {
            showConfirmation({
                title: 'Konfirmasi',
                message: 'Apakah barang sudah datang?',
                confirmLabel: 'Ya',
                cancelLabel: 'Tidak',
                type: 'confirm',
                action: executeToggle
            })
        } else {
            // Check immediately for checking
            executeToggle()
        }
    }



    const analysis = useMemo(() => {
        // Filter out 'variable' type to avoid double counting stock (count only simple and variations)
        const physicalProducts = localProducts.filter(p => p.type !== 'variable')

        const excludedCategories = ['JASA ICHIBOT', 'PART ICHIBOT', 'ROBOT ICHIBOT']
        const stats = {
            totalProducts: physicalProducts.length,
            outOfStock: physicalProducts.filter(p => (p.stockQuantity || 0) <= 0).length,
            totalAssetValue: physicalProducts
                .filter(p => p.status === 'publish')
                .filter(p => {
                    const cats = (p.categories || []).map((c: any) => (c.name || '').toUpperCase())
                    return !cats.some((c: string) => excludedCategories.some(ex => c.includes(ex.toUpperCase())))
                })
                .reduce((acc, p) => {
                    const price = p.price || 0
                    const stock = Math.max(p.stockQuantity || 0, 0)
                    return acc + (price * stock)
                }, 0),
            totalPurchaseValue: physicalProducts
                .filter(p => p.purchasePrice && p.purchaseQty)
                .reduce((acc, p) => {
                    const paket = p.purchasePackage || 1
                    const jumlah = p.purchaseQty || 0
                    let priceInIdr = p.purchasePrice || 0
                    const currency = p.purchaseCurrency || 'IDR'
                    if (currency === 'CNY' && kursYuan) {
                        priceInIdr = (p.purchasePrice || 0) * kursYuan
                    } else if (currency === 'USD' && kursUsd) {
                        priceInIdr = (p.purchasePrice || 0) * kursUsd
                    }
                    return acc + (priceInIdr * paket * jumlah)
                }, 0),
            published: physicalProducts.filter(p => p.status === 'publish').length,
            draft: physicalProducts.filter(p => p.status === 'draft').length,
            variationProducts: localProducts.filter(p => p.type === 'variable').length,
            multiPaket: physicalProducts.filter(p => (p.purchasePackage || 0) > 1).length,
            withSku: physicalProducts.filter(p => p.sku && p.sku.trim() !== '').length,
            withoutSku: physicalProducts.filter(p => !p.sku || p.sku.trim() === '').length,
        }
        return stats
    }, [localProducts, kursYuan, kursUsd])

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null
        }
        setSortConfig({ key, direction })
    }

    const filteredProducts = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean)

        const matchesSearch = (p: any) =>
            searchWords.length === 0 || searchWords.every(word =>
                p.name.toLowerCase().includes(word) ||
                (p.sku && p.sku.toLowerCase().includes(word)) ||
                (p.storeName && p.storeName.toLowerCase().includes(word))
            )

        const matchesFilters = (p: any) => {
            // SKU Filter
            if (filters.sku === 'with' && !p.sku) return false
            if (filters.sku === 'without' && p.sku) return false

            // Type Filter (Variable)
            if (filters.type === 'variable' && p.type !== 'variable' && !p.parentId) return false

            // Discount Filter
            const hasDiscount = p.salePrice > 0 && p.salePrice < p.regularPrice
            if (filters.discount === 'with' && !hasDiscount) return false
            if (filters.discount === 'without' && hasDiscount) return false

            // Photo Filter
            const hasPhoto = p.images && Array.isArray(p.images) && p.images.length > 0
            if (filters.photo === 'with' && !hasPhoto) return false
            if (filters.photo === 'without' && hasPhoto) return false

            // Price Existence Filter
            const hasPrice = (p.price || 0) > 0
            if (filters.price === 'with' && !hasPrice) return false
            if (filters.price === 'without' && hasPrice) return false

            // Weight Filter
            const hasWeight = (p.weight || 0) > 0
            if (filters.weight === 'with' && !hasWeight) return false
            if (filters.weight === 'without' && hasWeight) return false

            // Backup Gudang Filter
            const hasBackup = !!p.backupGudang
            if (filters.backup === 'with' && !hasBackup) return false
            if (filters.backup === 'without' && hasBackup) return false

            // Price Range Filter
            const price = p.price || 0
            if (filters.minPrice && price < parseFloat(filters.minPrice.replace(/\./g, ''))) return false
            if (filters.maxPrice && price > parseFloat(filters.maxPrice.replace(/\./g, ''))) return false

            return true
        }

        const parents = [...localProducts].filter(p => !p.parentId)
        const variations = localProducts.filter(p => p.parentId)

        // Apply Sorting to Parents
        if (sortConfig.direction) {
            parents.sort((a, b) => {
                let aValue = a[sortConfig.key]
                let bValue = b[sortConfig.key]

                // Special handling for nested or calculated fields
                if (sortConfig.key === 'stok') {
                    aValue = a.stockQuantity || 0
                    bValue = b.stockQuantity || 0
                } else if (sortConfig.key === 'jumlahBeli') {
                    aValue = (a.purchasePackage || 1) * (a.purchaseQty || 0)
                    bValue = (b.purchasePackage || 1) * (b.purchaseQty || 0)
                } else if (sortConfig.key === 'hargaBeliIdr') {
                    const getPerPcs = (p: any) => {
                        let price = p.purchasePrice || 0
                        if (p.purchaseCurrency === 'CNY' && kursYuan) price *= kursYuan
                        else if (p.purchaseCurrency === 'USD' && kursUsd) price *= kursUsd
                        return price / (p.purchasePackage || 1)
                    }
                    aValue = getPerPcs(a)
                    bValue = getPerPcs(b)
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        let result: any[] = []
        parents.forEach(parent => {
            const children = variations.filter(v => v.parentId === parent.wcId)
            const parentMatchesSearch = matchesSearch(parent)
            const parentMatchesFilters = matchesFilters(parent)

            const matchingChildren = children.filter(c => matchesSearch(c) && matchesFilters(c))

            // Apply Sorting to Children if they are shown
            if (sortConfig.direction) {
                matchingChildren.sort((a, b) => {
                    let aValue = a[sortConfig.key]
                    let bValue = b[sortConfig.key]

                    if (sortConfig.key === 'stok') {
                        aValue = a.stockQuantity || 0
                        bValue = b.stockQuantity || 0
                    } else if (sortConfig.key === 'jumlahBeli') {
                        aValue = (a.purchasePackage || 1) * (a.purchaseQty || 0)
                        bValue = (b.purchasePackage || 1) * (b.purchaseQty || 0)
                    } else if (sortConfig.key === 'hargaBeliIdr') {
                        const getPerPcs = (p: any) => {
                            let price = p.purchasePrice || 0
                            if (p.purchaseCurrency === 'CNY' && kursYuan) price *= kursYuan
                            else if (p.purchaseCurrency === 'USD' && kursUsd) price *= kursUsd
                            return price / (p.purchasePackage || 1)
                        }
                        aValue = getPerPcs(a)
                        bValue = getPerPcs(b)
                    }

                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
                    return 0
                })
            }

            const shouldShowParent = (parentMatchesSearch && parentMatchesFilters) || matchingChildren.length > 0

            if (shouldShowParent) {
                result.push({ ...parent, hasVariations: children.length > 0 })

                if (expandedRows.includes(parent.wcId) || (searchWords.length > 0 && matchingChildren.length > 0) || (Object.values(filters).some(v => v !== 'all' && v !== '') && matchingChildren.length > 0)) {
                    const childrenToShow = matchingChildren.length > 0 ? matchingChildren : children
                    childrenToShow.forEach(child => {
                        result.push({ ...child, isVariation: true })
                    })
                }
            }
        })

        return result
    }, [localProducts, searchTerm, expandedRows, filters, sortConfig])

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
                    title="Store Products"
                    description="Manajemen inventaris produk dari WooCommerce."
                    icon={<Package className="w-5 h-5 font-bold" />}
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={showSupplierColumn ? "Cari produk, SKU, atau supplier..." : "Cari produk atau SKU..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full sm:w-auto">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-4 h-9 rounded-lg text-sm font-bold transition-all border shadow-sm whitespace-nowrap",
                                        showFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted"
                                    )}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filters
                                    {Object.values(filters).some(v => v !== 'all' && v !== '') && (
                                        <span className="flex items-center justify-center w-5 h-5 bg-white text-primary rounded-full text-[10px]">
                                            {Object.values(filters).filter(v => v !== 'all' && v !== '').length}
                                        </span>
                                    )}
                                </button>
                                {showSyncButton && (
                                    <button
                                        onClick={handleSync}
                                        disabled={isSyncing}
                                        className={cn(
                                            "flex items-center justify-center gap-2 px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 disabled:opacity-50 shadow-sm whitespace-nowrap",
                                            isSyncing && "animate-pulse"
                                        )}
                                    >
                                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                                        {isSyncing ? 'Sinkronisasi...' : 'Sync Now'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAddingProduct(true)}
                                    className="flex items-center justify-center gap-2 px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all hover:bg-emerald-700 shadow-sm whitespace-nowrap"
                                >
                                    <Plus className="w-4 h-4" />
                                    Tambah
                                </button>
                            </div>
                        </div>
                    }
                />

                {showFilters && (
                    <div className="bg-muted/10 border-b border-border p-6 animate-in slide-in-from-top-4 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <Filter className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-lg">Advanced Filters</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setFilters({
                                        sku: 'all',
                                        type: 'all',
                                        discount: 'all',
                                        photo: 'all',
                                        price: 'all',
                                        weight: 'all',
                                        backup: 'all',
                                        minPrice: '',
                                        maxPrice: ''
                                    })
                                }}
                                className="text-xs text-muted-foreground hover:text-primary font-medium underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                Reset All Filters
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* SKU Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <Tag className="w-3 h-3" /> SKU Status
                                </label>
                                <select
                                    value={filters.sku}
                                    onChange={(e) => setFilters(prev => ({ ...prev, sku: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua</option>
                                    <option value="with">Dengan SKU</option>
                                    <option value="without">Tanpa SKU</option>
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <Info className="w-3 h-3" /> Tipe Produk
                                </label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua Tipe</option>
                                    <option value="variable">Hanya Varian</option>
                                </select>
                            </div>

                            {/* Discount Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3" /> Status Diskon
                                </label>
                                <select
                                    value={filters.discount}
                                    onChange={(e) => setFilters(prev => ({ ...prev, discount: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua</option>
                                    <option value="with">Dengan Diskon</option>
                                    <option value="without">Tanpa Diskon</option>
                                </select>
                            </div>

                            {/* Photo Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <ImageIcon className="w-3 h-3" /> Foto Produk
                                </label>
                                <select
                                    value={filters.photo}
                                    onChange={(e) => setFilters(prev => ({ ...prev, photo: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua</option>
                                    <option value="with">Dengan Foto</option>
                                    <option value="without">Tanpa Foto</option>
                                </select>
                            </div>

                            {/* Price Existence */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3" /> Status Harga
                                </label>
                                <select
                                    value={filters.price}
                                    onChange={(e) => setFilters(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua</option>
                                    <option value="with">Dengan Harga</option>
                                    <option value="without">Tanpa Harga</option>
                                </select>
                            </div>

                            {/* Weight Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <Weight className="w-3 h-3" /> Status Berat
                                </label>
                                <select
                                    value={filters.weight}
                                    onChange={(e) => setFilters(prev => ({ ...prev, weight: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua</option>
                                    <option value="with">Dengan Berat</option>
                                    <option value="without">Tanpa Berat</option>
                                </select>
                            </div>

                            {/* Backup Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3 h-3" /> Backup Gudang
                                </label>
                                <select
                                    value={filters.backup}
                                    onChange={(e) => setFilters(prev => ({ ...prev, backup: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua</option>
                                    <option value="with">Ada Backup</option>
                                    <option value="without">Tidak Ada</option>
                                </select>
                            </div>

                            {/* Range Harga */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3" /> Range Harga
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Min"
                                        value={filters.minPrice}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            setFilters(prev => ({ ...prev, minPrice: val ? formatNumber(parseInt(val)) : '' }))
                                        }}
                                        className="w-full bg-background border border-border rounded-lg px-2 py-2 text-xs outline-none focus:border-primary transition-all shadow-sm"
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                        type="text"
                                        placeholder="Max"
                                        value={filters.maxPrice}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            setFilters(prev => ({ ...prev, maxPrice: val ? formatNumber(parseInt(val)) : '' }))
                                        }}
                                        className="w-full bg-background border border-border rounded-lg px-2 py-2 text-xs outline-none focus:border-primary transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <TableScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {showPurchasedColumn && <TableHead align="center" className="w-10">Beli</TableHead>}
                                <TableHead align="center" className="w-16">Gambar</TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    Info Produk
                                    <SortIcon columnKey="name" sortConfig={sortConfig} />
                                </TableHead>
                                {showSupplierColumn && (
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                                        onClick={() => handleSort('storeName')}
                                    >
                                        Supplier
                                        <SortIcon columnKey="storeName" sortConfig={sortConfig} />
                                    </TableHead>
                                )}
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => handleSort('sku')}
                                >
                                    SKU
                                    <SortIcon columnKey="sku" sortConfig={sortConfig} />
                                </TableHead>
                                {!showPurchaseColumns && <TableHead>Keterangan</TableHead>}
                                <TableHead
                                    align="right"
                                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => handleSort('price')}
                                >
                                    Harga Jual & Stok
                                    <SortIcon columnKey="price" sortConfig={sortConfig} />
                                </TableHead>
                                {showPurchaseColumns && (
                                    <>
                                        <TableHead
                                            align="center"
                                            className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('jumlahBeli')}
                                        >
                                            Jumlah Beli
                                            <SortIcon columnKey="jumlahBeli" sortConfig={sortConfig} />
                                        </TableHead>
                                        <TableHead
                                            align="right"
                                            className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                            onClick={() => handleSort('hargaBeliIdr')}
                                        >
                                            Harga Beli (IDR)
                                            <SortIcon columnKey="hargaBeliIdr" sortConfig={sortConfig} />
                                        </TableHead>
                                    </>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.length > 0 ? (
                                paginatedProducts.map((product) => (
                                    <TableRow
                                        key={product.isVariation ? `var-${product.wcId}` : `parent-${product.wcId}`}
                                        className={cn(
                                            product.isVariation && "bg-muted/5 border-l-4 border-l-primary/20"
                                        )}
                                    >
                                        {showPurchasedColumn && (
                                            <TableCell align="center">
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
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div
                                                className={cn(
                                                    "rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border cursor-zoom-in transition-all",
                                                    product.isVariation ? "w-8 h-8 ml-auto mr-0" : "w-12 h-12"
                                                )}
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
                                                    <Package className={product.isVariation ? "w-4 h-4 text-muted-foreground" : "w-6 h-6 text-muted-foreground"} />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-left">
                                                <span
                                                    className={cn(
                                                        "font-medium text-foreground text-sm line-clamp-2",
                                                        product.isVariation && "text-xs italic text-muted-foreground"
                                                    )}
                                                    title={product.name}
                                                >
                                                    {product.isVariation && <span className="text-primary font-bold mr-1">↳ [Varian]</span>}
                                                    {product.name}
                                                </span>
                                                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                                    <span className="text-[10px] text-muted-foreground">
                                                        ID: {product.wcId} {product.weight ? `• ${product.weight} kg` : ''}
                                                    </span>
                                                    {product.categories && product.categories.length > 0 && (
                                                        <span className="text-[10px] text-primary/70 font-medium">
                                                            • {product.categories.map((c: any) => c.name).join(', ')}
                                                        </span>
                                                    )}
                                                    {showPurchaseColumns && product.purchased && (
                                                        <button
                                                            onClick={() => setEditPurchaseProduct(product)}
                                                            className="p-0.5 rounded text-muted-foreground hover:text-amber-600 transition-colors flex items-center gap-0.5 text-[10px] font-bold uppercase"
                                                            title="Edit Data Pembelian"
                                                        >
                                                            <ShoppingCart className="w-2.5 h-2.5" />
                                                            Beli
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleSingleSync(product)}
                                                        disabled={syncingItems.has(product.wcId)}
                                                        className={cn(
                                                            "p-0.5 rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 text-[10px] font-bold uppercase",
                                                            syncingItems.has(product.wcId) && "text-primary"
                                                        )}
                                                        title="Sync dari WooCommerce"
                                                    >
                                                        <RefreshCw className={cn("w-2.5 h-2.5", syncingItems.has(product.wcId) && "animate-spin")} />
                                                        {finishedItems.has(product.wcId) ? "Selesai" : "Sync"}
                                                    </button>
                                                    {showPurchaseColumns && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingProduct(product)}
                                                                className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 text-[10px] font-bold uppercase"
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
                                                        </>
                                                    )}
                                                    {!showPurchaseColumns && (
                                                        <button
                                                            onClick={() => setEditingProduct(product)}
                                                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase bg-muted/50 px-1.5"
                                                            title="Edit Produk"
                                                        >
                                                            <Edit2 className="w-2.5 h-2.5" />
                                                            Edit
                                                        </button>
                                                    )}
                                                </div>
                                                {!showPurchaseColumns && (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase",
                                                            product.status === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                        )}>
                                                            {product.status}
                                                        </span>
                                                        {product.purchased && (
                                                            <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                                                                Sudah Dibeli
                                                            </span>
                                                        )}
                                                        {!product.isVariation && product.type === 'variable' && (
                                                            <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                                                                Variable
                                                            </span>
                                                        )}
                                                        {product.isMissingFromWoo && (
                                                            <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20">
                                                                Tidak ditemukan
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Inline keterangan for purchased page */}
                                                {showPurchaseColumns && (
                                                    <div className="mt-0.5">
                                                        <KeteranganEdit
                                                            key={`inline-${product.wcId}`}
                                                            wcId={product.wcId}
                                                            initialValue={product.keterangan}
                                                            productName={product.name}
                                                            compact
                                                        />
                                                    </div>
                                                )}

                                                {product.hasVariations && (
                                                    <button
                                                        onClick={() => {
                                                            setExpandedRows(prev =>
                                                                prev.includes(product.wcId)
                                                                    ? prev.filter(id => id !== product.wcId)
                                                                    : [...prev, product.wcId]
                                                            )
                                                        }}
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
                                        {showSupplierColumn && (
                                            <TableCell className="min-w-[180px]">
                                                <SupplierPicker
                                                    key={product.wcId}
                                                    wcId={product.wcId}
                                                    initialValue={product.storeName || ''}
                                                />
                                            </TableCell>
                                        )}
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
                                        {!showPurchaseColumns && (
                                            <TableCell className="min-w-[200px]">
                                                <KeteranganEdit
                                                    key={product.wcId}
                                                    wcId={product.wcId}
                                                    initialValue={product.keterangan}
                                                    productName={product.name}
                                                />
                                            </TableCell>
                                        )}
                                        <TableCell align="right" className="whitespace-nowrap">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex flex-col items-end">
                                                    <div className="text-sm font-medium text-foreground">{formatCurrency(product.price || 0)}</div>
                                                    {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                        <div className="text-[10px] text-muted-foreground line-through">
                                                            {formatCurrency(product.regularPrice)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end border-t border-border pt-1">
                                                    <span className={cn(
                                                        "text-sm font-semibold",
                                                        (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-green-600"
                                                    )}>
                                                        {formatNumber(product.stockQuantity || 0)} stok
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        {showPurchaseColumns && (
                                            <>
                                                <TableCell align="center" className="whitespace-nowrap">
                                                    {product.purchaseQty ? (() => {
                                                        const paket = product.purchasePackage || 1
                                                        const jumlah = product.purchaseQty
                                                        const totalBarang = paket * jumlah
                                                        return (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="text-sm font-semibold text-foreground">
                                                                    {formatNumber(totalBarang)} pcs
                                                                </span>
                                                                {paket > 1 && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {paket} paket × {jumlah}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })() : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right" className="whitespace-nowrap">
                                                    {product.purchasePrice ? (() => {
                                                        const paket = product.purchasePackage || 1
                                                        const jumlah = product.purchaseQty || 0
                                                        let priceInputIdr = product.purchasePrice
                                                        const currency = product.purchaseCurrency || 'IDR'
                                                        if (currency === 'CNY' && kursYuan) {
                                                            priceInputIdr = product.purchasePrice * kursYuan
                                                        } else if (currency === 'USD' && kursUsd) {
                                                            priceInputIdr = product.purchasePrice * kursUsd
                                                        }
                                                        const perPcs = priceInputIdr / paket
                                                        const totalHarga = priceInputIdr * paket * jumlah
                                                        return (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[10px] text-muted-foreground uppercase">per pcs</span>
                                                                    <span className="text-sm font-semibold text-foreground">
                                                                        Rp {formatNumber(Math.round(perPcs))}
                                                                    </span>
                                                                </div>
                                                                {jumlah > 0 && (
                                                                    <div className="flex flex-col items-end border-t border-border pt-1">
                                                                        <span className="text-[10px] text-muted-foreground uppercase">total</span>
                                                                        <span className="text-sm font-bold text-primary">
                                                                            Rp {formatNumber(Math.round(totalHarga))}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {currency !== 'IDR' && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {currency === 'CNY' ? '¥' : '$'}{formatNumber(product.purchasePrice)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )
                                                    })() : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableEmpty
                                    colSpan={(showSupplierColumn ? 1 : 0) + (showPurchasedColumn ? 1 : 0) + (showPurchaseColumns ? 2 : 0) + (showPurchaseColumns ? 4 : 5)}
                                    icon={<Package className="w-12 h-12 opacity-10" />}
                                    message="Tidak ada produk ditemukan."
                                    description={searchTerm ? (
                                        <button onClick={() => setSearchTerm('')} className="text-primary text-xs hover:underline mt-1 font-medium">
                                            Hapus filter pencarian
                                        </button>
                                    ) : (
                                        <p>Klik "Sync Now" untuk mengambil data dari WooCommerce.</p>
                                    )}
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
                    onItemsPerPageChange={(count) => {
                        setItemsPerPage(count)
                        setCurrentPage(1)
                    }}
                    totalCount={filteredProducts.length}
                />
            </TableWrapper>

            {/* Product Analysis Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Analisa Produk</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Jumlah Barang</p>
                        <p className="text-2xl font-bold text-foreground">{formatNumber(analysis.totalProducts)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-red-50/50 border border-red-100/50">
                        <p className="text-xs font-semibold text-red-600/70 uppercase tracking-wider mb-1">Stok Kosong (≤ 0)</p>
                        <p className="text-2xl font-bold text-red-600">{formatNumber(analysis.outOfStock)}</p>
                    </div>
                    {showPurchaseColumns ? (
                        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50 md:col-span-2">
                            <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider mb-1">Total Pembelian (IDR)</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(analysis.totalPurchaseValue)}</p>
                                <p className="text-[10px] text-emerald-600/60 font-medium mt-1 italic">
                                    * Total dari semua produk yang memiliki data pembelian.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50 md:col-span-2">
                            <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider mb-1">Total Aset (Harga x Stok)</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(analysis.totalAssetValue)}</p>
                                <p className="text-[10px] text-emerald-600/60 font-medium mt-1 italic leading-relaxed">
                                    * Hanya produk status <span className="font-bold underline">Publish</span> dengan stok positif yang dihitung. Stok minus dihitung sebagai 0. Kategori JASA, PART, dan ROBOT ICHIBOT dikecualikan.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status Publish</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-foreground">{formatNumber(analysis.published)}</p>
                            <span className="text-[10px] font-medium text-muted-foreground">Produk</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status Draft</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-foreground">{formatNumber(analysis.draft)}</p>
                            <span className="text-[10px] font-medium text-muted-foreground">Produk</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            {showPurchaseColumns ? 'Produk Paket >1' : 'Produk Varian'}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-foreground">
                                {formatNumber(showPurchaseColumns ? analysis.multiPaket : analysis.variationProducts)}
                            </p>
                            <span className="text-[10px] font-medium text-muted-foreground">Produk</span>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kelengkapan SKU</p>
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Dengan SKU:</span>
                                <span className="font-bold text-emerald-600">{formatNumber(analysis.withSku)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Tanpa SKU:</span>
                                <span className="font-bold text-orange-600">{formatNumber(analysis.withoutSku)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Image Preview */}
            {
                hoveredImage && (
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
                                src={hoveredImage || undefined}
                                alt="Preview"
                                className="w-[300px] h-[300px] object-cover rounded-xl"
                            />
                        </div>
                    </div>
                )
            }

            {
                editingProduct && (
                    <EditProductModal
                        product={editingProduct}
                        onClose={() => setEditingProduct(null)}
                        onSuccess={() => {
                            router.refresh()
                        }}
                    />
                )
            }

            {
                isAddingProduct && (
                    <EditProductModal
                        product={null}
                        onClose={() => setIsAddingProduct(false)}
                        onSuccess={() => {
                            router.refresh()
                        }}
                    />
                )
            }

            {editPurchaseProduct && (
                <PurchaseInputModal
                    isOpen={!!editPurchaseProduct}
                    onClose={() => setEditPurchaseProduct(null)}
                    product={editPurchaseProduct}
                    kursYuan={kursYuan}
                    kursUsd={kursUsd}
                    editMode
                />
            )}
        </div >
    )
}
