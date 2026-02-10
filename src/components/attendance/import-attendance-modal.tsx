'use client'

import { useState } from 'react'
import { Upload, AlertTriangle, Check, Loader2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importRawAttendance, getValidUserIds, getAttendanceTemplate } from '@/app/actions/attendance-io'
import { useAlert } from '@/hooks/use-alert'
import { useEffect } from 'react'

type ImportPreview = {
    userId: string
    username: string
    name: string
    validDays: number
    isValid: boolean
    errors: string[]
}

interface Props {
    currentMonth: number
    currentYear: number
    onSuccess: () => void
}

export default function ImportAttendanceModal({ currentMonth, currentYear, onSuccess }: Props) {
    const { showError, showAlert } = useAlert()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreview[]>([])
    const [fileStats, setFileStats] = useState<{ total: number, valid: number } | null>(null)
    const [importResult, setImportResult] = useState<{ success: boolean, count?: number } | null>(null)
    const [fileToUpload, setFileToUpload] = useState<File | null>(null)
    const [validUserIds, setValidUserIds] = useState<string[]>([])

    // Load valid users on open
    useEffect(() => {
        if (isOpen) {
            getValidUserIds().then(setValidUserIds).catch(console.error)
        }
    }, [isOpen])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsLoading(true)
        setImportResult(null)
        setFileToUpload(file)

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

                // Raw Log Mode
                const headers = data[0].map(h => h?.toString().toLowerCase())
                const idIdx = headers.indexOf('id')
                const nameIdx = headers.indexOf('nama')
                const dateIdx = headers.indexOf('date')
                const timeIdx = headers.indexOf('time')

                if (idIdx === -1 || dateIdx === -1 || timeIdx === -1) {
                    showError('Required columns (ID, Date, Time) not found in header')
                    setIsLoading(false)
                    return
                }

                const rows = data.slice(1)
                const usersMap: Record<string, { name: string, count: number }> = {}

                rows.forEach(row => {
                    const id = row[idIdx]?.toString().trim()
                    const name = row[nameIdx]?.toString() || '-'
                    if (id) {
                        if (!usersMap[id]) usersMap[id] = { name, count: 0 }
                        usersMap[id].count++
                    }
                })

                const parsed: ImportPreview[] = Object.entries(usersMap).map(([id, info]) => {
                    const isIdValid = validUserIds.includes(id)
                    return {
                        userId: id,
                        username: '-',
                        name: info.name,
                        validDays: info.count,
                        isValid: isIdValid,
                        errors: isIdValid ? [] : ['User ID not found in database']
                    }
                })

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

    const resetState = () => {
        setPreviewData([])
        setFileStats(null)
        setImportResult(null)
        setFileToUpload(null)
    }

    const handleClose = () => {
        setIsOpen(false)
        resetState()
    }

    const handleDownloadTemplate = async () => {
        setIsLoading(true)
        try {
            const base64 = await getAttendanceTemplate()
            const binaryString = window.atob(base64)
            const len = binaryString.length
            const bytes = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }
            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'template-import-absensi.xlsx'
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            showError('Failed to download template')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleImport = async () => {
        if (!fileToUpload) return

        setIsLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', fileToUpload)
            formData.append('month', currentMonth.toString())
            formData.append('year', currentYear.toString())

            const res = await importRawAttendance(formData)

            if (res.success) {
                setImportResult({ success: true, count: res.count })
                showAlert(`Successfully imported ${res.count} records`)
                onSuccess()
            }
        } catch (error) {
            showError('Import failed')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                title="Import Excel"
            >
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Import</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Import Attendance</h2>
                                <p className="text-sm text-muted-foreground mt-1">Upload Excel (.xlsx) file to update attendance.</p>
                            </div>
                            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                                <span className="sr-only">Close</span>
                                <X className="w-6 h-6" />
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
                                            accept=".xlsx,.xls"
                                            onChange={handleFileUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            disabled={isLoading}
                                        />
                                        <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                                            {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                        </div>
                                        <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                                        <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls</p>
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                                        <h3 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                                            <AlertTriangle className="w-4 h-4" />
                                            Data Format (Vertical Raw Log)
                                        </h3>
                                        <ul className="text-sm text-amber-900/80 dark:text-amber-400/80 space-y-2 list-disc list-inside">
                                            <li>Required columns: <strong>ID</strong>, <strong>Date</strong>, <strong>Time</strong></li>
                                            <li><strong>Time &lt; 12:00</strong> : Treated as Clock In</li>
                                            <li><strong>Time &gt;= 12:00</strong> : Treated as Clock Out</li>
                                            <li>Multiple entries for the same day are aggregated (earliest In, latest Out).</li>
                                            <li>Invalid User IDs will be highlighted and skipped during import.</li>
                                        </ul>
                                        <div className="mt-4">
                                            <button
                                                onClick={handleDownloadTemplate}
                                                disabled={isLoading}
                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                                            >
                                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 rotate-180" />}
                                                Download Template (.xlsx)
                                            </button>
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
                                                Users Found: <span className="text-foreground">{fileStats?.total}</span>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${(fileStats?.valid || 0) < (fileStats?.total || 0) ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
                                                Existing Users: <span className="font-bold">{fileStats?.valid}</span>
                                            </div>
                                        </div>
                                        <button onClick={resetState} className="text-sm text-red-600 hover:underline">
                                            Clear / Re-upload
                                        </button>
                                    </div>

                                    <div className="border border-border rounded-lg overflow-hidden flex-1 relative flex flex-col min-h-0 bg-background/50">
                                        <div className="overflow-auto flex-1 hover:pr-1 w-full">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="bg-muted text-muted-foreground font-normal sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="p-3 border-b border-border w-10 bg-muted">#</th>
                                                        <th className="p-3 border-b border-border bg-muted">User ID</th>
                                                        <th className="p-3 border-b border-border bg-muted">Name</th>
                                                        <th className="p-3 border-b border-border text-right bg-muted">Days with Data</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border bg-card">
                                                    {previewData.map((row, i) => (
                                                        <tr key={i} className={`hover:bg-muted/50 transition-colors ${!row.isValid ? 'bg-red-500/5 text-red-600' : ''}`}>
                                                            <td className="p-3 text-muted-foreground text-xs">{i + 1}</td>
                                                            <td className="p-3 font-mono text-xs flex items-center gap-2">
                                                                {row.userId}
                                                                {!row.isValid && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                                            </td>
                                                            <td className="p-3 font-medium">{row.name}</td>
                                                            <td className="p-3 text-right tabular-nums">{row.validDays}</td>
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
                                            Successfully updated <strong className="text-foreground">{importResult.count}</strong> daily records.
                                        </p>
                                    </div>

                                    <div className="pt-4">
                                        <button onClick={handleClose} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors">
                                            Done
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        {!importResult && (
                            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3 rounded-b-xl flex-shrink-0">
                                <button onClick={handleClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium">Cancel</button>
                                {previewData.length > 0 && (
                                    <button
                                        onClick={handleImport}
                                        disabled={isLoading}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                                    >
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Run Import
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
