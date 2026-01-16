'use client'

import { Fragment } from 'react'
import YearSelector from './year-selector'

interface ProductionOverviewTableProps {
    data: {
        productName: string
        category: string
        monthlyData: {
            month: number // 1-12
            plan: number
            done: number
        }[]
    }[]
    year: number
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
]


const CATEGORY_STYLES = [
    { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', badge: 'bg-emerald-500', solid: 'bg-emerald-50' },
    { bg: 'bg-blue-500/10 hover:bg-blue-500/20', badge: 'bg-blue-500', solid: 'bg-blue-50' },
    { bg: 'bg-violet-500/10 hover:bg-violet-500/20', badge: 'bg-violet-500', solid: 'bg-violet-50' },
    { bg: 'bg-amber-500/10 hover:bg-amber-500/20', badge: 'bg-amber-500', solid: 'bg-amber-50' },
    { bg: 'bg-rose-500/10 hover:bg-rose-500/20', badge: 'bg-rose-500', solid: 'bg-rose-50' },
    { bg: 'bg-cyan-500/10 hover:bg-cyan-500/20', badge: 'bg-cyan-500', solid: 'bg-cyan-50' },
    { bg: 'bg-indigo-500/10 hover:bg-indigo-500/20', badge: 'bg-indigo-500', solid: 'bg-indigo-50' },
    { bg: 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20', badge: 'bg-fuchsia-500', solid: 'bg-fuchsia-50' },
    { bg: 'bg-lime-500/10 hover:bg-lime-500/20', badge: 'bg-lime-500', solid: 'bg-lime-50' },
    { bg: 'bg-pink-500/10 hover:bg-pink-500/20', badge: 'bg-pink-500', solid: 'bg-pink-50' },
]

const getCategoryStyle = (category: string) => {
    let hash = 0
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % CATEGORY_STYLES.length
    return CATEGORY_STYLES[index]
}

const getCategoryColor = (category: string) => getCategoryStyle(category).bg
const getCategoryBadgeColor = (category: string) => getCategoryStyle(category).badge
const getCategorySolidColor = (category: string) => getCategoryStyle(category).solid

export default function ProductionOverviewTable({ data, year }: ProductionOverviewTableProps) {
    // Sort data: Category ASC, then Product Name ASC
    const sortedData = [...data].sort((a, b) => {
        // First sort by Category
        const catComparison = a.category.localeCompare(b.category)
        if (catComparison !== 0) return catComparison

        // Then sort by Product Name
        return a.productName.localeCompare(b.productName)
    })

    // Unique categories for legend (from sorted data)
    const categories = Array.from(new Set(sortedData.map(d => d.category)))

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
            <div className="p-2 md:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Production Overview</h2>
                    <p className="text-sm text-slate-500">Annual production planning and realization for {year}</p>
                </div>
                <YearSelector />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-center text-sm border-collapse">
                    <thead>
                        {/* Month Headers */}
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th rowSpan={2} className="px-2 py-2 text-left font-bold text-slate-700 w-48 sticky left-0 bg-slate-50 z-20 border-r border-slate-200">
                                Product
                            </th>
                            {MONTHS.map((month) => (
                                <th key={month} colSpan={2} className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200 last:border-r-0 min-w-[60px] text-[10px] uppercase">
                                    {month}
                                </th>
                            ))}
                            <th colSpan={3} className="px-1 py-1 font-bold text-slate-900 border-l-2 border-slate-200 bg-slate-100/50">
                                Summary
                            </th>
                        </tr>
                        {/* Plan/Done Sub-headers */}
                        <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px]">
                            {MONTHS.map((month) => (
                                <Fragment key={month}>
                                    <th className="px-1 py-1 text-slate-400 border-r border-slate-100">P</th>
                                    <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200">D</th>
                                </Fragment>
                            ))}
                            <th className="px-2 py-1 text-slate-500 border-l-2 border-slate-200 bg-slate-100/30">Plan</th>
                            <th className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 bg-slate-100/30">Done</th>
                            <th className="px-2 py-1 font-bold text-emerald-600 bg-emerald-50/50">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((row) => {
                            const totalPlan = row.monthlyData.reduce((acc, curr) => acc + curr.plan, 0)
                            const totalDone = row.monthlyData.reduce((acc, curr) => acc + curr.done, 0)
                            const efficiency = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0

                            return (
                                <tr key={row.productName} className={`transition-colors group border-b border-slate-100/50 ${getCategoryColor(row.category)}`}>
                                    <td className={`px-2 py-2 text-left font-semibold text-slate-900 sticky left-0 z-10 border-r border-slate-200 text-xs ${getCategorySolidColor(row.category)}`}>
                                        {row.productName}
                                    </td>
                                    {MONTHS.map((_, index) => {
                                        const monthIndex = index + 1
                                        const monthData = row.monthlyData.find(d => d.month === monthIndex) || { plan: 0, done: 0 }

                                        return (
                                            <Fragment key={index}>
                                                <td className={`px-1 py-1 border-r border-slate-100 font-mono text-[10px] text-center ${monthData.plan === 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                                                    {monthData.plan > 0 ? monthData.plan : '-'}
                                                </td>
                                                <td className={`px-1 py-1 border-r border-slate-200 font-mono font-bold text-[10px] text-center ${monthData.done >= monthData.plan && monthData.plan > 0
                                                    ? 'text-emerald-600 bg-emerald-50/30'
                                                    : monthData.done > 0
                                                        ? 'text-blue-600'
                                                        : 'text-slate-200'
                                                    }`}>
                                                    {monthData.done > 0 ? monthData.done : '-'}
                                                </td>
                                            </Fragment>
                                        )
                                    })}
                                    <td className="px-2 py-1 border-l-2 border-slate-200 font-mono text-xs text-center bg-slate-50/30">
                                        {totalPlan}
                                    </td>
                                    <td className="px-2 py-1 border-r border-slate-200 font-mono text-xs text-center font-bold text-blue-600 bg-slate-50/30">
                                        {totalDone}
                                    </td>
                                    <td className={`px-2 py-1 font-mono text-xs text-center font-bold ${efficiency >= 100 ? 'text-emerald-600 bg-emerald-50' : efficiency >= 80 ? 'text-blue-600' : efficiency >= 50 ? 'text-orange-600' : 'text-red-500'}`}>
                                        {efficiency}%
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {data.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                    No products found.
                </div>
            )}
            <div className="px-2 md:px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-4 text-[10px] text-slate-500">
                    <span><span className="font-bold text-slate-700">P</span> : Plan</span>
                    <span><span className="font-bold text-slate-700">D</span> : Done (Assembled)</span>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${getCategoryBadgeColor(cat)}`} />
                            <span className="text-xs text-slate-600">{cat}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
