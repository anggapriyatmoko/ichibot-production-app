'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { reorderPriceListCategories, deletePriceListCategory } from '@/app/actions/price-list'
import { useAlert } from '@/hooks/use-alert'

import Modal from '@/components/ui/modal'

import { useRouter } from 'next/navigation'

interface CategoryManagerProps {
    groupId: string
    categories: any[] // PriceListCategory[]
    onDelete?: (name: string) => void
    uncategorizedOrder?: number
}

export default function CategoryManager({ groupId, categories, onDelete, uncategorizedOrder = 0 }: CategoryManagerProps) {
    const router = useRouter()
    const { showAlert, showError } = useAlert()
    const [loading, setLoading] = useState(false)
    const [optimisticCategories, setOptimisticCategories] = useState<any[]>([])
    const [itemToDelete, setItemToDelete] = useState<{ id: string, name: string } | null>(null)

    // Sync with props
    useEffect(() => {
        let newCats = [...categories]

        // Add virtual category
        const virtualCat = {
            id: 'uncategorized',
            name: 'Tanpa Kategori',
            order: uncategorizedOrder
        }

        // Merge and sort
        // We need to insert the virtual category at the correct position if it's not already there
        // But since we are receiving 'categories' which are real categories with their own 'order'
        // we can just push the virtual one and sort by order.

        const allCats = [...newCats, virtualCat]
        allCats.sort((a, b) => a.order - b.order)

        setOptimisticCategories(allCats)
    }, [categories, uncategorizedOrder])

    const handleReorder = async (currentIndex: number, direction: 'up' | 'down') => {
        if (loading) return
        if (direction === 'up' && currentIndex === 0) return
        if (direction === 'down' && currentIndex === optimisticCategories.length - 1) return

        const newCategories = [...optimisticCategories]
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

        // Swap
        const temp = newCategories[currentIndex]
        newCategories[currentIndex] = newCategories[swapIndex]
        newCategories[swapIndex] = temp

        setOptimisticCategories(newCategories)
        setLoading(true)

        // Send IDs including 'uncategorized'
        const orderedIds = newCategories.map(c => c.id)
        const res = await reorderPriceListCategories(groupId, orderedIds)

        if (res.error) {
            showError(res.error)
            // Re-sync on error (reverting to props)
            let newCats = [...categories]
            const virtualCat = { id: 'uncategorized', name: 'Tanpa Kategori', order: uncategorizedOrder }
            const allCats = [...newCats, virtualCat].sort((a, b) => a.order - b.order)
            setOptimisticCategories(allCats)
        } else {
            // Force refresh to ensure props catch up with server state
            router.refresh()
        }
        setLoading(false)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return

        if (itemToDelete.id === 'uncategorized') {
            showError('Kategori bawaan tidak dapat dihapus')
            setItemToDelete(null)
            return
        }

        setLoading(true)
        const res = await deletePriceListCategory(itemToDelete.id)
        if (res.error) {
            showError(res.error)
        } else {
            showAlert('Kategori dihapus', 'Berhasil')
            if (onDelete) onDelete(itemToDelete.name)
        }
        setLoading(false)
        setItemToDelete(null)
    }

    return (
        <div className="mt-4">
            <h4 className="text-sm font-medium mb-3">Urutan Kategori</h4>
            <div className="space-y-2">
                {optimisticCategories.map((cat, index) => (
                    <div key={cat.id} className="flex items-center justify-between bg-blue-500/10 p-2 rounded text-sm">
                        <span className={`font-medium ${cat.id === 'uncategorized' ? 'italic' : ''}`}>
                            {cat.name}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${index === 0 ? 'text-muted-foreground opacity-30 cursor-not-allowed' : ''}`}
                                onClick={() => handleReorder(index, 'up')}
                                disabled={index === 0 || loading}
                            >
                                <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${index === optimisticCategories.length - 1 ? 'text-muted-foreground opacity-30 cursor-not-allowed' : ''}`}
                                onClick={() => handleReorder(index, 'down')}
                                disabled={index === optimisticCategories.length - 1 || loading}
                            >
                                <ArrowDown className="w-3 h-3" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 text-destructive hover:text-destructive ${cat.id === 'uncategorized' ? 'invisible' : ''}`}
                                onClick={() => setItemToDelete({ id: cat.id, name: cat.name })}
                                disabled={loading || cat.id === 'uncategorized'}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {optimisticCategories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                    Belum ada kategori
                </p>
            )}

            <p className="text-[10px] text-muted-foreground mt-2">
                * Urutan ini akan digunakan di Tabel dan PDF
            </p>

            <Modal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                title="Hapus Kategori"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setItemToDelete(null)} disabled={loading}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={loading}
                        >
                            {loading ? 'Menghapus...' : 'Hapus'}
                        </Button>
                    </div>
                }
            >
                <div className="py-4">
                    <p>Apakah Anda yakin ingin menghapus kategori <strong>"{itemToDelete?.name}"</strong>?</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Item yang menggunakan kategori ini akan menjadi "Tanpa Kategori".
                    </p>
                </div>
            </Modal>
        </div>
    )
}
