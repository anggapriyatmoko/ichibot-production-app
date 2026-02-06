'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { getStoreSuppliers } from '@/app/actions/store-supplier'
import { updateStoreProductName } from '@/app/actions/store-product'
import { cn } from '@/lib/utils'

export default function SupplierPicker({
    wcId,
    initialValue
}: {
    wcId: number,
    initialValue: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [selectedNames, setSelectedNames] = useState<string[]>(
        initialValue ? initialValue.split(',').map(s => s.trim()).filter(Boolean) : []
    )
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Sync state with prop if prop changes (e.g. after successful save or from outside)
    useEffect(() => {
        setSelectedNames(initialValue ? initialValue.split(',').map(s => s.trim()).filter(Boolean) : [])
    }, [initialValue])

    useEffect(() => {
        if (isOpen) {
            fetchSuppliers()
        }
    }, [isOpen])

    const fetchSuppliers = async () => {
        setIsLoading(true)
        try {
            const data = await getStoreSuppliers()
            setSuppliers(data)
        } catch (error) {
            console.error('Failed to fetch suppliers:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleSupplier = (name: string) => {
        setSelectedNames(prev =>
            prev.includes(name)
                ? prev.filter(n => n !== name)
                : [...prev, name]
        )
    }

    const handleSave = async () => {
        const newValue = selectedNames.join(', ')
        if (newValue === initialValue) {
            setIsOpen(false)
            return
        }

        setIsSaving(true)
        try {
            const result = await updateStoreProductName(wcId, newValue)
            if (result.success) {
                setIsOpen(false)
            }
        } catch (error) {
            console.error('Failed to save supplier picker:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left transition-all hover:opacity-80 flex items-center gap-2 min-h-[32px] group"
                title="Pilih Supplier"
            >
                <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                    {selectedNames.length > 0 ? (
                        selectedNames.map(name => (
                            <span key={name} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap">
                                {name}
                            </span>
                        ))
                    ) : (
                        <span className="text-muted-foreground/40 italic text-xs group-hover:text-primary transition-colors">Pilih supplier...</span>
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-popover border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <div>
                                <h3 className="font-semibold text-foreground">Pilih Supplier</h3>
                                <p className="text-xs text-muted-foreground">Pilih satu atau beberapa supplier untuk produk ini.</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-accent rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                                <span className="sr-only">Tutup</span>
                            </button>
                        </div>

                        <div className="p-3 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Cari supplier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                            {isLoading ? (
                                <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground italic text-sm">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span>Memuat supplier...</span>
                                </div>
                            ) : filteredSuppliers.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1">
                                    {filteredSuppliers.map((supplier) => (
                                        <button
                                            key={supplier.id}
                                            onClick={() => toggleSupplier(supplier.name)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left group",
                                                selectedNames.includes(supplier.name)
                                                    ? "bg-primary/5 text-primary border border-primary/20 shadow-sm"
                                                    : "hover:bg-accent text-muted-foreground hover:text-foreground border border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded border border-border flex items-center justify-center transition-all flex-shrink-0",
                                                selectedNames.includes(supplier.name) && "bg-primary border-primary shadow-sm"
                                            )}>
                                                {selectedNames.includes(supplier.name) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                            </div>
                                            <span className="font-medium flex-1">{supplier.name}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground text-sm italic">
                                    {searchTerm ? "Supplier tidak ditemukan." : "Belum ada data supplier."}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-4">
                            <button
                                onClick={() => setSelectedNames([])}
                                className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg hover:bg-destructive/10"
                            >
                                Reset Pilihan
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-sm font-medium text-muted-foreground px-4 py-2 hover:bg-accent rounded-lg transition-colors border border-transparent hover:border-border"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground text-sm font-bold px-6 py-2 rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Perubahan"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
