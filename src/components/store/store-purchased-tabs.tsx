'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Package, Loader2 } from 'lucide-react'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { moveToOrderBatch } from '@/app/actions/store-product'
import StoreProductList from './store-product-list'
import { cn } from '@/lib/utils'

interface StorePurchasedTabsProps {
    initialProducts: any[]
    showSupplierColumn: boolean
    kursYuan?: number
    kursUsd?: number
    additionalFee?: number
}

export default function StorePurchasedTabs({
    initialProducts,
    showSupplierColumn,
    kursYuan,
    kursUsd,
    additionalFee = 0
}: StorePurchasedTabsProps) {
    const [activeTab, setActiveTab] = useState('cart')
    const [isOrdering, setIsOrdering] = useState(false)
    const { showConfirmation } = useConfirmation()
    const { showAlert, showError } = useAlert()
    const router = useRouter()

    // Group products by orderBatchId
    const { cartProducts, batches } = useMemo(() => {
        const cart: any[] = []
        const batchMap = new Map<string, any[]>()

        for (const product of initialProducts) {
            if (!product.orderBatchId) {
                cart.push(product)
            } else {
                const batch = batchMap.get(product.orderBatchId) || []
                batch.push(product)
                batchMap.set(product.orderBatchId, batch)
            }
        }

        // Sort batches by date descending (newest first)
        const sortedBatches = Array.from(batchMap.entries())
            .sort((a, b) => b[0].localeCompare(a[0]))

        return { cartProducts: cart, batches: sortedBatches }
    }, [initialProducts])

    // Filter out batches with no purchased items
    const activeBatches = batches.filter(([, products]) =>
        products.some(p => p.purchased)
    )

    const handleOrdered = () => {
        if (cartProducts.length === 0) {
            return showError('Tidak ada item di keranjang untuk diorder.')
        }

        showConfirmation({
            title: 'Konfirmasi Order',
            message: 'Apakah yakin barang ini sudah diorder?',
            confirmLabel: 'Ya, Sudah Diorder',
            cancelLabel: 'Batal',
            type: 'confirm',
            action: async () => {
                setIsOrdering(true)
                try {
                    const result = await moveToOrderBatch()
                    if (result.success) {
                        showAlert(`${result.count} item berhasil dipindahkan ke batch order ${formatBatchDate(result.batchId!)}`)
                        router.refresh()
                        // Switch to the new batch tab
                        setActiveTab(result.batchId!)
                    } else {
                        showError(result.error || 'Gagal memproses order')
                    }
                } catch (error) {
                    showError('Terjadi kesalahan sistem')
                } finally {
                    setIsOrdering(false)
                }
            }
        })
    }

    // Format batch date for display (e.g., "2026-02-27" -> "27 Feb 2026")
    function formatBatchDate(batchId: string) {
        try {
            const [year, month, day] = batchId.split('-').map(Number)
            const date = new Date(year, month - 1, day)
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return batchId
        }
    }

    // Get products for the active tab
    const activeProducts = activeTab === 'cart'
        ? cartProducts
        : (batches.find(([id]) => id === activeTab)?.[1] || [])

    // If active tab is a batch that no longer has purchased items, switch to cart
    if (activeTab !== 'cart' && !activeBatches.find(([id]) => id === activeTab)) {
        // Will switch on next render
        if (activeTab !== 'cart') {
            setTimeout(() => setActiveTab('cart'), 0)
        }
    }

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
                {/* Cart Tab */}
                <button
                    onClick={() => setActiveTab('cart')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-[1px]",
                        activeTab === 'cart'
                            ? "text-blue-600 border-blue-600 bg-blue-50/50"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                    )}
                >
                    <ShoppingCart className="w-4 h-4" />
                    Cart
                    {cartProducts.length > 0 && (
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                            activeTab === 'cart'
                                ? "bg-blue-100 text-blue-700"
                                : "bg-muted text-muted-foreground"
                        )}>
                            {cartProducts.length}
                        </span>
                    )}
                </button>

                {/* Batch Tabs */}
                {activeBatches.map(([batchId, products]) => (
                    <button
                        key={batchId}
                        onClick={() => setActiveTab(batchId)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap border-b-2 -mb-[1px]",
                            activeTab === batchId
                                ? "text-emerald-600 border-emerald-600 bg-emerald-50/50"
                                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                        )}
                    >
                        <Package className="w-4 h-4" />
                        {formatBatchDate(batchId)}
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                            activeTab === batchId
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-muted text-muted-foreground"
                        )}>
                            {products.filter(p => p.purchased).length}
                        </span>
                    </button>
                ))}

                {/* Ordered Button - only visible on Cart tab */}
                {activeTab === 'cart' && cartProducts.length > 0 && (
                    <div className="ml-auto flex-shrink-0">
                        <button
                            onClick={handleOrdered}
                            disabled={isOrdering}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isOrdering ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Package className="w-4 h-4" />
                            )}
                            Ordered
                        </button>
                    </div>
                )}
            </div>

            {/* Active Tab Content */}
            <StoreProductList
                key={activeTab}
                initialProducts={activeProducts}
                showPurchasedStyles={false}
                showPurchasedAt={true}
                showSyncButton={false}
                showSupplierColumn={showSupplierColumn}
                showPurchaseColumns={true}
                showAddButton={false}
                kursYuan={kursYuan}
                kursUsd={kursUsd}
                additionalFee={additionalFee}
            />
        </div>
    )
}
