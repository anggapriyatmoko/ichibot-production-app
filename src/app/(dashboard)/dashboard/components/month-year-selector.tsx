'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MonthYearSelector({
    selectedMonth,
    selectedYear
}: {
    selectedMonth: number
    selectedYear: number
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const navigate = (month: number, year: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('lastMonth', String(month))
        params.set('lastYear', String(year))
        router.push(`/dashboard?${params.toString()}`, { scroll: false })
    }

    const handleMonthChange = (month: string) => {
        navigate(parseInt(month), selectedYear)
    }

    const handleYearChange = (year: string) => {
        navigate(selectedMonth, parseInt(year))
    }

    const goPrev = () => {
        let m = selectedMonth - 1
        let y = selectedYear
        if (m < 1) { m = 12; y -= 1 }
        navigate(m, y)
    }

    const goNext = () => {
        let m = selectedMonth + 1
        let y = selectedYear
        if (m > 12) { m = 1; y += 1 }
        navigate(m, y)
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={goPrev}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Previous month"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
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
            <button
                onClick={goNext}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Next month"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    )
}
