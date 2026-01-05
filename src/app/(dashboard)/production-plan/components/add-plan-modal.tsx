'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createProductionPlan } from '@/app/actions/production-plan'
import { Combobox } from '@/components/ui/combobox'

interface Recipe {
    id: string
    name: string
}

interface ProductionPlanModalProps {
    recipes: Recipe[]
    month: number
    year: number
}

export default function ProductionPlanModal({ recipes, month, year }: ProductionPlanModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedRecipeId, setSelectedRecipeId] = useState('')

    // Transform recipes to options for Combobox
    const productOptions = recipes.map(r => ({
        id: r.id,
        label: r.name,
        // image: r.image // Add this later if schema supports it
        subtext: 'Ready for production'
    }))

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm"
                title="Add Plan"
            >
                <Plus className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                            <h3 className="text-lg font-bold text-foreground">Add Production Plan</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={async (formData) => {
                            await createProductionPlan(formData)
                            setIsOpen(false)
                            setSelectedRecipeId('')
                        }} className="p-6 space-y-6">
                            <input type="hidden" name="month" value={month} />
                            <input type="hidden" name="year" value={year} />

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Product Target</label>
                                {recipes.length > 0 ? (
                                    <Combobox
                                        name="recipeId"
                                        options={productOptions}
                                        value={selectedRecipeId}
                                        onChange={setSelectedRecipeId}
                                        placeholder="Search product..."
                                        required
                                    />
                                ) : (
                                    <div className="text-sm text-center py-4 text-muted-foreground bg-muted/50 rounded-lg border border-dashed border-border">
                                        All available products have been planned for this month.
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Target Quantity</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="quantity"
                                        min="1"
                                        required
                                        className="w-full bg-background border border-border rounded-lg pl-3 pr-12 py-2.5 text-foreground focus:border-primary outline-none font-mono text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                                        PCS
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={recipes.length === 0 || !selectedRecipeId}
                                    className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:shadow-md active:scale-95"
                                >
                                    Create Plan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
