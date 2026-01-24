'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, FolderKanban, Save } from 'lucide-react'
import { createProjectCategory, updateProjectCategory, deleteProjectCategory } from '@/app/actions/project'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'

interface Category {
    id: string
    name: string
}

interface CategoryManagerProps {
    initialCategories: Category[]
}

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
    const [categories, setCategories] = useState(initialCategories)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [saving, setSaving] = useState(false)

    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return
        setSaving(true)
        const result = await createProjectCategory(newCategoryName)
        if (result.success) {
            showAlert('Kategori berhasil ditambahkan', 'success')
            setNewCategoryName('')
            window.location.reload()
        } else {
            showAlert(result.error || 'Terjadi kesalahan', 'error')
        }
        setSaving(false)
    }

    const handleUpdate = async () => {
        if (!editingCategory || !editingCategory.name.trim()) return
        setSaving(true)
        const result = await updateProjectCategory(editingCategory.id, editingCategory.name)
        if (result.success) {
            showAlert('Kategori berhasil diperbarui', 'success')
            setEditingCategory(null)
            window.location.reload()
        } else {
            showAlert(result.error || 'Terjadi kesalahan', 'error')
        }
        setSaving(false)
    }

    const handleDelete = (id: string, name: string) => {
        showConfirmation({
            title: 'Hapus Kategori',
            message: `Apakah Anda yakin ingin menghapus kategori "${name}"?`,
            type: 'confirm',
            action: async () => {
                const result = await deleteProjectCategory(id)
                if (result.success) {
                    showAlert('Kategori berhasil dihapus', 'success')
                    window.location.reload()
                } else {
                    showAlert(result.error || 'Gagal menghapus', 'error')
                }
            }
        })
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Tambah Kategori Baru
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nama kategori project, misal: Client, Internal, R&D..."
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2 outline-none focus:border-primary transition-all shadow-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={saving || !newCategoryName.trim()}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-bold transition-all shadow-lg shadow-primary/20"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tambah'}
                    </button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-muted/50 border-b border-border">
                    <h3 className="font-bold flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-primary" />
                        Daftar Kategori Project
                    </h3>
                </div>
                <div className="divide-y divide-border">
                    {categories.map(category => (
                        <div key={category.id} className="p-4 flex items-center justify-between hover:bg-accent/30 transition-colors group">
                            {editingCategory?.id === category.id ? (
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={editingCategory.name}
                                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                        className="flex-1 bg-background border border-primary rounded-lg px-3 py-1.5 outline-none"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                    />
                                    <button onClick={handleUpdate} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                                        <Save className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setEditingCategory(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                                        Batal
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-medium text-foreground">{category.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingCategory(category)}
                                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id, category.name)}
                                            className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            Belum ada kategori project
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
