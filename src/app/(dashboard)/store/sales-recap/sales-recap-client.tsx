'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getStoreSaleLogs } from '@/app/actions/store-sale-log'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Search, Loader2, PackageOpen, ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

import {
  TableWrapper,
  TableScrollArea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableHeaderContent,
  TableFooter,
  TablePagination,
} from "@/components/ui/table"

export default function SalesRecapClient() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedTerm, setDebouncedTerm] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [totalItems, setTotalItems] = useState(0)

    const searchInputRef = useRef<HTMLInputElement>(null)

    const fetchLogs = useCallback(async (query: string, pageNum: number) => {
        setLoading(true)
        try {
            const res = await getStoreSaleLogs(pageNum, query)
            if (res.success) {
                setLogs(res.logs)
                setTotalPages(res.totalPages)
                setTotalItems(res.totalItems)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedTerm(searchTerm)
            setPage(1)
        }, 500)
        return () => clearTimeout(handler)
    }, [searchTerm])

    useEffect(() => {
        fetchLogs(debouncedTerm, page)
    }, [debouncedTerm, page, fetchLogs])

    const totalNominal = logs.reduce((sum, item) => sum + (item.nominal || 0), 0)

    const headerActions = (
        <div className="flex items-center gap-2">
            <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Cari No. Order / SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[200px] lg:w-[300px] h-10 pl-9 pr-9 bg-background border border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-sm transition-all outline-none"
                />
                {searchTerm && (
                    <button
                        onClick={() => {
                            setSearchTerm('')
                            searchInputRef.current?.focus()
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <button
                onClick={() => fetchLogs(debouncedTerm, page)}
                disabled={loading}
                className="h-10 px-3 bg-background border border-border hover:border-primary/50 hover:bg-muted focus:ring-2 focus:ring-primary/20 rounded-lg text-muted-foreground transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                title="Refresh Data"
            >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
        </div>
    )

    return (
        <TableWrapper loading={loading}>
            <TableHeaderContent 
                title="Rekap Penjualan"
                description={`Log data penjualan dari Order Manual & Webhook. Menampilkan total ${totalItems} baris data.`}
                icon={<PackageOpen className="w-5 h-5" />}
                actions={headerActions}
            />

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[160px]">Tanggal Order</TableHead>
                            <TableHead className="w-[130px]">Nomor Order</TableHead>
                            <TableHead className="w-[130px] hidden lg:table-cell">ID Barang</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead className="w-[120px] hidden md:table-cell">SKU</TableHead>
                            <TableHead align="right" className="w-[80px]">Qty</TableHead>
                            <TableHead align="right" className="w-[150px]">Nominal</TableHead>
                            <TableHead align="center" className="w-[120px]">Marketplace</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" className="h-48">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span className="text-sm font-medium">Memuat Data...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" className="h-48 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <PackageOpen className="h-8 w-8 opacity-50" />
                                        <span className="font-medium">Tidak ada data ditemukan.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{format(new Date(log.orderDate), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                                            #{log.orderNumber}
                                        </span>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell font-mono text-muted-foreground">
                                        {log.itemId}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{log.itemName}</div>
                                        <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                                            SKU: {log.itemSku || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground">
                                        {log.itemSku || '-'}
                                    </TableCell>
                                    <TableCell align="right" className="font-semibold">
                                        {formatNumber(log.quantity)}
                                    </TableCell>
                                    <TableCell align="right" className="font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(log.nominal)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-amber-50 text-amber-600 border-amber-200">
                                            {log.marketplace}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    
                    {/* Table Footer matching other pages */}
                    {logs.length > 0 && (
                        <TableFooter>
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} align="right" className="font-bold text-muted-foreground">
                                    TOTAL HALAMAN INI
                                </TableCell>
                                <TableCell align="right" className="font-black text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(totalNominal)}
                                </TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableScrollArea>

            <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalCount={totalItems}
                itemsPerPage={50}
            />
        </TableWrapper>
    )
}
