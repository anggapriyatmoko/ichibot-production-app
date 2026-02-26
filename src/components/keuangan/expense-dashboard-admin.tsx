'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Loader2, Search, ImageIcon, ChevronUp, ChevronDown } from 'lucide-react'
import { getAllExpenses } from '@/app/actions/expense'
import { useAlert } from '@/hooks/use-alert'
import {
    TableWrapper,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableHeaderContent,
    TableEmpty,
    TableFooter
} from '@/components/ui/table'
import Modal from '@/components/ui/modal'

interface Category {
    id: string
    name: string
}

interface Expense {
    id: string
    date: Date
    name: string
    amount: string
    categoryId: string
    image: string | null
    createdAt?: string | Date
    category?: Category
    userName?: string
}

export default function ExpenseDashboardAdmin() {
    const { showError } = useAlert()
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Sort state (Default: terbaru = date desc)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' })

    // Filter state
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 1) // default 1 bulan terakhir
        return d.toISOString().substring(0, 10)
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10))

    // Preview Image State
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    // Helper formatting Currency
    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return isNaN(num) ? 'Rp 0' : new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num)
    }

    const fetchExpenses = useCallback(async () => {
        setIsLoading(true)
        try {
            // Include dates to start/end of day to grab everything on that day
            const start = startDate ? new Date(startDate) : undefined
            if (start) start.setHours(0, 0, 0, 0)

            const end = endDate ? new Date(endDate) : undefined
            if (end) end.setHours(23, 59, 59, 999)

            const res = await getAllExpenses(start?.toISOString(), end?.toISOString())
            if (res.success && res.data) {
                setExpenses(res.data as Expense[])
            } else {
                showError(res.error || 'Gagal memuat rekapitulasi')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan koneksi saat dekripsi data.')
        } finally {
            setIsLoading(false)
        }
    }, [startDate, endDate]) // Removed showError to prevent loops if it's not memoized

    // Fetch on initial load
    useEffect(() => {
        fetchExpenses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Empty dependency array prevents recursive fetch

    const totalAmount = expenses.reduce((acc, current) => {
        const val = parseFloat(current.amount)
        return acc + (isNaN(val) ? 0 : val)
    }, 0)

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedExpenses = [...expenses].sort((a, b) => {
        let aValue: any, bValue: any
        switch (sortConfig.key) {
            case 'date':
                const aD = new Date(a.date).getTime()
                const bD = new Date(b.date).getTime()
                if (aD === bD) {
                    aValue = new Date(a.createdAt || a.date).getTime()
                    bValue = new Date(b.createdAt || b.date).getTime()
                } else {
                    aValue = aD
                    bValue = bD
                }
                break
            case 'userName':
                aValue = a.userName || ''
                bValue = b.userName || ''
                break
            case 'category':
                aValue = a.category?.name || ''
                bValue = b.category?.name || ''
                break
            case 'name':
                aValue = a.name.toLowerCase()
                bValue = b.name.toLowerCase()
                break
            case 'amount':
                aValue = parseFloat(a.amount) || 0
                bValue = parseFloat(b.amount) || 0
                break
            default:
                return 0
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const renderSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <div className="inline-flex flex-col ml-1 opacity-20"><ChevronUp className="w-2.5 h-2.5 -mb-1" /><ChevronDown className="w-2.5 h-2.5" /></div>
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-3 h-3 inline-block ml-1 text-primary" />
            : <ChevronDown className="w-3 h-3 inline-block ml-1 text-primary" />
    }

    return (
        <div className="space-y-4">
            <TableWrapper loading={isLoading}>
                <TableHeaderContent
                    title="Riwayat Semua Pengeluaran"
                    description="Menampilkan semua pengeluaran dari seluruh user. Data didekripsi dari database secara real-time."
                    actions={
                        <div className="flex flex-col sm:flex-row items-center gap-2 bg-background p-1 border border-border rounded-lg">
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-sm text-muted-foreground font-medium">Dari:</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
                                />
                            </div>
                            <div className="hidden sm:block w-px h-5 bg-border" />
                            <div className="flex items-center gap-2 px-2">
                                <span className="text-sm text-muted-foreground font-medium">Sampai:</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
                                />
                            </div>
                            <button
                                onClick={fetchExpenses}
                                disabled={isLoading}
                                className="bg-primary text-primary-foreground p-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                title="Filter Data"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    }
                />

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">No</TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('date')}>
                                    Tanggal {renderSortIcon('date')}
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('userName')}>
                                    Penginput (User) {renderSortIcon('userName')}
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('category')}>
                                    Kategori {renderSortIcon('category')}
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('name')}>
                                    Nama Pengeluaran {renderSortIcon('name')}
                                </TableHead>
                                <TableHead align="right" className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => requestSort('amount')}>
                                    Jumlah {renderSortIcon('amount')}
                                </TableHead>
                                <TableHead align="center">Bukti</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedExpenses.length === 0 && !isLoading ? (
                                <TableEmpty colSpan={7} message="Tidak ada data pengeluaran pada rentang tanggal ini." />
                            ) : (
                                sortedExpenses.map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell align="center" className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {format(new Date(item.date), 'dd MMM yyyy', { locale: localeId })}
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                Jam {format(new Date(item.createdAt || item.date), 'HH:mm')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-foreground">{item.userName || 'Unknown'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                                                {item.category?.name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell align="right" className="font-semibold text-foreground">
                                            {formatCurrency(item.amount)}
                                        </TableCell>
                                        <TableCell align="center">
                                            {item.image ? (
                                                <button
                                                    onClick={() => {
                                                        setPreviewImage(item.image)
                                                        setIsPreviewOpen(true)
                                                    }}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors inline-block"
                                                    title="Lihat Foto"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {expenses.length > 0 && !isLoading && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={5} className="text-right font-bold py-4 text-muted-foreground uppercase text-xs tracking-wider">
                                        Total Akumulasi Periode Ini
                                    </TableCell>
                                    <TableCell align="right" className="font-bold text-lg text-primary py-4">
                                        {formatCurrency(totalAmount)}
                                    </TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </TableWrapper>

            {/* Image Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title="Bukti Pengeluaran"
                maxWidth="3xl"
            >
                {previewImage && (
                    <div className="flex justify-center flex-col gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImage} alt="Bukti" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
                    </div>
                )}
            </Modal>
        </div>
    )
}
