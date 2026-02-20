'use client'

import React, { createContext, useContext, useState } from 'react'

interface SidebarContextType {
    isMobileOpen: boolean
    setIsMobileOpen: (open: boolean) => void
    isChatOpen: boolean
    setIsChatOpen: (open: boolean) => void
    unreadCount: number
    setUnreadCount: (count: number) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    return (
        <SidebarContext.Provider value={{
            isMobileOpen,
            setIsMobileOpen,
            isChatOpen,
            setIsChatOpen,
            unreadCount,
            setUnreadCount
        }}>
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
