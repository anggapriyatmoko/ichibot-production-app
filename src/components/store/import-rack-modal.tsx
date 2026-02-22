'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, Check, Loader2, Download, Table as TableIcon } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importStoreRacks } from '@/app/actions/store-rack'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'
import {
    TableWrapper,
    TableScrollArea,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from '@/components/ui/table'
import Modal from '@/components/ui/modal'

type ImportPreview = {
    name: string
    drawerCount: number
    rows: number | null
    cols: number | null
    description: string
    drawerColors: any
    drawerNotes: any
    drawerNoteColors: any
    isValid: boolean
    errors: string[]
}

interface ImportRackModalProps {
    onSuccess: () => void
}

export default function ImportRackModal({ onSuccess }: ImportRackModalProps) {
    const { showError, showAlert } = useAlert()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreview[]>([])
    const [fileStats, setFileStats] = useState<{ total: number, valid: number } | null>(null)
    const [importResult, setImportResult] = useState<{ createdCount: number, updatedCount: number } | null>(null)

    const downloadTemplate = () => {
        const headers = ['Rack Name', 'Drawer Count', 'Rows', 'Cols', 'Description', 'Drawer Colors (JSON)', 'Drawer Notes (JSON)', 'Drawer Note Colors (JSON)']
        const sampleData = [
            ['RAK-A', 50, 5, 10, 'Rak Komponen Utama', '{}', '{"RAK-A-01":"Contoh Catatan"}', '{}'],
            ['RAK-B', 20, null, null, 'Rak Sequential (Tanpa baris/kolom)', '{}', '{}', '{}']
        ]

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'RackTemplate')
        XLSX.writeFile(wb, 'template_rak_store.xlsx')
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

                const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nama'))
                const countIdx = headers.findIndex(h => h.includes('count') || h.includes('jumlah') || h.includes('laci'))
                const rowsIdx = headers.findIndex(h => h.includes('rows') || h.includes('baris'))
                const colsIdx = headers.findIndex(h => h.includes('cols') || h.includes('kolom'))
                const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('keterangan'))

                // Specific header mapping for JSON fields
                const colorsIdx = headers.findIndex(h => h.includes('drawer colors') || h.includes('warna laci'))
                const notesIdx = headers.findIndex(h => h.includes('drawer notes') || h.includes('catatan laci'))
                const noteColorsIdx = headers.findIndex(h => h.includes('note color') || h.includes('warna penanda'))

                if (nameIdx === -1 || countIdx === -1) {
                    showError('Required columns "Rack Name" and "Drawer Count" not found.')
                    setIsLoading(false)
                    return
                }

                const rows_data = data.slice(1)
                const parsed: ImportPreview[] = rows_data.map(row => {
                    const name = String(row[nameIdx] || '').trim()
                    const drawerCount = parseInt(row[countIdx]) || 0
                    const rows = rowsIdx !== -1 && row[rowsIdx] ? parseInt(row[rowsIdx]) : null
                    const cols = colsIdx !== -1 && row[colsIdx] ? parseInt(row[colsIdx]) : null
                    const description = descIdx !== -1 ? String(row[descIdx] || '').trim() : ''

                    let drawerColors = {}
                    let drawerNotes = {}
                    let drawerNoteColors = {}

                    try { if (colorsIdx !== -1 && row[colorsIdx]) drawerColors = JSON.parse(row[colorsIdx]); } catch (e) { }
                    try { if (notesIdx !== -1 && row[notesIdx]) drawerNotes = JSON.parse(row[notesIdx]); } catch (e) { }
                    try { if (noteColorsIdx !== -1 && row[noteColorsIdx]) drawerNoteColors = JSON.parse(row[noteColorsIdx]); } catch (e) { }

                    const errors = []
                    if (!name) errors.push('Missing Name')
                    if (drawerCount <= 0) errors.push('Invalid Drawer Count')

                    return {
                        name,
                        drawerCount,
                        rows,
                        cols,
                        description,
                        drawerColors,
                        drawerNotes,
                        drawerNoteColors,
                        isValid: errors.length === 0,
                        errors
                    }
                }).filter(r => r.name || r.drawerCount)

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
            const result = await importStoreRacks(validData)
            if (result.success) {
                setImportResult({
                    createdCount: result.createdCount ?? 0,
                    updatedCount: result.updatedCount ?? 0
                })
                showAlert('Import berhasil')
                onSuccess()
            } else {
                showError(result.error || 'Import failed')
            }
        } catch (error) {
            showError('Import failed: Terjadi kesalahan jaringan atau server')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10 rounded-lg transition-colors border border-border"
                title="Import Excel"
            >
                <Upload className="w-4 h-4" />
            </button>

            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title="Import Data Rak Store"
                    maxWidth="4xl"
                    footer={
                        !importResult && (
                            <div className="flex justify-end gap-3 w-full">
                                <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground font-medium">Batal</button>
                                {previewData.length > 0 && (
                                    <button
                                        onClick={handleImport}
                                        disabled={isLoading || !fileStats?.valid}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                                    >
                                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Jalankan Import {fileStats?.valid ? `(${fileStats.valid})` : ''}
                                    </button>
                                )}
                            </div>
                        )
                    }
                >
                    <div className="flex-1 overflow-hidden gap-6 flex flex-col min-h-0">
                        {!previewData.length && !importResult ? (
                            <div className="space-y-6">
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
                                    <p className="font-medium text-foreground">Klik untuk upload atau drag and drop</p>
                                    <p className="text-sm text-muted-foreground mt-1">Hanya mendukung .xlsx, .xls</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                                        <h3 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                                            <AlertTriangle className="w-4 h-4" />
                                            Syarat Format
                                        </h3>
                                        <ul className="text-sm text-amber-900/80 dark:text-amber-400/80 space-y-2 list-disc list-inside">
                                            <li>Baris pertama harus <strong>Header</strong></li>
                                            <li>Kolom Wajib: <strong>Rack Name, Drawer Count</strong></li>
                                            <li>Kolom Opsional: <strong>Rows, Cols, Description</strong></li>
                                            <li>Metadata (Warna/Catatan) gunakan format JSON string.</li>
                                        </ul>
                                    </div>

                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
                                        <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                                            <Download className="w-4 h-4" />
                                            Download Template
                                        </h3>
                                        <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-white border border-border hover:border-blue-500 text-blue-600 rounded-lg text-sm font-medium transition-colors shadow-sm">
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Excel Template (.xlsx)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {previewData.length > 0 && !importResult && (
                            <div className="flex flex-col h-full gap-4 overflow-hidden">
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-4">
                                        <div className="px-3 py-1 bg-muted rounded-full text-xs font-medium">
                                            Total: {fileStats?.total}
                                        </div>
                                        <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-xs font-medium text-emerald-600">
                                            Valid: {fileStats?.valid}
                                        </div>
                                    </div>
                                    <button onClick={() => { setPreviewData([]); setFileStats(null) }} className="text-sm text-red-600 hover:underline">Hapus / Upload Ulang</button>
                                </div>

                                <TableWrapper className="border border-border rounded-lg overflow-hidden flex-1 min-h-[300px]">
                                    <TableScrollArea>
                                        <Table>
                                            <TableHeader className="bg-muted">
                                                <TableRow>
                                                    <TableHead className="w-10">#</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Nama Rak</TableHead>
                                                    <TableHead>Jumlah Laci</TableHead>
                                                    <TableHead>Layout (R/C)</TableHead>
                                                    <TableHead>Data Tambahan</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {previewData.map((row, i) => (
                                                    <TableRow key={i} className={cn(!row.isValid && "bg-destructive/5")}>
                                                        <TableCell>{i + 1}</TableCell>
                                                        <TableCell>
                                                            {row.isValid ? (
                                                                <Check className="w-4 h-4 text-emerald-600" />
                                                            ) : (
                                                                <span title={row.errors.join(', ')}>
                                                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-bold">{row.name}</TableCell>
                                                        <TableCell>{row.drawerCount}</TableCell>
                                                        <TableCell>{row.rows && row.cols ? `${row.rows}x${row.cols}` : 'Sequential'}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {Object.keys(row.drawerColors).length} Warna, {Object.keys(row.drawerNotes).length} Catatan
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableScrollArea>
                                </TableWrapper>
                            </div>
                        )}

                        {importResult && (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold">Import Selesai!</h3>
                                <p className="text-muted-foreground mt-2">
                                    {importResult.createdCount} dibuat, {importResult.updatedCount} diperbarui.
                                </p>
                                <button onClick={() => { setIsOpen(false); setImportResult(null); setPreviewData([]); }} className="mt-8 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium">Selesai</button>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </>
    )
}
