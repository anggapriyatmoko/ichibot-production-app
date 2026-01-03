'use client'

import { useState } from 'react'
import { createRecipe, deleteRecipe } from '@/app/actions/recipe'
import { Plus, BookOpen, Trash2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'

type RecipeWithCount = {
    id: string
    name: string
    description: string | null
    updatedAt: Date
    _count: { ingredients: number }
}

export default function RecipeList({ recipes, userRole }: { recipes: RecipeWithCount[], userRole?: string }) {
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { showConfirmation } = useConfirmation()

    async function handleAdd(formData: FormData) {
        setIsLoading(true)
        await createRecipe(formData)
        setIsLoading(false)
        setIsAdding(false)
    }

    async function handleDelete(id: string) {
        showConfirmation({
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product? This action cannot be undone.',
            type: 'confirm',
            action: async () => {
                await deleteRecipe(id)
            }
        })
    }

    return (
        <div className="space-y-6">
            {userRole === 'ADMIN' && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors font-medium text-sm shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Product
                    </button>
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-foreground mb-4">Add New Product</h3>
                        <form action={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name</label>
                                <input name="name" required autoFocus className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none" placeholder="e.g. Roti Tawar" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                                <textarea name="description" rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none" placeholder="Optional description..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                                <button disabled={isLoading} type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium">
                                    {isLoading ? 'Creating...' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map(recipe => (
                    <div key={recipe.id} className="group relative bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <button onClick={() => handleDelete(recipe.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <Link href={`/catalogue/${recipe.id}`} className="block">
                            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{recipe.name}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">{recipe.description || 'No description'}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                                <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                                    {recipe._count.ingredients} Sparepart
                                </span>
                                <span className="flex items-center text-xs text-primary font-medium">
                                    Manage <ChevronRight className="w-3 h-3 ml-1" />
                                </span>
                            </div>
                        </Link>
                    </div>
                ))}
                {recipes.length === 0 && (
                    <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-xl border-dashed">
                        No products found. Create your first one to get started.
                    </div>
                )}
            </div>
        </div>
    )
}
