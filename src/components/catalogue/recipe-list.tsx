'use client'

import { useState } from 'react'
import { createRecipe, deleteRecipe, updateRecipe, getAllRecipesForExport } from '@/app/actions/recipe'
import { createCategory, updateCategory } from '@/app/actions/category'
import { Plus, BookOpen, Trash2, ChevronRight, Tag, Edit2, Download, Hash, Barcode, X, Check } from 'lucide-react'
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
    productionId: string
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
        productionId: '',
        description: '',
        categoryId: ''
    })
    const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)

    // Inline Category Creation
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')

    // Category Editing
    const [editingCategory, setEditingCategory] = useState<{ id: string, name: string } | null>(null)

    async function handleUpdateCategory() {
        if (!editingCategory || !editingCategory.name.trim()) return
        setIsLoading(true)
        try {
            const result = await updateCategory(editingCategory.id, editingCategory.name)
            if (result?.error) {
                showError(result.error)
            } else {
                setEditingCategory(null)
            }
        } catch (error) {
            showError('Failed to update category')
        } finally {
            setIsLoading(false)
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        const submitData = new FormData()
        submitData.append('name', formData.name)
        submitData.append('productionId', formData.productionId)
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
        setEditingRecipeId(null)
        setFormData({ name: '', productionId: '', description: '', categoryId: '' })
    }

    function handleEdit(recipe: RecipeWithCount) {
        setFormData({
            name: recipe.name,
            productionId: recipe.productionId || '',
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
            {['ADMIN', 'HRD'].includes(userRole || '') && (
                <div className="flex justify-end gap-3">
                    <ImportRecipeModal />
                    <button
                        onClick={handleExport}
                        disabled={isLoading}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export Excel"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            setEditingRecipeId(null)
                            setFormData({ name: '', productionId: '', description: '', categoryId: '' })
                            setIsAdding(true)
                        }}
                        className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm"
                        title="New Product"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center py-20 md:py-8 px-4 overflow-y-auto bg-black/60 backdrop-blur-sm">
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
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Production ID <span className="text-red-500">*</span></label>
                                <input
                                    value={formData.productionId}
                                    onChange={e => setFormData({ ...formData, productionId: e.target.value })}
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                                    placeholder="e.g. PID-001"
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

            {/* Grouped Display by Category */}
            {categories.map(category => {
                const categoryRecipes = recipes.filter(r => r.categoryId === category.id)
                if (categoryRecipes.length === 0) return null

                const isCategoryEditing = editingCategory?.id === category.id

                return (
                    <div key={category.id} className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center gap-3 mb-4 group px-2">
                            <Tag className="w-5 h-5 text-primary" />
                            {isCategoryEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        value={editingCategory.name}
                                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                        className="bg-background border border-border rounded-lg px-3 py-1 text-lg font-bold text-foreground focus:border-primary outline-none min-w-[200px]"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleUpdateCategory()
                                            if (e.key === 'Escape') setEditingCategory(null)
                                        }}
                                    />
                                    <button
                                        onClick={handleUpdateCategory}
                                        disabled={isLoading}
                                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setEditingCategory(null)}
                                        disabled={isLoading}
                                        className="p-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors border border-border"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                                    {category.name}
                                    {['ADMIN', 'HRD'].includes(userRole || '') && (
                                        <button
                                            onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground"
                                            title="Rename Category"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </h2>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                                        <tr>
                                            <th className="hidden md:table-cell px-6 py-4 w-12 text-center">No</th>
                                            <th className="px-4 md:px-6 py-4">Product Info</th>
                                            <th className="hidden md:table-cell px-6 py-4">Production ID</th>
                                            <th className="hidden md:table-cell px-6 py-4 text-center">Items</th>
                                            <th className="hidden lg:table-cell px-6 py-4">Description</th>
                                            <th className="px-4 md:px-6 py-4 text-right whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {categoryRecipes.map((recipe, index) => (
                                            <tr key={recipe.id} className="hover:bg-accent/30 transition-colors group/row">
                                                <td className="hidden md:table-cell px-6 py-4 text-center text-muted-foreground font-mono">{index + 1}</td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <Link href={`/catalogue/${recipe.id}`} className="font-bold text-foreground hover:text-primary transition-colors block leading-tight">
                                                            {recipe.name}
                                                        </Link>
                                                        {/* Mobile-only info stack */}
                                                        <div className="mt-1 flex items-center gap-2 md:hidden">
                                                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                                                {recipe.productionId}
                                                            </span>
                                                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">
                                                                {recipe._count.ingredients} Items
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 font-mono text-xs">{recipe.productionId}</td>
                                                <td className="hidden md:table-cell px-6 py-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                                                        {recipe._count.ingredients}
                                                    </span>
                                                </td>
                                                <td className="hidden lg:table-cell px-6 py-4 text-muted-foreground text-xs italic max-w-xs truncate">
                                                    {recipe.description || '-'}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link
                                                            href={`/catalogue/${recipe.id}`}
                                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title="View Detail"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Link>
                                                        {['ADMIN', 'HRD'].includes(userRole || '') && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEdit(recipe)}
                                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                                    title="Edit Product"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(recipe.id)}
                                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                                    title="Delete Product"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* Uncategorized Products */}
            {recipes.filter(r => !r.categoryId).length > 0 && (
                <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-xl font-bold text-foreground">Uncategorized</h2>
                    </div>

                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                                    <tr>
                                        <th className="hidden md:table-cell px-6 py-4 w-12 text-center">No</th>
                                        <th className="px-4 md:px-6 py-4">Product Info</th>
                                        <th className="hidden md:table-cell px-6 py-4">Production ID</th>
                                        <th className="hidden md:table-cell px-6 py-4 text-center">Items</th>
                                        <th className="hidden lg:table-cell px-6 py-4">Description</th>
                                        <th className="px-4 md:px-6 py-4 text-right whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recipes.filter(r => !r.categoryId).map((recipe, index) => (
                                        <tr key={recipe.id} className="hover:bg-accent/30 transition-colors group/row">
                                            <td className="hidden md:table-cell px-6 py-4 text-center text-muted-foreground font-mono">{index + 1}</td>
                                            <td className="px-4 md:px-6 py-4">
                                                <div className="flex flex-col">
                                                    <Link href={`/catalogue/${recipe.id}`} className="font-bold text-foreground hover:text-primary transition-colors block leading-tight">
                                                        {recipe.name}
                                                    </Link>
                                                    {/* Mobile-only info stack */}
                                                    <div className="mt-1 flex items-center gap-2 md:hidden">
                                                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                                            {recipe.productionId}
                                                        </span>
                                                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">
                                                            {recipe._count.ingredients} Items
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-4 font-mono text-xs">{recipe.productionId}</td>
                                            <td className="hidden md:table-cell px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                                                    {recipe._count.ingredients}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 text-muted-foreground text-xs italic max-w-xs truncate">
                                                {recipe.description || '-'}
                                            </td>
                                            <td className="px-4 md:px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/catalogue/${recipe.id}`}
                                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="View Detail"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Link>
                                                    {['ADMIN', 'HRD'].includes(userRole || '') && (
                                                        <>
                                                            <button
                                                                onClick={() => handleEdit(recipe)}
                                                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                                title="Edit Product"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(recipe.id)}
                                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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

