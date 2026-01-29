'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, FolderKanban, Search, Calendar, Save, Link as LinkIcon, ExternalLink, X, User as UserIcon, Check } from 'lucide-react'
import { createProject, updateProject, deleteProject } from '@/app/actions/project'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'

interface ProjectLink {
    id?: string
    label: string
    url: string
}

interface AssignedUser {
    id: string
    name: string | null
    role: string
}

interface Project {
    id: string
    name: string
    client: string | null
    date: string | null
    description: string | null
    status: string
    categoryId: string | null
    category: { name: string } | null
    links: ProjectLink[]
    assignedUsers: AssignedUser[]
}

interface User {
    id: string
    name: string | null
    username: string
    email: string
    role: string
}

interface ProjectManagerProps {
    initialProjects: Project[]
    categories: { id: string, name: string }[]
    allUsers: User[]
    userRole?: string
}

export default function ProjectManager({ initialProjects, categories, allUsers, userRole }: ProjectManagerProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        client: '',
        date: '',
        description: '',
        status: 'PENDING',
        categoryId: '',
    })

    const [links, setLinks] = useState<ProjectLink[]>([])
    const [newLinkLabel, setNewLinkLabel] = useState('')
    const [newLinkUrl, setNewLinkUrl] = useState('')
    const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null)

    // Assigned Users state
    const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])

    // Mobile Action Modal State
    const [mobileActionItem, setMobileActionItem] = useState<Project | null>(null)



    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()
    const isAdmin = userRole === 'ADMIN'

    const resetForm = () => {
        setFormData({
            name: '',
            client: '',
            date: '',
            description: '',
            status: 'PENDING',
            categoryId: '',
        })
        setLinks([])
        setNewLinkLabel('')
        setNewLinkUrl('')
        setEditingLinkIndex(null)
        setAssignedUserIds([])
    }

    const addLink = () => {
        if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
            showAlert('Nama lampiran dan URL wajib diisi', 'error')
            return
        }

        if (editingLinkIndex !== null) {
            const updatedLinks = [...links]
            updatedLinks[editingLinkIndex] = { label: newLinkLabel.trim(), url: newLinkUrl.trim() }
            setLinks(updatedLinks)
            setEditingLinkIndex(null)
        } else {
            setLinks([...links, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }])
        }

        setNewLinkLabel('')
        setNewLinkUrl('')
    }

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index))
        if (editingLinkIndex === index) {
            setEditingLinkIndex(null)
            setNewLinkLabel('')
            setNewLinkUrl('')
        }
    }

    const startEditLink = (index: number) => {
        const link = links[index]
        setNewLinkLabel(link.label)
        setNewLinkUrl(link.url)
        setEditingLinkIndex(index)
    }

    const toggleUserAssignment = (userId: string) => {
        setAssignedUserIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    const handleSave = async () => {
        setSaving(true)
        const fd = new FormData()
        Object.entries(formData).forEach(([key, value]) => fd.append(key, value))
        fd.append('links', JSON.stringify(links))
        fd.append('assignedUserIds', JSON.stringify(assignedUserIds))

        if (!isAdding && editingProject) {
            fd.append('id', editingProject.id)
        }

        try {
            const action = isAdding ? createProject(fd) : updateProject(fd)
            const result = await action

            if (result.success) {
                showAlert(`Project berhasil ${isAdding ? 'ditambahkan' : 'diperbarui'}`, 'success')
                setIsAdding(false)
                setEditingProject(null)
                resetForm()
                // Refresh data via path revalidation handled in action, but for UI:
                window.location.reload()
            } else {
                showAlert(result.error || 'Terjadi kesalahan', 'error')
            }
        } catch (error) {
            showAlert('Terjadi kesalahan sistem', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (id: string, name: string) => {
        showConfirmation({
            title: 'Hapus Project',
            message: `Apakah Anda yakin ingin menghapus project "${name}"?`,
            type: 'confirm',
            action: async () => {
                const result = await deleteProject(id)
                if (result.success) {
                    showAlert('Project berhasil dihapus', 'success')
                    window.location.reload()
                } else {
                    showAlert(result.error || 'Gagal menghapus', 'error')
                }
            }
        })
    }

    const startEdit = (project: Project) => {
        setEditingProject(project)
        setFormData({
            name: project.name,
            client: project.client || '',
            date: project.date ? new Date(project.date).toISOString().split('T')[0] : '',
            description: project.description || '',
            status: project.status,
            categoryId: project.categoryId || '',
        })
        setLinks(project.links.map(l => ({ label: l.label, url: l.url })))
        setAssignedUserIds(project.assignedUsers.map(u => u.id))
        setIsAdding(false)
    }

    const filteredProjects = initialProjects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.client && p.client.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex justify-between items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari project atau client..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary transition-all shadow-sm"
                    />
                </div>
                {isAdmin && (
                    <button
                        onClick={() => { setIsAdding(true); setEditingProject(null); resetForm(); }}
                        className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline text-sm">Tambah</span>
                    </button>
                )}
            </div>

            {/* Modal Form */}
            {(isAdding || editingProject) && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 overflow-y-auto p-2 sm:p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsAdding(false); setEditingProject(null); }} />
                    <div className="bg-card border border-border rounded-xl w-full max-w-3xl relative animate-in zoom-in-95 duration-200 shadow-2xl max-h-[95vh] flex flex-col">
                        <div className="p-6 border-b border-border shrink-0">
                            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                <FolderKanban className="w-5 h-5 text-primary" />
                                {isAdding ? 'Tambah Project Baru' : 'Edit Project'}
                            </h3>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Nama Project *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                                            placeholder="Nama project"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Client</label>
                                            <input
                                                type="text"
                                                value={formData.client}
                                                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                                                placeholder="Nama client"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Tanggal</label>
                                            <input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Kategori</label>
                                            <select
                                                value={formData.categoryId}
                                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                                            >
                                                <option value="">Tanpa Kategori</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary font-bold"
                                            >
                                                <option value="PENDING">PENDING</option>
                                                <option value="ON_PROGRESS">ON PROGRESS</option>
                                                <option value="DONE">DONE</option>
                                                <option value="CANCEL">CANCEL</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Deskripsi</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                                            rows={3}
                                            placeholder="Keterangan project"
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Visibility & Links */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                            <UserIcon className="w-3 h-3" />
                                            Tampilkan ke User
                                        </label>
                                        <div className="border border-border rounded-lg p-3 bg-muted/20 max-h-[160px] overflow-y-auto space-y-1">
                                            {allUsers.map(user => (
                                                <label
                                                    key={user.id}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer text-xs",
                                                        assignedUserIds.includes(user.id) ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-accent border border-transparent"
                                                    )}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={assignedUserIds.includes(user.id)}
                                                        onChange={() => toggleUserAssignment(user.id)}
                                                    />
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                        assignedUserIds.includes(user.id) ? "bg-primary border-primary" : "bg-background border-border"
                                                    )}>
                                                        {assignedUserIds.includes(user.id) && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold">{user.name || user.username}</p>
                                                        <p className="text-[10px] opacity-70 uppercase tracking-tighter">{user.role}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">* Jika tidak dipilih, project hanya bisa dilihat oleh Admin/HRD.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Lampiran / Link</label>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newLinkLabel}
                                                    onChange={(e) => setNewLinkLabel(e.target.value)}
                                                    placeholder="Label"
                                                    className="flex-1 min-w-[100px] bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary"
                                                />
                                                <input
                                                    type="url"
                                                    value={newLinkUrl}
                                                    onChange={(e) => setNewLinkUrl(e.target.value)}
                                                    placeholder="URL"
                                                    className="flex-[2] min-w-[150px] bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-primary"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={addLink}
                                                        className={cn(
                                                            "p-1.5 rounded-lg transition-all",
                                                            editingLinkIndex !== null ? "bg-amber-500 text-white" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                                        )}
                                                        title={editingLinkIndex !== null ? "Update Lampiran" : "Tambah Lampiran"}
                                                    >
                                                        {editingLinkIndex !== null ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                    </button>
                                                    {editingLinkIndex !== null && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingLinkIndex(null)
                                                                setNewLinkLabel('')
                                                                setNewLinkUrl('')
                                                            }}
                                                            className="p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                                                            title="Batal Edit"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                {links.map((link, idx) => (
                                                    <div key={idx} className={cn(
                                                        "flex items-center justify-between p-1.5 rounded-md border text-[11px]",
                                                        editingLinkIndex === idx ? "bg-amber-500/10 border-amber-500/50" : "bg-background border-border"
                                                    )}>
                                                        <span className="truncate flex-1 font-medium">{link.label}: <span className="text-muted-foreground font-normal italic">{link.url}</span></span>
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <button type="button" onClick={() => startEditLink(idx)} className="text-blue-500 p-0.5 hover:bg-blue-500/10 rounded">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                            <button type="button" onClick={() => removeLink(idx)} className="text-rose-500 p-0.5 hover:bg-rose-500/10 rounded">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                        <div className="p-6 border-t border-border shrink-0 bg-card rounded-b-xl">
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setIsAdding(false); setEditingProject(null); }}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isAdding ? 'Simpan' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile View - Card based Layout */}
            <div className="md:hidden space-y-4">
                {filteredProjects.map(project => (
                    <div key={project.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative">
                        {/* Mobile Action Button - Absolute Top Right */}
                        {isAdmin && (
                            <button
                                onClick={() => setMobileActionItem(project)}
                                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors z-10"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}

                        <div className="flex justify-between items-start mb-3 pr-10">
                            <div>
                                <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
                                    {project.category?.name || 'Umum'}
                                </span>
                                <h4 className="font-bold text-lg text-foreground mt-0.5">{project.name}</h4>
                                <div className={cn(
                                    "w-fit px-2 py-0.5 rounded text-[10px] font-bold mt-1",
                                    project.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-600' :
                                        project.status === 'ON_PROGRESS' ? 'bg-blue-500/10 text-blue-600' :
                                            project.status === 'CANCEL' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                                )}>
                                    {project.status.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-medium text-muted-foreground block">
                                    {project.date ? new Date(project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Client</p>
                                <p className="text-sm font-medium">{project.client || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Deskripsi</p>
                                <p className="text-sm text-foreground/80 line-clamp-3 overflow-hidden">{project.description || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold mb-1">Lampiran</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {project.links && project.links.length > 0 ? (
                                        project.links.map((link, idx) => (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-secondary text-secondary-foreground rounded border border-border text-[10px] font-bold"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {link.label}
                                            </a>
                                        ))
                                    ) : (
                                        <span className="text-xs italic text-muted-foreground">Tidak ada</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Mobile Actions Modal */}
                {mobileActionItem && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setMobileActionItem(null)}
                    >
                        <div
                            className="bg-card border border-border rounded-xl p-5 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-foreground text-lg truncate max-w-[200px]">{mobileActionItem.name}</h3>
                                    <p className="text-xs text-muted-foreground">Pilih aksi</p>
                                </div>
                                <button
                                    onClick={() => setMobileActionItem(null)}
                                    className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        startEdit(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="w-full flex items-center justify-center gap-2 p-3 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors border border-blue-500/20 text-sm font-medium"
                                >
                                    <Pencil className="w-5 h-5" />
                                    Edit Project
                                </button>
                                <button
                                    onClick={() => {
                                        handleDelete(mobileActionItem.id, mobileActionItem.name)
                                        setMobileActionItem(null)
                                    }}
                                    className="w-full flex items-center justify-center gap-2 p-3 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors border border-rose-500/20 text-sm font-medium"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Hapus Project
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table Display - Standardized styling (Hidden on Mobile) */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-muted text-foreground uppercase text-[10px] font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Nama Project</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Deskripsi</th>
                                <th className="px-6 py-4">Lampiran</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProjects.map(project => (
                                <tr key={project.id} className="hover:bg-accent/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">
                                                {project.date ? new Date(project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                            </span>
                                            <span className="text-[10px] uppercase text-muted-foreground">
                                                {project.category?.name || 'Umum'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-foreground">{project.name}</span>
                                            <div className={cn(
                                                "w-fit px-2 py-0.5 rounded text-[10px] font-bold mt-1",
                                                project.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-600' :
                                                    project.status === 'ON_PROGRESS' ? 'bg-blue-500/10 text-blue-600' :
                                                        project.status === 'CANCEL' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                                            )}>
                                                {project.status.replace('_', ' ')}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-muted-foreground font-medium">{project.client || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="max-w-[200px] whitespace-normal text-xs text-muted-foreground">
                                            {project.description || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                            {project.links && project.links.length > 0 ? (
                                                project.links.map((link, idx) => (
                                                    <a
                                                        key={idx}
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-secondary text-secondary-foreground rounded border border-border hover:bg-secondary/80 text-[10px] font-bold transition-all shadow-sm"
                                                        title={link.url}
                                                    >
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                        {link.label}
                                                    </a>
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground italic text-[10px]">Tidak ada</span>
                                            )}
                                        </div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => startEdit(project)}
                                                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(project.id, project.name)}
                                                    className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors border border-border"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredProjects.length === 0 && (
                    <div className="text-center py-20 bg-muted/30">
                        <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">
                            {searchTerm ? 'Tidak ada project yang cocok dengan pencarian' : 'Belum ada project yang terdaftar'}
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination placeholder to match styling if needed */}
            <div className="hidden md:flex px-6 py-4 border border-t-0 border-border rounded-b-xl items-center justify-between bg-card text-xs text-muted-foreground">
                <p>Menampilkan <span className="font-bold text-foreground">{filteredProjects.length}</span> project</p>
                <div className="flex gap-2">
                    {/* Add pagination later if project count grows large */}
                </div>
            </div>
        </div >
    )
}
