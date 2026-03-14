'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { getItems, Item } from '@/app/actions/item'

export default function PendingItemsCard() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getItems({ status: 'Belum Diorder', per_page: 50 })
            .then(res => {
                if (res.success && res.data) {
                    setItems(res.data.items)
                }
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    Permintaan Barang
                    {!loading && (
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded">
                            {items.length} Belum Diorder
                        </span>
                    )}
                </h3>
                <Link href="/administrasi/permintaan-barang" className="text-xs text-primary hover:text-blue-500 font-medium">Lihat Semua</Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={`px-5 py-3 flex items-center gap-3 border-b border-border ${i % 2 === 0 ? 'md:border-r' : ''}`}>
                            <div className="w-10 h-7 rounded-md bg-muted animate-pulse shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3.5 bg-muted animate-pulse rounded w-3/4" />
                                <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
                            </div>
                            <div className="h-3 bg-muted animate-pulse rounded w-12 shrink-0 hidden sm:block" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 text-sm">Tidak ada permintaan barang yang menunggu.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {items.map((item: any, idx: number) => (
                        <Link key={item.id} href="/administrasi/permintaan-barang" className={`px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors group border-b border-border ${idx % 2 === 0 ? 'md:border-r' : ''}`}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md shrink-0">{item.quantity}x</span>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.item_name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{item.requester_name} • {item.division}</p>
                                </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">{new Date(item.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
