'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { getProductionPlanForExport } from '@/app/actions/production-plan'
import { useAlert } from '@/hooks/use-alert'

export function ExportButton({ month, year }: { month: number, year: number }) {
    const [isLoading, setIsLoading] = useState(false)
    const { showError } = useAlert()

    const handleExport = async () => {
        try {
            setIsLoading(true)
            const data = await getProductionPlanForExport(month, year)

            if (data.length === 0) {
                showError('No production plans found for this period')
                return
            }

            // Headers managed by server action result structure, but let's be explicit
            const headers = [
                'Month', 'Year', 'Recipe Name', 'Target Quantity',
                'Unit Number', 'Serial Number', 'Custom ID',
                'Status', 'Progress (Steps)', 'Completed Steps'
            ]

            // Map data to ordered rows
            const rows = data.map((item: any) => [
                item.month, item.year, item.recipeName, item.targetQuantity,
                item.unitNumber, item.serialNumber, item.customId,
                item.status, item.progress, item.completedSteps
            ])

            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, `Production_Plan`)

            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
            XLSX.writeFile(wb, `Production_Plan_${monthName}_${year}.xlsx`)

        } catch (error: any) {
            showError(error.message || 'Export failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export Excel
        </button>
    )
}
