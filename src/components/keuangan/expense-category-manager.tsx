'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react'
import { createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '@/app/actions/expense-category'
import { useAlert } from '@/hooks/use-alert'
import {
    TableWrapper,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableHeaderContent,
    TableEmpty,
} from '@/components/ui/table'
import Modal from '@/components/ui/modal'

interface Category {
    id: string
    name: string
    description: string | null
}

interface Props {
    initialCategories: Category[]
}

export default function ExpenseCategoryManager({ initialCategories }: Props) {
    const { showAlert, showError } = useAlert()
    const [categories, setCategories] = useState<Category[]>(initialCategories)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', description: '' })

    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleOpenModal = (category?: Category) => {
        if (category) {
            setEditingId(category.id)
            setFormData({
                name: category.name,
                description: category.description || ''
            })
        } else {
            setEditingId(null)
            setFormData({ name: '', description: '' })
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingId(null)
        setFormData({ name: '', description: '' })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) return

        setIsSubmitting(true)
        try {
            if (editingId) {
                const res = await updateExpenseCategory(editingId, formData)
                if (res.success && res.data) {
                    showAlert('Kategori berhasil diperbarui')
                    setCategories(prev => prev.map(c => c.id === editingId ? res.data as Category : c))
                    handleCloseModal()
                } else {
                    showError(res.error || 'Gagal memperbarui kategori')
                }
            } else {
                const res = await createExpenseCategory(formData)
                if (res.success && res.data) {
                    showAlert('Kategori berhasil ditambahkan')
                    setCategories(prev => [res.data as Category, ...prev])
                    handleCloseModal()
                } else {
                    showError(res.error || 'Gagal menambahkan kategori')
                }
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan sistem')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus kategori ini? Data yang terkait mungkin akan terpengaruh.')) return

        setDeletingId(id)
        try {
            const res = await deleteExpenseCategory(id)
            if (res.success) {
                showAlert('Kategori berhasil dihapus')
                setCategories(prev => prev.filter(c => c.id !== id))
            } else {
                showError(res.error || 'Gagal menghapus kategori')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan sistem')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <TableWrapper>
                <TableHeaderContent
                    title="Kategori Pengeluaran"
                    description="Kelola daftar kategori untuk memudahkan pengelompokan biaya."
                    actions={
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Kategori
                        </button>
                    }
                />
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">No</TableHead>
                                <TableHead>Nama Kategori</TableHead>
                                <TableHead>Keterangan</TableHead>
                                <TableHead className="w-[100px] text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableEmpty colSpan={4} message="Belum ada kategori pengeluaran" />
                            ) : (
                                categories.map((cat, idx) => (
                                    <TableRow key={cat.id}>
                                        <TableCell align="center" className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{cat.description || '-'}</TableCell>
                                        <TableCell align="center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(cat)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50/50 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    disabled={deletingId === cat.id}
                                                    className="p-1.5 text-red-600 hover:bg-red-50/50 rounded-md transition-colors disabled:opacity-50"
                                                    title="Hapus"
                                                >
                                                    {deletingId === cat.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TableWrapper>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                maxWidth="sm"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleCloseModal}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            form="category-form"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {editingId ? 'Simpan Perubahan' : 'Buat Kategori'}
                        </button>
                    </div>
                }
            >
                <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Nama Kategori <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Makan, Transport..."
                            className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Keterangan (Opsional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Detail mengenai kategori ini..."
                            className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
                        />
                    </div>
                </form>
            </Modal>
        </div>
    )
}
