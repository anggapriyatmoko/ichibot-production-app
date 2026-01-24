'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Wrench, Search, ImageIcon, ChevronLeft, ChevronRight, Download, Camera, Save } from 'lucide-react'
import { processImageFile } from '@/utils/image-compression'
import { createAsset, updateAsset, deleteAsset, getAllAssetsForExport } from '@/app/actions/asset'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import * as XLSX from 'xlsx'
import ImportAssetModal from './import-asset-modal'

interface MachineAsset {
    id: string
    name: string
    code: string | null
    specification: string | null
    location: string
    price: number | null
    notes: string | null
    image: string | null
    purchaseDate: Date | string | null
    usefulLife: number | null
    residualValue: number | null
}

interface AssetManagerProps {
    userRole?: string
    initialAssets: MachineAsset[]
    allAssets: MachineAsset[]
    totalPages: number
    currentPage: number
}

export default function AssetManager({
    userRole,
    initialAssets,
    allAssets,
    totalPages,
    currentPage
}: AssetManagerProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const [saving, setSaving] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [editingAsset, setEditingAsset] = useState<MachineAsset | null>(null)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search')?.toString() || '')

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        specification: '',
        location: '',
        price: '',
        notes: '',
        purchaseDate: '',
        usefulLife: '',
        residualValue: ''
    })

    // Image state
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    const { showConfirmation } = useConfirmation()
    const { showAlert } = useAlert()
    const isAdmin = ['ADMIN', 'HRD'].includes(userRole || '')

    // Sync URL with Search Term (Debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams)
            const currentSearch = params.get('search') || ''

            // Only update if search term has changed from what's in URL
            if (searchTerm !== currentSearch) {
                if (searchTerm) {
                    params.set('search', searchTerm)
                    params.set('page', '1') // Reset to page 1 on search
                } else {
                    params.delete('search')
                }
                router.replace(`${pathname}?${params.toString()}`)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm, router, pathname, searchParams])

    const resetForm = () => {
        setFormData({
            name: '',
            code: '',
            specification: '',
            location: '',
            price: '',
            notes: '',
            purchaseDate: '',
            usefulLife: '',
            residualValue: ''
        })
        setImagePreview(null)
        setImageFile(null)
        setRemoveImage(false)
    }

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const processedFile = await processImageFile(file, (msg) => showAlert(msg, 'error'))
            if (!processedFile) {
                e.target.value = ''
                return
            }

            setImageFile(processedFile)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(processedFile)
            setRemoveImage(false)
        }
    }

    const handleAdd = async () => {
        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('name', formData.name)
            fd.append('code', formData.code)
            fd.append('specification', formData.specification)
            fd.append('location', formData.location)
            fd.append('price', formData.price)
            fd.append('notes', formData.notes)
            fd.append('purchaseDate', formData.purchaseDate)
            fd.append('usefulLife', formData.usefulLife)
            fd.append('residualValue', formData.residualValue)
            if (imageFile) {
                fd.append('image', imageFile)
            }

            const result = await createAsset(fd)
            if (result.error) {
                showAlert(result.error, 'error')
            } else {
                showAlert('Aset berhasil ditambahkan', 'success')
                setIsAdding(false)
                resetForm()
            }
        } catch (error) {
            showAlert('Gagal menambahkan aset', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingAsset) return
        setSaving(true)
        try {
            const fd = new FormData()
            fd.append('id', editingAsset.id)
            fd.append('name', formData.name)
            fd.append('code', formData.code)
            fd.append('specification', formData.specification)
            fd.append('location', formData.location)
            fd.append('price', formData.price)
            fd.append('notes', formData.notes)
            fd.append('purchaseDate', formData.purchaseDate)
            fd.append('usefulLife', formData.usefulLife)
            fd.append('residualValue', formData.residualValue)
            if (imageFile) {
                fd.append('image', imageFile)
            }
            if (removeImage) {
                fd.append('removeImage', 'true')
            }

            const result = await updateAsset(fd)
            if (result.error) {
                showAlert(result.error, 'error')
            } else {
                showAlert('Aset berhasil diperbarui', 'success')
                setEditingAsset(null)
                resetForm()
            }
        } catch (error) {
            showAlert('Gagal memperbarui aset', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        showConfirmation({
            title: 'Hapus Aset',
            message: `Apakah Anda yakin ingin menghapus "${name}"?`,
            type: 'confirm',
            action: async () => {
                try {
                    await deleteAsset(id)
                    showAlert('Aset berhasil dihapus', 'success')
                } catch (error) {
                    showAlert('Gagal menghapus aset', 'error')
                }
            }
        })
    }

    const startEdit = (asset: MachineAsset) => {
        setEditingAsset(asset)
        setFormData({
            name: asset.name,
            code: asset.code || '',
            specification: asset.specification || '',
            location: asset.location,
            price: asset.price ? String(asset.price) : '',
            notes: asset.notes || '',
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : '',
            usefulLife: asset.usefulLife ? String(asset.usefulLife) : '',
            residualValue: asset.residualValue ? String(asset.residualValue) : ''
        })
        setImagePreview(null)
        setImageFile(null)
        setRemoveImage(false)
        setIsAdding(false)
    }

    const cancelEdit = () => {
        setEditingAsset(null)
        setIsAdding(false)
        resetForm()
    }

    const formatPrice = (price: number | null) => {
        if (!price && price !== 0) return '-'
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price)
    }

    // Calculate current value using residual value method
    const calculateCurrentValue = (asset: MachineAsset) => {
        if (!asset.price || !asset.purchaseDate || !asset.usefulLife) return null

        const purchaseYear = new Date(asset.purchaseDate).getFullYear()
        const currentYear = new Date().getFullYear()
        const age = currentYear - purchaseYear

        if (age <= 0) return asset.price

        const residualValue = asset.residualValue || 0
        const depreciationPerYear = (asset.price - residualValue) / asset.usefulLife
        const currentValue = asset.price - (depreciationPerYear * age)

        return Math.max(residualValue, currentValue)
    }

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', String(newPage))
        router.push(`${pathname}?${params.toString()}`)
    }

    const [exporting, setExporting] = useState(false)

    const handleExport = async () => {
        setExporting(true)
        try {
            const assets = await getAllAssetsForExport()
            const headers = ['Nama Aset', 'Kode', 'Spesifikasi', 'Lokasi', 'Harga Beli', 'Keterangan', 'Tahun Pembelian', 'Umur Ekonomis (Tahun)', 'Nilai Residu']
            const rows = assets.map((a: any) => [
                a.name,
                a.code || '',
                a.specification || '',
                a.location,
                a.price || '',
                a.notes || '',
                a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('id-ID') : '',
                a.usefulLife || '',
                a.residualValue || ''
            ])

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
            XLSX.utils.book_append_sheet(wb, ws, 'Assets')
            XLSX.writeFile(wb, `Assets_${new Date().toISOString().split('T')[0]}.xlsx`)
            showAlert('Export berhasil', 'success')
        } catch (error) {
            console.error(error)
            showAlert('Gagal melakukan export', 'error')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Controls */}
            <div className="flex justify-between items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Cari aset..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {isAdmin && (
                        <>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                title="Export to Excel"
                            >
                                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                            <ImportAssetModal />
                        </>
                    )}
                    <button
                        onClick={() => { setIsAdding(true); setEditingAsset(null); resetForm(); }}
                        className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm"
                        title="Tambah Aset"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {(isAdding || editingAsset) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelEdit} />
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl relative animate-in zoom-in-95 duration-200 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Wrench className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">
                                {isAdding ? 'Tambah Aset Baru' : 'Edit Aset'}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Image Upload */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gambar</label>
                                {imagePreview ? (
                                    <div className="relative border border-border rounded-xl p-4 bg-background/50 group">
                                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImagePreview(null)
                                                setImageFile(null)
                                            }}
                                            className="absolute top-4 right-4 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                ) : editingAsset?.image && !removeImage ? (
                                    <div className="relative border border-border rounded-xl p-4 bg-background/50 group">
                                        <img src={editingAsset.image} alt="Current" className="w-full h-48 object-contain rounded-lg" />
                                        <div className="flex justify-between mt-4 gap-3">
                                            <label className="cursor-pointer flex-1 text-center py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium transition-colors">
                                                Ganti Gambar
                                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleImageChange} className="hidden" />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setRemoveImage(true)}
                                                className="px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-border rounded-xl p-8 bg-background/50 hover:bg-background/80 transition-colors">
                                        <div className="text-center mb-6">
                                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">Upload gambar atau ambil foto</p>
                                            <p className="text-xs text-muted-foreground mt-1">Format: JPG, PNG, WEBP (maks 1MB)</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <label className="flex-1 cursor-pointer">
                                                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                                                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-lg shadow-primary/20">
                                                    <Camera className="w-4 h-4" />
                                                    Ambil Foto
                                                </div>
                                            </label>
                                            <label className="flex-1 cursor-pointer">
                                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleImageChange} className="hidden" />
                                                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-all text-sm font-bold">
                                                    <ImageIcon className="w-4 h-4" />
                                                    Pilih File
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        Nama Mesin/Alat <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Nama mesin/alat"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Kode</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Kode aset"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                        Lokasi <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Lokasi aset"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {isAdmin && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Harga Beli</label>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Harga pembelian"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tgl Beli</label>
                                                <input
                                                    type="date"
                                                    value={formData.purchaseDate}
                                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Umur (Thn)</label>
                                                <input
                                                    type="number"
                                                    value={formData.usefulLife}
                                                    onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })}
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                    placeholder="5"
                                                    min="1"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nilai Residu</label>
                                            <input
                                                type="number"
                                                value={formData.residualValue}
                                                onChange={(e) => setFormData({ ...formData, residualValue: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                                placeholder="Nilai sisa"
                                                min="0"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Spesifikasi</label>
                                <textarea
                                    value={formData.specification}
                                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all"
                                    rows={2}
                                    placeholder="Spesifikasi mesin/alat"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Keterangan</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none transition-all"
                                    rows={2}
                                    placeholder="Keterangan tambahan"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-border mt-8">
                            <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={isAdding ? handleAdd : handleUpdate}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        {isAdding ? 'Simpan Aset' : 'Update Aset'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assets Display */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border">
                    {initialAssets.map((asset) => (
                        <div key={asset.id} className="p-4 transition-colors">
                            <div className="flex gap-3 mb-3">
                                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden relative border border-border flex-shrink-0">
                                    {asset.image ? (
                                        <Image src={asset.image} alt={asset.name} fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            <Wrench className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-foreground text-sm mb-1 truncate">{asset.name}</h3>
                                    {asset.code && <p className="text-xs text-muted-foreground font-mono">{asset.code}</p>}
                                </div>
                            </div>

                            <div className="space-y-2 mb-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Lokasi:</span>
                                    <span className="font-medium text-foreground">{asset.location}</span>
                                </div>
                                {asset.specification && (
                                    <div>
                                        <span className="text-muted-foreground text-xs">Spesifikasi:</span>
                                        <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{asset.specification}</p>
                                    </div>
                                )}
                                {asset.notes && (
                                    <div>
                                        <span className="text-muted-foreground text-xs">Keterangan:</span>
                                        <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{asset.notes}</p>
                                    </div>
                                )}
                                {isAdmin && asset.price && (
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Harga Beli:</span>
                                            <span className="font-medium text-foreground">{formatPrice(asset.price)}</span>
                                        </div>
                                        {asset.purchaseDate && asset.usefulLife && (
                                            <div className="flex justify-between mt-1">
                                                <span className="text-muted-foreground text-xs">Nilai Saat Ini:</span>
                                                <span className="text-xs text-orange-500 font-medium">
                                                    {formatPrice(calculateCurrentValue(asset))}
                                                    <span className="text-muted-foreground ml-1">({new Date().getFullYear() - new Date(asset.purchaseDate).getFullYear()} thn)</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 justify-end mt-2">
                                <button
                                    onClick={() => startEdit(asset)}
                                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                    title="Edit"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(asset.id, asset.name)}
                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border"
                                        title="Hapus"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {initialAssets.length === 0 && (
                        <div className="px-6 py-12 text-center text-muted-foreground">
                            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{searchTerm ? 'Tidak ada aset yang cocok dengan pencarian.' : 'Belum ada aset terdaftar.'}</p>
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted text-foreground uppercase font-normal">
                            <tr>
                                <th className="px-6 py-4">Gambar</th>
                                <th className="px-6 py-4">Nama</th>
                                <th className="px-6 py-4">Kode</th>
                                <th className="px-6 py-4">Spesifikasi</th>
                                <th className="px-6 py-4">Lokasi</th>
                                {isAdmin && <th className="px-6 py-4">Harga</th>}
                                <th className="px-6 py-4">Keterangan</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {initialAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-accent/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="relative group/image">
                                            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border cursor-pointer">
                                                {asset.image ? (
                                                    <Image src={asset.image} alt={asset.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                        <Wrench className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Hover Preview */}
                                            {asset.image && (
                                                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover/image:opacity-100 group-hover/image:visible transition-all duration-200 pointer-events-none">
                                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-border p-2 w-52 h-52">
                                                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                                                            <Image src={asset.image} alt={asset.name} fill className="object-contain" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-foreground">{asset.name}</td>
                                    <td className="px-6 py-4 font-mono">{asset.code || '-'}</td>
                                    <td className="px-6 py-4 max-w-[200px] truncate" title={asset.specification || undefined}>
                                        {asset.specification || '-'}
                                    </td>
                                    <td className="px-6 py-4">{asset.location}</td>
                                    {isAdmin && (
                                        <td className="px-6 py-4">
                                            <div>{formatPrice(asset.price)}</div>
                                            {asset.price && asset.purchaseDate && asset.usefulLife && (
                                                <div className="text-xs text-orange-500 mt-1">
                                                    {formatPrice(calculateCurrentValue(asset))}
                                                    <span className="text-muted-foreground ml-1">({new Date().getFullYear() - new Date(asset.purchaseDate).getFullYear()}/{asset.usefulLife} thn)</span>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 max-w-[200px] truncate" title={asset.notes || undefined}>
                                        {asset.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(asset)}
                                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(asset.id, asset.name)}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {initialAssets.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-muted-foreground">
                                        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>{searchTerm ? 'Tidak ada aset yang cocok dengan pencarian.' : 'Belum ada aset terdaftar.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                    <p className="text-sm text-muted-foreground">
                        Page <span className="text-foreground font-medium">{currentPage}</span> of <span className="text-foreground font-medium">{totalPages || 1}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Analytics / Summary Section - Admin Only */}
            {isAdmin && allAssets.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-foreground mb-4">Ringkasan Aset</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Total Assets */}
                        <div className="bg-background rounded-lg p-4 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Total Aset</p>
                            <p className="text-2xl font-bold text-foreground">{allAssets.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">unit</p>
                        </div>

                        {/* Total Purchase Price */}
                        <div className="bg-background rounded-lg p-4 border border-border overflow-hidden">
                            <p className="text-xs text-muted-foreground mb-1">Total Harga Beli</p>
                            <p className="text-sm md:text-xl font-bold text-foreground break-words">
                                {formatPrice(allAssets.reduce((sum, a) => sum + (a.price || 0), 0))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {allAssets.filter(a => a.price).length} aset dengan harga
                            </p>
                        </div>

                        {/* Total Current Value */}
                        <div className="bg-background rounded-lg p-4 border border-border overflow-hidden">
                            <p className="text-xs text-muted-foreground mb-1">Total Nilai Saat Ini</p>
                            <p className="text-sm md:text-xl font-bold text-emerald-500 break-words">
                                {formatPrice(allAssets.reduce((sum, a) => {
                                    const currentValue = calculateCurrentValue(a)
                                    return sum + (currentValue !== null ? currentValue : (a.price || 0))
                                }, 0))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {allAssets.filter(a => a.price && a.purchaseDate && a.usefulLife).length} aset dengan penyusutan
                            </p>
                        </div>

                        {/* Total Depreciation */}
                        <div className="bg-background rounded-lg p-4 border border-border overflow-hidden">
                            <p className="text-xs text-muted-foreground mb-1">Total Penyusutan</p>
                            <p className="text-sm md:text-xl font-bold text-orange-500 break-words">
                                {formatPrice(allAssets.reduce((sum, a) => {
                                    if (!a.price) return sum
                                    const currentValue = calculateCurrentValue(a)
                                    if (currentValue === null) return sum
                                    return sum + (a.price - currentValue)
                                }, 0))}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">akumulasi penyusutan</p>
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Rata-rata Harga:</span>
                                <span className="ml-2 font-medium text-foreground">
                                    {formatPrice(allAssets.filter(a => a.price).length > 0
                                        ? allAssets.reduce((sum, a) => sum + (a.price || 0), 0) / allAssets.filter(a => a.price).length
                                        : 0)}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Dengan Gambar:</span>
                                <span className="ml-2 font-medium text-foreground">
                                    {allAssets.filter(a => a.image).length} aset
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Rasio Penyusutan:</span>
                                <span className="ml-2 font-medium text-orange-500">
                                    {(() => {
                                        const totalPurchase = allAssets.reduce((sum, a) => sum + (a.price || 0), 0)
                                        const totalDepreciation = allAssets.reduce((sum, a) => {
                                            if (!a.price) return sum
                                            const currentValue = calculateCurrentValue(a)
                                            if (currentValue === null) return sum
                                            return sum + (a.price - currentValue)
                                        }, 0)
                                        return totalPurchase > 0
                                            ? ((totalDepreciation / totalPurchase) * 100).toFixed(1) + '%'
                                            : '0%'
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
