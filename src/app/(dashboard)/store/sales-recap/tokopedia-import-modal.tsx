'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, ShoppingBag } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { formatCurrency, formatNumber } from '@/utils/format'
import { checkExistingOrders, getProductsBySkuOrName, bulkCreateStoreSaleLogs } from '@/app/actions/store-sale-log'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface ImportRow {
    externalOrderNumber: string
    orderNumber: string
    itemName: string
    itemSku: string
    quantity: number
    nominal: number
    orderDate: Date
    itemId: number
    marketplace: string
    status: 'new' | 'duplicate' | 'no-sku'
}

interface TokopediaImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

function parseNominal(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
        const cleaned = value.replace(/\./g, '').replace(',', '.')
        return parseFloat(cleaned) || 0
    }
    return 0
}

function parseTokopediaDate(dateStr: string): Date {
    // Tokopedia format typically "DD/MM/YYYY HH:mm:ss"
    if (!dateStr) return new Date()
    try {
        const parts = dateStr.trim().split(' ')
        if (parts.length >= 2) {
            const dmy = parts[0].split('/')
            if (dmy.length === 3) {
                // Ensure proper formatting for ISO standard (YYYY-MM-DDTHH:mm:ss)
                const dd = dmy[0].padStart(2, '0')
                const mm = dmy[1].padStart(2, '0')
                const yyyy = dmy[2]
                const isoStr = `${yyyy}-${mm}-${dd}T${parts[1]}Z`
                const d = new Date(isoStr)
                if (!isNaN(d.getTime())) return d
            }
        }
        const fallback = new Date(dateStr)
        if (!isNaN(fallback.getTime())) return fallback
    } catch (e) {
        console.error("Date parse error", dateStr)
    }
    return new Date()
}

