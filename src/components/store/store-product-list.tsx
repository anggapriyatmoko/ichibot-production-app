'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, RefreshCw, Package, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, Circle, ChevronDown, HelpCircle, Edit2, Plus, Filter, X, Image as ImageIcon, Weight, DollarSign, Tag, Info, ArrowUpDown, ArrowUp, ArrowDown, ShoppingCart, Star, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

import { formatNumber, formatCurrency, formatDateTime } from '@/utils/format'
import { syncStoreProducts, toggleStoreProductPurchased, toggleStoreProductPriority, syncSingleStoreProduct, getStoreProducts, updateStoreProductSimulationSettings, clearAllStoreProductSimulationSettings } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import SupplierPicker from './supplier-picker'
import KeteranganEdit from './keterangan-edit'
import { useConfirmation } from '@/components/providers/modal-provider'
import EditProductModal from './edit-product-modal'
import PurchaseInputModal from './purchase-input-modal'
import SyncLogModal from './sync-log-modal'
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
    TableHeaderContent,
    TableResponsive,
    TableMobileCard,
    TableMobileCardHeader,
    TableMobileCardContent,
    TableMobileCardFooter
} from '@/components/ui/table'

function SortIcon({ columnKey, sortConfig, className }: { columnKey: string, sortConfig: { key: string, direction: 'asc' | 'desc' | null }, className?: string }) {
    if (sortConfig.key !== columnKey || !sortConfig.direction) {
        return <ArrowUpDown className={cn("w-3 h-3 text-muted-foreground/30", className)} />
    }
    return sortConfig.direction === 'asc'
        ? <ArrowUp className={cn("w-3 h-3 text-primary", className)} />
        : <ArrowDown className={cn("w-3 h-3 text-primary", className)} />
}
function HoverLabaTooltip({ content, children }: { content: React.ReactNode, children: React.ReactNode }) {
    const [isHovered, setIsHovered] = useState(false)
    const [coords, setCoords] = useState({ x: 0, y: 0, isTop: false, alignRight: false })

    return (
        <div
            className="inline-flex items-center justify-center cursor-help group"
            onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const spaceBelow = window.innerHeight - rect.bottom
                const isTop = spaceBelow < 250
                const width = 280
                const alignRight = rect.left + width > window.innerWidth
                setCoords({
                    x: alignRight ? rect.right - width : rect.left,
                    y: isTop ? rect.top : Math.min(window.innerHeight - 250, rect.bottom),
                    isTop,
                    alignRight
                })
                setIsHovered(true)
            }}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
            {isHovered && typeof window !== 'undefined' && createPortal(
                <div
                    className={cn(
                        "fixed z-[99999] pointer-events-none animate-in fade-in duration-100",
                        coords.isTop ? "origin-bottom" : "origin-top",
                        coords.alignRight ? "origin-right" : "origin-left"
                    )}
                    style={{
                        left: Math.max(10, coords.x),
                        ...(coords.isTop ? { bottom: window.innerHeight - coords.y + 10 } : { top: Math.min(window.innerHeight - 250, coords.y) + 10 })
                    }}
                >
                    <div className="w-[280px] bg-popover/95 backdrop-blur-md border border-border/60 text-popover-foreground text-xs rounded-xl shadow-2xl flex flex-col items-stretch overflow-hidden">
                        {content}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export default function StoreProductList({
    initialProducts,
    showPurchasedStyles = true,
    showSupplierColumn = true,
    showPurchasedColumn = true,
    showQuantityColumn = true,
    showPurchasedAt = false,
    showSyncButton = true,
    showPurchaseColumns = false,
    showAddButton = true,
    hideSupplierInput = false,
    hideSkuColumn = false,
    hideTotalsInCells = false,
    isAnalisaHarga = false,
    kursYuan,
    kursUsd,
    additionalFee = 0,
    shopeeAdminFee = 0,
    shopeeServiceFee = 0,
    tokpedAdminFee = 0,
    tokpedServiceFee = 0,
    hideLabaColumn = false,
    hideStokColumn = false,
    hideSimulasiColumn = false,
    hideCategory = false,
    hideProductEdit = false,
    hidePurchaseEdit = false,
    useProductPriceOnly = false,
    hideResetButton = false,
    showExportButton = false,
    exportFilenamePrefix = 'EXPORT'
}: {
    initialProducts: any[],
    showPurchasedStyles?: boolean,
    showSupplierColumn?: boolean,
    showPurchasedColumn?: boolean,
    showQuantityColumn?: boolean,
    showPurchasedAt?: boolean,
    showSyncButton?: boolean,
    showPurchaseColumns?: boolean,
    showAddButton?: boolean,
    hideSupplierInput?: boolean,
    hideSkuColumn?: boolean,
    hideTotalsInCells?: boolean,
    isAnalisaHarga?: boolean,
    kursYuan?: number,
    kursUsd?: number,
    additionalFee?: number,
    shopeeAdminFee?: number,
    shopeeServiceFee?: number,
    tokpedAdminFee?: number,
    tokpedServiceFee?: number,
    hideLabaColumn?: boolean,
    hideStokColumn?: boolean,
    hideSimulasiColumn?: boolean,
    hideCategory?: boolean,
    hideProductEdit?: boolean,
    hidePurchaseEdit?: boolean,
    useProductPriceOnly?: boolean,
    hideResetButton?: boolean,
    showExportButton?: boolean,
    exportFilenamePrefix?: string
}) {








    const TooltipRow = ({ label, value, isNegative, isBold, isTotal }: { label: string, value: string | React.ReactNode, isNegative?: boolean, isBold?: boolean, isTotal?: boolean }) => (
        <div className="flex justify-between gap-6 items-center mb-1 last:mb-0">
            <span className={cn(
                "text-muted-foreground font-medium flex-shrink text-[11px]",
                isTotal && "font-bold text-foreground"
            )}>{label}</span>
            <span className={cn(
                "font-mono font-medium whitespace-nowrap flex-shrink-0 text-[11px]",
                isNegative && "text-destructive",
                isBold && "font-bold",
                isTotal && "font-black"
            )}>{value}</span>
        </div>
    )

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
        missing: 'all', // all, with, without
        minPrice: '',
        maxPrice: ''
    })
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({
        key: 'name',
        direction: null
    })
    const [syncingItems, setSyncingItems] = useState<Set<number>>(new Set())
    const [finishedItems, setFinishedItems] = useState<Set<number>>(new Set())
    const [activeLabaDetail, setActiveLabaDetail] = useState<string | null>(null)

    // Sync Log Modal States
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [syncLogs, setSyncLogs] = useState<{ message: string, timestamp: string }[]>([])
    const [isSyncComplete, setIsSyncComplete] = useState(false)
    const [hasSyncError, setHasSyncError] = useState(false)

    const { showConfirmation } = useConfirmation()
    const { showAlert, showError } = useAlert()
    const router = useRouter()

    // Update local products when initialProducts change (e.g., after sync)
    useEffect(() => {
        setLocalProducts(initialProducts)
        // Also update simulation data if it's new from DB
        const data: Record<number, number> = {}
        const priceData: Record<number, number> = {}
        initialProducts.forEach(p => {
            if (p.simulationQty) data[p.wcId] = p.simulationQty
            if ((p as any).simulationPrice) priceData[p.wcId] = (p as any).simulationPrice
        })
        setSimulationData(data)
        setSimulationPriceData(priceData)
    }, [initialProducts])

    // Reset page to 1 when search term changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    // Set default sort to priority for Analisa Harga
    useEffect(() => {
        if (isAnalisaHarga) {
            setSortConfig({ key: 'priority', direction: 'desc' })
        }
    }, [isAnalisaHarga])

    const [simulationData, setSimulationData] = useState<Record<number, number>>(() => {
        const data: Record<number, number> = {}
        initialProducts.forEach(p => {
            if (p.simulationQty) data[p.wcId] = p.simulationQty
        })
        return data
    })

    const [simulationPriceData, setSimulationPriceData] = useState<Record<number, number>>(() => {
        const priceData: Record<number, number> = {}
        initialProducts.forEach(p => {
            if ((p as any).simulationPrice) priceData[p.wcId] = (p as any).simulationPrice
        })
        return priceData
    })

    const handleSimulationChange = async (wcId: number, qty: number) => {
        const newQty = Math.max(0, qty)
        setSimulationData(prev => ({ ...prev, [wcId]: newQty }))

        let price = simulationPriceData[wcId] !== undefined ? simulationPriceData[wcId] : null
        await updateStoreProductSimulationSettings(wcId, newQty, price)
    }

    const handleSimulationPriceChange = async (wcId: number, val: string) => {
        let newPrice: number | null = null
        if (val !== '') {
            newPrice = parseInt(val) || 0
        }

        setSimulationPriceData(prev => {
            const next = { ...prev }
            if (newPrice === null) {
                delete next[wcId]
            } else {
                next[wcId] = newPrice
            }
            localStorage.setItem('simulationPriceDataStorage', JSON.stringify(next))
            return next
        })

        const qty = simulationData[wcId] || 0
        await updateStoreProductSimulationSettings(wcId, qty, newPrice)
    }

    const handleClearSimulation = () => {
        showConfirmation({
            title: 'Hapus Simulasi',
            message: 'Apakah Anda yakin ingin menghapus semua data simulasi? Data yang sudah diinput akan hilang.',
            confirmLabel: 'Ya, Hapus',
            cancelLabel: 'Batal',
            type: 'confirm',
            action: async () => {
                const res = await clearAllStoreProductSimulationSettings()
                if (res.success) {
                    setSimulationData({})
                    setSimulationPriceData({})
                    localStorage.removeItem('simulationPriceDataStorage')
                    showAlert('Data simulasi berhasil dihapus.')
                } else {
                    showError(res.error || 'Gagal menghapus data simulasi.')
                }
            }
        })
    }

    const handleSync = async () => {
        setIsSyncing(true)
        setShowSyncModal(true)
        setSyncLogs([])
        setIsSyncComplete(false)
        setHasSyncError(false)

        try {
            const response = await fetch('/api/store/sync')
            if (!response.ok) throw new Error('Gagal memulai sinkronisasi.')

            const reader = response.body?.getReader()
            if (!reader) throw new Error('Stream reader tidak tersedia.')

            const decoder = new TextDecoder()
            let partialData = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                partialData += chunk

                const lines = partialData.split('\n\n')
                partialData = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            setSyncLogs(prev => [...prev, data])
                            if (data.message.startsWith('Gagal') || data.message.includes('ERROR')) {
                                setHasSyncError(true)
                            }
                        } catch (e) {
                            console.error('Error parsing sync log:', e)
                        }
                    }
                }
            }

            setIsSyncComplete(true)
            // Refresh local state without reload
            const updatedProducts = await getStoreProducts()
            setLocalProducts(updatedProducts)
            // router.refresh()
        } catch (error: any) {
            setHasSyncError(true)
            setIsSyncComplete(true)
            setSyncLogs(prev => [...prev, {
                message: `ERROR: ${error.message || 'Terjadi kesalahan sistem.'}`,
                timestamp: new Date().toISOString()
            }])
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
            if (result.success && result.product) {
                // Update local state for immediate UI refresh
                setLocalProducts(prev => prev.map(p =>
                    p.wcId === id ? result.product : p
                ))

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

                // router.refresh()
            } else if (result.success) {
                // Fallback for cases where product might not be returned
                router.refresh()
                setSyncingItems(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
                setFinishedItems(prev => new Set(prev).add(id))
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

    const handleTogglePriority = async (wcId: number, currentPriority: boolean) => {
        const newPriority = !currentPriority

        // Optimistic UI update
        setLocalProducts(prev => prev.map(p =>
            p.wcId === wcId ? { ...p, priority: newPriority } : p
        ))

        try {
            const result = await toggleStoreProductPriority(wcId, newPriority)
            if (!result.success) {
                // Revert on error
                setLocalProducts(prev => prev.map(p =>
                    p.wcId === wcId ? { ...p, priority: currentPriority } : p
                ))
                showError('Gagal memperbarui status prioritas.')
            }
        } catch (error) {
            setLocalProducts(prev => prev.map(p =>
                p.wcId === wcId ? { ...p, priority: currentPriority } : p
            ))
            showError('Terjadi kesalahan sistem.')
        }
    }

    const handleExportExcel = () => {
        try {
            // Helper to format number for Indonesian Excel (comma decimal, no dots)
            const formatExcelNum = (num: number) => {
                if (num === 0 || isNaN(num)) return 0
                // Remove thousand separator (dot) and use comma for decimal as requested
                return num.toFixed(2).replace('.', ',').replace(/,00$/, '')
            }

            // Prepare data for export
            const exportData = filteredProducts.map(p => {
                const hargaJual = p.price || 0
                const paket = p.purchasePackage || 1
                const qtyPerPaket = p.purchaseQty || 1

                let hargaBeliIdr = p.purchasePrice || 0
                const currency = p.purchaseCurrency || 'IDR'
                if (currency === 'CNY' && kursYuan) hargaBeliIdr *= kursYuan
                else if (currency === 'USD' && kursUsd) hargaBeliIdr *= kursUsd

                const totalHargaBeli = hargaBeliIdr * paket * (1 + (additionalFee || 0) / 100)
                const hargaBeliPerPcs = totalHargaBeli / (paket * qtyPerPaket)

                const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                const labaShp = hargaJual - hargaBeliPerPcs - shopeeFee
                const labaTkp = hargaJual - hargaBeliPerPcs - tokpedFee

                const totalQty = paket * qtyPerPaket
                const totalLabaShp = labaShp * totalQty
                const totalLabaTkp = labaTkp * totalQty

                const simPriceInput = simulationPriceData[Number(p.wcId)]
                const simQty = simulationData[Number(p.wcId)] || 0
                const simHargaJual = (!useProductPriceOnly && simPriceInput !== undefined && simPriceInput !== 0) ? simPriceInput : hargaJual

                const simShopeeFee = simHargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                const simTokpedFee = simHargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                const simLabaShp = simHargaJual - hargaBeliPerPcs - simShopeeFee
                const simLabaTkp = simHargaJual - hargaBeliPerPcs - simTokpedFee

                const totalSimLabaShp = simLabaShp * simQty
                const totalSimLabaTkp = simLabaTkp * simQty

                const baseData: any = {
                    'ID WC': p.wcId,
                    'Nama Produk': p.name,
                    'SKU': p.sku || '',
                    'Kategori': (p.categories || []).map((c: any) => c.name).join(', '),
                    'Supplier': p.storeName || '',
                    'Stok': formatExcelNum(p.stockQuantity || 0),
                    'Harga Jual': formatExcelNum(hargaJual),
                }

                if (showPurchaseColumns) {
                    baseData['Harga Beli (Satuan)'] = formatExcelNum(hargaBeliPerPcs)
                    baseData['Harga Beli (Total)'] = formatExcelNum(totalHargaBeli)
                    baseData['Jumlah Beli'] = formatExcelNum(totalQty)
                    baseData['Laba Satuan Shopee'] = formatExcelNum(labaShp)
                    baseData['Laba Satuan Tokopedia'] = formatExcelNum(labaTkp)
                    baseData['Total Laba Shopee'] = formatExcelNum(totalLabaShp)
                    baseData['Total Laba Tokopedia'] = formatExcelNum(totalLabaTkp)
                } else {
                    baseData['Data Gudang'] = p.backupGudang || ''
                }

                if (isAnalisaHarga) {
                    baseData['Simulasi Qty'] = formatExcelNum(simQty)
                    baseData['Simulasi Harga'] = formatExcelNum(simHargaJual)
                    baseData['Laba Unit Shopee (Sim)'] = formatExcelNum(simLabaShp)
                    baseData['Laba Unit Tokopedia (Sim)'] = formatExcelNum(simLabaTkp)
                    baseData['Total Laba Shopee (Sim)'] = formatExcelNum(totalSimLabaShp)
                    baseData['Total Laba Tokopedia (Sim)'] = formatExcelNum(totalSimLabaTkp)
                }

                baseData['Status'] = p.status
                baseData['Prioritas'] = p.priority ? 'Ya' : 'Tidak'

                return baseData

            })

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(exportData)

            // Create workbook
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Products')

            // Generate filename based on date and prefix
            const dateStr = new Date().toISOString().split('T')[0]
            const filename = `${exportFilenamePrefix} - ${dateStr}.xlsx`

            // Download file
            XLSX.writeFile(wb, filename)

            showAlert('Data berhasil diekspor ke Excel.')
        } catch (error: any) {
            console.error('Export error:', error)
            showError('Gagal mengekspor data: ' + error.message)
        }
    }

    const analysis = useMemo(() => {
        // Filter out 'variable' type to avoid double counting stock (count only simple and variations)
        const physicalProducts = localProducts.filter(p => p.type !== 'variable')

        const excludedCategories = ['JASA', 'PART', 'ROBOT ICHIBOT', 'PART ICHIBOT']
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
                .filter(p => p.purchased && p.purchasePrice && p.purchaseQty)
                .reduce((acc, p) => {
                    const paket = p.purchasePackage || 1
                    let priceInIdr = p.purchasePrice || 0
                    const currency = p.purchaseCurrency || 'IDR'
                    if (currency === 'CNY' && kursYuan) {
                        priceInIdr = (p.purchasePrice || 0) * kursYuan
                    } else if (currency === 'USD' && kursUsd) {
                        priceInIdr = (p.purchasePrice || 0) * kursUsd
                    }
                    return acc + (priceInIdr * paket) // Total = Harga * Paket
                }, 0),
            totalPurchaseValueInclFee: physicalProducts
                .filter(p => p.purchased && p.purchasePrice && p.purchaseQty)
                .reduce((acc, p) => {
                    const paket = p.purchasePackage || 1
                    let priceInIdr = p.purchasePrice || 0
                    const currency = p.purchaseCurrency || 'IDR'
                    if (currency === 'CNY' && kursYuan) {
                        priceInIdr = (p.purchasePrice || 0) * kursYuan
                    } else if (currency === 'USD' && kursUsd) {
                        priceInIdr = (p.purchasePrice || 0) * kursUsd
                    }
                    const total = priceInIdr * paket
                    return acc + (total * (1 + (additionalFee || 0) / 100))
                }, 0),
            published: physicalProducts.filter(p => p.status === 'publish').length,
            draft: physicalProducts.filter(p => p.status === 'draft').length,
            variationProducts: localProducts.filter(p => p.type === 'variable').length,
            multiPaket: physicalProducts.filter(p => (p.purchasePackage || 0) > 1).length,
            priorityProducts: physicalProducts.filter(p => p.priority).length,
            withSku: physicalProducts.filter(p => p.sku && p.sku.trim() !== '').length,
            withoutSku: physicalProducts.filter(p => !p.sku || p.sku.trim() === '').length,
            totalOmset: physicalProducts
                .filter(p => p.purchased && p.purchasePrice && p.purchaseQty)
                .reduce((acc, p) => {
                    const paket = p.purchasePackage || 1
                    const jumlah = p.purchaseQty || 0
                    const hargaJual = p.price || 0
                    return acc + (hargaJual * paket * jumlah)
                }, 0),
            totalLaba: physicalProducts
                .filter(p => p.purchased && p.purchasePrice && p.purchaseQty)
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
                    const totalHarga = priceInIdr * paket * (1 + (additionalFee || 0) / 100)
                    const perPcs = totalHarga / ((paket * jumlah) || 1)
                    const hargaJual = p.price || 0
                    const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                    const labaPerPcs = hargaJual - perPcs - shopeeFee
                    return acc + (labaPerPcs * paket * jumlah)
                }, 0),
            withPurchasePrice: physicalProducts.filter(p => p.purchasePrice && p.purchasePrice > 0).length,
            withoutPurchasePrice: physicalProducts.filter(p => !p.purchasePrice || p.purchasePrice <= 0).length,
            avgLaba: 0,
            avgMargin: 0
        }

        // Calculate averages for products with purchase price
        let analyzedProducts = physicalProducts.filter(p => p.purchasePrice && p.purchasePrice > 0 && p.price && p.price > 0)

        // Simulation Metrics
        const simulationStats = {
            count: 0,
            shopee: { laba: 0, omset: 0, modal: 0 },
            tokped: { laba: 0, omset: 0, modal: 0 },
            cina: { laba: 0, omset: 0, modal: 0 }
        }

        if (isAnalisaHarga) {
            // Priority 1: Use simulation data if present AND simulation column is visible AND not forced to product price
            const hasSimulation = !hideSimulasiColumn && !useProductPriceOnly && Object.values(simulationData).some(q => q > 0)

            if (hasSimulation) {

                physicalProducts.forEach(p => {
                    const id = Number(p.wcId)
                    const qty = simulationData[id] || 0
                    if (qty > 0) {
                        simulationStats.count++
                        const simPrice = simulationPriceData[id]
                        const hargaJual = (simPrice !== undefined && simPrice !== 0) ? simPrice : (p.price || 0)
                        const currentOmset = hargaJual * qty

                        simulationStats.shopee.omset += currentOmset
                        simulationStats.tokped.omset += currentOmset

                        if (p.purchasePrice) {
                            const paket = (p.purchasePackage || 1)
                            let priceInIdr = p.purchasePrice
                            const currency = p.purchaseCurrency || 'IDR'
                            if (currency === 'CNY' && kursYuan) priceInIdr *= kursYuan
                            else if (currency === 'USD' && kursUsd) priceInIdr *= kursUsd

                            const totalHarga = priceInIdr * paket * (1 + (additionalFee || 0) / 100)
                            const perPcs = totalHarga / ((paket * (p.purchaseQty || 1)) || 1)
                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                            const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                            const currentCinaModal = perPcs * qty
                            const shopeeFeeTotal = shopeeFee * qty
                            const tokpedFeeTotal = tokpedFee * qty

                            simulationStats.shopee.modal += currentCinaModal + shopeeFeeTotal
                            simulationStats.tokped.modal += currentCinaModal + tokpedFeeTotal
                            simulationStats.cina.modal += currentCinaModal

                            const labaShpPerPcs = hargaJual - perPcs - shopeeFee
                            const labaTkpPerPcs = hargaJual - perPcs - tokpedFee
                            const labaCinaPerPcs = hargaJual - perPcs

                            simulationStats.shopee.laba += labaShpPerPcs * qty
                            simulationStats.tokped.laba += labaTkpPerPcs * qty
                            simulationStats.cina.laba += labaCinaPerPcs * qty

                            simulationStats.cina.omset += currentOmset
                        }
                    }
                })
            } else if (hideSimulasiColumn || useProductPriceOnly) {
                // Priority 2: Use list items (for History or Ordered view where simulation is hidden)

                physicalProducts.forEach(p => {
                    const qty = (p.purchasePackage || 1) * (p.purchaseQty || 1)
                    if (qty > 0) {
                        simulationStats.count++
                        const hargaJual = p.price || 0
                        const currentOmset = hargaJual * qty

                        simulationStats.shopee.omset += currentOmset
                        simulationStats.tokped.omset += currentOmset

                        if (p.purchasePrice) {
                            const paket = (p.purchasePackage || 1)
                            let priceInIdr = p.purchasePrice
                            const currency = p.purchaseCurrency || 'IDR'
                            if (currency === 'CNY' && kursYuan) priceInIdr *= kursYuan
                            else if (currency === 'USD' && kursUsd) priceInIdr *= kursUsd

                            const totalHarga = priceInIdr * paket * (1 + (additionalFee || 0) / 100)
                            const perPcs = totalHarga / ((paket * (p.purchaseQty || 1)) || 1)
                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                            const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                            const currentCinaModal = perPcs * qty
                            const shopeeFeeTotal = shopeeFee * qty
                            const tokpedFeeTotal = tokpedFee * qty

                            simulationStats.shopee.modal += currentCinaModal + shopeeFeeTotal
                            simulationStats.tokped.modal += currentCinaModal + tokpedFeeTotal
                            simulationStats.cina.modal += currentCinaModal

                            const labaShpPerPcs = hargaJual - perPcs - shopeeFee
                            const labaTkpPerPcs = hargaJual - perPcs - tokpedFee
                            const labaCinaPerPcs = hargaJual - perPcs

                            simulationStats.shopee.laba += labaShpPerPcs * qty
                            simulationStats.tokped.laba += labaTkpPerPcs * qty
                            simulationStats.cina.laba += labaCinaPerPcs * qty

                            simulationStats.cina.omset += currentOmset
                        }
                    }
                })
            }
        }


        if (analyzedProducts.length > 0) {
            let totalMargin = 0
            let totalLabaPcs = 0
            analyzedProducts.forEach(p => {
                const paket = (p.purchasePackage || 1)
                const jumlah = (p.purchaseQty || 1)
                let priceInputIdr = p.purchasePrice || 0
                const currency = p.purchaseCurrency || 'IDR'
                if (currency === 'CNY' && kursYuan) priceInputIdr *= kursYuan
                else if (currency === 'USD' && kursUsd) priceInputIdr *= kursUsd

                const totalHarga = priceInputIdr * paket * (1 + (additionalFee || 0) / 100)
                const perPcs = totalHarga / ((paket * jumlah) || 1)
                const hargaJual = p.price || 0
                const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                const labaPerPcs = hargaJual - perPcs - shopeeFee
                const margin = hargaJual > 0 ? (labaPerPcs / hargaJual) * 100 : 0

                totalMargin += margin
                totalLabaPcs += labaPerPcs
            })
            stats.avgLaba = totalLabaPcs / analyzedProducts.length
            stats.avgMargin = totalMargin / analyzedProducts.length
        }

        return { ...stats, ...simulationStats }
    }, [localProducts, kursYuan, kursUsd, additionalFee, isAnalisaHarga, simulationData, simulationPriceData, shopeeAdminFee, shopeeServiceFee, tokpedAdminFee, tokpedServiceFee, hideSimulasiColumn, useProductPriceOnly])

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

            // Missing from WooCommerce Filter
            if (filters.missing === 'with' && !p.isMissingFromWoo) return false
            if (filters.missing === 'without' && p.isMissingFromWoo) return false

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
                    const getPriceValue = (p: any) => {
                        if (!p.purchasePrice || p.purchasePrice <= 0) return -Infinity
                        let price = p.purchasePrice || 0
                        if (p.purchaseCurrency === 'CNY' && kursYuan) price *= kursYuan
                        else if (p.purchaseCurrency === 'USD' && kursUsd) price *= kursUsd

                        const paket = p.purchasePackage || 1
                        const total = (price * paket) * (1 + (additionalFee || 0) / 100)
                        const jumlah = p.purchaseQty || 1
                        return total / ((paket * jumlah) || 1)
                    }
                    aValue = getPriceValue(a)
                    bValue = getPriceValue(b)
                } else if (sortConfig.key === 'labaPerPcs') {
                    const getLaba = (p: any) => {
                        if (!p.purchasePrice || p.purchasePrice <= 0) return -Infinity
                        let priceInputIdr = p.purchasePrice || 0
                        const currency = p.purchaseCurrency || 'IDR'
                        if (currency === 'CNY' && kursYuan) priceInputIdr *= kursYuan
                        else if (currency === 'USD' && kursUsd) priceInputIdr *= kursUsd

                        const paket = p.purchasePackage || 1
                        const jumlah = p.purchaseQty || 0
                        const totalHarga = priceInputIdr * paket * (1 + (additionalFee || 0) / 100)
                        const perPcs = totalHarga / ((paket * jumlah) || 1)
                        const hargaJual = p.price || 0
                        const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                        return hargaJual - perPcs - shopeeFee
                    }
                    aValue = getLaba(a)
                    bValue = getLaba(b)
                } else if (sortConfig.key === 'totalSimLaba') {
                    const getSimLabaValue = (p: any) => {
                        const simQty = simulationData[p.wcId] || 0
                        if (simQty === 0 || !p.purchasePrice || p.purchasePrice <= 0) return -Infinity

                        let price = p.purchasePrice || 0
                        const currency = p.purchaseCurrency || 'IDR'
                        if (currency === 'CNY' && kursYuan) price *= kursYuan
                        else if (currency === 'USD' && kursUsd) price *= kursUsd

                        const paket = p.purchasePackage || 1
                        const total = (price * paket) * (1 + (additionalFee || 0) / 100)
                        const perPcs = total / ((paket * (p.purchaseQty || 1)) || 1)
                        const hargaJual = p.price || 0
                        const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                        const labaPerPcs = hargaJual - perPcs - shopeeFee
                        return labaPerPcs * simQty
                    }
                    aValue = getSimLabaValue(a)
                    bValue = getSimLabaValue(b)
                } else if (sortConfig.key === 'simQty') {
                    aValue = simulationData[a.wcId] || 0
                    bValue = simulationData[b.wcId] || 0
                } else if (sortConfig.key === 'simPrice') {
                    const getSimPrice = (p: any) => {
                        const simPriceInput = simulationPriceData[p.wcId]
                        return (simPriceInput !== undefined && simPriceInput !== 0) ? simPriceInput : (p.price || 0)
                    }
                    aValue = getSimPrice(a)
                    bValue = getSimPrice(b)
                }

                // Push empty values to the bottom
                if (sortConfig.key === 'storeName') {
                    const aEmpty = !aValue || String(aValue).trim() === ''
                    const bEmpty = !bValue || String(bValue).trim() === ''
                    if (aEmpty && !bEmpty) return 1  // a down
                    if (!aEmpty && bEmpty) return -1 // b down
                    if (aEmpty && bEmpty) return 0
                }

                // Push empty values (-Infinity) to the absolute bottom in both directions
                if (aValue === -Infinity && bValue !== -Infinity) return 1  // a down
                if (aValue !== -Infinity && bValue === -Infinity) return -1 // b down
                if (aValue === -Infinity && bValue === -Infinity) return 0

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
                        const getPriceValue = (p: any) => {
                            if (!p.purchasePrice || p.purchasePrice <= 0) return -Infinity
                            let price = p.purchasePrice || 0
                            if (p.purchaseCurrency === 'CNY' && kursYuan) price *= kursYuan
                            else if (p.purchaseCurrency === 'USD' && kursUsd) price *= kursUsd

                            const paket = p.purchasePackage || 1
                            const qty = p.purchaseQty || 1
                            const total = (price * paket) * (1 + (additionalFee || 0) / 100)
                            return total / ((paket * qty) || 1) // Sort by per Pcs
                        }
                        aValue = getPriceValue(a)
                        bValue = getPriceValue(b)
                    } else if (sortConfig.key === 'labaPerPcs') {
                        const getLaba = (p: any) => {
                            if (!p.purchasePrice || p.purchasePrice <= 0) return -Infinity
                            let priceInputIdr = p.purchasePrice || 0
                            const currency = p.purchaseCurrency || 'IDR'
                            if (currency === 'CNY' && kursYuan) priceInputIdr *= kursYuan
                            else if (currency === 'USD' && kursUsd) priceInputIdr *= kursUsd

                            const paket = p.purchasePackage || 1
                            const jumlah = p.purchaseQty || 0
                            const totalHarga = priceInputIdr * paket * (1 + (additionalFee || 0) / 100)
                            const perPcs = totalHarga / ((paket * jumlah) || 1)
                            const hargaJual = p.price || 0
                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                            return hargaJual - perPcs - shopeeFee
                        }
                        aValue = getLaba(a)
                        bValue = getLaba(b)
                    } else if (sortConfig.key === 'totalSimLaba') {
                        const getSimLabaValue = (p: any) => {
                            const simQty = simulationData[p.wcId] || 0
                            if (simQty === 0 || !p.purchasePrice || p.purchasePrice <= 0) return -Infinity

                            let price = p.purchasePrice || 0
                            const currency = p.purchaseCurrency || 'IDR'
                            if (currency === 'CNY' && kursYuan) price *= kursYuan
                            else if (currency === 'USD' && kursUsd) price *= kursUsd

                            const paket = p.purchasePackage || 1
                            const total = (price * paket) * (1 + (additionalFee || 0) / 100)
                            const perPcs = total / ((paket * (p.purchaseQty || 1)) || 1)
                            const hargaJual = p.price || 0
                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                            const labaPerPcs = hargaJual - perPcs - shopeeFee
                            return labaPerPcs * simQty
                        }
                        aValue = getSimLabaValue(a)
                        bValue = getSimLabaValue(b)
                    } else if (sortConfig.key === 'simQty') {
                        aValue = simulationData[a.wcId] || 0
                        bValue = simulationData[b.wcId] || 0
                    } else if (sortConfig.key === 'simPrice') {
                        const getSimPrice = (p: any) => {
                            const simPriceInput = simulationPriceData[p.wcId]
                            return (simPriceInput !== undefined && simPriceInput !== 0) ? simPriceInput : (p.price || 0)
                        }
                        aValue = getSimPrice(a)
                        bValue = getSimPrice(b)
                    }

                    // Push empty values to the bottom
                    if (sortConfig.key === 'storeName') {
                        const aEmpty = !aValue || String(aValue).trim() === ''
                        const bEmpty = !bValue || String(bValue).trim() === ''
                        if (aEmpty && !bEmpty) return 1  // a down
                        if (!aEmpty && bEmpty) return -1 // b down
                        if (aEmpty && bEmpty) return 0
                    }

                    // Push empty values (-Infinity) to the absolute bottom in both directions
                    if (aValue === -Infinity && bValue !== -Infinity) return 1  // a down
                    if (aValue !== -Infinity && bValue === -Infinity) return -1 // b down
                    if (aValue === -Infinity && bValue === -Infinity) return 0

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
    }, [localProducts, searchTerm, expandedRows, filters, sortConfig, simulationData, kursYuan, kursUsd, additionalFee])

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
                    description={<>Manajemen analisa harga produk dari WooCommerce.{additionalFee > 0 && showPurchaseColumns && <span className="text-[10px] text-orange-600/80 font-medium bg-orange-50 px-1.5 py-0.5 rounded ml-2">Harga beli sudah termasuk +Fee {additionalFee}%</span>}</>}
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
                                {isAnalisaHarga && !hideResetButton && (
                                    <button
                                        onClick={handleClearSimulation}
                                        className="flex items-center justify-center gap-2 px-4 h-9 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold transition-all hover:bg-red-100 shadow-sm whitespace-nowrap"
                                    >
                                        <X className="w-4 h-4" />
                                        Reset Simulasi
                                    </button>
                                )}
                                {showExportButton && (
                                    <button
                                        onClick={handleExportExcel}
                                        className="flex items-center justify-center gap-2 px-4 h-9 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold transition-all hover:bg-slate-200 shadow-sm whitespace-nowrap"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export
                                    </button>
                                )}
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
                                {showAddButton && (
                                    <button
                                        onClick={() => setIsAddingProduct(true)}
                                        className="flex items-center justify-center gap-2 px-4 h-9 bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all hover:bg-emerald-700 shadow-sm whitespace-nowrap"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Tambah
                                    </button>
                                )}
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
                                        missing: 'all',
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

                            {/* Missing Filter */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                    <RefreshCw className="w-3 h-3" /> Status Produk
                                </label>
                                <select
                                    value={filters.missing}
                                    onChange={(e) => setFilters(prev => ({ ...prev, missing: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-all shadow-sm"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="with">Tdk ada di Woo</option>
                                    <option value="without">Normal (Ada di Woo)</option>
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
                <TableResponsive
                    data={paginatedProducts}
                    renderMobileCard={(product) => (
                        <TableMobileCard key={product.isVariation ? `var-${product.wcId}` : `parent-${product.wcId}`}>
                            <TableMobileCardHeader>
                                <div className="flex gap-3">
                                    <div className={cn(
                                        "rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border flex-shrink-0 transition-transform active:scale-95",
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
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {product.isVariation && <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 rounded uppercase leading-none py-0.5">Varian</span>}
                                            <span className={cn(
                                                "font-bold text-foreground text-sm line-clamp-2 leading-tight",
                                                product.isVariation && "text-muted-foreground font-medium"
                                            )}>
                                                {product.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">
                                                ID: {product.wcId}
                                            </span>
                                            {!hideSkuColumn && product.sku && (
                                                <span className="text-[10px] text-primary font-bold font-mono">
                                                    {product.sku}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleTogglePriority(product.wcId, product.priority)}
                                        className={cn(
                                            "transition-colors p-1 rounded-full hover:bg-muted",
                                            product.priority ? "text-amber-500" : "text-muted-foreground/30"
                                        )}
                                    >
                                        <Star className={cn("w-6 h-6", product.priority && "fill-amber-500")} />
                                    </button>
                                    {showPurchasedColumn && (
                                        <button
                                            onClick={() => handleTogglePurchased(product.wcId, product.purchased)}
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
                                    )}
                                </div>
                            </TableMobileCardHeader>

                            <TableMobileCardContent>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Harga {!hideStokColumn && '& Stok'}</p>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-foreground">{formatCurrency(product.price || 0)}</span>
                                        {!hideStokColumn && (
                                            <span className={cn(
                                                "text-xs font-bold",
                                                (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-emerald-600"
                                            )}>
                                                {formatNumber(product.stockQuantity || 0)} tersedia
                                            </span>
                                        )}
                                    </div>
                                </div>


                                {showSupplierColumn && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Supplier</p>
                                        <div className="scale-90 origin-top-left -ml-1">
                                            <SupplierPicker
                                                key={`mobile-sup-${product.wcId}`}
                                                wcId={product.wcId}
                                                initialValue={product.storeName || ''}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!showPurchaseColumns && (
                                    <div className="col-span-2 space-y-1 bg-muted/30 p-2 rounded-lg border border-border/50 mt-1">
                                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider flex items-center gap-1">
                                            <Info className="w-3 h-3" /> Keterangan
                                        </p>
                                        <div className="scale-95 origin-top-left max-w-[280px]">
                                            <KeteranganEdit
                                                key={`mobile-ket-${product.wcId}`}
                                                wcId={product.wcId}
                                                initialValue={product.keterangan}
                                                productName={product.name}
                                                compact
                                            />
                                        </div>
                                    </div>
                                )}

                                {showPurchaseColumns && (
                                    <>
                                        {showQuantityColumn && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Pembelian</p>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-foreground">{formatNumber((product.purchasePackage || 1) * (product.purchaseQty || 0))} pcs</span>
                                                    <span className="text-[10px] text-muted font-medium">Qty: {product.purchaseQty}</span>
                                                </div>
                                            </div>
                                        )}
                                        {!hideLabaColumn && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Laba Est.</p>
                                                <div className="flex flex-col gap-1">
                                                    {isAnalisaHarga ? (() => {
                                                        const hargaJual = product.price || 0
                                                        const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                                                        const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                                                        const labaShp = (product.labaPerPcs || 0) - shopeeFee
                                                        const labaTkp = (product.labaPerPcs || 0) - tokpedFee

                                                        return (
                                                            <div className="space-y-1 bg-muted/30 p-1.5 rounded-md border border-border/40">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <img src="/icons8-shopee.svg" alt="Shopee" className="w-3.5 h-3.5" />
                                                                        <span className="text-[8px] font-black text-[#EE4D2D] uppercase leading-none opacity-60">SHP</span>
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-xs font-black",
                                                                        labaShp >= 0 ? "text-emerald-600" : "text-destructive"
                                                                    )}>
                                                                        {formatCurrency(Math.round(labaShp))}
                                                                    </span>
                                                                </div>
                                                                <div className="h-px bg-border/40 w-full" />
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <img src="/icons8-tiktok.svg" alt="TikTok" className="w-3.5 h-3.5" />
                                                                        <span className="text-[8px] font-black text-[#00AA5B] uppercase leading-none opacity-60">TKP</span>
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-xs font-black",
                                                                        labaTkp >= 0 ? "text-emerald-600" : "text-destructive"
                                                                    )}>
                                                                        {formatCurrency(Math.round(labaTkp))}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )
                                                    })() : (
                                                        <>
                                                            <span className={cn(
                                                                "text-xs font-black",
                                                                (product.labaPerPcs || 0) >= 0 ? "text-emerald-600" : "text-destructive"
                                                            )}>
                                                                {formatCurrency(Math.round(product.labaPerPcs || 0))}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground">/ item</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}


                                {product.isVariation && product.attributes && Array.isArray(product.attributes) && (
                                    <div className="col-span-2 flex flex-wrap gap-1.5 mt-1">
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
                                        onClick={() => handleSingleSync(product)}
                                        disabled={syncingItems.has(product.wcId)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-border/50 active:scale-95",
                                            syncingItems.has(product.wcId) ? "bg-primary text-white" : "bg-muted text-foreground hover:bg-muted/80"
                                        )}
                                    >
                                        <RefreshCw className={cn("w-3 h-3", syncingItems.has(product.wcId) && "animate-spin")} />
                                        {syncingItems.has(product.wcId) ? "Sync..." : "Sync"}
                                    </button>
                                    {showPurchaseColumns && (
                                        <button
                                            onClick={() => setEditPurchaseProduct(product)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase transition-all shadow-sm shadow-amber-500/20 active:scale-95"
                                        >
                                            <ShoppingCart className="w-3 h-3" /> Beli
                                        </button>
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
                            <TableRow>
                                {showPurchasedColumn && <TableHead align="center" className="w-10">Beli</TableHead>}
                                <TableHead
                                    align="center"
                                    className="w-10 cursor-pointer hover:bg-muted/80 transition-colors"
                                    onClick={() => handleSort('priority')}
                                >
                                    <div className="flex flex-col items-center justify-center gap-0.5">
                                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                        <SortIcon columnKey="priority" sortConfig={sortConfig} />
                                    </div>
                                </TableHead>
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
                                {!hideSkuColumn && (
                                    <TableHead
                                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                                        onClick={() => handleSort('sku')}
                                    >
                                        SKU
                                        <SortIcon columnKey="sku" sortConfig={sortConfig} />
                                    </TableHead>
                                )}
                                {!showPurchaseColumns && <TableHead>Keterangan</TableHead>}
                                {!isAnalisaHarga && (
                                    <TableHead
                                        align="right"
                                        className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                        onClick={() => handleSort('price')}
                                    >
                                        Harga Jual
                                        <SortIcon columnKey="price" sortConfig={sortConfig} />
                                    </TableHead>
                                )}
                                {!isAnalisaHarga && !hideStokColumn && (
                                    <TableHead
                                        align="right"
                                        className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                        onClick={() => handleSort('stok')}
                                    >
                                        Stok
                                        <SortIcon columnKey="stok" sortConfig={sortConfig} />
                                    </TableHead>
                                )}

                                {showPurchaseColumns && (
                                    <>
                                        {showQuantityColumn && (
                                            <TableHead
                                                align="center"
                                                className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                                onClick={() => handleSort('jumlahBeli')}
                                            >
                                                Jumlah Beli
                                                <SortIcon columnKey="jumlahBeli" sortConfig={sortConfig} />
                                            </TableHead>
                                        )}
                                        {isAnalisaHarga && (
                                            <TableHead
                                                align="right"
                                                className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                            >
                                                HARGA BELI
                                            </TableHead>
                                        )}
                                        {!hideLabaColumn && (
                                            <TableHead
                                                align="right"
                                                className="cursor-pointer hover:bg-muted/80 transition-colors whitespace-nowrap"
                                                onClick={() => handleSort('labaPerPcs')}
                                            >
                                                {isAnalisaHarga ? 'Laba/pcs' : 'Laba'}
                                                <SortIcon columnKey="labaPerPcs" sortConfig={sortConfig} />
                                            </TableHead>
                                        )}
                                        {isAnalisaHarga && (
                                            <>
                                                {!hideSimulasiColumn && (
                                                    <TableHead align="center" className="w-36 px-2 bg-blue-600 text-white border-x border-blue-700/50">
                                                        <div className="flex flex-col items-center w-full">
                                                            <div className="text-[10px] font-bold text-white uppercase tracking-widest border-b border-white/20 pb-[3px] w-full text-center mb-1">SIMULASI</div>
                                                            <div className="flex w-full text-[9px] font-semibold text-white/90 uppercase gap-2">
                                                                <button
                                                                    onClick={() => handleSort('simQty')}
                                                                    className="flex-1 flex items-center justify-end gap-1 hover:text-white transition-colors group/sort"
                                                                >
                                                                    QTY
                                                                    <SortIcon
                                                                        columnKey="simQty"
                                                                        sortConfig={sortConfig}
                                                                        className={cn(
                                                                            sortConfig.key === 'simQty' && sortConfig.direction ? "text-white" : "text-white/30 group-hover/sort:text-white/60"
                                                                        )}
                                                                    />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSort('simPrice')}
                                                                    className="flex-1 flex items-center justify-start gap-1 hover:text-white transition-colors group/sort"
                                                                >
                                                                    HARGA
                                                                    <SortIcon
                                                                        columnKey="simPrice"
                                                                        sortConfig={sortConfig}
                                                                        className={cn(
                                                                            sortConfig.key === 'simPrice' && sortConfig.direction ? "text-white" : "text-white/30 group-hover/sort:text-white/60"
                                                                        )}
                                                                    />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </TableHead>
                                                )}
                                                <TableHead align="right" className="w-32 px-2 whitespace-nowrap bg-orange-50/30">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[9px] font-bold text-orange-600/70 uppercase leading-none">TOTAL MODAL</span>
                                                    </div>
                                                </TableHead>
                                                <TableHead align="right" className="w-24 px-2 whitespace-nowrap bg-emerald-50/30">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[9px] font-bold text-emerald-600/70 uppercase leading-none">TOTAL OMSET</span>
                                                    </div>
                                                </TableHead>
                                                <TableHead
                                                    align="right"
                                                    className="w-36 px-2 font-black whitespace-nowrap cursor-pointer hover:bg-muted/80 transition-colors bg-emerald-50/50"
                                                    onClick={() => handleSort('totalSimLaba')}
                                                >
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="text-[9px] font-bold text-emerald-800 uppercase leading-none">LABA TOTAL</span>

                                                    </div>
                                                </TableHead>
                                            </>
                                        )}



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
                                        <TableCell align="center">
                                            <button
                                                onClick={() => handleTogglePriority(product.wcId, product.priority)}
                                                className={cn(
                                                    "transition-colors",
                                                    product.priority ? "text-amber-500" : "text-muted-foreground/30 hover:text-amber-400"
                                                )}
                                                title={product.priority ? 'Hapus prioritas' : 'Tandai prioritas'}
                                            >
                                                <Star className={cn("w-5 h-5", product.priority && "fill-amber-500")} />
                                            </button>
                                        </TableCell>
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
                                                    {product.categories && product.categories.length > 0 && !hideCategory && !isAnalisaHarga && (
                                                        <span className="text-[10px] text-primary/70 font-medium">
                                                            • {product.categories.map((c: any) => c.name).join(', ')}
                                                        </span>
                                                    )}


                                                    {showSyncButton !== false && (
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
                                                    )}
                                                    {showPurchaseColumns && (
                                                        <>
                                                            {!hideProductEdit && (
                                                                <button
                                                                    onClick={() => setEditingProduct(product)}
                                                                    className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 text-[10px] font-bold uppercase"
                                                                    title="Edit Produk"
                                                                >
                                                                    <Edit2 className="w-2.5 h-2.5" />
                                                                    Edit
                                                                </button>
                                                            )}

                                                            <span className={cn(
                                                                "px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase",
                                                                product.status === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                            )}>
                                                                {product.status}
                                                            </span>
                                                            {hideSkuColumn && product.sku && (
                                                                <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-muted text-muted-foreground uppercase">
                                                                    {product.sku}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                    {!showPurchaseColumns && (
                                                        !hideProductEdit && (
                                                            <button
                                                                onClick={() => setEditingProduct(product)}
                                                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase bg-muted/50 px-1.5"
                                                                title="Edit Produk"
                                                            >
                                                                <Edit2 className="w-2.5 h-2.5" />
                                                                Edit
                                                            </button>
                                                        )
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
                                                    <div className="flex items-center gap-2 mt-1.5 w-full">
                                                        {isAnalisaHarga && (
                                                            <div className="flex items-center flex-shrink-0 gap-1.5 h-fit">
                                                                <Tag className="w-3 h-3 text-emerald-600/80" />
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-bold text-emerald-700">
                                                                        {formatCurrency(product.price || 0)}
                                                                    </span>
                                                                    {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                                        <span className="text-[10px] text-emerald-600/60 line-through">
                                                                            {formatCurrency(product.regularPrice)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0 max-w-[150px] xl:max-w-[250px]">
                                                            <KeteranganEdit
                                                                key={`inline-${product.wcId}`}
                                                                wcId={product.wcId}
                                                                initialValue={product.keterangan}
                                                                productName={product.name}
                                                                compact
                                                            />
                                                        </div>
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
                                        {!hideSkuColumn && (
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
                                        )}
                                        {!showPurchaseColumns && (
                                            <TableCell className="min-w-[200px] max-w-[300px]">
                                                <div className="truncate">
                                                    <KeteranganEdit
                                                        key={product.wcId}
                                                        wcId={product.wcId}
                                                        initialValue={product.keterangan}
                                                        productName={product.name}
                                                    />
                                                </div>
                                            </TableCell>
                                        )}
                                        {!isAnalisaHarga && (
                                            <TableCell align="right" className="whitespace-nowrap">
                                                <div className="flex flex-col items-end">
                                                    <div className="text-sm font-medium text-foreground">{formatCurrency(product.price || 0)}</div>
                                                    {product.salePrice > 0 && product.salePrice < product.regularPrice && (
                                                        <div className="text-[10px] text-muted-foreground line-through">
                                                            {formatCurrency(product.regularPrice)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                        {!isAnalisaHarga && !hideStokColumn && (
                                            <TableCell align="right" className="whitespace-nowrap">
                                                <span className={cn(
                                                    "text-sm font-semibold",
                                                    (product.stockQuantity || 0) <= 0 ? "text-destructive" : "text-green-600"
                                                )}>
                                                    {formatNumber(product.stockQuantity || 0)} unit
                                                </span>
                                            </TableCell>
                                        )}

                                        {showPurchaseColumns && (
                                            <>
                                                {showQuantityColumn && (
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
                                                                            {paket} qty × {jumlah}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })() : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {isAnalisaHarga && (
                                                    <TableCell align="right" className="whitespace-nowrap align-top">
                                                        {product.purchasePrice && product.price ? (() => {
                                                            const paket = product.purchasePackage || 1
                                                            const jumlah = product.purchaseQty || 0
                                                            let priceInputIdr = product.purchasePrice
                                                            const currency = product.purchaseCurrency || 'IDR'
                                                            if (currency === 'CNY' && kursYuan) {
                                                                priceInputIdr = product.purchasePrice * kursYuan
                                                            } else if (currency === 'USD' && kursUsd) {
                                                                priceInputIdr = product.purchasePrice * kursUsd
                                                            }
                                                            const totalHarga = priceInputIdr * paket * (1 + (additionalFee || 0) / 100)
                                                            const perPcs = totalHarga / ((paket * jumlah) || 1)
                                                            const simPriceInput = simulationPriceData[product.wcId]
                                                            const hargaJual = (simPriceInput !== undefined && simPriceInput !== 0) ? simPriceInput : (product.price || 0)

                                                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                                                            const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                                                            const hppShopee = perPcs + shopeeFee
                                                            const hppTokped = perPcs + tokpedFee

                                                            const perPcsIDR_noFee = (priceInputIdr * paket) / ((paket * jumlah) || 1)
                                                            const additionalFeePcs = perPcsIDR_noFee * (additionalFee || 0) / 100

                                                            const cnModalTooltip = (
                                                                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 min-w-[240px]">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                                                        <span className="text-sm">🇨🇳</span>
                                                                        <span className="font-black text-slate-700 tracking-tight text-[11px] uppercase">Rincian Modal Satuan Cina</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <TooltipRow label="Harga Beli (Satuan)" value={formatCurrency(Math.round(perPcsIDR_noFee))} />
                                                                        <TooltipRow label={`Additional Fee (${additionalFee}%)`} value={formatCurrency(Math.round(additionalFeePcs))} isNegative />
                                                                        <div className="pt-2 mt-2 border-t border-slate-100 italic opacity-70">
                                                                            <TooltipRow label="Modal / pcs" value={formatCurrency(Math.round(perPcs))} isBold isTotal />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )

                                                            const shopeeTooltip = (
                                                                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-[#EE4D2D]/10 pb-2">
                                                                        <img src="/icons8-shopee.svg" alt="SHP" className="w-3.5 h-3.5" />
                                                                        <span className="font-black text-orange-700 tracking-tight text-[11px] uppercase">Rincian Modal Satuan Shopee</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <TooltipRow label="Modal Satuan Cina" value={formatCurrency(Math.round(perPcs))} />
                                                                        <TooltipRow label={`Shopee Fee (${(shopeeAdminFee || 0) + (shopeeServiceFee || 0)}%)`} value={formatCurrency(shopeeFee)} isNegative />
                                                                        <div className="pt-2 mt-2 border-t border-slate-100 italic opacity-70">
                                                                            <TooltipRow label="Total Modal" value={formatCurrency(Math.round(perPcs + shopeeFee))} isTotal />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )

                                                            const tokpedTooltip = (
                                                                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-[#00AA5B]/10 pb-2">
                                                                        <img src="/icons8-tiktok.svg" alt="TKP" className="w-3.5 h-3.5" />
                                                                        <span className="font-black text-emerald-700 tracking-tight text-[11px] uppercase">Rincian Modal Satuan TikTok</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <TooltipRow label="Modal Satuan Cina" value={formatCurrency(Math.round(perPcs))} />
                                                                        <TooltipRow label={`TikTok Fee (${(tokpedAdminFee || 0) + (tokpedServiceFee || 0)}%)`} value={formatCurrency(tokpedFee)} isNegative />
                                                                        <div className="pt-2 mt-2 border-t border-slate-100 italic opacity-70">
                                                                            <TooltipRow label="Total Modal" value={formatCurrency(Math.round(perPcs + tokpedFee))} isTotal />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )

                                                            return (
                                                                <div className="flex flex-col items-end gap-1.5 w-full">
                                                                    <div
                                                                        onClick={(e) => {
                                                                            if (!hidePurchaseEdit) {
                                                                                e.stopPropagation();
                                                                                setEditPurchaseProduct(product);
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "flex justify-between items-center w-full gap-4 pb-1 border-b border-border/50 transition-colors rounded px-1 min-h-[24px]",
                                                                            !hidePurchaseEdit ? "cursor-pointer hover:bg-slate-200/50 group" : "cursor-default"
                                                                        )}
                                                                    >
                                                                        {product.purchasePrice ? (
                                                                            <>
                                                                                <div className="w-5 flex justify-center">
                                                                                    <HoverLabaTooltip content={cnModalTooltip}>
                                                                                        <span className="text-sm leading-none cursor-help hover:scale-110 transition-transform">🇨🇳</span>
                                                                                    </HoverLabaTooltip>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-xs font-bold text-foreground">
                                                                                        {formatNumber(Math.round(perPcs))}
                                                                                    </span>
                                                                                    <HoverLabaTooltip content={cnModalTooltip}>
                                                                                        <HelpCircle className="w-3 h-3 text-muted-foreground/30 hover:text-foreground transition-colors cursor-help" />
                                                                                    </HoverLabaTooltip>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100 uppercase text-[10px] font-bold transition-all w-full text-center">
                                                                                + Input Harga
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex justify-between items-center w-full gap-4 pb-1 border-b border-border/50 cursor-help hover:bg-orange-50 transition-colors rounded px-1 min-h-[24px]">
                                                                        <div className="w-5 flex justify-center">
                                                                            <HoverLabaTooltip content={shopeeTooltip}>
                                                                                <img src="/icons8-shopee.svg" alt="Shopee" className="w-4 h-4 hover:scale-110 transition-transform" />
                                                                            </HoverLabaTooltip>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs font-bold text-foreground">
                                                                                {formatNumber(Math.round(hppShopee))}
                                                                            </span>
                                                                            <HoverLabaTooltip content={shopeeTooltip}>
                                                                                <HelpCircle className="w-3 h-3 text-orange-300/30 hover:text-orange-500 transition-colors cursor-help" />
                                                                            </HoverLabaTooltip>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex justify-between items-center w-full gap-4 cursor-help hover:bg-emerald-50 transition-colors rounded px-1 min-h-[24px]">
                                                                        <div className="w-5 flex justify-center">
                                                                            <HoverLabaTooltip content={tokpedTooltip}>
                                                                                <img src="/icons8-tiktok.svg" alt="TikTok" className="w-4 h-4 hover:scale-110 transition-transform" />
                                                                            </HoverLabaTooltip>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-bold text-foreground">
                                                                                {formatNumber(Math.round(hppTokped))}
                                                                            </span>
                                                                            <HoverLabaTooltip content={tokpedTooltip}>
                                                                                <HelpCircle className="w-3 h-3 text-emerald-300/30 hover:text-emerald-500 transition-colors cursor-help" />
                                                                            </HoverLabaTooltip>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })() : (
                                                            <div onClick={(e) => { if (!hidePurchaseEdit) { e.stopPropagation(); setEditPurchaseProduct(product); } }} className="flex items-center justify-end w-full gap-2 cursor-pointer group hover:bg-slate-50 p-1 rounded transition-all"><span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-200 uppercase tracking-tight whitespace-nowrap">+ Input Harga</span></div>
                                                        )}
                                                    </TableCell>
                                                )}
                                                {!hideLabaColumn && (
                                                    <TableCell align="right" className="px-2">
                                                        {product.purchasePrice && product.price ? (() => {
                                                            const paket = product.purchasePackage || 1
                                                            const jumlah = product.purchaseQty || 0
                                                            let priceInputIdr = product.purchasePrice
                                                            const currency = product.purchaseCurrency || 'IDR'
                                                            if (currency === 'CNY' && kursYuan) {
                                                                priceInputIdr = product.purchasePrice * kursYuan
                                                            } else if (currency === 'USD' && kursUsd) {
                                                                priceInputIdr = product.purchasePrice * kursUsd
                                                            }
                                                            const totalHarga = priceInputIdr * paket * (1 + (additionalFee || 0) / 100)
                                                            const perPcs = totalHarga / ((paket * jumlah) || 1)
                                                            const totalQty = paket * jumlah
                                                            const simPriceInput = simulationPriceData[product.wcId]
                                                            const hargaJual = (simPriceInput !== undefined && simPriceInput !== 0) ? simPriceInput : (product.price || 0)

                                                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                                                            const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                                                            const labaPerPcs = hargaJual - perPcs
                                                            const labaShopeePerPcs = labaPerPcs - shopeeFee
                                                            const labaTokpedPerPcs = labaPerPcs - tokpedFee

                                                            const isProfitShopee = labaShopeePerPcs >= 0
                                                            const isProfitTokped = labaTokpedPerPcs >= 0
                                                            const totalLabaShopee = labaShopeePerPcs * totalQty


                                                            return (
                                                                <div className="flex flex-col items-end gap-1.5 w-full">
                                                                    {isAnalisaHarga ? (
                                                                        <>
                                                                            <div className="flex justify-between items-center w-full gap-4 pb-1 border-b border-border/50">
                                                                                <div className="w-5 flex justify-center">
                                                                                    <span className="text-sm leading-none">🇨🇳</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {hargaJual > 0 && (
                                                                                        <span className={cn(
                                                                                            "px-1 py-0.5 rounded text-[9px] font-bold shadow-sm",
                                                                                            labaPerPcs >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                                                        )}>
                                                                                            {((labaPerPcs / hargaJual) * 100).toFixed(1)}%
                                                                                        </span>
                                                                                    )}
                                                                                    <span className={`text-xs font-bold ${labaPerPcs >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                        {labaPerPcs >= 0 ? '+' : '-'}{formatNumber(Math.abs(Math.round(labaPerPcs)))}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-between items-center w-full gap-4 pb-1 border-b border-border/50">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <div className="w-5 flex justify-center">
                                                                                        <img src="/icons8-shopee.svg" alt="Shopee" className="w-3.5 h-3.5" />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {hargaJual > 0 && (
                                                                                        <span className={cn(
                                                                                            "px-1 py-0.5 rounded text-[9px] font-bold shadow-sm",
                                                                                            isProfitShopee ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                                                        )}>
                                                                                            {((labaShopeePerPcs / hargaJual) * 100).toFixed(1)}%
                                                                                        </span>
                                                                                    )}
                                                                                    <span className={`text-xs font-bold ${isProfitShopee ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                        {isProfitShopee ? '+' : '-'}{formatNumber(Math.abs(Math.round(labaShopeePerPcs)))}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-between items-center w-full gap-4">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <div className="w-5 flex justify-center">
                                                                                        <img src="/icons8-tiktok.svg" alt="TikTok" className="w-3.5 h-3.5" />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {hargaJual > 0 && (
                                                                                        <span className={cn(
                                                                                            "px-1 py-0.5 rounded text-[9px] font-bold shadow-sm",
                                                                                            isProfitTokped ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                                                        )}>
                                                                                            {((labaTokpedPerPcs / hargaJual) * 100).toFixed(1)}%
                                                                                        </span>
                                                                                    )}
                                                                                    <span className={`text-xs font-bold ${isProfitTokped ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                        {isProfitTokped ? '+' : '-'}{formatNumber(Math.abs(Math.round(labaTokpedPerPcs)))}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end w-full">
                                                                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                                                                <span className="text-[10px] uppercase leading-none">Laba per Pcs</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-end gap-1">
                                                                                <span className={`text-sm font-semibold ${isProfitShopee ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                    {isProfitShopee ? '+' : '-'}Rp {formatNumber(Math.abs(Math.round(labaShopeePerPcs)))}
                                                                                </span>
                                                                                {hargaJual > 0 && (
                                                                                    <span className={cn(
                                                                                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1",
                                                                                        isProfitShopee ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                                                    )}>
                                                                                        {isProfitShopee ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                                                        {isProfitShopee ? '+' : ''}{((labaShopeePerPcs / hargaJual) * 100).toFixed(1)}%
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {totalQty > 0 && !hideTotalsInCells && !isAnalisaHarga && (
                                                                        <div className="flex flex-col items-end border-t border-border pt-1 w-full text-right mt-1">
                                                                            <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">LABA TOTAL</span>
                                                                            <span className={`text-sm font-bold ${isProfitShopee ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                                {isProfitShopee ? '+' : '-'}Rp {formatNumber(Math.abs(Math.round(totalLabaShopee)))}
                                                                            </span>
                                                                        </div>

                                                                    )}
                                                                </div>
                                                            )
                                                        })() : (
                                                            <span className="text-muted-foreground text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                )}

                                                {isAnalisaHarga && (
                                                    <>
                                                        {!hideSimulasiColumn && (
                                                            <TableCell align="center" className="px-2 bg-blue-50/20 dark:bg-blue-900/5">
                                                                <div className="flex items-center gap-1.5 justify-center p-1">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={simulationData[product.wcId] !== undefined && simulationData[product.wcId] !== 0 ? formatNumber(simulationData[product.wcId]) : ''}
                                                                        onChange={(e) => {
                                                                            const rawVal = e.target.value.replace(/\D/g, '')
                                                                            handleSimulationChange(product.wcId, rawVal ? parseInt(rawVal) : 0)
                                                                        }}
                                                                        onFocus={(e) => e.target.select()}
                                                                        placeholder="0"
                                                                        className="w-14 px-1 py-1 bg-white/50 border border-blue-200/50 rounded text-center text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all font-bold text-blue-900 placeholder:text-blue-900/30"
                                                                        title="Simulasi Qty"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={simulationPriceData[product.wcId] !== undefined ? formatNumber(simulationPriceData[product.wcId]) : ''}
                                                                        onChange={(e) => {
                                                                            const rawVal = e.target.value.replace(/\D/g, '')
                                                                            handleSimulationPriceChange(product.wcId, rawVal)
                                                                        }}
                                                                        onFocus={(e) => e.target.select()}
                                                                        placeholder={formatNumber(product.price || 0)}
                                                                        className="w-20 px-1 py-1 bg-emerald-50/50 border border-emerald-200/50 rounded text-center text-sm text-emerald-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-all font-bold placeholder:text-emerald-600/40 placeholder:font-medium"
                                                                        title="Simulasi Harga"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                        {product.purchasePrice && product.price ? (() => {
                                                            const paket = product.purchasePackage || 1
                                                            const jumlah = product.purchaseQty || 0
                                                            const totalPurchasedQty = paket * jumlah
                                                            // If simulation column is hidden, use actual purchased quantity
                                                            const simQty = hideSimulasiColumn
                                                                ? totalPurchasedQty
                                                                : (simulationData[product.wcId] !== undefined ? simulationData[product.wcId] : (isAnalisaHarga ? 0 : (showPurchaseColumns ? totalPurchasedQty : 0)))

                                                            if (simQty === 0) return (
                                                                <>
                                                                    <TableCell align="right" className="px-2 bg-orange-50/10"><span className="text-muted-foreground/30 font-mono text-xs">-</span></TableCell>
                                                                    <TableCell align="right" className="px-2 bg-emerald-50/10"><span className="text-muted-foreground/30 font-mono text-xs">-</span></TableCell>
                                                                    <TableCell align="right" className="px-2 bg-emerald-50/10"><span className="text-muted-foreground/30 font-mono text-xs">-</span></TableCell>
                                                                </>
                                                            )


                                                            let priceInputIdr = product.purchasePrice
                                                            const currency = product.purchaseCurrency || 'IDR'
                                                            if (currency === 'CNY' && kursYuan) priceInputIdr *= kursYuan
                                                            else if (currency === 'USD' && kursUsd) priceInputIdr *= kursUsd

                                                            const totalHarga = priceInputIdr * paket * (1 + (additionalFee || 0) / 100)
                                                            const perPcs = totalHarga / (totalPurchasedQty || 1)
                                                            const totalSimModal = perPcs * simQty


                                                            const simPriceInput = simulationPriceData[product.wcId]
                                                            const hargaJual = (!useProductPriceOnly && simPriceInput !== undefined && simPriceInput !== 0) ? simPriceInput : (product.price || 0)
                                                            const totalSimOmset = hargaJual * simQty
                                                            const shopeeFee = hargaJual * ((shopeeAdminFee || 0) + (shopeeServiceFee || 0)) / 100
                                                            const tokpedFee = hargaJual * ((tokpedAdminFee || 0) + (tokpedServiceFee || 0)) / 100

                                                            const totalSimModalCina = perPcs * simQty
                                                            const totalSimModalShopee = totalSimModalCina + (shopeeFee * simQty)
                                                            const totalSimModalTokped = totalSimModalCina + (tokpedFee * simQty)
                                                            const totalSimLabaCina = (hargaJual - perPcs) * simQty
                                                            const labaShpPerPcs = hargaJual - perPcs - shopeeFee
                                                            const labaTkpPerPcs = hargaJual - perPcs - tokpedFee
                                                            const totalSimLabaShopee = labaShpPerPcs * simQty
                                                            const totalSimLabaTokped = labaTkpPerPcs * simQty

                                                            const cnModalTooltip = (
                                                                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 text-left min-w-[240px]">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                                                        <span className="text-sm">🇨🇳</span>
                                                                        <span className="font-black text-slate-700 tracking-tight text-[11px] uppercase">Rincian Modal Satuan Cina</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <div className="pt-2 mt-2 italic opacity-70">
                                                                            <TooltipRow label="Modal / pcs" value={formatCurrency(Math.round(perPcs))} isTotal />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )

                                                            const shopeeTooltip = (
                                                                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 text-left min-w-[240px]">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-[#EE4D2D]/10 pb-2">
                                                                        <img src="/icons8-shopee.svg" alt="SHP" className="w-3.5 h-3.5" />
                                                                        <span className="font-black text-orange-700 tracking-tight text-[11px] uppercase">Rincian Modal Shopee (Total {simQty} unit)</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <TooltipRow label="Total Modal Cina" value={formatCurrency(Math.round(totalSimModalCina))} />
                                                                        <TooltipRow label={`Shopee Fee Total (${(shopeeAdminFee || 0) + (shopeeServiceFee || 0)}%)`} value={formatCurrency(Math.round(shopeeFee * simQty))} isNegative />
                                                                        <div className="pt-2 mt-2 border-t border-slate-100 italic opacity-70">
                                                                            <TooltipRow label="Grand Total Modal" value={formatCurrency(Math.round(totalSimModalShopee))} isTotal />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )

                                                            const tokpedTooltip = (
                                                                <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 text-left min-w-[240px]">
                                                                    <div className="flex items-center gap-2 mb-3 border-b border-[#00AA5B]/10 pb-2">
                                                                        <img src="/icons8-tiktok.svg" alt="TKP" className="w-3.5 h-3.5" />
                                                                        <span className="font-black text-emerald-700 tracking-tight text-[11px] uppercase">Rincian Modal TikTok (Total {simQty} unit)</span>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <TooltipRow label="Total Modal Cina" value={formatCurrency(Math.round(totalSimModalCina))} />
                                                                        <TooltipRow label={`TikTok Fee Total (${(tokpedAdminFee || 0) + (tokpedServiceFee || 0)}%)`} value={formatCurrency(Math.round(tokpedFee * simQty))} isNegative />
                                                                        <div className="pt-2 mt-2 border-t border-slate-100 italic opacity-70">
                                                                            <TooltipRow label="Grand Total Modal" value={formatCurrency(Math.round(totalSimModalTokped))} isTotal />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )

                                                            return (
                                                                <>
                                                                    <TableCell align="right" className="px-2 align-middle bg-orange-50/30">
                                                                        <div className="flex flex-col items-end w-full gap-1">
                                                                            <div
                                                                                className="flex items-center justify-between gap-1.5 border-b border-orange-200/50 pb-0.5 w-full px-1"
                                                                                title="Total Modal Cina"
                                                                            >
                                                                                <span className="text-xs">🇨🇳</span>
                                                                                <span className={cn(
                                                                                    "text-[10px] font-bold whitespace-nowrap tracking-tight transition-all",
                                                                                    !product.purchasePrice ? "text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-100 uppercase" : "text-slate-700"
                                                                                )}>
                                                                                    {product.purchasePrice ? (
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            {formatNumber(Math.round(totalSimModalCina))}
                                                                                        </div>
                                                                                    ) : '+ Input Harga'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-1.5 border-b border-orange-200/50 pb-0.5 w-full hover:bg-[#EE4D2D]/5 transition-colors rounded-sm px-1" title="Total Modal Shopee">
                                                                                <img src="/icons8-shopee.svg" alt="SHP" className="w-3 h-3" />
                                                                                <span className="text-[10px] font-bold whitespace-nowrap text-orange-950 tracking-tight">
                                                                                    {formatNumber(Math.round(totalSimModalShopee))}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-1.5 w-full hover:bg-[#00AA5B]/5 transition-colors rounded-sm px-1" title="Total Modal Tokopedia">
                                                                                <img src="/icons8-tiktok.svg" alt="TKP" className="w-3 h-3" />
                                                                                <span className="text-[10px] font-bold whitespace-nowrap text-orange-950 tracking-tight">
                                                                                    {formatNumber(Math.round(totalSimModalTokped))}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell align="right" className="px-2 align-middle bg-emerald-50/30">
                                                                        <span className="text-xs font-black whitespace-nowrap text-emerald-700 tracking-tight px-1.5 py-0.5 bg-emerald-100/50 rounded-md" title="Total Omset">
                                                                            {formatNumber(Math.round(totalSimOmset))}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell align="right" className="px-2 align-middle bg-emerald-50/50">
                                                                        <div className="flex flex-col gap-1 items-end w-full min-w-[100px]">
                                                                            <div className="flex items-center justify-between gap-2 w-full border-b border-emerald-200/50 pb-0.5" title="Total Simulasi Cina">
                                                                                <span className="text-xs">🇨🇳</span>
                                                                                <span className={cn(
                                                                                    "text-xs font-black whitespace-nowrap",
                                                                                    totalSimLabaCina >= 0 ? "text-emerald-700" : "text-destructive"
                                                                                )}>
                                                                                    {totalSimLabaCina >= 0 ? '+' : ''}{formatNumber(Math.round(totalSimLabaCina))}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-2 w-full" title="Total Simulasi Shopee">
                                                                                <img src="/icons8-shopee.svg" alt="SHP" className="w-3.5 h-3.5" />
                                                                                <span className={cn(
                                                                                    "text-xs font-black whitespace-nowrap",
                                                                                    totalSimLabaShopee >= 0 ? "text-emerald-700" : "text-destructive"
                                                                                )}>
                                                                                    {totalSimLabaShopee >= 0 ? '+' : ''}{formatNumber(Math.round(totalSimLabaShopee))}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-2 w-full" title="Total Simulasi Tokopedia">
                                                                                <img src="/icons8-tiktok.svg" alt="TKP" className="w-3.5 h-3.5" />
                                                                                <span className={cn(
                                                                                    "text-xs font-black whitespace-nowrap",
                                                                                    totalSimLabaTokped >= 0 ? "text-emerald-700" : "text-destructive"
                                                                                )}>
                                                                                    {totalSimLabaTokped >= 0 ? '+' : ''}{formatNumber(Math.round(totalSimLabaTokped))}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                </>
                                                            )
                                                        })() : (
                                                            <>
                                                                <TableCell align="right" className="px-2 bg-orange-50/10">
                                                                    <div
                                                                        onClick={(e) => {
                                                                            if (!hidePurchaseEdit) {
                                                                                e.stopPropagation();
                                                                                setEditPurchaseProduct(product);
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "flex items-center justify-end w-full gap-1.5 transition-all p-1 rounded hover:bg-white/50",
                                                                            !hidePurchaseEdit ? "cursor-pointer group" : "cursor-default"
                                                                        )}
                                                                        title="Klik untuk input harga beli Cina"
                                                                    >
                                                                        <span className="text-muted-foreground/30 font-mono text-xs">-</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell align="right" className="px-2 bg-emerald-50/10"><span className="text-muted-foreground/30 font-mono text-xs">-</span></TableCell>
                                                                <TableCell align="right" className="px-2 bg-emerald-50/10"><span className="text-muted-foreground/30 font-mono text-xs">-</span></TableCell>
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                            </>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableEmpty
                                    colSpan={(showSupplierColumn ? 1 : 0) + (showPurchasedColumn ? 1 : 0) + (showPurchaseColumns ? (showQuantityColumn ? 2 : 1) : 0) + (hideSkuColumn ? 0 : 1) + (!showPurchaseColumns ? 1 : 0) + (isAnalisaHarga ? 2 : 0) + (isAnalisaHarga ? 3 : 4)}
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
                </TableResponsive>

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

            {/* Simulation Results Highlight - Now Standalone */}
            {/* Simulation Results Highlight - Now Standalone */}
            {isAnalisaHarga && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Shopee Summary Card */}
                    <div className="bg-white border border-[#EE4D2D]/20 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="p-4 border-b border-[#EE4D2D]/10 flex items-center justify-between bg-orange-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl border border-[#EE4D2D]/20 shadow-sm">
                                    <img src="/icons8-shopee.svg" alt="Shopee" className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Ringkasan Shopee</h3>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-orange-50/50 border border-[#EE4D2D]/10 rounded-2xl p-5 transition-all hover:bg-orange-50/80">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#EE4D2D]/70">Laba Total (Shopee)</p>
                                    {analysis.shopee.modal > 0 && (
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-black shadow-sm",
                                            analysis.shopee.laba >= 0 ? "bg-[#EE4D2D] text-white" : "bg-red-500 text-white"
                                        )}>
                                            {analysis.shopee.laba >= 0 ? '+' : ''}{((analysis.shopee.laba / (analysis.shopee.modal || 1)) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <p className={cn(
                                    "text-4xl font-black tracking-tighter",
                                    analysis.shopee.laba >= 0 ? "text-[#EE4D2D]" : "text-red-600"
                                )}>
                                    {formatCurrency(Math.round(analysis.shopee.laba))}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-blue-50/30 border border-blue-100/50 hover:bg-blue-50/60 transition-colors">
                                    <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider mb-1">Total Omset</p>
                                    <p className="text-xl font-bold text-blue-800">{formatCurrency(Math.round(analysis.shopee.omset))}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-orange-50/30 border border-orange-100/50 hover:bg-orange-50/60 transition-colors">
                                    <p className="text-[10px] font-bold text-orange-600/70 uppercase tracking-wider mb-1">Total Modal</p>
                                    <p className="text-xl font-bold text-orange-800">{formatCurrency(Math.round(analysis.shopee.modal))}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tokopedia Summary Card */}
                    <div className="bg-white border border-[#00AA5B]/20 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-350">
                        <div className="p-4 border-b border-[#00AA5B]/10 flex items-center justify-between bg-emerald-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl border border-[#00AA5B]/20 shadow-sm">
                                    <img src="/icons8-tiktok.svg" alt="TikTok" className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-black text-[#00AA5B] uppercase tracking-widest">Ringkasan TikTok</h3>
                            </div>
                            <div className="flex items-center gap-2">
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-emerald-50/50 border border-[#00AA5B]/10 rounded-2xl p-5 transition-all hover:bg-emerald-50/80">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#00AA5B]/70">Laba Total (TikTok)</p>
                                    {analysis.tokped.modal > 0 && (
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-black shadow-sm",
                                            analysis.tokped.laba >= 0 ? "bg-[#00AA5B] text-white" : "bg-red-500 text-white"
                                        )}>
                                            {analysis.tokped.laba >= 0 ? '+' : ''}{((analysis.tokped.laba / (analysis.tokped.modal || 1)) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <p className={cn(
                                    "text-4xl font-black tracking-tighter",
                                    analysis.tokped.laba >= 0 ? "text-[#00AA5B]" : "text-red-600"
                                )}>
                                    {formatCurrency(Math.round(analysis.tokped.laba))}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-blue-50/30 border border-blue-100/50 hover:bg-blue-50/60 transition-colors">
                                    <p className="text-[10px] font-bold text-blue-600/70 uppercase tracking-wider mb-1">Total Omset</p>
                                    <p className="text-xl font-bold text-blue-800">{formatCurrency(Math.round(analysis.tokped.omset))}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-orange-50/30 border border-orange-100/50 hover:bg-orange-50/60 transition-colors">
                                    <p className="text-[10px] font-bold text-orange-600/70 uppercase tracking-wider mb-1">Total Modal</p>
                                    <p className="text-xl font-bold text-orange-800">{formatCurrency(Math.round(analysis.tokped.modal))}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Cina Summary Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                                    <span className="text-xl">🇨🇳</span>
                                </div>
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Ringkasan CINA</h3>
                            </div>
                            <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-slate-500 font-bold border border-slate-200 uppercase tracking-wider">
                                Tanpa Potongan MP
                            </span>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 transition-all hover:bg-slate-100/80">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Laba Total (Cina)</p>
                                    {analysis.cina.modal > 0 && (
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-xs font-black shadow-sm",
                                            analysis.cina.laba >= 0 ? "bg-slate-800 text-white" : "bg-red-500 text-white"
                                        )}>
                                            {analysis.cina.laba >= 0 ? '+' : ''}{((analysis.cina.laba / (analysis.cina.modal || 1)) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <p className={cn(
                                    "text-4xl font-black tracking-tighter",
                                    analysis.cina.laba >= 0 ? "text-slate-800" : "text-red-700"
                                )}>
                                    {formatCurrency(Math.round(analysis.cina.laba))}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Omset</p>
                                    <p className="text-xl font-bold text-slate-700">{formatCurrency(Math.round(analysis.cina.omset))}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Modal</p>
                                    <p className="text-xl font-bold text-slate-700">{formatCurrency(Math.round(analysis.cina.modal))}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}


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
                    {!isAnalisaHarga && (
                        showPurchaseColumns ? (
                            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50 md:col-span-2">
                                <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider mb-1">Total Pembelian (IDR)</p>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(analysis.totalPurchaseValue)}</p>
                                    <p className="text-[10px] text-emerald-600/60 font-medium mt-1 italic">
                                        * Total dari semua produk yang memiliki data pembelian. Belum termasuk additional fee.
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
                        )
                    )}

                    {!isAnalisaHarga && (
                        showPurchaseColumns ? (
                            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100/50 md:col-span-2">
                                <p className="text-xs font-semibold text-orange-600/70 uppercase tracking-wider mb-1">Total Pembelian (IDR) include additional fee</p>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(analysis.totalPurchaseValueInclFee)}</p>
                                    <p className="text-[10px] text-orange-600/60 font-medium mt-1 italic">
                                        * Sudah termasuk tambahan fee sebesar {additionalFee}%
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )
                    )}

                    {showPurchaseColumns && !isAnalisaHarga && (
                        <>
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                <p className="text-xs font-semibold text-blue-600/70 uppercase tracking-wider mb-1">Omset Total (Jual Semua)</p>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(analysis.totalOmset)}</p>
                                    <p className="text-[10px] text-blue-600/60 font-medium mt-1 italic">
                                        * Harga jual × jumlah beli untuk semua produk.
                                    </p>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${analysis.totalLaba >= 0 ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-red-50/50 border-red-100/50'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className={`text-xs font-semibold uppercase tracking-wider ${analysis.totalLaba >= 0 ? 'text-emerald-600/70' : 'text-red-600/70'}`}>Laba Total</p>
                                    {analysis.totalPurchaseValueInclFee > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${analysis.totalLaba >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {analysis.totalLaba >= 0 ? '+' : ''}{((analysis.totalLaba / analysis.totalPurchaseValueInclFee) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <p className={`text-2xl font-bold ${analysis.totalLaba >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {analysis.totalLaba >= 0 ? '+' : '-'}{formatCurrency(Math.abs(analysis.totalLaba))}
                                    </p>
                                    <p className={`text-[10px] font-medium mt-1 italic ${analysis.totalLaba >= 0 ? 'text-emerald-600/60' : 'text-red-600/60'}`}>
                                        * Persentase dihitung dari: (Laba Total / Total Pembelian include fee) × 100%
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {isAnalisaHarga && (
                        <>
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
                                <p className="text-xs font-semibold text-blue-600/70 uppercase tracking-wider mb-1">Produk Teranalisa</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-blue-600">{formatNumber(analysis.withPurchasePrice)}</p>
                                    <span className="text-[10px] font-medium text-blue-600/60 uppercase">Produk</span>
                                </div>
                                <p className="text-[10px] text-blue-600/60 font-medium mt-1 italic leading-tight">
                                    * Memiliki data harga beli.
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100/50">
                                <p className="text-xs font-semibold text-orange-600/70 uppercase tracking-wider mb-1">Belum Input Harga</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-orange-600">{formatNumber(analysis.withoutPurchasePrice)}</p>
                                    <span className="text-[10px] font-medium text-orange-600/60 uppercase">Produk</span>
                                </div>
                                <p className="text-[10px] text-orange-600/60 font-medium mt-1 italic leading-tight">
                                    * Data pembelian kosong.
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                                <p className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider mb-1">Rata-rata Laba per Pcs</p>
                                <p className="text-2xl font-bold text-emerald-600">Rp {formatNumber(Math.round(analysis.avgLaba))}</p>
                                <p className="text-[10px] text-emerald-600/60 font-medium mt-1 italic">
                                    * Rata-rata laba dari produk teranalisa.
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/50">
                                <p className="text-xs font-semibold text-indigo-600/70 uppercase tracking-wider mb-1">Margin Rata-rata</p>
                                <p className="text-2xl font-bold text-indigo-600">{analysis.avgMargin.toFixed(1)}%</p>
                                <p className="text-[10px] text-indigo-600/60 font-medium mt-1 italic">
                                    * (Laba / Harga Jual) × 100%
                                </p>
                            </div>
                        </>
                    )}
                    {!showPurchaseColumns && (
                        <>
                            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Produk Varian
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-foreground">
                                        {formatNumber(analysis.variationProducts)}
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
                        </>
                    )}
                    <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100/50">
                        <p className="text-xs font-semibold text-amber-600/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Produk Prioritas
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-amber-600">{formatNumber(analysis.priorityProducts)}</p>
                            <span className="text-[10px] font-medium text-amber-600/60">Produk</span>
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

            {isAddingProduct && (
                <EditProductModal
                    product={null}
                    onClose={() => setIsAddingProduct(false)}
                    onSuccess={() => {
                        router.refresh()
                    }}
                />
            )}

            {editPurchaseProduct && (
                <PurchaseInputModal
                    isOpen={!!editPurchaseProduct}
                    onClose={() => setEditPurchaseProduct(null)}
                    product={editPurchaseProduct}
                    kursYuan={kursYuan}
                    kursUsd={kursUsd}
                    additionalFee={additionalFee}
                    editMode
                    hideSupplier={hideSupplierInput}
                />
            )}

            <SyncLogModal
                isOpen={showSyncModal}
                onClose={() => setShowSyncModal(false)}
                logs={syncLogs}
                isComplete={isSyncComplete}
                hasError={hasSyncError}
            />
        </div >
    )
}
