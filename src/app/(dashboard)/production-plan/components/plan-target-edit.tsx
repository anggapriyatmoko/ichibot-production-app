'use client'

import { useState, useRef, useEffect } from 'react'
import { updateProductionPlanQuantity } from '@/app/actions/production-plan'
import { Loader2 } from 'lucide-react'

interface PlanTargetEditProps {
    id: string
    initialQuantity: number
}

export default function PlanTargetEdit({ id, initialQuantity, userRole }: PlanTargetEditProps & { userRole?: string }) {
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
                className="w-20 text-center font-bold text-lg bg-background border border-primary rounded px-1 py-0.5 outline-none"
                disabled={isLoading}
            />
        )
    }

    if (userRole !== 'ADMIN') {
        return (
            <div className="inline-flex items-center gap-2 px-2 py-1">
                <span className="font-bold text-lg">{initialQuantity} pcs</span>
            </div>
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group relative inline-flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors"
            title="Click to edit target"
        >
            <span className="font-bold text-lg">{initialQuantity} pcs</span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                Click to edit
            </span>
        </div>
    )
}
