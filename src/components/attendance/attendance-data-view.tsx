'use client'

import { useState } from 'react'
import { UserMonthlyData } from './attendance-manager'
import AttendanceHeader from './attendance-header'
import AttendanceManager from './attendance-manager'

interface Props {
    monthlyData: UserMonthlyData[]
    currentMonth: number
    currentYear: number
    daysInMonth: number
    isAdmin?: boolean
    basePath?: string
    monthParam?: string
    yearParam?: string
}

export default function AttendanceDataView({
    monthlyData,
    currentMonth,
    currentYear,
    daysInMonth,
    isAdmin = false,
    basePath,
    monthParam,
    yearParam
}: Props) {
    const [searchQuery, setSearchQuery] = useState('')

    const filteredData = monthlyData.filter(({ user }) => {
        if (!searchQuery) return true
        const searchLower = searchQuery.toLowerCase()
        return (
            user.name?.toLowerCase().includes(searchLower) ||
            user.username.toLowerCase().includes(searchLower)
        )
    })

    return (
        <div className="space-y-8 fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Data Absensi</h2>
                    <p className="text-sm text-muted-foreground">Input dan kelola data absensi karyawan.</p>
                </div>
                <div className="w-fit">
                    <AttendanceHeader
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        isAdmin={isAdmin}
                        basePath={basePath}
                        monthParam={monthParam}
                        yearParam={yearParam}
                        showSearch={true}
                        searchQuery={searchQuery}
                        onSearch={setSearchQuery}
                    />
                </div>
            </div>

            <AttendanceManager
                monthlyData={filteredData}
                currentMonth={currentMonth}
                currentYear={currentYear}
                daysInMonth={daysInMonth}
                isAdmin={isAdmin}
                gridCols={3}
            />
        </div>
    )
}
