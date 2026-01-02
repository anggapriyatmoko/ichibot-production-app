'use client'

import { useState } from 'react'
import { addIngredient, removeIngredient } from '@/app/actions/recipe'
import { Plus, Trash2, Search, Package } from 'lucide-react'
import Image from 'next/image'

type Ingredient = {
    id: string
    quantity: number
    notes: string | null
    product: {
        id: string
        name: string
        stock: number
        image: string | null
    }
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
    initialIngredients,
    allProducts
}: {
    recipeId: string,
    initialIngredients: Ingredient[],
    allProducts: Product[]
}) {
    const [ingredients, setIngredients] = useState(initialIngredients) // Ideally stick to server data, but here using hybrid optim/server
    // Actually, since we use server actions with revalidatePath, the page will reload with new data.
    // So we don't strictly need local state for the list if the parent refreshes.
    // But passed props aren't auto-updated in client components unless parent re-renders.

    const [isAdding, setIsAdding] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    )

    async function handleAdd(formData: FormData) {
        if (!selectedProduct) return
        setIsLoading(true)
        formData.append('productId', selectedProduct.id)
        await addIngredient(recipeId, formData)
        setIsLoading(false)
        setIsAdding(false)
        setSelectedProduct(null)
        setSearchQuery('')
    }

    async function handleRemove(id: string) {
        if (!confirm('Remove this ingredient?')) return
        await removeIngredient(id, recipeId)
    }

    return (
        <div className="p-6">
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                </button>
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-4">Add Ingredient</h3>

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
                                            onClick={() => setSelectedProduct(p)}
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
                                    <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <form action={handleAdd} className="space-y-4">
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
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                                    <button disabled={isLoading} type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                                        {isLoading ? 'Adding...' : 'Add Ingredient'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Ingredients Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground uppercase font-medium text-xs">
                        <tr>
                            <th className="px-4 py-3">Item</th>
                            <th className="px-4 py-3">Quantity</th>
                            <th className="px-4 py-3">Notes</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {initialIngredients.map(ing => (
                            <tr key={ing.id} className="hover:bg-accent/30 transition-colors">
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
                                    <button onClick={() => handleRemove(ing.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {initialIngredients.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                    No ingredients added yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
