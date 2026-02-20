'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Calendar as CalendarIcon, User, Search, Loader2, Trash, ChevronLeft, ChevronRight, FileText, Image, X, Camera, MoreHorizontal } from 'lucide-react'
import { processImageFile } from '@/utils/image-compression'
import { format, isSameDay } from 'date-fns'
import { id } from 'date-fns/locale' // Indonesian locale
import { upsertLogActivity, getLogActivities, deleteLogActivity, getDailyActivityRecap } from '@/app/actions/log-activity'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import Modal from '@/components/ui/modal'
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
    TablePagination,
    TableHeaderContent
} from '@/components/ui/table'

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
    const isAdmin = ['ADMIN', 'HRD'].includes(currentUser.role)
    const [logs, setLogs] = useState<LogActivity[]>(initialLogs)
    const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id)
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // Recap State
    const [viewMode, setViewMode] = useState<'history' | 'recap'>('history')
    const [recapDate, setRecapDate] = useState(new Date().toISOString().split('T')[0])
    const [recapData, setRecapData] = useState<any[]>([])

    // Pagination for history
    const totalPagesHistory = Math.ceil(logs.length / pageSize)
    const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    // Pagination for recap
    const [recapPage, setRecapPage] = useState(1)
    const [recapPageSize, setRecapPageSize] = useState(10)
    const totalPagesRecap = Math.ceil(recapData.length / recapPageSize)
    const paginatedRecap = recapData.slice((recapPage - 1) * recapPageSize, recapPage * recapPageSize)

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

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isModalOpen])

    // Handle image file selection
    async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        const processedFile = await processImageFile(file, showError)
        if (!processedFile) return

        // Preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setFormData(prev => ({
                ...prev,
                image: reader.result as string,
                imageFile: processedFile,
                removeImage: false
            }))
        }
        reader.readAsDataURL(processedFile)
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
                    {/* Data Table */}
                    {/* Mobile View */}
                    <TableWrapper loading={isLoading} className="md:hidden">
                        <TableHeaderContent
                            title="Riwayat Aktivitas"
                            description="Daftar kegiatan harian yang telah dicatat."
                            icon={<CalendarIcon className="w-5 h-5" />}
                            actions={
                                <div className="flex items-center gap-2">
                                    {isAdmin && users.length > 0 && (
                                        <select
                                            value={selectedUserId}
                                            onChange={(e) => handleUserChange(e.target.value)}
                                            className="px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-xs font-medium max-w-[150px] truncate"
                                        >
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name || user.username}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {selectedUserId === currentUser.id && (
                                        <button
                                            onClick={openAddModal}
                                            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 whitespace-nowrap text-xs"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="hidden sm:inline">Tambah Kegiatan</span>
                                            <span className="sm:hidden">Tambah</span>
                                        </button>
                                    )}
                                </div>
                            }
                        />
                        <div className="p-4 space-y-4">
                            {isLoading ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading data...
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
                                    Belum ada log aktivitas.
                                </div>
                            ) : (
                                paginatedLogs.map(log => (
                                    <div key={log.id} className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {format(new Date(log.date), 'dd MMMM yyyy', { locale: id })}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {format(new Date(log.date), 'EEEE', { locale: id })} - {format(new Date(log.updatedAt), 'HH:mm', { locale: id })}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {(isAdmin || (selectedUserId === currentUser.id && isSameDay(new Date(log.date), new Date()))) && (
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
                        </div>
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPagesHistory}
                            onPageChange={setCurrentPage}
                            itemsPerPage={pageSize}
                            onItemsPerPageChange={setPageSize}
                            totalCount={logs.length}
                        />
                    </TableWrapper>

                    {/* Desktop Table View */}
                    <TableWrapper loading={isLoading} className="hidden md:flex">
                        <TableHeaderContent
                            title="Riwayat Aktivitas"
                            description="Daftar kegiatan harian yang telah dicatat."
                            icon={<CalendarIcon className="w-5 h-5" />}
                            actions={
                                <div className="flex items-center gap-3">
                                    {isAdmin && users.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">User:</span>
                                            <select
                                                value={selectedUserId}
                                                onChange={(e) => handleUserChange(e.target.value)}
                                                className="min-w-[200px] px-3 py-2 bg-background border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                                            >
                                                {users.map(user => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.name || user.username} {user.department ? `(${user.department})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {selectedUserId === currentUser.id && (
                                        <button
                                            onClick={openAddModal}
                                            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Tambah Kegiatan</span>
                                        </button>
                                    )}
                                </div>
                            }
                        />
                        <TableScrollArea>
                            <Table>
                                <TableHeader>
                                    <TableRow hoverable={false}>
                                        <TableHead className="w-[150px]">Tanggal</TableHead>
                                        <TableHead>Kegiatan</TableHead>
                                        <TableHead className="w-[20%]">Masalah</TableHead>
                                        <TableHead align="center" className="w-[100px]">Foto</TableHead>
                                        {(selectedUserId === currentUser.id || isAdmin) && (
                                            <TableHead align="center" className="w-[120px]">Aksi</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 && !isLoading ? (
                                        <TableEmpty
                                            colSpan={6}
                                            message="Belum ada log aktivitas yang tercatat."
                                            icon={<CalendarIcon className="w-12 h-12 opacity-20" />}
                                        />
                                    ) : (
                                        paginatedLogs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell className="align-top">
                                                    <div className="font-bold text-primary">{format(new Date(log.date), 'dd MMM yyyy', { locale: id })}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
                                                        {format(new Date(log.date), 'EEEE', { locale: id })} • {format(new Date(log.updatedAt), 'HH:mm', { locale: id })}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <p className="whitespace-pre-wrap leading-relaxed max-w-md">{log.activity}</p>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    {log.problem ? (
                                                        <p className="text-red-600 dark:text-red-400 whitespace-pre-wrap leading-relaxed text-xs italic">
                                                            {log.problem}
                                                        </p>
                                                    ) : (
                                                        <span className="text-muted-foreground opacity-30">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center" className="align-top">
                                                    {log.image ? (
                                                        <a
                                                            href={log.image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group/img relative inline-block"
                                                        >
                                                            <img
                                                                src={log.image}
                                                                alt="Dokumentasi"
                                                                className="w-11 h-11 object-cover rounded-lg border border-border shadow-sm group-hover/img:scale-105 transition-all duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                                                <Search className="w-3 h-3 text-white" />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground opacity-30">—</span>
                                                    )}
                                                </TableCell>
                                                {(selectedUserId === currentUser.id || isAdmin) && (
                                                    <TableCell align="center" className="align-top">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {(isAdmin || (selectedUserId === currentUser.id && isSameDay(new Date(log.date), new Date()))) && (
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
                                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                                    title="Hapus Log"
                                                                >
                                                                    <Trash className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableScrollArea>
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPagesHistory}
                            onPageChange={setCurrentPage}
                            itemsPerPage={pageSize}
                            onItemsPerPageChange={setPageSize}
                            totalCount={logs.length}
                        />
                    </TableWrapper>
                </>
            ) : (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Recap Mobile View */}
                    <TableWrapper loading={isLoading} className="md:hidden">
                        <TableHeaderContent
                            title="Rekap Harian"
                            description={`Aktivitas seluruh user pada tanggal ${format(new Date(recapDate), 'dd MMMM yyyy', { locale: id })}.`}
                            icon={<FileText className="w-5 h-5" />}
                            actions={
                                <input
                                    type="date"
                                    value={recapDate}
                                    onChange={(e) => setRecapDate(e.target.value)}
                                    className="px-2 py-1.5 border border-border rounded-lg bg-background text-[10px] font-medium focus:ring-2 focus:ring-primary/50 outline-none max-w-[120px]"
                                />
                            }
                        />
                        <div className="p-4 space-y-4">
                            {isLoading ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Memuat data rekap...
                                </div>
                            ) : recapData.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
                                    Tidak ada data user.
                                </div>
                            ) : (
                                paginatedRecap.map((item: any) => (
                                    <div key={item.user.id} className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium text-foreground">{item.user.name}</div>
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
                        <TablePagination
                            currentPage={recapPage}
                            totalPages={totalPagesRecap}
                            onPageChange={setRecapPage}
                            itemsPerPage={recapPageSize}
                            onItemsPerPageChange={setRecapPageSize}
                            totalCount={recapData.length}
                        />
                    </TableWrapper>

                    {/* Recap Desktop Table View */}
                    <TableWrapper loading={isLoading} className="hidden md:flex">
                        <TableHeaderContent
                            title="Rekap Harian"
                            description={`Aktivitas seluruh user pada tanggal ${format(new Date(recapDate), 'dd MMMM yyyy', { locale: id })}.`}
                            icon={<FileText className="w-5 h-5" />}
                            actions={
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Pilih Tanggal:</span>
                                    <input
                                        type="date"
                                        value={recapDate}
                                        onChange={(e) => setRecapDate(e.target.value)}
                                        className="px-3 py-2 border border-border rounded-lg bg-background text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </div>
                            }
                        />
                        <TableScrollArea>
                            <Table>
                                <TableHeader>
                                    <TableRow hoverable={false}>
                                        <TableHead className="w-[200px]">User</TableHead>
                                        <TableHead>Kegiatan</TableHead>
                                        <TableHead className="w-[25%]">Masalah</TableHead>
                                        <TableHead align="center" className="w-[100px]">Foto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recapData.length === 0 && !isLoading ? (
                                        <TableEmpty
                                            colSpan={4}
                                            message="Tidak ada data user ditemukan."
                                            icon={<User className="w-12 h-12 opacity-20" />}
                                        />
                                    ) : (
                                        paginatedRecap.map((item: any) => (
                                            <TableRow key={item.user.id}>
                                                <TableCell className="align-top">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                                            {(item.user.name || item.user.username || 'U').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-foreground leading-tight">{item.user.name || item.user.username}</div>
                                                            <div className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                                                                {item.user.department || 'Tanpa Divisi'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <p className="whitespace-pre-wrap leading-relaxed">{item.log?.activity || <span className="text-muted-foreground italic opacity-50">Belum mengerjakan</span>}</p>
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    {item.log?.problem ? (
                                                        <p className="text-red-600 dark:text-red-400 whitespace-pre-wrap leading-relaxed text-xs italic">
                                                            {item.log.problem}
                                                        </p>
                                                    ) : (
                                                        <span className="text-muted-foreground opacity-30">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center" className="align-top">
                                                    {item.log?.image ? (
                                                        <a
                                                            href={item.log.image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="group/img relative inline-block"
                                                        >
                                                            <img
                                                                src={item.log.image}
                                                                alt="Dokumentasi"
                                                                className="w-11 h-11 object-cover rounded-lg border border-border shadow-sm group-hover/img:scale-105 transition-all duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                                                                <Search className="w-3 h-3 text-white" />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground opacity-30">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableScrollArea>
                        <TablePagination
                            currentPage={recapPage}
                            totalPages={totalPagesRecap}
                            onPageChange={setRecapPage}
                            itemsPerPage={recapPageSize}
                            onItemsPerPageChange={setRecapPageSize}
                            totalCount={recapData.length}
                        />
                    </TableWrapper>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="Input Log Activity"
                    maxWidth="2xl"
                >
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" autoComplete="off">
                        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
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
                                    autoComplete="off"
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
                                    autoComplete="off"
                                />
                            </div>
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Gambar (Opsional, Maks. 1MB)</label>
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
                                        <div className="flex-1 border-2 border-dashed border-border rounded-lg p-4">
                                            <div className="text-center mb-3">
                                                <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                                <span className="text-sm text-muted-foreground block">
                                                    Upload gambar atau ambil foto
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    JPG, PNG, WEBP, GIF (Maks. 1MB)
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <label className="flex-1 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        capture="environment"
                                                        onChange={handleImageChange}
                                                        className="hidden"
                                                    />
                                                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                        <Camera className="w-4 h-4" />
                                                        Ambil Foto
                                                    </div>
                                                </label>
                                                <label className="flex-1 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                                        onChange={handleImageChange}
                                                        className="hidden"
                                                    />
                                                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                        <Image className="w-4 h-4" />
                                                        Pilih File
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0 rounded-b-2xl">
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
                </Modal>
            )}
        </div>
    )
}
