'use client'

import { useState, useEffect } from 'react'
import { Edit2, Loader2, X, MessageSquare, Save } from 'lucide-react'
import { updateStoreProductKeterangan } from '@/app/actions/store-product'
import { cn } from '@/lib/utils'

export default function KeteranganEdit({
    wcId,
    initialValue,
    productName,
    compact = false
}: {
    wcId: number,
    initialValue: string | null,
    productName: string,
    compact?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [value, setValue] = useState(initialValue || '')
    const [isSaving, setIsSaving] = useState(false)

    // Sync state with prop
    useEffect(() => {
        setValue(initialValue || '')
    }, [initialValue])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await updateStoreProductKeterangan(wcId, value)
            if (result.success) {
                setIsOpen(false)
            }
        } catch (error) {
            console.error('Failed to save keterangan:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const truncated = value.length > 30 ? value.slice(0, 30) + '...' : value

    return (
        <div className="relative">
            {compact ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-left text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer truncate w-full block"
                    title={value || 'Tambah keterangan...'}
                >
                    {value ? value : <span className="italic opacity-50">+ keterangan</span>}
                </button>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group flex items-start gap-2 text-left hover:bg-black/5 dark:hover:bg-white/5 p-1 -m-1 rounded transition-colors w-full min-h-[1.5rem]"
                    title="Edit Keterangan"
                >
                    {value ? (
                        <span className="text-xs text-muted-foreground line-clamp-2 break-all">{value}</span>
                    ) : (
                        <span className="text-[10px] text-muted-foreground/30 italic group-hover:text-primary transition-colors">Tambah keterangan...</span>
                    )}
                    <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5" />
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Edit Keterangan</h3>
                                    <p className="text-xs text-muted-foreground max-w-[280px] truncate">{productName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-muted rounded-full transition-all group"
                            >
                                <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                            </button>
                        </div>

                        <div className="p-5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                                Keterangan Produk
                            </label>
                            <textarea
                                autoFocus
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder="Tuliskan keterangan tambahan untuk produk ini..."
                                className="w-full h-40 p-4 bg-muted/20 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none font-medium leading-relaxed"
                            />
                        </div>

                        <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-sm font-bold text-muted-foreground px-5 py-2.5 hover:bg-muted rounded-xl transition-all active:scale-95"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary text-primary-foreground text-sm font-bold px-8 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isSaving ? "Menyimpan..." : "Simpan Keterangan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
