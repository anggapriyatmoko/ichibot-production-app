'use client'

import { useState, useTransition, useEffect } from 'react'
import { FileText, Plus, Trash2, Edit, ExternalLink, Download, File, Loader2, AlertCircle } from 'lucide-react'
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
} from '@/components/ui/table'

interface HRDocument {
    id: string
    name: string
    description: string | null
    link: string | null
    filePath: string | null
    createdAt: Date
    updatedAt: Date
}

interface Props {
    documents: HRDocument[]
    readOnly?: boolean
}

export default function HRDocumentManager({ documents, readOnly = false }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState<HRDocument | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        link: ''
    })
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [error, setError] = useState('')

    const [removeFile, setRemoveFile] = useState(false)

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

    // Reset removeFile when opening modal
    const handleOpenModal = (doc?: HRDocument) => {
        if (readOnly) return
        if (doc) {
            setEditingDoc(doc)
            setFormData({
                name: doc.name,
                description: doc.description || '',
                link: doc.link || ''
            })
            setRemoveFile(false)
        } else {
            setEditingDoc(null)
            setFormData({ name: '', description: '', link: '' })
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

    const colCount = readOnly ? 4 : 5

    return (
        <TableWrapper className="mb-8" loading={isPending}>
            <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                        <h2 className="font-semibold text-foreground">Data HRD (Dokumen)</h2>
                        <p className="text-xs text-muted-foreground">Kumpulan dokumen dan link penting HR, SOP, dll.</p>
                    </div>
                </div>
                {!readOnly && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                        disabled={isPending}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Tambah Dokumen</span>
                    </button>
                )}
            </div>

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow hoverable={false} className="bg-muted/50">
                            <TableHead className="w-1/4">Nama Dokumen</TableHead>
                            <TableHead className="w-1/3">Keterangan</TableHead>
                            <TableHead>Tipe</TableHead>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-lg border border-border flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-lg">{editingDoc ? 'Edit Dokumen' : 'Tambah Dokumen'}</h3>
                        </div>

                        <div className="p-4 overflow-y-auto">
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
                            </form>
                        </div>

                        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="docForm"
                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                                disabled={isPending}
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingDoc ? 'Simpan Perubahan' : 'Tambah Dokumen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </TableWrapper>
    )
}
