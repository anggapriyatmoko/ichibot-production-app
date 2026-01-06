'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function MonthYearSelector({
    selectedMonth,
    selectedYear
}: {
    selectedMonth: number
    selectedYear: number
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleMonthChange = (month: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('lastMonth', month)
        router.push(`/dashboard?${params.toString()}`)
    }

    const handleYearChange = (year: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('lastYear', year)
        router.push(`/dashboard?${params.toString()}`)
    }

    return (
        <div className="flex gap-2">
            <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:border-primary outline-none"
            >
                {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1
                    const monthName = new Date(2000, i).toLocaleString('default', { month: 'long' })
                    return <option key={month} value={month}>{monthName}</option>
                })}
            </select>
            <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:border-primary outline-none"
            >
                {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i
                    return <option key={year} value={year}>{year}</option>
                })}
            </select>
        </div>
    )
}
