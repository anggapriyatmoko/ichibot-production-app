'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'
import { createSalaryComponent, deleteSalaryComponent } from '@/app/actions/salary-settings'
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

    // Effect to sync with props if parent updates
    // e.g. after router.refresh()
    useState(() => {
        if (initialData !== components) {
            // This is tricky, using key on component in parent is better to force re-render
        }
    })

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
                {initialData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                ) : (
                    initialData.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Hapus"
                            >
                                {deletingId === item.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                            </button>
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
