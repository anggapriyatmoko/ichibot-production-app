'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, X, Check } from 'lucide-react'
import { getStoreSuppliers, addStoreSupplier, updateStoreSupplier, deleteStoreSupplier } from '@/app/actions/store-supplier'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'

export default function StoreSupplierManager({
    initialSuppliers
}: {
    initialSuppliers: any[]
}) {
    const [suppliers, setSuppliers] = useState(initialSuppliers)
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    // Form states
    const [isAdding, setIsAdding] = useState(false)
    const [newSupplierName, setNewSupplierName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Edit states
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const { showAlert, showError } = useAlert()

    // Filter suppliers
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [suppliers, searchTerm])

    // Pagination
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage)

    const handleAddSupplier = async () => {
        if (!newSupplierName.trim()) return

        setIsSubmitting(true)
        try {
            const result = await addStoreSupplier(newSupplierName)
            if (result.success) {
                setSuppliers(prev => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)))
                setNewSupplierName('')
                setIsAdding(false)
                showAlert('Supplier berhasil ditambahkan')
            } else {
                showError(result.error || 'Gagal menambahkan supplier')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleUpdateSupplier = async (id: string) => {
        if (!editName.trim()) return

        setIsSubmitting(true)
        try {
            const result = await updateStoreSupplier(id, editName)
            if (result.success) {
                setSuppliers(prev => prev.map(s => s.id === id ? { ...s, name: editName } : s))
                setEditingId(null)
                showAlert('Supplier berhasil diperbarui')
            } else {
                showError(result.error || 'Gagal memperbarui supplier')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteSupplier = async (id: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus supplier ini?')) return

        try {
            const result = await deleteStoreSupplier(id)
            if (result.success) {
                setSuppliers(prev => prev.filter(s => s.id !== id))
                showAlert('Supplier berhasil dihapus')
            } else {
                showError(result.error || 'Gagal menghapus supplier')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        }
    }

    const startEditing = (supplier: any) => {
        setEditingId(supplier.id)
        setEditName(supplier.name)
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Supplier
                </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/50 border-b border-border">
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID Supplier</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nama Supplier</th>
                            <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isAdding && (
                            <tr className="bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                    [AUTO]
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newSupplierName}
                                        onChange={(e) => setNewSupplierName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
                                        placeholder="Ketik nama supplier..."
                                        className="w-full bg-background border border-primary/30 rounded px-2 py-1 text-sm outline-none focus:border-primary"
                                    />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={handleAddSupplier}
                                            disabled={isSubmitting || !newSupplierName.trim()}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                            title="Simpan"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => setIsAdding(false)}
                                            className="p-1.5 text-destructive hover:bg-destructive/5 rounded-md transition-colors"
                                            title="Batal"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {paginatedSuppliers.length > 0 ? (
                            paginatedSuppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-accent/30 transition-colors group">
                                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                                        {supplier.id}
                                    </td>
                                    <td className="px-4 py-3">
                                        {editingId === supplier.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateSupplier(supplier.id)}
                                                className="w-full bg-background border border-primary/30 rounded px-2 py-1 text-sm outline-none focus:border-primary"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-foreground">{supplier.name}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {editingId === supplier.id ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateSupplier(supplier.id)}
                                                        disabled={isSubmitting || !editName.trim()}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                                                    >
                                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1.5 text-destructive hover:bg-destructive/5 rounded-md"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => startEditing(supplier)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSupplier(supplier.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : !isAdding && (
                            <tr>
                                <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground text-sm italic">
                                    Belum ada data supplier.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            Halaman {currentPage} dari {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
