'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Trash2, Edit2, Loader2, X, Check, Truck } from 'lucide-react'
import { getStoreSuppliers, addStoreSupplier, updateStoreSupplier, deleteStoreSupplier } from '@/app/actions/store-supplier'
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
    TablePagination,
    TableHeaderContent,
} from "@/components/ui/table";

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
            <TableWrapper>
                <TableHeaderContent
                    title="Kelola Supplier"
                    description="Kelola data supplier untuk sinkronisasi produk dan stok."
                    icon={<Truck className="w-5 h-5 text-primary" />}
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
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
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Supplier
                            </button>
                        </div>
                    }
                />

                <TableScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Supplier</TableHead>
                                <TableHead>Nama Supplier</TableHead>
                                <TableHead align="right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isAdding && (
                                <TableRow hoverable={false} className="bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        [AUTO]
                                    </TableCell>
                                    <TableCell>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newSupplierName}
                                            onChange={(e) => setNewSupplierName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
                                            placeholder="Ketik nama supplier..."
                                            className="w-full bg-background border border-primary/30 rounded px-2 py-1 text-sm outline-none focus:border-primary"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
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
                                    </TableCell>
                                </TableRow>
                            )}
                            {paginatedSuppliers.length > 0 ? (
                                paginatedSuppliers.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {supplier.id}
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell align="right">
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
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : !isAdding && (
                                <TableEmpty colSpan={3} icon={<Truck className="w-12 h-12 opacity-20" />} />
                            )}
                        </TableBody>
                    </Table>
                </TableScrollArea>

                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalCount={filteredSuppliers.length}
                    itemsPerPage={itemsPerPage}
                />
            </TableWrapper>
        </div>
    )
}
