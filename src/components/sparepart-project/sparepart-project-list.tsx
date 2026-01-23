'use client'

import { useState, useEffect } from 'react'
import { createSparepartProject, deleteSparepartProject, addSparepartProjectStock, updateSparepartProject, reduceSparepartProjectStock, moveToProduction } from '@/app/actions/sparepart-project'
import { getRacksWithUnusedDrawers } from '@/app/actions/rack'
import { Plus, Trash2, Search, PackagePlus, ImageIcon, Edit, PackageMinus, ChevronLeft, ChevronRight, ArrowRightCircle, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/utils/format'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'

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
    currentPage = 1
}: {
    initialItems: SparepartProject[]
    userRole?: string
    totalPages?: number
    currentPage?: number
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
            {/* Header / Controls */}
            <div className="flex justify-between items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="flex gap-2 flex-shrink-0">
                    {['ADMIN', 'HRD', 'USER'].includes(userRole || '') && (
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm"
                            title="Add Item"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Add Item Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 mt-10 mb-10">
                        <h3 className="text-xl font-bold text-foreground mb-6">Add New Sparepart Project</h3>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
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
                                                    <input
                                                        type="file"
                                                        name="image"
                                                        accept="image/*"
                                                        capture="environment"
                                                        onChange={handleAddImageChange}
                                                        className="hidden"
                                                    />
                                                    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium">
                                                        <Camera className="w-4 h-4" />
                                                        Ambil Foto
                                                    </div>
                                                </label>
                                                <label className="flex-1 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        name="image"
                                                        accept=".jpg,.jpeg,.png,.webp,.gif"
                                                        onChange={handleAddImageChange}
                                                        className="hidden"
                                                    />
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
                                <div className="md:col-span-2">
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
                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-bold transition-colors shadow-sm">
                                    {isLoading ? 'Saving...' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 mt-10 mb-10">
                        <h3 className="text-lg font-normal text-foreground mb-4">Edit Item: {editingItem.name}</h3>
                        <form action={handleUpdateItem} className="space-y-4">
                            <input type="hidden" name="id" value={editingItem.id} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
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
                                                    <input
                                                        type="file"
                                                        name="image"
                                                        accept="image/*"
                                                        capture="environment"
                                                        onChange={handleEditImageChange}
                                                        className="hidden"
                                                    />
                                                    <div className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                                        <Camera className="w-4 h-4" />
                                                        Ambil Foto
                                                    </div>
                                                </label>
                                                <label className="flex-1 cursor-pointer">
                                                    <input
                                                        type="file"
                                                        name="image"
                                                        accept=".jpg,.jpeg,.png,.webp,.gif"
                                                        onChange={handleEditImageChange}
                                                        className="hidden"
                                                    />
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
                                        value={editSkuValue || editingItem.sku || ''}
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
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-normal text-muted-foreground mb-1">Notes</label>
                                    <textarea name="notes" defaultValue={editingItem.notes || ''} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none" rows={3} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-normal transition-colors shadow-sm">
                                    {isLoading ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Stock Modal */}
            {stockModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-2">Restock: {stockModalItem.name}</h3>
                        <p className="text-sm text-muted-foreground mb-6">Current Stock: {stockModalItem.stock}</p>

                        <form action={handleAddStock}>
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
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStockModalItem(null)} className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                    {isLoading ? 'Processing...' : 'Confirm Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Take Stock Modal */}
            {takeModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-2">Ambil Barang: {takeModalItem.name}</h3>
                        <p className="text-sm text-muted-foreground mb-6">Stock Tersedia: {takeModalItem.stock}</p>

                        <form action={handleTakeStock}>
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
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setTakeModalItem(null)} className="flex-1 px-4 py-3 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors">Cancel</button>
                                <button disabled={isLoading} type="submit" className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                                    {isLoading ? 'Processing...' : 'Konfirmasi Ambil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Move to Production Modal */}
            {moveModalItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-2">Move to Production</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Pindahkan <span className="font-normal text-foreground">"{moveModalItem.name}"</span> ke Inventory Production?
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">Stock: <span className="font-bold text-emerald-500">{moveModalItem.stock}</span></p>

                        <div className="mb-6">
                            <label className="block text-xs font-normal text-muted-foreground mb-2">Apakah anda ingin menambahkan data SKU? (optional)</label>
                            <input
                                type="text"
                                value={moveSku}
                                onChange={(e) => setMoveSku(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground text-sm focus:border-purple-500 outline-none"
                                placeholder="Masukkan SKU..."
                            />
                        </div>
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
                    </div>
                </div>
            )}

            {/* Items Display */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="p-4 transition-colors">
                            <div className="flex gap-3 mb-3">
                                {/* Image */}
                                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden relative border border-border flex-shrink-0">
                                    {item.image ? (
                                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-600">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>

                                {/* Name and Notes */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-foreground text-sm mb-1 truncate">{item.name}</h3>
                                    {item.notes && (
                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-2">{item.notes}</p>
                                    )}
                                </div>
                            </div>

                            {/* Stock */}
                            <div className="flex items-center gap-2 mb-3">
                                <p className="text-sm text-muted-foreground">Stock:</p>
                                <p className="text-lg font-bold text-emerald-500">
                                    {formatNumber(item.stock)}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                                {['ADMIN', 'HRD', 'USER'].includes(userRole || '') && (
                                    <button
                                        onClick={() => {
                                            setEditSkuValue('')
                                            setEditingItem(item)
                                        }}
                                        className="flex items-center justify-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20 text-sm font-normal"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </button>
                                )}
                                <button
                                    onClick={() => setStockModalItem(item)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20 text-sm font-normal"
                                >
                                    <PackagePlus className="w-4 h-4" />
                                    Restock
                                </button>
                                <button
                                    onClick={() => setTakeModalItem(item)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/20 text-sm font-normal"
                                >
                                    <PackageMinus className="w-4 h-4" />
                                    Ambil
                                </button>
                                <button
                                    onClick={() => setMoveModalItem(item)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors border border-purple-500/20 text-sm font-normal"
                                >
                                    <ArrowRightCircle className="w-4 h-4" />
                                    Move
                                </button>
                                {['ADMIN', 'HRD'].includes(userRole || '') && (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredItems.length === 0 && (
                        <div className="px-6 py-12 text-center text-muted-foreground">
                            {searchTerm ? 'No items found matching your search.' : 'No items found. Start by adding one.'}
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="w-full text-left text-sm text-muted-foreground">
                        <thead className="bg-muted text-foreground uppercase font-normal">
                            <tr>
                                <th className="px-6 py-4">Image</th>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-accent/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="relative group/image">
                                            <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden relative border border-border cursor-pointer">
                                                {item.image ? (
                                                    <Image src={item.image} alt={item.name} fill className="object-cover" />
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
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{item.sku || '-'}</td>
                                    <td className="px-6 py-4 font-normal text-foreground">{item.name}</td>
                                    <td className="px-6 py-4 font-bold text-base text-emerald-500">
                                        {formatNumber(item.stock)}
                                    </td>
                                    <td className="px-6 py-4 max-w-[300px] whitespace-pre-wrap break-words text-muted-foreground">
                                        {item.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {['ADMIN', 'HRD', 'USER'].includes(userRole || '') && (
                                                <button
                                                    onClick={() => {
                                                        setEditSkuValue('')
                                                        setEditingItem(item)
                                                    }}
                                                    className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                                    title="Edit Item"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setStockModalItem(item)}
                                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
                                                title="Add Stock"
                                            >
                                                <PackagePlus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setTakeModalItem(item)}
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
                                            {['ADMIN', 'HRD'].includes(userRole || '') && (
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors group-hover:block"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        {searchTerm ? 'No items found matching your search.' : 'No items found. Start by adding one.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
                    <p className="text-sm text-muted-foreground">
                        Page <span className="text-foreground font-normal">{currentPage}</span> of <span className="text-foreground font-normal">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push(`/sparepart-project?page=${currentPage - 1}`)}
                            disabled={currentPage <= 1}
                            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => router.push(`/sparepart-project?page=${currentPage + 1}`)}
                            disabled={currentPage >= totalPages}
                            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
