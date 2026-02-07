'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

type ConfirmationType = 'confirm' | 'alert'

type ConfirmationOptions = {
    title: string
    message: string
    type?: ConfirmationType
    action?: () => Promise<void> | void
    confirmLabel?: string
    cancelLabel?: string
}

type ConfirmationContextType = {
    showConfirmation: (options: ConfirmationOptions) => void
    closeConfirmation: () => void
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined)

export function useConfirmation() {
    const context = useContext(ConfirmationContext)
    if (!context) {
        throw new Error('useConfirmation must be used within a ModalProvider')
    }
    return context
}

export function ModalProvider({ children }: { children: ReactNode }) {
    const [confirmation, setConfirmation] = useState<{
        isOpen: boolean
        type: ConfirmationType
        title: string
        message: string
        action: () => Promise<void> | void
        confirmLabel: string
        cancelLabel: string
    }>({
        isOpen: false,
        type: 'confirm',
        title: '',
        message: '',
        action: () => { },
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel'
    })

    const showConfirmation = ({ title, message, type = 'confirm', action, confirmLabel, cancelLabel }: ConfirmationOptions) => {
        setConfirmation({
            isOpen: true,
            title,
            message,
            type,
            action: action || (() => { }),
            confirmLabel: confirmLabel || (type === 'alert' ? 'OK' : 'Confirm'),
            cancelLabel: cancelLabel || 'Cancel'
        })
    }

    const closeConfirmation = () => {
        setConfirmation(prev => ({ ...prev, isOpen: false }))
    }

    const handleConfirm = async () => {
        closeConfirmation()
        if (confirmation.action) {
            await confirmation.action()
        }
    }

    return (
        <ConfirmationContext.Provider value={{ showConfirmation, closeConfirmation }}>
            {children}

            {/* Global Modal Overlay */}
            {confirmation.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className={`flex items-center gap-3 mb-4 ${confirmation.type === 'alert' ? 'text-blue-500' : 'text-destructive'}`}>
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-lg font-bold text-foreground">{confirmation.title}</h3>
                        </div>
                        <p className="text-muted-foreground text-sm mb-6">{confirmation.message}</p>
                        <div className="flex justify-end gap-3">
                            {confirmation.type === 'confirm' && (
                                <button
                                    onClick={closeConfirmation}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    {confirmation.cancelLabel}
                                </button>
                            )}
                            <button
                                onClick={handleConfirm}
                                className={`px-4 py-2 ${confirmation.type === 'alert' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'} rounded-lg text-sm font-medium shadow-sm transition-colors`}
                            >
                                {confirmation.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmationContext.Provider>
    )
}
