'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, Check, Loader2, Download, Table, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importRecipes } from '@/app/actions/recipe'
import { useAlert } from '@/hooks/use-alert'

type ImportPreview = {
    recipeName: string
    description: string
    section: string
    sku: string
    productName: string
    ingredient: string // SKU or Name
    quantity: number
    notes: string
    isValid: boolean
    errors: string[]
}

export default function ImportRecipeModal({ targetRecipeName }: { targetRecipeName?: string }) {
    const { showError } = useAlert()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreview[]>([])
    const [fileStats, setFileStats] = useState<{ total: number, valid: number } | null>(null)
    const [importResult, setImportResult] = useState<{ success: number, errors: string[] } | null>(null)

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        const headers = ['Recipe Name', 'Description', 'Section', 'Ingredient SKU', 'Ingredient Name', 'Quantity', 'Notes']
        const sampleData = [
            [targetRecipeName || 'Nasi Goreng Spesial', 'Menu Andalan', 'Main Ingredients', 'RICE-01', 'Rice', 200, 'Grams'],
            [targetRecipeName || 'Nasi Goreng Spesial', '', 'Main Ingredients', 'EGG-01', 'Egg', 1, 'Pcs'],
            [targetRecipeName || 'Nasi Goreng Spesial', '', 'Spices', 'SALT-01', 'Salt', 5, ''],
        ]

        if (format === 'csv') {
            const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'bom_template.csv'
            link.click()
        } else {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Template')
            XLSX.writeFile(wb, 'bom_template.xlsx')
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsLoading(true)
        setImportResult(null)

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

                if (data.length < 2) {
                    showError('File appears empty or missing headers')
                    setIsLoading(false)
                    return
                }

                const headers = data[0].map((h: string) => h.toString().toLowerCase().trim())

                const recipeIdx = headers.findIndex(h => h.includes('recipe') && h.includes('name'))
                const descIdx = headers.findIndex(h => h.includes('description') || h.includes('desc'))
                const sectionIdx = headers.findIndex(h => h === 'section' || (h.includes('section') && !h.includes('category')))
                const sectionCategoryIdx = headers.findIndex(h => h.includes('section') && h.includes('category'))
                const skuIdx = headers.findIndex(h => h.includes('sku'))
                const productIdx = headers.findIndex(h => h.includes('product') || (h.includes('ingredient') && !h.includes('sku')))
                const qtyIdx = headers.findIndex(h => h.includes('quantity') || h.includes('qty'))
                const notesIdx = headers.findIndex(h => h.includes('notes'))

                if (recipeIdx === -1 && !targetRecipeName) {
                    showError('Required column "Recipe Name" not found.')
                    setIsLoading(false)
                    return
                }
                if (qtyIdx === -1) {
                    showError('Required column "Quantity" not found.')
                    setIsLoading(false)
                    return
                }

                const rows = data.slice(1)
                const parsed: ImportPreview[] = rows.map((row, i) => {
                    // Use targetRecipeName if provided, otherwise use file content
                    const recipeName = targetRecipeName || (recipeIdx !== -1 && row[recipeIdx] ? String(row[recipeIdx]).trim() : '')

                    const description = descIdx !== -1 ? (row[descIdx] || '') : ''
                    const section = sectionIdx !== -1 ? (row[sectionIdx] || 'Main') : 'Main'
                    const sectionCategory = sectionCategoryIdx !== -1 ? (row[sectionCategoryIdx] || '') : ''
                    const sku = skuIdx !== -1 ? (row[skuIdx] || '') : ''
                    const productName = productIdx !== -1 ? (row[productIdx] || '') : ''
                    const quantity = qtyIdx !== -1 ? (parseFloat(row[qtyIdx]) || 0) : 0
                    const notes = notesIdx !== -1 ? (row[notesIdx] || '') : ''

                    const errors = []
                    if (!recipeName) errors.push('Missing Recipe Name')
                    // Only require ingredient/qty if it's NOT just a header row
                    if (sku || productName || quantity > 0) {
                        if (!sku && !productName) errors.push('Missing Ingredient (SKU or Name)')
                        if (quantity <= 0) errors.push('Invalid Quantity')
                    }

                    return {
                        originalRow: row, // Keep raw for server
                        recipeName,
                        description,
                        section,
                        sectionCategory,
                        sku,
                        productName,
                        quantity,
                        notes,
                        ingredient: sku || productName,
                        isValid: errors.length === 0,
                        errors
                    }
                }).filter(r => r.recipeName || r.ingredient)

                setPreviewData(parsed)
                setFileStats({
                    total: parsed.length,
                    valid: parsed.filter(p => p.isValid).length
                })

            } catch (error) {
                console.error(error)
                showError('Failed to parse file.')
            } finally {
                setIsLoading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    const handleImport = async () => {
        if (!previewData.length) return

        const validData = previewData.filter(d => d.isValid)
        if (!validData.length) return

        setIsLoading(true)
        try {
            // Map validation preview back to clean objects for server
            const payload = validData.map(d => ({
                recipeName: d.recipeName,
                // @ts-ignore
                description: d.description,
                section: d.section,
                // @ts-ignore
                sectionCategory: d.sectionCategory,
                sku: d.sku,
                productName: d.productName,
                quantity: d.quantity,
                notes: d.notes
            }))

            const result = await importRecipes(payload)
            setImportResult(result)
            if (result.success > 0) {
                setPreviewData([])
                setFileStats(null)
            }
        } catch (error) {
            showError('Import failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                title="Import Excel"
            >
                <FileSpreadsheet className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Import BOM / Recipes</h2>
                                <p className="text-sm text-muted-foreground mt-1">Bulk create or update recipes from Excel.</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <span className="sr-only">Close</span>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden p-6 gap-6 flex flex-col min-h-0">

                            {!previewData.length && !importResult ? (
                                <div className="space-y-6 overflow-y-auto pr-2">
                                    {/* Upload Area */}
                                    <div className="border-2 border-dashed border-border rounded-2xl h-48 flex flex-col items-center justify-center bg-muted/10 hover:bg-accent/50 transition-colors relative group">
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            disabled={isLoading}
                                        />
                                        <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                                            {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                        </div>
                                        <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                                        <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                                    </div>

                                    {/* Instructions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                                            <h3 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                                                <AlertTriangle className="w-4 h-4" />
                                                Format Requirements
                                            </h3>
                                            <ul className="text-sm text-amber-900/80 dark:text-amber-400/80 space-y-2 list-disc list-inside">
                                                <li>First row must be <strong>Headers</strong></li>
                                                <li>Required: <strong>Recipe Name, Ingredient, Quantity</strong></li>
                                                <li>Use a new row for each ingredient.</li>
                                                <li>Valid ingredients must exist in Inventory.</li>
                                            </ul>
                                        </div>

                                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
                                            <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                                                <Download className="w-4 h-4" />
                                                Download Template
                                            </h3>
                                            <p className="text-sm text-blue-900/80 dark:text-blue-400/80 mb-4">
                                                Use our predefined template to ensure correct formatting.
                                            </p>
                                            <div className="flex gap-3">
                                                <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-2 px-3 py-2 bg-background border border-border hover:border-blue-500 text-blue-600 rounded-lg text-xs font-medium transition-colors shadow-sm">
                                                    <FileSpreadsheet className="w-3 h-3" />
                                                    Excel Template (.xlsx)
                                                </button>
                                                <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-2 px-3 py-2 bg-background border border-border hover:border-green-500 text-green-600 rounded-lg text-xs font-medium transition-colors shadow-sm">
                                                    <FileText className="w-3 h-3" />
                                                    CSV Template
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {/* Preview Area */}
                            {previewData.length > 0 && !importResult && (
                                <div className="flex flex-col h-full gap-4 overflow-hidden">
                                    <div className="flex items-center justify-between flex-shrink-0">
                                        <div className="flex gap-4">
                                            <div className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground">
                                                Total Rows: <span className="text-foreground">{fileStats?.total}</span>
                                            </div>
                                            <div className="px-3 py-1 bg-green-500/10 rounded-full text-xs font-medium text-green-600">
                                                Valid: <span className="font-bold">{fileStats?.valid}</span>
                                            </div>
                                            {((fileStats?.total || 0) - (fileStats?.valid || 0)) > 0 && (
                                                <div className="px-3 py-1 bg-red-500/10 rounded-full text-xs font-medium text-red-600">
                                                    Invalid: <span className="font-bold">{(fileStats?.total || 0) - (fileStats?.valid || 0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => { setPreviewData([]); setFileStats(null) }} className="text-sm text-red-600 hover:underline">
                                            Clear / Re-upload
                                        </button>
                                    </div>

                                    <div className="border border-border rounded-lg overflow-hidden flex-1 relative flex flex-col min-h-0 bg-background/50">
                                        <div className="overflow-auto flex-1 hover:pr-1 w-full">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="bg-muted text-muted-foreground font-medium sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="p-3 border-b border-border w-10 bg-muted">#</th>
                                                        <th className="p-3 border-b border-border bg-muted">Status</th>
                                                        <th className="p-3 border-b border-border bg-muted">Recipe</th>
                                                        <th className="p-3 border-b border-border bg-muted">Section</th>
                                                        <th className="p-3 border-b border-border bg-muted">Category</th>
                                                        <th className="p-3 border-b border-border bg-muted">Ingredient</th>
                                                        <th className="p-3 border-b border-border text-right bg-muted">Qty</th>
                                                        <th className="p-3 border-b border-border bg-muted">Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border bg-card">
                                                    {previewData.map((row, i) => (
                                                        <tr key={i} className={row.isValid ? 'hover:bg-muted/50 transition-colors' : 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100/50 transition-colors'}>
                                                            <td className="p-3 text-muted-foreground text-xs">{i + 1}</td>
                                                            <td className="p-3">
                                                                {row.isValid ? (
                                                                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium px-2.5 py-0.5 bg-emerald-500/15 rounded-full">
                                                                        <Check className="w-3 h-3" /> Ready
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium px-2.5 py-0.5 bg-red-500/15 rounded-full" title={row.errors.join(', ')}>
                                                                        <AlertTriangle className="w-3 h-3" /> {row.errors[0]}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 font-medium">{row.recipeName}</td>
                                                            <td className="p-3 text-muted-foreground text-xs">{row.section}</td>
                                                            {/* @ts-ignore */}
                                                            <td className="p-3 text-muted-foreground text-xs">{row.sectionCategory || '-'}</td>
                                                            <td className="p-3">{row.ingredient}</td>
                                                            <td className="p-3 text-right tabular-nums">{row.quantity}</td>
                                                            <td className="p-3 text-muted-foreground text-xs">{row.notes}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Result Area */}
                            {importResult && (
                                <div className="space-y-6 py-8 text-center animate-in fade-in overflow-y-auto">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground">Import Completed!</h3>
                                        <p className="text-muted-foreground mt-2">
                                            Successfully processed <strong className="text-foreground">{importResult.success}</strong> recipes.
                                        </p>
                                    </div>

                                    {importResult.errors.length > 0 && (
                                        <div className="max-w-xl mx-auto mt-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-left">
                                            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Errors ({importResult.errors.length})
                                            </h4>
                                            <div className="max-h-32 overflow-y-auto text-xs text-red-700 dark:text-red-300 space-y-1">
                                                {importResult.errors.map((err, i) => (
                                                    <div key={i}>{err}</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <button onClick={() => { setIsOpen(false); setPreviewData([]); setImportResult(null); }} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors">
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        {!importResult && (
                            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3 rounded-b-xl flex-shrink-0">
                                <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium">Cancel</button>
                                {previewData.length > 0 && (
                                    <button
                                        onClick={handleImport}
                                        disabled={isLoading || !fileStats?.valid}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                                    >
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Run Import {fileStats?.valid ? `(${fileStats.valid})` : ''}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
