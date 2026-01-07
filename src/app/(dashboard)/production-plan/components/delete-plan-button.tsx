'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, X } from 'lucide-react'
import { deleteProductionPlan } from '@/app/actions/production-plan'

interface DeletePlanButtonProps {
    id: string
    name: string
}

export default function DeletePlanButton({ id, name }: DeletePlanButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleDelete = async () => {
        setIsLoading(true)
        try {
            await deleteProductionPlan(id)
            setIsOpen(false)
        } catch (error) {
            console.error('Failed to delete plan:', error)
            alert('Failed to delete plan. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                title="Delete Plan"
                type="button"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card border border-border w-full max-w-md rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors"
                            disabled={isLoading}
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6" />
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-2">Delete Production Plan?</h3>
                            <p className="text-muted-foreground text-sm mb-6">
                                Are you sure you want to delete the plan for <span className="font-bold text-foreground">{name}</span>?
                                <br />
                                This action cannot be undone and will remove all associated unit progress and tasks.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'Deleting...' : 'Delete Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
