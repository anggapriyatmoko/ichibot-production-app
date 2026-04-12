'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Plus, Pencil, Trash2, Loader2, Save, X, ImageIcon, ChevronDown, Search, Activity, ReceiptText, Info, Calendar, Check, ScanLine, FileText } from 'lucide-react'
import { getExpenses, createExpense, updateExpense, deleteExpense, approveExpense, createExpenseDraft, getExpenseImage, ExpenseData } from '@/app/actions/expense'
import { useAlert } from '@/hooks/use-alert'
import {
    Table,
    TableHeader,
    TableHeaderContent,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableEmpty,
    TableFooter,
    TablePagination,
    TableResponsive,
    TableMobileCard,
    TableMobileCardHeader,
    TableMobileCardContent,
    TableMobileCardFooter,
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
    hasImage?: boolean
    status?: string
    createdAt?: string | Date
    category?: Category
}

interface Props {
    userId: string
    initialExpenses: Expense[]
    categories: Category[]
}

// Helper functions for week picker
function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getDateOfISOWeek(w: number, y: number) {
    var simple = new Date(y, 0, 1 + (w - 1) * 7)
    var dow = simple.getDay()
    var ISOweekStart = simple
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
    return ISOweekStart
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

    // Modal tab state
    const [modalTab, setModalTab] = useState<'manual' | 'scan'>('manual')
    const [scanCategoryId, setScanCategoryId] = useState('')
    const [scanPreviewImage, setScanPreviewImage] = useState<string | null>(null)
    const [isScanUploading, setIsScanUploading] = useState(false)
    const [isScanCategoryDropdownOpen, setIsScanCategoryDropdownOpen] = useState(false)
    const [scanCategorySearchQuery, setScanCategorySearchQuery] = useState('')
    const scanCategoryDropdownRef = useRef<HTMLDivElement>(null)

    // Track deleted IDs & scan abort controllers to prevent resurrection
    const deletedIdsRef = useRef<Set<string>>(new Set())
    const scanAbortControllersRef = useRef<Map<string, AbortController>>(new Map())

    // Category Dropdown State
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const [categorySearchQuery, setCategorySearchQuery] = useState('')
    const categoryDropdownRef = useRef<HTMLDivElement>(null)

    // Filter state
    type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly'
    const [periodType, setPeriodType] = useState<PeriodType>('monthly')
    
    // Generic selected date
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        return d.toISOString().substring(0, 10) // YYYY-MM-DD
    })
    
    const [startDate, endDate] = useMemo(() => {
        const d = new Date(selectedDate)
        const yyyy = d.getFullYear()
        const mm = d.getMonth()
        
        switch (periodType) {
            case 'daily':
                return [selectedDate, selectedDate]
            case 'weekly':
                const day = d.getDay()
                const diff = d.getDate() - day + (day === 0 ? -6 : 1)
                const monday = new Date(d.setDate(diff))
                const sunday = new Date(monday)
                sunday.setDate(monday.getDate() + 6)
                
                const formatD = (date: Date) => {
                    const y = date.getFullYear()
                    const m = String(date.getMonth() + 1).padStart(2, '0')
                    const dt = String(date.getDate()).padStart(2, '0')
                    return `${y}-${m}-${dt}`
                }
                return [formatD(monday), formatD(sunday)]
            case 'monthly':
                const lastDay = new Date(yyyy, mm + 1, 0)
                const smm = String(mm + 1).padStart(2, '0')
                return [`${yyyy}-${smm}-01`, `${yyyy}-${smm}-${String(lastDay.getDate()).padStart(2, '0')}`]
            case 'yearly':
                return [`${yyyy}-01-01`, `${yyyy}-12-31`]
            default:
                return [selectedDate, selectedDate]
        }
    }, [periodType, selectedDate])

    // Auto-fetch on date change
    useEffect(() => {
        fetchExpenses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate])

    const fetchExpenses = async (silent = false) => {
        if (!silent) setIsLoadingData(true)
        try {
            const start = startDate ? new Date(startDate) : undefined
            if (start) start.setHours(0, 0, 0, 0)

            const end = endDate ? new Date(endDate) : undefined
            if (end) end.setHours(23, 59, 59, 999)

            const res = await getExpenses(userId, start?.toISOString(), end?.toISOString())
            if (res.success && res.data) {
                const filtered = (res.data as Expense[]).filter(e => !deletedIdsRef.current.has(e.id))
                setExpenses(filtered)
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
            if (scanCategoryDropdownRef.current && !scanCategoryDropdownRef.current.contains(event.target as Node)) {
                setIsScanCategoryDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Stable boolean: only changes when scanning state actually flips
    const hasScanning = useMemo(
        () => expenses.some(e => e.status === 'scanning'),
        [expenses]
    )

    // Auto-refresh when scanning items exist (silent = no table loading flash)
    useEffect(() => {
        if (!hasScanning) return
        const interval = setInterval(() => { fetchExpenses(true) }, 5000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasScanning])

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

    const handleOpenModal = async (expense?: Expense) => {
        if (expense) {
            setEditingId(expense.id)
            setFormData({
                name: expense.name,
                amount: expense.amount,
                categoryId: expense.categoryId,
                date: new Date(expense.date).toISOString().substring(0, 10),
                image: null
            })
            setIsModalOpen(true)
            // Load image on-demand if exists
            if (expense.hasImage) {
                const res = await getExpenseImage(expense.id)
                if (res.success && res.data) {
                    setFormData(prev => ({ ...prev, image: res.data }))
                }
            }
            return
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
        setScanPreviewImage(null)
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
            // Abort ongoing scan request if exists
            const controller = scanAbortControllersRef.current.get(id)
            if (controller) {
                controller.abort()
                scanAbortControllersRef.current.delete(id)
            }

            // Track as deleted to prevent resurrection from polling
            deletedIdsRef.current.add(id)

            const res = await deleteExpense(id)
            if (res.success) {
                showAlert('Catatan berhasil dihapus')
                setExpenses(prev => prev.filter(c => c.id !== id))
            } else {
                // Rollback: remove from deleted set if delete failed
                deletedIdsRef.current.delete(id)
                showError(res.error || 'Gagal menghapus pengeluaran')
            }
        } catch (error) {
            deletedIdsRef.current.delete(id)
            console.error(error)
            showError('Terjadi kesalahan sistem')
        } finally {
            setDeletingId(null)
        }
    }

    const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => {
            setScanPreviewImage(reader.result as string)
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleScanConfirm = async () => {
        if (!scanPreviewImage || !scanCategoryId) return

        setIsScanUploading(true)
        try {
            const res = await createExpenseDraft({
                categoryId: scanCategoryId,
                date: new Date(),
                image: scanPreviewImage,
            })

            if (res.success && res.data) {
                const addedCat = categories.find(c => c.id === scanCategoryId)
                setExpenses(prev => [{
                    ...(res.data as any),
                    name: 'Sedang memproses...',
                    amount: '0',
                    status: 'scanning',
                    category: addedCat,
                } as Expense, ...prev])

                setIsModalOpen(false)
                setScanPreviewImage(null)
                showAlert('Foto diunggah, sedang diproses AI...')

                const abortController = new AbortController()
                scanAbortControllersRef.current.set(res.data.id, abortController)

                fetch('/api/scan-receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expenseId: res.data.id, imageBase64: scanPreviewImage }),
                    signal: abortController.signal,
                }).then(() => {
                    scanAbortControllersRef.current.delete(res.data!.id)
                    fetchExpenses(true)
                }).catch(err => {
                    if (err.name !== 'AbortError') console.error(err)
                })
            } else {
                showError(res.error || 'Gagal menyimpan draft')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan saat upload')
        } finally {
            setIsScanUploading(false)
        }
    }

    const handleApprove = async (id: string) => {
        try {
            const res = await approveExpense(id)
            if (res.success) {
                showAlert('Pengeluaran berhasil diapprove')
                setExpenses(prev => prev.map(exp => exp.id === id ? { ...exp, status: 'approved' } : exp))
            } else {
                showError(res.error || 'Gagal approve')
            }
        } catch (error) {
            console.error(error)
            showError('Terjadi kesalahan')
        }
    }

    const approvedExpenses = expenses.filter(e => e.status === 'approved' || !e.status)

    const totalAmount = approvedExpenses.reduce((acc, current) => {
        const val = parseFloat(current.amount)
        return acc + (isNaN(val) ? 0 : val)
    }, 0)

    const categoryDistribution = approvedExpenses.reduce((acc, exp) => {
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
            <TableResponsive
                data={expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                loading={isLoadingData}
                header={
                    <TableHeaderContent
                        title="Riwayat Pengeluaran"
                        description="Seluruh pengeluaran pribadi Anda beserta buktinya."
                        actions={
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <div className="flex flex-col sm:flex-row items-center gap-2 bg-background p-1.5 border border-border rounded-lg">
                                    <div className="flex items-center gap-2 px-2">
                                        <span className="text-sm text-muted-foreground font-medium">Periode:</span>
                                        <select
                                            value={periodType}
                                            onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                                            className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer text-foreground"
                                        >
                                            <option value="daily">Harian</option>
                                            <option value="weekly">Mingguan</option>
                                            <option value="monthly">Bulanan</option>
                                            <option value="yearly">Tahunan</option>
                                        </select>
                                    </div>
                                    <div className="hidden sm:block w-px h-5 bg-border" />
                                    <div className="flex items-center gap-2 px-2">
                                        {periodType === 'daily' && (
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer min-w-[130px]"
                                            />
                                        )}
                                        {periodType === 'weekly' && (
                                            <input
                                                type="week"
                                                value={`${new Date(selectedDate).getFullYear()}-W${getWeekNumber(new Date(selectedDate))}`}
                                                onChange={(e) => {
                                                    if (!e.target.value) return
                                                    const [y, w] = e.target.value.split('-W')
                                                    const date = getDateOfISOWeek(parseInt(w), parseInt(y))
                                                    setSelectedDate(date.toISOString().substring(0, 10))
                                                }}
                                                className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer min-w-[130px]"
                                            />
                                        )}
                                        {periodType === 'monthly' && (
                                            <input
                                                type="month"
                                                value={selectedDate.substring(0, 7)}
                                                onChange={(e) => setSelectedDate(`${e.target.value}-01`)}
                                                className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer min-w-[130px]"
                                            />
                                        )}
                                        {periodType === 'yearly' && (
                                            <select
                                                value={new Date(selectedDate).getFullYear()}
                                                onChange={(e) => setSelectedDate(`${e.target.value}-01-01`)}
                                                className="px-2 py-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer min-w-[100px]"
                                            >
                                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    {(periodType === 'weekly') && (
                                        <div className="text-xs text-muted-foreground px-2 bg-muted/50 rounded py-1 whitespace-nowrap">
                                            {format(new Date(startDate), 'dd MMM', { locale: localeId })} - {format(new Date(endDate), 'dd MMM yyyy', { locale: localeId })}
                                        </div>
                                    )}
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
                }
                renderMobileCard={(item) => (
                    <TableMobileCard key={item.id}>
                        <TableMobileCardHeader>
                            <div className="flex flex-col gap-0.5">
                                <h4 className="font-bold text-sm tracking-tight text-foreground">{item.name}</h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(item.date), 'dd MMM yyyy', { locale: localeId })}
                                    <span>•</span>
                                    <span>{format(new Date(item.createdAt || item.date), 'HH:mm')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleOpenModal(item)}
                                    className="p-2 text-blue-600 bg-blue-500/10 rounded-lg transition-colors"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={deletingId === item.id}
                                    className="p-2 text-red-600 bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {deletingId === item.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </TableMobileCardHeader>

                        <TableMobileCardContent>
                            <div className="flex items-center justify-between col-span-2 bg-muted/30 p-2.5 rounded-lg border border-border/10">
                                <span className="px-2 py-1 bg-white border border-border text-foreground rounded-lg text-[10px] font-bold shadow-sm">
                                    {item.category?.name || 'Umum'}
                                </span>
                                <span className="font-black text-sm text-foreground tabular-nums">
                                    {formatCurrency(item.amount)}
                                </span>
                            </div>
                        </TableMobileCardContent>

                        <TableMobileCardFooter>
                            <div>
                                {item.hasImage ? (
                                    <button
                                        onClick={async () => {
                                            const res = await getExpenseImage(item.id)
                                            if (res.success && res.data) {
                                                setPreviewImage(res.data)
                                                setIsPreviewOpen(true)
                                            }
                                        }}
                                        className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1.5 rounded-lg transition-all hover:bg-primary/20"
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        Lihat Bukti PDF
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground font-medium italic bg-muted/50 px-2.5 py-1.5 rounded-lg border border-dotted border-border">
                                        Tanpa lampiran bukti
                                    </span>
                                )}
                            </div>
                        </TableMobileCardFooter>
                    </TableMobileCard>
                )}
            >
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
                            expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, idx) => {
                                const isScanning = item.status === 'scanning'
                                const isDraft = item.status === 'draft'

                                return (
                                <TableRow key={item.id} className={isDraft ? 'bg-amber-50/50 dark:bg-amber-950/10' : isScanning ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}>
                                    <TableCell align="center" className="text-muted-foreground">{(currentPage - 1) * itemsPerPage + idx + 1}</TableCell>
                                    <TableCell className="font-medium whitespace-nowrap">
                                        {format(new Date(item.date), 'dd MMM yyyy', { locale: localeId })}
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            Jam {format(new Date(item.createdAt || item.date), 'HH:mm')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                                                {item.category?.name || '-'}
                                            </span>
                                            {isDraft && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded border border-amber-200">
                                                    Draft
                                                </span>
                                            )}
                                            {isScanning && (
                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded border border-blue-200 animate-pulse">
                                                    Scanning
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {isScanning ? (
                                            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                        ) : item.name}
                                    </TableCell>
                                    <TableCell align="right" className="font-semibold text-foreground">
                                        {isScanning ? (
                                            <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" />
                                        ) : formatCurrency(item.amount)}
                                    </TableCell>
                                    <TableCell align="center">
                                        {item.hasImage ? (
                                            <button
                                                onClick={async () => {
                                                    const res = await getExpenseImage(item.id)
                                                    if (res.success && res.data) {
                                                        setPreviewImage(res.data)
                                                        setIsPreviewOpen(true)
                                                    }
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
                                        <div className="flex items-center justify-center gap-1.5">
                                            {isDraft && (
                                                <button
                                                    onClick={() => handleApprove(item.id)}
                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50/50 rounded-md transition-colors"
                                                    title="Approve"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            {!isScanning && (
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50/50 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
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
                                )
                            })
                        )}
                    </TableBody>
                    {expenses.length > 0 && (
                        <TableFooter>
                            <TableRow hoverable={false}>
                                <TableCell colSpan={4} className="text-right font-bold py-4">Total Akumulasi</TableCell>
                                <TableCell align="right" className="font-bold text-lg text-primary py-4">
                                    {formatCurrency(totalAmount)}
                                </TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TableResponsive>

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
                    (modalTab === 'manual' || editingId) ? (
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
                    ) : undefined
                }
            >
                {/* Tabs (only show when not editing) */}
                {!editingId && (
                    <div className="flex bg-muted rounded-lg p-0.5 mb-4">
                        <button
                            type="button"
                            onClick={() => setModalTab('manual')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                modalTab === 'manual' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            Input Manual
                        </button>
                        <button
                            type="button"
                            onClick={() => setModalTab('scan')}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                modalTab === 'scan' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ScanLine className="w-4 h-4" />
                            Scan Struk
                        </button>
                    </div>
                )}

                {/* Scan Tab */}
                {modalTab === 'scan' && !editingId && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">
                                Kategori <span className="text-red-500">*</span>
                            </label>
                            <div className="relative" ref={scanCategoryDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsScanCategoryDropdownOpen(!isScanCategoryDropdownOpen)}
                                    className="w-full flex items-center justify-between px-3 py-2 border border-border bg-background rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
                                >
                                    <span className={scanCategoryId ? "text-foreground" : "text-muted-foreground"}>
                                        {scanCategoryId
                                            ? categories.find(c => c.id === scanCategoryId)?.name || 'Pilih Kategori'
                                            : 'Pilih Kategori'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </button>
                                {isScanCategoryDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden flex flex-col">
                                        <div className="p-2 border-b border-border shrink-0">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    placeholder="Cari kategori..."
                                                    value={scanCategorySearchQuery}
                                                    onChange={(e) => setScanCategorySearchQuery(e.target.value)}
                                                    className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-transparent focus:bg-background focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-md outline-none transition-all"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                            {categories.filter(c => c.name.toLowerCase().includes(scanCategorySearchQuery.toLowerCase())).map(cat => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setScanCategoryId(cat.id)
                                                        setIsScanCategoryDropdownOpen(false)
                                                        setScanCategorySearchQuery('')
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${scanCategoryId === cat.id
                                                        ? 'bg-primary/10 text-primary font-medium'
                                                        : 'hover:bg-muted text-foreground'
                                                    }`}
                                                >
                                                    {cat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-foreground">
                                Foto Struk <span className="text-red-500">*</span>
                            </label>
                            {!scanPreviewImage ? (
                                <>
                                    <input
                                        type="file"
                                        id="scan-file-input"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handleScanFileChange}
                                        className="hidden"
                                    />
                                    <div
                                        onClick={() => {
                                            if (!scanCategoryId) {
                                                showError('Pilih kategori terlebih dahulu!')
                                                return
                                            }
                                            document.getElementById('scan-file-input')?.click()
                                        }}
                                        className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                            !scanCategoryId ? 'border-border' : 'border-primary/30 hover:border-primary hover:bg-primary/5'
                                        }`}
                                    >
                                        <ScanLine className="w-10 h-10 text-primary/60" />
                                        <div className="text-center">
                                            <span className="text-sm font-semibold text-foreground">Ambil foto atau pilih dari galeri</span>
                                            <p className="text-xs text-muted-foreground mt-1">Klik untuk membuka kamera atau pilih file</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="relative border border-border rounded-xl overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={scanPreviewImage} alt="Preview struk" className="w-full max-h-64 object-contain bg-muted/30" />
                                    <button
                                        type="button"
                                        onClick={() => setScanPreviewImage(null)}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors"
                                        title="Hapus foto"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            {!scanCategoryId && (
                                <p className="text-xs text-amber-600 font-medium">Pilih kategori terlebih dahulu</p>
                            )}
                        </div>

                        {scanPreviewImage && (
                            <button
                                type="button"
                                onClick={handleScanConfirm}
                                disabled={isScanUploading || !scanCategoryId}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isScanUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ScanLine className="w-4 h-4" />
                                )}
                                {isScanUploading ? 'Memproses...' : 'Scan Sekarang'}
                            </button>
                        )}
                    </div>
                )}

                {/* Manual Tab (existing form) */}
                {(modalTab === 'manual' || editingId) && (
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
                )}
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
