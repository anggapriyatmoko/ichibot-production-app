'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X, Warehouse } from 'lucide-react'
import { getRacksWithUnusedDrawers, createRack, updateRack, deleteRack } from '@/app/actions/rack'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'

interface RackWithDrawers {
    id: string
    name: string
    drawerCount: number
    description: string | null
    unusedDrawersList: string[]
    unusedDrawersCount: number
}

interface RackManagerProps {
    userRole?: string
}

export default function RackManager({ userRole }: RackManagerProps) {
    const isAdmin = ['ADMIN', 'HRD'].includes(userRole || '')
    const [racks, setRacks] = useState<RackWithDrawers[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', drawerCount: 0, description: '' })
    const { showConfirmation } = useConfirmation()
    const { showError, showAlert } = useAlert()

    useEffect(() => {
        loadRacks()
    }, [])

    async function loadRacks() {
        setIsLoading(true)
        try {
            const data = await getRacksWithUnusedDrawers()
            setRacks(data)
        } catch (error) {
            showError('Failed to load racks')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdd() {
        if (!formData.name.trim()) {
            showError('Nama rak harus diisi')
            return
        }
        try {
            await createRack({
                name: formData.name.trim(),
                drawerCount: formData.drawerCount,
                description: formData.description.trim() || undefined
            })
            showAlert('Rak berhasil ditambahkan')
            setFormData({ name: '', drawerCount: 0, description: '' })
            setIsAdding(false)
            loadRacks()
        } catch (error) {
            showError('Gagal menambahkan rak')
        }
    }

    async function handleUpdate() {
        if (!editingId || !formData.name.trim()) {
            showError('Nama rak harus diisi')
            return
        }
        try {
            await updateRack(editingId, {
                name: formData.name.trim(),
                drawerCount: formData.drawerCount,
                description: formData.description.trim() || undefined
            })
            showAlert('Rak berhasil diperbarui')
            setEditingId(null)
            setFormData({ name: '', drawerCount: 0, description: '' })
            loadRacks()
        } catch (error) {
            showError('Gagal memperbarui rak')
        }
    }

    async function handleDelete(id: string, name: string) {
        showConfirmation({
            title: 'Hapus Rak',
            message: `Apakah Anda yakin ingin menghapus rak "${name}"?`,
            type: 'confirm',
            action: async () => {
                try {
                    await deleteRack(id)
                    showAlert('Rak berhasil dihapus')
                    loadRacks()
                } catch (error) {
                    showError('Gagal menghapus rak')
                }
            }
        })
    }

    function startEdit(rack: RackWithDrawers) {
        setEditingId(rack.id)
        setFormData({ name: rack.name, drawerCount: rack.drawerCount, description: rack.description || '' })
        setIsAdding(false)
    }

    function cancelEdit() {
        setEditingId(null)
        setIsAdding(false)
        setFormData({ name: '', drawerCount: 0, description: '' })
    }

    return (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Warehouse className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Rak Sparepart</h3>
                        <p className="text-xs text-muted-foreground">Kelola daftar rak penyimpanan sparepart</p>
                    </div>
                </div>
                {isAdmin && !isAdding && !editingId && (
                    <button
                        onClick={() => { setIsAdding(true); setFormData({ name: '', drawerCount: 0, description: '' }) }}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Tambah Rak</span>
                    </button>
                )}
            </div>

            <div className="divide-y divide-border">
                {/* Modals for Add/Edit */}
                {(isAdding || editingId) && (
                    <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelEdit} />
                        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md relative animate-in zoom-in-95 duration-200 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Warehouse className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground">
                                    {isAdding ? 'Tambah Rak Baru' : 'Edit Rak'}
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nama Rak</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: RAK-A"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Jumlah Laci</label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={formData.drawerCount || ''}
                                        onChange={e => setFormData({ ...formData, drawerCount: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Keterangan (Opsional)</label>
                                    <textarea
                                        placeholder="Keterangan laci atau lokasi..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] transition-all resize-none"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                    <button
                                        onClick={cancelEdit}
                                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={isAdding ? handleAdd : handleUpdate}
                                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                                    >
                                        <Save className="w-4 h-4" />
                                        {isAdding ? 'Simpan Rak' : 'Update Rak'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                ) : racks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Belum ada data rak. Klik "Tambah Rak" untuk menambahkan.
                    </div>
                ) : (
                    racks.map(rack => (
                        <div key={rack.id} className="p-4 hover:bg-accent/50 transition-colors group">
                            <div>
                                {/* Rack Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-bold text-lg text-foreground">{rack.name}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {rack.drawerCount} laci total • {rack.description || 'Tidak ada keterangan'}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(rack)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(rack.id, rack.name)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Unused Drawers */}
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs font-medium text-foreground mb-2">
                                        Laci yang belum dipakai ({rack.unusedDrawersCount}):
                                    </p>
                                    {rack.unusedDrawersList.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {rack.unusedDrawersList.map(drawer => (
                                                <span key={drawer} className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-mono font-medium shadow-sm">
                                                    {drawer}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Semua laci sudah dipakai ✓
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
