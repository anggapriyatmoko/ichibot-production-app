'use client'

import { useState, useEffect } from 'react'
import { createSparepartProject, deleteSparepartProject, addSparepartProjectStock, updateSparepartProject, reduceSparepartProjectStock, moveToProduction, getAllSparepartProjectsForExport } from '@/app/actions/sparepart-project'
import { getRacksWithUnusedDrawers } from '@/app/actions/rack'
import { Plus, Trash2, Search, PackagePlus, ImageIcon, Edit, PackageMinus, ChevronLeft, ChevronRight, ArrowRightCircle, Camera, Pencil, X, FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import * as XLSX from 'xlsx'

import ImportSparepartModal from './import-sparepart-modal'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableWrapper,
    TablePagination,
    TableHeaderContent
} from "@/components/ui/table"
import Modal from '@/components/ui/modal'

// Helper to simplify error messages for users
function simplifyErrorMessage(error: any): string {
    const message = error?.message || String(error)
    if (message.includes('Body exceeded') || message.includes('MB limit')) {
        return 'Maximum file size is 1MB'
    }
    return message
}

type SparepartProject = {
    id: string
    name: string
    sku: string | null
    stock: number
    notes: string | null
    image: string | null
}

export default function SparepartProjectList({
    initialItems,
    userRole,
    totalPages = 1,
    currentPage = 1,
    itemsPerPage = 20,
    totalCount = 0
}: {
    initialItems: SparepartProject[]
    userRole?: string
    totalPages?: number
    currentPage?: number
    itemsPerPage?: number
    totalCount?: number
}) {
    const router = useRouter()
    const { showConfirmation } = useConfirmation()
    const { showError } = useAlert()

    const [addForm, setAddForm] = useState({
        name: '',
        sku: '',
        stock: '',
        notes: ''
    })

    const [isAdding, setIsAdding] = useState(false)
    const [editingItem, setEditingItem] = useState<SparepartProject | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Stock Modal State
    const [stockModalItem, setStockModalItem] = useState<SparepartProject | null>(null)
    // Take Stock Modal State
    const [takeModalItem, setTakeModalItem] = useState<SparepartProject | null>(null)
    // Move to Production Modal State
    const [moveModalItem, setMoveModalItem] = useState<SparepartProject | null>(null)
    // Mobile Action Modal State
    const [mobileActionItem, setMobileActionItem] = useState<SparepartProject | null>(null)
    const [moveSku, setMoveSku] = useState('')

    // Image states
    const [addImagePreview, setAddImagePreview] = useState<string | null>(null)
    const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
    const [addImageFile, setAddImageFile] = useState<File | null>(null)
    const [editImageFile, setEditImageFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    // SKU Suggestion State
    const [allUnusedDrawers, setAllUnusedDrawers] = useState<string[]>([])
    const [skuSuggestions, setSkuSuggestions] = useState<string[]>([])
    const [showSkuSuggestions, setShowSkuSuggestions] = useState(false)
    const [editSkuValue, setEditSkuValue] = useState('')
    const [showEditSkuSuggestions, setShowEditSkuSuggestions] = useState(false)
    const [showMoveSkuSuggestions, setShowMoveSkuSuggestions] = useState(false)

    // Fetch unused drawers for SKU suggestions
    useEffect(() => {
        async function fetchUnusedDrawers() {
            try {
                const racks = await getRacksWithUnusedDrawers()
                const allDrawers = racks.flatMap(r => r.unusedDrawersList || [])
                setAllUnusedDrawers(allDrawers)
            } catch (error) {
                console.log('Could not fetch unused drawers', error)
            }
        }
        fetchUnusedDrawers()
    }, [])

    // Lock body scroll when Add or Edit form is open (mobile full-page view)
    useEffect(() => {
        if (isAdding || editingItem) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isAdding, editingItem])

    // Helper function to compress image using Canvas API
    const compressImage = async (file: File, maxSizeKB: number = 700): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (event) => {
                const img = new window.Image()
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    let width = img.width
                    let height = img.height

                    // Max dimension 1200px
                    const MAX_DIMENSION = 1200
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height = (height / width) * MAX_DIMENSION
                            width = MAX_DIMENSION
                        } else {
                            width = (width / height) * MAX_DIMENSION
                            height = MAX_DIMENSION
                        }
                    }

                    canvas.width = width
                    canvas.height = height

                    const ctx = canvas.getContext('2d')
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'))
                        return
                    }

                    ctx.drawImage(img, 0, 0, width, height)

                    // Start with quality 0.8 and reduce if needed
                    let quality = 0.8
                    const targetSizeBytes = maxSizeKB * 1024

                    const tryCompress = () => {
                        canvas.toBlob(
                            (blob) => {
                                if (!blob) {
                                    reject(new Error('Failed to compress image'))
                                    return
                                }

                                if (blob.size > targetSizeBytes && quality > 0.1) {
                                    // Reduce quality and try again
                                    quality -= 0.1
                                    tryCompress()
                                } else {
                                    // Create new file from blob
                                    const compressedFile = new File([blob], file.name, {
                                        type: 'image/jpeg',
                                        lastModified: Date.now()
                                    })
                                    console.log(`Compressed from ${(file.size / 1024).toFixed(1)}KB to ${(compressedFile.size / 1024).toFixed(1)}KB (quality: ${quality.toFixed(1)})`)
                                    resolve(compressedFile)
                                }
                            },
                            'image/jpeg',
                            quality
                        )
                    }

                    tryCompress()
                }
                img.onerror = () => reject(new Error('Failed to load image'))
                img.src = event.target?.result as string
            }
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
        })
    }

    const handleAddImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const MAX_SIZE = 700 * 1024 // 700KB target for compression

            let processedFile = file

            // If file is larger than 700KB, compress it
            if (file.size > MAX_SIZE) {
                try {
                    processedFile = await compressImage(file, 700)
                } catch (error) {
                    console.error('Compression failed:', error)
                    showError('Gagal mengkompresi gambar')
                    e.target.value = ''
                    return
                }
            }

            // Final check - if still over 1MB after compression, reject
            if (processedFile.size > 1 * 1024 * 1024) {
                showError('File gambar terlalu besar, tidak dapat dikompres di bawah 1MB')
                e.target.value = ''
                return
            }

            setAddImageFile(processedFile)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAddImagePreview(reader.result as string)
            }
            reader.readAsDataURL(processedFile)
        }
    }

    const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const MAX_SIZE = 700 * 1024 // 700KB target for compression

            let processedFile = file

            // If file is larger than 700KB, compress it
            if (file.size > MAX_SIZE) {
                try {
                    processedFile = await compressImage(file, 700)
                } catch (error) {
                    console.error('Compression failed:', error)
                    showError('Gagal mengkompresi gambar')
                    e.target.value = ''
                    return
                }
            }

            // Final check - if still over 1MB after compression, reject
            if (processedFile.size > 1 * 1024 * 1024) {
                showError('File gambar terlalu besar, tidak dapat dikompres di bawah 1MB')
                e.target.value = ''
                return
            }

            setEditImageFile(processedFile)
            const reader = new FileReader()
            reader.onloadend = () => {
                setEditImagePreview(reader.result as string)
            }
            reader.readAsDataURL(processedFile)
            setRemoveImage(false)
        }
    }

    const handleDelete = async (id: string) => {
        showConfirmation({
            title: 'Delete Item',
            message: 'Are you sure you want to delete this item? This action cannot be undone.',
            type: 'confirm',
            action: async () => {
                await deleteSparepartProject(id)
                router.refresh()
            }
        })
    }

    async function handleAddItem(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)

        const formData = new FormData()
        formData.append('name', addForm.name)
        formData.append('sku', addForm.sku)
        formData.append('stock', String(addForm.stock))
        formData.append('notes', addForm.notes)

        if (addImageFile) {
            formData.set('image', addImageFile)
        }

        try {
            const result = await createSparepartProject(formData)
            if (result?.error) {
                showError(`Failed to save item: ${result.error}`)
                return
            }
            setIsAdding(false)
            setAddImagePreview(null)
            setAddImageFile(null)
            setAddForm({ name: '', sku: '', stock: '', notes: '' })
            router.refresh()
        } catch (error: any) {
            console.error(error)
            showError(simplifyErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleUpdateItem(formData: FormData) {
        if (editImageFile) {
            formData.set('image', editImageFile)
        }
        if (removeImage) {
            formData.set('removeImage', 'true')
        }
        setIsLoading(true)
        try {
            const result = await updateSparepartProject(formData)
            if (result?.error) {
                showError(`Failed to update item: ${result.error}`)
                return
            }
            setEditingItem(null)
            setEditImagePreview(null)
            setEditImageFile(null)
            setRemoveImage(false)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            showError(simplifyErrorMessage(error))
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAddStock(formData: FormData) {
        if (!stockModalItem) return
        setIsLoading(true)
        const quantity = parseFloat(formData.get('quantity') as string)
        await addSparepartProjectStock(stockModalItem.id, quantity)
        setIsLoading(false)
        setStockModalItem(null)
        router.refresh()
    }

    async function handleTakeStock(formData: FormData) {
        if (!takeModalItem) return
        setIsLoading(true)
        const quantity = parseFloat(formData.get('quantity') as string)
        const result = await reduceSparepartProjectStock(takeModalItem.id, quantity)
        setIsLoading(false)
        if (result?.error) {
            showError(result.error)
            return
        }
        setTakeModalItem(null)
        router.refresh()
    }

    async function handleMoveToProduction() {
        if (!moveModalItem) return
        setIsLoading(true)
        const result = await moveToProduction(moveModalItem.id, moveSku || undefined)
        setIsLoading(false)
        if (result?.error) {
            showError(result.error)
            return
        }
        setMoveModalItem(null)
        setMoveSku('')
        router.refresh()
    }

    async function handleExport() {
        setIsLoading(true)
        try {
            const data = await getAllSparepartProjectsForExport(window.location.origin)
            const ws = XLSX.utils.json_to_sheet(data.map(item => ({
                'Name': item.name,
                'SKU': item.sku || '-',
                'Stock': item.stock,
                'Notes': item.notes || '-',
                'Image URL': item.image || '-'
            })))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Sparepart Project')
            XLSX.writeFile(wb, `sparepart_project_${new Date().toISOString().split('T')[0]}.xlsx`)
        } catch (error) {
            showError('Export failed')
        } finally {
            setIsLoading(false)
        }
    }

    // Filter items based on search
    const filteredItems = initialItems.filter(item => {
        if (!searchTerm) return true
        const searchLower = searchTerm.toLowerCase()
        return (
            item.name.toLowerCase().includes(searchLower) ||
            (item.notes && item.notes.toLowerCase().includes(searchLower))
        )
    })

    return (
        <div className="space-y-6">
            <TableWrapper>
                <TableHeaderContent
                    title="Sparepart Project"
                    description="Manage spare parts for projects."
                    icon={<PackagePlus className="w-5 h-5 font-bold text-primary" />}
                    actions={
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                                />
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide w-full sm:w-auto">
                                <button
                                    onClick={handleExport}
                                    disabled={isLoading}
                                    className="h-9 w-9 flex items-center justify-center border border-border hover:bg-muted text-foreground rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                    title="Export Excel"
                                >
                                    <FileDown className="w-4 h-4" />
                                </button>
                                <div className="h-9 flex items-center">
                                    <ImportSparepartModal />
                                </div>
                                <button
                                    onClick={() => setIsAdding(!isAdding)}
                                    className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 shadow-sm flex items-center gap-2 whitespace-nowrap"
                                    title="Add Item"
                                >
                                    <Plus className="w-4 h-4" />
                                    Tambah
                                </button>
                            </div>
                        </div>
                    }
                />

                {/* Add Item - Full Page on Mobile, Modal on Desktop */}
                {isAdding && (
                    <>
                        {/* Mobile Full Page View */}
                        <div className="md:hidden fixed inset-0 z-[100] bg-background flex flex-col">
                            <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-lg font-bold text-foreground">Tambah Sparepart Baru</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                                <form onSubmit={handleAddItem} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Foto</label>
                                        {addImagePreview ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={addImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAddImagePreview(null)
                                                        setAddImageFile(null)
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                <div className="text-center mb-3">
                                                    <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground">Upload gambar atau ambil foto (maks 1MB)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" name="image" accept="image/*" capture="environment" onChange={handleAddImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                            <Camera className="w-4 h-4" />
                                                            Ambil Foto
                                                        </div>
                                                    </label>
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleAddImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                            <ImageIcon className="w-4 h-4" />
                                                            Pilih File
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nama</label>
                                        <input
                                            name="name"
                                            value={addForm.name}
                                            onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                            required
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            placeholder="e.g. Motor DC 12V"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">SKU (Lokasi Penyimpanan)</label>
                                        <input
                                            name="sku"
                                            value={addForm.sku}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase()
                                                setAddForm({ ...addForm, sku: val })
                                                if (val.length > 0) {
                                                    const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                    setSkuSuggestions(filtered.slice(0, 10))
                                                    setShowSkuSuggestions(true)
                                                } else {
                                                    setSkuSuggestions([])
                                                    setShowSkuSuggestions(false)
                                                }
                                            }}
                                            onFocus={() => {
                                                if (addForm.sku.length > 0) {
                                                    const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(addForm.sku.toLowerCase()))
                                                    setSkuSuggestions(filtered.slice(0, 10))
                                                    setShowSkuSuggestions(true)
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
                                            autoComplete="off"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            placeholder="e.g. RK01-04"
                                        />
                                        {showSkuSuggestions && skuSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {skuSuggestions.map(sku => (
                                                    <button
                                                        key={sku}
                                                        type="button"
                                                        onClick={() => {
                                                            setAddForm({ ...addForm, sku })
                                                            setShowSkuSuggestions(false)
                                                        }}
                                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="font-mono text-emerald-600">{sku}</span>
                                                        <span className="text-xs text-muted-foreground">Available</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Stok Awal</label>
                                        <input
                                            name="stock"
                                            type="number"
                                            value={addForm.stock}
                                            onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                                            required
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            placeholder="0"
                                            step="any"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Catatan (Opsional)</label>
                                        <textarea
                                            name="notes"
                                            value={addForm.notes}
                                            onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            rows={3}
                                            placeholder="Penggunaan khusus proyek..."
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            disabled={isLoading}
                                            type="submit"
                                            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {isLoading ? 'Menyimpan...' : 'Simpan Item'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Desktop Modal View */}
                        <div className="hidden md:block">
                            <Modal
                                isOpen={true}
                                onClose={() => setIsAdding(false)}
                                title="Add New Sparepart Project"
                                footer={
                                    <div className="flex justify-end gap-3 mt-4">
                                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                        <button disabled={isLoading} type="submit" form="sparepart-project-form" className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm">
                                            {isLoading ? 'Saving...' : 'Create Item'}
                                        </button>
                                    </div>
                                }
                            >
                                <form id="sparepart-project-form" onSubmit={handleAddItem} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Image</label>
                                            {addImagePreview ? (
                                                <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                    <img src={addImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAddImagePreview(null)
                                                            setAddImageFile(null)
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-normal"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                    <div className="text-center mb-3">
                                                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-xs text-muted-foreground">Upload gambar atau ambil foto (maks 1MB)</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept="image/*" capture="environment" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium">
                                                                <Camera className="w-4 h-4" />
                                                                Ambil Foto
                                                            </div>
                                                        </label>
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleAddImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-xs font-medium">
                                                                <ImageIcon className="w-4 h-4" />
                                                                Pilih File
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Name</label>
                                            <input
                                                name="name"
                                                value={addForm.name}
                                                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                                                required
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                placeholder="e.g. Motor DC 12V"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">SKU (Storage Location)</label>
                                            <input
                                                name="sku"
                                                value={addForm.sku}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase()
                                                    setAddForm({ ...addForm, sku: val })
                                                    if (val.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowSkuSuggestions(true)
                                                    } else {
                                                        setSkuSuggestions([])
                                                        setShowSkuSuggestions(false)
                                                    }
                                                }}
                                                onFocus={() => {
                                                    if (addForm.sku.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(addForm.sku.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowSkuSuggestions(true)
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
                                                autoComplete="off"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                placeholder="e.g. RK01-04"
                                            />
                                            {showSkuSuggestions && skuSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {skuSuggestions.map(sku => (
                                                        <button
                                                            key={sku}
                                                            type="button"
                                                            onClick={() => {
                                                                setAddForm({ ...addForm, sku })
                                                                setShowSkuSuggestions(false)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="font-mono text-emerald-600">{sku}</span>
                                                            <span className="text-xs text-muted-foreground">Available Drawer</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Initial Stock</label>
                                            <input
                                                name="stock"
                                                type="number"
                                                value={addForm.stock}
                                                onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                                                required
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                placeholder="0"
                                                step="any"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Notes (Optional)</label>
                                            <textarea
                                                name="notes"
                                                value={addForm.notes}
                                                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                rows={2}
                                                placeholder="Specific project usage or requirements..."
                                            />
                                        </div>
                                    </div>
                                </form>
                            </Modal>
                        </div>
                    </>
                )}

                {/* Edit Item - Full Page on Mobile, Modal on Desktop */}
                {editingItem && (
                    <>
                        {/* Mobile Full Page View */}
                        <div className="md:hidden fixed inset-0 z-[100] bg-background flex flex-col">
                            <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h3 className="text-lg font-bold text-foreground">Edit Item</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                                <form action={handleUpdateItem} className="space-y-4">
                                    <input type="hidden" name="id" value={editingItem.id} />
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Ganti Gambar (Opsional)</label>
                                        {editImagePreview ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={editImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditImagePreview(null)
                                                        setEditImageFile(null)
                                                    }}
                                                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-medium"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        ) : editingItem.image && !removeImage ? (
                                            <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                <img src={editingItem.image} alt="Current" className="w-full h-48 object-contain rounded" />
                                                <div className="flex justify-between mt-2 gap-2">
                                                    <label className="cursor-pointer flex-1 text-center py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-sm font-medium">
                                                        Ganti Gambar
                                                        <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRemoveImage(true)}
                                                        className="px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-sm font-medium"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                <div className="text-center mb-3">
                                                    <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-xs text-muted-foreground">Upload gambar atau ambil foto (maks 1MB)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" name="image" accept="image/*" capture="environment" onChange={handleEditImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                            <Camera className="w-4 h-4" />
                                                            Ambil Foto
                                                        </div>
                                                    </label>
                                                    <label className="flex-1 cursor-pointer">
                                                        <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                            <ImageIcon className="w-4 h-4" />
                                                            Pilih File
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Nama</label>
                                        <input
                                            name="name"
                                            defaultValue={editingItem.name}
                                            required
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">SKU (Lokasi Penyimpanan)</label>
                                        <input
                                            name="sku"
                                            value={editSkuValue}
                                            onChange={(e) => {
                                                const val = e.target.value.toUpperCase()
                                                setEditSkuValue(val)
                                                if (val.length > 0) {
                                                    const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                    setSkuSuggestions(filtered.slice(0, 10))
                                                    setShowEditSkuSuggestions(true)
                                                } else {
                                                    setSkuSuggestions([])
                                                    setShowEditSkuSuggestions(false)
                                                }
                                            }}
                                            onFocus={() => {
                                                const currentVal = editSkuValue || editingItem.sku || ''
                                                if (currentVal.length > 0) {
                                                    const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(currentVal.toLowerCase()))
                                                    setSkuSuggestions(filtered.slice(0, 10))
                                                    setShowEditSkuSuggestions(true)
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setShowEditSkuSuggestions(false), 200)}
                                            autoComplete="off"
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            placeholder="e.g. RK01-04"
                                        />
                                        {showEditSkuSuggestions && skuSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {skuSuggestions.map(sku => (
                                                    <button
                                                        key={sku}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditSkuValue(sku)
                                                            setShowEditSkuSuggestions(false)
                                                        }}
                                                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                    >
                                                        <span className="font-mono text-emerald-600">{sku}</span>
                                                        <span className="text-xs text-muted-foreground">Available</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Stok</label>
                                        <input
                                            name="stock"
                                            type="number"
                                            defaultValue={editingItem.stock}
                                            required
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            step="any"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">Catatan</label>
                                        <textarea
                                            name="notes"
                                            defaultValue={editingItem.notes || ''}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:border-primary outline-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            disabled={isLoading}
                                            type="submit"
                                            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Desktop Modal View */}
                        <div className="hidden md:block">
                            <Modal
                                isOpen={true}
                                onClose={() => setEditingItem(null)}
                                title={`Edit Item: ${editingItem.name}`}
                                footer={
                                    <div className="flex justify-end gap-3 mt-4">
                                        <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                        <button disabled={isLoading} type="submit" form="edit-sparepart-form" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors shadow-sm">
                                            {isLoading ? 'Updating...' : 'Save Changes'}
                                        </button>
                                    </div>
                                }
                            >
                                <form id="edit-sparepart-form" action={handleUpdateItem} className="space-y-4">
                                    <input type="hidden" name="id" value={editingItem.id} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Change Image (Optional)</label>
                                            {editImagePreview ? (
                                                <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                    <img src={editImagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditImagePreview(null)
                                                            setEditImageFile(null)
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 text-xs font-normal"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : editingItem.image && !removeImage ? (
                                                <div className="relative border border-border rounded-lg p-4 bg-background/50">
                                                    <img src={editingItem.image} alt="Current" className="w-full h-48 object-contain rounded" />
                                                    <div className="flex justify-between mt-2 gap-2">
                                                        <label className="cursor-pointer flex-1 text-center py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 text-xs font-normal">
                                                            Change Image
                                                            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemoveImage(true)}
                                                            className="px-3 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg text-xs font-normal"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border border-dashed border-border rounded-lg p-4 bg-background/50">
                                                    <div className="text-center mb-3">
                                                        <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                                        <p className="text-sm text-muted-foreground">Upload gambar atau ambil foto</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Format: JPG, PNG, WEBP, GIF (maks 1MB)</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept="image/*" capture="environment" onChange={handleEditImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                                <Camera className="w-4 h-4" />
                                                                Ambil Foto
                                                            </div>
                                                        </label>
                                                        <label className="flex-1 cursor-pointer">
                                                            <input type="file" name="image" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleEditImageChange} className="hidden" />
                                                            <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium">
                                                                <ImageIcon className="w-4 h-4" />
                                                                Pilih File
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Name</label>
                                            <input name="name" defaultValue={editingItem.name} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" />
                                        </div>
                                        <div className="relative">
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">SKU</label>
                                            <input
                                                name="sku"
                                                value={editSkuValue}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase()
                                                    setEditSkuValue(val)
                                                    if (val.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowEditSkuSuggestions(true)
                                                    } else {
                                                        setSkuSuggestions([])
                                                        setShowEditSkuSuggestions(false)
                                                    }
                                                }}
                                                onFocus={() => {
                                                    const currentVal = editSkuValue || editingItem.sku || ''
                                                    if (currentVal.length > 0) {
                                                        const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(currentVal.toLowerCase()))
                                                        setSkuSuggestions(filtered.slice(0, 10))
                                                        setShowEditSkuSuggestions(true)
                                                    }
                                                }}
                                                onBlur={() => setTimeout(() => setShowEditSkuSuggestions(false), 200)}
                                                autoComplete="off"
                                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                                placeholder="e.g. RK01-04"
                                            />
                                            {showEditSkuSuggestions && skuSuggestions.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                    {skuSuggestions.map(sku => (
                                                        <button
                                                            key={sku}
                                                            type="button"
                                                            onClick={() => {
                                                                setEditSkuValue(sku)
                                                                setShowEditSkuSuggestions(false)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                        >
                                                            <span className="font-mono text-emerald-600">{sku}</span>
                                                            <span className="text-xs text-muted-foreground">Available</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Stock</label>
                                            <input name="stock" type="number" defaultValue={editingItem.stock} required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" step="any" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-normal text-muted-foreground mb-1">Notes</label>
                                            <textarea name="notes" defaultValue={editingItem.notes || ''} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" rows={3} />
                                        </div>
                                    </div>
                                </form>
                            </Modal>
                        </div>
                    </>
                )}

                {/* Add Stock Modal */}
                {stockModalItem && (
                    <Modal
                        isOpen={true}
                        onClose={() => setStockModalItem(null)}
                        title={`Restock: ${stockModalItem.name}`}
                        maxWidth="sm"
                        footer={
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStockModalItem(null)} className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" form="add-stock-form" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                    {isLoading ? 'Processing...' : 'Confirm Add'}
                                </button>
                            </div>
                        }
                    >
                        <p className="text-sm text-muted-foreground mb-6">Current Stock: {stockModalItem.stock}</p>

                        <form id="add-stock-form" action={handleAddStock}>
                            <div className="mb-6">
                                <label className="block text-xs font-normal text-muted-foreground mb-1">Quantity to Add</label>
                                <input
                                    name="quantity"
                                    type="number"
                                    min="0"
                                    autoFocus
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-lg focus:border-emerald-500 outline-none"
                                    placeholder="0"
                                    step="0.001"
                                />
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Take Stock Modal */}
                {takeModalItem && (
                    <Modal
                        isOpen={true}
                        onClose={() => setTakeModalItem(null)}
                        title={`Ambil Barang: ${takeModalItem.name}`}
                        maxWidth="sm"
                        footer={
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setTakeModalItem(null)} className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" form="take-stock-form" className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                    {isLoading ? 'Processing...' : 'Konfirmasi Ambil'}
                                </button>
                            </div>
                        }
                    >
                        <p className="text-sm text-muted-foreground mb-6">Stock Tersedia: {takeModalItem.stock}</p>

                        <form id="take-stock-form" action={handleTakeStock}>
                            <div className="mb-6">
                                <label className="block text-xs font-normal text-muted-foreground mb-1">Jumlah yang Diambil</label>
                                <input
                                    name="quantity"
                                    type="number"
                                    min="0"
                                    max={takeModalItem.stock}
                                    autoFocus
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-lg focus:border-orange-500 outline-none"
                                    placeholder="0"
                                    step="0.001"
                                />
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Move to Production Modal */}
                {moveModalItem && (
                    <Modal
                        isOpen={true}
                        onClose={() => {
                            setMoveModalItem(null)
                            setMoveSku('')
                        }}
                        title="Move to Production"
                        maxWidth="sm"
                        footer={
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMoveModalItem(null)
                                        setMoveSku('')
                                    }}
                                    className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isLoading}
                                    onClick={handleMoveToProduction}
                                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                                >
                                    {isLoading ? 'Processing...' : 'Konfirmasi Pindah'}
                                </button>
                            </div>
                        }
                    >
                        <p className="text-sm text-muted-foreground mb-4">
                            Pindahkan <span className="font-normal text-foreground">"{moveModalItem.name}"</span> ke Inventory Production?
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">Stock: <span className="font-bold text-emerald-500">{moveModalItem.stock}</span></p>

                        <div className="mb-6">
                            <label className="block text-xs font-normal text-muted-foreground mb-2">Apakah anda ingin menambahkan data SKU? (optional)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={moveSku}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase()
                                        setMoveSku(val)
                                        if (val.length > 0) {
                                            const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(val.toLowerCase()))
                                            setSkuSuggestions(filtered.slice(0, 10))
                                            setShowMoveSkuSuggestions(true)
                                        } else {
                                            setSkuSuggestions([])
                                            setShowMoveSkuSuggestions(false)
                                        }
                                    }}
                                    onFocus={() => {
                                        if (moveSku.length > 0) {
                                            const filtered = allUnusedDrawers.filter(d => d.toLowerCase().includes(moveSku.toLowerCase()))
                                            setSkuSuggestions(filtered.slice(0, 10))
                                            setShowMoveSkuSuggestions(true)
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => setShowMoveSkuSuggestions(false), 200)}
                                    autoComplete="off"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:border-purple-500 outline-none"
                                    placeholder="Masukkan SKU... (e.g. RK01-04)"
                                />
                                {showMoveSkuSuggestions && skuSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {skuSuggestions.map(sku => (
                                            <button
                                                key={sku}
                                                type="button"
                                                onClick={() => {
                                                    setMoveSku(sku)
                                                    setShowMoveSkuSuggestions(false)
                                                }}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                            >
                                                <span className="font-mono text-emerald-600">{sku}</span>
                                                <span className="text-xs text-muted-foreground">Available Drawer</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Items Display */}

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="p-4 transition-colors relative">
                            {/* Action Pencil Button - Top Right */}
                            <button
                                onClick={() => setMobileActionItem(item)}
                                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>

                            <div className="flex gap-3 mb-3 pr-10"> {/* Added pr-10 to prevent overlap with button */}
                                {/* Image */}
                                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden relative border border-border flex-shrink-0">
                                    {item.image ? (
                                        <a href={item.image} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-600">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>

                                {/* Name, SKU, Stock, and Notes */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-foreground text-sm mb-1 truncate">{item.name}</h3>
                                    {item.sku && (
                                        <p className="font-mono text-xs text-muted-foreground mb-1">SKU: {item.sku}</p>
                                    )}
                                    <p className={cn(
                                        "text-xs font-bold mb-1",
                                        item.stock <= 0 ? "text-red-500" : "text-emerald-500"
                                    )}>Stock: {formatNumber(item.stock)}</p>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-2">{item.notes}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredItems.length === 0 && (
                        <div className="px-6 py-12 text-center text-muted-foreground">
                            {searchTerm ? 'No items found matching your search.' : 'No items found. Start by adding one.'}
                        </div>
                    )}
                </div>

                {/* Mobile Actions Modal */}
                {mobileActionItem && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setMobileActionItem(null)}
                    >
                        <div
                            className="bg-card border border-border rounded-xl p-5 w-full max-w-xs shadow-2xl animate-in zoom-in-95 duration-200"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-foreground text-lg truncate max-w-[200px]">{mobileActionItem.name}</h3>
                                    <p className="text-xs text-muted-foreground">Select an action</p>
                                </div>
                                <button
                                    onClick={() => setMobileActionItem(null)}
                                    className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        setEditSkuValue(mobileActionItem.sku || '')
                                        setEditingItem(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-3 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-colors border border-blue-500/20 text-sm font-medium"
                                >
                                    <Edit className="w-5 h-5" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => {
                                        setStockModalItem(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-3 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-colors border border-emerald-500/20 text-sm font-medium"
                                >
                                    <PackagePlus className="w-5 h-5" />
                                    Restock
                                </button>
                                <button
                                    onClick={() => {
                                        if (mobileActionItem.stock <= 0) {
                                            showError('Stock barang ini habis!')
                                            return
                                        }
                                        setTakeModalItem(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-3 text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors border border-orange-500/20 text-sm font-medium"
                                >
                                    <PackageMinus className="w-5 h-5" />
                                    Ambil
                                </button>
                                <button
                                    onClick={() => {
                                        setMoveModalItem(mobileActionItem)
                                        setMobileActionItem(null)
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-3 text-purple-500 hover:bg-purple-500/10 rounded-xl transition-colors border border-purple-500/20 text-sm font-medium"
                                >
                                    <ArrowRightCircle className="w-5 h-5" />
                                    Move
                                </button>
                                <button
                                    onClick={() => {
                                        handleDelete(mobileActionItem.id)
                                        setMobileActionItem(null)
                                    }}
                                    className="col-span-2 flex flex-row items-center justify-center gap-2 p-3 text-muted-foreground hover:text-white hover:bg-destructive rounded-xl transition-colors border border-border hover:border-destructive text-sm font-medium"
                                >
                                    <Trash2 className="w-5 h-5" />
                                    Delete Item
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Image</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="relative group/image">
                                            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border">
                                                {item.image ? (
                                                    <a href={item.image} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
                                                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                                                    </a>
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-gray-600">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Hover Preview */}
                                            {item.image && (
                                                <>
                                                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover/image:opacity-100 group-hover/image:visible transition-all duration-200 pointer-events-none xl:block hidden">
                                                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-border p-2 w-52 h-52">
                                                            <div className="relative w-full h-full rounded-lg overflow-hidden">
                                                                <Image src={item.image} alt={item.name} fill className="object-contain" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 opacity-0 invisible group-hover/image:opacity-100 group-hover/image:visible transition-all duration-200 pointer-events-none xl:hidden block">
                                                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-border p-2 w-52 h-52">
                                                            <div className="relative w-full h-full rounded-lg overflow-hidden">
                                                                <Image src={item.image} alt={item.name} fill className="object-contain" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-muted-foreground">{item.sku || '-'}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "font-bold",
                                            item.stock <= 0 ? "text-red-500" : "text-emerald-500"
                                        )}>
                                            {formatNumber(item.stock)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] whitespace-pre-wrap break-words text-muted-foreground">
                                        {item.notes || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditSkuValue(item.sku || '')
                                                    setEditingItem(item)
                                                }}
                                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                                title="Edit Item"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setStockModalItem(item)}
                                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
                                                title="Add Stock"
                                            >
                                                <PackagePlus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (item.stock <= 0) {
                                                        showError('Stock barang ini habis!')
                                                        return
                                                    }
                                                    setTakeModalItem(item)
                                                }}
                                                className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/20"
                                                title="Ambil Barang"
                                            >
                                                <PackageMinus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setMoveModalItem(item)}
                                                className="p-2 text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors border border-purple-500/20"
                                                title="Move to Production"
                                            >
                                                <ArrowRightCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors group-hover:block"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        {searchTerm ? 'No items found matching your search.' : 'No items found. Start by adding one.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                        const params = new URLSearchParams(window.location.search)
                        params.set('page', page.toString())
                        router.push(`/sparepart-project?${params.toString()}`)
                    }}
                    itemsPerPage={itemsPerPage}
                    totalCount={totalCount}
                    onItemsPerPageChange={(count) => {
                        const params = new URLSearchParams(window.location.search)
                        params.set('page', '1')
                        params.set('limit', count.toString())
                        router.push(`/sparepart-project?${params.toString()}`)
                    }}
                />
            </TableWrapper>
        </div>
    )
}
