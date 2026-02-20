'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, Check, Loader2, Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importAssets } from '@/app/actions/asset'
import { useAlert } from '@/hooks/use-alert'
import Modal from '@/components/ui/modal'

type ImportPreview = {
    name: string
    code: string
    specification: string
    location: string
    price: number | null
    notes: string
    purchaseDate: string | null
    usefulLife: number | null
    residualValue: number | null
    image?: string
    isValid: boolean
    errors: string[]
}

export default function ImportAssetModal() {
    const { showError } = useAlert()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreview[]>([])
    const [fileStats, setFileStats] = useState<{ total: number, valid: number } | null>(null)
    const [importResult, setImportResult] = useState<{ success: number, errors: string[] } | null>(null)

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        const headers = ['Nama Aset', 'Kode', 'Spesifikasi', 'Lokasi', 'Harga Beli', 'Keterangan', 'Tgl/Thn Beli', 'Umur Ekonomis (Tahun)', 'Nilai Residu', 'Image URL']
        const sampleData = [
            ['Mesin CNC 5-Axis', 'CNC-001', 'Precision 0.01mm, Max Speed 10000rpm', 'Workshop A', 150000000, 'Kondisi baik', 2020, 10, 15000000, 'https://example.com/cnc.jpg'],
            ['Kompresor Angin', 'KOM-002', '10HP, 500L Tank', 'Workshop B', 25000000, '', 2022, 8, 2500000, '']
        ]

        if (format === 'csv') {
            const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = 'asset_template.csv'
            link.click()
        } else {
            const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Template')
            XLSX.writeFile(wb, 'asset_template.xlsx')
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

                const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name'))
                const codeIdx = headers.findIndex(h => h.includes('kode') || h.includes('code'))
                const specIdx = headers.findIndex(h => h.includes('spesifikasi') || h.includes('spec'))
                const locationIdx = headers.findIndex(h => h.includes('lokasi') || h.includes('location'))
                const priceIdx = headers.findIndex(h => h.includes('harga') || h.includes('price'))
                const notesIdx = headers.findIndex(h => h.includes('keterangan') || h.includes('notes'))
                const purchaseDateIdx = headers.findIndex(h => h.includes('tgl') || h.includes('tanggal') || h.includes('date') || h.includes('tahun') || h.includes('year'))
                const usefulLifeIdx = headers.findIndex(h => h.includes('umur') || h.includes('useful'))
                const residualIdx = headers.findIndex(h => h.includes('residu') || h.includes('residual'))
                const imageIdx = headers.findIndex(h => h.includes('image') || h.includes('gambar') || h.includes('url'))

                if (nameIdx === -1) {
                    showError('Required column "Nama Aset" not found in headers.')
                    setIsLoading(false)
                    return
                }

                if (locationIdx === -1) {
                    showError('Required column "Lokasi" not found in headers.')
                    setIsLoading(false)
                    return
                }

                const rows = data.slice(1)

                // Track duplicate names
                const nameCounts = new Map<string, number>()
                rows.forEach(row => {
                    const name = row[nameIdx]
                    if (name) {
                        const cleanName = String(name).trim().toLowerCase()
                        nameCounts.set(cleanName, (nameCounts.get(cleanName) || 0) + 1)
                    }
                })

                const parsed: ImportPreview[] = rows.map(row => {
                    const name = row[nameIdx] ? String(row[nameIdx]).trim() : ''
                    const code = codeIdx !== -1 && row[codeIdx] ? String(row[codeIdx]).trim() : ''
                    const specification = specIdx !== -1 && row[specIdx] ? String(row[specIdx]).trim() : ''
                    const location = locationIdx !== -1 && row[locationIdx] ? String(row[locationIdx]).trim() : ''
                    const price = priceIdx !== -1 && row[priceIdx] ? parseFloat(row[priceIdx]) : null
                    const notes = notesIdx !== -1 && row[notesIdx] ? String(row[notesIdx]).trim() : ''
                    const purchaseDate = purchaseDateIdx !== -1 && row[purchaseDateIdx] ? String(row[purchaseDateIdx]).trim() : null
                    const usefulLife = usefulLifeIdx !== -1 && row[usefulLifeIdx] ? parseInt(row[usefulLifeIdx]) : null
                    const residualValue = residualIdx !== -1 && row[residualIdx] ? parseFloat(row[residualIdx]) : null
                    const image = imageIdx !== -1 && row[imageIdx] ? String(row[imageIdx]).trim() : ''

                    const errors = []
                    if (!name) errors.push('Missing Name')
                    if (!location) errors.push('Missing Location')

                    const cleanName = name.toLowerCase()
                    if (cleanName && (nameCounts.get(cleanName) || 0) > 1) {
                        errors.push('Duplicate Name in file')
                    }

                    return {
                        name,
                        code,
                        specification,
                        location,
                        price,
                        notes,
                        purchaseDate,
                        usefulLife,
                        residualValue,
                        image,
                        isValid: errors.length === 0,
                        errors
                    }
                }).filter(r => r.name || r.location)

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
                name: d.name,
                code: d.code,
                specification: d.specification,
                location: d.location,
                price: d.price,
                notes: d.notes,
                purchaseDate: d.purchaseDate,
                usefulLife: d.usefulLife,
                residualValue: d.residualValue,
                image: d.image
            }))

            const result = await importAssets(formData)
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

    const formatPrice = (price: number | null) => {
        if (!price && price !== 0) return '-'
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price)
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                title="Import Excel/CSV"
            >
                <FileSpreadsheet className="w-4 h-4" />
            </button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={
                    <div>
                        <div className="text-xl font-bold text-foreground">Import Aset</div>
                        <div className="text-sm font-normal text-muted-foreground mt-1">Upload Excel (.xlsx) or CSV file to import assets.</div>
                    </div>
                }
                maxWidth="5xl"
                className="!overflow-hidden flex flex-col gap-6"
                footer={!importResult ? (
                    <div className="flex justify-end gap-3 w-full">
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
                ) : null}
            >
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 gap-6">

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
                                        <li>Required: <strong>Nama Aset, Lokasi</strong></li>
                                        <li>Optional: <strong>Kode, Spesifikasi, Harga, Keterangan, Tahun, Umur Ekonomis, Nilai Residu, Image URL</strong></li>
                                        <li>Existing assets with same name will be <strong>UPDATED</strong></li>
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
                                        <thead className="bg-muted text-muted-foreground font-normal sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-3 border-b border-border w-10 bg-muted">#</th>
                                                <th className="p-3 border-b border-border bg-muted">Status</th>
                                                <th className="p-3 border-b border-border bg-muted">Nama</th>
                                                <th className="p-3 border-b border-border bg-muted">Kode</th>
                                                <th className="p-3 border-b border-border bg-muted">Lokasi</th>
                                                <th className="p-3 border-b border-border bg-muted text-right">Harga</th>
                                                <th className="p-3 border-b border-border bg-muted">Tgl/Thn</th>
                                                <th className="p-3 border-b border-border bg-muted">Image</th>
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
                                                    <td className="p-3 font-medium">{row.name}</td>
                                                    <td className="p-3 font-mono text-xs">{row.code || '-'}</td>
                                                    <td className="p-3">{row.location}</td>
                                                    <td className="p-3 text-right tabular-nums">{formatPrice(row.price)}</td>
                                                    <td className="p-3">{row.purchaseDate || '-'}</td>
                                                    <td className="p-3">
                                                        {row.image ? (
                                                            <div className="relative w-8 h-8 rounded overflow-hidden border border-border">
                                                                <img src={row.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                                            </div>
                                                        ) : <span className="text-xs text-muted-foreground">-</span>}
                                                    </td>
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
                                    Successfully imported/updated <strong className="text-foreground">{importResult.success}</strong> assets.
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
            </Modal>
        </>
    )
}
