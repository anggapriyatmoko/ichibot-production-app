'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X, Warehouse, ImageIcon, Box, Info, MapPin, Search } from 'lucide-react'
import Image from 'next/image'
import Modal from '@/components/ui/modal'
import { getRacksWithUnusedDrawers, createRack, updateRack, deleteRack } from '@/app/actions/rack'
import { getStoreProductBySku } from '@/app/actions/store-product'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import ProductDetailModal from '@/components/shared/product-detail-modal'
import { createProduct } from '@/app/actions/product'
import { createSparepartProject } from '@/app/actions/sparepart-project'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FolderOpen, Package } from 'lucide-react'

interface RackWithDrawers {
    id: string
    name: string
    drawerCount: number
    description: string | null
    unusedDrawersList: string[]
    unusedDrawersCount: number
    allDrawers: Array<{
        code: string
        isUsed: boolean
        details?: {
            name: string
            sku: string
            stock: number
            image: string | null
        }
    }>
}

interface RackManagerProps {
    userRole?: string
}

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface DrawerItemProps {
    drawer: {
        code: string
        isUsed: boolean
        details?: {
            name: string
            sku: string
            stock: number
            image: string | null
            source?: string
        }
    }
    onSelectSku: (sku: string) => void
    onSelectEmpty: (code: string) => void
}

function DrawerItem({ drawer, onSelectSku, onSelectEmpty }: DrawerItemProps) {
    const [align, setAlign] = useState<'left' | 'right' | 'center'>('center')
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMouseEnter = () => {
        if (containerRef.current) {
            const triggerRect = containerRef.current.getBoundingClientRect()
            const tooltipWidth = 208 // w-52 is 13rem = 208px
            const viewportWidth = window.innerWidth

            // Calculate where the tooltip would be if centered
            const expectedLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2)
            const expectedRight = expectedLeft + tooltipWidth

            if (expectedLeft < 10) {
                setAlign('left')
            } else if (expectedRight > viewportWidth - 10) {
                setAlign('right')
            } else {
                setAlign('center')
            }
        }
    }

    return (
        <div
            ref={containerRef}
            className="relative group/tooltip"
            onMouseEnter={handleMouseEnter}
            onClick={() => {
                if (drawer.isUsed && drawer.details) {
                    onSelectSku(drawer.details.sku)
                } else {
                    onSelectEmpty(drawer.code)
                }
            }}
        >
            <span className={cn(
                "px-2 py-1 rounded text-[10px] font-medium shadow-sm transition-all block",
                drawer.isUsed
                    ? (drawer.details?.source === 'sparepart'
                        ? "bg-blue-500 text-white cursor-pointer hover:bg-blue-600 hover:scale-110 active:scale-95 shadow-blue-200/50"
                        : "bg-orange-500 text-white cursor-pointer hover:bg-orange-600 hover:scale-110 active:scale-95 shadow-orange-200/50")
                    : "bg-gray-100 text-muted-foreground border border-border/50 cursor-pointer hover:bg-gray-200 hover:scale-110 active:scale-95 hover:text-foreground shadow-sm"
            )}>
                {drawer.code}
            </span>

            {/* Empty stock indicator */}
            {drawer.isUsed && drawer.details && drawer.details.stock <= 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background shadow-sm z-10" title="Stok Habis" />
            )}

            {/* Tooltip for used drawers */}
            {drawer.isUsed && drawer.details && (
                <div className={cn(
                    "absolute bottom-full mb-2 w-52 p-3 bg-white border border-border rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[60] pointer-events-none",
                    align === 'center' && "left-1/2 -translate-x-1/2",
                    align === 'left' && "left-0",
                    align === 'right' && "right-0"
                )}>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 border-b pb-1">Detail Barang</div>

                    {/* Thumbnail Image */}
                    <div className="flex gap-3 mb-3 mt-1">
                        <div className="w-12 h-12 rounded border border-border overflow-hidden bg-muted flex-shrink-0">
                            {drawer.details.image ? (
                                <Image
                                    src={drawer.details.image}
                                    alt={drawer.details.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-foreground leading-tight line-clamp-2">{drawer.details.name}</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-dashed">
                        <div>
                            <p className="text-[9px] text-muted-foreground uppercase">SKU</p>
                            <p className="text-[10px] font-medium text-foreground">{drawer.details.sku}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] text-muted-foreground uppercase">Stok</p>
                            <p className="text-[10px] font-bold text-emerald-600">{drawer.details.stock} pcs</p>
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className={cn(
                        "absolute top-full border-8 border-transparent border-t-white drop-shadow-sm",
                        align === 'center' && "left-1/2 -translate-x-1/2",
                        align === 'left' && "left-4",
                        align === 'right' && "right-4"
                    )} />
                </div>
            )}
        </div>
    )
}

