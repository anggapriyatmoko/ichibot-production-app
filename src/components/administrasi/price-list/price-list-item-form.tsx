'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Pencil, Upload, Image as ImageIcon, X, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPriceListItem, updatePriceListItem, createPriceListCategory } from '@/app/actions/price-list'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/hooks/use-alert'
import SimpleWysiwyg from '@/components/ui/simple-wysiwyg'
import Image from 'next/image'

import CategoryManager from './category-manager'

interface PriceListItemFormProps {
    groupId?: string
    item?: any
    existingCategories?: any[]
    uncategorizedOrder?: number
}

interface PriceEntry {
    label: string
    price: string
    discount: string
    qty: string
    description: string
}

// Helper for number formatting
const formatNumber = (value: string | number) => {
    if (!value) return ''
    return new Intl.NumberFormat('id-ID').format(Number(value))
}

const parseNumber = (value: string) => {
    return value.replace(/\./g, '').replace(/[^0-9]/g, '')
}

const countWords = (html: string) => {
    // Remove HTML tags, replace &nbsp;, and normalize whitespace
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    // Split by spaces and filter out empty strings to get actual words
    const words = text ? text.split(/\s+/).filter(word => word.length > 0) : []
    return words.length
}

export default function PriceListItemForm({ groupId, item, existingCategories = [], uncategorizedOrder = 0 }: PriceListItemFormProps) {
    const isEdit = !!item
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { showAlert, showError } = useAlert()

    // Form States
    const [name, setName] = useState(item?.name || '')
    const [category, setCategory] = useState(item?.category || '')
    const [quantity, setQuantity] = useState(item?.quantity || '')
    const [price, setPrice] = useState(item?.price?.toString() || '')
    const [discount, setDiscount] = useState(item?.discount?.toString() || '0')
    const [description, setDescription] = useState(item?.description || '')
    const [shortDescription, setShortDescription] = useState(item?.shortDescription || '')

    // Multi-price variant state
    const [prices, setPrices] = useState<PriceEntry[]>([])

    // UI State
    const [openCategoryInput, setOpenCategoryInput] = useState(false)
    const [availableCategories, setAvailableCategories] = useState<string[]>([])

    // Sync with props
    useEffect(() => {
        if (existingCategories) {
            // Handle both string[] (legacy) and object[] (new)
            const names = existingCategories.map((c: any) => typeof c === 'string' ? c : c.name)
            setAvailableCategories(prev => {
                const newSet = new Set([...prev, ...names])
                return Array.from(newSet).sort()
            })
        }
    }, [existingCategories])

    // Image States
    const [imagePreview, setImagePreview] = useState<string | null>(item?.image || null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [removeImage, setRemoveImage] = useState(false)

    // Additional Images States
    const [additionalImages, setAdditionalImages] = useState<File[]>([])
    const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([])
    const [existingAdditionalImages, setExistingAdditionalImages] = useState<string[]>([]) // URLs
    const [removedAdditionalImages, setRemovedAdditionalImages] = useState<string[]>([]) // URLs to remove

    const fileInputRef = useRef<HTMLInputElement>(null)
    const additionalFileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (item?.additionalImages) {
            try {
                const parsed = JSON.parse(item.additionalImages)
                setExistingAdditionalImages(parsed)
            } catch (e) {
                setExistingAdditionalImages([])
            }
        }
    }, [item])

    const resetForm = () => {
        if (isEdit) {
            setName(item.name)
            setCategory(item.category || '')
            setQuantity(item.quantity || '')
            setPrice(item.price.toString())
            setDiscount(item.discount?.toString() || '0')
            setDescription(item.description || '')
            setShortDescription(item.shortDescription || '')
            // Ensure current category is available in dropdown
            const validCategories = existingCategories?.map((c: any) => typeof c === 'string' ? c : c.name) || []
            let currentCategories = [...validCategories]

            if (item.category && !currentCategories.includes(item.category)) {
                currentCategories.push(item.category)
                currentCategories.sort()
            }

            setAvailableCategories(currentCategories)

            // Only open input if we truly have NO categories to pick from
            setOpenCategoryInput(currentCategories.length === 0)

            setImagePreview(item.image)
            setSelectedFile(null)
            setRemoveImage(false)
            try {
                setExistingAdditionalImages(JSON.parse(item.additionalImages || '[]'))
            } catch {
                setExistingAdditionalImages([])
            }
            setAdditionalImages([])
            setAdditionalImagePreviews([])
            setRemovedAdditionalImages([])
            // Init prices from item
            if (item.prices && item.prices.length > 0) {
                setPrices(item.prices.map((p: any) => ({
                    label: p.label || '',
                    price: p.price?.toString() || '0',
                    discount: p.discount?.toString() || '0',
                    qty: p.qty || '',
                    description: p.description || ''
                })))
            } else {
                setPrices([{
                    label: 'Harga',
                    price: item.price?.toString() || '0',
                    discount: item.discount?.toString() || '0',
                    qty: item.quantity || '',
                    description: ''
                }])
            }
        } else {
            setName('')
            setCategory('')
            setQuantity('')
            setPrice('')
            setDiscount('0')
            setPrice('')
            setDiscount('0')
            setDescription('')
            setShortDescription('')
            setPrices([{ label: 'Harga', price: '', discount: '0', qty: '', description: '' }])
            setOpenCategoryInput(availableCategories.length === 0)
            setImagePreview(null)
            setSelectedFile(null)
            setRemoveImage(false)
            setExistingAdditionalImages([])
            setAdditionalImages([])
            setAdditionalImagePreviews([])
            setRemovedAdditionalImages([])
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
        if (additionalFileInputRef.current) additionalFileInputRef.current.value = ''
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setSelectedFile(file)
            setRemoveImage(false)
            const url = URL.createObjectURL(file)
            setImagePreview(url)
        }
    }

    const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (files.length > 0) {
            const currentTotal = existingAdditionalImages.length + additionalImages.length
            if (currentTotal + files.length > 4) { // Max 4 additional + 1 main = 5
                showError('Maksimal foto tambahan adalah 4 (Total 5 termasuk foto utama)')
                return
            }

            const newPreviews = files.map(file => URL.createObjectURL(file))
            setAdditionalImages([...additionalImages, ...files])
            setAdditionalImagePreviews([...additionalImagePreviews, ...newPreviews])
        }
    }

    const handleRemoveImage = () => {
        setImagePreview(null)
        setSelectedFile(null)
        setRemoveImage(true)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRemoveAdditionalImage = (index: number, isExisting: boolean) => {
        if (isExisting) {
            // Remove from existing list and add to removed list
            const urlToRemove = existingAdditionalImages[index]
            setRemovedAdditionalImages([...removedAdditionalImages, urlToRemove])
            setExistingAdditionalImages(existingAdditionalImages.filter((_, i) => i !== index))
        } else {
            // Remove from new files list
            const newFiles = [...additionalImages]
            newFiles.splice(index, 1)
            setAdditionalImages(newFiles)

            const newPreviews = [...additionalImagePreviews]
            URL.revokeObjectURL(newPreviews[index]) // Cleanup
            newPreviews.splice(index, 1)
            setAdditionalImagePreviews(newPreviews)
        }
    }

    // --- Price variant handlers ---
    const addPriceEntry = () => {
        setPrices([...prices, { label: '', price: '', discount: '0', qty: '', description: '' }])
    }

    const removePriceEntry = (index: number) => {
        if (prices.length <= 1) return
        setPrices(prices.filter((_, i) => i !== index))
    }

    const updatePriceEntry = (index: number, field: keyof PriceEntry, value: string) => {
        const updated = [...prices]
        updated[index] = { ...updated[index], [field]: value }
        setPrices(updated)
    }

    const handleSubmit = async () => {
        if (!name.trim()) {
            showError('Nama barang wajib diisi')
            return
        }

        const shortDescWordCount = countWords(shortDescription)
        if (shortDescWordCount === 0) {
            showError('Deskripsi Singkat wajib diisi')
            return
        }

        if (shortDescWordCount > 200) {
            showError('Deskripsi Singkat maksimal 200 kata')
            return
        }

        const p = parseFloat(price)
        const d = parseFloat(discount)

        if (!isNaN(p) && !isNaN(d) && d > 0 && d >= p) {
            showError('Harga diskon harus lebih kecil dari harga normal')
            return
        }

        setLoading(true)
        const formData = new FormData()

        if (isEdit) {
            formData.append('id', item.id)
            if (removeImage) formData.append('removeImage', 'true')
            formData.append('removedAdditionalImages', JSON.stringify(removedAdditionalImages))
        } else {
            formData.append('groupId', groupId!)
        }

        formData.append('name', name)
        formData.append('category', category)
        formData.append('quantity', prices[0]?.qty || quantity)
        formData.append('price', (parseFloat(prices[0]?.price || '0') || 0).toString())
        formData.append('discount', (parseFloat(prices[0]?.discount || '0') || 0).toString())
        formData.append('description', description)
        formData.append('shortDescription', shortDescription)

        // Serialize variant prices
        const pricesPayload = prices.map(p => ({
            label: p.label,
            price: parseFloat(p.price || '0') || 0,
            discount: parseFloat(p.discount || '0') || 0,
            qty: p.qty,
            description: p.description
        }))
        formData.append('prices', JSON.stringify(pricesPayload))

        if (selectedFile) {
            formData.append('image', selectedFile)
        }

        additionalImages.forEach(file => {
            formData.append('additionalImages', file)
        })

        const res = isEdit
            ? await updatePriceListItem(formData)
            : await createPriceListItem(formData)

        setLoading(false)

        if (res.error) {
            showError(res.error)
        } else {
            setOpen(false)
            if (!isEdit) resetForm()
            router.refresh()
            showAlert(isEdit ? 'Item diperbarui' : 'Item ditambahkan', 'Berhasil')
        }
    }

    return (
        <>
            {isEdit ? (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setOpen(true); resetForm(); }}>
                    <Pencil className="w-4 h-4" />
                </Button>
            ) : (
                <Button size="sm" variant="default" onClick={() => { setOpen(true); resetForm(); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Item
                </Button>
            )}

            <Modal
                isOpen={open}
                onClose={() => setOpen(false)}
                title={isEdit ? 'Edit Item' : 'Tambah Item Baru'}
                maxWidth="2xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <div className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Nama Barang/Jasa <span className="text-destructive">*</span></Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Contoh: Service Ringan"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <Label>Deskripsi Singkat <span className="text-destructive">*</span></Label>
                                <span className={`text-[10px] font-medium ${countWords(shortDescription) > 200 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {countWords(shortDescription)} / 200 kata
                                </span>
                            </div>
                            <SimpleWysiwyg
                                value={shortDescription}
                                onChange={setShortDescription}
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Keterangan</Label>
                            <SimpleWysiwyg
                                value={description}
                                onChange={setDescription}
                                className="min-h-[150px]"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Kategori (Opsional)</Label>
                            <div className="flex gap-2">
                                {availableCategories.length > 0 && !openCategoryInput ? (
                                    <div className="flex-1 flex gap-2">
                                        <select
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            <option value="">-- Pilih Kategori --</option>
                                            {availableCategories.map((cat, index) => (
                                                <option key={index} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                        {category && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => {
                                                    setOpenCategoryInput(true)
                                                }}
                                                title="Edit Kategori"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                                setCategory('')
                                                setOpenCategoryInput(true)
                                            }}
                                            title="Tambah Kategori Baru"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <Input
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            placeholder="Ketik nama kategori..."
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    if (category.trim()) {
                                                        if (!availableCategories.includes(category.trim())) {
                                                            setAvailableCategories(prev => [...prev, category.trim()].sort())
                                                        }
                                                        setOpenCategoryInput(false)
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="default"
                                            size="icon"
                                            onClick={async () => {
                                                if (category.trim()) {
                                                    const newCategory = category.trim()
                                                    if (!availableCategories.includes(newCategory)) {
                                                        // Optimistically add to list
                                                        setAvailableCategories(prev => [...prev, newCategory].sort())

                                                        // Create in DB if we have groupId
                                                        const activeGroupId = groupId || item?.groupId
                                                        if (activeGroupId) {
                                                            await createPriceListCategory(activeGroupId, newCategory)
                                                            router.refresh()
                                                        }
                                                    }
                                                }
                                                setOpenCategoryInput(false)
                                            }}
                                            title="Simpan Kategori"
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        {availableCategories.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setOpenCategoryInput(false)}
                                                title="Batal"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Category Manager */}
                            {(groupId || item?.groupId) && existingCategories && (
                                <CategoryManager
                                    groupId={groupId || item.groupId}
                                    categories={existingCategories.filter((c: any) => typeof c !== 'string')}
                                    uncategorizedOrder={uncategorizedOrder}
                                    onDelete={(deletedName) => {
                                        setAvailableCategories(prev => prev.filter(c => c !== deletedName))
                                        if (category === deletedName) {
                                            setCategory('')
                                        }
                                        router.refresh()
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Varian Harga */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Varian Harga</Label>
                            <Button type="button" size="sm" variant="outline" onClick={addPriceEntry}>
                                <Plus className="w-3 h-3 mr-1" />
                                Tambah Varian
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {prices.map((entry, index) => (
                                <div key={index} className="relative border rounded-lg p-4 bg-muted/30">
                                    {prices.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removePriceEntry(index)}
                                            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                                            title="Hapus varian"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-1 col-span-2 md:col-span-4">
                                            <Label className="text-xs text-muted-foreground">Label Varian</Label>
                                            <Input
                                                value={entry.label}
                                                onChange={(e) => updatePriceEntry(index, 'label', e.target.value)}
                                                placeholder="Contoh: Online, Offline, Dalam Kota"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Harga (IDR)</Label>
                                            <Input
                                                type="text"
                                                value={formatNumber(entry.price)}
                                                onChange={(e) => updatePriceEntry(index, 'price', parseNumber(e.target.value))}
                                                placeholder="0"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Harga Diskon (IDR)</Label>
                                            <Input
                                                type="text"
                                                value={formatNumber(entry.discount)}
                                                onChange={(e) => updatePriceEntry(index, 'discount', parseNumber(e.target.value))}
                                                placeholder="0"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-xs text-muted-foreground">Qty / Satuan</Label>
                                            <Input
                                                value={entry.qty}
                                                onChange={(e) => updatePriceEntry(index, 'qty', e.target.value)}
                                                placeholder="Contoh: 1 pcs, Per Orang"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2 md:col-span-4">
                                            <Label className="text-xs text-muted-foreground">Keterangan</Label>
                                            <textarea
                                                value={entry.description}
                                                onChange={(e) => updatePriceEntry(index, 'description', e.target.value)}
                                                placeholder="Keterangan tambahan untuk varian ini"
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Foto Utama & Tambahan (Max 5 Total)</Label>
                        <div className="mt-2">
                            <div className="flex flex-wrap gap-4">
                                {/* Main Image Slot */}
                                <div className="relative group">
                                    {imagePreview ? (
                                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border bg-background shrink-0 shadow-sm group">
                                            <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-br-lg z-10 font-medium">
                                                Foto Utama
                                            </div>
                                            <Image
                                                src={imagePreview}
                                                alt="Main Preview"
                                                fill
                                                className="object-cover"
                                            />
                                            <button
                                                onClick={handleRemoveImage}
                                                className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
                                                type="button"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className="w-32 h-32 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center text-blue-400 cursor-pointer hover:bg-blue-100 transition-colors relative"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <div className="absolute top-0 left-0 bg-blue-600/10 text-blue-600 text-[10px] px-2 py-0.5 rounded-br-lg font-medium">
                                                Foto Utama
                                            </div>
                                            <ImageIcon className="w-8 h-8 mb-1" />
                                            <span className="text-xs font-medium">Upload</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {/* Additional Images Slots */}
                                {existingAdditionalImages.map((url, index) => (
                                    <div key={`existing-${index}`} className="relative group w-32 h-32 rounded-lg overflow-hidden border bg-background shrink-0 shadow-sm">
                                        <Image
                                            src={url}
                                            alt={`Additional ${index}`}
                                            fill
                                            className="object-cover"
                                        />
                                        <button
                                            onClick={() => handleRemoveAdditionalImage(index, true)}
                                            className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                                            type="button"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {additionalImagePreviews.map((url, index) => (
                                    <div key={`new-${index}`} className="relative group w-32 h-32 rounded-lg overflow-hidden border bg-background shrink-0 shadow-sm">
                                        <Image
                                            src={url}
                                            alt={`New Additional ${index}`}
                                            fill
                                            className="object-cover"
                                        />
                                        <button
                                            onClick={() => handleRemoveAdditionalImage(index, false)}
                                            className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                                            type="button"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}

                                {/* Add Button (if less than 4 additional images) */}
                                {(existingAdditionalImages.length + additionalImages.length) < 4 && (
                                    <div
                                        className="w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
                                        onClick={() => additionalFileInputRef.current?.click()}
                                    >
                                        <Plus className="w-8 h-8 mb-1 opacity-50" />
                                        <span className="text-xs text-center px-2">Tambah Lainnya<br />(Max 4)</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={additionalFileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleAdditionalFileChange}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                * Foto Utama wajib ada sebelum menambah foto lainnya. Maksimal total 5 foto (1 Utama + 4 Tambahan). Max 1MB per foto.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}
