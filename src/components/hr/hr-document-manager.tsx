'use client'

import { useState, useTransition, useEffect } from 'react'
import { FileText, Plus, Trash2, Edit, ExternalLink, Download, File, Loader2, AlertCircle, Users, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { upsertHRDocument, deleteHRDocument } from '@/app/actions/hr-document'
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
} from '@/components/ui/table'
import Modal from '@/components/ui/modal'

interface HRDocument {
    id: string
    name: string
    description: string | null
    link: string | null
    filePath: string | null
    isForAll: boolean
    targetUsers: { id: string, name: string | null, username: string }[]
    createdAt: Date
    updatedAt: Date
}

interface User {
    id: string
    name: string | null
    username: string
    role: string
}

interface Props {
    documents: HRDocument[]
    allUsers?: User[]
    readOnly?: boolean
}

export default function HRDocumentManager({ documents, allUsers = [], readOnly = false }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState<HRDocument | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        link: '',
        isForAll: true
    })
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [userSearch, setUserSearch] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [error, setError] = useState('')

    const [removeFile, setRemoveFile] = useState(false)

    // Reset removeFile when opening modal
    const handleOpenModal = (doc?: HRDocument) => {
        if (readOnly) return
        if (doc) {
            setEditingDoc(doc)
            setFormData({
                name: doc.name,
                description: doc.description || '',
                link: doc.link || '',
                isForAll: doc.isForAll
            })
            setSelectedUserIds(doc.targetUsers.map(u => u.id))
            setRemoveFile(false)
        } else {
            setEditingDoc(null)
            setFormData({ name: '', description: '', link: '', isForAll: true })
            setSelectedUserIds([])
            setRemoveFile(false)
        }
        setSelectedFile(null)
        setError('')
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!formData.name) {
            setError('Nama dokumen wajib diisi')
            return
        }

        const data = new FormData()
        if (editingDoc) {
            data.append('id', editingDoc.id)
        }
        data.append('name', formData.name)
        data.append('description', formData.description)
        if (formData.link) data.append('link', formData.link)
        if (selectedFile) data.append('file', selectedFile)
        if (removeFile) data.append('removeFile', 'true')
        data.append('isForAll', formData.isForAll.toString())
        data.append('targetUserIds', JSON.stringify(selectedUserIds))

        startTransition(async () => {
            const result = await upsertHRDocument(data)
            if (result.success) {
                setIsModalOpen(false)
                router.refresh()
            } else {
                setError(result.error || 'Gagal menyimpan dokumen')
            }
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return

        startTransition(async () => {
            const result = await deleteHRDocument(id)
            if (result.success) {
                router.refresh()
            } else {
                alert('Gagal menghapus dokumen')
            }
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.size > 1024 * 1024) {
                setError('Ukuran file maksimal 1MB')
                e.target.value = '' // Reset input
                return
            }
            if (file.type !== 'application/pdf') {
                setError('Hanya file PDF yang diperbolehkan')
                e.target.value = ''
                return
            }
            setSelectedFile(file)
            setError('')
        }
    }

    const colCount = readOnly ? 5 : 6

    return (
        <TableWrapper className="mb-8" loading={isPending}>
            <TableHeaderContent
                title="Data HRD (Dokumen)"
                description="Kumpulan dokumen dan link penting HR, SOP, dll."
                icon={<FileText className="w-5 h-5 font-bold text-primary" />}
                actions={!readOnly && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                        disabled={isPending}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Tambah</span>
                    </button>
                )}
            />

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow hoverable={false} className="bg-muted/50">
                            <TableHead className="w-1/4">Nama Dokumen</TableHead>
                            <TableHead className="w-1/4">Keterangan</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Dapat Dilihat Oleh</TableHead>
                            <TableHead>Aksi</TableHead>
                            {!readOnly && <TableHead align="center" className="w-20">Edit/Hapus</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableEmpty
                                colSpan={colCount}
                                message="Belum ada dokumen."
                                icon={<FileText className="w-12 h-12 opacity-20" />}
                            />
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id} className="group">
                                    <TableCell className="font-medium text-foreground align-top">
                                        {doc.name}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground align-top whitespace-pre-wrap">
                                        {doc.description || '-'}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        {doc.filePath ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                                PDF
                                            </span>
                                        ) : doc.link ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                                                <ExternalLink className="w-3 h-3" /> Link
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        {doc.isForAll ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                                                <Users className="w-3 h-3" /> Semua User
                                            </span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {doc.targetUsers.length > 0 ? (
                                                    doc.targetUsers.map(u => (
                                                        <span key={u.id} className="px-1.5 py-0.5 bg-primary/5 text-primary text-[9px] font-medium rounded border border-primary/10">
                                                            {u.name || u.username}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">Tidak ada user</span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex gap-2">
                                            {doc.link && (
                                                <a
                                                    href={doc.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    Buka Link
                                                </a>
                                            )}
                                            {doc.filePath && (
                                                <a
                                                    href={doc.filePath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Lihat PDF
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell className="align-top" align="center">
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    onClick={() => handleOpenModal(doc)}
                                                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                                    disabled={isPending}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-600 transition-colors"
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableScrollArea>

            {/* Modal */}
            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editingDoc ? 'Edit Dokumen' : 'Tambah Dokumen'}
                    maxWidth="md"
                    footer={
                        <div className="flex justify-end gap-2 text-sm">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="docForm"
                                className="px-4 py-2 font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                                disabled={isPending}
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingDoc ? 'Simpan Perubahan' : 'Tambah Dokumen'}
                            </button>
                        </div>
                    }
                >
                    <div className="p-4">
                        <form id="docForm" onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nama Dokumen <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="Contoh: Peraturan Perusahaan"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Keterangan (Opsional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-20 resize-none"
                                    placeholder="Deskripsi singkat tentang dokumen..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Link (Opsional)</label>
                                <input
                                    type="url"
                                    value={formData.link}
                                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Upload File PDF (Opsional, max 1MB)</label>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                />
                                {editingDoc?.filePath && !selectedFile && !removeFile && (
                                    <div className="flex items-center gap-2 mt-2 bg-muted/30 p-2 rounded-lg border border-border">
                                        <FileText className="w-4 h-4 text-red-500" />
                                        <a href={editingDoc.filePath} target="_blank" className="text-xs text-primary hover:underline flex-1 truncate">
                                            File PDF Tersimpan
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setRemoveFile(true)}
                                            className="p-1 hover:bg-red-100 text-muted-foreground hover:text-red-500 rounded transition-colors"
                                            title="Hapus File"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                {removeFile && (
                                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100">
                                        <Trash2 className="w-3 h-3" />
                                        File akan dihapus saat disimpan.
                                        <button
                                            type="button"
                                            onClick={() => setRemoveFile(false)}
                                            className="ml-auto underline hover:text-red-800"
                                        >
                                            Batalkan
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Visibility Settings */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="text-sm font-bold text-foreground">Pengaturan Visibilitas</h3>

                                <div className="flex flex-col gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div
                                            onClick={() => setFormData({ ...formData, isForAll: true })}
                                            className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                formData.isForAll ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary"
                                            )}
                                        >
                                            {formData.isForAll && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-sm font-medium">Tampilkan untuk semua user <span className="text-[10px] text-muted-foreground font-normal">(Termasuk user baru di masa depan)</span></span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div
                                            onClick={() => setFormData({ ...formData, isForAll: false })}
                                            className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                !formData.isForAll ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary"
                                            )}
                                        >
                                            {!formData.isForAll && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-sm font-medium">Tampilkan untuk user tertentu saja</span>
                                    </label>
                                </div>

                                {!formData.isForAll && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                placeholder="Cari user..."
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div className="border border-border rounded-lg max-h-[200px] overflow-y-auto divide-y divide-border bg-background">
                                            {allUsers.filter(u =>
                                                (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                    u.username.toLowerCase().includes(userSearch.toLowerCase())) &&
                                                u.role !== 'SYSTEM'
                                            ).length === 0 ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground">Tidak ada user ditemukan</div>
                                            ) : (
                                                allUsers.filter(u =>
                                                    (u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                        u.username.toLowerCase().includes(userSearch.toLowerCase())) &&
                                                    u.role !== 'SYSTEM'
                                                ).map(user => (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => {
                                                            setSelectedUserIds(prev =>
                                                                prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                                            )
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50",
                                                            selectedUserIds.includes(user.id) ? "bg-primary/5" : ""
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                            selectedUserIds.includes(user.id) ? "bg-primary border-primary" : "border-muted-foreground"
                                                        )}>
                                                            {selectedUserIds.includes(user.id) && <Check className="w-3 h-3 text-white" />}
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
                                )}
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </TableWrapper>
    )
}
