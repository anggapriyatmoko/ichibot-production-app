'use client'

import { Menu } from 'lucide-react'
import { useSidebar } from '@/components/providers/sidebar-provider'

export default function MobileSidebarToggle() {
    const { setIsMobileOpen } = useSidebar()

    return (
        <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
            aria-label="Open menu"
        >
            <Menu className="h-5 w-5 text-foreground" />
        </button>
    )
}
