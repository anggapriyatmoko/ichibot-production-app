'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'

export default function YearSelector() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentYear = new Date().getFullYear()
    const selectedYear = Number(searchParams.get('year')) || currentYear

    // Generate range of years (e.g., currentYear - 2 to currentYear + 2)
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

    const handleYearChange = (year: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('year', year.toString())
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2">
            <div className="relative">
                <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                >
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        </div>
    )
}
