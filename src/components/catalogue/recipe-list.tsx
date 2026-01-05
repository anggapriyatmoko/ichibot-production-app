'use client'

import { useState } from 'react'
import { createRecipe, deleteRecipe, updateRecipe, getAllRecipesForExport } from '@/app/actions/recipe'
import { createCategory } from '@/app/actions/category'
import { Plus, BookOpen, Trash2, ChevronRight, Tag, Edit2, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import ImportRecipeModal from './import-recipe-modal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useConfirmation } from '@/components/providers/modal-provider'
import { useAlert } from '@/hooks/use-alert'

type Category = {
    id: string
    name: string
}

type RecipeWithCount = {
    id: string
    name: string
    description: string | null
    categoryId: string | null
    category?: Category | null
    updatedAt: Date
    _count: { ingredients: number }
}

export default function RecipeList({
    recipes,
    categories,
    userRole
}: {
    recipes: RecipeWithCount[]
    categories: Category[]
    userRole?: string
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { showConfirmation } = useConfirmation()
    const { showError } = useAlert()

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: ''
    })
    const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)

    // Inline Category Creation
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        const submitData = new FormData()
        submitData.append('name', formData.name)
        submitData.append('description', formData.description)
        submitData.append('categoryId', formData.categoryId)

        if (editingRecipeId) {
            await updateRecipe(editingRecipeId, submitData)
        } else {
            await createRecipe(submitData)
        }
        setIsLoading(false)
        setIsAdding(false)
        setEditingRecipeId(null)
        setFormData({ name: '', description: '', categoryId: '' })
    }

    function handleEdit(recipe: RecipeWithCount) {
        setFormData({
            name: recipe.name,
            description: recipe.description || '',
            categoryId: recipe.categoryId || ''
        })
        setEditingRecipeId(recipe.id)
        setIsAdding(true)
    }

    async function handleCreateCategory() {
        if (!newCategoryName.trim()) return
        setIsLoading(true)
        try {
            const result = await createCategory(newCategoryName)
            if (result?.error) {
                showError(result.error)
            } else {
                setNewCategoryName('')
                setIsCreatingCategory(false)
                if (result.category) {
                    setFormData(prev => ({ ...prev, categoryId: result.category.id }))
                }
            }
        } catch (error: any) {
            showError(error.message)
        } finally {
            setIsLoading(false)
        }
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

    async function handleExport() {
        try {
            setIsLoading(true)
            const data = await getAllRecipesForExport()

            // Define headers
            const headers = ['Recipe Name', 'Description', 'Section', 'Ingredient SKU', 'Ingredient Name', 'Quantity', 'Notes']

            // Map data to array of arrays
            const rows = data.map((item: any) => [
                item.recipeName,
                item.description,
                item.section,
                item.sku,
                item.productName,
                item.quantity,
                item.notes
            ])

            // Create workbook
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Product Catalogue')

            // Save file
            XLSX.writeFile(wb, `Product_Catalogue_Export_${new Date().toISOString().split('T')[0]}.xlsx`)
        } catch (error: any) {
            showError(error.message || 'Export failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {userRole === 'ADMIN' && (
                <div className="flex justify-end gap-3">
                    <ImportRecipeModal />
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-4 h-4" />
                        Export Excel
                    </button>
                    <button
                        onClick={() => {
                            setEditingRecipeId(null)
                            setFormData({ name: '', description: '', categoryId: '' })
                            setIsAdding(true)
                        }}
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
                        <h3 className="text-lg font-bold text-foreground mb-4">{editingRecipeId ? 'Edit Product' : 'Add New Product'}</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Product Name</label>
                                <input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    autoFocus
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                                    placeholder="e.g. Roti Tawar"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.categoryId}
                                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                        required
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary outline-none"
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                                        className="px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors border border-border"
                                        title="Create New Category"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                {isCreatingCategory && (
                                    <div className="mt-2 flex gap-2 animate-in slide-in-from-top-1">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="New Category Name"
                                            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateCategory}
                                            disabled={isLoading || !newCategoryName.trim()}
                                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                                    placeholder="Optional description..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => { setIsAdding(false); setEditingRecipeId(null); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                                <button disabled={isLoading} type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium">
                                    {isLoading ? 'Saving...' : (editingRecipeId ? 'Save Changes' : 'Create Product')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Grouped Display */}
            {categories.map(category => {
                const categoryRecipes = recipes.filter(r => r.categoryId === category.id)
                if (categoryRecipes.length === 0) return null

                return (
                    <div key={category.id} className="mb-8">
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            <Tag className="w-5 h-5" />
                            {category.name}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categoryRecipes.map(recipe => (
                                <RecipeCard
                                    key={recipe.id}
                                    recipe={recipe}
                                    userRole={userRole}
                                    onEdit={() => handleEdit(recipe)}
                                    onDelete={() => handleDelete(recipe.id)}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}

            {/* Uncategorized */}
            {recipes.filter(r => !r.categoryId).length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Uncategorized
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recipes.filter(r => !r.categoryId).map(recipe => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                userRole={userRole}
                                onEdit={() => handleEdit(recipe)}
                                onDelete={() => handleDelete(recipe.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {recipes.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-xl border-dashed">
                    No products found. Create your first one to get started.
                </div>
            )}
        </div>
    )
}

function RecipeCard({ recipe, userRole, onEdit, onDelete }: { recipe: RecipeWithCount, userRole?: string, onEdit: () => void, onDelete: () => void }) {
    return (
        <div className="group relative bg-card border border-border rounded-xl p-3 hover:border-primary/50 transition-all hover:shadow-md flex flex-col justify-between h-full">
            {/* Admin Actions - Absolute Top Right */}
            {userRole === 'ADMIN' && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md bg-card/80 backdrop-blur-sm border border-border shadow-sm">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md bg-card/80 backdrop-blur-sm border border-border shadow-sm">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <Link href={`/catalogue/${recipe.id}`} className="block flex-1">
                {/* Header: Icon + Product Info */}
                <div className="flex gap-3 mb-2">
                    <div className="flex-shrink-0">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <BookOpen className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-bold text-foreground text-sm leading-tight truncate pr-6 group-hover:text-primary transition-colors">
                            {recipe.name}
                        </h3>
                        {recipe.category ? (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Tag className="w-3 h-3" />
                                <span className="truncate">{recipe.category.name}</span>
                            </div>
                        ) : (
                            <div className="mt-1 h-4"></div> /* Spacer */
                        )}
                    </div>
                </div>

                {/* Description under the header area */}
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em] mb-3">
                    {recipe.description || 'No description'}
                </p>
            </Link>

            <Link href={`/catalogue/${recipe.id}`} className="block mt-auto">
                <div className="flex items-center justify-between pt-2 border-t border-border border-dashed">
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                        {recipe._count.ingredients} Item
                    </span>
                    <span className="flex items-center text-[10px] text-primary font-medium uppercase tracking-wider">
                        Detail <ChevronRight className="w-3 h-3 ml-0.5" />
                    </span>
                </div>
            </Link>
        </div>
    )
}
