'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { getStoreOrderHistory } from '@/app/actions/store-product'
import StoreProductList from '@/components/store/store-product-list'
import { cn } from '@/lib/utils'

interface OrderHistoryViewProps {
    initialBatches: string[]
    initialHistory: any[]
    showSupplierColumn: boolean
    kursYuan?: number
    kursUsd?: number
    additionalFee?: number
    shopeeAdminFee?: number
    shopeeServiceFee?: number
    tokpedAdminFee?: number
    tokpedServiceFee?: number
}

export default function OrderHistoryView({
    initialBatches,
    initialHistory,
    showSupplierColumn,
    kursYuan,
    kursUsd,
    additionalFee,
    shopeeAdminFee,
    shopeeServiceFee,
    tokpedAdminFee,
    tokpedServiceFee
}: OrderHistoryViewProps) {
    const router = useRouter()
    const [selectedBatch, setSelectedBatch] = useState(initialBatches.length > 0 ? initialBatches[0] : '')
    const [history, setHistory] = useState(initialHistory)
    const [isLoading, setIsLoading] = useState(false)

    // Format batch date for display (e.g., "2026-02-27" -> "27 Feb 2026")
    function formatBatchDate(batchId: string) {
        if (!batchId) return ''
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

    async function handleBatchChange(batchId: string) {
        setSelectedBatch(batchId)
        if (!batchId) {
            setHistory([])
            return
        }

        setIsLoading(true)
        try {
            const data = await getStoreOrderHistory(batchId)
            setHistory(data)
        } catch (error) {
            console.error('Error switching batch:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Map history records and parse the images JSON string
    const mappedHistory = history.map(item => {
        let parsedImages = []
        try {
            if (item.images) {
                parsedImages = JSON.parse(item.images)
            }
        } catch (e) {
            console.error('Error parsing images for product:', item.name)
        }
        
        return {
            ...item,
            images: parsedImages
        }
    })


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button 
                        onClick={() => router.push('/store/purchased')}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Ordered
                    </button>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">History Order</h1>
                    <p className="text-muted-foreground mt-1">
                        Daftar barang yang sudah sampai berdasarkan tanggal order.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[200px]">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <select
                            value={selectedBatch}
                            onChange={(e) => handleBatchChange(e.target.value)}
                            disabled={initialBatches.length === 0}
                            className={cn(
                                "w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-sm font-semibold focus:border-primary outline-none transition-all appearance-none cursor-pointer hover:bg-muted/30 shadow-sm",
                                initialBatches.length === 0 && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {initialBatches.length > 0 ? (
                                initialBatches.map(batchId => (
                                    <option key={batchId} value={batchId}>
                                        {formatBatchDate(batchId)}
                                    </option>
                                ))
                            ) : (
                                <option value="">Tidak ada history</option>
                            )}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-current"></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <StoreProductList
                    key={selectedBatch}
                    initialProducts={mappedHistory}
                    showPurchasedStyles={false}
                    showPurchasedAt={false}
                    showSyncButton={false}
                    showSupplierColumn={showSupplierColumn}
                    showPurchaseColumns={true}
                    showAddButton={false}
                    showPurchasedColumn={false} // Hidden as requested
                    kursYuan={kursYuan}
                    kursUsd={kursUsd}
                    additionalFee={additionalFee}
                    shopeeAdminFee={shopeeAdminFee}
                    shopeeServiceFee={shopeeServiceFee}
                    tokpedAdminFee={tokpedAdminFee}
                    tokpedServiceFee={tokpedServiceFee}
                    isAnalisaHarga={true}
                    hideSkuColumn={true}
                    hideLabaColumn={true}
                    hideSimulasiColumn={true}
                    hideStokColumn={true}
                    hideCategory={true}
                    hideProductEdit={true}
                    hidePurchaseEdit={true}
                    showExportButton={true}
                    exportFilenamePrefix="HISTORY"
                />



            </div>
        </div>
    )
}
