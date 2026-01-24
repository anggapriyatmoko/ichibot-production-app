'use client'

import UserNav from './user-nav'
import { useSession } from "next-auth/react"
import TimeDisplay from './time-display'
import { PanelLeftOpen } from 'lucide-react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import NotificationBadge from './notification-badge'

export default function Header() {
    const { data: session } = useSession()
    const { setIsMobileOpen } = useSidebar()

    if (!session?.user) return null

    return (
        <header className="relative z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50 py-3 px-4 md:px-8 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-4">
                {/* Mobile Sidebar Toggle - Visible only on mobile */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="md:hidden p-1 text-muted-foreground hover:text-foreground transition-all"
                >
                    <PanelLeftOpen className="h-7 w-7" />
                </button>

                {/* Desktop Time Display */}
                <div className="hidden md:block">
                    <TimeDisplay />
                </div>
            </div>

            <div className="flex items-center gap-3 md:gap-6">


                <NotificationBadge role={session.user.role || 'USER'} />
                <UserNav user={session.user} />
            </div>
        </header>
    )
}