export default function RackManager({ userRole }: RackManagerProps) {
    const isAdmin = ['ADMIN', 'HRD'].includes(userRole || '')
    const [racks, setRacks] = useState<RackWithDrawers[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ name: '', drawerCount: 0, description: '' })
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [emptyDrawerCode, setEmptyDrawerCode] = useState<string | null>(null)
    const { showConfirmation } = useConfirmation()
    const { showError, showAlert } = useAlert()

    useEffect(() => {
        loadRacks()
    }, [])

    async function loadRacks() {
        setIsLoading(true)
        try {
            const data = await getRacksWithUnusedDrawers()
            setRacks(data)
        } catch (error) {
            showError('Failed to load racks')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdd() {
        if (!formData.name.trim()) {
            showError('Nama rak harus diisi')
            return
        }
        try {
            await createRack({
                name: formData.name.trim(),
                drawerCount: formData.drawerCount,
                description: formData.description.trim() || undefined
            })
            showAlert('Rak berhasil ditambahkan')
            setFormData({ name: '', drawerCount: 0, description: '' })
            setIsAdding(false)
            loadRacks()
        } catch (error) {
            showError('Gagal menambahkan rak')
        }
    }

    async function handleUpdate() {
        if (!editingId || !formData.name.trim()) {
            showError('Nama rak harus diisi')
            return
        }
        try {
            await updateRack(editingId, {
                name: formData.name.trim(),
                drawerCount: formData.drawerCount,
                description: formData.description.trim() || undefined
            })
            showAlert('Rak berhasil diperbarui')
            setEditingId(null)
            setFormData({ name: '', drawerCount: 0, description: '' })
            loadRacks()
        } catch (error) {
            showError('Gagal memperbarui rak')
        }
    }

    async function handleDelete(id: string, name: string) {
        showConfirmation({
            title: 'Hapus Rak',
            message: `Apakah Anda yakin ingin menghapus rak "${name}"?`,
            type: 'confirm',
            action: async () => {
                try {
                    await deleteRack(id)
                    showAlert('Rak berhasil dihapus')
                    loadRacks()
                } catch (error) {
                    showError('Gagal menghapus rak')
                }
            }
        })
    }

    function startEdit(rack: RackWithDrawers) {
        setEditingId(rack.id)
        setFormData({ name: rack.name, drawerCount: rack.drawerCount, description: rack.description || '' })
        setIsAdding(false)
    }

    function cancelEdit() {
        setEditingId(null)
        setIsAdding(false)
        setFormData({ name: '', drawerCount: 0, description: '' })
    }

    async function handleSelectSku(sku: string) {
        try {
            const product = await getStoreProductBySku(sku)
            if (product) {
                setSelectedProduct(product)
            } else {
                showError('Data produk tidak ditemukan')
            }
        } catch (error) {
            showError('Gagal memuat detail produk')
        }
    }

    return (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Warehouse className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Rak Sparepart</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                            <p className="text-xs text-muted-foreground mr-1">Status Laci:</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Production</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shadow-sm" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Project</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 border border-border/50" />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Tersedia</span>
                            </div>
                            <div className="flex items-center gap-1.5 border-l border-border pl-4 ml-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">Stok Habis</span>
                            </div>
                        </div>
                    </div>
                </div>
                {isAdmin && !isAdding && !editingId && (
                    <button
                        onClick={() => { setIsAdding(true); setFormData({ name: '', drawerCount: 0, description: '' }) }}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Tambah Rak</span>
                    </button>
                )}
            </div>

            <div className="divide-y divide-border">
                {/* Modals for Add/Edit */}
                <Modal
                    isOpen={isAdding || !!editingId}
                    onClose={cancelEdit}
                    title={
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Warehouse className="w-5 h-5 text-primary" />
                            </div>
                            <span>{isAdding ? 'Tambah Rak Baru' : 'Edit Rak'}</span>
                        </div>
                    }
                    maxWidth="md"
                    footer={
                        <div className="flex justify-end gap-3 w-full">
                            <button
                                onClick={cancelEdit}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={isAdding ? handleAdd : handleUpdate}
                                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-bold shadow-lg shadow-primary/20"
                            >
                                <Save className="w-4 h-4" />
                                {isAdding ? 'Simpan Rak' : 'Update Rak'}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nama Rak</label>
                            <input
                                type="text"
                                placeholder="Contoh: RAK-A"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Jumlah Laci</label>
                            <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={formData.drawerCount || ''}
                                onChange={e => setFormData({ ...formData, drawerCount: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Keterangan (Opsional)</label>
                            <textarea
                                placeholder="Keterangan laci atau lokasi..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] transition-all resize-none"
                            />
                        </div>
                    </div>
                </Modal>

                {/* Loading */}
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                ) : racks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Belum ada data rak. Klik "Tambah Rak" untuk menambahkan.
                    </div>
                ) : (
                    racks.map(rack => (
                        <div key={rack.id} className="p-4 hover:bg-accent/50 transition-colors group">
                            <div>
                                {/* Rack Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-lg text-foreground">{rack.name}</h4>
                                            {rack.unusedDrawersCount === 0 && (
                                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-500/20 flex items-center gap-1">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                                    Semua laci sudah dipakai ✓
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {rack.drawerCount} laci total • {rack.description || 'Tidak ada keterangan'}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => startEdit(rack)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(rack.id, rack.name)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* All Drawers */}
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <p className="text-xs font-medium text-foreground mb-2">
                                        Status Laci ({rack.drawerCount}):
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(rack.allDrawers || []).map(drawer => (
                                            <DrawerItem
                                                key={drawer.code}
                                                drawer={drawer}
                                                onSelectSku={handleSelectSku}
                                                onSelectEmpty={(code) => setEmptyDrawerCode(code)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ProductDetailModal
                isOpen={!!selectedProduct}
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onSuccess={loadRacks}
            />

            <AddProductFromRackModal
                isOpen={!!emptyDrawerCode}
                onClose={() => setEmptyDrawerCode(null)}
                drawerCode={emptyDrawerCode || ''}
                onSuccess={() => {
                    setEmptyDrawerCode(null)
                    loadRacks()
                }}
            />
        </div>
    )
}

interface AddProductFromRackModalProps {
    isOpen: boolean
    onClose: () => void
    drawerCode: string
    onSuccess: () => void
}

function AddProductFromRackModal({ isOpen, onClose, drawerCode, onSuccess }: AddProductFromRackModalProps) {
    const [activeTab, setActiveTab] = useState<'production' | 'project'>('production')
    const [isLoading, setIsLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const { showError, showAlert } = useAlert()

    const [formData, setFormData] = useState({
        name: '',
        sku: drawerCode,
        stock: 0,
        lowStockThreshold: 10,
        notes: '',
        image: null as File | null
    })

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({ ...prev, sku: drawerCode, name: '', stock: 0, notes: '', image: null }))
            setImagePreview(null)
        }
    }, [isOpen, drawerCode])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFormData({ ...formData, image: file })
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name) {
            showError('Nama barang harus diisi')
            return
        }

        setIsLoading(true)
        try {
            const data = new FormData()
            data.append('name', formData.name)
            data.append('sku', formData.sku)
            data.append('stock', formData.stock.toString())
            data.append('notes', formData.notes)
            if (formData.image) data.append('image', formData.image)

            if (activeTab === 'production') {
                data.append('lowStockThreshold', formData.lowStockThreshold.toString())
                data.append('drawerLocation', drawerCode)
                const result = await createProduct(data)
                if (result.error) throw new Error(result.error)
            } else {
                const result = await createSparepartProject(data)
                if (result.error) throw new Error(result.error)
            }

            showAlert(`Berhasil menambahkan barang ke ${drawerCode}`)
            onSuccess()
        } catch (error: any) {
            showError(error.message || 'Gagal menambahkan barang')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tambah Barang ke Laci ${drawerCode}`}
            maxWidth="xl"
            footer={(
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="add-product-form"
                        disabled={isLoading}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-md shadow-primary/20",
                            activeTab === 'production' ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-500 hover:bg-blue-600",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Simpan Barang
                    </button>
                </div>
            )}
        >
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex bg-muted/50 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('production')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'production'
                                ? "bg-background text-orange-600 shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/30"
                        )}
                    >
                        <Package className="w-4 h-4" />
                        Production
                    </button>
                    <button
                        onClick={() => setActiveTab('project')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'project'
                                ? "bg-background text-blue-600 shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/30"
                        )}
                    >
                        <FolderOpen className="w-4 h-4" />
                        Project
                    </button>
                </div>

                <form id="add-product-form" onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nama Barang</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Masukkan nama barang"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>SKU / Kode (Otomatis)</Label>
                            <Input
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="SKU"
                                readOnly
                                className="bg-muted opacity-80"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Stok Awal</Label>
                            <Input
                                type="number"
                                value={formData.stock}
                                onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                                min="0"
                            />
                        </div>
                        {activeTab === 'production' && (
                            <div className="space-y-2">
                                <Label>Batas Stok Menipis</Label>
                                <Input
                                    type="number"
                                    value={formData.lowStockThreshold}
                                    onChange={e => setFormData({ ...formData, lowStockThreshold: parseFloat(e.target.value) || 0 })}
                                    min="0"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Keterangan</Label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] transition-all resize-none"
                            placeholder="Catatan tambahan..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Gambar (Opsional)</Label>
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted flex-shrink-0">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                                )}
                            </div>
                            <div className="flex-1">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1.5">Maks. 1MB (JPG, PNG, WEBP)</p>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </Modal>
    )
}
