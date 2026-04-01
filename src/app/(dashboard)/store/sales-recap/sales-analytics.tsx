'use client'

import { useState, useEffect } from 'react'
import { getStoreSaleStats } from '@/app/actions/store-sale-log'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, subDays } from 'date-fns'

const MARKETPLACE_COLORS: Record<string, string> = {
    'OFFLINE': '#3b82f6',
    'SHOPEE': '#EE4D2D',
    'TOKOPEDIA': '#00AA5B',
    'TOKPED': '#00AA5B',
}
const DEFAULT_COLOR = '#6366f1'

function getMarketplaceColor(name: string): string {
    return MARKETPLACE_COLORS[name.toUpperCase()] || DEFAULT_COLOR
}

export function SalesAnalytics() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    
    // Pagination state
    const [qtyPage, setQtyPage] = useState(1)
    const [nominalPage, setNominalPage] = useState(1)
    const itemsPerPage = 8 // Reduced from 10 to fit buttons better in 400px height

    useEffect(() => {
        let isMounted = true
        async function fetchStats() {
            setLoading(true)
            try {
                // Ensure end date includes the full day
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                
                const start = new Date(startDate)
                start.setHours(0, 0, 0, 0)

                const res = await getStoreSaleStats(start, end)
                if (isMounted && res.success) {
                    setStats(res)
                }
            } catch (err) {
                console.error(err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        fetchStats()
        // Reset pagination when dates change
        setQtyPage(1)
        setNominalPage(1)
        return () => { isMounted = false }
    }, [startDate, endDate])

    const totalSales = stats?.marketShare?.reduce((acc: number, curr: any) => acc + curr.value, 0) || 0

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in delay-200 fill-mode-both">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-foreground drop-shadow-sm flex items-center gap-2">
                    📊 Analytics Penjualan
                </h2>
                <div className="flex items-center gap-2 bg-card p-1.5 rounded-lg border border-border shadow-sm">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground ml-2" />
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 mr-2"
                    />
                </div>
            </div>

            {loading ? (
                <div className="h-[300px] flex items-center justify-center bg-card rounded-2xl border border-border">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Market Share Pie Chart */}
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col h-[450px]">
                        <h3 className="font-bold text-foreground mb-1">Marketplace Share</h3>
                        <p className="text-xs text-muted-foreground mb-4">Total Omset: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalSales)}</span></p>
                        
                        <div className="flex-1 w-full min-h-0">
                            {stats?.marketShare?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.marketShare}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.marketShare.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={getMarketplaceColor(entry.name)} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip 
                                            formatter={(value: any) => formatCurrency(value)}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
                            )}
                        </div>
                    </div>

                    {/* Top by Quantity */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden h-[450px]">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold text-foreground">Top Barang (Qty)</h3>
                            <p className="text-xs text-muted-foreground font-medium">Paling banyak terjual secara kuantitas</p>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-2">
                            {stats?.topQuantity?.length > 0 ? (
                                <div className="space-y-1">
                                    {stats.topQuantity.slice((qtyPage - 1) * itemsPerPage, qtyPage * itemsPerPage).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center border border-primary/20">
                                                    {(qtyPage - 1) * itemsPerPage + i + 1}
                                                </div>
                                                <div className="truncate text-sm font-semibold">{item.itemName}</div>
                                            </div>
                                            <div className="font-black text-sm shrink-0 ml-4 bg-muted px-2 py-0.5 rounded border border-border group-hover:bg-background">
                                                {formatNumber(item.quantity)} pcs
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
                            )}
                        </div>
                        {stats?.topQuantity?.length > itemsPerPage && (
                            <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Hal {qtyPage} / {Math.ceil(stats.topQuantity.length / itemsPerPage)}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setQtyPage(p => Math.max(1, p - 1))}
                                        disabled={qtyPage === 1}
                                        className="p-1 rounded bg-background border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => setQtyPage(p => Math.min(Math.ceil(stats.topQuantity.length / itemsPerPage), p + 1))}
                                        disabled={qtyPage === Math.ceil(stats.topQuantity.length / itemsPerPage)}
                                        className="p-1 rounded bg-background border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Top by Nominal */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden h-[450px]">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold text-foreground">Top Barang (Omset)</h3>
                            <p className="text-xs text-muted-foreground font-medium">Penyumbang omset terbesar</p>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-2">
                            {stats?.topNominal?.length > 0 ? (
                                <div className="space-y-1">
                                    {stats.topNominal.slice((nominalPage - 1) * itemsPerPage, nominalPage * itemsPerPage).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center border border-primary/20">
                                                    {(nominalPage - 1) * itemsPerPage + i + 1}
                                                </div>
                                                <div className="truncate text-sm font-semibold">{item.itemName}</div>
                                            </div>
                                            <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 shrink-0 ml-4">
                                                {formatCurrency(item.nominal)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
                            )}
                        </div>
                        {stats?.topNominal?.length > itemsPerPage && (
                            <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    Hal {nominalPage} / {Math.ceil(stats.topNominal.length / itemsPerPage)}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setNominalPage(p => Math.max(1, p - 1))}
                                        disabled={nominalPage === 1}
                                        className="p-1 rounded bg-background border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={() => setNominalPage(p => Math.min(Math.ceil(stats.topNominal.length / itemsPerPage), p + 1))}
                                        disabled={nominalPage === Math.ceil(stats.topNominal.length / itemsPerPage)}
                                        className="p-1 rounded bg-background border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
