'use client'

import { useState } from 'react'
import { Trash2, X, Save, Loader2, Upload, ImageIcon, Plus, Tag } from 'lucide-react'
import { updateWooCommerceProduct, createWooCommerceProduct, deleteWooCommerceProduct, uploadStoreProductImages, getWooCommerceCategories } from '@/app/actions/store-product'
import { formatNumber } from '@/utils/format'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/modal'
import { Combobox } from '@/components/ui/combobox'
import { useEffect } from 'react'

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
    const [selectedImages, setSelectedImages] = useState<File[]>([])
    const [imagePreviews, setImagePreviews] = useState<string[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(false)

    // Parse existing categories for edit mode
    const getInitialCategoryId = () => {
        if (!product?.categories) return ''
        try {
            const parsedCategories = typeof product.categories === 'string'
                ? JSON.parse(product.categories)
                : product.categories
            if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
                return parsedCategories[0].id.toString()
            }
        } catch (e) {
            console.error('Error parsing product categories:', e)
        }
        return ''
    }

    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        stockQuantity: product?.stockQuantity !== null && product?.stockQuantity !== undefined ? product.stockQuantity.toString() : '',
        regularPrice: product?.regularPrice !== null && product?.regularPrice !== undefined ? product.regularPrice.toString() : '',
        salePrice: product?.salePrice && parseFloat(product.salePrice.toString()) !== 0 ? product.salePrice.toString() : '',
        backupGudang: product?.backupGudang || '',
        status: product?.status || 'publish',
        weight: product?.weight && parseFloat(product.weight.toString()) !== 0 ? product.weight.toString() : '',
        description: product?.description || '',
        categoryId: getInitialCategoryId()
    })

    // Fetch categories on mount
    useEffect(() => {
        async function fetchCategories() {
            setIsLoadingCategories(true)
            try {
                const result = await getWooCommerceCategories()
                if (result.success) {
                    setCategories(result.categories || [])
                }
            } catch (error) {
                console.error('Failed to fetch categories:', error)
            } finally {
                setIsLoadingCategories(false)
            }
        }

        fetchCategories()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        // Only allow digits
        const numericValue = value.replace(/\D/g, '')
        setFormData(prev => ({
            ...prev,
            [name]: numericValue
        }))
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const remainingSlots = 5 - selectedImages.length
        const newFiles = files.slice(0, remainingSlots)

        if (files.length > remainingSlots) {
            showAlert('Maksimal 5 gambar diperbolehkan.', 'Informasi')
        }

        setSelectedImages(prev => [...prev, ...newFiles])

        const newPreviews = newFiles.map(file => URL.createObjectURL(file))
        setImagePreviews(prev => [...prev, ...newPreviews])
    }

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => {
            const newPreviews = [...prev]
            URL.revokeObjectURL(newPreviews[index])
            return newPreviews.filter((_, i) => i !== index)
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            let imageUrls: string[] = []

            // Handle image uploads for NEW products
            if (isAddMode && selectedImages.length > 0) {
                const uploadResult = await uploadStoreProductImages(selectedImages)
                if (uploadResult.success) {
                    imageUrls = uploadResult.urls
                } else {
                    throw new Error('Gagal mengunggah gambar sementara ke VPS.')
                }
            }

            // Convert string values back to number or null
            const payload = {
                ...formData,
                stockQuantity: formData.stockQuantity === '' ? null : parseInt(formData.stockQuantity),
                regularPrice: formData.regularPrice === '' ? null : parseFloat(formData.regularPrice),
                salePrice: formData.salePrice === '' ? null : parseFloat(formData.salePrice),
                weight: formData.weight === '' ? null : parseFloat(formData.weight),
                categoryId: formData.categoryId === '' ? null : parseInt(formData.categoryId)
            }

            let result
            if (isAddMode) {
                result = await createWooCommerceProduct({
                    ...payload,
                    imageUrls
                })
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
        <Modal
            isOpen={true}
            onClose={onClose}
            title={isAddMode ? 'Tambah Produk Store' : 'Edit Produk Store'}
            headerActions={!isAddMode && (
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
        >
            <form onSubmit={handleSubmit} className="space-y-4">
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

                {isAddMode && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <ImageIcon className="w-3 h-3" /> Foto Produk (Maks 5)
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted group">
                                    <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                    {index === 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-white text-center py-0.5 font-bold uppercase">
                                            Utama
                                        </div>
                                    )}
                                </div>
                            ))}
                            {selectedImages.length < 5 && (
                                <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                    <Plus className="w-5 h-5 mb-1" />
                                    <span className="text-[8px] font-bold uppercase">Upload</span>
                                </label>
                            )}
                        </div>
                    </div>
                )}

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

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                        <Tag className="w-3 h-3" /> Kategori Produk
                    </label>
                    <Combobox
                        options={categories.map((cat: any) => ({
                            id: cat.id.toString(),
                            label: cat.name
                        }))}
                        value={formData.categoryId}
                        onChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                        placeholder="Cari atau pilih kategori..."
                        disabled={isLoadingCategories}
                    />
                    {isLoadingCategories && <p className="text-[10px] text-muted-foreground italic mt-1">Memuat kategori...</p>}
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
                            type="text"
                            name="regularPrice"
                            value={formData.regularPrice ? formatNumber(formData.regularPrice) : ''}
                            onChange={handlePriceChange}
                            placeholder="0"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
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
                        type="text"
                        name="salePrice"
                        value={formData.salePrice ? formatNumber(formData.salePrice) : ''}
                        onChange={handlePriceChange}
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Kosongkan untuk menghapus harga sale dan kembali ke harga reguler.</p>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Deskripsi Produk (Maks 3000 karkater)</label>
                        <span className={cn(
                            "text-[10px] font-medium",
                            formData.description.length > 2800 ? "text-destructive" : "text-muted-foreground"
                        )}>
                            {formData.description.length}/3000
                        </span>
                    </div>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        maxLength={3000}
                        rows={4}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all resize-none min-h-[100px]"
                        placeholder="Masukkan rincian produk..."
                    />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-border mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving || isDeleting}
                        className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-all disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || isDeleting}
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
        </Modal>
    )
}
