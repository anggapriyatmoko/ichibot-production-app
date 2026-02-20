'use client'

import UserNav from './user-nav'
import { useSession } from "next-auth/react"
import TimeDisplay from './time-display'
import { PanelLeftOpen, PanelLeftClose, MessageCircle } from 'lucide-react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import NotificationBadge from './notification-badge'
import AnnouncementBanner from './announcement-banner'
import { cn } from '@/lib/utils'

export default function Header() {
    const { data: session } = useSession()
    const { isOpen, setIsOpen, isMobileOpen, setIsMobileOpen, isChatOpen, setIsChatOpen, unreadCount } = useSidebar()

    if (!session?.user) return null

    return (
        <header className="relative z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50 py-2 px-4 md:px-8 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-4">
                {/* Mobile Sidebar Toggle - Visible only on mobile */}
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="md:hidden p-1 text-muted-foreground hover:text-foreground transition-all"
                >
                    <PanelLeftOpen className="h-7 w-7" />
                </button>

                {/* Desktop Sidebar Toggle - Visible only on desktop */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="hidden md:block p-1 text-muted-foreground hover:text-foreground transition-all"
                >
                    {isOpen ? <PanelLeftClose className="h-6 w-6" /> : <PanelLeftOpen className="h-6 w-6" />}
                </button>

                {/* Desktop Time Display */}
                <div className="hidden md:block">
                    <TimeDisplay />
                </div>
            </div>

            <AnnouncementBanner />

            <div className="flex items-center gap-3 md:gap-6">
                <button
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    className={cn(
                        "p-2 rounded-full transition-all relative",
                        isChatOpen
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title="Chat"
                >
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-background">
                            {unreadCount > 9 ? '+' : unreadCount}
                        </span>
                    )}
                </button>
                <NotificationBadge role={session.user.role || 'USER'} />
                <UserNav user={session.user} />
            </div>
        </header>
    )
}
