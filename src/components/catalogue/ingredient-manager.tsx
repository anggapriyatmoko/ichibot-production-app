'use client'

import { useState } from 'react'
import { addIngredient, removeIngredient, createSection, deleteSection, updateSection, renameUncategorizedSection } from '@/app/actions/recipe'
import { Plus, Trash2, Search, Package, FolderPlus, Folder, Edit2, Check, X, Printer } from 'lucide-react'
import Image from 'next/image'
import { useConfirmation } from '@/components/providers/modal-provider'

type Ingredient = {
    id: string
    quantity: number
    notes: string | null
    sectionId: string | null
    product: {
        id: string
        name: string
        stock: number
        image: string | null
        sku: string
    }
}

type Section = {
    id: string
    name: string
}

type Product = {
    id: string
    name: string
    stock: number
    image: string | null
    sku: string
}

export default function IngredientManager({
    recipeId,
    recipeName,
    initialIngredients,
    initialSections,
    allProducts
}: {
    recipeId: string,
    recipeName: string,
    initialIngredients: Ingredient[],
    initialSections: Section[],
    allProducts: Product[]
}) {
    // Grouping Logic
    const sections = initialSections
    const ingredientsBySection = initialIngredients.reduce((acc, ing) => {
        const key = ing.sectionId || 'uncategorized'
        if (!acc[key]) acc[key] = []
        acc[key].push(ing)
        return acc
    }, {} as Record<string, Ingredient[]>)

    // Aggregation Logic for Summary Table
    const aggregatedIngredients = Object.values(
        initialIngredients.reduce((acc, ing) => {
            if (!acc[ing.product.id]) {
                acc[ing.product.id] = {
                    ...ing,
                    quantity: 0,
                    notes: ing.notes ? [ing.notes] : [],
                    sectionId: null // Not relevant for summary
                }
            } else {
                if (ing.notes && !acc[ing.product.id].notes.includes(ing.notes)) {
                    acc[ing.product.id].notes.push(ing.notes)
                }
            }
            acc[ing.product.id].quantity += ing.quantity
            return acc
        }, {} as Record<string, any>)
    ).map(ing => ({
        ...ing,
        notes: ing.notes.join(', ') || null
    })) as Ingredient[]

    const [isAddingIngredient, setIsAddingIngredient] = useState(false)
    const [isAddingSection, setIsAddingSection] = useState(false)
    const { showConfirmation } = useConfirmation()

    // Edit Section State
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
    const [editingUncategorized, setEditingUncategorized] = useState(false)

    const [activeSectionId, setActiveSectionId] = useState<string | null>(null) // null = uncategorized

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Handle product selection with duplicate check
    const handleProductSelect = (product: Product) => {
        const targetSectionId = activeSectionId // null if general/uncategorized

        const existing = initialIngredients.find(ing =>
            ing.product.id === product.id &&
            ing.sectionId === targetSectionId
        )

        if (existing) {
            showConfirmation({
                type: 'alert',
                title: 'Duplicate Item',
                message: `Item "${product.name}" is already in this section!`
            })
            return
        }

        setSelectedProduct(product)
    }

    async function handleAddIngredient(formData: FormData) {
        if (!selectedProduct) return

        setIsLoading(true)
        formData.append('productId', selectedProduct.id)
        if (activeSectionId) {
            formData.append('sectionId', activeSectionId)
        } else {
            formData.append('sectionId', 'null')
        }

        await addIngredient(recipeId, formData)
        setIsLoading(false)
        setIsAddingIngredient(false)
        setSelectedProduct(null)
        setSearchQuery('')
        setActiveSectionId(null)
    }

    async function handleCreateSection(formData: FormData) {
        setIsLoading(true)
        await createSection(recipeId, formData)
        setIsLoading(false)
        setIsAddingSection(false)
    }

    async function handleUpdateSection(formData: FormData) {
        if (!editingSectionId) return
        await updateSection(editingSectionId, recipeId, formData)
        setEditingSectionId(null)
    }

    async function handleRenameUncategorized(formData: FormData) {
        await renameUncategorizedSection(recipeId, formData)
        setEditingUncategorized(false)
    }

    async function handleRemoveIngredient(id: string) {
        showConfirmation({
            type: 'confirm',
            title: 'Remove Sparepart',
            message: 'Are you sure you want to remove this sparepart?',
            action: async () => {
                await removeIngredient(id, recipeId)
            }
        })
    }

    async function handleDeleteSection(id: string) {
        showConfirmation({
            type: 'confirm',
            title: 'Delete Section',
            message: 'Are you sure? ALL items in this folder will be deleted!',
            action: async () => {
                await deleteSection(id, recipeId)
            }
        })
    }

    const openAddModal = (sectionId: string | null) => {
        setActiveSectionId(sectionId)
        setIsAddingIngredient(true)
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="p-6 space-y-8">
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 20px;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-section {
                        page-break-inside: avoid;
                        margin-bottom: 30px;
                    }
                    .print-section table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .print-section th,
                    .print-section td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    .print-section h3 {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        color: #000;
                    }
                    .print-section h4 {
                        font-size: 14px;
                        font-weight: bold;
                        margin: 20px 0 10px 0;
                        color: #333;
                    }
                }
            `}</style>

            {/* BOM Header with PDF Button */}
            <div className="p-6 border-b border-border flex justify-between items-start no-print">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Bill of Materials (BOM)</h2>
                    <p className="text-sm text-muted-foreground">List of materials required to produce one unit.</p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                >
                    <Printer className="w-4 h-4" />
                    Download PDF / Print
                </button>
            </div>

            <div className="flex justify-between items-center no-print p-6">
                <h2 className="text-xl font-bold">Manage Sparepart</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddingSection(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors font-medium text-sm shadow-sm"
                    >
                        <FolderPlus className="w-4 h-4" />
                        New Folders/Section
                    </button>
                </div>
            </div>

            {/* Render Sections */}
            {sections.map(section => (
                <div key={section.id} className="border border-border rounded-xl overflow-hidden no-print print-section">
                    <div className="bg-muted/30 px-4 py-3 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-3">
                            <Folder className="w-4 h-4 text-blue-500" />
                            {editingSectionId === section.id ? (
                                <form action={handleUpdateSection} className="flex items-center gap-2">
                                    <input
                                        name="name"
                                        defaultValue={section.name}
                                        className="h-7 px-2 bg-background border border-border rounded text-sm focus:border-primary outline-none"
                                        autoFocus
                                    />
                                    <button type="submit" className="p-1 hover:bg-green-100 text-green-600 rounded"><Check className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => setEditingSectionId(null)} className="p-1 hover:bg-red-100 text-red-600 rounded"><X className="w-4 h-4" /></button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h3 className="font-bold text-foreground">{section.name}</h3>
                                    <button onClick={() => setEditingSectionId(section.id)} className="p-1 text-muted-foreground hover:text-primary transition-opacity">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => openAddModal(section.id)} className="text-xs flex items-center gap-1 text-primary hover:underline font-medium px-2 py-1">
                                <Plus className="w-3 h-3" /> Add Item
                            </button>
                            <button onClick={() => handleDeleteSection(section.id)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    <IngredientsTable
                        ingredients={ingredientsBySection[section.id] || []}
                        onRemove={handleRemoveIngredient}
                    />
                </div>
            ))}

            {/* Uncategorized / General Section */}
            {(ingredientsBySection['uncategorized']?.length > 0 || sections.length === 0) && (
                <div className="border border-border rounded-xl overflow-hidden no-print print-section">
                    <div className="bg-muted/30 px-4 py-3 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-2">
                            {editingUncategorized ? (
                                <form action={handleRenameUncategorized} className="flex items-center gap-2">
                                    <input
                                        name="name"
                                        defaultValue="Other Sparepart"
                                        className="h-7 px-2 bg-background border border-border rounded text-sm focus:border-primary outline-none"
                                        autoFocus
                                    />
                                    <button type="submit" className="p-1 hover:bg-green-100 text-green-600 rounded"><Check className="w-4 h-4" /></button>
                                    <button type="button" onClick={() => setEditingUncategorized(false)} className="p-1 hover:bg-red-100 text-red-600 rounded"><X className="w-4 h-4" /></button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Other Sparepart</h3>
                                    <button onClick={() => setEditingUncategorized(true)} className="p-1 text-muted-foreground hover:text-primary transition-opacity">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={() => openAddModal(null)} className="text-xs flex items-center gap-1 text-primary hover:underline font-medium px-2 py-1">
                            <Plus className="w-3 h-3" /> Add Item
                        </button>
                    </div>
                    <IngredientsTable
                        ingredients={ingredientsBySection['uncategorized'] || []}
                        onRemove={handleRemoveIngredient}
                    />
                </div>
            )}

            {/* SUMMARY TABLE (Always Visible) */}
            <div className="mt-12 pt-8 border-t border-border print-area">
                <h3 className="text-xl font-bold text-foreground mb-4">Bill of Materials (BOM) - {recipeName}</h3>

                {/* Print: Section Tables */}
                <div className="hidden print:block print-section">
                    {sections.map(section => (
                        <div key={section.id} className="mb-8">
                            <h4 className="font-bold text-lg mb-3">{section.name}</h4>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 border">SKU</th>
                                        <th className="px-4 py-3 border">Item</th>
                                        <th className="px-4 py-3 border">Quantity</th>
                                        <th className="px-4 py-3 border">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(ingredientsBySection[section.id] || []).map(ing => (
                                        <tr key={ing.id}>
                                            <td className="px-4 py-3 border font-mono text-xs">{ing.product.sku}</td>
                                            <td className="px-4 py-3 border font-medium">{ing.product.name}</td>
                                            <td className="px-4 py-3 border font-bold">{ing.quantity}</td>
                                            <td className="px-4 py-3 border">{ing.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}

                    {ingredientsBySection['uncategorized']?.length > 0 && (
                        <div className="mb-8">
                            <h4 className="font-bold text-lg mb-3">Other Sparepart</h4>
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 border">SKU</th>
                                        <th className="px-4 py-3 border">Item</th>
                                        <th className="px-4 py-3 border">Quantity</th>
                                        <th className="px-4 py-3 border">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(ingredientsBySection['uncategorized'] || []).map(ing => (
                                        <tr key={ing.id}>
                                            <td className="px-4 py-3 border font-mono text-xs">{ing.product.sku}</td>
                                            <td className="px-4 py-3 border font-medium">{ing.product.name}</td>
                                            <td className="px-4 py-3 border font-bold">{ing.quantity}</td>
                                            <td className="px-4 py-3 border">{ing.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="mt-8 pt-4 border-t-2 border-black">
                        <h4 className="font-bold text-lg mb-3">All Sparepart (BOM) - {recipeName}</h4>
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 border">SKU</th>
                                    <th className="px-4 py-3 border">Item</th>
                                    <th className="px-4 py-3 border">Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aggregatedIngredients.map(ing => (
                                    <tr key={ing.product.id}>
                                        <td className="px-4 py-3 border font-mono text-xs">{ing.product.sku}</td>
                                        <td className="px-4 py-3 border font-medium">{ing.product.name}</td>
                                        <td className="px-4 py-3 border font-bold">{ing.quantity}</td>
                                    </tr>
                                ))}
                                {initialIngredients.length === 0 && (
                                    <tr><td colSpan={3} className="px-4 py-3 border text-center">No sparepart found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Screen: Summary Table */}
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 text-muted-foreground uppercase font-medium text-xs">
                            <tr>
                                <th className="px-4 py-3">Image</th>
                                <th className="px-4 py-3">SKU</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Quantity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {aggregatedIngredients.map(ing => (
                                <tr key={ing.product.id}>
                                    <td className="px-4 py-3">
                                        <div className="w-10 h-10 rounded bg-muted relative overflow-hidden border border-border">
                                            {ing.product.image && <Image src={ing.product.image} fill className="object-cover" alt={ing.product.name} />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ing.product.sku}</td>
                                    <td className="px-4 py-3 font-medium">{ing.product.name}</td>
                                    <td className="px-4 py-3 font-bold">{ing.quantity}</td>
                                </tr>
                            ))}
                            {initialIngredients.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No sparepart found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* If absolutely nothing exists */}
            {sections.length === 0 && (!ingredientsBySection['uncategorized'] || ingredientsBySection['uncategorized'].length === 0) && (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl no-print">
                    No sparepart or sections. Start by categorizing with a section or adding items directly.
                </div>
            )}


            {/* Create Section Modal */}
            {isAddingSection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-4">New Section</h3>
                        <form action={handleCreateSection} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Section Name</label>
                                <input name="name" autoFocus required className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none" placeholder="e.g. Dry Sparepart" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsAddingSection(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                                <button disabled={isLoading} type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Sparepart Modal */}
            {isAddingIngredient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-4">
                            Add Sparepart {activeSectionId ? 'to Section' : ''}
                        </h3>

                        {!selectedProduct ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        autoFocus
                                        placeholder="Search inventory..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-background/50">
                                    {filteredProducts.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleProductSelect(p)}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-accent rounded-lg transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded bg-muted relative overflow-hidden shrink-0">
                                                {p.image ? <Image src={p.image} fill className="object-cover" alt={p.name} /> : <Package className="p-2 w-full h-full text-muted-foreground" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{p.name}</p>
                                                <p className="text-xs text-muted-foreground">{p.sku} • Stock: {p.stock}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredProducts.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No items found.</p>}
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={() => setIsAddingIngredient(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <form action={handleAddIngredient} className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg mb-4 border border-border">
                                    <div className="w-10 h-10 rounded bg-muted relative overflow-hidden shrink-0">
                                        {selectedProduct.image ? <Image src={selectedProduct.image} fill className="object-cover" alt={selectedProduct.name} /> : <Package className="p-2 w-full h-full text-muted-foreground" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">{selectedProduct.name}</p>
                                        <p className="text-xs text-muted-foreground">{selectedProduct.sku}</p>
                                    </div>
                                    <button type="button" onClick={() => setSelectedProduct(null)} className="text-xs text-primary hover:underline">Change</button>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity Required</label>
                                    <input name="quantity" type="number" min="1" required autoFocus className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none" placeholder="e.g. 5" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                                    <input name="notes" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none" placeholder="e.g. grams" />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsAddingIngredient(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                                    <button disabled={isLoading} type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                                        {isLoading ? 'Adding...' : 'Add Sparepart'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}


        </div>
    )
}

function IngredientsTable({ ingredients, onRemove }: { ingredients: Ingredient[], onRemove: (id: string) => void }) {
    if (ingredients.length === 0) {
        return <div className="p-8 text-center text-sm text-muted-foreground italic">No sparepart in this section.</div>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-muted/20 text-muted-foreground uppercase font-medium text-xs">
                    <tr>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {ingredients.map(ing => (
                        <tr key={ing.id} className="hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ing.product.sku}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-muted relative overflow-hidden border border-border">
                                        {ing.product.image && <Image src={ing.product.image} fill className="object-cover" alt={ing.product.name} />}
                                    </div>
                                    <span className="font-medium text-foreground">{ing.product.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground">{ing.quantity}</td>
                            <td className="px-4 py-3 text-muted-foreground">{ing.notes || '-'}</td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => onRemove(ing.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
