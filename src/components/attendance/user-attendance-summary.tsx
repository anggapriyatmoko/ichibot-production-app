'use client'

import { useEffect, useState, useTransition } from 'react'
import { getMyPayrollPeriodAttendanceSummary } from '@/app/actions/attendance'
import { CalendarDays, Clock, UserCheck, UserX, AlertCircle, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryData {
    period: { startDate: string; endDate: string }
    data: {
        totalWorkDays: number
        lateCount: number
        lateMinutes: number
        absentCount: number
        permitCount: number
        noClockOutCount: number
    }
}

export default function UserAttendanceSummary({
    month,
    year
}: {
    month: number
    year: number
}) {
    const [summary, setSummary] = useState<SummaryData | null>(null)
    const [calcDay, setCalcDay] = useState(25)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const savedCalcDay = localStorage.getItem('salaryCalcDate')
        if (savedCalcDay) {
            setCalcDay(parseInt(savedCalcDay))
        }
    }, [])

    useEffect(() => {
        startTransition(async () => {
            try {
                const result = await getMyPayrollPeriodAttendanceSummary(calcDay, month, year)
                if (result.success && result.data) {
                    setSummary({
                        period: result.period!,
                        data: result.data as any
                    })
                }
            } catch (error) {
                console.error('Failed to fetch attendance summary:', error)
            }
        })
    }, [calcDay, month, year])

    // Loading Skeleton or Data
    if (!summary) {
        return (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-fit animate-pulse">
                <div className="p-4 border-b border-border bg-muted/30">
                    <div className="h-5 w-32 bg-muted/50 rounded mb-2"></div>
                    <div className="h-3 w-40 bg-muted/50 rounded"></div>
                </div>
                <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-muted/50"></div>
                                <div className="h-4 w-24 bg-muted/50 rounded"></div>
                            </div>
                            <div className="h-5 w-8 bg-muted/50 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    const { data, period } = summary

    return (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-fit">
            <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Rekap Periode Gaji
                    </h2>
                    {isPending && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                </p>
            </div>

            <div className="p-4 space-y-3">
                {/* Total Hari Kerja */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 text-primary rounded-lg transition-colors group-hover:bg-primary/20">
                            <CalendarDays className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium">Total Hari Kerja</span>
                    </div>
                    <span className="text-sm font-bold">{data.totalWorkDays}</span>
                </div>

                {/* Terlambat */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            data.lateCount > 0 ? "bg-orange-100 text-orange-600 group-hover:bg-orange-200" : "bg-muted text-muted-foreground"
                        )}>
                            <Clock className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium">Terlambat</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold">{data.lateCount}x</div>
                        <div className="text-[10px] text-muted-foreground">{data.lateMinutes}m</div>
                    </div>
                </div>

                {/* Tidak Masuk / Alpha */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            data.absentCount > 0 ? "bg-red-100 text-red-600 group-hover:bg-red-200" : "bg-muted text-muted-foreground"
                        )}>
                            <UserX className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium">Tanpa Keterangan</span>
                    </div>
                    <span className="text-sm font-bold text-red-600">{data.absentCount}</span>
                </div>

                {/* Izin / Cuti / Sakit */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200">
                            <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium">Izin / Sakit / Cuti</span>
                    </div>
                    <span className="text-sm font-bold">{data.permitCount}</span>
                </div>

                {/* Lupa Absen Pulang */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            data.noClockOutCount > 0 ? "bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200" : "bg-muted text-muted-foreground"
                        )}>
                            <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium">Tanpa Absen Pulang</span>
                    </div>
                    <span className="text-sm font-bold">{data.noClockOutCount}</span>
                </div>
            </div>
        </div>
    )
}
