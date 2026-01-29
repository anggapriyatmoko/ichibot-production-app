'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Plus, Trash2, Edit, Loader2, Save, AlertTriangle, X } from 'lucide-react'
import { createCustomWorkSchedule, updateCustomWorkSchedule, deleteCustomWorkSchedule } from '@/app/actions/work-schedule'
import { cn } from '@/lib/utils'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'

interface CustomSchedule {
    id: string
    startDate: Date
    endDate: Date
    startTime: string
    endTime: string
    reason: string
}

interface Props {
    schedules: CustomSchedule[]
}

export default function CustomWorkScheduleManager({ schedules }: Props) {
    const router = useRouter()
    const { showConfirmation } = useConfirmation()
    const { showAlert, showError } = useAlert()
    const [saving, setSaving] = useState(false)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingSchedule, setEditingSchedule] = useState<CustomSchedule | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        startTime: '08:00',
        endTime: '17:00',
        reason: ''
    })

    const resetForm = () => {
        setFormData({
            startDate: '',
            endDate: '',
            startTime: '08:00',
            endTime: '17:00',
            reason: ''
        })
    }

    const openAddModal = () => {
        resetForm()
        setIsAddModalOpen(true)
    }

    const openEditModal = (schedule: CustomSchedule) => {
        setFormData({
            startDate: new Date(schedule.startDate).toISOString().split('T')[0],
            endDate: new Date(schedule.endDate).toISOString().split('T')[0],
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            reason: schedule.reason
        })
        setEditingSchedule(schedule)
    }

    const closeModal = () => {
        setIsAddModalOpen(false)
        setEditingSchedule(null)
        resetForm()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const fd = new FormData()
            fd.append('startDate', formData.startDate)
            fd.append('endDate', formData.endDate)
            fd.append('startTime', formData.startTime)
            fd.append('endTime', formData.endTime)
            fd.append('reason', formData.reason)

            if (editingSchedule) {
                fd.append('id', editingSchedule.id)
                await updateCustomWorkSchedule(fd)
                showAlert('Jadwal custom berhasil diperbarui')
            } else {
                await createCustomWorkSchedule(fd)
                showAlert('Jadwal custom berhasil ditambahkan')
            }

            closeModal()
            router.refresh()
        } catch (error) {
            console.error('Failed to save:', error)
            showError('Gagal menyimpan jadwal custom')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        showConfirmation({
            title: 'Hapus Jadwal Custom',
            message: 'Apakah Anda yakin ingin menghapus jadwal custom ini?',
            type: 'confirm',
            action: async () => {
                await deleteCustomWorkSchedule(id)
                showAlert('Jadwal custom berhasil dihapus')
                router.refresh()
            }
        })
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <>
            {/* Custom Work Schedule Card */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <CalendarClock className="w-5 h-5 text-orange-500" />
                        <div>
                            <h2 className="font-semibold text-foreground">Jam Kerja Custom</h2>
                            <p className="text-xs text-muted-foreground">Atur jam kerja khusus untuk periode tertentu</p>
                        </div>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-sm"
                        title="Tambah Jadwal Custom"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* List of custom schedules */}
                <div className="divide-y divide-border">
                    {schedules.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Belum ada jadwal kerja custom</p>
                            <p className="text-xs mt-1">Klik tombol + untuk menambahkan jadwal khusus</p>
                        </div>
                    ) : (
                        schedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-foreground">
                                            {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span className="text-orange-600 font-medium">
                                            {schedule.startTime} - {schedule.endTime}
                                        </span>
                                        <span className="text-muted-foreground/50">•</span>
                                        <span className="truncate">{schedule.reason}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEditModal(schedule)}
                                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(schedule.id)}
                                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {(isAddModalOpen || editingSchedule) && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h3 className="text-lg font-bold text-foreground">
                                {editingSchedule ? 'Edit Jadwal Custom' : 'Tambah Jadwal Custom'}
                            </h3>
                            <button
                                onClick={closeModal}
                                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Dari Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Sampai Tanggal
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        required
                                        min={formData.startDate}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                            </div>

                            {/* Time Range */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Jam Masuk
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                                        Jam Pulang
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                    Keterangan
                                </label>
                                <input
                                    type="text"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    required
                                    placeholder="Contoh: Jam Ramadan, Event Khusus, dll"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>

                            {/* Warning Info */}
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800 dark:text-amber-300">
                                    <p className="font-medium mb-1">Peringatan</p>
                                    <p>Jadwal custom akan menimpa jadwal kerja reguler pada tanggal yang telah ditentukan. Perhitungan keterlambatan dan pulang cepat akan menggunakan jam yang diset di sini.</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Simpan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
