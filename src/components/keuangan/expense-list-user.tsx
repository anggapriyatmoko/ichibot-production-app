'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Plus, Pencil, Trash2, Loader2, Save, X, ImageIcon, ChevronDown, Search, Activity, ReceiptText, Info } from 'lucide-react'
import { getExpenses, createExpense, updateExpense, deleteExpense, ExpenseData } from '@/app/actions/expense'
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
    TableFooter,
    TablePagination
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
    userId: string
    initialExpenses: Expense[]
    categories: Category[]
}

export default function ExpenseListUser({ userId, initialExpenses, categories }: Props) {
    const { showAlert, showError } = useAlert()
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

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

    // Filter state
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        return d.toISOString().substring(0, 10)
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().substring(0, 10))

    const fetchExpenses = async () => {
        setIsLoadingData(true)
        try {
            const start = startDate ? new Date(startDate) : undefined
            if (start) start.setHours(0, 0, 0, 0)

            const end = endDate ? new Date(endDate) : undefined
            if (end) end.setHours(23, 59, 59, 999)

            const res = await getExpenses(userId, start?.toISOString(), end?.toISOString())
            if (res.success && res.data) {
                setExpenses(res.data as Expense[])
            } else {
                showError(res.error || 'Gagal memuat rekapitulasi')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan saat memuat data')
        } finally {
            setIsLoadingData(false)
        }
    }

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

    const categoryDistribution = expenses.reduce((acc, exp) => {
        const catName = exp.category?.name || 'Lainnya'
        const val = parseFloat(exp.amount)
        if (!isNaN(val)) {
            acc[catName] = (acc[catName] || 0) + val
        }
        return acc
    }, {} as Record<string, number>)

    const sortedCategories = Object.entries(categoryDistribution).sort((a, b) => b[1] - a[1])

    return (
        <div className="space-y-6">
            <TableWrapper loading={isLoadingData}>
                <TableHeaderContent
                    title="Riwayat Pengeluaran"
                    description="Seluruh pengeluaran pribadi Anda beserta buktinya."
                    actions={
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="flex flex-col sm:flex-row items-center gap-2 bg-background p-1 border border-border rounded-lg">
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-sm text-muted-foreground font-medium">Dari:</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
                                    />
                                </div>
                                <div className="hidden sm:block w-px h-5 bg-border" />
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-sm text-muted-foreground font-medium">Sampai:</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0"
                                    />
                                </div>
                                <button
                                    onClick={fetchExpenses}
                                    disabled={isLoadingData}
                                    className="bg-primary text-primary-foreground p-1.5 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    title="Filter Data"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-primary text-primary-foreground px-4 py-2 h-[38px] rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                Catat
                            </button>
                        </div>
                    }
                />
                <div className="hidden md:block overflow-x-auto">
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
                                expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, idx) => (
                                    <TableRow key={item.id}>
                                        <TableCell align="center" className="text-muted-foreground">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
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

                {/* Mobile View (List) */}
                <div className="block md:hidden mt-4">
                    {expenses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-border border-dashed mx-4">
                            Belum ada riwayat pengeluaran
                        </div>
                    ) : (
                        <div className="divide-y divide-border border-t border-b border-border">
                            {expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                                <div key={item.id} className="py-4 px-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="space-y-1">
                                            <h4 className="font-semibold text-foreground text-sm leading-tight">{item.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(item.date), 'dd MMM yyyy', { locale: localeId })} • {format(new Date(item.createdAt || item.date), 'HH:mm')}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="font-bold text-foreground text-sm">{formatCurrency(item.amount)}</span>
                                            <span className="px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded-md w-fit">
                                                {item.category?.name || '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <div>
                                            {item.image ? (
                                                <button
                                                    onClick={() => {
                                                        setPreviewImage(item.image)
                                                        setIsPreviewOpen(true)
                                                    }}
                                                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    Lihat Bukti
                                                </button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic flex items-center gap-1.5 px-2 py-1">
                                                    Tidak ada bukti
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(item)}
                                                className="p-1.5 text-blue-600 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-md transition-colors flex items-center gap-1"
                                                title="Edit"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-medium hidden sm:inline">Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className="p-1.5 text-red-600 bg-red-50/50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                                                title="Hapus"
                                            >
                                                {deletingId === item.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {expenses.length > 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4 mx-4 flex justify-between items-center">
                            <span className="font-semibold text-sm text-foreground">Total Akumulasi</span>
                            <span className="font-bold text-primary">{formatCurrency(totalAmount)}</span>
                        </div>
                    )}
                </div>

                {expenses.length > 0 && (
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(expenses.length / itemsPerPage)}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1) }}
                        totalCount={expenses.length}
                    />
                )}
            </TableWrapper>

            {/* Analytics Section */}
            {expenses.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Analisis Pengeluaran</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 p-5 rounded-xl bg-destructive/5 border border-destructive/10 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2 text-destructive">
                                <ReceiptText className="w-4 h-4" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider">Total Pengeluaran</h3>
                            </div>
                            <span className="text-3xl font-black text-destructive break-words">
                                {formatCurrency(totalAmount)}
                            </span>
                            <div className="mt-3 flex gap-2 p-2 bg-muted/50 rounded text-xs items-center">
                                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-muted-foreground leading-tight">Total dari {expenses.length} catatan pengeluaran.</span>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Pengeluaran per Kategori</h3>
                            <div className="space-y-3">
                                {sortedCategories.map(([catName, amount], idx) => {
                                    const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0
                                    // Use different colors based on index
                                    const colorClass = idx === 0 ? 'bg-destructive' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : 'bg-primary'

                                    return (
                                        <div key={catName} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-semibold text-foreground truncate max-w-[200px]" title={catName}>
                                                    {catName}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-foreground">
                                                        {formatCurrency(amount)}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs w-10 text-right">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
