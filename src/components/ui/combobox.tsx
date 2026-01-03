'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'

interface Option {
    id: string
    label: string
    image?: string | null
    subtext?: string
}

interface ComboboxProps {
    options: Option[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    name?: string
    required?: boolean
    disabled?: boolean
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    name,
    required = false,
    disabled = false
}: ComboboxProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const selectedOption = options.find(opt => opt.id === value)

    const filteredOptions = useMemo(() => {
        if (!searchQuery) return options
        const lower = searchQuery.toLowerCase()
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lower) ||
            (opt.subtext && opt.subtext.toLowerCase().includes(lower))
        )
    }, [options, searchQuery])

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    return (
        <div className="relative" ref={containerRef}>
            {/* Hidden Input for Form Submission */}
            <input
                type="hidden"
                name={name}
                value={value}
                required={required}
            />

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between bg-background border rounded-lg px-3 py-2.5 text-sm transition-all duration-200 outline-none
                    ${isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-border hover:border-muted-foreground/50'}
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : 'cursor-pointer'}
                `}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption ? (
                        <>
                            {/* Optional Image Support if added later */}
                            {selectedOption.image && (
                                <img src={selectedOption.image} alt="" className="w-5 h-5 rounded object-cover" />
                            )}
                            <span className="font-medium text-foreground">{selectedOption.label}</span>
                        </>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>
                <ChevronsUpDown className="w-4 h-4 text-muted-foreground opacity-50 shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
                    {/* Search Input */}
                    <div className="p-2 border-b border-border bg-muted/30">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-background border border-border rounded-lg pl-9 pr-8 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-[240px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id)
                                        setIsOpen(false)
                                        setSearchQuery('')
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                                        ${option.id === value ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Placeholder Icon or Image */}
                                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0
                                            ${option.id === value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                                        `}>
                                            {option.image ? (
                                                <img src={option.image} alt="" className="w-full h-full object-cover rounded-md" />
                                            ) : (
                                                <span className="font-bold text-xs uppercase">{option.label.substring(0, 2)}</span>
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <div className="font-medium">{option.label}</div>
                                            {option.subtext && <div className="text-xs text-muted-foreground">{option.subtext}</div>}
                                        </div>
                                    </div>
                                    {option.id === value && <Check className="w-4 h-4 opacity-100" />}
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No results found.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
