'use client'

import { useState, useEffect } from 'react'
import { getWooCommerceOrders } from '@/app/actions/store-order'
import { formatCurrency } from '@/utils/format'
import { Loader2, RefreshCw, Calendar, User, Hash, AlertCircle, ChevronLeft, ChevronRight, Printer, Search, X, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

const OrderHistorySkeleton = () => (
    <div className="space-y-3 animate-in fade-in duration-500">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-background border border-border rounded-xl p-3 space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
                <div className="flex justify-between items-start">
                    <div className="h-4 w-16 bg-muted rounded-full" />
                    <div className="h-4 w-20 bg-muted rounded-full" />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-muted rounded-sm" />
                        <div className="h-3 w-32 bg-muted rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-muted rounded-sm" />
                        <div className="h-2.5 w-24 bg-muted rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-muted rounded-sm" />
                        <div className="h-2.5 w-28 bg-muted rounded-full" />
                    </div>
                </div>
                <div className="pt-2 border-t border-border flex justify-between">
                    <div className="h-3 w-12 bg-muted rounded-full" />
                    <div className="h-4 w-20 bg-muted rounded-full" />
                </div>
            </div>
        ))}
    </div>
)

export default function POSOrderHistory({ onPrintOrder }: { onPrintOrder?: (order: any) => void }) {
    // ... existing state ...
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [page, setPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // ... existing fetchOrders and useEffects ...
    const fetchOrders = async (pageNum: number, searchQ = '', isSync = false) => {
        if (isSync) setSyncing(true)
        else setLoading(true)
        setError(null)

        try {
            const result = await getWooCommerceOrders(pageNum, searchQ)
            if (result.success) {
                setOrders(result.orders)
                setTotalItems(result.totalItems || 0)
                setTotalPages(result.totalPages || 0)
                setPage(pageNum)
            } else {
                setError(result.error || 'Gagal mengambil data order')
            }
        } catch (err: any) {
            setError('Terjadi kesalahan saat memproses data')
            console.error(err)
        } finally {
            setLoading(false)
            setSyncing(false)
        }
    }

    // Handle debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        fetchOrders(1, debouncedSearch)
    }, [debouncedSearch])

    const handleSync = () => {
        fetchOrders(1, debouncedSearch, true)
    }

    if (error && orders.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4 border border-destructive/20 rounded-2xl bg-destructive/5">
                <div className="p-3 bg-destructive/10 rounded-full">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-1">
                    <p className="font-bold text-destructive">Error</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                </div>
                <button
                    onClick={() => fetchOrders(1)}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all"
                >
                    <RefreshCw className="w-4 h-4" />
                    Coba Lagi
                </button>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* Header & Search */}
            <div className="space-y-4 shrink-0 px-2">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Pesanan</span>
                        <span className="text-lg font-black text-primary leading-none">{totalItems}</span>
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={cn(
                            "p-2 hover:bg-primary/10 rounded-xl transition-all group",
                            syncing ? "text-primary bg-primary/10" : "text-muted-foreground"
                        )}
                        title="Sinkronisasi Data"
                    >
                        <RefreshCw className={cn("w-5 h-5 group-hover:rotate-180 transition-transform duration-500", syncing && "animate-spin")} />
                    </button>
                </div>

                {/* Search Order */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari No. Nota atau Customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 bg-muted/50 border border-transparent focus:border-primary/30 focus:bg-background rounded-xl text-xs font-medium outline-none transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full transition-colors"
                        >
                            <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 mt-4 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
                {loading && !syncing ? (
                    <OrderHistorySkeleton />
                ) : orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 italic px-8 text-center py-20">
                        <Hash className="w-12 h-12 mb-4" />
                        <p>{searchTerm ? 'Order tidak ditemukan' : 'Belum ada riwayat pesanan'}</p>
                    </div>
                ) : (
                    <div className="space-y-3 animate-in fade-in duration-500">
                        {orders.map((order) => {
                            const cashierMeta = order.meta_data?.find((m: any) => m.key === '_pos_cashier_name');
                            const cashierName = cashierMeta ? cashierMeta.value : null;

                            return (
                                <div key={order.id} className="bg-background border border-border rounded-xl p-3 space-y-2 hover:shadow-md transition-shadow group/order cursor-default relative overflow-hidden">
                                    {/* Decorative line for status */}
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1",
                                        order.status === 'completed' ? "bg-emerald-500" :
                                            order.status === 'processing' ? "bg-blue-500" :
                                                "bg-amber-500"
                                    )} />

                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 pl-1">
                                            <span className="font-black text-sm">#{order.number}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {onPrintOrder && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPrintOrder(order);
                                                    }}
                                                    className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-all"
                                                    title="Cetak Ulang Struk"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            )}
                                            <span className={cn(
                                                "text-[9px] px-2 py-0.5 rounded-full font-medium uppercase tracking-tighter",
                                                order.status === 'completed' ? "bg-emerald-500/10 text-emerald-600" :
                                                    order.status === 'processing' ? "bg-blue-500/10 text-blue-600" :
                                                        "bg-amber-500/10 text-amber-600"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1 pl-1">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <User className="w-3 h-3 text-primary/60" />
                                            <span className="text-xs font-bold text-foreground/80 truncate max-w-[180px]">
                                                {order.billing?.first_name ? `${order.billing.first_name} ${order.billing.last_name}` :
                                                    order.billing?.email ? order.billing.email : 'Unknown Customer'}
                                            </span>
                                        </div>

                                        {/* Cashier Info */}
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Briefcase className="w-3 h-3 text-primary/60" />
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                Kasir: <span className="text-foreground/70 normal-case">{cashierName || 'System'}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Calendar className="w-3 h-3 text-primary/60" />
                                            <span className="text-[10px] font-medium leading-none">
                                                {new Date(order.date_created).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-border flex items-center justify-between pl-1">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{order.line_items.length} Item</span>
                                        <span className="text-sm font-black text-primary">{formatCurrency(parseFloat(order.total))}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-border shrink-0 px-2 mt-4">
                    <button
                        disabled={page === 1 || syncing || loading}
                        onClick={() => fetchOrders(page - 1, debouncedSearch)}
                        className="p-2 hover:bg-muted rounded-xl disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Halaman</span>
                        <span className="text-xs font-black">{page} <span className="text-muted-foreground/50">/</span> {totalPages}</span>
                    </div>
                    <button
                        disabled={page === totalPages || syncing || loading}
                        onClick={() => fetchOrders(page + 1, debouncedSearch)}
                        className="p-2 hover:bg-muted rounded-xl disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
