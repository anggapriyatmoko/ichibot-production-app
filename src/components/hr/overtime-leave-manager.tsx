'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Clock, Check, X, FileText, Image as ImageIcon, Calendar, AlertCircle, Loader2, ChevronRight, File, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createOvertimeLeave, getOvertimeLeaves, deleteOvertimeLeave, respondToOvertimeOrder } from '@/app/actions/overtime-leave'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import {
    TableWrapper,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
} from '@/components/ui/table'

export default function OvertimeLeaveManager({ userRole }: { userRole: string }) {
    const [requests, setRequests] = useState<any[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'LEAVE',
        reason: '',
        attachment: null as File | null
    })

    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    const [filterTypes, setFilterTypes] = useState<string[]>(['ORDER', 'OVERTIME_SUBMISSION', 'LEAVE', 'VACATION'])

    const fetchRequests = async () => {
        setIsLoading(true)
        const res = await getOvertimeLeaves(1, 100, filterTypes, true)
        if (res.success) {
            setRequests(res.data || [])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchRequests()
    }, [filterTypes])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        const data = new FormData()
        data.append('date', formData.date)
        data.append('type', formData.type)
        data.append('reason', formData.reason)
        if (formData.attachment) {
            data.append('attachment', formData.attachment)
        }

        const res = await createOvertimeLeave(data)
        if (res.success) {
            showAlert('Pengajuan berhasil dikirim', 'Berhasil')
            setIsAdding(false)
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: 'LEAVE',
                reason: '',
                attachment: null
            })
            fetchRequests()
            window.dispatchEvent(new Event('refresh-notifications'))
        } else {
            showError(res.error || 'Terjadi kesalahan')
        }
        setIsSubmitting(false)
    }

    const handleDelete = async (id: string) => {
        showConfirmation({
            title: 'Hapus Pengajuan',
            message: 'Yakin ingin menghapus pengajuan ini?',
            action: async () => {
                const res = await deleteOvertimeLeave(id)
                if (res.success) {
                    showAlert('Pengajuan dihapus', 'Terhapus')
                    fetchRequests()
                    window.dispatchEvent(new Event('refresh-notifications'))
                } else {
                    showError(res.error || 'Terjadi kesalahan')
                }
            }
        })
    }

    const handleRespond = async (id: string, action: 'ACCEPT' | 'REJECT') => {
        showConfirmation({
            title: action === 'ACCEPT' ? 'Terima Perintah Lembur' : 'Tolak Perintah Lembur',
            message: action === 'ACCEPT'
                ? 'Anda yakin menerima tugas lembur ini?'
                : 'Anda yakin menolak tugas lembur ini?',
            action: async () => {
                const res = await respondToOvertimeOrder(id, action)
                if (res.success) {
                    showAlert(action === 'ACCEPT' ? 'Tugas diterima' : 'Tugas ditolak', 'Berhasil')
                    fetchRequests()
                    window.dispatchEvent(new Event('refresh-notifications'))
                } else {
                    showError(res.error || 'Terjadi kesalahan')
                }
            }
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            case 'MANDATE': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
            case 'REJECTED': return 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            default: return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'Disetujui'
            case 'MANDATE': return 'Menunggu Konfirmasi'
            case 'REJECTED': return 'Ditolak'
            default: return 'Menunggu'
        }
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Submission Modal holds its own state and markup */}

            {/* Submission Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAdding(false)} />
                    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 w-full max-w-lg relative animate-in zoom-in-95 duration-200 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Buat Pengajuan Baru
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Tipe Pengajuan</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all"
                                        required
                                    >
                                        <option value="LEAVE">Izin / Sakit</option>
                                        <option value="VACATION">Cuti</option>
                                        <option value="OVERTIME">Lembur</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Tanggal</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Alasan / Keperluan</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    placeholder="Jelaskan keperluan Anda secara singkat..."
                                    className="w-full min-h-[100px] bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Lampiran (Foto/PDF)</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer relative group">
                                    <input
                                        type="file"
                                        onChange={(e) => setFormData({ ...formData, attachment: e.target.files ? e.target.files[0] : null })}
                                        accept="image/*,application/pdf"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-1 text-center">
                                        <File className="mx-auto h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <div className="text-sm text-muted-foreground">
                                            {formData.attachment ? (
                                                <span className="text-primary font-bold">{formData.attachment.name}</span>
                                            ) : (
                                                <span>Klik atau seret file ke sini</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, PDF up to 5MB</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="flex-1 py-2.5 border border-border rounded-lg hover:bg-accent transition-all font-bold text-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        'Kirim Pengajuan'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table View */}
            <TableWrapper loading={isLoading}>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                            <h2 className="font-semibold text-foreground">Riwayat Pengajuan</h2>
                            <p className="text-xs text-muted-foreground">Kelola data izin dan lembur Anda.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Ajukan Baru
                    </button>
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

                <Table>
                    <TableHeader>
                        <TableRow hoverable={false} className="bg-muted/50">
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Pekerjaan / Alasan</TableHead>
                            <TableHead>Pemberi Tugas / Catatan</TableHead>
                            <TableHead align="right">Nominal</TableHead>
                            <TableHead align="center">Lampiran</TableHead>
                            <TableHead align="center">Status</TableHead>
                            <TableHead align="right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableEmpty
                                colSpan={8}
                                message="Belum ada data pengajuan."
                                icon={<Clock className="w-12 h-12 opacity-20" />}
                            />
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">
                                        {req.date ? new Date(req.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
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
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-[10px] font-bold transition-all border border-border"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Lihat
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground italic">No File</span>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <div className={cn(
                                            "inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold",
                                            getStatusColor(req.status)
                                        )}>
                                            {getStatusText(req.status)}
                                        </div>
                                    </TableCell>
                                    <TableCell align="right">
                                        {req.status === 'MANDATE' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleRespond(req.id, 'ACCEPT')}
                                                    className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all border border-emerald-500/20"
                                                    title="Terima Perintah Lembur"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(req.id, 'REJECT')}
                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-rose-500/20"
                                                    title="Tolak Perintah Lembur"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : req.status === 'PENDING' ? (
                                            <button
                                                onClick={() => handleDelete(req.id)}
                                                className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-border"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground italic">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableWrapper>
        </div>
    )
}
