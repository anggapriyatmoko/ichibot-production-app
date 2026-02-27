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
import Link from 'next/link'
import * as XLSX from 'xlsx'
import ImportAssetModal from './import-asset-modal'
import Modal from '@/components/ui/modal'
import ImagePreviewModal from '@/components/ui/image-preview-modal'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableWrapper,
    TableHeaderContent,
    TablePagination,
    TableScrollArea
} from '@/components/ui/table'

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
    totalCount?: number
    itemsPerPage?: number
}

export default function AssetManager({
    userRole,
    initialAssets,
    allAssets,
    totalPages,
    currentPage,
    totalCount = 0,
    itemsPerPage = 10
}: AssetManagerProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const [saving, setSaving] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [editingAsset, setEditingAsset] = useState<MachineAsset | null>(null)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search')?.toString() || '')
    const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null)

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

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isAdding || editingAsset) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isAdding, editingAsset])

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
            const assets = await getAllAssetsForExport(window.location.origin)
            const headers = ['Nama Aset', 'Kode', 'Spesifikasi', 'Lokasi', 'Harga Beli', 'Keterangan', 'Tahun Pembelian', 'Umur Ekonomis (Tahun)', 'Nilai Residu', 'Image URL']
            const rows = assets.map((a: any) => [
                a.name,
                a.code || '',
                a.specification || '',
                a.location,
                a.price || '',
                a.notes || '',
                a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('id-ID') : '',
                a.usefulLife || '',
                a.residualValue || '',
                a.image || ''
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

    const handleItemsPerPageChange = (newLimit: number) => {
        const params = new URLSearchParams(searchParams)
        params.set('page', '1')
        params.set('limit', newLimit.toString())
        router.replace(`${pathname}?${params.toString()}`)
    }

    const actions = (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64 order-2 sm:order-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Cari aset..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 h-9 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                {userRole === 'ADMIN' && (
                    <>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium flex-1 sm:flex-none"
                            title="Export to Excel"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <ImportAssetModal />
                    </>
                )}
                <button
                    onClick={() => { setIsAdding(true); setEditingAsset(null); resetForm(); }}
                    className="h-9 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-medium flex-1 sm:flex-none"
                    title="Tambah Aset"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Tambah</span>
                </button>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <TableWrapper>
                <TableHeaderContent
                    title="Daftar Aset"
                    description="Kelola data aset mesin dan alat produksi."
                    icon={<Wrench className="w-5 h-5" />}
                    actions={actions}
                />

                {/* Add/Edit Form - Full Page on Mobile, Modal on Desktop */}
                {(isAdding || editingAsset) && (
                    <>
                        {/* Mobile Full Page View */}
                        <div className="md:hidden fixed inset-0 z-[100] bg-background flex flex-col">
                            <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-lg font-bold text-foreground">
                                    {isAdding ? 'Tambah Aset Baru' : 'Edit Aset'}
                                </h3>
                            </div>
                            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                                <div className="space-y-4">
                                    {/* Image Upload */}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Gambar</label>
                                        {imagePreview ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setImagePreview(null)
                                                        setImageFile(null)
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ) : editingAsset?.image && !removeImage ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={editingAsset.image} alt="Current" className="w-full h-48 object-contain rounded" />
                                                <div className="flex gap-2 mt-3">
                                                    <label className="flex-1 cursor-pointer text-center py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium">
                                                        Ganti
                                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRemoveImage(true)}
                                                        className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <label className="flex-1 cursor-pointer">
                                                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                                                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold">
                                                        <Camera className="w-4 h-4" />
                                                        Ambil Foto
                                                    </div>
                                                </label>
                                                <label className="flex-1 cursor-pointer">
                                                    <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleImageChange} className="hidden" />
                                                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg text-sm font-bold">
                                                        <ImageIcon className="w-4 h-4" />
                                                        Pilih File
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Form Fields */}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nama Mesin/Alat *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                            placeholder="Nama mesin/alat"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Kode</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                            placeholder="Kode aset"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Lokasi *</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                            placeholder="Lokasi aset"
                                        />
                                    </div>
                                    {isAdmin && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">Harga Beli</label>
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                                    placeholder="Harga pembelian"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Tgl Beli</label>
                                                    <input
                                                        type="date"
                                                        value={formData.purchaseDate}
                                                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Umur (Thn)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.usefulLife}
                                                        onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                                        placeholder="5"
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1">Nilai Residu</label>
                                                <input
                                                    type="number"
                                                    value={formData.residualValue}
                                                    onChange={(e) => setFormData({ ...formData, residualValue: e.target.value })}
                                                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none"
                                                    placeholder="Nilai sisa"
                                                    min="0"
                                                />
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Spesifikasi</label>
                                        <textarea
                                            value={formData.specification}
                                            onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none resize-none"
                                            rows={2}
                                            placeholder="Spesifikasi mesin/alat"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Keterangan</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:border-primary outline-none resize-none"
                                            rows={2}
                                            placeholder="Keterangan tambahan"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-border bg-card shrink-0">
                                <button
                                    onClick={isAdding ? handleAdd : handleUpdate}
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-bold disabled:opacity-50"
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

                        {/* Desktop Modal View */}
                        <Modal
                            isOpen={(isAdding || editingAsset !== null) ? true : false}
                            onClose={cancelEdit}
                            title={
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary/10 rounded-lg">
                                        <Wrench className="w-4 h-4 text-primary" />
                                    </div>
                                    <span>{isAdding ? 'Tambah Aset Baru' : 'Edit Aset'}</span>
                                </div>
                            }
                            maxWidth="2xl"
                            wrapperClassName="hidden md:flex"
                            footer={
                                <div className="flex justify-end gap-3 w-full">
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
                            }
                        >
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
                        </Modal>
                    </>
                )}

                {/* Assets Display */}
                {/* Assets Display */}
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border">
                    {initialAssets.map((asset) => (
                        <div key={asset.id} className="p-4 transition-colors">
                            <div className="flex gap-3 mb-3">
                                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden relative border border-border flex-shrink-0">
                                    {asset.image ? (
                                        <button type="button" onClick={() => setPreviewImage({ url: asset.image!, name: asset.name })} className="block w-full h-full cursor-pointer">
                                            <Image src={asset.image} alt={asset.name} fill className="object-cover" />
                                        </button>
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
                <div className="hidden md:block">
                    <TableScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Gambar</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Kode</TableHead>
                                    <TableHead>Spesifikasi</TableHead>
                                    <TableHead>Lokasi</TableHead>
                                    {isAdmin && <TableHead>Harga</TableHead>}
                                    <TableHead>Keterangan</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialAssets.map((asset) => (
                                    <TableRow key={asset.id} className="group">
                                        <TableCell>
                                            <div className="relative group/image w-10 h-10">
                                                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border cursor-pointer" onClick={() => asset.image && setPreviewImage({ url: asset.image, name: asset.name })}>
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
                                        </TableCell>
                                        <TableCell className="font-medium">{asset.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{asset.code || '-'}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={asset.specification || undefined}>
                                            {asset.specification || '-'}
                                        </TableCell>
                                        <TableCell>{asset.location}</TableCell>
                                        {isAdmin && (
                                            <TableCell>
                                                <div>{formatPrice(asset.price)}</div>
                                                {asset.price && asset.purchaseDate && asset.usefulLife && (
                                                    <div className="text-xs text-orange-500 mt-1">
                                                        {formatPrice(calculateCurrentValue(asset))}
                                                        <span className="text-muted-foreground ml-1">
                                                            ({new Date().getFullYear() - new Date(asset.purchaseDate).getFullYear()}/{asset.usefulLife} thn)
                                                        </span>
                                                    </div>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="max-w-[200px] truncate" title={asset.notes || undefined}>
                                            {asset.notes || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
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
                                                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {initialAssets.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 8 : 7} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center">
                                                <Wrench className="h-8 w-8 mb-2 opacity-50" />
                                                <p>{searchTerm ? 'Tidak ada aset yang cocok dengan pencarian.' : 'Belum ada aset terdaftar.'}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollArea>
                </div>

                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    totalCount={totalCount}
                    onItemsPerPageChange={handleItemsPerPageChange}
                />
            </TableWrapper>

            {/* Analytics / Summary Section - Admin Only */}
            {
                isAdmin && allAssets.length > 0 && (
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
                )
            }
            <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
        </div >
    )
}
