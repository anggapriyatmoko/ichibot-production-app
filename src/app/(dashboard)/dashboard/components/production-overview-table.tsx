'use client'

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

const getCategoryColor = (category: string) => {
    const normalized = category.toLowerCase()
    if (normalized.includes('robot') || normalized.includes('full')) return 'bg-emerald-500/10 hover:bg-emerald-500/20'
    if (normalized.includes('sparepart')) return 'bg-blue-500/10 hover:bg-blue-500/20'
    if (normalized.includes('ichiduino') || normalized.includes('module')) return 'bg-purple-500/10 hover:bg-purple-500/20'
    return 'bg-slate-50/50 hover:bg-slate-100/80'
}

const getCategoryBadgeColor = (category: string) => {
    const normalized = category.toLowerCase()
    if (normalized.includes('robot') || normalized.includes('full')) return 'bg-emerald-500'
    if (normalized.includes('sparepart')) return 'bg-blue-500'
    if (normalized.includes('ichiduino') || normalized.includes('module')) return 'bg-purple-500'
    return 'bg-slate-200'
}

export default function ProductionOverviewTable({ data, year }: ProductionOverviewTableProps) {
    // Unique categories for legend
    const categories = Array.from(new Set(data.map(d => d.category))).sort()

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Production Overview</h2>
                    <p className="text-sm text-slate-500">Annual production planning and realization for {year}</p>
                </div>
                <YearSelector />
            </div>

            <div className="overflow-x-auto p-1">
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
                                <div key={month} style={{ display: 'contents' }}>
                                    <th className="px-1 py-1 font-medium text-slate-400 border-r border-slate-100">P</th>
                                    <th className="px-1 py-1 font-bold text-slate-700 border-r border-slate-200">D</th>
                                </div>
                            ))}
                            <th className="px-2 py-1 font-medium text-slate-500 border-l-2 border-slate-200 bg-slate-100/30">Plan</th>
                            <th className="px-2 py-1 font-bold text-slate-700 border-r border-slate-200 bg-slate-100/30">Done</th>
                            <th className="px-2 py-1 font-bold text-emerald-600 bg-emerald-50/50">%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row) => {
                            const totalPlan = row.monthlyData.reduce((acc, curr) => acc + curr.plan, 0)
                            const totalDone = row.monthlyData.reduce((acc, curr) => acc + curr.done, 0)
                            const efficiency = totalPlan > 0 ? Math.round((totalDone / totalPlan) * 100) : 0

                            return (
                                <tr key={row.productName} className={`transition-colors group border-b border-slate-100/50 ${getCategoryColor(row.category)}`}>
                                    <td className={`px-2 py-2 text-left font-semibold text-slate-900 sticky left-0 z-10 border-r border-slate-200 text-xs ${getCategoryColor(row.category)}`}>
                                        {row.productName}
                                    </td>
                                    {MONTHS.map((_, index) => {
                                        const monthIndex = index + 1
                                        const monthData = row.monthlyData.find(d => d.month === monthIndex) || { plan: 0, done: 0 }

                                        return (
                                            <div key={index} style={{ display: 'contents' }}>
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
                                            </div>
                                        )
                                    })}
                                    <td className="px-2 py-1 border-l-2 border-slate-200 font-mono text-xs text-center font-medium bg-slate-50/30">
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
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-4 text-[10px] text-slate-500">
                    <span><span className="font-bold text-slate-700">P</span> : Plan</span>
                    <span><span className="font-bold text-slate-700">D</span> : Done (Assembled)</span>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded-full ${getCategoryBadgeColor(cat)}`} />
                            <span className="text-xs font-medium text-slate-600">{cat}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
