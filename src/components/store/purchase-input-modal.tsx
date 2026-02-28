'use client'

import { useState, useEffect, useRef } from 'react'
import { Package, DollarSign, Hash, Layers, BarChart3, Search, X, Check } from 'lucide-react'
import Modal from '@/components/ui/modal'
import { toggleStoreProductPurchased, updatePurchaseData } from '@/app/actions/store-product'
import { getStoreSuppliers } from '@/app/actions/store-supplier'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'
import { formatNumber, formatCurrency } from '@/utils/format'
import { cn } from '@/lib/utils'

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
        storeName?: string | null
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
    const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
    const [supplierSearch, setSupplierSearch] = useState('')
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { showError } = useAlert()
    const router = useRouter()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowSupplierDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleSupplier = (name: string) => {
        setSelectedSuppliers(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        )
    }

    useEffect(() => {
        if (isOpen) {
            getStoreSuppliers().then(setSuppliers).catch(console.error)
        }
    }, [isOpen])

    // Pre-fill fields when editing or if product has history
    useEffect(() => {
        if (isOpen && product) {
            const hasHistory = product.purchasePrice || product.purchaseQty || product.purchasePackage

            if (editMode || hasHistory) {
                setPurchasePackage(product.purchasePackage || '')
                setPurchaseQty(product.purchaseQty || 1)
                setPurchasePrice(product.purchasePrice || '')
                setPurchaseCurrency(product.purchaseCurrency || 'CNY')
                setSelectedSuppliers(product.storeName ? product.storeName.split('||').map(s => s.trim()).filter(Boolean) : [])
            } else {
                setPurchasePackage('')
                setPurchaseQty(1)
                setPurchasePrice('')
                setPurchaseCurrency('CNY')
                setSelectedSuppliers(product.storeName ? product.storeName.split('||').map(s => s.trim()).filter(Boolean) : [])
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
                storeName: selectedSuppliers.length > 0 ? selectedSuppliers.join('||') : undefined,
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
            maxWidth="3xl"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column (Inputs) */}
                <div className="flex flex-col gap-6">
                    {/* Product Info Box */}
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Produk</p>
                        <p className="font-semibold text-foreground text-base line-clamp-2">{product.name}</p>

                        <div className="mt-4 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-[11px] uppercase font-medium mb-1.5">SKU</span>
                                    <span className="font-medium text-foreground text-sm">{product.sku || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[11px] uppercase font-medium mb-1.5">STOK</span>
                                    <span className="font-medium text-foreground text-sm">
                                        {product.stockQuantity !== undefined && product.stockQuantity !== null ? formatNumber(product.stockQuantity) : '-'}
                                    </span>
                                </div>
                                <div className="col-span-2 mt-2">
                                    <span className="text-muted-foreground block text-[11px] uppercase font-medium mb-1.5">HARGA JUAL</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-foreground text-sm">Rp {formatCurrency(product.price || 0).replace('Rp', '').trim()}</span>
                                        {product.salePrice && product.salePrice > 0 && product.salePrice < (product.regularPrice || 0) ? (
                                            <span className="text-muted-foreground line-through text-[11px]">
                                                {formatCurrency(product.regularPrice || 0)}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border w-full" />

                    <div className="space-y-6">
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
                                <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">Jumlah qty yang dibeli</p>
                            </div>

                            {/* Isi per Paket */}
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
                                    className="w-full px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                                    placeholder="1"
                                />
                                <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
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
                                <p className="text-[11px] text-primary font-medium mt-2 flex items-center gap-1.5">
                                    <span className="inline-block w-1 h-1 rounded-full bg-primary" />
                                    ≈ Rp {formatNumber(Math.round(Number(purchasePrice) * ((purchaseCurrency === 'CNY' ? kursYuan : purchaseCurrency === 'USD' ? kursUsd : 1) || 1)))}
                                </p>
                            )}
                        </div>

                        {/* Laba / Perkiraan Summary */}
                        {(() => {
                            if (!purchasePrice || purchasePrice <= 0 || !purchaseQty || purchaseQty <= 0) return null

                            const rate = (purchaseCurrency === 'CNY' ? kursYuan : purchaseCurrency === 'USD' ? kursUsd : 1) || 1
                            const priceInputIdr = Number(purchasePrice) * rate
                            const paket = Number(purchasePackage) || 1
                            const qtyPerPaket = Number(purchaseQty) || 1
                            const totalItems = paket * qtyPerPaket
                            const totalAmountIdr = priceInputIdr * paket // Total = Harga * Paket
                            const pricePerPieceIdr = totalAmountIdr / (totalItems || 1) // per Pcs = Total / Total Items

                            const laba = (product.price || 0) - pricePerPieceIdr
                            const isProfit = laba >= 0

                            return (
                                <div className="pt-4 space-y-3 border-t border-border mt-4 text-right">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground uppercase text-[11px] font-medium">Harga per Pcs</span>
                                        <span className="font-semibold text-foreground">Rp {formatNumber(Math.round(pricePerPieceIdr))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground uppercase text-[11px] font-medium">Laba / Pcs</span>
                                        <span className={`px-2 py-0.5 rounded font-semibold ${isProfit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {isProfit ? '+' : '-'}Rp {formatNumber(Math.abs(Math.round(laba)))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground uppercase text-[11px] font-medium">Total Barang</span>
                                        <span className="font-semibold text-foreground">{formatNumber(totalItems)} pcs</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-dotted border-border">
                                        <span className="text-xs font-bold text-primary uppercase">Total Pembelian</span>
                                        <span className="text-lg font-black text-primary">Rp {formatNumber(Math.round(totalAmountIdr))}</span>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>

                {/* Right Column (Data Supplier) */}
                <div className="flex flex-col h-full md:pl-6 md:border-l border-border mt-6 md:mt-0">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        Data Supplier
                    </label>
                    <div className="relative mb-4">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            value={supplierSearch}
                            onChange={(e) => setSupplierSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-background border-2 border-primary/60 hover:border-primary/80 focus:border-primary rounded-xl text-sm text-foreground outline-none transition-all shadow-sm"
                            placeholder="Cari supplier..."
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px] custom-scrollbar -mx-2 px-2">
                        {(() => {
                            const filtered = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));
                            if (filtered.length > 0) {
                                return (
                                    <div className="space-y-1 mt-2">
                                        {filtered.map((supplier) => (
                                            <label
                                                key={supplier.id}
                                                className="flex items-center gap-4 px-2 py-3 cursor-pointer group"
                                                onClick={() => toggleSupplier(supplier.name)}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0",
                                                    selectedSuppliers.includes(supplier.name)
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "border-border bg-background group-hover:border-primary/50"
                                                )}>
                                                    {selectedSuppliers.includes(supplier.name) && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                                </div>
                                                <span className={cn(
                                                    "text-sm transition-colors",
                                                    selectedSuppliers.includes(supplier.name) ? "font-medium text-foreground" : "text-foreground/80 group-hover:text-foreground"
                                                )}>
                                                    {supplier.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="p-8 text-center text-muted-foreground text-sm italic">
                                        {supplierSearch ? "Supplier tidak ditemukan." : "Belum ada data supplier."}
                                    </div>
                                );
                            }
                        })()}
                    </div>
                </div>
            </div>
        </Modal>
    )
}
