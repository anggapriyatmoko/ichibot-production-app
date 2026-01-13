'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Calendar as CalendarIcon, User, Search, Loader2, Trash, ChevronLeft, ChevronRight, FileText, Image, X } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale' // Indonesian locale
import { upsertLogActivity, getLogActivities, deleteLogActivity, getDailyActivityRecap } from '@/app/actions/log-activity'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'

interface LogActivity {
    id: string
    date: Date | string
    activity: string
    problem: string | null
    image: string | null
    createdAt: Date | string
    updatedAt: Date | string
    userId: string
    user: {
        name: string | null
        username: string | null
        department: string | null
    }
}

interface UserSummary {
    id: string
    name: string | null
    username: string | null
    department: string | null
}

interface Props {
    initialLogs: LogActivity[]
    users: UserSummary[]
    currentUser: any
}

export default function LogActivityManager({ initialLogs, users, currentUser }: Props) {
    const isAdmin = currentUser.role === 'ADMIN'
    const [logs, setLogs] = useState<LogActivity[]>(initialLogs)
    const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id)
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 7

    // Recap State
    const [viewMode, setViewMode] = useState<'history' | 'recap'>('history')
    const [recapDate, setRecapDate] = useState(new Date().toISOString().split('T')[0])
    const [recapData, setRecapData] = useState<any[]>([])

    useEffect(() => {
        if (viewMode === 'recap' && isAdmin) {
            setIsLoading(true)
            getDailyActivityRecap(recapDate)
                .then(data => {
                    setRecapData(data)
                    setIsLoading(false)
                })
                .catch(() => {
                    showError('Gagal memuat data rekap')
                    setIsLoading(false)
                })
        }
    }, [viewMode, recapDate, isAdmin])

    useEffect(() => {
        setCurrentPage(1)
    }, [selectedUserId, logs])

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        activity: '',
        problem: '',
        image: null as string | null,
        imageFile: null as File | null,
        removeImage: false
    })

    // Handle image file selection
    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Client-side validation (2MB limit)
        const MAX_SIZE = 2 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            showError('Ukuran file terlalu besar. Maksimal 2MB.')
            return
        }

        // Preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                image: reader.result as string,
                imageFile: file,
                removeImage: false
            }))
        }
        reader.readAsDataURL(file)
    }

    function handleRemoveImage() {
        setFormData(prev => ({
            ...prev,
            image: null,
            imageFile: null,
            removeImage: true
        }))
    }

    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    async function handleDelete(logId: string) {
        showConfirmation({
            title: 'Hapus Log Aktivitas',
            message: 'Apakah Anda yakin ingin menghapus log ini?',
            type: 'confirm',
            action: async () => {
                setIsLoading(true)
                try {
                    await deleteLogActivity(logId)
                    showAlert('Log berhasil dihapus')
                    const newLogs = await getLogActivities(selectedUserId)
                    setLogs(newLogs)
                } catch (error) {
                    showError(error instanceof Error ? error.message : 'Gagal menghapus log')
                } finally {
                    setIsLoading(false)
                }
            }
        })
    }

    async function handleUserChange(userId: string) {
        setSelectedUserId(userId)
        setIsLoading(true)
        try {
            const newLogs = await getLogActivities(userId)
            setLogs(newLogs)
        } catch (error) {
            showError('Gagal memuat data log')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!formData.activity.trim()) {
            showError('Kegiatan harus diisi')
            return
        }

        setIsLoading(true)
        try {
            const submitData = new FormData()
            submitData.append('date', formData.date)
            submitData.append('activity', formData.activity)
            submitData.append('problem', formData.problem || '')

            if (formData.imageFile) {
                submitData.append('image', formData.imageFile)
            }
            if (formData.removeImage) {
                submitData.append('removeImage', 'true')
            }

            const result = await upsertLogActivity(submitData)

            if (result.error) {
                showError(result.error)
                return
            }

            showAlert('Log aktivitas berhasil disimpan')
            setIsModalOpen(false)

            // Refresh logs
            const newLogs = await getLogActivities(selectedUserId)
            setLogs(newLogs)

            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                activity: '',
                problem: '',
                image: null,
                imageFile: null,
                removeImage: false
            })
        } catch (error) {
            showError('Gagal menyimpan log aktivitas')
        } finally {
            setIsLoading(false)
        }
    }

    function openAddModal() {
        const today = new Date()
        const existingLog = logs.find(log => isSameDay(new Date(log.date), today))

        if (existingLog) {
            showError('Anda sudah membuat log kegiatan hari ini')
            return
        }

        setFormData({
            date: format(today, 'yyyy-MM-dd'),
            activity: '',
            problem: '',
            image: null,
            imageFile: null,
            removeImage: false
        })
        setIsModalOpen(true)
    }

    function openEditModal(log: LogActivity) {
        // Ensure date is YYYY-MM-DD using local time
        const dateStr = format(new Date(log.date), 'yyyy-MM-dd')
        setFormData({
            date: dateStr,
            activity: log.activity,
            problem: log.problem || '',
            image: log.image || null,
            imageFile: null,
            removeImage: false
        })
        setIsModalOpen(true)
    }

    const totalPages = Math.ceil(logs.length / itemsPerPage)
    const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="space-y-6">
            {/* Tabs */}
            {isAdmin && (
                <div className="flex gap-2 border-b border-border pb-4 overflow-x-auto">
                    <button
                        onClick={() => setViewMode('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${viewMode === 'history'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        Riwayat User
                    </button>
                    <button
                        onClick={() => setViewMode('recap')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${viewMode === 'recap'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Rekap Harian
                    </button>
                </div>
            )}

            {viewMode === 'history' ? (
                <>
                    {/* Admin Controls */}
                    {isAdmin && users.length > 0 && (
                        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-5 h-5" />
                                <span className="font-medium">Pilih User:</span>
                            </div>
                            <select
                                value={selectedUserId}
                                onChange={(e) => handleUserChange(e.target.value)}
                                className="flex-1 max-w-sm px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name || user.username} {user.department ? `(${user.department})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-primary" />
                                Riwayat Aktivitas
                            </h2>
                        </div>
                        {selectedUserId === currentUser.id && (
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Kegiatan
                            </button>
                        )}
                    </div>

                    {/* Data Table */}
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                Loading data...
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                Belum ada log aktivitas.
                            </div>
                        ) : (
                            paginatedLogs.map(log => (
                                <div key={log.id} className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-foreground">
                                                {format(new Date(log.date), 'dd MMMM yyyy', { locale: id })}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {format(new Date(log.date), 'EEEE', { locale: id })} • {format(new Date(log.updatedAt), 'HH:mm', { locale: id })} WIB
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {selectedUserId === currentUser.id && (
                                                <button
                                                    onClick={() => openEditModal(log)}
                                                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-3 border-t border-border">
                                        <div>
                                            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Kegiatan</h4>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.activity}</p>
                                        </div>
                                        {log.problem && (
                                            <div>
                                                <h4 className="text-xs font-medium text-red-600/80 uppercase mb-1">Masalah</h4>
                                                <p className="text-sm text-red-600/90 whitespace-pre-wrap leading-relaxed bg-red-50/50 p-2 rounded-lg border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">{log.problem}</p>
                                            </div>
                                        )}
                                        {log.image && (
                                            <div>
                                                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Dokumentasi</h4>
                                                <a
                                                    href={log.image}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block"
                                                >
                                                    <img
                                                        src={log.image}
                                                        alt="Dokumentasi aktivitas"
                                                        className="w-20 h-20 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity cursor-pointer"
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        {/* Mobile Pagination */}
                        {logs.length > itemsPerPage && (
                            <div className="flex items-center justify-between pt-2 pb-6">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg bg-card border border-border hover:bg-muted disabled:opacity-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium text-muted-foreground">Hal {currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg bg-card border border-border hover:bg-muted disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-muted-foreground uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-4 w-[150px]">Tanggal</th>
                                        <th className="px-6 py-4">Kegiatan</th>
                                        <th className="px-6 py-4 w-[25%]">Masalah</th>
                                        <th className="px-6 py-4 w-[80px] text-center">Foto</th>
                                        {(selectedUserId === currentUser.id || isAdmin) && (
                                            <th className="px-6 py-4 w-[100px] text-center text-muted-foreground">Aksi</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                Loading data...
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                Belum ada log aktivitas yang tercatat.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-accent/50 transition-colors">
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    {format(new Date(log.date), 'dd MMMM yyyy', { locale: id })}
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {format(new Date(log.date), 'EEEE', { locale: id })}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                                                        {format(new Date(log.updatedAt), 'HH:mm', { locale: id })} WIB
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-pre-wrap leading-relaxed">
                                                    {log.activity}
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-pre-wrap leading-relaxed text-red-600/90 dark:text-red-400">
                                                    {log.problem || '-'}
                                                </td>
                                                <td className="px-6 py-4 align-top text-center">
                                                    {log.image ? (
                                                        <a
                                                            href={log.image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Klik untuk lihat gambar lengkap"
                                                        >
                                                            <img
                                                                src={log.image}
                                                                alt="Dokumentasi"
                                                                className="w-12 h-12 object-cover rounded-lg border border-border hover:opacity-80 hover:scale-105 transition-all cursor-pointer mx-auto"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {selectedUserId === currentUser.id && (
                                                            <button
                                                                onClick={() => openEditModal(log)}
                                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                                title="Edit Kegiatan"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => handleDelete(log.id)}
                                                                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Hapus Log"
                                                            >
                                                                <Trash className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        {logs.length > itemsPerPage && (
                            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
                                <div className="text-sm text-muted-foreground">
                                    Menampilkan {paginatedLogs.length} dari {logs.length} data
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium">Halaman {currentPage} dari {totalPages}</span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Date Selection */}
                    <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                        <div className="flex items-center gap-4">
                            <label className="text-sm font-medium whitespace-nowrap">Pilih Tanggal:</label>
                            <input
                                type="date"
                                value={recapDate}
                                onChange={(e) => setRecapDate(e.target.value)}
                                className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            />
                        </div>
                    </div>

                    {/* Recap Mobile View */}
                    <div className="md:hidden space-y-4">
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                Memuat data rekap...
                            </div>
                        ) : recapData.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
                                Tidak ada data user.
                            </div>
                        ) : (
                            recapData.map((item: any) => (
                                <div key={item.user.id} className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-semibold text-foreground">{item.user.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.user.username}</div>
                                            <div className="text-xs text-muted-foreground">{item.user.department || '-'}</div>
                                        </div>
                                        {item.log?.image && (
                                            <a
                                                href={item.log.image}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <img
                                                    src={item.log.image}
                                                    alt="Dokumentasi"
                                                    className="w-16 h-16 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                                                />
                                            </a>
                                        )}
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-border">
                                        <div>
                                            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-1">Kegiatan</h4>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.log?.activity || '-'}</p>
                                        </div>
                                        {item.log?.problem && (
                                            <div>
                                                <h4 className="text-xs font-medium text-red-600/80 uppercase mb-1">Masalah</h4>
                                                <p className="text-sm text-red-600/90 whitespace-pre-wrap leading-relaxed bg-red-50/50 p-2 rounded-lg border border-red-100 dark:bg-red-900/10 dark:border-red-900/20">{item.log.problem}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Recap Desktop Table View */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hidden md:block">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted text-muted-foreground uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-4 w-[200px]">User</th>
                                        <th className="px-6 py-4 w-[35%]">Kegiatan</th>
                                        <th className="px-6 py-4">Masalah</th>
                                        <th className="px-6 py-4 w-[80px] text-center">Foto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                                Memuat data rekap...
                                            </td>
                                        </tr>
                                    ) : recapData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                                Tidak ada data user.
                                            </td>
                                        </tr>
                                    ) : (
                                        recapData.map((item: any) => (
                                            <tr key={item.user.id} className="hover:bg-accent/50 transition-colors">
                                                <td className="px-6 py-4 align-top">
                                                    <div className="font-medium text-foreground">{item.user.name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.user.username}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">{item.user.department || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-pre-wrap leading-relaxed">
                                                    {item.log?.activity || '-'}
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-pre-wrap leading-relaxed text-red-600/90 dark:text-red-400">
                                                    {item.log?.problem || '-'}
                                                </td>
                                                <td className="px-6 py-4 align-top text-center">
                                                    {item.log?.image ? (
                                                        <a
                                                            href={item.log.image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Klik untuk lihat gambar lengkap"
                                                        >
                                                            <img
                                                                src={item.log.image}
                                                                alt="Dokumentasi"
                                                                className="w-12 h-12 object-cover rounded-lg border border-border hover:opacity-80 hover:scale-105 transition-all cursor-pointer mx-auto"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[90vh] flex flex-col">
                        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-border shrink-0">
                                <h3 className="text-lg font-semibold">Input Log Activity</h3>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tanggal</label>
                                    <div className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm font-medium">
                                        {format(new Date(formData.date), 'dd MMMM yyyy', { locale: id })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Kegiatan</label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={formData.activity}
                                        onChange={e => setFormData({ ...formData, activity: e.target.value })}
                                        placeholder="Jelaskan kegiatan hari ini..."
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Problem / Kendala (Opsional)</label>
                                    <textarea
                                        rows={3}
                                        value={formData.problem}
                                        onChange={e => setFormData({ ...formData, problem: e.target.value })}
                                        placeholder="Ada kendala apa hari ini?"
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                                    />
                                </div>
                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Gambar (Opsional, Maks. 2MB)</label>
                                    <div className="flex items-start gap-4">
                                        {formData.image ? (
                                            <div className="relative">
                                                <img
                                                    src={formData.image}
                                                    alt="Preview"
                                                    className="w-32 h-32 object-cover rounded-lg border border-border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                                                <Image className="w-8 h-8 text-muted-foreground mb-2" />
                                                <span className="text-sm text-muted-foreground text-center">
                                                    Klik untuk pilih gambar
                                                </span>
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    JPG, PNG, WEBP, GIF (Maks. 2MB)
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                                    onChange={handleImageChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? 'Menyimpan...' : 'Simpan Activity'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
