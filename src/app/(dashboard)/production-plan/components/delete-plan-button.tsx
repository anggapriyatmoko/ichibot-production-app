'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteProductionPlan } from '@/app/actions/production-plan'
import Modal from '@/components/ui/modal'

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

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Delete Production Plan"
                maxWidth="md"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm disabled:opacity-50"
                        >
                            {isLoading ? 'Deleting...' : 'Delete Plan'}
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6" />
                    </div>

                    <p className="text-muted-foreground text-sm">
                        Are you sure you want to delete the plan for <span className="font-bold text-foreground">{name}</span>?
                        <br /><br />
                        This action cannot be undone and will remove all associated unit progress and tasks.
                    </p>
                </div>
            </Modal>
        </>
    )
}
