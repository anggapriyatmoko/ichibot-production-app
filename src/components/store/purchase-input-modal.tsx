'use client'

import { useState, useEffect } from 'react'
import { Package, DollarSign, Hash, Layers } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { toggleStoreProductPurchased, updatePurchaseData } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import { formatNumber } from '@/utils/format'

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
    }
    kursYuan?: number
    kursUsd?: number
    /** When true, only updates purchase data without toggling purchased status */
    editMode?: boolean
}

export default function PurchaseInputModal({
    isOpen,
    onClose,
    product,
    kursYuan,
    kursUsd,
    editMode = false
}: PurchaseInputModalProps) {
    const [purchasePackage, setPurchasePackage] = useState(1)
    const [purchaseQty, setPurchaseQty] = useState<number | ''>('')
    const [purchasePrice, setPurchasePrice] = useState<number | ''>('')
    const [purchaseCurrency, setPurchaseCurrency] = useState('CNY')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { showError } = useAlert()
    const router = useRouter()

    // Pre-fill fields when editing
    useEffect(() => {
        if (isOpen && editMode && product) {
            setPurchasePackage(product.purchasePackage || 1)
            setPurchaseQty(product.purchaseQty || '')
            setPurchasePrice(product.purchasePrice || '')
            setPurchaseCurrency(product.purchaseCurrency || 'CNY')
        } else if (isOpen && !editMode) {
            setPurchasePackage(1)
            setPurchaseQty('')
            setPurchasePrice('')
            setPurchaseCurrency('CNY')
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
                purchasePackage,
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
            </div>

            <div className="space-y-5">
                {/* Paket Barang */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        Paket Barang
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={purchasePackage}
                        onChange={(e) => setPurchasePackage(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                        placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Jumlah paket/karton yang dibeli</p>
                </div>

                {/* Jumlah Barang */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        Jumlah Barang <span className="text-destructive">*</span>
                    </label>
                    <input
                        type="number"
                        min={1}
                        value={purchaseQty}
                        onChange={(e) => setPurchaseQty(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                        placeholder="Masukkan jumlah barang"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Total unit/pcs yang dibeli</p>
                </div>

                {/* Harga + Currency */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Harga beli per pcs <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min={0}
                            step="any"
                            value={purchasePrice}
                            onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
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
                    {conversionHint && (
                        <p className="text-xs text-primary font-medium mt-1.5 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                            {conversionHint}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Harga beli per pcs/satuan</p>
                </div>
            </div>
        </Modal>
    )
}
