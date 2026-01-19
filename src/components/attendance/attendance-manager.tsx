'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { upsertAttendance, deleteAttendance } from '@/app/actions/attendance'
import { cn } from '@/lib/utils'

interface User {
    id: string
    name: string | null
    username: string
    department: string | null
    role: string
}

interface Attendance {
    id: string
    userId: string
    date: Date
    clockIn: Date | null
    clockOut: Date | null
    isHoliday: boolean
    status?: string | null
    notes: string | null
}

interface UserMonthlyData {
    user: User
    attendances: { [day: number]: Attendance | null }
    stats?: {
        lateMinutes: number
        earlyMinutes: number
        absentDays?: number
    }
}

interface Props {
    monthlyData: UserMonthlyData[]
    currentMonth: number
    currentYear: number
    daysInMonth: number
    isAdmin?: boolean
}

interface EditModal {
    userId: string
    userName: string
    day: number
    clockIn: string
    clockOut: string
    isHoliday: boolean
    originalIsHoliday: boolean
    status: string
    attendanceId: string | null
}

const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function AttendanceManager({
    monthlyData,
    currentMonth,
    currentYear,
    daysInMonth,
    isAdmin = false
}: Props) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [editModal, setEditModal] = useState<EditModal | null>(null)
    const [expandedUser, setExpandedUser] = useState<string | null>(monthlyData.length === 1 ? monthlyData[0]?.user.id : null)

    const formatTimeForInput = (date: Date | null) => {
        if (!date) return ''
        const d = new Date(date)
        const hours = d.getHours().toString().padStart(2, '0')
        const minutes = d.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
    }

    const formatTimeDisplay = (date: Date | null) => {
        if (!date) return '-'
        const d = new Date(date)
        const hours = d.getHours().toString().padStart(2, '0')
        const minutes = d.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
    }

    const openEditModal = (user: User, day: number, attendance: Attendance | null) => {
        if (!isAdmin) return

        setEditModal({
            userId: user.id,
            userName: user.name || user.username,
            day,
            clockIn: formatTimeForInput(attendance?.clockIn || null),
            clockOut: formatTimeForInput(attendance?.clockOut || null),
            isHoliday: attendance?.isHoliday || false,
            originalIsHoliday: attendance?.isHoliday || false,
            status: attendance?.status || 'PRESENT',
            attendanceId: attendance?.id || null
        })
    }

    const closeModal = () => {
        setEditModal(null)
    }

    const handleSave = async () => {
        if (!editModal) return

        setSaving(true)
        try {
            const dateStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${editModal.day.toString().padStart(2, '0')}`

            const formData = new FormData()
            formData.append('userId', editModal.userId)
            formData.append('date', dateStr)
            formData.append('isHoliday', editModal.isHoliday.toString())
            // Send flag if holiday status changed
            if (editModal.isHoliday !== editModal.originalIsHoliday) {
                formData.append('updateHolidayGlobal', 'true')
            }
            formData.append('status', editModal.status)
            if (editModal.clockIn) formData.append('clockIn', editModal.clockIn)
            if (editModal.clockOut) formData.append('clockOut', editModal.clockOut)

            await upsertAttendance(formData)
            router.refresh()
            closeModal()
        } catch (error) {
            console.error('Failed to save attendance:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!editModal || !editModal.attendanceId) return

        setDeleting(true)
        try {
            await deleteAttendance(editModal.attendanceId)
            router.refresh()
            setShowDeleteConfirm(false)
            closeModal()
        } catch (error) {
            console.error('Failed to delete attendance:', error)
            alert('Gagal menghapus data absensi')
        } finally {
            setDeleting(false)
        }
    }

    // Calculate summary
    const totalUsers = monthlyData.length
    const today = new Date()
    const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear
    const todayDate = today.getDate()

    // Generate calendar weeks
    const getCalendarWeeks = () => {
        const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1)
        const startDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday

        const weeks: (number | null)[][] = []
        let currentWeek: (number | null)[] = []

        // Fill empty cells before first day
        for (let i = 0; i < startDayOfWeek; i++) {
            currentWeek.push(null)
        }

        // Fill days
        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(day)
            if (currentWeek.length === 7) {
                weeks.push(currentWeek)
                currentWeek = []
            }
        }

        // Fill remaining empty cells
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null)
            }
            weeks.push(currentWeek)
        }

        return weeks
    }

    const calendarWeeks = getCalendarWeeks()

    // Count attendance for a user
    const countAttendance = (attendances: { [day: number]: Attendance | null }) => {
        let present = 0
        let complete = 0
        for (let day = 1; day <= daysInMonth; day++) {
            const att = attendances[day]
            // Count as present if clocked in OR status is LEAVE (Cuti)
            if (att?.clockIn || att?.status === 'LEAVE') {
                present++
                // Count as complete if clocked out OR status is LEAVE
                if (att?.clockOut || att?.status === 'LEAVE') complete++
            }
        }
        return { present, complete }
    }

    return (
        <div className="space-y-6">


            {/* User Calendar Cards */}
            <div className={cn(
                "grid gap-4 items-start",
                monthlyData.length === 1
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
                {monthlyData.map(({ user, attendances, stats }) => {
                    const { present, complete } = countAttendance(attendances)
                    const isExpanded = isAdmin ? true : expandedUser === user.id

                    return (
                        <div key={user.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                            {/* User Header */}
                            <div className="flex flex-col gap-2 px-4 py-3 bg-muted/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-foreground">
                                            {user.name || user.username}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {user.department || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="p-4">
                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {dayNames.map((day, i) => (
                                        <div
                                            key={day}
                                            className={cn(
                                                "text-center text-xs font-medium py-2",
                                                i === 0 && "text-red-500"
                                            )}
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Weeks */}
                                {calendarWeeks.map((week, weekIndex) => (
                                    <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                                        {week.map((day, dayIndex) => {
                                            if (day === null) {
                                                return <div key={dayIndex} className="h-12 md:h-10" />
                                            }

                                            const attendance = attendances[day]
                                            const isToday = isCurrentMonth && day === todayDate
                                            const isWeekend = dayIndex === 0 || dayIndex === 6

                                            return (
                                                <div
                                                    key={dayIndex}
                                                    onClick={() => openEditModal(user, day, attendance)}
                                                    className={cn(
                                                        "aspect-square p-1 rounded-md border text-center flex flex-col items-center justify-center",
                                                        isWeekend && "bg-muted/30",
                                                        isToday && "ring-2 ring-primary",
                                                        isAdmin && "cursor-pointer hover:bg-accent/50",
                                                        attendance?.isHoliday
                                                            ? "bg-red-500/20 border-red-500/40"
                                                            : attendance?.status === 'SICK'
                                                                ? "bg-purple-500/10 border-purple-500/30"
                                                                : attendance?.status === 'PERMIT'
                                                                    ? "bg-yellow-500/10 border-yellow-500/30"
                                                                    : attendance?.status === 'LEAVE'
                                                                        ? "bg-cyan-500/10 border-cyan-500/30"
                                                                        : attendance?.clockIn
                                                                            ? attendance?.clockOut
                                                                                ? "bg-green-500/10 border-green-500/30"
                                                                                : "bg-blue-500/10 border-blue-500/30"
                                                                            : "border-border"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "text-xs font-medium leading-none",
                                                        attendance?.isHoliday && "text-red-600",
                                                        !attendance?.isHoliday && dayIndex === 0 && "text-red-500",
                                                        !attendance?.isHoliday && isToday && "text-primary"
                                                    )}>
                                                        {day}
                                                    </div>
                                                    {attendance?.isHoliday ? (
                                                        <div className="text-[8px] font-bold text-red-600">
                                                            Libur
                                                        </div>
                                                    ) : attendance?.status === 'SICK' ? (
                                                        <div className="text-[8px] font-bold text-purple-600">
                                                            Sakit
                                                        </div>
                                                    ) : attendance?.status === 'PERMIT' ? (
                                                        <div className="text-[8px] font-bold text-yellow-600">
                                                            Izin
                                                        </div>
                                                    ) : attendance?.status === 'LEAVE' ? (
                                                        <div className="text-[8px] font-bold text-cyan-600">
                                                            Cuti
                                                        </div>
                                                    ) : attendance?.clockIn ? (
                                                        <div className="text-[8px] leading-none text-center">
                                                            <span className={attendance.clockOut ? "text-green-600" : "text-blue-600"}>
                                                                {formatTimeDisplay(attendance.clockIn)}
                                                            </span>
                                                            {attendance.clockOut && (
                                                                <span className="text-green-600"> - {formatTimeDisplay(attendance.clockOut)}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <X className="w-2.5 h-2.5 text-muted-foreground/30" />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}

                                {/* Info for Admin */}
                                {isAdmin && (
                                    <div className="mt-3 text-xs text-muted-foreground text-center">
                                        Klik pada tanggal untuk input/edit absensi
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {monthlyData.length === 0 && (
                    <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                        Tidak ada data karyawan.
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500/10 border border-green-500/30"></div>
                    <span>Hadir Lengkap</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500/10 border border-blue-500/30"></div>
                    <span>Hadir (Belum Pulang)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40"></div>
                    <span>Libur Nasional</span>
                </div>
                <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-muted-foreground/30" />
                    <span>Belum Absen</span>
                </div>
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-lg">
                        <div className="p-4 border-b border-border">
                            <h3 className="text-lg font-bold">Input Absensi</h3>
                            <p className="text-sm text-muted-foreground">
                                {editModal.userName} - {editModal.day} {monthNames[currentMonth - 1]} {currentYear}
                            </p>
                        </div>
                        <div className="p-4 space-y-4">
                            <label className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={editModal.isHoliday}
                                    onChange={(e) => setEditModal({
                                        ...editModal,
                                        isHoliday: e.target.checked,
                                        clockIn: e.target.checked ? '' : editModal.clockIn,
                                        clockOut: e.target.checked ? '' : editModal.clockOut
                                    })}
                                    className="w-4 h-4 accent-red-500"
                                />
                                <span className="text-sm font-medium text-red-600">Libur Nasional (Semua Karyawan)</span>
                            </label>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Status Kehadiran</label>
                                <select
                                    value={editModal.status || 'PRESENT'}
                                    onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                                    disabled={editModal.isHoliday}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                >
                                    <option value="PRESENT">Hadir</option>
                                    <option value="PERMIT">Izin</option>
                                    <option value="SICK">Sakit</option>
                                    <option value="LEAVE">Cuti</option>
                                </select>
                            </div>

                            {(!editModal.status || editModal.status === 'PRESENT') && !editModal.isHoliday && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Jam Masuk</label>
                                        <input
                                            type="time"
                                            value={editModal.clockIn}
                                            onChange={(e) => setEditModal({ ...editModal, clockIn: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Jam Pulang</label>
                                        <input
                                            type="time"
                                            value={editModal.clockOut}
                                            onChange={(e) => setEditModal({ ...editModal, clockOut: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-4 border-t border-border flex justify-between gap-2">
                            {/* Delete button - only show if editing existing attendance */}
                            {editModal.attendanceId ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={saving || deleting}
                                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Hapus
                                </button>
                            ) : (
                                <div></div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={closeModal}
                                    disabled={saving || deleting}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || deleting}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && editModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-lg">
                        <div className="p-6 text-center">
                            {/* Warning Icon */}
                            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-600" />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-foreground mb-2">
                                Hapus Data Absensi?
                            </h3>

                            {/* Message */}
                            <p className="text-sm text-muted-foreground mb-6">
                                Anda yakin ingin menghapus data absensi <span className="font-semibold text-foreground">{editModal.userName}</span> pada tanggal <span className="font-semibold text-foreground">{editModal.day} {monthNames[currentMonth - 1]} {currentYear}</span>?
                            </p>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground bg-muted hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
