'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { ClipboardList, Clock, XCircle, FileWarning, AlertCircle, Loader2, CalendarDays, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getPayrollPeriodAttendanceSummary } from '@/app/actions/attendance'

interface AttendanceSummaryItem {
    id: string
    name: string | null
    department: string | null
    role: string
    totalWorkDays: number
    lateCount: number
    lateMinutes: number
    absentCount: number
    permitCount: number
    noClockOutCount: number
}

interface Props {
    currentMonth: number
    currentYear: number
}

export default function AttendanceSummaryTable({ currentMonth, currentYear }: Props) {
    const router = useRouter()
    const tableRef = useRef<HTMLDivElement>(null)
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<AttendanceSummaryItem[]>([])
    const [period, setPeriod] = useState<{ startDate: string, endDate: string } | null>(null)
    const [loading, setLoading] = useState(true)
    const [salaryCalcDay, setSalaryCalcDay] = useState(25)
    const [downloading, setDownloading] = useState(false)

    const handleDownloadPDF = async () => {
        if (downloading || data.length === 0) return

        setDownloading(true)
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF('landscape', 'mm', 'a4')

            const pageWidth = doc.internal.pageSize.getWidth()
            const margin = 15
            const usableWidth = pageWidth - (margin * 2)

            // Title
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('Rekap Absensi Periode Gaji', margin, 20)

            // Period info
            if (period) {
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                const periodText = `Periode: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`
                doc.text(periodText, margin, 28)
            }

            // Table settings
            const startY = 35
            const rowHeight = 10
            const headerHeight = 12

            // Column widths (proportional)
            const colWidths = [
                usableWidth * 0.25, // Karyawan
                usableWidth * 0.12, // Total Hari
                usableWidth * 0.15, // Terlambat
                usableWidth * 0.14, // Tidak Masuk
                usableWidth * 0.14, // Izin/Sakit
                usableWidth * 0.20, // Tanpa Absen Pulang
            ]

            // Draw header background
            doc.setFillColor(248, 250, 252) // bg-muted/50
            doc.rect(margin, startY, usableWidth, headerHeight, 'F')

            // Draw header border
            doc.setDrawColor(226, 232, 240)
            doc.rect(margin, startY, usableWidth, headerHeight, 'S')

            // Header texts
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(100, 116, 139) // text-muted-foreground

            let xPos = margin + 3
            const headerY = startY + 8

            doc.text('Karyawan', xPos, headerY)
            xPos += colWidths[0]

            doc.text('Total Hari', xPos + colWidths[1] / 2, headerY, { align: 'center' })
            xPos += colWidths[1]

            doc.setTextColor(234, 88, 12) // text-orange-600
            doc.text('Terlambat', xPos + colWidths[2] / 2, headerY, { align: 'center' })
            xPos += colWidths[2]

            doc.setTextColor(220, 38, 38) // text-red-600
            doc.text('Tidak Masuk', xPos + colWidths[3] / 2, headerY, { align: 'center' })
            xPos += colWidths[3]

            doc.setTextColor(37, 99, 235) // text-blue-600
            doc.text('Izin/Sakit', xPos + colWidths[4] / 2, headerY, { align: 'center' })
            xPos += colWidths[4]

            doc.setTextColor(202, 138, 4) // text-yellow-600
            doc.text('Tanpa Absen Pulang', xPos + colWidths[5] / 2, headerY, { align: 'center' })

            // Draw data rows
            let currentY = startY + headerHeight
            doc.setFont('helvetica', 'normal')

            data.forEach((item, index) => {
                // Alternating row background
                if (index % 2 === 0) {
                    doc.setFillColor(255, 255, 255)
                } else {
                    doc.setFillColor(249, 250, 251)
                }
                doc.rect(margin, currentY, usableWidth, rowHeight, 'F')

                // Row border
                doc.setDrawColor(226, 232, 240)
                doc.rect(margin, currentY, usableWidth, rowHeight, 'S')

                const textY = currentY + 7
                xPos = margin + 3

                // Karyawan column
                doc.setTextColor(15, 23, 42) // text-foreground
                doc.setFontSize(9)
                doc.setFont('helvetica', 'bold')
                doc.text(item.name || '-', xPos, textY - 1)
                doc.setFontSize(7)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(100, 116, 139)
                doc.text(item.department || '-', xPos, textY + 2.5)
                xPos += colWidths[0]

                // Total Hari
                doc.setFontSize(9)
                doc.setTextColor(15, 23, 42)
                doc.setFont('helvetica', 'bold')
                doc.text(`${item.totalWorkDays} hari`, xPos + colWidths[1] / 2, textY, { align: 'center' })
                xPos += colWidths[1]

                // Terlambat
                if (item.lateCount > 0) {
                    doc.setTextColor(234, 88, 12)
                    doc.text(`${item.lateCount}`, xPos + colWidths[2] / 2, textY - 1, { align: 'center' })
                    doc.setFontSize(7)
                    doc.text(formatMinutes(item.lateMinutes), xPos + colWidths[2] / 2, textY + 2.5, { align: 'center' })
                } else {
                    doc.setTextColor(100, 116, 139)
                    doc.text('-', xPos + colWidths[2] / 2, textY, { align: 'center' })
                }
                xPos += colWidths[2]

                // Tidak Masuk
                doc.setFontSize(9)
                if (item.absentCount > 0) {
                    doc.setTextColor(220, 38, 38)
                    doc.text(`${item.absentCount}`, xPos + colWidths[3] / 2, textY, { align: 'center' })
                } else {
                    doc.setTextColor(100, 116, 139)
                    doc.text('-', xPos + colWidths[3] / 2, textY, { align: 'center' })
                }
                xPos += colWidths[3]

                // Izin/Sakit
                if (item.permitCount > 0) {
                    doc.setTextColor(37, 99, 235)
                    doc.text(`${item.permitCount}`, xPos + colWidths[4] / 2, textY, { align: 'center' })
                } else {
                    doc.setTextColor(100, 116, 139)
                    doc.text('-', xPos + colWidths[4] / 2, textY, { align: 'center' })
                }
                xPos += colWidths[4]

                // Tanpa Absen Pulang
                if (item.noClockOutCount > 0) {
                    doc.setTextColor(202, 138, 4)
                    doc.text(`${item.noClockOutCount}`, xPos + colWidths[5] / 2, textY, { align: 'center' })
                } else {
                    doc.setTextColor(100, 116, 139)
                    doc.text('-', xPos + colWidths[5] / 2, textY, { align: 'center' })
                }

                currentY += rowHeight
            })

            // Save the PDF
            const periodStr = period ? `${period.startDate}_${period.endDate}` : `${currentMonth}_${currentYear}`
            doc.save(`rekap-absensi-${periodStr}.pdf`)
        } catch (error) {
            console.error('Error downloading PDF:', error)
        } finally {
            setDownloading(false)
        }
    }

    useEffect(() => {
        const saved = localStorage.getItem('salaryCalculationDay')
        if (saved) {
            setSalaryCalcDay(parseInt(saved))
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [currentMonth, currentYear, salaryCalcDay])

    const loadData = async () => {
        setLoading(true)
        try {
            const result = await getPayrollPeriodAttendanceSummary(salaryCalcDay, currentMonth, currentYear)
            if (result.success) {
                setData(result.data)
                setPeriod(result.period)
            }
        } catch (error) {
            console.error('Error loading attendance summary:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const m = e.target.value
        startTransition(() => {
            const params = new URLSearchParams(window.location.search)
            params.set('attMonth', m)
            params.set('attYear', currentYear.toString())
            router.push(`?${params.toString()}`)
        })
    }

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const y = e.target.value
        startTransition(() => {
            const params = new URLSearchParams(window.location.search)
            params.set('attMonth', currentMonth.toString())
            params.set('attYear', y)
            router.push(`?${params.toString()}`)
        })
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const formatMinutes = (minutes: number) => {
        if (minutes < 60) return `${minutes} menit`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return mins > 0 ? `${hours}j ${mins}m` : `${hours} jam`
    }

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

    return (
        <div ref={tableRef} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mt-8">
            <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        <h2 className="font-semibold text-foreground">Rekap Absensi Periode Gaji</h2>
                        {period && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded ml-2 border border-border">
                                {formatDate(period.startDate)} - {formatDate(period.endDate)}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={currentMonth}
                            onChange={handleMonthChange}
                            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isPending}
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={currentYear}
                            onChange={handleYearChange}
                            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isPending}
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={downloading || loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download sebagai PDF"
                        >
                            {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-3 font-medium text-muted-foreground">Karyawan</th>
                                <th className="text-center p-3 font-medium text-muted-foreground">
                                    <div className="flex items-center justify-center gap-1">
                                        <CalendarDays className="w-4 h-4" />
                                        Total Hari
                                    </div>
                                </th>
                                <th className="text-center p-3 font-medium text-orange-600">
                                    <div className="flex items-center justify-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        Terlambat
                                    </div>
                                </th>
                                <th className="text-center p-3 font-medium text-red-600">
                                    <div className="flex items-center justify-center gap-1">
                                        <XCircle className="w-4 h-4" />
                                        Tidak Masuk
                                    </div>
                                </th>
                                <th className="text-center p-3 font-medium text-blue-600">
                                    <div className="flex items-center justify-center gap-1">
                                        <FileWarning className="w-4 h-4" />
                                        Izin/Sakit
                                    </div>
                                </th>
                                <th className="text-center p-3 font-medium text-yellow-600">
                                    <div className="flex items-center justify-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        Tanpa Absen Pulang
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        Belum ada data karyawan.
                                    </td>
                                </tr>
                            ) : (
                                data.map((item) => (
                                    <tr key={item.id} className="hover:bg-muted/30">
                                        <td className="p-3">
                                            <div>
                                                <span className="font-medium text-foreground">{item.name || '-'}</span>
                                                <span className="text-xs text-muted-foreground block">{item.department || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-muted text-foreground font-medium">
                                                {item.totalWorkDays} hari
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.lateCount > 0 ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-500/10 text-orange-600 font-semibold">
                                                        {item.lateCount}
                                                    </span>
                                                    <span className="text-xs text-orange-500 mt-1">
                                                        {formatMinutes(item.lateMinutes)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.absentCount > 0 ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-600 font-semibold">
                                                    {item.absentCount}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.permitCount > 0 ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 font-semibold">
                                                    {item.permitCount}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.noClockOutCount > 0 ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/10 text-yellow-600 font-semibold">
                                                    {item.noClockOutCount}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
