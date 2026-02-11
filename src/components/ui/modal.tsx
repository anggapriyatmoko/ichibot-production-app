'use client'

import React, { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'
import Portal from './portal'
import { cn } from '@/lib/utils'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: ReactNode
    children: ReactNode
    footer?: ReactNode
    headerActions?: ReactNode
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
    className?: string
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[95vw]'
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    headerActions,
    maxWidth = 'lg',
    className
}: ModalProps) {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <Portal>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div
                    className={cn(
                        "bg-background border border-border rounded-2xl shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]",
                        maxWidthClasses[maxWidth]
                    )}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
                        <h3 className="font-bold text-lg text-foreground truncate">
                            {title}
                        </h3>
                        <div className="flex items-center gap-1">
                            {headerActions}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                                title="Tutup"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className={cn(
                        "p-6 overflow-y-auto flex-1 custom-scrollbar",
                        className
                    )}>
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </Portal>
    )
}
