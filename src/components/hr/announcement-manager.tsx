'use client'

import { useState, useEffect } from 'react'
import { Plus, Megaphone, Trash2, CheckCircle2, XCircle, Search, Users, ChevronDown, Check } from 'lucide-react'
import { createAnnouncement, deleteAnnouncement, toggleAnnouncementStatus, getAnnouncements } from '@/app/actions/announcement'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'

interface User {
    id: string
    name: string | null
    username: string
    role: string
}

interface Announcement {
    id: string
    content: string
    isActive: boolean
    speed: number
    createdAt: Date
    targetUsers: { id: string, name: string | null, username: string }[]
    creator: { name: string | null }
}

interface AnnouncementManagerProps {
    allUsers: User[]
}

export function AnnouncementManager({ allUsers }: AnnouncementManagerProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [saving, setSaving] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    // Form Stats
    const [content, setContent] = useState('')
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

    // Search users in modal
    const [userSearch, setUserSearch] = useState('')

    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    useEffect(() => {
        loadAnnouncements(page)
    }, [page])

    async function loadAnnouncements(currentPage: number = 1) {
        setIsLoading(true)
        try {
            const result = await getAnnouncements(currentPage)
            if (result && result.data) {
                setAnnouncements(result.data)
                setTotalPages(result.totalPages)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredUsers = allUsers.filter(u =>
        (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.username.toLowerCase().includes(userSearch.toLowerCase())) &&
        u.role !== 'SYSTEM' // Assuming no need to announce to system accounts if any
    )

    const handleSelectAll = () => {
        if (selectedUserIds.length === filteredUsers.length) {
            setSelectedUserIds([])
        } else {
            setSelectedUserIds(filteredUsers.map(u => u.id))
        }
    }

    const toggleUserSelection = (id: string) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
        )
    }

    const handleSave = async () => {
        if (!content.trim()) {
            showAlert('Isi pengumuman wajib diisi', 'error')
            return
        }
        if (selectedUserIds.length === 0) {
            showAlert('Pilih setidaknya satu user untuk dikirimkan pengumuman', 'error')
            return
        }

        setSaving(true)
        try {
            const result = await createAnnouncement(content, selectedUserIds)
            if (result.success) {
                showAlert('Pengumuman berhasil dibuat', 'success')
                setIsAdding(false)
                setContent('')
                setSelectedUserIds([])
                loadAnnouncements()
            } else {
                showAlert(result.error || 'Gagal membuat pengumuman', 'error')
            }
        } catch (error) {
            console.error(error)
            showAlert('Terjadi kesalahan', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (id: string) => {
        showConfirmation({
            title: 'Hapus Pengumuman',
            message: 'Apakah anda yakin ingin menghapus pengumuman ini?',
            type: 'confirm',
            action: async () => {
                await deleteAnnouncement(id)
                loadAnnouncements()
            }
        })
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        await toggleAnnouncementStatus(id, currentStatus)
        loadAnnouncements()
    }

    return (
        <div className="space-y-6">

            {/* List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Daftar Pengumuman</h2>
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold shadow-sm text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Buat Pengumuman</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted text-foreground uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Isi Pengumuman</th>
                                <th className="px-6 py-4">Target User</th>
                                <th className="px-6 py-4">Dibuat Oleh</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading...</td>
                                </tr>
                            ) : announcements.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Belum ada pengumuman</td>
                                </tr>
                            ) : (
                                announcements.map((ann) => (
                                    <tr key={ann.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-[10px] font-bold uppercase",
                                                ann.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                                            )}>
                                                {ann.isActive ? "Aktif" : "Non-Aktif"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[300px] truncate" title={ann.content}>
                                                {ann.content}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Users className="w-3 h-3" />
                                                <span>{ann.targetUsers.length} Users</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold">{ann.creator.name}</span>
                                            <p className="text-[10px] text-muted-foreground">{new Date(ann.createdAt).toLocaleDateString('id-ID')}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(ann.id, ann.isActive)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-colors border text-xs font-bold",
                                                        ann.isActive
                                                            ? "text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100"
                                                            : "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                                    )}
                                                    title={ann.isActive ? "Non-aktifkan" : "Aktifkan"}
                                                >
                                                    {ann.isActive ? "Matikan" : "Aktifkan"}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ann.id)}
                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-200"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                        Halaman {page} dari {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-xs font-medium border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sebelumnya
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-xs font-medium border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal Create */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20 rounded-t-xl">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-primary" />
                                Buat Pengumuman Baru
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground">
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Content Input */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-2">Isi Pengumuman</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:border-primary outline-none min-h-[100px]"
                                    placeholder="Tuliskan pengumuman di sini..."
                                />
                            </div>

                            {/* User User Selection */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-sm font-bold text-foreground">Target User ({selectedUserIds.length})</label>
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-xs font-medium text-primary hover:underline"
                                    >
                                        {selectedUserIds.length === filteredUsers.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="mb-3 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Cari user..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:border-primary outline-none"
                                    />
                                </div>
                                <div className="border border-border rounded-lg max-h-[250px] overflow-y-auto divide-y divide-border bg-background">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-muted-foreground">Tidak ada user ditemukan</div>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => toggleUserSelection(user.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50",
                                                    selectedUserIds.includes(user.id) ? "bg-primary/5" : ""
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                                    selectedUserIds.includes(user.id) ? "bg-primary border-primary" : "border-muted-foreground"
                                                )}>
                                                    {selectedUserIds.includes(user.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium leading-none">{user.name || user.username}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 uppercase">{user.role}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/20 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold shadow-sm text-sm disabled:opacity-50"
                            >
                                {saving ? "Menyimpan..." : "Simpan Pengumuman"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
