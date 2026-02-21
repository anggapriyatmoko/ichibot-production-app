'use client'

import React from 'react'
import Image from 'next/image'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableWrapper,
    TableScrollArea,
    TableEmpty,
    TableHeaderContent,
    TablePagination
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, AlertCircle, Pencil, Banknote, List, Check, X, Search, FileText, FileDown, Tag } from 'lucide-react'
import { deletePriceListItem, updatePriceListGroup, deletePriceListGroup } from '@/app/actions/price-list'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/hooks/use-alert'
import { useConfirmation } from '@/components/providers/modal-provider'
import PriceListItemForm from './price-list-item-form'
import { SimpleWysiwygDisplay } from '@/components/ui/simple-wysiwyg'
import { Input } from '@/components/ui/input'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { generateProductPdf, generatePriceListPdf } from './generate-pdf'
import PriceListItemPdfModal from './pdf-preview-modal'
import PriceListGroupPdfModal from './pdf-group-preview-modal'

function formatRupiah(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount)
}

interface PriceListTableProps {
    group: any
}

export default function PriceListTable({ group }: PriceListTableProps) {
    const items = group.items
    const existingCategories = group.categories || []
    const router = useRouter()
    const { showAlert, showError } = useAlert()
    const { showConfirmation } = useConfirmation()

    // Search State
    const [searchQuery, setSearchQuery] = useState('')

    // PDF Preview State
    const [previewItem, setPreviewItem] = useState<any>(null)
    const [showGroupPreview, setShowGroupPreview] = useState(false)

    // Group Edit State
    const [isEditingGroup, setIsEditingGroup] = useState(false)
    const [groupName, setGroupName] = useState(group.name)
    const [loadingGroup, setLoadingGroup] = useState(false)

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)

    // Reset page when search changes
    React.useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    // Filter Items
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items

        const terms = searchQuery.toLowerCase().split(' ').filter(Boolean)

        return items.filter((item: any) => {
            const searchContent = `
                ${item.name} 
                ${item.description || ''} 
                ${item.price} 
                ${item.quantity || ''}
            `.toLowerCase()

            return terms.every((term: string) => searchContent.includes(term))
        })
    }, [items, searchQuery])

    // Sort Items based on category order (including virtual uncategorized)
    const sortedItems = useMemo(() => {
        if (!filteredItems) return []

        const categoryOrder = new Map<string | null, number>()

        // Add real categories
        existingCategories.forEach((cat: any) => {
            categoryOrder.set(cat.id, cat.order)
        })

        // Add virtual uncategorized order
        // items with categoryId: null should use this order
        categoryOrder.set(null, group.uncategorizedOrder ?? 0)

        return [...filteredItems].sort((a: any, b: any) => {
            const orderA = categoryOrder.get(a.categoryId) ?? 9999
            const orderB = categoryOrder.get(b.categoryId) ?? 9999

            if (orderA !== orderB) {
                return orderA - orderB
            }

            // Secondary sort: Price
            return a.price - b.price
        })
    }, [filteredItems, existingCategories, group.uncategorizedOrder])

    const handleUpdateGroup = async () => {
        if (!groupName.trim()) return
        if (groupName === group.name) {
            setIsEditingGroup(false)
            return
        }

        setLoadingGroup(true)
        const res = await updatePriceListGroup(group.id, groupName)
        setLoadingGroup(false)

        if (res.error) {
            showError(res.error)
        } else {
            setIsEditingGroup(false)
            router.refresh()
            showAlert('Nama grup diperbarui', 'Berhasil')
        }
    }

    const handleDeleteGroup = async () => {
        showConfirmation({
            title: 'Hapus Grup?',
            message: `Tindakan ini akan menghapus grup "${group.name}" beserta semua item di dalamnya. Data yang dihapus tidak dapat dikembalikan.`,
            type: 'confirm',
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            action: async () => {
                const res = await deletePriceListGroup(group.id)
                if (res.error) {
                    showError(res.error)
                } else {
                    router.refresh()
                    showAlert('Grup berhasil dihapus', 'Berhasil')
                }
            }
        })
    }

    const handleDeleteItem = async (id: string, name: string) => {
        showConfirmation({
            title: 'Hapus Item?',
            message: `Hapus "${name}" dari daftar? Tindakan ini tidak dapat dibatalkan.`,
            type: 'confirm',
            confirmLabel: 'Hapus',
            cancelLabel: 'Batal',
            action: async () => {
                const res = await deletePriceListItem(id)
                if (res.error) {
                    showError(res.error)
                } else {
                    router.refresh()
                    showAlert('Item berhasil dihapus', 'Berhasil')
                }
            }
        })
    }

    const GroupTitle = () => {
        if (isEditingGroup) {
            return (
                <div className="flex items-center gap-2 max-w-md">
                    <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        autoFocus
                        className="h-8 font-sans"
                    />
                    <Button size="icon" variant="ghost" onClick={handleUpdateGroup} disabled={loadingGroup} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                        <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingGroup(false); setGroupName(group.name) }} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => setIsEditingGroup(true)}>
                <span>{group.name}</span>
                <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity" />
            </div>
        )
    }

    // Pagination Logic
    const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
    const paginatedItems = sortedItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )



    return (
        <TableWrapper>
            <PriceListItemPdfModal
                isOpen={!!previewItem}
                onClose={() => setPreviewItem(null)}
                item={previewItem}
            />

            <PriceListGroupPdfModal
                isOpen={showGroupPreview}
                onClose={() => setShowGroupPreview(false)}
                group={group}
                items={sortedItems}
            />

            <TableHeaderContent
                title={<GroupTitle />}
                description={`${items.length} Item terdaftar dalam grup ini`}
                icon={<Banknote className="w-5 h-5" />}
                actions={
                    <div className="flex items-center gap-2">
                        <div className="relative w-40 sm:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari item..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 font-sans"
                            />
                        </div>
                        <div className="w-px h-6 bg-border mx-1" />

                        <Button
                            variant="outline"
                            size="icon"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                            onClick={() => setShowGroupPreview(true)}
                            title="Preview Daftar Harga (PDF)"
                        >
                            <FileDown className="w-4 h-4" />
                        </Button>

                        <PriceListItemForm
                            groupId={group.id}
                            existingCategories={existingCategories}
                            uncategorizedOrder={group.uncategorizedOrder ?? 0}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={handleDeleteGroup}
                            title="Hapus Grup"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                }
            />

            <TableScrollArea>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Foto</TableHead>
                            <TableHead className="w-[350px]">Nama Barang/Jasa</TableHead>
                            <TableHead className="w-[100px]">Qty</TableHead>
                            <TableHead className="w-[150px]">Harga</TableHead>
                            <TableHead className="min-w-[200px]">Keterangan</TableHead>
                            <TableHead className="w-[100px] text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableEmpty colSpan={6} message={searchQuery ? "Tidak ada item yang cocok dengan pencarian" : "Belum ada item di grup ini"} icon={searchQuery ? <Search className="w-10 h-10 text-muted-foreground/50 mb-2" /> : <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-2" />} />
                        ) : (
                            paginatedItems.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell className="align-top py-4">
                                        {item.image ? (
                                            <div className="relative w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400">
                                                <AlertCircle className="w-6 h-6" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium align-top py-4">
                                        <div>
                                            {item.name}
                                        </div>
                                        {item.shortDescription && (
                                            <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                                <SimpleWysiwygDisplay
                                                    content={item.shortDescription}
                                                    className="[&_p]:inline [&_p]:mr-1 [&_div]:inline [&_div]:mr-1 [&_br]:hidden"
                                                />
                                            </div>
                                        )}
                                        <div className="mt-1 flex items-center">
                                            <Tag className="w-3 h-3 mr-1 text-muted-foreground/70" />
                                            <span className="text-[10px] text-muted-foreground">
                                                {item.categoryRel?.name || 'Tanpa Kategori'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top py-4 text-muted-foreground">
                                        {item.prices && item.prices.length > 0
                                            ? item.prices[0]?.qty || item.quantity || '-'
                                            : item.quantity || '-'}
                                    </TableCell>
                                    <TableCell className="align-top py-4 font-medium">
                                        {item.prices && item.prices.length > 0 ? (
                                            <div className="flex flex-col gap-2">
                                                {item.prices.map((p: any, pi: number) => (
                                                    <div key={pi} className="flex flex-col">
                                                        {item.prices.length > 1 && (
                                                            <span className="text-[10px] text-muted-foreground font-normal mb-0.5">
                                                                {p.label}
                                                                {p.qty ? ` · ${p.qty}` : ''}
                                                            </span>
                                                        )}
                                                        {p.discount > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-blue-600 font-bold text-sm">{formatRupiah(p.discount)}</span>
                                                                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
                                                                    {Math.round((1 - p.discount / p.price) * 100)}%
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground line-through decoration-red-400">
                                                                    {formatRupiah(p.price)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm">{formatRupiah(p.price)}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : item.discount > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-blue-600 font-bold">{formatRupiah(item.discount)}</span>
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                                                        {Math.round((1 - item.discount / item.price) * 100)}%
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground line-through decoration-red-400">
                                                    {formatRupiah(item.price)}
                                                </span>
                                            </div>
                                        ) : (
                                            formatRupiah(item.price)
                                        )}
                                    </TableCell>
                                    <TableCell className="align-top py-4 min-w-[200px] text-muted-foreground text-sm">
                                        {item.description ? (
                                            <div className="line-clamp-2 overflow-hidden text-ellipsis">
                                                <SimpleWysiwygDisplay
                                                    content={item.description}
                                                    className="[&_p]:inline [&_p]:mr-1 [&_div]:inline [&_div]:mr-1 [&_br]:hidden"
                                                />
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right align-top py-4">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => setPreviewItem(item)}
                                                title="Preview PDF Detail"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </Button>

                                            <PriceListItemForm
                                                item={item}
                                                existingCategories={existingCategories}
                                                uncategorizedOrder={group.uncategorizedOrder ?? 0}
                                            />

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleDeleteItem(item.id, item.name)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableScrollArea>

            <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                totalCount={filteredItems.length}
            />
        </TableWrapper>
    )
}
