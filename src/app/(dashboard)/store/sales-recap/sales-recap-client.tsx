'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getStoreSaleLogs } from '@/app/actions/store-sale-log'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Search, Loader2, PackageOpen, ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Edit, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { updateStoreSaleLog, deleteStoreSaleLog } from '@/app/actions/store-sale-log'
import { SalesAnalytics } from './sales-analytics'
import { ShopeeImportModal } from './shopee-import-modal'

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

    // Modals state
    const [editLog, setEditLog] = useState<any>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState(false)
    const [showImport, setShowImport] = useState(false)

    // Edit form state
    const [editForm, setEditForm] = useState({ nominal: 0, quantity: 1, marketplace: '', itemSku: '', itemName: '' })

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

    const handleEditClick = (log: any) => {
        setEditForm({
            nominal: log.nominal || 0,
            quantity: log.quantity || 1,
            marketplace: log.marketplace || '',
            itemSku: log.itemSku || '',
            itemName: log.itemName || ''
        })
        setEditLog(log)
    }

    const handleUpdate = async () => {
        if (!editLog) return
        setActionLoading(true)
        const res = await updateStoreSaleLog(editLog.id, {
            ...editForm,
        })
        if (res.success) {
            setEditLog(null)
            fetchLogs(debouncedTerm, page)
        } else {
            alert(res.error || "Gagal mengubah data")
        }
        setActionLoading(false)
    }

    const handleDelete = async () => {
        if (!deleteId) return
        setActionLoading(true)
        const res = await deleteStoreSaleLog(deleteId)
        if (res.success) {
            setDeleteId(null)
            fetchLogs(debouncedTerm, page)
        } else {
            alert(res.error || "Gagal menghapus data")
        }
        setActionLoading(false)
    }

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
            <button
                onClick={() => setShowImport(true)}
                className="h-10 px-3 bg-[#EE4D2D] hover:bg-[#EE4D2D]/90 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shrink-0"
                title="Import Data Shopee"
            >
                <img src="/icons8-shopee.svg" alt="" className="w-4 h-4 brightness-0 invert" />
                Import
            </button>
        </div>
    )

    return (
        <div className="space-y-12">
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
                                <TableHead align="center" className="w-[100px]">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" className="h-48">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <span className="text-sm font-medium">Memuat Data...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" className="h-48 text-muted-foreground">
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
                                            {(() => {
                                                const mp = (log.marketplace || '').toLowerCase()
                                                const colors = mp.includes('shopee')
                                                    ? 'bg-orange-50 text-[#EE4D2D] border-orange-200'
                                                    : mp.includes('tokopedia') || mp.includes('tokped')
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                return (
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${colors}`}>
                                                        {log.marketplace}
                                                    </span>
                                                )
                                            })()}
                                        </TableCell>
                                        <TableCell align="center">
                                            <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(log)} className="p-1.5 hover:bg-muted/80 rounded-md text-foreground transition-colors" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteId(log.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors" title="Hapus">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        
                        {logs.length > 0 && (
                            <TableFooter>
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={6} align="right" className="font-bold text-muted-foreground">
                                        TOTAL HALAMAN INI
                                    </TableCell>
                                    <TableCell align="right" className="font-black text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totalNominal)}
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
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

            <div className="pt-4 border-t border-border">
                <SalesAnalytics />
            </div>

            <Modal
                isOpen={!!editLog}
                onClose={() => !actionLoading && setEditLog(null)}
                title={
                    <div className="flex items-center gap-2">
                        <Edit className="w-5 h-5 text-primary" /> Edit Log Penjualan
                    </div>
                }
                maxWidth="lg"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button type="button" onClick={() => setEditLog(null)} disabled={actionLoading} className="px-4 py-2 font-semibold text-muted-foreground hover:text-foreground">
                            Batal
                        </button>
                        <button type="button" onClick={handleUpdate} disabled={actionLoading} className="px-6 py-2 bg-primary text-primary-foreground font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Simpan Perubahan
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 bg-muted/50 rounded-xl mb-6">
                        <p className="text-sm font-semibold flex gap-2"><span>Order:</span> <span className="text-primary">#{editLog?.orderNumber}</span></p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Nama Barang</label>
                        <input
                            type="text"
                            value={editForm.itemName}
                            onChange={(e) => setEditForm(prev => ({ ...prev, itemName: e.target.value }))}
                            className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">SKU</label>
                            <input
                                type="text"
                                value={editForm.itemSku}
                                onChange={(e) => setEditForm(prev => ({ ...prev, itemSku: e.target.value }))}
                                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Marketplace</label>
                            <input
                                type="text"
                                value={editForm.marketplace}
                                onChange={(e) => setEditForm(prev => ({ ...prev, marketplace: e.target.value }))}
                                className="w-full h-11 px-3 bg-background border border-border rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Kuantitas (Qty)</label>
                            <input
                                type="number"
                                min={1}
                                value={editForm.quantity}
                                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                className="w-full h-11 px-3 bg-background border border-border rounded-lg font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Nominal Total (Rp)</label>
                            <input
                                type="number"
                                value={editForm.nominal}
                                onChange={(e) => setEditForm(prev => ({ ...prev, nominal: parseFloat(e.target.value) || 0 }))}
                                className="w-full h-11 px-3 bg-background border border-border rounded-lg font-bold text-emerald-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!deleteId}
                onClose={() => !actionLoading && setDeleteId(null)}
                title={
                    <div className="flex items-center gap-2 text-destructive">
                        <Trash2 className="w-5 h-5" /> Konfirmasi Hapus
                    </div>
                }
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button type="button" onClick={() => setDeleteId(null)} disabled={actionLoading} className="px-4 py-2 font-semibold text-muted-foreground hover:text-foreground">
                            Batal
                        </button>
                        <button type="button" onClick={handleDelete} disabled={actionLoading} className="px-6 py-2 bg-destructive text-destructive-foreground font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Ya, Hapus Data
                        </button>
                    </div>
                }
            >
                <div className="py-4">
                    <p className="text-foreground">Apakah Anda yakin ingin menghapus log penjualan ini?</p>
                    <p className="text-sm text-destructive mt-2 font-medium">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
            </Modal>

            <ShopeeImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onSuccess={() => fetchLogs(debouncedTerm, page)}
            />
        </div>
    )
}
