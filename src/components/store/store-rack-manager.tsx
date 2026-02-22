'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X, Warehouse, ImageIcon, Box, Info, MapPin, Search, RefreshCw, Download, Upload } from 'lucide-react'
import Image from 'next/image'
import Modal from '@/components/ui/modal'
import { getStoreRacksWithDetails, createStoreRack, updateStoreRack, deleteStoreRack, exportStoreRacks } from '@/app/actions/store-rack'
import { getStoreProductBySku } from '@/app/actions/store-product'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'
import * as XLSX from 'xlsx'
import ImportRackModal from './import-rack-modal'
import { cn } from '@/lib/utils'
import {
    TableWrapper,
    TableHeaderContent
} from '@/components/ui/table'

interface RackWithDrawers {
    id: string
    name: string
    drawerCount: number
    description: string | null
    rows: number | null
    cols: number | null
    drawerColors: any | null
    drawerNotes: any | null
    drawerNoteColors: any | null
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
            source: string
            wcId: number
            backupGudang: string | null
        }
    }>
}

const RACK_COLORS = [
    { name: 'Blue', value: 'blue', active: 'bg-blue-600', hover: 'hover:bg-blue-700' },
    { name: 'Red', value: 'red', active: 'bg-red-600', hover: 'hover:bg-red-700' },
    { name: 'Emerald', value: 'emerald', active: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
    { name: 'Amber', value: 'amber', active: 'bg-amber-600', hover: 'hover:bg-amber-700' },
    { name: 'Violet', value: 'violet', active: 'bg-violet-600', hover: 'hover:bg-violet-700' },
    { name: 'Cyan', value: 'cyan', active: 'bg-cyan-600', hover: 'hover:bg-cyan-700' },
    { name: 'Slate', value: 'slate', active: 'bg-slate-600', hover: 'hover:bg-slate-700' },
]

const NOTE_COLORS = [
    { name: 'Hijau', value: 'green', active: 'bg-green-500', transition: 'ring-green-500/20' },
    { name: 'Kuning', value: 'yellow', active: 'bg-yellow-400', transition: 'ring-yellow-400/20' },
    { name: 'Merah', value: 'red', active: 'bg-red-500', transition: 'ring-red-500/20' },
]

interface DrawerItemProps {
    drawer: {
        code: string
        isUsed: boolean
        details?: {
            name: string
            sku: string
            stock: number
            image: string | null
            source: string
            wcId: number
            backupGudang: string | null
        }
    }
    drawerColors?: any
    drawerNotes?: any
    drawerNoteColors?: any
    onClick: () => void
}

function DrawerItem({ drawer, drawerColors, drawerNotes, drawerNoteColors, onClick }: DrawerItemProps) {
    const specificColor = drawerColors ? drawerColors[drawer.code] : null
    const noteColorValue = drawerNoteColors?.[drawer.code] || 'green'
    const noteColor = NOTE_COLORS.find(c => c.value === noteColorValue) || NOTE_COLORS[0]
    const colorTemplate = RACK_COLORS.find(c => c.value === specificColor) || RACK_COLORS[0]
    const [align, setAlign] = useState<'left' | 'right' | 'center'>('center')
    const containerRef = useRef<HTMLDivElement>(null)

    const handleMouseEnter = () => {
        if (containerRef.current) {
            const triggerRect = containerRef.current.getBoundingClientRect()
            const tooltipWidth = 208
            const viewportWidth = window.innerWidth

            const expectedLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipWidth / 2)
            const expectedRight = expectedLeft + tooltipWidth

            if (expectedLeft < 10) setAlign('left')
            else if (expectedRight > viewportWidth - 10) setAlign('right')
            else setAlign('center')
        }
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative group/tooltip",
                drawer.isUsed ? "cursor-pointer" : "cursor-default opacity-80"
            )}
            onMouseEnter={handleMouseEnter}
            onClick={drawer.isUsed ? onClick : undefined}
        >
            <div className="relative">
                <span className={cn(
                    "px-2 py-1 rounded text-[10px] font-medium shadow-sm transition-all block",
                    drawer.isUsed
                        ? cn(colorTemplate.active, "text-white cursor-help hover:scale-110 active:scale-95 shadow-sm")
                        : "bg-gray-100 text-muted-foreground border border-border/50 shadow-sm"
                )}>
                    {drawer.code}
                </span>
                {drawerNotes?.[drawer.code] && (
                    <div className={cn(
                        "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-sm ring-1",
                        noteColor.active,
                        noteColor.transition
                    )} />
                )}
            </div>

            {drawer.isUsed && drawer.details && (
                <div className={cn(
                    "hidden sm:block absolute bottom-full mb-2 w-52 p-3 bg-white border border-border rounded-xl shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-[60] pointer-events-none",
                    align === 'center' && "left-1/2 -translate-x-1/2",
                    align === 'left' && "left-0",
                    align === 'right' && "right-0"
                )}>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 border-b pb-1">Detail Produk Store</div>

                    <div className="flex gap-3 mb-3 mt-1">
                        <div className="w-12 h-12 rounded border border-border overflow-hidden bg-muted flex-shrink-0">
                            {drawer.details.image ? (
                                <img
                                    src={drawer.details.image}
                                    alt={drawer.details.name}
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
                            <div className="text-[10px] text-muted-foreground mt-0.5">ID: {drawer.details.wcId}</div>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-dashed">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-muted-foreground uppercase leading-none mb-1">SKU & Lokasi</p>
                                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                                    <p className="text-[10px] font-medium text-foreground truncate">{drawer.details.sku}</p>
                                    {drawer.details.backupGudang && (
                                        <div className="flex items-center gap-1 bg-muted px-1 rounded-[3px]">
                                            <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                                            <p className="text-[9px] text-muted-foreground font-medium truncate">
                                                {drawer.details.backupGudang}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-[9px] text-muted-foreground uppercase leading-none mb-1">Stok</p>
                                <p className="text-[10px] font-bold text-blue-600">{drawer.details.stock} pcs</p>
                            </div>
                        </div>
                        {drawerNotes?.[drawer.code] && (
                            <div className="pt-2 mt-2 border-t border-gray-100">
                                <p className="text-[9px] text-muted-foreground uppercase leading-none mb-1">Keterangan</p>
                                <p className="text-[10px] text-foreground font-medium italic line-clamp-2">
                                    "{drawerNotes[drawer.code]}"
                                </p>
                            </div>
                        )}
                    </div>
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

export default function StoreRackManager({ userRole }: { userRole?: string }) {
    const isAdmin = ['ADMIN', 'HRD'].includes(userRole || '')
    const [racks, setRacks] = useState<RackWithDrawers[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [createMode, setCreateMode] = useState<'sequential' | 'grid'>('sequential')
    const [formData, setFormData] = useState({ name: '', drawerCount: 0, description: '', rows: 0, cols: 0 })
    const [selectedRack, setSelectedRack] = useState<RackWithDrawers | null>(null)
    const [selectedDrawerCode, setSelectedDrawerCode] = useState<string | null>(null)
    const [isUpdatingColor, setIsUpdatingColor] = useState(false)
    const { showConfirmation } = useConfirmation()
    const { showError, showAlert } = useAlert()

    useEffect(() => {
        loadRacks()
    }, [])

    async function loadRacks(silent = false) {
        if (!silent) setIsLoading(true)
        try {
            const data = await getStoreRacksWithDetails()
            setRacks(data as any)
        } catch (error) {
            showError('Failed to load racks')
        } finally {
            if (!silent) setIsLoading(false)
        }
    }

    async function handleAdd() {
        if (!formData.name.trim()) return showError('Nama rak harus diisi')

        let finalDrawerCount = formData.drawerCount
        if (createMode === 'grid') {
            finalDrawerCount = (formData.rows || 0) * (formData.cols || 0)
        }

        if (finalDrawerCount <= 0) return showError('Jumlah laci harus lebih dari 0')

        try {
            await createStoreRack({
                name: formData.name.trim(),
                drawerCount: finalDrawerCount,
                rows: createMode === 'grid' ? formData.rows : undefined,
                cols: createMode === 'grid' ? formData.cols : undefined,
                description: formData.description.trim() || undefined
            })
            showAlert('Rak berhasil ditambahkan')
            setFormData({ name: '', drawerCount: 0, description: '', rows: 0, cols: 0 })
            setIsAdding(false)
            loadRacks()
        } catch (error) {
            showError('Gagal menambahkan rak')
        }
    }

    async function handleUpdate() {
        if (!editingId || !formData.name.trim()) return showError('Nama rak harus diisi')

        let finalDrawerCount = formData.drawerCount
        if (createMode === 'grid') {
            finalDrawerCount = (formData.rows || 0) * (formData.cols || 0)
        }

        if (finalDrawerCount <= 0) return showError('Jumlah laci harus lebih dari 0')

        try {
            await updateStoreRack(editingId, {
                name: formData.name.trim(),
                drawerCount: finalDrawerCount,
                rows: createMode === 'grid' ? formData.rows : undefined,
                cols: createMode === 'grid' ? formData.cols : undefined,
                description: formData.description.trim()
            })
            showAlert('Rak berhasil diperbarui')
            setEditingId(null)
            setFormData({ name: '', drawerCount: 0, description: '', rows: 0, cols: 0 })
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
                    await deleteStoreRack(id)
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
        setFormData({
            name: rack.name,
            drawerCount: rack.drawerCount,
            description: rack.description || '',
            rows: (rack as any).rows || 0,
            cols: (rack as any).cols || 0
        })
        setCreateMode((rack as any).rows && (rack as any).cols ? 'grid' : 'sequential')
        setIsAdding(false)
    }

    return (
        <TableWrapper>
            <TableHeaderContent
                title="Rak Store Management"
                description="Mapping produk store menggunakan SKU (Contoh: RAK-A-01)"
                icon={<Warehouse className="w-5 h-5" />}
                actions={
                    isAdmin && !isAdding && !editingId && (
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={async () => {
                                    try {
                                        const racks = await exportStoreRacks()
                                        const exportData = racks.map((rack: any) => ({
                                            'Rack Name': rack.name,
                                            'Drawer Count': rack.drawerCount,
                                            'Rows': rack.rows || '',
                                            'Cols': rack.cols || '',
                                            'Description': rack.description || '',
                                            'Drawer Colors (JSON)': JSON.stringify(rack.drawerColors || {}),
                                            'Drawer Notes (JSON)': JSON.stringify(rack.drawerNotes || {}),
                                            'Drawer Note Colors (JSON)': JSON.stringify(rack.drawerNoteColors || {})
                                        }))

                                        const ws = XLSX.utils.json_to_sheet(exportData)
                                        const wb = XLSX.utils.book_new()
                                        XLSX.utils.book_append_sheet(wb, ws, 'StoreRacks')
                                        XLSX.writeFile(wb, `store-racks-export-${new Date().toISOString().split('T')[0]}.xlsx`)

                                        showAlert('Data rak berhasil dieksport ke Excel')
                                    } catch (error) {
                                        showError('Gagal mengeksport data ke Excel')
                                    }
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10 rounded-lg transition-colors border border-border h-10 w-10 sm:w-10"
                                title="Export Excel"
                            >
                                <Download className="w-4 h-4" />
                                <span className="sm:hidden ml-2 font-bold text-xs uppercase">Export Excel</span>
                            </button>
                            <ImportRackModal onSuccess={loadRacks} />
                            <button
                                onClick={() => {
                                    setIsAdding(true);
                                    setFormData({ name: '', drawerCount: 0, description: '', rows: 0, cols: 0 });
                                    setCreateMode('sequential');
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 h-10 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="uppercase">Tambah Rak</span>
                            </button>
                        </div>
                    )
                }
            />

            <div className="divide-y divide-border">
                {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </div>
                ) : racks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Belum ada data rack.
                    </div>
                ) : (
                    racks.map(rack => {
                        return (
                            <div key={rack.id} className="p-4 hover:bg-accent/50 transition-colors group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="group/header">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-lg transition-colors">
                                                {rack.name}
                                            </h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {rack.drawerCount} laci
                                            {rack.rows && rack.cols && ` (${rack.rows} baris x ${rack.cols} kolom)`}
                                            • {rack.description || '-'}
                                        </p>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity border-l pl-2 border-border/50 ml-2">
                                            <button onClick={() => startEdit(rack)} className="p-2 text-blue-600 hover:bg-blue-600/10 rounded-lg transition-colors border border-blue-600/20 shadow-sm">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(rack.id, rack.name)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border shadow-sm">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-lg p-3 flex flex-wrap gap-1.5 min-h-[50px]">
                                    {rack.allDrawers.map(drawer => (
                                        <DrawerItem
                                            key={drawer.code}
                                            drawer={drawer}
                                            drawerColors={rack.drawerColors}
                                            drawerNotes={rack.drawerNotes}
                                            drawerNoteColors={rack.drawerNoteColors}
                                            onClick={() => {
                                                setSelectedRack(rack)
                                                setSelectedDrawerCode(drawer.code)
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <Modal
                isOpen={isAdding || !!editingId}
                onClose={() => { setEditingId(null); setIsAdding(false); }}
                title={
                    <div className="flex items-center gap-2">
                        <Warehouse className="w-5 h-5 text-blue-600" />
                        <span>{isAdding ? 'Tambah Rak Baru' : 'Edit Rak'}</span>
                    </div>
                }
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg font-medium">Batal</button>
                        <button onClick={isAdding ? handleAdd : handleUpdate} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">Simpan Rak</button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="flex bg-muted p-1 rounded-xl">
                        <button
                            onClick={() => setCreateMode('grid')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                createMode === 'grid' ? "bg-background text-blue-600 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Baris dan Kolom
                        </button>
                        <button
                            onClick={() => setCreateMode('sequential')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                createMode === 'sequential' ? "bg-background text-blue-600 shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Berurutan
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Nama Rak</label>
                            <input
                                type="text"
                                placeholder="Contoh: RAK-A"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                            />
                        </div>

                        {createMode === 'sequential' ? (
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Jumlah Laci</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formData.drawerCount || ''}
                                    onChange={e => setFormData({ ...formData, drawerCount: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Jumlah Baris</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.rows || ''}
                                        onChange={e => setFormData({ ...formData, rows: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Jumlah Kolom</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.cols || ''}
                                        onChange={e => setFormData({ ...formData, cols: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">Keterangan</label>
                            <textarea
                                placeholder="Opsional: Keterangan rak..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none min-h-[100px] transition-all resize-none"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            <RackDetailsModal
                rack={selectedRack}
                drawerCode={selectedDrawerCode}
                isOpen={!!selectedRack && !!selectedDrawerCode}
                onClose={() => {
                    setSelectedRack(null)
                    setSelectedDrawerCode(null)
                }}
                onSave={async (color, notes, noteColor) => {
                    if (!selectedRack || !selectedDrawerCode) return
                    setIsUpdatingColor(true)
                    try {
                        const newDrawerColors = {
                            ...(selectedRack.drawerColors as any || {}),
                            [selectedDrawerCode]: color
                        }
                        const newDrawerNotes = {
                            ...(selectedRack.drawerNotes as any || {}),
                            [selectedDrawerCode]: notes
                        }
                        const newDrawerNoteColors = {
                            ...(selectedRack.drawerNoteColors as any || {}),
                            [selectedDrawerCode]: noteColor
                        }

                        await updateStoreRack(selectedRack.id, {
                            name: selectedRack.name,
                            drawerCount: selectedRack.drawerCount,
                            rows: selectedRack.rows || undefined,
                            cols: selectedRack.cols || undefined,
                            description: selectedRack.description || undefined,
                            drawerColors: newDrawerColors,
                            drawerNotes: newDrawerNotes,
                            drawerNoteColors: newDrawerNoteColors
                        } as any)

                        loadRacks(true)
                        showAlert('Data laci berhasil disimpan')
                        setSelectedRack(null)
                        setSelectedDrawerCode(null)
                    } catch (error) {
                        showError('Gagal menyimpan data laci')
                    } finally {
                        setIsUpdatingColor(false)
                    }
                }}
                onRefresh={loadRacks}
                isLoading={isUpdatingColor}
            />
        </TableWrapper>
    )
}

interface RackDetailsModalProps {
    rack: RackWithDrawers | null
    drawerCode: string | null
    isOpen: boolean
    onClose: () => void
    onSave: (color: string, notes: string, noteColor: string) => Promise<void>
    onRefresh: () => void
    isLoading: boolean
}

function RackDetailsModal({ rack, drawerCode, isOpen, onClose, onSave, onRefresh, isLoading }: RackDetailsModalProps) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [notes, setNotes] = useState('')
    const [color, setColor] = useState('')
    const [noteColor, setNoteColor] = useState('green')
    const { showError, showAlert } = useAlert()

    useEffect(() => {
        if (rack && drawerCode) {
            setNotes(rack.drawerNotes?.[drawerCode] || '')
            setColor(rack.drawerColors?.[drawerCode] || '')
            setNoteColor(rack.drawerNoteColors?.[drawerCode] || 'green')
        }
    }, [rack, drawerCode, isOpen])

    if (!rack || !drawerCode) return null

    const drawer = rack.allDrawers.find(d => d.code === drawerCode)
    const currentColorTemplate = RACK_COLORS.find(c => c.value === color) || null

    const handleSync = async () => {
        if (!drawer?.details?.sku) return
        setIsSyncing(true)
        try {
            await getStoreProductBySku(drawer.details.sku)
            showAlert('Data sudah diperbarui sesuai dengan data di Woocomerce')
            onRefresh()
        } catch (error) {
            showError('Gagal sinkronisasi data')
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-colors", currentColorTemplate ? currentColorTemplate.active : "bg-muted")}>
                        <Warehouse className={cn("w-5 h-5", currentColorTemplate ? "text-white" : "text-foreground")} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Laci {drawerCode}</h3>
                        <p className="text-xs text-muted-foreground font-normal">Rak {rack.name} • Kustomisasi Laci</p>
                    </div>
                </div>
            }
            maxWidth="md"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-lg font-medium"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => onSave(color, notes, noteColor)}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : null}
                        Simpan Laci
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Color Selector */}
                <div className="bg-muted/30 border border-border rounded-xl p-4">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Warna Laci</label>
                    <div className="flex flex-wrap gap-2.5">
                        {RACK_COLORS.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => setColor(c.value)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm",
                                    color === c.value
                                        ? cn(c.active, "text-white border-transparent")
                                        : "bg-background text-foreground border-border hover:border-muted-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-3 h-3 rounded-full border border-white/20 shadow-inner",
                                    c.active,
                                    color === c.value ? "bg-white" : c.active
                                )} />
                                {c.name}
                            </button>
                        ))}
                        {color && (
                            <button
                                onClick={() => setColor('')}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-dashed border-border text-muted-foreground hover:bg-muted"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Keterangan Field */}
                <div className="group/notes bg-muted/30 border border-border rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Keterangan Laci</label>
                        {notes && (
                            <button
                                onClick={() => setNotes('')}
                                className="opacity-0 group-hover/notes:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                                title="Hapus keterangan"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Note Color Picker */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] text-muted-foreground font-medium mr-1">Warna Penanda:</span>
                        <div className="flex gap-2">
                            {NOTE_COLORS.map((c) => {
                                const isSelected = noteColor === c.value
                                return (
                                    <button
                                        key={c.value}
                                        onClick={() => setNoteColor(c.value)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold transition-all border",
                                            isSelected
                                                ? cn(c.active, "text-white border-transparent shadow-sm")
                                                : "bg-background text-foreground border-border hover:border-muted-foreground"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            isSelected ? "bg-white" : c.active
                                        )} />
                                        {c.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Tuliskan keterangan tambahan untuk laci ini..."
                        className="w-full min-h-[80px] bg-background border border-border rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                </div>

                {/* Product Detail */}
                <div className="bg-background border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 border-b border-border">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Produk di Laci Ini</label>
                    </div>

                    {drawer?.isUsed && drawer.details ? (
                        <div className="p-4">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted flex-shrink-0 shadow-sm">
                                    {drawer.details.image ? (
                                        <img src={drawer.details.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-bold text-sm leading-tight">{drawer.details.name}</h4>
                                        <button
                                            onClick={handleSync}
                                            disabled={isSyncing}
                                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-600 transition-all border border-transparent hover:border-border disabled:opacity-50"
                                            title="Sync data dari WooCommerce"
                                        >
                                            <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">sync</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <p className="text-xs text-muted-foreground font-medium">SKU: {drawer.details.sku}</p>
                                        {drawer.details.backupGudang && (
                                            <>
                                                <div className="w-1 h-1 rounded-full bg-border" />
                                                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {drawer.details.backupGudang}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-bold text-[10px]">
                                        Stok: {drawer.details.stock} pcs
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-muted/5">
                            <Box className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground px-4">Tidak ada produk yang dipetakan pada laci ini.</p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
