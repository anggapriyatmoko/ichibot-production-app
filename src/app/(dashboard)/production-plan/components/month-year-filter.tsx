'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
]

interface MonthYearFilterProps {
    currentMonth: number
    currentYear: number
    years: number[]
}

export default function MonthYearFilter({ currentMonth, currentYear, years }: MonthYearFilterProps) {
    const router = useRouter()

    const navigate = (month: number, year: number) => {
        router.push(`/production-plan?month=${month}&year=${year}`, { scroll: false })
    }

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        navigate(parseInt(e.target.value), currentYear)
    }

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        navigate(currentMonth, parseInt(e.target.value))
    }

    const goPrev = () => {
        let newMonth = currentMonth - 1
        let newYear = currentYear
        if (newMonth < 1) {
            newMonth = 12
            newYear -= 1
        }
        navigate(newMonth, newYear)
    }

    const goNext = () => {
        let newMonth = currentMonth + 1
        let newYear = currentYear
        if (newMonth > 12) {
            newMonth = 1
            newYear += 1
        }
        navigate(newMonth, newYear)
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={goPrev}
                className="p-2 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Previous month"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

            <select
                value={currentMonth}
                onChange={handleMonthChange}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
            >
                {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                ))}
            </select>

            <select
                value={currentYear}
                onChange={handleYearChange}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
            >
                {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>

            <button
                onClick={goNext}
                className="p-2 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Next month"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    )
}
