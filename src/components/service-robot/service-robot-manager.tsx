'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Search, Bot, MessageCircle, BarChart3, Download, ArrowUpDown, ArrowUp, ArrowDown, Truck, Camera, ImageIcon, DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import { createServiceRobot, updateServiceRobot, deleteServiceRobot, getServiceRobots } from '@/app/actions/service-robot'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import ImportServiceRobotModal from './import-service-robot-modal'
import SendResiModal from './send-resi-modal'
import { processImageFile } from '@/utils/image-compression'
import Image from 'next/image'
import Modal from '@/components/ui/modal'
import ImagePreviewModal from '@/components/ui/image-preview-modal'
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
    TableHeaderContent,
    TablePagination,
} from '@/components/ui/table'

interface ServiceRobot {
    id: string
    entryDate: Date
    customerName: string
    customerAddress: string
    customerPhone: string
    robotType: string
    accessories: string | null
    warrantyStatus: string
    complaint: string
    serviceStatus: string
    serviceNotes: string | null
    image: string | null
}

interface ServiceRobotManagerProps {
    initialServices: ServiceRobot[]
    totalPages: number
    currentPage: number
    totalCount: number
    products: string[]
    customers: { name: string; address: string; phone: string }[]
    isAdmin?: boolean
    analysisData?: {
        totalServices: number
        statusCounts: {
            PENDING: number
            IN_PROGRESS: number
            DONE: number
            DELIVERED: number
            CANCELLED: number
        }
        topRobotTypes: {
            name: string
            count: number
        }[]
    }
    financialData?: {
        totalRevenue: number
        totalOrders: number
        thisMonthRevenue: number
        thisMonthOrders: number
        averageOrderValue: number
        monthlyRevenue: number[]
    }
}

