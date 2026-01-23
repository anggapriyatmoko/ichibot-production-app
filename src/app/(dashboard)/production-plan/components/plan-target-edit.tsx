'use client'

import { useState, useRef, useEffect } from 'react'
import { updateProductionPlanQuantity } from '@/app/actions/production-plan'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlanTargetEditProps {
    id: string
    initialQuantity: number
    variant?: 'default' | 'small'
}

export default function PlanTargetEdit({ id, initialQuantity, userRole, variant = 'default' }: PlanTargetEditProps & { userRole?: string }) {
    const isSmall = variant === 'small'
    const [isEditing, setIsEditing] = useState(false)
    const [quantity, setQuantity] = useState(initialQuantity)
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleBlur = async () => {
        setIsEditing(false)
        if (quantity === initialQuantity) return

        if (quantity <= 0) {
            alert('Quantity must be positive')
            setQuantity(initialQuantity)
            return
        }

        setIsLoading(true)
        try {
            await updateProductionPlanQuantity(id, quantity)
        } catch (error) {
            console.error(error)
            // Show the specific error from the server (e.g., "Blocking unit #5...")
            const message = error instanceof Error ? error.message : 'Failed to update target'
            alert(message)
            setQuantity(initialQuantity)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur()
        } else if (e.key === 'Escape') {
            setQuantity(initialQuantity)
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(
                    "text-center bg-background border border-primary rounded px-1 outline-none",
                    isSmall ? "w-14 text-xs font-medium py-0" : "w-20 text-lg font-bold py-0.5"
                )}
                disabled={isLoading}
            />
        )
    }

    if (userRole !== 'ADMIN') {
        return (
            <div className={cn("inline-flex items-center gap-1", isSmall ? "px-0" : "px-2 py-1")}>
                <span className={cn(isSmall ? "text-xs font-medium text-zinc-600" : "font-bold text-lg")}>{initialQuantity} pcs</span>
            </div>
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={cn(
                "group relative inline-flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded transition-colors",
                isSmall ? "px-1" : "px-2 py-1"
            )}
            title="Click to edit target"
        >
            <span className={cn(isSmall ? "text-xs font-medium text-zinc-700 dark:text-zinc-400" : "font-bold text-lg")}>
                {initialQuantity} pcs
            </span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            {!isSmall && (
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Click to edit
                </span>
            )}
        </div>
    )
}
