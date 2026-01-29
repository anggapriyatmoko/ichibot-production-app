'use client'

import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, X, Loader2, FileText, Link as LinkIcon, Download, ExternalLink, Calendar as CalendarIcon } from 'lucide-react'
import { createDoc, updateDoc, deleteDoc } from '@/app/actions/administrasi'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'
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

type DocData = {
    id: string
    date: Date
    number: string
    name: string
    institution: string
    content: string
    link: string | null
    filePath: string | null
    createdAt: Date
}

interface GenericDocManagerProps {
    type: 'surat-penawaran' | 'kwitansi' | 'surat-balasan' | 'mou'
    title: string
    initialData: DocData[]
    labels?: {
        name?: string
        institution?: string
        content?: string
        number?: string
    }
}

export default function GenericDocManager({ type, title, initialData, labels = {} }: GenericDocManagerProps) {
    const router = useRouter()
    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingData, setEditingData] = useState<DocData | null>(null)
    const [saving, setSaving] = useState(false)

    // User friendly labels
    const fieldLabels = {
        name: labels.name || 'Nama',
        institution: labels.institution || 'Instansi',
        content: labels.content || 'Isi / Perihal',
        number: labels.number || 'Nomor',
        ...labels
    }

    // Form state
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        number: '',
        name: '',
        institution: '',
        content: '',
        link: '',
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [removeFile, setRemoveFile] = useState(false)

    const filteredData = initialData
        .filter(item =>
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.number.toLowerCase().includes(search.toLowerCase()) ||
            item.institution.toLowerCase().includes(search.toLowerCase()) ||
            item.content.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const openAddModal = () => {
        setEditingData(null)
        setFormData({
            date: new Date().toISOString().split('T')[0],
            number: '',
            name: '',
            institution: '',
            content: '',
            link: '',
        })
        setSelectedFile(null)
        setRemoveFile(false)
        setIsModalOpen(true)
    }

    const openEditModal = (item: DocData) => {
        setEditingData(item)
        setFormData({
            date: new Date(item.date).toISOString().split('T')[0],
            number: item.number,
            name: item.name,
            institution: item.institution,
            content: item.content,
            link: item.link || '',
        })
        setSelectedFile(null)
        setRemoveFile(false)
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('date', formData.date)
            fd.append('number', formData.number)
            fd.append('name', formData.name)
            fd.append('institution', formData.institution)
            fd.append('content', formData.content)
            fd.append('link', formData.link)
            if (selectedFile) fd.append('file', selectedFile)
            if (removeFile) fd.append('removeFile', 'true')

            if (editingData) {
                await updateDoc(type, editingData.id, fd)
                showAlert('Data berhasil diperbarui', 'success')
            } else {
                await createDoc(type, fd)
                showAlert('Data berhasil ditambahkan', 'success')
            }
            setIsModalOpen(false)
            router.refresh()
        } catch (error: any) {
            showAlert(error.message || 'Gagal menyimpan data', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = (id: string) => {
        showConfirmation({
            title: 'Hapus Data',
            message: 'Apakah Anda yakin ingin menghapus data ini?',
            type: 'confirm',
            action: async () => {
                try {
                    await deleteDoc(type, id)
                    showAlert('Data berhasil dihapus', 'success')
                    router.refresh()
                } catch (error: any) {
                    showAlert(error.message || 'Gagal menghapus data', 'error')
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Controls */}
            <div className="flex flex-row gap-4 justify-between items-center">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari data..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={openAddModal}
                    className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden md:inline">Tambah {title}</span>
                </button>
            </div>

            {/* Desktop Table View */}
            <TableWrapper className="hidden md:block">
                <TableScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>{fieldLabels.number}</TableHead>
                                <TableHead>{fieldLabels.name}</TableHead>
                                <TableHead>{fieldLabels.institution}</TableHead>
                                <TableHead>{fieldLabels.content}</TableHead>
                                <TableHead>Lampiran</TableHead>
                                <TableHead align="right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="font-medium text-foreground">
                                            {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{item.number}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.institution}</TableCell>
                                    <TableCell className="max-w-xs">
                                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.content}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {item.link && (
                                                <a
                                                    href={item.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors"
                                                    title="Link"
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                </a>
                                            )}
                                            {item.filePath && (
                                                <a
                                                    href={item.filePath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/20 transition-colors"
                                                    title="Download File"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            )}
                                            {!item.link && !item.filePath && <span className="text-muted-foreground text-xs">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell align="right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(item)}
                                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredData.length === 0 && (
                                <TableEmpty colSpan={7} icon={<FileText className="w-12 h-12 opacity-20" />} />
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>
            </TableWrapper>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {filteredData.map((item) => (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p className="font-bold text-foreground truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.institution}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => openEditModal(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="py-2 border-y border-border/50 border-dashed space-y-2">
                            <div className="text-xs font-mono bg-muted/50 p-2 rounded truncate">{item.number}</div>
                            <p className="text-xs text-muted-foreground line-clamp-3">{item.content}</p>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                                {item.link && (
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                                        <ExternalLink className="w-3 h-3" /> Link
                                    </a>
                                )}
                                {item.filePath && (
                                    <a href={item.filePath} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                        <Download className="w-3 h-3" /> File
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Form Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-lg flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
                            <h2 className="text-lg font-bold">{editingData ? `Edit ${title}` : `Tambah ${title}`}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-accent rounded-full text-muted-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-4 overflow-y-auto flex-1 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Tanggal</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                required
                                                className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{fieldLabels.number}</label>
                                        <input
                                            type="text"
                                            value={formData.number}
                                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                            required
                                            placeholder={`Nomor ${title}`}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{fieldLabels.name}</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            placeholder="Nama PIC/Kontak"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{fieldLabels.institution}</label>
                                        <input
                                            type="text"
                                            value={formData.institution}
                                            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                            required
                                            placeholder="Nama Perusahaan/Instansi"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">{fieldLabels.content}</label>
                                        <textarea
                                            value={formData.content}
                                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                            required
                                            rows={3}
                                            placeholder={`Ringkasan ${fieldLabels.content.toLowerCase()}...`}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors resize-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Link (Opsional)</label>
                                        <input
                                            type="url"
                                            value={formData.link}
                                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            File Dokumen (Opsional)
                                            <span className="text-[10px] ml-2 text-primary font-normal">(Maks 2MB: PDF, DOC, DOCX)</span>
                                        </label>
                                        {editingData?.filePath && !removeFile ? (
                                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border border-dashed">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-primary" />
                                                    <span className="text-sm truncate max-w-[200px]">{editingData.filePath.split('/').pop()}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setRemoveFile(true)}
                                                    className="text-xs text-red-600 font-bold hover:underline"
                                                >
                                                    Hapus & Ganti
                                                </button>
                                            </div>
                                        ) : (
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0] || null
                                                    if (file) {
                                                        // Validate size (2MB)
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            showAlert('Ukuran file maksimal adalah 2MB', 'error')
                                                            e.target.value = ''
                                                            setSelectedFile(null)
                                                            return
                                                        }
                                                        // Validate type
                                                        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                                                        const allowedExt = ['.pdf', '.doc', '.docx']
                                                        const fileName = file.name.toLowerCase()
                                                        const isValidExt = allowedExt.some(ext => fileName.endsWith(ext))

                                                        if (!allowedTypes.includes(file.type) && !isValidExt) {
                                                            showAlert('Hanya format PDF, DOC, atau DOCX yang diperbolehkan', 'error')
                                                            e.target.value = ''
                                                            setSelectedFile(null)
                                                            return
                                                        }
                                                    }
                                                    setSelectedFile(file)
                                                }}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-border shrink-0 bg-muted/20 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingData ? 'Simpan Perubahan' : 'Tambah Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
