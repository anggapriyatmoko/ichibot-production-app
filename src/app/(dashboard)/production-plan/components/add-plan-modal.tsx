'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createProductionPlan } from '@/app/actions/production-plan'

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

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
            >
                <Plus className="w-4 h-4" />
                Add Plan
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-xl border border-border">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="text-lg font-semibold">Add Production Plan</h3>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-accent rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={async (formData) => {
                            await createProductionPlan(formData)
                            setIsOpen(false)
                        }} className="p-4 space-y-4">
                            <input type="hidden" name="month" value={month} />
                            <input type="hidden" name="year" value={year} />

                            <div>
                                <label className="block text-sm font-medium mb-1">Product</label>
                                {recipes.length > 0 ? (
                                    <select name="recipeId" required className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary">
                                        <option value="">Select a product...</option>
                                        {recipes.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded-lg">
                                        All available products have been planned for this month.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity</label>
                                <input
                                    type="number"
                                    name="quantity"
                                    min="1"
                                    required
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
                                    placeholder="e.g. 10"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={recipes.length === 0}
                                    className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
