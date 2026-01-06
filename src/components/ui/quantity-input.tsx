'use client'

import { useState, useEffect, useRef } from 'react'

interface QuantityInputProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number | string
    className?: string
}

export function QuantityInput({ value, onChange, min, max, step = 'any', className }: QuantityInputProps) {
    const [localValue, setLocalValue] = useState(value.toString())

    useEffect(() => {
        // Only update local value from prop if it's a different number
        // (to avoid cursor jumps or formatting wars, but we do want to sync if external change happens)
        // Check if parseFloat(localValue) !== value.
        // But if user types "5.", parseFloat is 5. value is 5. We should NOT overwrite "5." with "5".
        const parsed = parseFloat(localValue)
        if (parsed !== value && !isNaN(parsed)) {
            setLocalValue(value.toString())
        } else if (isNaN(parsed) && value !== 0) {
            setLocalValue(value.toString())
        }
    }, [value])

    const handleBlur = () => {
        const parsed = parseFloat(localValue)
        if (!isNaN(parsed)) {
            // Apply constraints
            let final = parsed
            // if (min !== undefined && final < min) final = min
            // if (max !== undefined && final > max) final = max
            // We rely on parent to enforce constraints or enforce here?
            onChange(final)
            setLocalValue(final.toString())
        } else {
            setLocalValue(value.toString())
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur()
            e.currentTarget.blur()
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value)
        // Optional: Trigger onChange immediately if valid number?
        // But that causes the "4." -> "4" issue if parent re-renders and passes back formatted number.
        // So we just buffer here.
    }

    return (
        <input
            type="number"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            step={step}
            min={min}
            max={max}
        />
    )
}