const statusOptions = [
    { value: 'PENDING', label: 'Service Masuk', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    { value: 'IN_PROGRESS', label: 'Dikerjakan', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { value: 'DONE', label: 'Selesai', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    { value: 'DELIVERED', label: 'Dikirim', color: 'bg-emerald-600 text-white border-emerald-600' },
]

const STATUS_COLORS = {
    'PENDING': 'bg-red-500',
    'IN_PROGRESS': 'bg-blue-500',
    'DONE': 'bg-green-500',
    'DELIVERED': 'bg-emerald-700',
    'CANCELLED': 'bg-gray-500'
}

export default function ServiceRobotManager({ initialServices, totalPages, currentPage, totalCount, products, customers, analysisData, financialData, isAdmin = false }: ServiceRobotManagerProps) {
    const router = useRouter()
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()

    const [saving, setSaving] = useState(false)
    const [isLoadingExport, setIsLoadingExport] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [showProductSuggestions, setShowProductSuggestions] = useState(false)
    const [filteredCustomers, setFilteredCustomers] = useState<{ name: string; address: string; phone: string }[]>([])
    const [filteredProducts, setFilteredProducts] = useState<string[]>([])
    const [editingService, setEditingService] = useState<ServiceRobot | null>(null)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

    // Status Modal State
    const [statusModalOpen, setStatusModalOpen] = useState(false)
    const [selectedStatusService, setSelectedStatusService] = useState<ServiceRobot | null>(null)
    const [tempStatus, setTempStatus] = useState('')

    // Solution Modal State
    const [solutionModalOpen, setSolutionModalOpen] = useState(false)
    const [currentSolutionService, setCurrentSolutionService] = useState<ServiceRobot | null>(null)
    const [solutionText, setSolutionText] = useState('')

    // Resi Modal State
    const [resiModalOpen, setResiModalOpen] = useState(false)
    const [resiService, setResiService] = useState<ServiceRobot | null>(null)

    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

    // Lock body scroll when any modal is open
    useEffect(() => {
        if (isAdding || statusModalOpen || solutionModalOpen || resiModalOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isAdding, statusModalOpen, solutionModalOpen, resiModalOpen])

    // Sorting State (null = use server order, which is createdAt desc)
    type SortConfig = {
        key: keyof ServiceRobot
        direction: 'asc' | 'desc'
    }
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

    // Status Filter State - initialize from URL params
    const initStatusFilters = () => {
        const statusParam = searchParams.get('status')
        if (statusParam) {
            const activeStatuses = statusParam.split(',')
            return {
                PENDING: activeStatuses.includes('PENDING'),
                IN_PROGRESS: activeStatuses.includes('IN_PROGRESS'),
                DONE: activeStatuses.includes('DONE'),
                DELIVERED: activeStatuses.includes('DELIVERED'),
            }
        }
        // All selected by default
        return {
            PENDING: true,
            IN_PROGRESS: true,
            DONE: true,
            DELIVERED: true,
        }
    }
    const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>(initStatusFilters)

    const toggleStatusFilter = (status: string) => {
        const newFilters = { ...statusFilters, [status]: !statusFilters[status] }
        setStatusFilters(newFilters)

        // Build status param from active filters
        const activeStatuses = Object.entries(newFilters)
            .filter(([_, active]) => active)
            .map(([s]) => s)

        const params = new URLSearchParams(window.location.search)
        params.set('page', '1')
        if (activeStatuses.length < 4) {
            params.set('status', activeStatuses.join(','))
        } else {
            params.delete('status') // All selected = no filter
        }
        router.push(`/service-robot?${params.toString()}`)
    }

    // Form state
    const [formData, setFormData] = useState({
        entryDate: new Date().toISOString().split('T')[0],
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        robotType: '',
        accessories: '',
        warrantyStatus: 'TIDAK',
        complaint: '',
        serviceStatus: 'PENDING',
        serviceNotes: '',
    })

    // Image state
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const processedFile = await processImageFile(file, (msg) => showAlert(msg, 'error'))
            if (!processedFile) {
                e.target.value = ''
                return
            }

            setImageFile(processedFile)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(processedFile)
            setRemoveImage(false)
        }
    }

    const resetForm = () => {
        setFormData({
            entryDate: new Date().toISOString().split('T')[0],
            customerName: '',
            customerAddress: '',
            customerPhone: '',
            robotType: '',
            accessories: '',
            warrantyStatus: 'TIDAK',
            complaint: '',
            serviceStatus: 'PENDING',
            serviceNotes: '',
        })
        setImagePreview(null)
        setImageFile(null)
        setRemoveImage(false)
    }

    const openAddForm = () => {
        resetForm()
        setEditingService(null)
        setIsAdding(true)
    }

    const openEditForm = (service: ServiceRobot) => {
        setFormData({
            entryDate: new Date(service.entryDate).toISOString().split('T')[0],
            customerName: service.customerName,
            customerAddress: service.customerAddress,
            customerPhone: service.customerPhone,
            robotType: service.robotType,
            accessories: service.accessories || '',
            warrantyStatus: service.warrantyStatus,
            complaint: service.complaint,
            serviceStatus: service.serviceStatus,
            serviceNotes: service.serviceNotes || '',
        })
        setImagePreview(service.image || null)
        setImageFile(null)
        setRemoveImage(false)
        setEditingService(service)
        setIsAdding(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            // Build FormData
            const fd = new FormData()
            fd.append('entryDate', formData.entryDate)
            fd.append('customerName', formData.customerName)
            fd.append('customerAddress', formData.customerAddress)
            fd.append('customerPhone', formData.customerPhone)
            fd.append('robotType', formData.robotType)
            fd.append('accessories', formData.accessories || '')
            fd.append('warrantyStatus', formData.warrantyStatus)
            fd.append('complaint', formData.complaint)
            fd.append('serviceStatus', formData.serviceStatus)
            fd.append('serviceNotes', formData.serviceNotes || '')

            if (imageFile) {
                fd.append('image', imageFile)
            }
            if (removeImage) {
                fd.append('removeImage', 'true')
            }

            if (editingService) {
                await updateServiceRobot(editingService.id, fd)
                showAlert('Data service berhasil diupdate', 'success')
            } else {
                await createServiceRobot(fd)
                showAlert('Data service berhasil ditambahkan', 'success')
            }
            setIsAdding(false)
            resetForm()
            router.refresh()
        } catch (error: any) {
            showAlert(error.message || 'Terjadi kesalahan', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (service: ServiceRobot) => {
        showConfirmation({
            title: 'Hapus Data Service',
            message: `Apakah Anda yakin ingin menghapus data service untuk "${service.customerName}"?`,
            action: async () => {
                try {
                    await deleteServiceRobot(service.id)
                    showAlert('Data service berhasil dihapus', 'success')
                    router.refresh()
                } catch (error: any) {
                    showAlert(error.message || 'Gagal menghapus data', 'error')
                }
            }
        })
    }

    const handleStatusClick = (service: ServiceRobot) => {
        setSelectedStatusService(service)
        setTempStatus(service.serviceStatus)
        setStatusModalOpen(true)
    }

    const handleSaveStatus = async () => {
        if (!selectedStatusService) return
        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('serviceStatus', tempStatus)
            await updateServiceRobot(selectedStatusService.id, fd)
            showAlert('Status service berhasil diupdate', 'success')
            setStatusModalOpen(false)
            router.refresh()
        } catch (error: any) {
            showAlert(error.message || 'Gagal update status', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleSolutionClick = (service: ServiceRobot) => {
        setCurrentSolutionService(service)
        setSolutionText(service.serviceNotes || '')
        setSolutionModalOpen(true)
    }

    const handleSaveSolution = async () => {
        if (!currentSolutionService) return
        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('serviceNotes', solutionText)
            await updateServiceRobot(currentSolutionService.id, fd)
            showAlert('Solusi berhasil disimpan', 'success')
            setSolutionModalOpen(false)
            router.refresh()
        } catch (error: any) {
            showAlert(error.message || 'Gagal menyimpan solusi', 'error')
        } finally {
            setSaving(false)
        }
    }

    // Sorting handler
    const handleSort = (key: keyof ServiceRobot) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'asc' }
        })
    }

    // Sort icon helper
    const SortIcon = ({ column }: { column: keyof ServiceRobot }) => {
        if (!sortConfig || sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-muted-foreground/30" />
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
            : <ArrowDown className="w-3 h-3 ml-1 text-primary" />
    }

    // Sort services (filtering is now done server-side)
    const filteredServices = (() => {
        let filtered = initialServices

        // Sort if sortConfig exists
        if (sortConfig) {
            filtered = [...filtered].sort((a, b) => {
                const { key, direction } = sortConfig
                let aValue: any = a[key]
                let bValue: any = b[key]

                // Handle Date comparison
                if (key === 'entryDate') {
                    aValue = new Date(aValue).getTime()
                    bValue = new Date(bValue).getTime()
                }

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1

                if (aValue < bValue) return direction === 'asc' ? -1 : 1
                if (aValue > bValue) return direction === 'asc' ? 1 : -1
                return 0
            })
        }
        return filtered
    })()

    // Sync search with URL
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(window.location.search)
            if (searchTerm) {
                params.set('search', searchTerm)
                params.set('page', '1')
            } else {
                params.delete('search')
            }
            router.push(`/service-robot?${params.toString()}`)
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [searchTerm, router])

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', newPage.toString())
        router.push(`/service-robot?${params.toString()}`)
    }

    const handleWhatsAppClick = (service: ServiceRobot) => {
        const statusLabel = statusOptions.find(o => o.value === service.serviceStatus)?.label || service.serviceStatus

        let message = `Halo Kak, *${service.customerName}*.\n\n`
        message += `Service robot Anda saat ini dalam status *${statusLabel}*.\n`
        message += `Untuk informasi lebih lanjut akan kami informasikan melalui whatsapp ini.\n\n`

        if (service.accessories) {
            message += `Kelengkapan yang kami terima :\n${service.accessories}\n\n`
        }

        message += `Best regards,\n*Ichibot*`

        // Remove 0 or 62 prefix and add 62
        let phone = service.customerPhone.replace(/\D/g, '')
        if (phone.startsWith('0')) phone = '62' + phone.substring(1)
        if (phone.startsWith('62')) phone = phone // already correct
        else if (!phone.startsWith('62')) phone = '62' + phone

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const getStatusBadge = (status: string, onClick?: () => void) => {
        const opt = statusOptions.find(o => o.value === status)
        return opt ? (
            <button
                onClick={onClick}
                className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-80",
                    opt.color,
                    onClick ? "cursor-pointer" : "cursor-default"
                )}
            >
                {opt.label}
            </button>
        ) : status
    }



    async function handleExport() {
        setIsLoadingExport(true)
        try {
            const XLSX = await import('xlsx')
            const serviceData = await getServiceRobots()

            // Headers matching import template
            const headers = [
                'Tanggal Masuk',
                'Nama Pelanggan',
                'Alamat',
                'No Telepon',
                'Jenis Robot',
                'Kelengkapan',
                'Status Garansi',
                'Keluhan',
                'Status Service',
                'Solusi'
            ]

            const rows = serviceData.map((s: any) => [
                new Date(s.entryDate).toISOString().split('T')[0], // YYYY-MM-DD format for easy re-import
                s.customerName,
                s.customerAddress || '',
                s.customerPhone || '',
                s.robotType,
                s.accessories || '',
                s.warrantyStatus === 'YA' ? 'Ya' : 'Tidak',
                s.complaint || '',
                statusOptions.find(opt => opt.value === s.serviceStatus)?.label || s.serviceStatus,
                s.serviceNotes || ''
            ])

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

            const wscols = [
                { wch: 15 },  // Tanggal Masuk
                { wch: 25 },  // Nama Pelanggan
                { wch: 40 },  // Alamat
                { wch: 15 },  // No Telepon
                { wch: 20 },  // Jenis Robot
                { wch: 30 },  // Kelengkapan
                { wch: 15 },  // Status Garansi
                { wch: 40 },  // Keluhan
                { wch: 15 },  // Status Service
                { wch: 40 },  // Solusi
            ]
            ws['!cols'] = wscols

            XLSX.utils.book_append_sheet(wb, ws, 'Data Service')
            XLSX.writeFile(wb, `Data_Service_Robot_${new Date().toISOString().split('T')[0]}.xlsx`)

        } catch (error) {
            console.error('Export failed:', error)
            showAlert('Gagal mengexport data service', 'error')
        } finally {
            setIsLoadingExport(false)
        }
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header Actions - Mobile */}
                <div className="flex gap-2 flex-1 md:hidden">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Cari nama, no HP, jenis robot..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div className="flex gap-2">
                        <ImportServiceRobotModal isAdmin={isAdmin} validRobotTypes={products} />
                        <button
                            onClick={handleExport}
                            disabled={isLoadingExport}
                            className="p-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Export to Excel"
                        >
                            {isLoadingExport ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                        </button>
                        <button
                            onClick={openAddForm}
                            className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-sm"
                            title="Tambah Service"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Status Filter Buttons - Mobile */}
                <div className="flex flex-wrap items-center gap-2 mb-4 md:hidden">
                    <span className="text-xs font-bold text-foreground">Filter :</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {[
                            { key: 'PENDING', label: 'Service Masuk', color: 'red' },
                            { key: 'IN_PROGRESS', label: 'Dikerjakan', color: 'blue' },
                            { key: 'DONE', label: 'Selesai', color: 'green' },
                            { key: 'DELIVERED', label: 'Dikirim', color: 'emerald' },
                        ].map((f) => {
                            const isSelected = statusFilters[f.key]
                            const colorMap: Record<string, string> = {
                                red: isSelected ? 'bg-red-500/10 border-red-500/30 text-red-600' : '',
                                blue: isSelected ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' : '',
                                green: isSelected ? 'bg-green-500/10 border-green-500/30 text-green-600' : '',
                                emerald: isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : '',
                            }
                            const dotMap: Record<string, string> = {
                                red: isSelected ? 'bg-red-500 ring-red-500/20' : '',
                                blue: isSelected ? 'bg-blue-500 ring-blue-500/20' : '',
                                green: isSelected ? 'bg-green-500 ring-green-500/20' : '',
                                emerald: isSelected ? 'bg-emerald-500 ring-emerald-500/20' : '',
                            }
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => toggleStatusFilter(f.key)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all',
                                        isSelected ? colorMap[f.color] : 'bg-background border-border text-muted-foreground/50 hover:bg-muted'
                                    )}
                                >
                                    <div className={cn(
                                        'w-1.5 h-1.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent',
                                        isSelected ? dotMap[f.color] : 'bg-muted-foreground/20 ring-transparent'
                                    )} />
                                    {f.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Modal Form */}
                {isAdding && (
                    <Modal
                        isOpen={isAdding}
                        onClose={() => setIsAdding(false)}
                        title={editingService ? 'Edit Service' : 'Tambah Service Baru'}
                        maxWidth="2xl"
                        footer={
                            <div className="flex justify-end gap-3 w-full">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    disabled={saving}
                                    className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors font-medium border border-border"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    form="service-robot-form"
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold disabled:opacity-50 flex items-center gap-2 hover:shadow-lg transition-all"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingService ? 'Update' : 'Simpan'}
                                </button>
                            </div>
                        }
                    >
                        <form id="service-robot-form" onSubmit={handleSubmit} className="flex flex-col flex-1">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Tanggal Masuk</label>
                                        <input
                                            type="date"
                                            value={formData.entryDate}
                                            onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Nama Pelanggan</label>
                                        <input
                                            type="text"
                                            value={formData.customerName}

                                            required
                                            placeholder="Nama lengkap"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                            onFocus={() => {
                                                if (formData.customerName) {
                                                    const filtered = customers.filter(c =>
                                                        c.name.toLowerCase().includes(formData.customerName.toLowerCase())
                                                    )
                                                    setFilteredCustomers(filtered)
                                                    setShowSuggestions(true)
                                                }
                                            }}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                setFormData({ ...formData, customerName: value })
                                                if (value) {
                                                    const filtered = customers.filter(c =>
                                                        c.name.toLowerCase().includes(value.toLowerCase())
                                                    )
                                                    setFilteredCustomers(filtered)
                                                    setShowSuggestions(true)
                                                } else {
                                                    setShowSuggestions(false)
                                                }
                                            }}
                                            onBlur={() => {
                                                // Delay hiding suggestions to allow clicking
                                                setTimeout(() => setShowSuggestions(false), 200)
                                            }}
                                        />
                                        {showSuggestions && filteredCustomers.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                                                {filteredCustomers.map((customer, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                customerName: customer.name,
                                                                customerAddress: customer.address,
                                                                customerPhone: customer.phone
                                                            })
                                                            setShowSuggestions(false)
                                                        }}
                                                    >
                                                        <div className="font-medium">{customer.name}</div>
                                                        <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Alamat</label>
                                        <textarea
                                            value={formData.customerAddress}
                                            onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                            required
                                            placeholder="Alamat lengkap"
                                            rows={2}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">No HP</label>
                                        <input
                                            type="text"
                                            value={formData.customerPhone}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, '')
                                                setFormData({ ...formData, customerPhone: value })
                                            }}
                                            required
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Jenis Robot</label>
                                        <input
                                            type="text"
                                            value={formData.robotType}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                setFormData({ ...formData, robotType: value })
                                                if (value) {
                                                    const filtered = products.filter(p =>
                                                        p.toLowerCase().includes(value.toLowerCase())
                                                    )
                                                    setFilteredProducts(filtered)
                                                    setShowProductSuggestions(true)
                                                } else {
                                                    setShowProductSuggestions(false)
                                                }
                                            }}
                                            onFocus={() => {
                                                setFilteredProducts(products)
                                                setShowProductSuggestions(true)
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setShowProductSuggestions(false), 200)
                                            }}
                                            required
                                            placeholder="Pilih atau ketik jenis robot"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        />
                                        {showProductSuggestions && filteredProducts.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                                                {filteredProducts.map((product, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                                        onClick={() => {
                                                            setFormData({ ...formData, robotType: product })
                                                            setShowProductSuggestions(false)
                                                        }}
                                                    >
                                                        {product}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Kelengkapan</label>
                                        <textarea
                                            value={formData.accessories}
                                            onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                                            placeholder="Charger, remote, dll"
                                            rows={2}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Status Garansi</label>
                                        <select
                                            value={formData.warrantyStatus}
                                            onChange={(e) => setFormData({ ...formData, warrantyStatus: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        >
                                            <option value="TIDAK">Tidak Garansi</option>
                                            <option value="YA">Masih Garansi</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Keluhan</label>
                                        <textarea
                                            value={formData.complaint}
                                            onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                                            required
                                            placeholder="Jelaskan keluhan/kerusakan"
                                            rows={3}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                                        />
                                    </div>

                                    {/* Image Upload */}
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">Foto Robot (Opsional)</label>
                                        {imagePreview ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setImagePreview(null)
                                                        setImageFile(null)
                                                        setRemoveImage(editingService?.image ? true : false)
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                <div className="text-center mb-3">
                                                    <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-sm text-muted-foreground">Upload gambar atau ambil foto</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Format: JPG, PNG, WEBP, GIF (maks 1MB)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                            <Camera className="w-4 h-4" />
                                                            Ambil Foto
                                                        </div>
                                                    </label>
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                            <ImageIcon className="w-4 h-4" />
                                                            Pilih File
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>

                        </form>
                    </Modal>
                )}

                {/* Desktop Table */}
                <div className="hidden md:block">
                    <TableWrapper>
                        <TableHeaderContent
                            title="Service Robot"
                            description="Kelola service dan maintenance robot."
                            icon={<Bot className="w-5 h-5 font-bold text-primary" />}
                            actions={
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Cari nama, HP, robot..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary transition-all shadow-sm"
                                        />
                                    </div>
                                    <ImportServiceRobotModal isAdmin={isAdmin} validRobotTypes={products} />
                                    <button
                                        onClick={handleExport}
                                        disabled={isLoadingExport}
                                        className="p-2 border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        title="Export to Excel"
                                    >
                                        {isLoadingExport ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Download className="w-5 h-5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={openAddForm}
                                        className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-bold shadow-sm text-sm"
                                        title="Tambah Service"
                                    >
                                        <Plus className="w-5 h-5" />
                                        <span className="hidden lg:inline">Tambah</span>
                                    </button>
                                </div>
                            }
                        />

                        {/* Status Filter */}
                        <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap items-center gap-4">
                            <span className="text-xs font-bold text-foreground">Filter :</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {[
                                    { key: 'PENDING', label: 'Service Masuk', color: 'red' },
                                    { key: 'IN_PROGRESS', label: 'Dikerjakan', color: 'blue' },
                                    { key: 'DONE', label: 'Selesai', color: 'green' },
                                    { key: 'DELIVERED', label: 'Dikirim', color: 'emerald' },
                                ].map((f) => {
                                    const isSelected = statusFilters[f.key]
                                    const colorMap: Record<string, string> = {
                                        red: isSelected ? 'bg-red-500/10 border-red-500/30 text-red-600' : '',
                                        blue: isSelected ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' : '',
                                        green: isSelected ? 'bg-green-500/10 border-green-500/30 text-green-600' : '',
                                        emerald: isSelected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : '',
                                    }
                                    const dotMap: Record<string, string> = {
                                        red: isSelected ? 'bg-red-500 ring-red-500/20' : '',
                                        blue: isSelected ? 'bg-blue-500 ring-blue-500/20' : '',
                                        green: isSelected ? 'bg-green-500 ring-green-500/20' : '',
                                        emerald: isSelected ? 'bg-emerald-500 ring-emerald-500/20' : '',
                                    }
                                    return (
                                        <button
                                            key={f.key}
                                            onClick={() => toggleStatusFilter(f.key)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all',
                                                isSelected ? colorMap[f.color] : 'bg-background border-border text-muted-foreground/50 hover:bg-muted'
                                            )}
                                        >
                                            <div className={cn(
                                                'w-1.5 h-1.5 rounded-full ring-2 ring-offset-1 ring-offset-transparent',
                                                isSelected ? dotMap[f.color] : 'bg-muted-foreground/20 ring-transparent'
                                            )} />
                                            {f.label}
                                        </button>
                                    )
                                })}

                                <div className="h-4 w-[1px] bg-border mx-1" />

                                <button
                                    onClick={() => {
                                        const allSelected = Object.values(statusFilters).every(v => v)
                                        const newFilters = Object.keys(statusFilters).reduce((acc, key) => ({ ...acc, [key]: !allSelected }), {} as Record<string, boolean>)
                                        setStatusFilters(newFilters)
                                        const activeStatuses = Object.entries(newFilters).filter(([_, active]) => active).map(([s]) => s)
                                        const params = new URLSearchParams(window.location.search)
                                        params.set('page', '1')
                                        if (activeStatuses.length < 4) params.set('status', activeStatuses.join(','))
                                        else params.delete('status')
                                        router.push(`/service-robot?${params.toString()}`)
                                    }}
                                    className="text-[10px] font-bold text-primary hover:underline px-2"
                                >
                                    {Object.values(statusFilters).every(v => v) ? 'Unselect All' : 'Select All'}
                                </button>
                            </div>
                        </div>

                        <TableScrollArea>
                            <Table>
                                <TableHeader>
                                    <TableRow hoverable={false} className="bg-muted/50">
                                        <TableHead>
                                            <button onClick={() => handleSort('entryDate')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                                Tgl Masuk <SortIcon column="entryDate" />
                                            </button>
                                        </TableHead>
                                        <TableHead>Foto</TableHead>
                                        <TableHead>
                                            <button onClick={() => handleSort('customerName')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                                Pelanggan <SortIcon column="customerName" />
                                            </button>
                                        </TableHead>
                                        <TableHead>
                                            <button onClick={() => handleSort('robotType')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                                Jenis Robot <SortIcon column="robotType" />
                                            </button>
                                        </TableHead>
                                        <TableHead>Kelengkapan</TableHead>
                                        <TableHead>Keluhan</TableHead>
                                        <TableHead>
                                            <button onClick={() => handleSort('serviceStatus')} className="flex items-center gap-1 hover:text-primary transition-colors">
                                                Status <SortIcon column="serviceStatus" />
                                            </button>
                                        </TableHead>
                                        <TableHead align="right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredServices.length === 0 ? (
                                        <TableEmpty
                                            colSpan={8}
                                            message="Belum ada data service."
                                            icon={<Bot className="w-12 h-12 opacity-20" />}
                                        />
                                    ) : (
                                        filteredServices.map((service) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="font-medium">{new Date(service.entryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                    <div className="text-xs text-muted-foreground">{new Date(service.entryDate).toLocaleDateString('id-ID', { weekday: 'long' })} - {new Date(service.entryDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {service.image ? (
                                                        <button type="button" onClick={() => setPreviewImage({ url: service.image!, name: `${service.customerName} - ${service.robotType}` })} className="block">
                                                            <img
                                                                src={service.image}
                                                                alt="Robot"
                                                                className="w-10 h-10 object-cover rounded-lg border border-border hover:border-primary hover:opacity-80 transition-all cursor-pointer"
                                                            />
                                                        </button>
                                                    ) : (
                                                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                                            <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="min-w-0">
                                                    <div className="flex items-start gap-2">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                            service.serviceStatus === 'PENDING' && "bg-red-500",
                                                            service.serviceStatus === 'IN_PROGRESS' && "bg-blue-500",
                                                            (service.serviceStatus === 'DONE' || service.serviceStatus === 'DELIVERED') && "bg-green-500"
                                                        )} />
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-foreground truncate">{service.customerName}</div>
                                                            <div className="text-xs font-mono text-muted-foreground my-0.5">{service.customerPhone}</div>
                                                            <div className="text-xs text-muted-foreground line-clamp-2">{service.customerAddress}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="font-medium text-foreground">{service.robotType}</div>
                                                    <div className="mt-1">
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                            service.warrantyStatus === 'YA'
                                                                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                                                : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                                        )}>
                                                            {service.warrantyStatus === 'YA' ? 'Garansi' : 'Tidak Garansi'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs min-w-[150px] whitespace-pre-wrap">{service.accessories || '-'}</TableCell>
                                                <TableCell className="min-w-[200px]">
                                                    <div className="text-xs whitespace-pre-wrap text-foreground mb-2">{service.complaint}</div>
                                                    <div className="pt-2 border-t border-border border-dashed">
                                                        {service.serviceNotes ? (
                                                            <div
                                                                className="group cursor-pointer"
                                                                onClick={() => handleSolutionClick(service)}
                                                            >
                                                                <div className="flex items-center gap-1 text-xs font-bold text-green-600 mb-1">
                                                                    <span>Solusi:</span>
                                                                    <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="text-xs text-muted-foreground whitespace-pre-wrap group-hover:text-foreground transition-colors">
                                                                    {service.serviceNotes}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSolutionClick(service)}
                                                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Input Penyelesaian
                                                            </button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {getStatusBadge(service.serviceStatus, () => handleStatusClick(service))}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleWhatsAppClick(service)}
                                                            className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded-lg"
                                                            title="Hubungi via WhatsApp"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </button>
                                                        {(service.serviceStatus === 'DONE' || service.serviceStatus === 'DELIVERED') && (
                                                            <button
                                                                onClick={() => { setResiService(service); setResiModalOpen(true); }}
                                                                className="p-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 rounded-lg"
                                                                title="Kirim Resi"
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openEditForm(service)}
                                                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(service)}
                                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableScrollArea>

                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                            itemsPerPage={20}
                            totalCount={totalCount}
                        />
                    </TableWrapper>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden space-y-4">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-start gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full mt-2 shrink-0",
                                        STATUS_COLORS[service.serviceStatus as keyof typeof STATUS_COLORS] || 'bg-gray-500'
                                    )} />
                                    <div>
                                        <p className="font-bold text-foreground">{service.customerName}</p>
                                        <p className="text-xs text-muted-foreground">{service.customerPhone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(service.serviceStatus, () => handleStatusClick(service))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 py-2 border-y border-border/50 border-dashed">
                                <div className="shrink-0">
                                    {service.image ? (
                                        <button type="button" onClick={() => setPreviewImage({ url: service.image!, name: `${service.customerName} - ${service.robotType}` })} className="block">
                                            <img
                                                src={service.image}
                                                alt="Robot"
                                                className="w-14 h-14 object-cover rounded-lg border border-border"
                                            />
                                        </button>
                                    ) : (
                                        <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">Tgl Masuk</div>
                                    <div className="font-medium text-sm truncate">{new Date(service.entryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    <div className="text-[10px] text-muted-foreground">{new Date(service.entryDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-[11px] text-muted-foreground uppercase font-semibold mb-1 text-center">Garansi</div>
                                    <span className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                        service.warrantyStatus === 'YA'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-orange-500 text-white'
                                    )}>
                                        {service.warrantyStatus === 'YA' ? 'YA' : 'TIDAK'}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground font-medium">Jenis Robot:</span>
                                    <div className="font-bold">{service.robotType}</div>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-muted-foreground font-medium">Kelengkapan:</span>
                                    <div className="break-words line-clamp-2">{service.accessories || '-'}</div>
                                </div>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">Keluhan:</span>
                                <p className="text-foreground whitespace-pre-wrap">{service.complaint}</p>
                            </div>

                            <div className="text-sm border-t border-border pt-2 border-dashed">
                                {service.serviceNotes ? (
                                    <div
                                        className="group cursor-pointer"
                                        onClick={() => handleSolutionClick(service)}
                                    >
                                        <div className="flex items-center gap-1 text-xs font-bold text-green-600 mb-1">
                                            <span>Solusi Service:</span>
                                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <p className="text-foreground whitespace-pre-wrap group-hover:opacity-80 transition-opacity">{service.serviceNotes}</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleSolutionClick(service)}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Input Penyelesaian
                                    </button>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-border">
                                <button
                                    onClick={() => handleWhatsAppClick(service)}
                                    className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 rounded-lg"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                                {(service.serviceStatus === 'DONE' || service.serviceStatus === 'DELIVERED') && (
                                    <button
                                        onClick={() => { setResiService(service); setResiModalOpen(true); }}
                                        className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 rounded-lg"
                                        title="Kirim Resi"
                                    >
                                        <Truck className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => openEditForm(service)}
                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(service)}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredServices.length === 0 && (
                        <div className="bg-card border border-border rounded-xl p-12 text-center">
                            <Bot className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">Belum ada data service.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm md:hidden">
                    <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={20}
                        totalCount={totalCount}
                    />
                </div>
                {/* Status Update Modal */}
                <Modal
                    isOpen={statusModalOpen}
                    onClose={() => setStatusModalOpen(false)}
                    title="Update Status"
                    maxWidth="sm"
                    className="space-y-2"
                    footer={
                        <div className="flex justify-end gap-3 w-full">
                            <button
                                onClick={() => setStatusModalOpen(false)}
                                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveStatus}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Simpan Status
                            </button>
                        </div>
                    }
                >
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setTempStatus(option.value)}
                            className={cn(
                                "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                                tempStatus === option.value
                                    ? "bg-primary/5 border-primary ring-1 ring-primary"
                                    : "bg-background border-border hover:bg-accent"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center",
                                    tempStatus === option.value ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                                )}>
                                    {tempStatus === option.value && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <span className="font-medium">{option.label}</span>
                            </div>
                            <span className={cn(
                                "px-2 py-0.5 rounded text-xs",
                                option.color
                            )}>
                                {option.label}
                            </span>
                        </button>
                    ))}
                </Modal>
                {/* Solution Modal */}
                <Modal
                    isOpen={solutionModalOpen}
                    onClose={() => setSolutionModalOpen(false)}
                    title="Penyelesaian Masalah"
                    maxWidth="lg"
                    className="space-y-4"
                    footer={
                        <div className="flex justify-end gap-3 w-full">
                            <button
                                onClick={() => setSolutionModalOpen(false)}
                                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveSolution}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Simpan Solusi
                            </button>
                        </div>
                    }
                >
                    <div className="bg-muted/50 p-3 rounded-lg border border-border">
                        <span className="text-xs font-medium text-muted-foreground block mb-1">Keluhan Pelanggan:</span>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{currentSolutionService?.complaint}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Cara Penyelesaian / Solusi
                        </label>
                        <textarea
                            value={solutionText}
                            onChange={(e) => setSolutionText(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Jelaskan langkah-langkah penyelesaian..."
                            autoFocus
                        />
                    </div>
                </Modal>
                {/* Analysis Section */}
                {analysisData && (
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        {/* Status Summary */}
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Ringkasan Status
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Total Service</div>
                                    <div className="text-2xl font-bold text-foreground">{analysisData.totalServices}</div>
                                </div>
                                <div className="p-4 bg-red-500/10 rounded-lg">
                                    <div className="text-sm text-red-600 mb-1">Pending</div>
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{analysisData.statusCounts.PENDING}</div>
                                </div>
                                <div className="p-4 bg-blue-500/10 rounded-lg">
                                    <div className="text-sm text-blue-600 mb-1">In Progress</div>
                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{analysisData.statusCounts.IN_PROGRESS}</div>
                                </div>
                                <div className="p-4 bg-green-500/10 rounded-lg">
                                    <div className="text-sm text-green-600 mb-1">Selesai / Dikirim</div>
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                                        {(analysisData.statusCounts.DONE || 0) + (analysisData.statusCounts.DELIVERED || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Robot Types */}
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Bot className="w-5 h-5 text-primary" />
                                Top 5 Tipe Robot
                            </h3>
                            <div className="space-y-3">
                                {analysisData.topRobotTypes.map((type: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                {index + 1}
                                            </div>
                                            <span className="font-medium text-sm text-foreground">{type.name}</span>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-background border border-border text-xs font-mono font-medium">
                                            {type.count} pcs
                                        </span>
                                    </div>
                                ))}
                                {analysisData.topRobotTypes.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8">
                                        Belum ada data robot
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Financial Analysis */}
                        {financialData && (
                            <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-primary" />
                                    Analisa Keuangan Service
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-emerald-500/10 rounded-lg">
                                        <div className="text-xs text-emerald-600 mb-1">Total Pendapatan</div>
                                        <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Rp {formatNumber(financialData.totalRevenue)}</div>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 rounded-lg">
                                        <div className="text-xs text-blue-600 mb-1">Bulan Ini</div>
                                        <div className="text-xl font-bold text-blue-700 dark:text-blue-400">Rp {formatNumber(financialData.thisMonthRevenue)}</div>
                                        <div className="text-[10px] text-blue-500 mt-0.5">{financialData.thisMonthOrders} transaksi</div>
                                    </div>
                                    <div className="p-4 bg-purple-500/10 rounded-lg">
                                        <div className="text-xs text-purple-600 mb-1">Total Transaksi</div>
                                        <div className="text-xl font-bold text-purple-700 dark:text-purple-400">{financialData.totalOrders}</div>
                                    </div>
                                    <div className="p-4 bg-orange-500/10 rounded-lg">
                                        <div className="text-xs text-orange-600 mb-1">Rata-rata / Transaksi</div>
                                        <div className="text-xl font-bold text-orange-700 dark:text-orange-400">Rp {formatNumber(financialData.averageOrderValue)}</div>
                                    </div>
                                </div>

                                {/* Monthly Revenue Bar Chart */}
                                {financialData.monthlyRevenue.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-border">
                                        <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                            Pendapatan Bulanan Tahun {new Date().getFullYear()}
                                        </h4>
                                        <div className="h-[300px] w-full mt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={financialData.monthlyRevenue.map((rev, idx) => ({
                                                        name: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][idx],
                                                        total: rev
                                                    }))}
                                                    margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        width={60}
                                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                                        tickFormatter={(value: number) => {
                                                            if (value >= 1000000) return `Rp ${value / 1000000}M`
                                                            if (value >= 1000) return `Rp ${value / 1000}K`
                                                            return value.toString()
                                                        }}
                                                    />
                                                    <RechartsTooltip
                                                        cursor={false}
                                                        content={({ active, payload, label }: any) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-popover-foreground text-sm">
                                                                        <p className="font-semibold mb-1">{label} {new Date().getFullYear()}</p>
                                                                        <p className="text-primary font-bold">
                                                                            Rp {formatNumber(payload[0].value)}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        }}
                                                    />
                                                    <Bar
                                                        dataKey="total"
                                                        fill="#3b82f6"
                                                        radius={[4, 4, 0, 0]}
                                                        maxBarSize={50}
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* Send Resi Modal */}
            <SendResiModal
                isOpen={resiModalOpen}
                onClose={() => { setResiModalOpen(false); setResiService(null); }}
                service={resiService}
                onSuccess={() => router.refresh()}
            />
            <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
        </>
    )
}
