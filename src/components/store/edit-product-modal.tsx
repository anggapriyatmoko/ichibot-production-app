'use client'

import { useState, useMemo, useCallback } from 'react'
import { Trash2, X, Save, Loader2, Upload, ImageIcon, Plus, Tag, FileText } from 'lucide-react'
import { updateWooCommerceProduct, createWooCommerceProduct, deleteWooCommerceProduct, uploadStoreProductImages, getWooCommerceCategories } from '@/app/actions/store-product'
import { formatNumber } from '@/utils/format'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/modal'
import { Combobox } from '@/components/ui/combobox'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'

// Load Quill dynamically (SSR not supported)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })
import 'react-quill-new/dist/quill.snow.css'

interface ExistingImage {
    id: number
    src: string
    name?: string
    alt?: string
}

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

    // Existing images from WooCommerce (edit mode only)
    const [existingImages, setExistingImages] = useState<ExistingImage[]>(() => {
        if (!product?.images || isAddMode) return []
        try {
            const imgs = Array.isArray(product.images) ? product.images : JSON.parse(product.images)
            return imgs.filter((img: any) => img?.id && img?.src).map((img: any) => ({
                id: img.id,
                src: img.src,
                name: img.name || '',
                alt: img.alt || ''
            }))
        } catch (e) {
            return []
        }
    })

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
        shortDescription: product?.shortDescription || '',
        wholesalePrices: (() => {
            const defaultW = Array(5).fill({ minQty: '', price: '' });
            if (product?.wholesalePrices) {
                try {
                    const parsed = typeof product.wholesalePrices === 'string' ? JSON.parse(product.wholesalePrices) : product.wholesalePrices;
                    for (let i = 0; i < Math.min(5, parsed.length); i++) {
                        defaultW[i] = { minQty: parsed[i].minQty || '', price: parsed[i].price || '' };
                    }
                } catch (e) { }
            }
            return defaultW;
        })(),
        categoryId: getInitialCategoryId()
    })

    // Total images (existing + new) must be <= 5
    const totalImageCount = existingImages.length + selectedImages.length

    // Quill toolbar modules
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['blockquote'],
            ['link'],
            ['clean']
        ]
    }), [])

    const quillFormats = useMemo(() => [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list',
        'align',
        'blockquote',
        'link'
    ], [])

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

    const handleWholesaleChange = (index: number, field: 'minQty' | 'price', value: string) => {
        const numericValue = value.replace(/\D/g, '')
        setFormData(prev => {
            const newWholesale = [...prev.wholesalePrices]
            newWholesale[index] = { ...newWholesale[index], [field]: numericValue }
            return { ...prev, wholesalePrices: newWholesale }
        })
    }

    const handleDescriptionChange = useCallback((value: string) => {
        // Quill returns '<p><br></p>' for empty, normalize to empty string
        const cleaned = value === '<p><br></p>' ? '' : value
        if (cleaned.length <= 10000) {
            setFormData(prev => ({
                ...prev,
                description: cleaned
            }))
        }
    }, [])

    const handleShortDescriptionChange = useCallback((value: string) => {
        const cleaned = value === '<p><br></p>' ? '' : value
        if (cleaned.length <= 3000) {
            setFormData(prev => ({
                ...prev,
                shortDescription: cleaned
            }))
        }
    }, [])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        const slotsAvailable = 5 - totalImageCount
        const newFiles = files.slice(0, slotsAvailable)

        if (files.length > slotsAvailable) {
            showAlert(`Maksimal 5 gambar diperbolehkan. Sisa slot: ${slotsAvailable}`, 'Informasi')
        }

        setSelectedImages(prev => [...prev, ...newFiles])

        const newPreviews = newFiles.map(file => URL.createObjectURL(file))
        setImagePreviews(prev => [...prev, ...newPreviews])

        // Reset input value so same file can be selected again
        e.target.value = ''
    }

    const removeNewImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index))
        setImagePreviews(prev => {
            const newPreviews = [...prev]
            URL.revokeObjectURL(newPreviews[index])
            return newPreviews.filter((_, i) => i !== index)
        })
    }

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            let imageUrls: string[] = []

            // Handle image uploads (both add and edit mode)
            if (selectedImages.length > 0) {
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
                // Build existing image IDs to keep (in current order)
                const existingImageIds = existingImages.map(img => img.id)

                result = await updateWooCommerceProduct(product.wcId, {
                    ...payload,
                    parentId: product.parentId,
                    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                    existingImageIds: existingImageIds
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

    // Get the global index for display (existing + new combined)
    const getGlobalIndex = (type: 'existing' | 'new', localIndex: number) => {
        if (type === 'existing') return localIndex
        return existingImages.length + localIndex
    }

    // Strip HTML tags for character count
    const descriptionTextLength = formData.description.replace(/<[^>]*>/g, '').length
    const shortDescTextLength = formData.shortDescription.replace(/<[^>]*>/g, '').length

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={isAddMode ? 'Tambah Produk Store' : 'Edit Produk Store'}
            maxWidth="5xl"
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
            footer={
                <div className="flex items-center gap-3 w-full">
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
                        form="edit-product-form"
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
            }
        >
            <form id="edit-product-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: Product Info */}
                    <div className="space-y-4">
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

                        {/* Image Management Section */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                <ImageIcon className="w-3 h-3" /> Foto Produk (Maks 5)
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {/* Existing images from WooCommerce */}
                                {existingImages.map((img, index) => (
                                    <div key={`existing-${img.id}`} className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted group">
                                        <img src={img.src} alt={img.alt || `Image ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(index)}
                                            className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                        {getGlobalIndex('existing', index) === 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-white text-center py-0.5 font-bold uppercase">
                                                Utama
                                            </div>
                                        )}
                                        {getGlobalIndex('existing', index) !== 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-[8px] text-white/80 text-center py-0.5 font-medium">
                                                Gallery
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* New image previews */}
                                {imagePreviews.map((preview, index) => (
                                    <div key={`new-${index}`} className="relative aspect-square rounded-lg border-2 border-dashed border-emerald-300 overflow-hidden bg-emerald-50/30 group">
                                        <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeNewImage(index)}
                                            className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                        {getGlobalIndex('new', index) === 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-white text-center py-0.5 font-bold uppercase">
                                                Utama
                                            </div>
                                        )}
                                        {getGlobalIndex('new', index) !== 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-emerald-600/70 text-[8px] text-white text-center py-0.5 font-medium">
                                                Baru
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Upload button */}
                                {totalImageCount < 5 && (
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
                            {totalImageCount > 0 && (
                                <p className="text-[10px] text-muted-foreground italic">
                                    {totalImageCount}/5 gambar • Gambar pertama = gambar utama produk
                                </p>
                            )}
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

                        <div className="grid grid-cols-2 gap-2 gap-x-4">
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

                        {/* Wholesale Prices (Tier 1 - 5) */}
                        <div className="space-y-3 pt-3 border-t border-border">
                            <label className="text-xs font-bold text-muted-foreground uppercase">Harga Grosir (Tier 1 - 5)</label>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 mb-2 px-1">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Min Qty</div>
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Harga Grosir (Satuan Rp)</div>
                                </div>
                                {formData.wholesalePrices.map((tier, index) => (
                                    <div key={index} className="grid grid-cols-2 gap-4 items-center">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={tier.minQty ? formatNumber(tier.minQty) : ''}
                                                onChange={(e) => handleWholesaleChange(index, 'minQty', e.target.value)}
                                                placeholder={`Min Qty ${index + 1}`}
                                                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                            />
                                            <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/30 bg-background px-1 border border-border rounded shadow-sm">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={tier.price ? formatNumber(tier.price) : ''}
                                            onChange={(e) => handleWholesaleChange(index, 'price', e.target.value)}
                                            placeholder={`Harga Grosir ${index + 1}`}
                                            className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Short Description WYSIWYG */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Deskripsi Singkat Produk
                                </label>
                                <span className={cn(
                                    "text-[10px] font-medium",
                                    shortDescTextLength > 2800 ? "text-destructive" : "text-muted-foreground"
                                )}>
                                    {shortDescTextLength.toLocaleString()}/3.000
                                </span>
                            </div>
                            <div className="product-wysiwyg-editor product-wysiwyg-short">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.shortDescription}
                                    onChange={handleShortDescriptionChange}
                                    modules={quillModules}
                                    formats={quillFormats}
                                    placeholder="Masukkan deskripsi singkat produk..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: WYSIWYG Description */}
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Deskripsi Produk
                            </label>
                            <span className={cn(
                                "text-[10px] font-medium",
                                descriptionTextLength > 9500 ? "text-destructive" : "text-muted-foreground"
                            )}>
                                {descriptionTextLength.toLocaleString()}/10.000
                            </span>
                        </div>
                        <div className="flex-1 min-h-0 product-wysiwyg-editor">
                            <ReactQuill
                                theme="snow"
                                value={formData.description}
                                onChange={handleDescriptionChange}
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder="Masukkan rincian produk..."
                                className="h-full"
                            />
                        </div>
                    </div>
                </div>
            </form>

            {/* Scoped WYSIWYG editor styles */}
            <style jsx global>{`
                .product-wysiwyg-editor {
                    display: flex;
                    flex-direction: column;
                    min-height: 400px;
                }
                .product-wysiwyg-editor .quill {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-height: 0;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    border: 1px solid var(--border, #e5e7eb);
                }
                .product-wysiwyg-editor .ql-toolbar {
                    border: none !important;
                    border-bottom: 1px solid var(--border, #e5e7eb) !important;
                    background: var(--muted, #f9fafb);
                    padding: 6px 8px !important;
                    flex-shrink: 0;
                }
                .product-wysiwyg-editor .ql-toolbar .ql-formats {
                    margin-right: 8px !important;
                }
                .product-wysiwyg-editor .ql-toolbar button {
                    width: 26px !important;
                    height: 26px !important;
                    padding: 2px !important;
                }
                .product-wysiwyg-editor .ql-container {
                    border: none !important;
                    flex: 1;
                    min-height: 0;
                    font-size: 14px;
                    font-family: inherit;
                    overflow-y: auto;
                }
                .product-wysiwyg-editor .ql-editor {
                    min-height: 350px;
                    padding: 12px 16px;
                    line-height: 1.6;
                }
                
                /* Custom styles for the short description editor */
                .product-wysiwyg-short {
                    min-height: 200px !important;
                }
                .product-wysiwyg-short .ql-editor {
                    min-height: 150px !important;
                }
                .product-wysiwyg-editor .ql-editor.ql-blank::before {
                    color: var(--muted-foreground, #9ca3af);
                    font-style: italic;
                    font-size: 14px;
                }
                .product-wysiwyg-editor .ql-editor h1 { font-size: 1.5em; font-weight: 700; margin-bottom: 0.5em; }
                .product-wysiwyg-editor .ql-editor h2 { font-size: 1.3em; font-weight: 700; margin-bottom: 0.4em; }
                .product-wysiwyg-editor .ql-editor h3 { font-size: 1.15em; font-weight: 600; margin-bottom: 0.3em; }
                .product-wysiwyg-editor .ql-editor p { margin-bottom: 0.5em; }
                .product-wysiwyg-editor .ql-editor ul,
                .product-wysiwyg-editor .ql-editor ol { padding-left: 1.5em; margin-bottom: 0.5em; }
                .product-wysiwyg-editor .ql-editor blockquote {
                    border-left: 3px solid var(--primary, #2563eb);
                    padding-left: 12px;
                    margin: 0.5em 0;
                    color: var(--muted-foreground, #6b7280);
                }
                .product-wysiwyg-editor .ql-editor a { color: var(--primary, #2563eb); text-decoration: underline; }
                .product-wysiwyg-editor .ql-snow .ql-picker.ql-header {
                    width: 100px !important;
                }
            `}</style>
        </Modal>
    )
}
