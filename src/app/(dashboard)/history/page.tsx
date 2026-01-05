import prisma from '@/lib/prisma'
import { History, ArrowUpRight, ArrowDownLeft, Plus, Minus, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HistoryPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; startDate?: string; endDate?: string }>
}) {
    const params = await searchParams
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const limit = 50
    const skip = (page - 1) * limit

    // Build date filter
    const dateFilter: any = {}
    if (params.startDate) {
        dateFilter.gte = new Date(params.startDate)
    }
    if (params.endDate) {
        const endDate = new Date(params.endDate)
        endDate.setHours(23, 59, 59, 999) // End of day
        dateFilter.lte = endDate
    }

    const whereClause = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

    const [transactions, totalCount] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            include: {
                product: true,
                recipe: true,
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            skip: skip
        }),
        prisma.transaction.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Transaction History</h1>
                <p className="text-muted-foreground">Log of all inventory movements and BOM changes.</p>
            </div>

            {/* Date Filter */}
            <div className="mb-6 bg-card border border-border rounded-xl p-4 shadow-sm">
                <form className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                        <input
                            type="date"
                            name="startDate"
                            defaultValue={params.startDate || ''}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                        <input
                            type="date"
                            name="endDate"
                            defaultValue={params.endDate || ''}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            Filter
                        </button>
                        <Link
                            href="/history"
                            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            Reset
                        </Link>
                    </div>
                </form>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted text-foreground uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4 text-right">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-accent/50 transition-colors">
                                    <td className="px-6 py-4">
                                        {new Date(tx.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {tx.type === 'IN' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                <ArrowDownLeft className="w-3 h-3" />
                                                Stock In
                                            </span>
                                        ) : tx.type === 'OUT' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                <ArrowUpRight className="w-3 h-3" />
                                                Checkout
                                            </span>
                                        ) : tx.type === 'Checked' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                <Plus className="w-3 h-3" />
                                                Checked
                                            </span>
                                        ) : tx.type === 'Unchecked' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                <Minus className="w-3 h-3" />
                                                Unchecked
                                            </span>
                                        ) : tx.type === 'BOM_ADD' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                <Plus className="w-3 h-3" />
                                                BOM Add
                                            </span>
                                        ) : tx.type === 'Problem' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                <AlertTriangle className="w-3 h-3" />
                                                Problem
                                            </span>
                                        ) : tx.type === 'Solved' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                                <CheckCircle className="w-3 h-3" />
                                                Solved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                <Minus className="w-3 h-3" />
                                                BOM Remove
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-foreground text-sm">
                                        {['Checked', 'Unchecked'].includes(tx.type)
                                            ? (tx.description?.split(' - ').slice(1).join(' - ') || '-')
                                            : ['Problem', 'Solved'].includes(tx.type)
                                                ? (tx.description?.split(' ||| ')[1] || tx.description)
                                                : (tx.description || '-')
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        {tx.product?.name || (['Checked', 'Unchecked'].includes(tx.type)
                                            ? tx.description?.split(' - ')[0]
                                            : ['Problem', 'Solved'].includes(tx.type)
                                                ? tx.description?.split(' ||| ')[0]
                                                : 'Unknown Product')}
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        {tx.user?.name || tx.user?.username || 'System'}
                                    </td>
                                    <td className={cn("px-6 py-4 text-right font-bold text-base",
                                        tx.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' :
                                            tx.type === 'OUT' ? 'text-blue-600 dark:text-blue-400' :
                                                tx.type === 'BOM_ADD' ? 'text-purple-600 dark:text-purple-400' :
                                                    tx.type === 'Solved' ? 'text-green-600 dark:text-green-400' :
                                                        tx.type === 'Problem' ? 'text-red-600 dark:text-red-400' :
                                                            'text-orange-600 dark:text-orange-400')}>
                                        {['Solved', 'Problem', 'Checked', 'Unchecked'].includes(tx.type)
                                            ? '-'
                                            : `${['IN', 'BOM_ADD'].includes(tx.type) ? '+' : '-'}${tx.quantity}`
                                        }
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No transactions found for the selected date range.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
                        <div className="text-sm text-muted-foreground">
                            Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount} transactions
                        </div>
                        <div className="flex items-center gap-2">
                            {page > 1 ? (
                                <Link
                                    href={`/history?page=${page - 1}${params.startDate ? `&startDate=${params.startDate}` : ''}${params.endDate ? `&endDate=${params.endDate}` : ''}`}
                                    className="flex items-center gap-1 px-3 py-2 bg-background hover:bg-accent border border-border rounded-lg text-sm font-medium transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                            )}

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum
                                    if (totalPages <= 5) {
                                        pageNum = i + 1
                                    } else if (page <= 3) {
                                        pageNum = i + 1
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i
                                    } else {
                                        pageNum = page - 2 + i
                                    }

                                    return (
                                        <Link
                                            key={pageNum}
                                            href={`/history?page=${pageNum}${params.startDate ? `&startDate=${params.startDate}` : ''}${params.endDate ? `&endDate=${params.endDate}` : ''}`}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                                page === pageNum
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-background hover:bg-accent border border-border"
                                            )}
                                        >
                                            {pageNum}
                                        </Link>
                                    )
                                })}
                            </div>

                            {page < totalPages ? (
                                <Link
                                    href={`/history?page=${page + 1}${params.startDate ? `&startDate=${params.startDate}` : ''}${params.endDate ? `&endDate=${params.endDate}` : ''}`}
                                    className="flex items-center gap-1 px-3 py-2 bg-background hover:bg-accent border border-border rounded-lg text-sm font-medium transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="flex items-center gap-1 px-3 py-2 bg-background border border-border rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
