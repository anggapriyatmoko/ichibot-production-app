'use client'

import { useState } from 'react'
import { Trash2, X, Save, Loader2 } from 'lucide-react'
import { updateWooCommerceProduct, createWooCommerceProduct, deleteWooCommerceProduct } from '@/app/actions/store-product'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'

interface EditProductModalProps {
    product: any // If null, mode is 'add'
    onClose: () => void
    onSuccess: () => void
}

export default function EditProductModal({ product, onClose, onSuccess }: EditProductModalProps) {
    const isAddMode = !product?.wcId
    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        stockQuantity: product?.stockQuantity !== null && product?.stockQuantity !== undefined ? product.stockQuantity.toString() : '',
        regularPrice: product?.regularPrice !== null && product?.regularPrice !== undefined ? product.regularPrice.toString() : '',
        salePrice: product?.salePrice && parseFloat(product.salePrice.toString()) !== 0 ? product.salePrice.toString() : '',
        backupGudang: product?.backupGudang || '',
        status: product?.status || 'publish',
        weight: product?.weight && parseFloat(product.weight.toString()) !== 0 ? product.weight.toString() : ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            // Convert string values back to number or null
            const payload = {
                ...formData,
                stockQuantity: formData.stockQuantity === '' ? null : parseInt(formData.stockQuantity),
                regularPrice: formData.regularPrice === '' ? null : parseFloat(formData.regularPrice),
                salePrice: formData.salePrice === '' ? null : parseFloat(formData.salePrice),
                weight: formData.weight === '' ? null : parseFloat(formData.weight),
            }

            let result
            if (isAddMode) {
                result = await createWooCommerceProduct(payload)
            } else {
                result = await updateWooCommerceProduct(product.wcId, {
                    ...payload,
                    parentId: product.parentId
                })
            }

            if (result.success) {
                onClose()
                onSuccess()
                showAlert(
                    isAddMode ? 'Produk berhasil ditambahkan ke WooCommerce dan database.' : 'Produk berhasil diperbarui di WooCommerce dan database.',
                    'Berhasil'
                )
            } else {
                showError(result.error || `Gagal ${isAddMode ? 'menambahkan' : 'memperbarui'} produk.`)
            }
        } catch (error: any) {
            showError(error.message || 'Terjadi kesalahan sistem saat menyimpan.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        showConfirmation({
            title: 'Hapus Produk',
            message: 'Apakah Anda yakin ingin menghapus produk ini secara permanen dari WooCommerce dan database?',
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            type: 'confirm',
            action: async () => {
                setIsDeleting(true)
                try {
                    const result = await deleteWooCommerceProduct(product.wcId, product.parentId)
                    if (result.success) {
                        onClose()
                        onSuccess()
                        showAlert('Produk berhasil dihapus.', 'Berhasil')
                    } else {
                        showError(result.error || 'Gagal menghapus produk.')
                    }
                } catch (error: any) {
                    showError(error.message || 'Terjadi kesalahan sistem saat menghapus.')
                } finally {
                    setIsDeleting(false)
                }
            }
        })
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                    <h3 className="font-bold text-lg text-foreground">
                        {isAddMode ? 'Tambah Produk Store' : 'Edit Produk Store'}
                    </h3>
                    <div className="flex items-center gap-1">
                        {!isAddMode && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isSaving || isDeleting}
                                className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-full transition-colors disabled:opacity-50"
                                title="Hapus Produk"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-5 h-5" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-full transition-colors"
                            disabled={isSaving || isDeleting}
                        >
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Nama Produk</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase">SKU</label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all font-mono"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Backup Gudang</label>
                            <input
                                type="text"
                                name="backupGudang"
                                value={formData.backupGudang}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-lg text-sm focus:border-primary outline-none transition-all font-bold text-blue-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Stok</label>
                            <input
                                type="number"
                                name="stockQuantity"
                                value={formData.stockQuantity}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Status Produk</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="publish">Publish</option>
                                <option value="draft">Draft</option>
                                <option value="private">Private</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Harga Reguler</label>
                            <input
                                type="number"
                                name="regularPrice"
                                value={formData.regularPrice}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Berat (kg)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Harga Sale (Opsional)</label>
                        <input
                            type="number"
                            name="salePrice"
                            value={formData.salePrice}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <p className="text-[10px] text-muted-foreground italic">Kosongkan untuk menghapus harga sale dan kembali ke harga reguler.</p>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-all disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {isAddMode ? 'Tambah Produk' : 'Simpan Perubahan'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
