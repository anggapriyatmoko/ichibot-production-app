'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X, BookOpen, Layers } from 'lucide-react'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'

interface Category {
    id: string
    name: string
}

interface CategorySettingsManagerProps {
    title: string
    description: string
    iconName: 'product' | 'section'
    initialCategories: Category[]
    onCreate: (name: string) => Promise<{ success?: boolean; error?: string }>
    onUpdate: (id: string, name: string) => Promise<{ success?: boolean; error?: string }>
    onDelete: (id: string) => Promise<{ success?: boolean; error?: string }>
    placeholder?: string
}

export default function CategorySettingsManager({
    title,
    description,
    iconName,
    initialCategories,
    onCreate,
    onUpdate,
    onDelete,
    placeholder = "Nama kategori..."
}: CategorySettingsManagerProps) {
    const Icon = iconName === 'product' ? BookOpen : Layers
    const [categories, setCategories] = useState<Category[]>(initialCategories)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [loading, setLoading] = useState(false)

    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    const handleCreate = async () => {
        if (!newName.trim()) return
        setLoading(true)
        const result = await onCreate(newName)
        if (result.success) {
            showAlert(`${title} berhasil ditambahkan`, 'success')
            setNewName('')
            // Simple approach: reload to get updated server state
            window.location.reload()
        } else {
            showAlert(result.error || 'Gagal menambahkan kategori', 'error')
        }
        setLoading(false)
    }

    const handleUpdate = async (id: string) => {
        if (!editingName.trim()) return
        setLoading(true)
        const result = await onUpdate(id, editingName)
        if (result.success) {
            showAlert(`${title} berhasil diperbarui`, 'success')
            setEditingId(null)
            window.location.reload()
        } else {
            showAlert(result.error || 'Gagal memperbarui kategori', 'error')
        }
        setLoading(false)
    }

    const handleDelete = (id: string, name: string) => {
        showConfirmation({
            title: `Hapus ${title}`,
            message: `Apakah Anda yakin ingin menghapus kategori "${name}"?`,
            type: 'confirm',
            action: async () => {
                const result = await onDelete(id)
                if (result.success) {
                    showAlert(`${title} berhasil dihapus`, 'success')
                    window.location.reload()
                } else {
                    showAlert(result.error || 'Gagal menghapus kategori', 'error')
                }
            }
        })
    }

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-border bg-muted/30">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            </div>

            <div className="p-5 flex flex-col flex-1">
                {/* Add Form */}
                <div className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 bg-background border border-border rounded-lg px-4 py-2 outline-none focus:border-primary transition-all shadow-sm text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        disabled={loading}
                    />
                    <button
                        onClick={handleCreate}
                        disabled={loading || !newName.trim()}
                        className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/10"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    </button>
                </div>

                {/* Categories List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
                    {categories.length === 0 ? (
                        <div className="py-10 text-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
                            Belum ada kategori
                        </div>
                    ) : (
                        categories.map((category: Category) => (
                            <div
                                key={category.id}
                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-all border border-transparent hover:border-border"
                            >
                                {editingId === category.id ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="flex-1 bg-background border border-primary rounded-md px-2 py-1 text-sm outline-none"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate(category.id)}
                                            onKeyDownCapture={(e) => e.key === 'Escape' && setEditingId(null)}
                                            disabled={loading}
                                        />
                                        <button
                                            onClick={() => handleUpdate(category.id)}
                                            disabled={loading}
                                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            disabled={loading}
                                            className="p-1.5 text-muted-foreground hover:bg-accent rounded-md transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm font-medium">{category.name}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingId(category.id)
                                                    setEditingName(category.name)
                                                }}
                                                className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id, category.name)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
