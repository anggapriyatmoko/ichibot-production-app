'use client'

import { useState, useEffect } from 'react'
import { Package, DollarSign, Hash, Layers, BarChart3 } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { toggleStoreProductPurchased, updatePurchaseData } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import { formatNumber, formatCurrency } from '@/utils/format'

interface PurchaseInputModalProps {
    isOpen: boolean
    onClose: () => void
    product: {
        wcId: number
        name: string
        price?: number
        purchasePackage?: number | null
        purchaseQty?: number | null
        purchasePrice?: number | null
        purchaseCurrency?: string | null
        sku?: string | null
        stockQuantity?: number | null
        regularPrice?: number | null
        salePrice?: number | null
    }
    kursYuan?: number
    kursUsd?: number
    additionalFee?: number
    /** When true, only updates purchase data without toggling purchased status */
    editMode?: boolean
}

export default function PurchaseInputModal({
    isOpen,
    onClose,
    product,
    kursYuan,
    kursUsd,
    additionalFee = 0,
    editMode = false
}: PurchaseInputModalProps) {
    const [purchasePackage, setPurchasePackage] = useState<number | ''>('')
    const [purchaseQty, setPurchaseQty] = useState<number | ''>(1)
    const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
    const [purchaseCurrency, setPurchaseCurrency] = useState('CNY')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { showError } = useAlert()
    const router = useRouter()

    // Pre-fill fields when editing or if product has history
    useEffect(() => {
        if (isOpen && product) {
            const hasHistory = product.purchasePrice || product.purchaseQty || product.purchasePackage

            if (editMode || hasHistory) {
                setPurchasePackage(product.purchasePackage || '')
                setPurchaseQty(product.purchaseQty || 1)
                setPurchasePrice(product.purchasePrice || '')
                setPurchaseCurrency(product.purchaseCurrency || 'CNY')
            } else {
                setPurchasePackage('')
                setPurchaseQty(1)
                setPurchasePrice('')
                setPurchaseCurrency('CNY')
            }
        }
    }, [isOpen, editMode, product])

    const currencies = [
        { value: 'IDR', label: 'IDR (Rupiah)' },
        { value: 'CNY', label: 'Yuan (¥)' },
        { value: 'USD', label: 'USD ($)' },
    ]

    const handleSubmit = async () => {
        if (!purchaseQty || purchaseQty <= 0) {
            showError('Jumlah barang harus diisi.')
            return
        }
        if (!purchasePrice || purchasePrice <= 0) {
            showError('Harga harus diisi.')
            return
        }

        setIsSubmitting(true)
        try {
            const data = {
                purchasePackage: Number(purchasePackage) || 1,
                purchaseQty: Number(purchaseQty),
                purchasePrice: Number(purchasePrice),
                purchaseCurrency,
            }

            let result
            if (editMode) {
                result = await updatePurchaseData(product.wcId, data)
            } else {
                result = await toggleStoreProductPurchased(product.wcId, true, data)
            }

            if (result.success) {
                router.refresh()
                onClose()
            } else {
                showError('Gagal menyimpan data pembelian.')
            }
        } catch {
            showError('Terjadi kesalahan sistem.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const conversionHint = (() => {
        if (!purchasePrice || purchasePrice <= 0) return null
        if (purchaseCurrency === 'CNY' && kursYuan && kursYuan > 0) {
            return `≈ Rp ${formatNumber(Math.round(Number(purchasePrice) * kursYuan))}`
        }
        if (purchaseCurrency === 'USD' && kursUsd && kursUsd > 0) {
            return `≈ Rp ${formatNumber(Math.round(Number(purchasePrice) * kursUsd))}`
        }
        return null
    })()

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span>{editMode ? 'Edit Data Pembelian' : 'Data Pembelian'}</span>
                </div>
            }
            maxWidth="sm"
            footer={
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Menyimpan...
                            </>
                        ) : editMode ? (
                            'Simpan Perubahan'
                        ) : (
                            'Simpan & Tandai Beli'
                        )}
                    </button>
                </div>
            }
        >
            {/* Product Name */}
            <div className="mb-5 pb-4 border-b border-border">
                <p className="text-sm text-muted-foreground">Produk</p>
                <p className="font-semibold text-foreground text-sm mt-0.5 line-clamp-2">{product.name}</p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold mb-0.5">SKU</span>
                        <span className="font-medium text-foreground font-mono">{product.sku || '-'}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold mb-0.5">Stok</span>
                        <span className="font-medium text-foreground">
                            {product.stockQuantity !== undefined && product.stockQuantity !== null ? formatNumber(product.stockQuantity) : '-'}
                        </span>
                    </div>
                    <div className="col-span-2">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold mb-0.5">Harga Jual</span>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{formatCurrency(product.price || 0)}</span>
                                {product.salePrice && product.salePrice > 0 && product.salePrice < (product.regularPrice || 0) ? (
                                    <span className="text-muted-foreground line-through text-[10px]">
                                        {formatCurrency(product.regularPrice || 0)}
                                    </span>
                                ) : null}
                            </div>
                            {(() => {
                                if (!purchasePrice || !purchasePackage || !product.price) return null
                                const paket = Number(purchasePackage) || 1
                                const jumlah = Number(purchaseQty) || 1
                                let priceInIdr = Number(purchasePrice)
                                if (purchaseCurrency === 'CNY' && kursYuan) {
                                    priceInIdr = Number(purchasePrice) * kursYuan
                                } else if (purchaseCurrency === 'USD' && kursUsd) {
                                    priceInIdr = Number(purchasePrice) * kursUsd
                                }
                                const totalHarga = priceInIdr * paket * (1 + (additionalFee || 0) / 100)
                                const perPcs = totalHarga / ((paket * jumlah) || 1)
                                const laba = product.price - perPcs
                                const isProfit = laba >= 0
                                return (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        Laba/pcs: {isProfit ? '+' : '-'}Rp {formatNumber(Math.abs(Math.round(laba)))}
                                    </span>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    {/* QTY Pembelian */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            QTY Pembelian
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={purchasePackage}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '')
                                setPurchasePackage(val === '' ? '' : parseInt(val) || 0)
                            }}
                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                            placeholder="Misal: 1"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Jumlah qty yang dibeli</p>
                    </div>

                    {/* Jumlah Barang / Isi per Paket */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            Isi per Paket <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={purchaseQty}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '')
                                setPurchaseQty(val === '' ? '' : parseInt(val) || 0)
                            }}
                            className="w-full px-3 py-2.5 bg-blue-50/50 border border-blue-200/50 rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                            placeholder="1"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                            Total: {(Number(purchasePackage) || 0) * (Number(purchaseQty) || 0)} pcs
                        </p>
                    </div>
                </div>

                {/* Harga + Currency */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Harga beli per pcs <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={purchasePrice}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '')
                                // Prevent multiple decimal points
                                if ((val.match(/\./g) || []).length > 1) return
                                setPurchasePrice(val === '' ? '' : val.endsWith('.') ? val as any : parseFloat(val) || 0)
                            }}
                            className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                            placeholder="Masukkan harga"
                        />
                        <select
                            value={purchaseCurrency}
                            onChange={(e) => setPurchaseCurrency(e.target.value)}
                            className="px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm min-w-[120px]"
                        >
                            {currencies.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    {purchasePrice && Number(purchasePrice) > 0 && (
                        <p className="text-[10px] text-primary font-medium mt-1.5 flex items-center gap-1">
                            <span className="inline-block w-1 h-1 rounded-full bg-primary" />
                            ≈ Rp {formatNumber(Math.round(Number(purchasePrice) * ((purchaseCurrency === 'CNY' ? kursYuan : purchaseCurrency === 'USD' ? kursUsd : 1) || 1)))}
                        </p>
                    )}
                </div>

                {(() => {
                    if (!purchasePrice || purchasePrice <= 0 || !purchaseQty || purchaseQty <= 0) return null

                    const rate = (purchaseCurrency === 'CNY' ? kursYuan : purchaseCurrency === 'USD' ? kursUsd : 1) || 1
                    const priceInputIdr = Number(purchasePrice) * rate
                    const paket = Number(purchasePackage) || 1
                    const qtyPerPaket = Number(purchaseQty) || 1
                    const totalItems = paket * qtyPerPaket
                    const totalAmountIdr = priceInputIdr * paket // Total = Harga * Paket
                    const pricePerPieceIdr = totalAmountIdr / (totalItems || 1) // per Pcs = Total / Total Items

                    return (
                        <div className="pt-3 space-y-2 border-t border-border mt-3 text-right">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground uppercase text-[10px]">Harga per Pcs</span>
                                <span className="font-semibold text-foreground">Rp {formatNumber(Math.round(pricePerPieceIdr))}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground uppercase">Total Barang</span>
                                <span className="font-semibold text-foreground">{formatNumber(totalItems)} pcs</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 mt-1 border-t border-dotted border-border">
                                <span className="text-xs font-bold text-primary uppercase">Total Pembelian</span>
                                <span className="text-lg font-black text-primary">Rp {formatNumber(Math.round(totalAmountIdr))}</span>
                            </div>
                        </div>
                    )
                })()}
            </div>
        </Modal>
    )
}
