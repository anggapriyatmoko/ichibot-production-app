'use client'

import { useState, useEffect } from 'react'
import { getStoreSaleStats } from '@/app/actions/store-sale-log'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { format, subDays } from 'date-fns'

const COLORS = ['#10b981', '#f97316', '#06b6d4', '#6366f1', '#eab308']

export function SalesAnalytics() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

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
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col h-[400px]">
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
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                    <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden h-[400px]">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold text-foreground">Top 10 Barang (Qty)</h3>
                            <p className="text-xs text-muted-foreground font-medium">Paling banyak terjual secara kuantitas</p>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-2">
                            {stats?.topQuantity?.length > 0 ? (
                                <div className="space-y-1">
                                    {stats.topQuantity.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center border border-primary/20">
                                                    {i + 1}
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
                    </div>

                    {/* Top by Nominal */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden h-[400px]">
                        <div className="p-4 border-b border-border bg-muted/30">
                            <h3 className="font-bold text-foreground">Top 10 Barang (Omset)</h3>
                            <p className="text-xs text-muted-foreground font-medium">Penyumbang omset terbesar</p>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-2">
                            {stats?.topNominal?.length > 0 ? (
                                <div className="space-y-1">
                                    {stats.topNominal.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-2 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-6 h-6 shrink-0 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 font-black text-[10px] flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                                                    {i + 1}
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
                    </div>
                </div>
            )}
        </div>
    )
}
