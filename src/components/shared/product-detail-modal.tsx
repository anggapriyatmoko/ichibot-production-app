'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Package, ChevronLeft, ChevronRight, ShoppingCart, Loader2, Pencil, Camera, Trash2, Save, X, Undo2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/format'
import { getProductVariations } from '@/app/actions/store-product'
import Modal from '@/components/ui/modal'
import { useAlert } from '@/hooks/use-alert'
import { updateProduct, deleteProduct } from '@/app/actions/product'
import { updateSparepartProject, deleteSparepartProject } from '@/app/actions/sparepart-project'
import EditProductModal from '@/components/store/edit-product-modal'
import { useConfirmation } from '@/components/providers/modal-provider'

interface ProductDetailModalProps {
    product: any
    isOpen: boolean
    onClose: () => void
    onAddToCart?: (product: any) => void
    onSuccess?: () => void
}

export default function ProductDetailModal({ product, isOpen, onClose, onAddToCart, onSuccess }: ProductDetailModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [variations, setVariations] = useState<any[]>([])
    const [loadingVariations, setLoadingVariations] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [showEditStore, setShowEditStore] = useState(false)
    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    // Edit form state
    const [isSaving, setIsSaving] = useState(false)
    const [editForm, setEditForm] = useState({
        name: '',
        sku: '',
        stock: '',
        lowStockThreshold: '',
        notes: '',
        image: null as File | null,
        imagePreview: '' as string,
        removeImage: false
    })
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            if (product?.type === 'variable') {
                loadVariations()
            }
            setCurrentImageIndex(0)
            setIsEditing(false)

            // Initialize edit form
            if (product) {
                setEditForm({
                    name: product.name || '',
                    sku: product.sku || '',
                    stock: product.stockQuantity?.toString() || product.stock?.toString() || '0',
                    lowStockThreshold: product.lowStockThreshold?.toString() || '0',
                    notes: (product.description || product.notes || '').replace(/<[^>]*>/g, ''), // Strip HTML for internal/sparepart
                    image: null,
                    imagePreview: (product.images && product.images.length > 0)
                        ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.src)
                        : (product.image || ''),
                    removeImage: false
                })
            }
        }
    }, [isOpen, product])

    async function loadVariations() {
        if (!product) return
        setLoadingVariations(true)
        try {
            const data = await getProductVariations(product.id || product.wcId)
            setVariations(data)
        } catch (error) {
            console.error('Error loading variations:', error)
        } finally {
            setLoadingVariations(false)
        }
    }

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (product && product.images && product.images.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % product.images.length)
        }
    }

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (product && product.images && product.images.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length)
        }
    }

    const handleEditClick = () => {
        if (product.source === 'store') {
            setShowEditStore(true)
        } else {
            setIsEditing(true)
        }
    }

    const handleDeleteClick = () => {
        showConfirmation({
            title: 'Hapus Barang',
            message: `Apakah Anda yakin ingin menghapus "${product.name}"? Tindakan ini tidak dapat dibatalkan.`,
            type: 'confirm',
            action: async () => {
                try {
                    let result
                    if (product.source === 'sparepart') {
                        await deleteSparepartProject(product.id)
                        result = { success: true }
                    } else {
                        result = await deleteProduct(product.id)
                    }

                    if (result.success) {
                        showAlert('Berhasil menghapus barang', 'Berhasil')
                        if (onSuccess) onSuccess()
                        onClose()
                    } else {
                        showError(result.error || 'Gagal menghapus barang')
                    }
                } catch (error: any) {
                    showError(error.message || 'Terjadi kesalahan')
                }
            }
        })
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setEditForm(prev => ({
                    ...prev,
                    image: file,
                    imagePreview: reader.result as string,
                    removeImage: false
                }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const formData = new FormData()
            formData.append('id', product.id)
            formData.append('name', editForm.name)
            formData.append('sku', editForm.sku)
            formData.append('stock', editForm.stock)
            formData.append('lowStockThreshold', editForm.lowStockThreshold)
            formData.append('notes', editForm.notes)
            if (editForm.image) {
                formData.append('image', editForm.image)
            }
            if (editForm.removeImage) {
                formData.append('removeImage', 'true')
            }

            let result
            if (product.source === 'sparepart') {
                result = await updateSparepartProject(formData)
            } else {
                result = await updateProduct(formData)
            }

            if (result.success) {
                showAlert('Berhasil memperbarui produk', 'Berhasil')
                setIsEditing(false)
                if (onSuccess) onSuccess()
                onClose() // Refresh data by closing and reopening if needed, but here we just close
            } else {
                showError(result.error || 'Gagal memperbarui produk')
            }
        } catch (error: any) {
            showError(error.message || 'Terjadi kesalahan')
        } finally {
            setIsSaving(false)
        }
    }

    if (!product) return null

    if (showEditStore) {
        return (
            <EditProductModal
                product={product}
                onClose={() => setShowEditStore(false)}
                onSuccess={() => {
                    setShowEditStore(false)
                    if (onSuccess) onSuccess()
                    onClose()
                }}
            />
        )
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? `Edit: ${product.name}` : product.name}
            maxWidth="4xl"
            className="p-0"
            footer={
                isEditing ? (
                    <div className="flex gap-3 w-full">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="flex-1 py-3 border border-border rounded-xl text-sm font-bold hover:bg-muted transition-all flex items-center justify-center gap-2"
                        >
                            <Undo2 className="w-4 h-4" /> Batal
                        </button>
                        <button
                            type="submit"
                            form="edit-product-form"
                            disabled={isSaving}
                            className="flex-[2] py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Simpan Perubahan
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    onAddToCart && product.type !== 'variable' && (
                        <button
                            onClick={() => {
                                onAddToCart(product)
                                onClose()
                            }}
                            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Tambah ke Keranjang
                        </button>
                    )
                )
            }
            headerActions={!isEditing && (
                <div className="flex gap-2">
                    {product.source !== 'store' && (
                        <button
                            onClick={handleDeleteClick}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors"
                            title="Hapus Produk"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={handleEditClick}
                        className="p-2 hover:bg-primary/10 text-primary rounded-full transition-colors"
                        title="Edit Produk"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                </div>
            )}
        >
            {isEditing ? (
                <form id="edit-product-form" onSubmit={handleSave} className="flex flex-col h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Edit Image */}
                        <div className="bg-muted/50 aspect-square relative group flex flex-col items-center justify-center p-8">
                            {editForm.imagePreview && !editForm.removeImage ? (
                                <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border-4 border-background">
                                    <img src={editForm.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                                        >
                                            <ImageIcon className="w-4 h-4" /> Ganti Gambar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                                        >
                                            <Camera className="w-4 h-4" /> Ambil Foto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditForm(prev => ({ ...prev, removeImage: true, image: null, imagePreview: '' }))}
                                            className="px-4 py-2 bg-destructive text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                                        >
                                            <Trash2 className="w-4 h-4" /> Hapus
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-32 h-32 rounded-3xl bg-background border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                                        <ImageIcon className="w-12 h-12 opacity-20" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
                                        >
                                            Upload Gambar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-bold"
                                        >
                                            Kamera
                                        </button>
                                    </div>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                            <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*" capture="environment" className="hidden" />
                        </div>

                        {/* Edit Fields */}
                        <div className="p-6 md:p-8 space-y-6 bg-card flex flex-col">
                            <div className="space-y-4 flex-1">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nama Produk</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all font-bold"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</label>
                                        <input
                                            type="text"
                                            value={editForm.sku}
                                            onChange={e => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stok</label>
                                        <input
                                            type="number"
                                            value={editForm.stock}
                                            onChange={e => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {product.source !== 'sparepart' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batas Stok Menipis (Threshold)</label>
                                        <input
                                            type="number"
                                            value={editForm.lowStockThreshold}
                                            onChange={e => setEditForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all"
                                            required
                                        />
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keterangan / Notes</label>
                                    <textarea
                                        value={editForm.notes}
                                        onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                                        rows={5}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                </form>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Left side: Image Gallery */}
                    <div className="bg-muted/50 aspect-square relative group">
                        {product.images && product.images.length > 0 ? (
                            <>
                                <Image
                                    src={
                                        currentImageIndex < product.images.length
                                            ? (typeof product.images[currentImageIndex] === 'string'
                                                ? product.images[currentImageIndex] as string
                                                : (product.images[currentImageIndex] as any)?.src || '/placeholder.png')
                                            : '/placeholder.png'
                                    }
                                    alt={product.name}
                                    fill
                                    className="object-contain p-4"
                                />

                                {product.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-primary hover:text-white transition-all shadow-md opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronLeft className="w-6 h-6" />
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full hover:bg-primary hover:text-white transition-all shadow-md opacity-0 group-hover:opacity-100"
                                        >
                                            <ChevronRight className="w-6 h-6" />
                                        </button>

                                        {/* Dots */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 bg-background/20 backdrop-blur rounded-full">
                                            {product.images.map((_: any, i: number) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "w-2 h-2 rounded-full transition-all",
                                                        i === currentImageIndex ? "bg-primary w-4" : "bg-primary/30"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full min-h-[400px]">
                                <Package className="w-20 h-20 mb-4 opacity-20" />
                                <p>No images available</p>
                            </div>
                        )}
                    </div>

                    {/* Right side: Details */}
                    <div className="p-6 md:p-8 space-y-6 flex flex-col h-full bg-card">
                        <div>
                            <div className="flex flex-col gap-1 mb-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SKU: {product.sku || '-'}</span>
                                    <span className={cn(
                                        "text-xs px-2 py-1 rounded font-bold",
                                        (product.stockQuantity || product.stock || 0) <= 0
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-emerald-500/10 text-emerald-600"
                                    )}>
                                        Stok: {product.stockQuantity ?? product.stock ?? 0}
                                    </span>
                                </div>
                                {(product.barcode || product.backupGudang) && (
                                    <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full w-fit">
                                        Gudang: {product.barcode || product.backupGudang}
                                    </span>
                                )}
                            </div>
                            <div className="text-3xl font-black text-primary">
                                {formatCurrency(product.price)}
                            </div>
                            {product.regularPrice > product.price && (
                                <div className="text-sm text-muted-foreground line-through mt-1">
                                    {formatCurrency(product.regularPrice)}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                            {product.type === 'variable' ? (
                                <>
                                    <h4 className="font-bold border-b border-border pb-2 shrink-0">Pilih Variasi</h4>
                                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                                        {loadingVariations ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2 outline-none" />
                                                <p className="text-xs">Mengambil variasi...</p>
                                            </div>
                                        ) : variations.length > 0 ? (
                                            variations.map((v) => (
                                                <button
                                                    key={v.id}
                                                    onClick={() => {
                                                        if (onAddToCart) {
                                                            onAddToCart({ ...v, name: product.name })
                                                            onClose()
                                                        }
                                                    }}
                                                    disabled={!onAddToCart}
                                                    className={cn(
                                                        "w-full p-3 border border-border rounded-xl transition-all text-left flex items-center justify-between group/variant",
                                                        onAddToCart ? "bg-muted/50 hover:border-primary hover:bg-primary/5" : "bg-muted/10 cursor-default"
                                                    )}
                                                >
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex flex-wrap gap-1">
                                                            {v.attributes.map((attr: any) => (
                                                                <span key={attr.name} className="px-1.5 py-0.5 rounded bg-background text-[10px] font-bold border border-border">
                                                                    {attr.name}: {attr.option}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-tight">SKU: {v.sku || '-'} • Stok: {v.stockQuantity}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-primary group-hover/variant:scale-105 transition-transform">{formatCurrency(v.price)}</div>
                                                        {v.regularPrice > v.price && (
                                                            <div className="text-[10px] text-muted-foreground line-through">{formatCurrency(v.regularPrice)}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <p className="text-center py-8 text-muted-foreground text-sm italic">Produk ini tidak memiliki variasi aktif.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h4 className="font-bold border-b border-border pb-2">Deskripsi Produk</h4>
                                    <div
                                        className="text-sm text-muted-foreground prose prose-sm max-w-none prose-invert overflow-y-auto max-h-[300px] scrollbar-thin"
                                        dangerouslySetInnerHTML={{ __html: product.description || product.notes || 'Tidak ada deskripsi' }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}
