'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X, Clock, FileText, User as UserIcon, Calendar, Loader2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOvertimeLeaves, updateOvertimeLeaveStatus, createOvertimeOrder, deleteOvertimeLeave, updateOvertimeLeave, getOvertimeRecapSequence } from '@/app/actions/overtime-leave'
import { getUsers } from '@/app/actions/user'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import Modal from '@/components/ui/modal'
import { Combobox } from '@/components/ui/combobox'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TableHeaderContent,
    TablePagination,
} from '@/components/ui/table'

export default function OvertimeLeaveApproval() {
    const [activeTab, setActiveTab] = useState<'list' | 'recap'>('list')
    const [requests, setRequests] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Decision Modal state
    const [isDeciding, setIsDeciding] = useState(false)
    const [decisionId, setDecisionId] = useState<string | null>(null)
    const [decisionStatus, setDecisionStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED')
    const [decisionData, setDecisionData] = useState({
        amount: '',
        adminNote: ''
    })

    // Perintah Lembur state
    const [users, setUsers] = useState<any[]>([])
    const [isAddingOrder, setIsAddingOrder] = useState(false)
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
    const [orderForm, setOrderForm] = useState({
        userId: '',
        requesterName: '',
        job: '',
        amount: '',
        date: new Date().toISOString().split('T')[0] // Default to today
    })

    // Pagination state
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Filter state
    const [filterTypes, setFilterTypes] = useState<string[]>(['ORDER', 'OVERTIME_SUBMISSION', 'LEAVE', 'VACATION'])

    // Edit Modal state
    const [isEditing, setIsEditing] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({
        date: '',
        type: '',
        reason: '',
        job: '',
        requesterName: '',
        amount: '',
        adminNote: '',
        status: ''
    })

    // Date Range state (30 days before and 30 days after today)
    const getDefaultStartDate = () => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date.toISOString().split('T')[0]
    }

    const getDefaultEndDate = () => {
        const date = new Date()
        date.setDate(date.getDate() + 30)
        return date.toISOString().split('T')[0]
    }

    const [startDate, setStartDate] = useState(getDefaultStartDate())
    const [endDate, setEndDate] = useState(getDefaultEndDate())


    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    // Recap Tab State
    const [recapMonth, setRecapMonth] = useState(new Date().getMonth() + 1)
    const [recapYear, setRecapYear] = useState(new Date().getFullYear())
    const [recapData, setRecapData] = useState<any[]>([])
    const [recapPeriod, setRecapPeriod] = useState<{ start: string, end: string } | null>(null)
    const [payrollDay, setPayrollDay] = useState(25)

    useEffect(() => {
        const saved = localStorage.getItem('salaryCalculationDay')
        if (saved) setPayrollDay(parseInt(saved))
    }, [])

    const fetchRequests = async () => {
        setIsLoading(true)
        if (activeTab === 'list') {
            const res = await getOvertimeLeaves(page, itemsPerPage, filterTypes, false, startDate, endDate)
            if (res.success) {
                setRequests(res.data || [])
                setTotalPages(res.pages || 1)
                setTotalItems(res.total || 0)
            }
        } else {
            const res = await getOvertimeRecapSequence(recapMonth, recapYear, payrollDay)
            if (res.success) {
                setRecapData(res.data || [])
                setRecapPeriod(res.period)
            }
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchRequests()
        loadUsers()
    }, [page, filterTypes, startDate, endDate, itemsPerPage, activeTab, recapMonth, recapYear, payrollDay])

    // Reset page on filter change
    useEffect(() => {
        setPage(1)
    }, [filterTypes, startDate, endDate])

    const loadUsers = async () => {
        const data = await getUsers()
        setUsers(data)
    }

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setDecisionId(id)
        setDecisionStatus(status)
        setDecisionData({
            amount: '',
            adminNote: ''
        })
        setIsDeciding(true)
    }

    const handleDelete = async (id: string) => {
        showConfirmation({
            title: 'Hapus Pengajuan',
            message: 'Yakin ingin menghapus data pengajuan ini? Tindakan ini tidak dapat dibatalkan.',
            action: async () => {
                const res = await deleteOvertimeLeave(id)
                if (res.success) {
                    showAlert('Data berhasil dihapus', 'Berhasil')
                    fetchRequests()
                    window.dispatchEvent(new Event('refresh-notifications'))
                } else {
                    showError(res.error || 'Gagal menghapus data')
                }
            }
        })
    }

    const startEdit = (req: any) => {
        setEditId(req.id)
        setEditForm({
            date: req.date ? new Date(req.date).toISOString().split('T')[0] : '',
            type: req.type,
            reason: req.reason || '',
            job: req.job || '',
            requesterName: req.requesterName || '',
            amount: req.amount?.toString() || '',
            adminNote: req.adminNote || '',
            status: req.status
        })
        setIsEditing(true)
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editId) return

        setProcessingId(editId)
        const res = await updateOvertimeLeave(editId, editForm)
        if (res.success) {
            showAlert('Data berhasil diperbarui', 'Berhasil')
            setIsEditing(false)
            fetchRequests()
            window.dispatchEvent(new Event('refresh-notifications'))
        } else {
            showError(res.error || 'Gagal memperbarui data')
        }
        setProcessingId(null)
    }

    const handleDecisionSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!decisionId) return

        if (decisionStatus === 'REJECTED' && !decisionData.adminNote.trim()) {
            return showAlert('Wajib mengisi catatan untuk penolakan', 'Peringatan')
        }

        setProcessingId(decisionId)
        const res = await updateOvertimeLeaveStatus(
            decisionId,
            decisionStatus,
            parseFloat(decisionData.amount) || 0,
            decisionData.adminNote
        )

        if (res.success) {
            showAlert(decisionStatus === 'APPROVED' ? 'Pengajuan disetujui' : 'Pengajuan ditolak', 'Berhasil')
            setIsDeciding(false)
            setDecisionId(null)
            fetchRequests()
            window.dispatchEvent(new Event('refresh-notifications'))
        } else {
            showError(res.error || 'Terjadi kesalahan')
        }
        setProcessingId(null)
    }

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orderForm.userId) return showAlert('Pilih user terlebih dahulu', 'Peringatan')

        setIsSubmittingOrder(true)
        const fd = new FormData()
        Object.entries(orderForm).forEach(([key, value]) => fd.append(key, value))

        const res = await createOvertimeOrder(fd)
        if (res.success) {
            showAlert('Perintah lembur berhasil dikirim', 'Berhasil')
            setIsAddingOrder(false)
            setOrderForm({ userId: '', requesterName: '', job: '', amount: '', date: new Date().toISOString().split('T')[0] })
            fetchRequests()
            window.dispatchEvent(new Event('refresh-notifications'))
        } else {
            showError(res.error || 'Gagal membuat perintah lembur')
        }
        setIsSubmittingOrder(false)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            case 'REJECTED': return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Disetujui'
            case 'REJECTED': return 'Ditolak'
            default: return 'Pending'
        }
    }

    const pendingCount = requests.filter(r => r.status === 'PENDING').length

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <TableWrapper loading={isLoading}>
            <TableHeaderContent
                title="Sistem Izin & Lembur"
                description="Monitoring pengajuan izin dan lembur karyawan."
                icon={<Clock className="w-5 h-5 font-bold text-primary" />}
                actions={
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-muted p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('list')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                    activeTab === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                Daftar Pengajuan
                            </button>
                            <button
                                onClick={() => setActiveTab('recap')}
                                className={cn(
                                    "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                                    activeTab === 'recap' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                Rekap Lembur Nominal
                            </button>
                        </div>
                        {pendingCount > 0 && activeTab === 'list' && (
                            <div className="px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-bold animate-bounce shadow-lg shadow-amber-500/20">
                                {pendingCount} Pending
                            </div>
                        )}
                        <button
                            onClick={() => setIsAddingOrder(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Perintah Lembur</span>
                            <span className="sm:hidden">Tambah</span>
                        </button>
                    </div>
                }
            />

            {activeTab === 'list' ? (
                <>
                    <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 mr-4">
                            <label className="text-[10px] font-bold text-muted-foreground">Dari:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <label className="text-[10px] font-bold text-muted-foreground">Sampai:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <span className="text-xs font-bold text-foreground">Filter :</span>
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { id: 'ORDER', label: 'Perintah Lembur', color: 'emerald' },
                                { id: 'OVERTIME_SUBMISSION', label: 'Pengajuan Lembur', color: 'purple' },
                                { id: 'LEAVE', label: 'Pengajuan Izin', color: 'blue' },
                                { id: 'VACATION', label: 'Pengajuan Cuti', color: 'orange' },
                            ].map((f) => {
                                const isSelected = filterTypes.includes(f.id);
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => {
                                            setFilterTypes(prev =>
                                                isSelected
                                                    ? prev.filter(t => t !== f.id)
                                                    : [...prev, f.id]
                                            )
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all",
                                            isSelected
                                                ? {
                                                    emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
                                                    purple: "bg-purple-500/10 border-purple-500/30 text-purple-600",
                                                    blue: "bg-blue-500/10 border-blue-500/30 text-blue-600",
                                                    orange: "bg-orange-500/10 border-orange-500/30 text-orange-600",
                                                }[f.color]
                                                : "bg-background border-border text-muted-foreground/50 hover:bg-muted"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent",
                                            isSelected
                                                ? {
                                                    emerald: "bg-emerald-500 ring-emerald-500/20",
                                                    purple: "bg-purple-500 ring-purple-500/20",
                                                    blue: "bg-blue-500 ring-blue-500/20",
                                                    orange: "bg-orange-500 ring-orange-500/20",
                                                }[f.color]
                                                : "bg-muted-foreground/20 ring-transparent"
                                        )} />
                                        {f.label}
                                    </button>
                                )
                            })}

                            <div className="h-4 w-[1px] bg-border mx-1" />

                            <button
                                onClick={() => {
                                    if (filterTypes.length === 4) setFilterTypes([])
                                    else setFilterTypes(['ORDER', 'OVERTIME_SUBMISSION', 'LEAVE', 'VACATION'])
                                }}
                                className="text-[10px] font-bold text-primary hover:underline px-2"
                            >
                                {filterTypes.length === 4 ? 'Unselect All' : 'Select All'}
                            </button>
                        </div>
                    </div>

                    <TableScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow hoverable={false} className="bg-muted/50">
                                    <TableHead>Karyawan</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Tipe</TableHead>
                                    <TableHead>Pekerjaan / Alasan</TableHead>
                                    <TableHead>Pemberi Tugas / Catatan</TableHead>
                                    <TableHead align="right">Nominal</TableHead>
                                    <TableHead align="center">Lampiran</TableHead>
                                    <TableHead align="center">Status</TableHead>
                                    <TableHead align="right">Aksi Pola</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length === 0 ? (
                                    <TableEmpty
                                        colSpan={9}
                                        message="Tidak ada data pengajuan dalam riwayat."
                                        icon={<Clock className="w-12 h-12 opacity-20" />}
                                    />
                                ) : (
                                    requests.map((req) => (
                                        <TableRow key={req.id} className={cn(
                                            req.status === 'PENDING' ? "bg-amber-500/[0.02]" : ""
                                        )}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-xs border border-border">
                                                        {req.user?.name?.[0] || req.user?.username?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-foreground">{req.user?.name || req.user?.username || 'Unknown'}</p>
                                                        <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-tight">
                                                            {req.user?.role || 'USER'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-foreground">
                                                {req.date ? new Date(req.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                                                    req.type === 'LEAVE' ? "bg-blue-500/10 text-blue-600" :
                                                        req.type === 'VACATION' ? "bg-orange-500/10 text-orange-600" :
                                                            req.requesterName ? "bg-emerald-500/10 text-emerald-600" : "bg-purple-500/10 text-purple-600"
                                                )}>
                                                    {req.type === 'LEAVE' ? 'Pengajuan Izin' :
                                                        req.type === 'VACATION' ? 'Pengajuan Cuti' :
                                                            req.requesterName ? 'Perintah Lembur' : 'Pengajuan Lembur'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs italic text-foreground whitespace-pre-wrap" title={req.job || req.reason}>
                                                    {req.job ? req.job : `"${req.reason}"`}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs text-muted-foreground">
                                                    {req.requesterName || '-'}
                                                </p>
                                                {req.adminNote && (
                                                    <p className="text-[10px] text-primary italic mt-1 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                                        Note: {req.adminNote}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <p className="text-xs font-bold text-foreground">
                                                    {req.amount ? `Rp ${req.amount.toLocaleString('id-ID')}` : '-'}
                                                </p>
                                            </TableCell>
                                            <TableCell align="center">
                                                {req.attachment ? (
                                                    <a
                                                        href={req.attachment}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all border border-border"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">No File</span>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <div className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold",
                                                    getStatusBadge(req.status)
                                                )}>
                                                    {getStatusText(req.status)}
                                                </div>
                                            </TableCell>
                                            <TableCell align="right">
                                                <div className="flex justify-end gap-2">
                                                    {req.status === 'PENDING' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAction(req.id, 'REJECTED')}
                                                                disabled={processingId === req.id}
                                                                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-rose-500/20 disabled:opacity-50"
                                                                title="Tolak"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(req.id, 'APPROVED')}
                                                                disabled={processingId === req.id}
                                                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all border border-emerald-500/20 disabled:opacity-50"
                                                                title="Terima"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    <button
                                                        onClick={() => startEdit(req)}
                                                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all border border-blue-500/20"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(req.id)}
                                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-rose-500/20"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollArea>

                    {/* Pagination Controls */}
                    <TablePagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(val) => { setItemsPerPage(val); setPage(1) }}
                        totalCount={totalItems}
                    />
                </>
            ) : (
                <>
                    <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-foreground">Bulan Rekap :</span>
                            <div className="flex items-center gap-2">
                                <select
                                    value={recapMonth}
                                    onChange={(e) => setRecapMonth(parseInt(e.target.value))}
                                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>
                                            {new Date(2000, m - 1, 1).toLocaleDateString('id-ID', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={recapYear}
                                    onChange={(e) => setRecapYear(parseInt(e.target.value))}
                                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {recapPeriod && (
                            <div className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg border border-blue-500/20 text-[10px] font-bold flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                    {new Date(recapPeriod.start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {' '} - {' '}
                                    {new Date(recapPeriod.end).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                    </div>

                    <TableScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow hoverable={false} className="bg-muted/50">
                                    <TableHead>Karyawan</TableHead>
                                    <TableHead align="center">Total Tugas Lembur</TableHead>
                                    <TableHead align="right">Total Akumulasi Nominal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recapData.length === 0 ? (
                                    <TableEmpty
                                        colSpan={3}
                                        message={`Tidak ada rekap lembur ` + (recapPeriod ? `pada periode terpilih (${payrollDay} ${new Date(2000, recapMonth - 2, 1).toLocaleDateString('id-ID', { month: 'long' })} - ${payrollDay - 1} ${new Date(2000, recapMonth - 1, 1).toLocaleDateString('id-ID', { month: 'long' })})` : '')}
                                        icon={<UserIcon className="w-12 h-12 opacity-20" />}
                                    />
                                ) : (
                                    <>
                                        {recapData.map((data) => (
                                            <TableRow key={data.userId}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-xs border border-emerald-500/20">
                                                            {data.name?.[0] || data.username?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm text-foreground">{data.name || data.username || 'Unknown'}</p>
                                                            <p className="text-[10px] uppercase text-muted-foreground font-medium tracking-tight">
                                                                {data.role || 'USER'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full text-xs font-bold">
                                                        {data.totalOvertime}x Lembur
                                                    </span>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <p className="text-sm font-bold text-foreground">
                                                        Rp {data.totalNominal.toLocaleString('id-ID')}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Total Summary Row */}
                                        <TableRow hoverable={false} className="bg-muted/30 border-t-2 border-border/50">
                                            <TableCell>
                                                <p className="font-bold text-sm text-foreground uppercase tracking-wider text-right">
                                                    Total Keseluruhan
                                                </p>
                                            </TableCell>
                                            <TableCell align="center">
                                                <span className="text-xs font-bold text-muted-foreground">
                                                    {recapData.reduce((acc, curr) => acc + curr.totalOvertime, 0)} Total Tugas
                                                </span>
                                            </TableCell>
                                            <TableCell align="right">
                                                <p className="text-base font-black text-primary">
                                                    Rp {recapData.reduce((acc, curr) => acc + curr.totalNominal, 0).toLocaleString('id-ID')}
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollArea>
                </>
            )}
            {/* Perintah Lembur Modal */}
            {isAddingOrder && (
                <Modal
                    isOpen={isAddingOrder}
                    onClose={() => setIsAddingOrder(false)}
                    title={
                        <span className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Buat Perintah Lembur
                        </span>
                    }
                    maxWidth="md"
                    footer={
                        <div className="flex justify-end gap-2 text-sm w-full">
                            <button
                                type="button"
                                onClick={() => setIsAddingOrder(false)}
                                className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors border border-transparent"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="createOrderForm"
                                disabled={isSubmittingOrder}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {isSubmittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Kirim Perintah
                            </button>
                        </div>
                    }
                >
                    <div className="p-4">
                        <form id="createOrderForm" onSubmit={handleCreateOrder} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Pilih Karyawan</label>
                                <Combobox
                                    options={users.map(u => ({
                                        id: u.id,
                                        label: u.name || u.username || 'Unknown',
                                        subtext: `${u.role} ${u.username ? `(${u.username})` : ''}`
                                    }))}
                                    value={orderForm.userId}
                                    onChange={val => setOrderForm({ ...orderForm, userId: val })}
                                    placeholder="Cari & Pilih Karyawan..."
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tanggal Lembur</label>
                                <input
                                    type="date"
                                    value={orderForm.date}
                                    onChange={e => setOrderForm({ ...orderForm, date: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nama Penyuruh Lembur</label>
                                <input
                                    type="text"
                                    value={orderForm.requesterName}
                                    onChange={e => setOrderForm({ ...orderForm, requesterName: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Nama atasan/pemberi tugas"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Pekerjaan</label>
                                <textarea
                                    value={orderForm.job}
                                    onChange={e => setOrderForm({ ...orderForm, job: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                    placeholder="Jelaskan detail pekerjaan lembur..."
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nominal (Rupiah)</label>
                                <input
                                    type="number"
                                    value={orderForm.amount}
                                    onChange={e => setOrderForm({ ...orderForm, amount: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    placeholder="Contoh: 50000"
                                    required
                                />
                            </div>

                        </form>
                    </div>
                </Modal>
            )}
            {/* Decision Modal (Approve/Reject) */}
            {isDeciding && (
                <Modal
                    isOpen={isDeciding}
                    onClose={() => setIsDeciding(false)}
                    title={
                        <span className={cn(
                            "flex items-center gap-2",
                            decisionStatus === 'APPROVED' ? "text-emerald-600" : "text-rose-600"
                        )}>
                            {decisionStatus === 'APPROVED' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            {decisionStatus === 'APPROVED' ? "Terima Pengajuan" : "Tolak Pengajuan"}
                        </span>
                    }
                    maxWidth="sm"
                    footer={
                        <div className="flex justify-end gap-2 text-sm w-full">
                            <button
                                type="button"
                                onClick={() => setIsDeciding(false)}
                                className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="decisionForm"
                                disabled={processingId !== null}
                                className={cn(
                                    "px-4 py-2 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50",
                                    decisionStatus === 'APPROVED'
                                        ? "bg-emerald-500 hover:bg-emerald-600"
                                        : "bg-rose-500 hover:bg-rose-600"
                                )}
                            >
                                {processingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : (decisionStatus === 'APPROVED' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />)}
                                Konfirmasi {decisionStatus === 'APPROVED' ? "Terima" : "Tolak"}
                            </button>
                        </div>
                    }
                >
                    <div className="p-4">
                        <form id="decisionForm" onSubmit={handleDecisionSubmit} className="space-y-4">
                            {decisionStatus === 'APPROVED' && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nominal Rupiah (Opsional)</label>
                                    <input
                                        type="number"
                                        value={decisionData.amount}
                                        onChange={e => setDecisionData({ ...decisionData, amount: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                                        placeholder="Contoh: 50000"
                                    />
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">
                                    Catatan Admin {decisionStatus === 'REJECTED' && <span className="text-rose-500">*</span>}
                                </label>
                                <textarea
                                    value={decisionData.adminNote}
                                    onChange={e => setDecisionData({ ...decisionData, adminNote: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none italic"
                                    placeholder={decisionStatus === 'REJECTED' ? "Alasan pengajuan ditolak..." : "Tulis alasan disetujui atau info tambahan..."}
                                    required={decisionStatus === 'REJECTED'}
                                />
                            </div>

                        </form>
                    </div>
                </Modal>
            )}
            {/* Edit Modal */}
            {isEditing && (
                <Modal
                    isOpen={isEditing}
                    onClose={() => setIsEditing(false)}
                    title={
                        <span className="flex items-center gap-2 text-blue-600">
                            <Pencil className="w-5 h-5" />
                            Edit Data Pengajuan
                        </span>
                    }
                    maxWidth="lg"
                    footer={
                        <div className="flex justify-end gap-2 text-sm w-full">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="editRequestForm"
                                disabled={processingId !== null}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {processingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Simpan Perubahan
                            </button>
                        </div>
                    }
                >
                    <div className="p-4">
                        <form id="editRequestForm" onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tanggal</label>
                                    <input
                                        type="date"
                                        value={editForm.date}
                                        onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tipe</label>
                                    <select
                                        value={editForm.type}
                                        onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        required
                                    >
                                        <option value="LEAVE">Pengajuan Izin</option>
                                        <option value="VACATION">Pengajuan Cuti</option>
                                        <option value="OVERTIME">Lembur</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alasan / Penjelasan</label>
                                <textarea
                                    value={editForm.reason}
                                    onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none outline-none"
                                    placeholder="Alasan pengajuan..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Pekerjaan (Lembur)</label>
                                    <input
                                        type="text"
                                        value={editForm.job}
                                        onChange={e => setEditForm({ ...editForm, job: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
                                        placeholder="Detail pekerjaan..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Pemberi Tugas</label>
                                    <input
                                        type="text"
                                        value={editForm.requesterName}
                                        onChange={e => setEditForm({ ...editForm, requesterName: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none"
                                        placeholder="Nama atasan..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nominal (Rp)</label>
                                    <input
                                        type="number"
                                        value={editForm.amount}
                                        onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none font-bold"
                                        required
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Catatan Admin</label>
                                <textarea
                                    value={editForm.adminNote}
                                    onChange={e => setEditForm({ ...editForm, adminNote: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-20 resize-none outline-none italic"
                                    placeholder="Catatan dari admin..."
                                />
                            </div>

                        </form>
                    </div>
                </Modal>
            )}
        </TableWrapper>
    )
}
