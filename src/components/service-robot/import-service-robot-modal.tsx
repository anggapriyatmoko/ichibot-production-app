'use client'

import { useState, useEffect } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, Check, Loader2, Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importServiceRobots } from '@/app/actions/service-robot'
import { useAlert } from '@/hooks/use-alert'

type ImportPreview = {
    entryDate: string
    customerName: string
    customerAddress: string
    customerPhone: string
    robotType: string
    accessories: string
    warrantyStatus: string
    complaint: string
    serviceStatus: string
    serviceNotes: string
    isValid: boolean
    errors: string[]
}

interface ImportServiceRobotModalProps {
    isAdmin: boolean
    validRobotTypes: string[]
}

export default function ImportServiceRobotModal({ isAdmin, validRobotTypes }: ImportServiceRobotModalProps) {
    const { showError } = useAlert()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreview[]>([])
    const [fileStats, setFileStats] = useState<{ total: number, valid: number } | null>(null)
    const [importResult, setImportResult] = useState<{ success: number, errors: string[] } | null>(null)

    // Only show for admin
    if (!isAdmin) return null

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        const headers = ['Tanggal Masuk', 'Nama Pelanggan', 'Alamat', 'No Telepon', 'Jenis Robot', 'Kelengkapan', 'Status Garansi', 'Keluhan', 'Status Service', 'Solusi']
        const sampleData = [
            ['2026-01-15', 'John Doe', 'Jl. Contoh No. 123', '081234567890', 'Ichibot V3', 'Charger, Remote', 'Ya', 'Tidak bisa menyala', 'Masuk', ''],
            ['2026-01-16', 'Jane Smith', 'Jl. Sample No. 456', '089876543210', 'Ichibot V2', 'Charger', 'Tidak', 'Motor bunyi', 'Dikerjakan', 'Ganti motor']
        ]

        if (format === 'csv') {
            const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'service_robot_template.csv'
            link.click()
        } else {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Template')
            XLSX.writeFile(wb, 'service_robot_template.xlsx')
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

                const headers = data[0].map((h: string) => h?.toString().toLowerCase().trim() || '')

                // Find column indices
                const dateIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('date'))
                const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('pelanggan') || h.includes('customer'))
                const addressIdx = headers.findIndex(h => h.includes('alamat') || h.includes('address'))
                const phoneIdx = headers.findIndex(h => h.includes('telepon') || h.includes('phone') || h.includes('hp'))
                const robotIdx = headers.findIndex(h => h.includes('robot') || h.includes('jenis') || h.includes('type'))
                const accessoriesIdx = headers.findIndex(h => h.includes('kelengkapan') || h.includes('accessories'))
                const warrantyIdx = headers.findIndex(h => h.includes('garansi') || h.includes('warranty'))
                const complaintIdx = headers.findIndex(h => h.includes('keluhan') || h.includes('complaint'))
                // Status service must be specifically "status service" or just "status" but NOT "status garansi"
                const statusIdx = headers.findIndex(h => h.includes('status service') || (h.includes('status') && !h.includes('garansi')))
                const notesIdx = headers.findIndex(h => h.includes('solusi') || h.includes('keterangan') || h.includes('notes'))

                if (nameIdx === -1 || robotIdx === -1) {
                    showError('Required columns "Nama Pelanggan" and "Jenis Robot" not found')
                    setIsLoading(false)
                    return
                }

                const rows = data.slice(1)

                // Create lowercase version of valid robot types for comparison
                const validRobotTypesLower = validRobotTypes.map(t => t.toLowerCase().trim())

                const parsed: ImportPreview[] = rows.map(row => {
                    const customerName = row[nameIdx] ? String(row[nameIdx]).trim() : ''
                    const robotType = row[robotIdx] ? String(row[robotIdx]).trim() : ''
                    const entryDate = dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : new Date().toISOString().split('T')[0]
                    const serviceStatus = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : 'Masuk'

                    const errors: string[] = []
                    if (!customerName) errors.push('Missing Name')
                    if (!robotType) {
                        errors.push('Missing Robot Type')
                    } else {
                        // Validate robot type against catalogue
                        const robotTypeLower = robotType.toLowerCase().trim()
                        if (!validRobotTypesLower.includes(robotTypeLower)) {
                            errors.push('Robot tidak ada di Catalogue')
                        }
                    }

                    return {
                        entryDate,
                        customerName,
                        customerAddress: addressIdx !== -1 && row[addressIdx] ? String(row[addressIdx]).trim() : '',
                        customerPhone: phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '',
                        robotType,
                        accessories: accessoriesIdx !== -1 && row[accessoriesIdx] ? String(row[accessoriesIdx]).trim() : '',
                        warrantyStatus: warrantyIdx !== -1 && row[warrantyIdx] ? String(row[warrantyIdx]).trim() : 'Tidak',
                        complaint: complaintIdx !== -1 && row[complaintIdx] ? String(row[complaintIdx]).trim() : '',
                        serviceStatus,
                        serviceNotes: notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : '',
                        isValid: errors.length === 0,
                        errors
                    }
                }).filter(r => r.customerName || r.robotType)

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
            const formData = validData.map(d => ({
                entryDate: d.entryDate,
                customerName: d.customerName,
                customerAddress: d.customerAddress,
                customerPhone: d.customerPhone,
                robotType: d.robotType,
                accessories: d.accessories,
                warrantyStatus: d.warrantyStatus,
                complaint: d.complaint,
                serviceStatus: d.serviceStatus,
                serviceNotes: d.serviceNotes
            }))

            const result = await importServiceRobots(formData)
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
                className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all shadow-sm active:scale-95"
                title="Import from Excel"
            >
                <FileSpreadsheet className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Import Service Robot</h2>
                                <p className="text-sm text-muted-foreground mt-1">Upload Excel (.xlsx) or CSV file to import service data.</p>
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
                                        <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
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
                                                <li>Required: <strong>Nama Pelanggan, Jenis Robot</strong></li>
                                                <li>Optional: Tanggal, Alamat, Telepon, Kelengkapan, Garansi, Keluhan, Status, Solusi</li>
                                                <li>Jenis Robot harus sesuai dengan <strong>Catalogue</strong></li>
                                                <li>Date format: YYYY-MM-DD or DD/MM/YYYY</li>
                                            </ul>
                                        </div>

                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                                            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                                                <Download className="w-4 h-4" />
                                                Download Template
                                            </h3>
                                            <p className="text-sm text-emerald-900/80 dark:text-emerald-400/80 mb-4">
                                                Use our predefined template to ensure correct formatting.
                                            </p>
                                            <div className="flex gap-3">
                                                <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-2 px-3 py-2 bg-background border border-border hover:border-emerald-500 text-emerald-600 rounded-lg text-xs font-medium transition-colors shadow-sm">
                                                    <FileSpreadsheet className="w-3 h-3" />
                                                    Excel Template
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
                                                Total: <span className="text-foreground">{fileStats?.total}</span>
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
                                                <thead className="bg-muted text-muted-foreground font-normal sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="p-3 border-b border-border w-10 bg-muted">#</th>
                                                        <th className="p-3 border-b border-border bg-muted">Validasi</th>
                                                        <th className="p-3 border-b border-border bg-muted">Tanggal</th>
                                                        <th className="p-3 border-b border-border bg-muted">Nama</th>
                                                        <th className="p-3 border-b border-border bg-muted">Robot</th>
                                                        <th className="p-3 border-b border-border bg-muted">Keluhan</th>
                                                        <th className="p-3 border-b border-border bg-muted">Status</th>
                                                        <th className="p-3 border-b border-border bg-muted">Garansi</th>
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
                                                            <td className="p-3 text-xs">{row.entryDate}</td>
                                                            <td className="p-3 font-medium">{row.customerName}</td>
                                                            <td className="p-3">{row.robotType}</td>
                                                            <td className="p-3 max-w-[200px] truncate" title={row.complaint}>{row.complaint || '-'}</td>
                                                            <td className="p-3">{row.serviceStatus}</td>
                                                            <td className="p-3">{row.warrantyStatus}</td>
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
                                            Successfully imported <strong className="text-foreground">{importResult.success}</strong> service records.
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
