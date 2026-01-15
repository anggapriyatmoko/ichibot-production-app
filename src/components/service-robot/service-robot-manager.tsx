'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, X, Search, Bot } from 'lucide-react'
import { createServiceRobot, updateServiceRobot, deleteServiceRobot } from '@/app/actions/service-robot'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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
}

interface ServiceRobotManagerProps {
    initialServices: ServiceRobot[]
}

const statusOptions = [
    { value: 'PENDING', label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    { value: 'IN_PROGRESS', label: 'Dikerjakan', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { value: 'DONE', label: 'Selesai', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    { value: 'DELIVERED', label: 'Diambil', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
]

export default function ServiceRobotManager({ initialServices }: ServiceRobotManagerProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [editingService, setEditingService] = useState<ServiceRobot | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()

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
        setEditingService(service)
        setIsAdding(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingService) {
                await updateServiceRobot(editingService.id, {
                    entryDate: new Date(formData.entryDate),
                    customerName: formData.customerName,
                    customerAddress: formData.customerAddress,
                    customerPhone: formData.customerPhone,
                    robotType: formData.robotType,
                    accessories: formData.accessories || undefined,
                    warrantyStatus: formData.warrantyStatus,
                    complaint: formData.complaint,
                    serviceStatus: formData.serviceStatus,
                    serviceNotes: formData.serviceNotes || undefined,
                })
                showAlert('Data service berhasil diupdate', 'success')
            } else {
                await createServiceRobot({
                    entryDate: new Date(formData.entryDate),
                    customerName: formData.customerName,
                    customerAddress: formData.customerAddress,
                    customerPhone: formData.customerPhone,
                    robotType: formData.robotType,
                    accessories: formData.accessories || undefined,
                    warrantyStatus: formData.warrantyStatus,
                    complaint: formData.complaint,
                    serviceStatus: formData.serviceStatus,
                    serviceNotes: formData.serviceNotes || undefined,
                })
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

    // Filter services
    const filteredServices = initialServices.filter(service =>
        service.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.customerPhone.includes(searchTerm) ||
        service.robotType.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        const opt = statusOptions.find(o => o.value === status)
        return opt ? (
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", opt.color)}>
                {opt.label}
            </span>
        ) : status
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari nama, no HP, jenis robot..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
                <button
                    onClick={openAddForm}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Tambah Service
                </button>
            </div>

            {/* Modal Form */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-lg flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-lg font-bold">{editingService ? 'Edit Service' : 'Tambah Service Baru'}</h2>
                            <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-accent rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 space-y-4">
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
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Nama Pelanggan</label>
                                    <input
                                        type="text"
                                        value={formData.customerName}
                                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                        required
                                        placeholder="Nama lengkap"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    />
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
                                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                        required
                                        placeholder="08xxxxxxxxxx"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Jenis Robot</label>
                                    <input
                                        type="text"
                                        value={formData.robotType}
                                        onChange={(e) => setFormData({ ...formData, robotType: e.target.value })}
                                        required
                                        placeholder="Contoh: Ichibot S1"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Kelengkapan</label>
                                    <input
                                        type="text"
                                        value={formData.accessories}
                                        onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                                        placeholder="Charger, remote, dll"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
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
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Status Service</label>
                                    <select
                                        value={formData.serviceStatus}
                                        onChange={(e) => setFormData({ ...formData, serviceStatus: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    >
                                        {statusOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">Keterangan Service</label>
                                    <textarea
                                        value={formData.serviceNotes}
                                        onChange={(e) => setFormData({ ...formData, serviceNotes: e.target.value })}
                                        placeholder="Apa saja yang di-service (opsional)"
                                        rows={2}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingService ? 'Update' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-foreground uppercase font-medium text-xs">
                            <tr>
                                <th className="px-4 py-3">Tgl Masuk</th>
                                <th className="px-4 py-3">Nama</th>
                                <th className="px-4 py-3">No HP</th>
                                <th className="px-4 py-3">Jenis Robot</th>
                                <th className="px-4 py-3">Kelengkapan</th>
                                <th className="px-4 py-3">Garansi</th>
                                <th className="px-4 py-3">Keluhan</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Keterangan</th>
                                <th className="px-4 py-3 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredServices.map((service) => (
                                <tr key={service.id} className="hover:bg-accent/50 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {new Date(service.entryDate).toLocaleDateString('id-ID')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{service.customerName}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">{service.customerAddress}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">{service.customerPhone}</td>
                                    <td className="px-4 py-3">{service.robotType}</td>
                                    <td className="px-4 py-3 text-xs max-w-[100px] truncate">{service.accessories || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                            service.warrantyStatus === 'YA'
                                                ? 'bg-green-500/10 text-green-600'
                                                : 'bg-gray-500/10 text-gray-600'
                                        )}>
                                            {service.warrantyStatus === 'YA' ? 'Ya' : 'Tidak'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs max-w-[150px] truncate">{service.complaint}</td>
                                    <td className="px-4 py-3">{getStatusBadge(service.serviceStatus)}</td>
                                    <td className="px-4 py-3 text-xs max-w-[150px] truncate">{service.serviceNotes || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
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
                                    </td>
                                </tr>
                            ))}
                            {filteredServices.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                                        Belum ada data service.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
                {filteredServices.map((service) => (
                    <div key={service.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-foreground">{service.customerName}</p>
                                <p className="text-xs text-muted-foreground">{service.customerPhone}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(service.serviceStatus)}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">Tanggal:</span>
                                <span className="ml-1 font-medium">{new Date(service.entryDate).toLocaleDateString('id-ID')}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Robot:</span>
                                <span className="ml-1 font-medium">{service.robotType}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Garansi:</span>
                                <span className={cn("ml-1 font-medium", service.warrantyStatus === 'YA' ? 'text-green-600' : '')}>
                                    {service.warrantyStatus === 'YA' ? 'Ya' : 'Tidak'}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Kelengkapan:</span>
                                <span className="ml-1">{service.accessories || '-'}</span>
                            </div>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Keluhan:</span>
                            <p className="text-foreground">{service.complaint}</p>
                        </div>
                        {service.serviceNotes && (
                            <div className="text-sm">
                                <span className="text-muted-foreground">Keterangan:</span>
                                <p className="text-foreground">{service.serviceNotes}</p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
        </div>
    )
}
