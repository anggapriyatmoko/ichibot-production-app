'use client'

import { ArrowUpRight, ArrowDownLeft, Plus, Minus, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Edit2, Bot, History, Search } from 'lucide-react'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface TransactionHistoryTableProps {
    transactions: any[]
    totalCount: number
    currentPage: number
    limit: number
    totalPages: number
    search: string
    startDate?: string
    endDate?: string
}

export default function TransactionHistoryTable({
    transactions,
    totalCount,
    currentPage,
    limit,
    totalPages,
    search: initialSearch,
    startDate: initialStartDate,
    endDate: initialEndDate
}: TransactionHistoryTableProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const [searchTerm, setSearchTerm] = useState(initialSearch)
    const [startDate, setStartDate] = useState(initialStartDate || '')
    const [endDate, setEndDate] = useState(initialEndDate || '')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams(searchParams)
        if (searchTerm) params.set('search', searchTerm)
        else params.delete('search')

        if (startDate) params.set('startDate', startDate)
        else params.delete('startDate')

        if (endDate) params.set('endDate', endDate)
        else params.delete('endDate')

        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const resetFilters = () => {
        setSearchTerm('')
        setStartDate('')
        setEndDate('')
        router.push(pathname)
    }

    const skip = (currentPage - 1) * limit

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Transaction History
                </h2>
                <p className="text-sm text-muted-foreground">Log of all inventory movements and BOM changes.</p>
            </div>

            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 lg:items-end">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full flex-1">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search description, product..."
                                    className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-foreground focus:border-primary outline-none text-sm transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none text-sm transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none text-sm transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full lg:w-auto">
                        <button
                            type="submit"
                            className="flex-1 lg:flex-none px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            Filter
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 lg:flex-none px-6 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
                {transactions.map((tx) => (
                    <div key={tx.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
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
                                ) : tx.type === 'Problem' || tx.type === 'Problem Edited' ? (
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                        tx.type === 'Problem Edited'
                                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
                                            : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                    )}>
                                        {tx.type === 'Problem Edited' ? <Edit2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {tx.type === 'Problem Edited' ? 'Problem Edited' : 'Problem'}
                                    </span>
                                ) : tx.type === 'Solved' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                        <CheckCircle className="w-3 h-3" />
                                        Solved
                                    </span>
                                ) : tx.type === 'Service Robot' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                        <Bot className="w-3 h-3" />
                                        Service Robot
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                        <Minus className="w-3 h-3" />
                                        BOM Remove
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                <div>{new Date(tx.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                <div>{new Date(tx.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-foreground">
                                {tx.product ? (
                                    <span>
                                        {tx.product.name}
                                        {tx.product.sku && <span className="text-muted-foreground font-medium ml-1">({tx.product.sku})</span>}
                                    </span>
                                ) : tx.recipe ? (
                                    <span>{tx.recipe.name}</span>
                                ) : (['Checked', 'Unchecked'].includes(tx.type)
                                    ? tx.description?.split(' - ')[0]
                                    : ['Problem', 'Solved', 'Problem Edited'].includes(tx.type)
                                        ? tx.description?.split(' ||| ')[0]
                                        : 'Unknown Product')}
                            </h4>
                            <p className="text-sm text-foreground/80 mt-1 whitespace-pre-line">
                                {['Checked', 'Unchecked'].includes(tx.type)
                                    ? (tx.description?.split(' - ').slice(1).join(' - ') || '-')
                                    : ['Problem', 'Solved', 'Problem Edited'].includes(tx.type)
                                        ? (tx.description?.split(' ||| ')[1] || tx.description)
                                        : (tx.description || '-')
                                }
                            </p>
                        </div>

                        <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                    {(tx.user?.name || tx.user?.username || 'S').charAt(0).toUpperCase()}
                                </div>
                                {tx.user?.name || tx.user?.username || 'System'}
                            </div>

                            {!['Solved', 'Problem', 'Problem Edited', 'Checked', 'Unchecked', 'Service Robot'].includes(tx.type) && (
                                <span className={cn("font-bold text-sm",
                                    tx.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' :
                                        tx.type === 'OUT' ? 'text-blue-600 dark:text-blue-400' :
                                            tx.type === 'BOM_ADD' ? 'text-purple-600 dark:text-purple-400' :
                                                'text-orange-600 dark:text-orange-400')}>
                                    {['IN', 'BOM_ADD'].includes(tx.type) ? '+' : '-'}{formatNumber(tx.quantity)} pcs
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {transactions.length === 0 && (
                    <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground text-sm">
                        No transactions found.
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted/50 text-foreground uppercase font-semibold text-[11px] tracking-wider">
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
                                        <div className="font-medium text-foreground">{new Date(tx.createdAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        <div className="text-[11px] text-muted-foreground">{new Date(tx.createdAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })}</div>
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
                                        ) : tx.type === 'Problem' || tx.type === 'Problem Edited' ? (
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                tx.type === 'Problem Edited'
                                                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
                                                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                            )}>
                                                {tx.type === 'Problem Edited' ? <Edit2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                {tx.type === 'Problem Edited' ? 'Problem Edited' : 'Problem'}
                                            </span>
                                        ) : tx.type === 'Solved' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                                <CheckCircle className="w-3 h-3" />
                                                Solved
                                            </span>
                                        ) : tx.type === 'Service Robot' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                                <Bot className="w-3 h-3" />
                                                Service Robot
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                <Minus className="w-3 h-3" />
                                                BOM Remove
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-foreground text-sm whitespace-pre-line max-w-[250px]">
                                        {['Checked', 'Unchecked'].includes(tx.type)
                                            ? (tx.description?.split(' - ').slice(1).join(' - ') || '-')
                                            : ['Problem', 'Solved', 'Problem Edited'].includes(tx.type)
                                                ? (tx.description?.split(' ||| ')[1] || tx.description)
                                                : (tx.description || '-')
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-foreground font-medium">
                                        {tx.product ? (
                                            <span className="flex flex-col">
                                                <span className="line-clamp-1">{tx.product.name}</span>
                                                {tx.product.sku && <span className="text-[10px] text-muted-foreground font-mono">{tx.product.sku}</span>}
                                            </span>
                                        ) : tx.recipe ? (
                                            <span>{tx.recipe.name}</span>
                                        ) : (['Checked', 'Unchecked'].includes(tx.type)
                                            ? tx.description?.split(' - ')[0]
                                            : ['Problem', 'Solved', 'Problem Edited'].includes(tx.type)
                                                ? tx.description?.split(' ||| ')[0]
                                                : 'Unknown Product')}
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                {(tx.user?.name || tx.user?.username || 'S').charAt(0).toUpperCase()}
                                            </div>
                                            <span className="truncate max-w-[100px]">{tx.user?.name || tx.user?.username || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className={cn("px-6 py-4 text-right font-bold text-sm",
                                        tx.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' :
                                            tx.type === 'OUT' ? 'text-blue-600 dark:text-blue-400' :
                                                tx.type === 'BOM_ADD' ? 'text-purple-600 dark:text-purple-400' :
                                                    tx.type === 'Solved' ? 'text-green-600 dark:text-green-400' :
                                                        tx.type === 'Service Robot' ? 'text-cyan-600 dark:text-cyan-400' :
                                                            tx.type === 'Problem' || tx.type === 'Problem Edited' ? 'text-red-600 dark:text-red-400' :
                                                                'text-orange-600 dark:text-orange-400')}>
                                        {['Solved', 'Problem', 'Problem Edited', 'Checked', 'Unchecked', 'Service Robot'].includes(tx.type)
                                            ? '-'
                                            : `${['IN', 'BOM_ADD'].includes(tx.type) ? '+' : '-'}${formatNumber(tx.quantity)}`
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
                        <div className="text-xs text-muted-foreground">
                            Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 bg-background border border-border rounded-lg disabled:opacity-40 transition-all hover:bg-accent"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1 px-2">
                                <span className="text-xs font-medium">{currentPage}</span>
                                <span className="text-xs text-muted-foreground">/</span>
                                <span className="text-xs text-muted-foreground">{totalPages}</span>
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-background border border-border rounded-lg disabled:opacity-40 transition-all hover:bg-accent"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )

    function handlePageChange(newPage: number) {
        const params = new URLSearchParams(searchParams)
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }
}
