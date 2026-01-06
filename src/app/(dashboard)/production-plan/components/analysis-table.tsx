import { AlertTriangle, CheckCircle, Sparkles, Bot } from 'lucide-react'
import { formatNumber } from '@/utils/format'

interface AnalysisTableProps {
    data: {
        id: string
        name: string
        stock: number
        neededThisMonth: number
        totalNeeded: number
        balance: number
        status: 'SAFE' | 'SHORT'
    }[]
}

export default function AnalysisTable({ data }: AnalysisTableProps) {
    // Sort: Shortage first, then by name
    const sortedData = [...data].sort((a, b) => {
        if (a.status === 'SHORT' && b.status !== 'SHORT') return -1
        if (a.status !== 'SHORT' && b.status === 'SHORT') return 1
        return a.name.localeCompare(b.name)
    })

    return (
        <div className="mt-8">
            <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <Bot className="w-5 h-5 text-primary/80" />
                                AI Sparepart Analysis
                                <Sparkles className="w-4 h-4 text-primary/40" />
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Smart inventory forecasting based on production demand.
                            </p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-xs font-mono text-primary/80">
                            AI MODEL: ACTIVE
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted/30 text-foreground uppercase font-medium text-xs">
                            <tr>
                                <th className="px-6 py-3">Sparepart Name</th>
                                <th className="px-6 py-3 text-center">Current Stock</th>
                                <th className="px-6 py-3 text-center">Needed (This Month)</th>
                                <th className="px-6 py-3 text-center">Total Needed</th>
                                <th className="px-6 py-3 text-center">Balance</th>
                                <th className="px-6 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sortedData.map((item) => (
                                <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-6 py-3 font-medium text-foreground">{item.name}</td>
                                    <td className="px-6 py-3 text-center text-muted-foreground">{formatNumber(item.stock)}</td>
                                    <td className="px-6 py-3 text-center">{formatNumber(item.neededThisMonth)}</td>
                                    <td className="px-6 py-3 text-center font-bold">{formatNumber(item.totalNeeded)}</td>
                                    <td className={`px-6 py-3 text-center font-bold ${item.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {item.balance > 0 ? '+' : ''}{formatNumber(item.balance)}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        {item.status === 'SAFE' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Safe
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                Short
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                                        No spare parts required for the current plans.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border">
                    {sortedData.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-accent/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                                {item.status === 'SAFE' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        Safe
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                        <AlertTriangle className="w-3 h-3" />
                                        Short
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <div className="text-muted-foreground mb-1">Current Stock</div>
                                    <div className="font-medium text-foreground">{formatNumber(item.stock)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground mb-1">Needed</div>
                                    <div className="font-medium text-foreground">{formatNumber(item.neededThisMonth)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground mb-1">Total Needed</div>
                                    <div className="font-bold text-foreground">{formatNumber(item.totalNeeded)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground mb-1">Balance</div>
                                    <div className={`font-bold ${item.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {item.balance > 0 ? '+' : ''}{formatNumber(item.balance)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                            No spare parts required for the current plans.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
