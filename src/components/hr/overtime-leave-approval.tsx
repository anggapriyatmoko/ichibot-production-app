'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, X, Clock, FileText, User as UserIcon, Calendar, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOvertimeLeaves, updateOvertimeLeaveStatus, createOvertimeOrder, deleteOvertimeLeave, updateOvertimeLeave } from '@/app/actions/overtime-leave'
import { getUsers } from '@/app/actions/user'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
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
} from '@/components/ui/table'

export default function OvertimeLeaveApproval() {
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
        amount: ''
    })

    // Pagination state
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const limit = 10

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

    // Period state
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())


    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    const fetchRequests = async () => {
        setIsLoading(true)
        const res = await getOvertimeLeaves(page, limit, filterTypes, false, selectedMonth, selectedYear)
        if (res.success) {
            setRequests(res.data || [])
            setTotalPages(res.pages || 1)
            setTotalItems(res.total || 0)

        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchRequests()
        loadUsers()
    }, [page, filterTypes, selectedMonth, selectedYear])

    // Reset page on filter change
    useEffect(() => {
        setPage(1)
    }, [filterTypes, selectedMonth, selectedYear])

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
            setOrderForm({ userId: '', requesterName: '', job: '', amount: '' })
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

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    return (
        <TableWrapper className="mb-10" loading={isLoading}>
            <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            Rekap Izin & Lembur
                        </h2>
                        <p className="text-xs text-muted-foreground">Monitoring pengajuan izin dan lembur karyawan.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                            className="bg-background border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-background border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {pendingCount > 0 && (
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
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center gap-4">
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
            {totalItems > 0 && totalPages > 1 && (
                <div className="bg-muted/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Showing <span className="font-bold text-foreground">{(page - 1) * limit + 1}-{Math.min(page * limit, totalItems)}</span> of <span className="font-bold text-foreground">{totalItems}</span>
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                            className="p-2 hover:bg-card rounded-lg border border-border disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={cn(
                                        "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                                        page === p ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-card border border-transparent hover:border-border"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isLoading}
                            className="p-2 hover:bg-card rounded-lg border border-border disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>
            )}
            {/* Perintah Lembur Modal */}
            {isAddingOrder && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-primary" />
                                Buat Perintah Lembur
                            </h3>
                            <button onClick={() => setIsAddingOrder(false)} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="p-4 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Pilih Karyawan</label>
                                <select
                                    value={orderForm.userId}
                                    onChange={e => setOrderForm({ ...orderForm, userId: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    required
                                >
                                    <option value="">-- Pilih Karyawan --</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                                    ))}
                                </select>
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

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingOrder(false)}
                                    className="flex-1 py-2 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingOrder}
                                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    {isSubmittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Kirim Perintah
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Decision Modal (Approve/Reject) */}
            {isDeciding && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-sm rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200">
                        <div className={cn(
                            "p-4 border-b border-border flex justify-between items-center",
                            decisionStatus === 'APPROVED' ? "bg-emerald-500/5" : "bg-rose-500/5"
                        )}>
                            <h3 className={cn(
                                "font-bold text-lg flex items-center gap-2",
                                decisionStatus === 'APPROVED' ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {decisionStatus === 'APPROVED' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                {decisionStatus === 'APPROVED' ? "Terima Pengajuan" : "Tolak Pengajuan"}
                            </h3>
                            <button onClick={() => setIsDeciding(false)} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleDecisionSubmit} className="p-4 space-y-4">
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

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsDeciding(false)}
                                    className="flex-1 py-2 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingId !== null}
                                    className={cn(
                                        "flex-1 py-2 text-white rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg",
                                        decisionStatus === 'APPROVED'
                                            ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                                            : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                                    )}
                                >
                                    {processingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : (decisionStatus === 'APPROVED' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />)}
                                    Konfirmasi {decisionStatus === 'APPROVED' ? "Terima" : "Tolak"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border flex flex-col animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[85vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-blue-500/5">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-blue-600">
                                <Pencil className="w-5 h-5" />
                                Edit Data Pengajuan
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-muted rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
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

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 rounded-lg border border-border hover:bg-muted font-bold text-sm transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processingId !== null}
                                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    {processingId !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </TableWrapper>
    )
}
