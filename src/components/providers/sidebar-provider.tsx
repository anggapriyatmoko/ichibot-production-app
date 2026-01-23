'use client'

import React, { createContext, useContext, useState } from 'react'

interface SidebarContextType {
    isMobileOpen: boolean
    setIsMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    return (
        <SidebarContext.Provider value={{ isMobileOpen, setIsMobileOpen }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}
