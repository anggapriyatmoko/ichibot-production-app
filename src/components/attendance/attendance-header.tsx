'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { exportAttendance } from '@/app/actions/attendance-io'
import ImportAttendanceModal from './import-attendance-modal'
import { useAlert } from '@/hooks/use-alert'

const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

interface Props {
    currentMonth: number
    currentYear: number
    isAdmin?: boolean
}

export default function AttendanceHeader({
    currentMonth,
    currentYear,
    isAdmin = false
}: Props) {
    const router = useRouter()
    const { showAlert, showError } = useAlert()
    const [ioLoading, setIoLoading] = useState(false)

    const handleMonthChange = (direction: 'prev' | 'next') => {
        let newMonth = currentMonth
        let newYear = currentYear

        if (direction === 'prev') {
            newMonth = currentMonth === 1 ? 12 : currentMonth - 1
            newYear = currentMonth === 1 ? currentYear - 1 : currentYear
        } else {
            newMonth = currentMonth === 12 ? 1 : currentMonth + 1
            newYear = currentMonth === 12 ? currentYear + 1 : currentYear
        }

        router.push(`/attendance?month=${newMonth}&year=${newYear}`)
    }

    const handleExport = async () => {
        setIoLoading(true)
        try {
            const base64 = await exportAttendance(currentMonth, currentYear)

            // Convert to blob
            const binaryString = window.atob(base64)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

            // Download
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Absensi_${currentMonth}-${currentYear}.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)
            showAlert('Export berhasil')
        } catch (error) {
            showError('Gagal export data')
        } finally {
            setIoLoading(false)
        }
    }

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => handleMonthChange('prev')}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                        {monthNames[currentMonth - 1]} {currentYear}
                    </span>
                </div>
                <button
                    onClick={() => handleMonthChange('next')}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {isAdmin && (
                <div className="flex gap-2">
                    <ImportAttendanceModal
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        onSuccess={() => router.refresh()}
                    />
                    <button
                        onClick={handleExport}
                        disabled={ioLoading}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        title="Export Excel"
                    >
                        {ioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                </div>
            )}
        </div>
    )
}
