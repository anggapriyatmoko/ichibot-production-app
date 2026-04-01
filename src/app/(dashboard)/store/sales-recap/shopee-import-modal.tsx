'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, ShoppingBag } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { formatCurrency, formatNumber } from '@/utils/format'
import { checkExistingOrders, getProductsBySku, bulkCreateStoreSaleLogs } from '@/app/actions/store-sale-log'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableScrollArea,
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

interface ShopeeImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

function parseShopeeNominal(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
        // Remove dots (thousand separators) and replace comma with dot for decimal
        const cleaned = value.replace(/\./g, '').replace(',', '.')
        return parseFloat(cleaned) || 0
    }
    return 0
}

export function ShopeeImportModal({ isOpen, onClose, onSuccess }: ShopeeImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'saving' | 'done'>('upload')
    const [parsedRows, setParsedRows] = useState<ImportRow[]>([])
    const [parseError, setParseError] = useState<string | null>(null)
    const [saveResult, setSaveResult] = useState<{ count: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [fileName, setFileName] = useState('')
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
            const json: any[] = XLSX.utils.sheet_to_json(sheet)

            if (json.length === 0) {
                setParseError('File Excel kosong atau format tidak sesuai.')
                setLoading(false)
                return
            }

            // Filter only "Selesai" status
            const completedOrders = json.filter((row: any) => {
                const status = (row['Status Pesanan'] || '').toString().trim()
                return status === 'Selesai'
            })

            if (completedOrders.length === 0) {
                setParseError('Tidak ada pesanan dengan Status "Selesai" ditemukan.')
                setLoading(false)
                return
            }

            // Group by order number to assign (1), (2), etc.
            const orderItemCount: Record<string, number> = {}

            // Collect unique external order numbers and SKUs
            const externalOrderNumbers = [...new Set(completedOrders.map((r: any) => String(r['No. Pesanan'] || '').trim()))]
            const skus = [...new Set(completedOrders.map((r: any) => String(r['SKU Induk'] || '').trim()).filter(Boolean))]

            // Check existing orders and get product SKU mappings in parallel
            const [existingRes, skuRes] = await Promise.all([
                checkExistingOrders(externalOrderNumbers),
                getProductsBySku(skus)
            ])

            const existingSet = new Set(existingRes.existingOrders || [])
            const skuMap: Record<string, { wcId: number; name: string }> = {}
            if (skuRes.products) {
                for (const p of skuRes.products as any[]) {
                    if (p.sku) skuMap[p.sku] = { wcId: p.wcId, name: p.name }
                }
            }

            // Build rows
            const rows: ImportRow[] = completedOrders.map((row: any) => {
                const extOrderNum = String(row['No. Pesanan'] || '').trim()
                const sku = String(row['SKU Induk'] || '').trim()
                const itemName = String(row['Nama Produk'] || '').trim()
                const quantity = parseInt(String(row['Jumlah'] || '0')) || 0
                const nominal = parseShopeeNominal(row['Dibayar Pembeli'])
                
                // Parse order date from "Waktu Pesanan Selesai" or "Waktu Pesanan Dibuat"
                const dateStr = String(row['Waktu Pesanan Selesai'] || row['Waktu Pesanan Dibuat'] || '').trim()
                let orderDate = new Date()
                if (dateStr) {
                    const parsed = new Date(dateStr)
                    if (!isNaN(parsed.getTime())) {
                        orderDate = parsed
                    }
                }

                // Track item index within same order
                if (!orderItemCount[extOrderNum]) orderItemCount[extOrderNum] = 0
                orderItemCount[extOrderNum]++
                const itemIndex = orderItemCount[extOrderNum]

                // Generate internal orderNumber with suffix
                const orderNumber = `SHP-${extOrderNum}(${itemIndex})`

                // Check SKU match
                const matched = sku ? skuMap[sku] : null
                const itemId = matched ? matched.wcId : 0

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
                    marketplace: 'shopee',
                    status
                }
            })

            setParsedRows(rows)
            setStep('preview')
        } catch (err: any) {
            console.error(err)
            setParseError(`Gagal membaca file: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const newRows = parsedRows.filter(r => r.status === 'new')
    const duplicateRows = parsedRows.filter(r => r.status === 'duplicate')

    const handleSave = async () => {
        if (newRows.length === 0) return
        setStep('saving')
        setLoading(true)

        try {
            const dataToSave = newRows.map(r => ({
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
                    <img src="/icons8-shopee.svg" alt="Shopee" className="w-5 h-5" />
                    Import Data Shopee
                </div>
            }
            maxWidth="4xl"
            footer={
                step === 'preview' ? (
                    <div className="flex justify-between items-center w-full">
                        <div className="text-sm text-muted-foreground">
                            <span className="font-bold text-emerald-600">{newRows.length}</span> baris baru
                            {duplicateRows.length > 0 && (
                                <span> • <span className="font-bold text-amber-600">{duplicateRows.length}</span> duplikat</span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleClose} className="px-4 py-2 font-semibold text-muted-foreground hover:text-foreground">
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={newRows.length === 0}
                                className="px-6 py-2 bg-[#EE4D2D] text-white font-black rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Simpan {newRows.length} Data
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
                        className="border-2 border-dashed border-border hover:border-[#EE4D2D]/50 rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:bg-[#EE4D2D]/5 transition-all group"
                    >
                        <div className="p-4 bg-[#EE4D2D]/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-[#EE4D2D]" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-foreground">Klik untuk upload file Excel Shopee</p>
                            <p className="text-sm text-muted-foreground mt-1">Format: .xlsx / .xls • Dari menu "Pesanan Saya" → Export</p>
                        </div>
                        {loading && (
                            <div className="flex items-center gap-2 text-[#EE4D2D]">
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
                                    <TableHead align="center" className="w-[80px]">ID</TableHead>
                                    <TableHead align="center" className="w-[80px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {parsedRows.map((row, idx) => (
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
                                        <TableCell align="right" className="font-bold text-emerald-600">{formatCurrency(row.nominal)}</TableCell>
                                        <TableCell align="center">
                                            {row.itemId > 0 ? (
                                                <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">{row.itemId}</span>
                                            ) : (
                                                <span className="text-xs font-mono bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200">?</span>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            {row.status === 'new' ? (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">Baru</span>
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
                    <Loader2 className="w-10 h-10 animate-spin text-[#EE4D2D]" />
                    <p className="font-bold text-foreground">Menyimpan {newRows.length} data...</p>
                    <p className="text-sm text-muted-foreground">Mohon tunggu, jangan tutup halaman ini.</p>
                </div>
            )}

            {step === 'done' && saveResult && (
                <div className="py-16 flex flex-col items-center gap-4">
                    <div className="p-4 bg-emerald-100 rounded-full">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <p className="text-xl font-black text-foreground">Import Berhasil!</p>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-bold text-emerald-600">{saveResult.count}</span> data penjualan Shopee berhasil disimpan ke database.
                    </p>
                </div>
            )}
        </Modal>
    )
}
