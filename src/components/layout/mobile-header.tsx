'use client'

import UserNav from './user-nav'
import { useSession } from "next-auth/react"
import { PanelLeftOpen } from 'lucide-react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import NotificationBadge from './notification-badge'

export default function MobileHeader() {
    const { data: session } = useSession()
    const { setIsMobileOpen } = useSidebar()

    if (!session?.user) return null

    return (
        <header className="w-full bg-background border-b border-border/50 py-3 px-4 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-all bg-card border border-border rounded-lg"
                    aria-label="Open menu"
                >
                    <PanelLeftOpen className="h-6 w-6" />
                </button>
            </div>

            <div className="flex items-center gap-2">
                <NotificationBadge role={session.user.role || 'USER'} />
                <UserNav user={session.user} />
            </div>
        </header>
    )
}