export function TokopediaImportModal({ isOpen, onClose, onSuccess }: TokopediaImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'saving' | 'done'>('upload')
    const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
    const [parseError, setParseError] = useState<string | null>(null)
    const [saveResult, setSaveResult] = useState<{ count: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [fileName, setFileName] = useState('')
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetState = () => {
        setStep('upload')
        setParsedRows([])
        setParseError(null)
        setSaveResult(null)
        setLoading(false)
        setFileName('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleClose = () => {
        resetState()
        onClose()
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        setParseError(null)
        setLoading(true)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            let json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })

            if (json.length === 0) {
                setParseError('File Excel kosong atau format tidak sesuai.')
                setLoading(false)
                return
            }

            // Tokopedia excel usually puts descriptions in row index 1 (second row). 
            // We can just filter out rows that don't have a valid Order ID that looks like a number
            const validRows = json.filter((row: any) => {
                const orderId = (row['Order ID'] || '').toString().trim()
                return orderId && orderId !== 'Platform unique order ID.'
            })

            // Filter only "Selesai" status
            const completedOrders = validRows.filter((row: any) => {
                const status = (row['Order Status'] || '').toString().trim()
                return status === 'Selesai'
            })

            if (completedOrders.length === 0) {
                setParseError('Tidak ada pesanan dengan Status "Selesai" ditemukan.')
                setLoading(false)
                return
            }

            // Group by order number to assign (1), (2), etc.
            const orderItemCount: Record<string, number> = {}

            // Collect unique external order numbers, SKUs, and Product Names
            const externalOrderNumbers = [...new Set(completedOrders.map((r: any) => String(r['Order ID'] || '').trim()))]
            const skus = [...new Set(completedOrders.map((r: any) => String(r['Seller SKU'] || '').trim()).filter(Boolean))]
            const productNames = [...new Set(completedOrders.map((r: any) => String(r['Product Name'] || '').trim()).filter(Boolean))]

            // Check existing orders and get product mappings in parallel
            const [existingRes, productRes] = await Promise.all([
                checkExistingOrders(externalOrderNumbers),
                getProductsBySkuOrName(skus, productNames)
            ])

            const existingSet = new Set(existingRes.existingOrders || [])
            const skuMap: Record<string, { wcId: number; name: string }> = {}
            const nameMap: Record<string, { wcId: number; sku: string }> = {}

            if (productRes.products) {
                for (const p of productRes.products as any[]) {
                    if (p.sku) skuMap[p.sku.toLowerCase()] = { wcId: p.wcId, name: p.name }
                    if (p.name) nameMap[p.name.toLowerCase()] = { wcId: p.wcId, sku: p.sku }
                }
            }

            // Build rows
            const rows: ImportRow[] = completedOrders.map((row: any) => {
                const extOrderNum = String(row['Order ID'] || '').trim()
                const sku = String(row['Seller SKU'] || '').trim()
                const itemName = String(row['Product Name'] || '').trim()
                const quantity = parseInt(String(row['Quantity'] || '0')) || 0
                const nominal = parseNominal(row['SKU Subtotal After Discount'])
                
                const dateStr = String(row['Paid Time'] || '').trim()
                const orderDate = parseTokopediaDate(dateStr)

                // Track item index within same order
                if (!orderItemCount[extOrderNum]) orderItemCount[extOrderNum] = 0
                orderItemCount[extOrderNum]++
                const itemIndex = orderItemCount[extOrderNum]

                // Generate internal orderNumber with suffix
                const orderNumber = `TKP-${extOrderNum}(${itemIndex})`

                // Check SKU match first, then fallback to Name match
                const matchedBySku = sku ? skuMap[sku.toLowerCase()] : null
                const matchedByName = itemName ? nameMap[itemName.toLowerCase()] : null
                const itemId = matchedBySku ? matchedBySku.wcId : (matchedByName ? matchedByName.wcId : 0)

                // Determine status
                let status: ImportRow['status'] = 'new'
                if (existingSet.has(extOrderNum)) {
                    status = 'duplicate'
                } else if (!sku) {
                    status = 'no-sku'
                }

                return {
                    externalOrderNumber: extOrderNum,
                    orderNumber,
                    itemName,
                    itemSku: sku,
                    quantity,
                    nominal,
                    orderDate,
                    itemId,
                    marketplace: 'tokopedia',
                    status
                }
            })

            // Remove any order that might be completely empty/invalid
            const finalRows = rows.filter(r => r.externalOrderNumber && r.itemName)

            setParsedRows(finalRows)
            setStep('preview')
        } catch (err: any) {
            console.error(err)
            setParseError(`Gagal membaca file: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const newRowsFiltered = parsedRows.filter(r => r.status === 'new')
    const duplicateRows = parsedRows.filter(r => r.status === 'duplicate')
    const noSkuRows = parsedRows.filter(r => r.status === 'no-sku')

    const sortedRows = [...parsedRows].sort((a, b) => {
        if (!sortDir) return 0
        const valA = a.itemId || 0
        const valB = b.itemId || 0
        return sortDir === 'asc' ? valA - valB : valB - valA
    })

    const handleSort = () => {
        setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    }

    const handleSave = async () => {
        if (newRowsFiltered.length === 0) return
        setStep('saving')
        setLoading(true)

        try {
            const dataToSave = newRowsFiltered.map(r => ({
                orderNumber: r.orderNumber,
                externalOrderNumber: r.externalOrderNumber,
                orderDate: r.orderDate,
                itemId: r.itemId,
                itemName: r.itemName,
                itemSku: r.itemSku,
                quantity: r.quantity,
                nominal: r.nominal,
                marketplace: r.marketplace
            }))

            const res = await bulkCreateStoreSaleLogs(dataToSave)
            if (res.success) {
                setSaveResult({ count: res.count || 0 })
                setStep('done')
                onSuccess()
            } else {
                setParseError(res.error || 'Gagal menyimpan data')
                setStep('preview')
            }
        } catch (err: any) {
            setParseError(`Error: ${err.message}`)
            setStep('preview')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                <div className="flex items-center gap-2">
                    <img src="/icons8-tiktok.svg" alt="Tokopedia" className="w-5 h-5 object-contain" />
                    Import Data Tokopedia
                </div>
            }
            maxWidth="4xl"
            footer={
                step === 'preview' ? (
                    <div className="flex justify-between items-center w-full">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <div>
                                <span className="font-bold text-emerald-600">{newRowsFiltered.length}</span> baris baru
                                {noSkuRows.length > 0 && (
                                    <span className="ml-2">• <span className="font-bold text-amber-600">{noSkuRows.length}</span> SKU tidak ditemukan</span>
                                )}
                            </div>
                            {duplicateRows.length > 0 && (
                                <span className="text-xs opacity-50 px-2 py-0.5 bg-muted rounded">+{duplicateRows.length} duplikat diabaikan</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleClose} className="px-4 py-2 font-semibold text-muted-foreground hover:text-foreground">
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={newRowsFiltered.length === 0}
                                className="px-6 py-2 bg-[#00AA5B] text-white font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Simpan {newRowsFiltered.length} Data
                            </button>
                        </div>
                    </div>
                ) : step === 'done' ? (
                    <div className="flex justify-end w-full">
                        <button onClick={handleClose} className="px-6 py-2 bg-primary text-primary-foreground font-black rounded-xl hover:opacity-90">
                            Selesai
                        </button>
                    </div>
                ) : null
            }
        >
            {step === 'upload' && (
                <div className="py-8">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border hover:border-[#00AA5B]/50 rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:bg-[#00AA5B]/5 transition-all group"
                    >
                        <div className="p-4 bg-[#00AA5B]/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-[#00AA5B]" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-foreground">Klik untuk upload file Excel Tokopedia</p>
                            <p className="text-sm text-muted-foreground mt-1">Format: .xlsx / .xls • Export pesanan "Selesai"</p>
                        </div>
                        {loading && (
                            <div className="flex items-center gap-2 text-[#00AA5B]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">Memproses file...</span>
                            </div>
                        )}
                        {fileName && !loading && (
                            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium">{fileName}</span>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    {parseError && (
                        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive font-medium">{parseError}</p>
                        </div>
                    )}
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-4">
                    {duplicateRows.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700">
                                <span className="font-bold">{duplicateRows.length}</span> baris duplikat (order sudah ada di database) akan dilewati.
                            </p>
                        </div>
                    )}

                    {parseError && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive font-medium">{parseError}</p>
                        </div>
                    )}

                    <div className="max-h-[400px] overflow-auto rounded-xl border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]">#</TableHead>
                                    <TableHead className="w-[150px]">No. Order</TableHead>
                                    <TableHead>Nama Produk</TableHead>
                                    <TableHead className="w-[100px]">SKU</TableHead>
                                    <TableHead align="right" className="w-[60px]">Qty</TableHead>
                                    <TableHead align="right" className="w-[120px]">Nominal</TableHead>
                                    <TableHead 
                                        align="center" 
                                        className="w-[80px] cursor-pointer hover:text-primary transition-colors select-none"
                                        onClick={handleSort}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            ID
                                            <div className="flex flex-col -gap-1 opacity-50">
                                                <div className={`w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-l-transparent border-r-transparent ${sortDir === 'asc' ? 'border-primary opacity-100' : 'border-current'}`} />
                                                <div className={`w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent mt-0.5 ${sortDir === 'desc' ? 'border-primary opacity-100' : 'border-current'}`} />
                                            </div>
                                        </div>
                                    </TableHead>
                                    <TableHead align="center" className="w-[80px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedRows.map((row, idx) => (
                                    <TableRow key={idx} className={row.status === 'duplicate' ? 'opacity-40 bg-muted/30' : ''}>
                                        <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {row.orderNumber}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium truncate max-w-[250px]">{row.itemName}</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{row.itemSku || '-'}</TableCell>
                                        <TableCell align="right" className="font-semibold">{formatNumber(row.quantity)}</TableCell>
                                        <TableCell align="right" className="font-bold text-[#00AA5B]">{formatCurrency(row.nominal)}</TableCell>
                                        <TableCell align="center">
                                            {row.itemId > 0 ? (
                                                <span className="text-xs font-mono bg-[#00AA5B]/10 text-[#00AA5B] px-1.5 py-0.5 rounded border border-[#00AA5B]/20">{row.itemId}</span>
                                            ) : (
                                                <span className="text-xs font-mono bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">?</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {row.status === 'new' ? (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#00AA5B]/10 text-[#00AA5B] border border-[#00AA5B]/20">Baru</span>
                                            ) : row.status === 'duplicate' ? (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">Duplikat</span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">No SKU</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {step === 'saving' && (
                <div className="py-16 flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#00AA5B]" />
                    <p className="font-bold text-foreground">Menyimpan {newRowsFiltered.length} data...</p>
                    <p className="text-sm text-muted-foreground">Mohon tunggu, jangan tutup halaman ini.</p>
                </div>
            )}

            {step === 'done' && saveResult && (
                <div className="py-16 flex flex-col items-center gap-4">
                    <div className="p-4 bg-[#00AA5B]/10 rounded-full">
                        <CheckCircle2 className="w-10 h-10 text-[#00AA5B]" />
                    </div>
                    <p className="text-xl font-black text-foreground">Import Berhasil!</p>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-[#00AA5B]">{newRowsFiltered.length}</span> data penjualan Tokopedia berhasil disimpan ke database.
                    </p>
                </div>
            )}
        </Modal>
    )
}
