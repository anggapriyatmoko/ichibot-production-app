'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Plus, Pencil, Trash2, Loader2, Save, X, ImageIcon, ChevronDown, Search } from 'lucide-react'
import { createExpense, updateExpense, deleteExpense, ExpenseData } from '@/app/actions/expense'
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
    TableFooter
} from '@/components/ui/table'
import Modal from '@/components/ui/modal'

interface Category {
    id: string
    name: string
}

interface Expense {
    id: string
    date: Date
    name: string
    amount: string
    categoryId: string
    image: string | null
    createdAt?: string | Date
    category?: Category
}

interface Props {
    initialExpenses: Expense[]
    categories: Category[]
}

export default function ExpenseListUser({ initialExpenses, categories }: Props) {
    const { showAlert, showError } = useAlert()
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Preview Image State
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)

    // Category Dropdown State
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const [categorySearchQuery, setCategorySearchQuery] = useState('')
    const categoryDropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
    )

    // Helper for formatting Currency
    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return isNaN(num) ? 'Rp 0' : new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num)
    }

    const defaultFormData = {
        name: '',
        amount: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        date: new Date().toISOString().substring(0, 10),
        image: '' as string | null
    }

    const [formData, setFormData] = useState(defaultFormData)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleOpenModal = (expense?: Expense) => {
        if (expense) {
            setEditingId(expense.id)
            setFormData({
                name: expense.name,
                amount: expense.amount,
                categoryId: expense.categoryId,
                date: new Date(expense.date).toISOString().substring(0, 10),
                image: expense.image
            })
        } else {
            setEditingId(null)
            setFormData({ ...defaultFormData })
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingId(null)
        setFormData({ ...defaultFormData })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result as string }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim() || !formData.amount || !formData.categoryId || !formData.date) return

        setIsSubmitting(true)

        const payload: ExpenseData = {
            name: formData.name,
            amount: formData.amount,
            categoryId: formData.categoryId,
            date: new Date(formData.date),
            image: formData.image || undefined
        }

        try {
            if (editingId) {
                const res = await updateExpense(editingId, payload)
                if (res.success && res.data) {
                    showAlert('Pengeluaran berhasil diperbarui')
                    // For optimistic UI we need the category object
                    const updatedCat = categories.find(c => c.id === formData.categoryId)
                    const tempUpdated = {
                        ...(res.data as any),
                        name: payload.name,
                        amount: payload.amount.toString(),
                        category: updatedCat
                    }
                    setExpenses(prev => prev.map(exp => exp.id === editingId ? tempUpdated as Expense : exp))
                    handleCloseModal()
                } else {
                    showError(res.error || 'Gagal memperbarui pengeluaran')
                }
            } else {
                const res = await createExpense(payload)
                if (res.success && res.data) {
                    showAlert('Pengeluaran berhasil ditambahkan')
                    const addedCat = categories.find(c => c.id === formData.categoryId)
                    const tempAdded = {
                        ...(res.data as any),
                        name: payload.name,
                        amount: payload.amount.toString(),
                        category: addedCat
                    }
                    setExpenses(prev => [tempAdded as Expense, ...prev])
                    handleCloseModal()
                } else {
                    showError(res.error || 'Gagal menambahkan pengeluaran')
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
        if (!confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) return

        setDeletingId(id)
        try {
            const res = await deleteExpense(id)
            if (res.success) {
                showAlert('Catatan berhasil dihapus')
                setExpenses(prev => prev.filter(c => c.id !== id))
            } else {
                showError(res.error || 'Gagal menghapus pengeluaran')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan sistem')
        } finally {
            setDeletingId(null)
        }
    }

    const totalAmount = expenses.reduce((acc, current) => {
        const val = parseFloat(current.amount)
        return acc + (isNaN(val) ? 0 : val)
    }, 0)

    return (
        <div className="space-y-4">
            <TableWrapper>
                <TableHeaderContent
                    title="Riwayat Pengeluaran"
                    description="Seluruh pengeluaran pribadi Anda beserta buktinya."
                    actions={
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Catat Pengeluaran
                        </button>
                    }
                />
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">No</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Nama Pengeluaran</TableHead>
                                <TableHead align="right">Jumlah</TableHead>
                                <TableHead align="center">Bukti</TableHead>
                                <TableHead className="w-[100px] text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length === 0 ? (
                                <TableEmpty colSpan={7} message="Belum ada riwayat pengeluaran" />
                            ) : (
                                expenses.map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell align="center" className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {format(new Date(item.date), 'dd MMM yyyy', { locale: localeId })}
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                Jam {format(new Date(item.createdAt || item.date), 'HH:mm')}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                                                {item.category?.name || '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell align="right" className="font-semibold text-foreground">
                                            {formatCurrency(item.amount)}
                                        </TableCell>
                                        <TableCell align="center">
                                            {item.image ? (
                                                <button
                                                    onClick={() => {
                                                        setPreviewImage(item.image)
                                                        setIsPreviewOpen(true)
                                                    }}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors inline-block"
                                                    title="Lihat Foto"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50/50 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    disabled={deletingId === item.id}
                                                    className="p-1.5 text-red-600 hover:bg-red-50/50 rounded-md transition-colors disabled:opacity-50"
                                                    title="Hapus"
                                                >
                                                    {deletingId === item.id ? (
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
                        {expenses.length > 0 && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold py-4">Total Akumulasi</TableCell>
                                    <TableCell align="right" className="font-bold text-lg text-primary py-4">
                                        {formatCurrency(totalAmount)}
                                    </TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                </div>
            </TableWrapper>

            {/* Input Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingId ? 'Edit Catatan Pengeluaran' : 'Catat Pengeluaran'}
                maxWidth="lg"
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
                            form="expense-form"
                            disabled={isSubmitting || !formData.name.trim() || !formData.amount.trim() || !formData.categoryId}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {editingId ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
                        </button>
                    </div>
                }
            >
                <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">
                                Tanggal <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                required
                            />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                            <label className="text-sm font-medium text-foreground">
                                Kategori <span className="text-red-500">*</span>
                            </label>

                            <div className="relative" ref={categoryDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    className="w-full flex items-center justify-between px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
                                >
                                    <span className={formData.categoryId ? "text-foreground" : "text-muted-foreground"}>
                                        {formData.categoryId
                                            ? categories.find(c => c.id === formData.categoryId)?.name || 'Pilih Kategori'
                                            : 'Pilih Kategori'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </button>

                                {isCategoryDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden flex flex-col">
                                        <div className="p-2 border-b border-border shrink-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    placeholder="Cari kategori..."
                                                    value={categorySearchQuery}
                                                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-transparent focus:bg-background focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-md outline-none transition-all"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                            {filteredCategories.length === 0 ? (
                                                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                                                    Kategori tidak ditemukan
                                                </div>
                                            ) : (
                                                filteredCategories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, categoryId: cat.id }))
                                                            setIsCategoryDropdownOpen(false)
                                                            setCategorySearchQuery('')
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${formData.categoryId === cat.id
                                                            ? 'bg-primary/10 text-primary font-medium'
                                                            : 'hover:bg-muted text-foreground'
                                                            }`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Nama Pengeluaran <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Makan siang, bensin, dll..."
                            className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Jumlah (Rp) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.amount ? new Intl.NumberFormat('id-ID').format(parseInt(formData.amount, 10)) : ''}
                            onChange={(e) => {
                                const rawValue = e.target.value.replace(/\D/g, '')
                                setFormData(prev => ({ ...prev, amount: rawValue }))
                            }}
                            placeholder="150.000"
                            className="w-full px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Bukti Foto (Opsional)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {formData.image && (
                            <div className="mt-2 relative inline-block">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={formData.image} alt="Preview" className="h-24 object-cover rounded-lg border border-border" />
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                    title="Hapus foto"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                title="Bukti Pengeluaran"
                maxWidth="3xl"
            >
                {previewImage && (
                    <div className="flex justify-center flex-col gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImage} alt="Bukti" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
                    </div>
                )}
            </Modal>
        </div>
    )
}
