'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Pencil, X, Save, Check } from 'lucide-react'
import { createSalaryComponent, deleteSalaryComponent, updateSalaryComponent } from '@/app/actions/salary-settings'
import { useAlert } from '@/hooks/use-alert'

interface SalaryComponent {
    id: string
    name: string
    type: string
}

interface Props {
    title: string
    type: 'DEDUCTION' | 'ADDITION'
    initialData: SalaryComponent[]
}

export default function SalaryComponentList({ title, type, initialData }: Props) {
    const { showAlert, showError } = useAlert()
    const [components, setComponents] = useState<SalaryComponent[]>(initialData)
    const [newName, setNewName] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newName.trim()) return

        setIsAdding(true)
        try {
            const res = await createSalaryComponent(newName, type)
            if (res.success) {
                showAlert('Komponen berhasil ditambahkan')
                setNewName('')
                // We rely on revalidatePath from server action to update the page, 
                // but for immediate UI feedback we might want to reload or careful state update.
                // However, since we don't have the new ID unless returned, best to just router refresh
                // or assume page will refresh.
                // Wait, revalidatePath re-renders server components.
                // Since this is a client component receiving props, it won't automatically update 
                // unless the parent re-renders.
                // To fix this proper behavior, we should probably fetch data again or router.refresh()
                // Let's use router.refresh()
            } else {
                showError(res.error || 'Gagal menambahkan komponen')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan')
        } finally {
            setIsAdding(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus komponen ini?')) return

        setDeletingId(id)
        try {
            const res = await deleteSalaryComponent(id)
            if (res.success) {
                showAlert('Komponen berhasil dihapus')
                // Optimistic update
                setComponents(prev => prev.filter(c => c.id !== id))
            } else {
                showError(res.error || 'Gagal menghapus komponen')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan')
        } finally {
            setDeletingId(null)
        }
    }

    const handleEdit = (item: SalaryComponent) => {
        setEditingId(item.id)
        setEditName(item.name)
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditName('')
    }

    const handleSaveEdit = async (id: string, type: string) => {
        if (!editName.trim() || editName === components.find(c => c.id === id)?.name) {
            handleCancelEdit()
            return
        }

        setIsUpdating(true)
        try {
            const res = await updateSalaryComponent(id, editName, type as 'DEDUCTION' | 'ADDITION')
            if (res.success) {
                showAlert('Komponen berhasil diperbarui')
                setComponents(prev => prev.map(c => c.id === id ? { ...c, name: editName } : c))
                handleCancelEdit()
            } else {
                showError(res.error || 'Gagal memperbarui komponen')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan')
        } finally {
            setIsUpdating(false)
        }
    }

    useEffect(() => {
        setComponents(initialData)
    }, [initialData])

    // Better: use useEffect to update state when initialData changes
    // But actually, we should just use router.refresh() in parent or here?
    // We can import useRouter

    const [isMounted, setIsMounted] = useState(false)

    return (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${type === 'ADDITION' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {type === 'ADDITION' ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
            </div>

            <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                {components.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                ) : (
                    components.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                            {editingId === item.id ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(item.id, item.type)
                                            if (e.key === 'Escape') handleCancelEdit()
                                        }}
                                    />
                                    <button
                                        onClick={() => handleSaveEdit(item.id, item.type)}
                                        disabled={isUpdating || !editName.trim()}
                                        className="p-1.5 text-green-600 hover:bg-green-500/10 rounded-md transition-colors disabled:opacity-50"
                                        title="Simpan"
                                    >
                                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isUpdating}
                                        className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                                        title="Batal"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors"
                                            title="Hapus"
                                        >
                                            {deletingId === item.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleAdd} className="mt-auto pt-4 border-t border-border flex gap-2">
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nama komponen..."
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                    type="submit"
                    disabled={isAdding || !newName.trim()}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isAdding ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Plus className="w-5 h-5" />
                    )}
                </button>
            </form>
        </div>
    )
}
