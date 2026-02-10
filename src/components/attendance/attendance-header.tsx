'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Download, Loader2, ChevronDown } from 'lucide-react'
import ImportAttendanceModal from './import-attendance-modal'
import { useAlert } from '@/hooks/use-alert'
import { exportRawAttendance } from '@/app/actions/attendance-io'
import { cn } from '@/lib/utils'

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
    const { showError } = useAlert()

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


    const [isExporting, setIsExporting] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowExportMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleExport = async (type: 'current' | 'all') => {
        setIsExporting(true)
        setShowExportMenu(false)
        try {
            const base64 = type === 'current'
                ? await exportRawAttendance(currentMonth, currentYear)
                : await exportRawAttendance()

            const binaryString = window.atob(base64)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const fileName = type === 'current'
                ? `attendance-${monthNames[currentMonth - 1]}-${currentYear}.xlsx`
                : 'attendance-all-time.xlsx'
            a.download = fileName
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            showError('Export failed')
            console.error(error)
        } finally {
            setIsExporting(false)
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
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                            title="Export Excel"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span className="text-sm font-medium">Export</span>
                            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showExportMenu && "rotate-180")} />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => handleExport('current')}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    Bulan yang sedang aktif
                                </button>
                                <button
                                    onClick={() => handleExport('all')}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-2 border-t border-border"
                                >
                                    <Download className="w-4 h-4 text-muted-foreground" />
                                    Semua data
                                </button>
                            </div>
                        )}
                    </div>
                    <ImportAttendanceModal
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        onSuccess={() => router.refresh()}
                    />
                </div>
            )}
        </div>
    )
}
