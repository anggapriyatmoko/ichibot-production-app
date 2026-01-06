'use client'

import { useState } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, LogOut, BookOpen, Calendar, Users, Settings, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Product', href: '/catalogue', icon: BookOpen },
    { name: 'Sparepart', href: '/inventory', icon: Package },
    { name: 'Production Plan', href: '/production-plan', icon: Calendar },
    { name: 'POS', href: '/pos', icon: ShoppingCart },
    { name: 'History', href: '/history', icon: LayoutDashboard },
    { name: 'Profile', href: '/profile', icon: User },
]

const adminNavigation = [
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
    userProfile: React.ReactNode
    userRole?: string
}

export default function Sidebar({ userProfile, userRole }: SidebarProps) {
    const [isOpen, setIsOpen] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const pathname = usePathname()

    // Helper for nav items to avoid duplication
    const NavItem = ({ item, isCollapsed }: { item: any, isCollapsed: boolean }) => {
        const isActive = pathname === item.href
        return (
            <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && "md:justify-center md:px-2"
                )}
            >
                <item.icon
                    className={cn(
                        'flex-shrink-0 transition-colors duration-200',
                        'mr-3 h-5 w-5', // Base icon size and margin for expanded/mobile
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                        isCollapsed && "md:mr-0 md:h-6 md:w-6" // Override for desktop collapsed
                    )}
                />
                <span className={cn(
                    "whitespace-nowrap transition-all duration-300",
                    isCollapsed ? "md:hidden" : "block"
                )}>
                    {item.name}
                </span>
            </Link>
        )
    }

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden flex-shrink-0 sticky top-0 z-30 flex items-center justify-between p-4 bg-card border-b border-border">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-accent text-muted-foreground">
                        <PanelLeftOpen className="h-6 w-6" />
                    </button>
                    <Link href="/dashboard">
                        <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Ichibot Production
                        </span>
                    </Link>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 transform",
                // Mobile: Translate based on state
                isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
                // Desktop: Always show, handle width based on isOpen state
                "md:relative md:translate-x-0",
                isOpen ? "md:w-64" : "md:w-20"
            )}>
                {/* Desktop Header / Collapse Toggle */}
                <div className={cn(
                    "hidden md:flex items-center border-b border-border h-16 transition-all duration-300",
                    isOpen ? "justify-between px-6" : "justify-center"
                )}>
                    {isOpen && (
                        <div className="flex flex-col overflow-hidden whitespace-nowrap">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent leading-none">
                                Ichibot Production
                            </h1>
                            <span className="text-[10px] font-medium text-muted-foreground mt-1">PPC System</span>
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-5 w-5" />}
                    </button>
                </div>

                {/* Mobile Sidebar Header (Close Button) */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
                    <span className="font-bold text-lg">Menu</span>
                    <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
                        <PanelLeftClose className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-3">
                    <nav className="space-y-1">
                        {navigation.map((item) => (
                            <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                        ))}
                    </nav>

                    {userRole === 'ADMIN' && (
                        <>
                            <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                                <div className="border-t border-border" />
                                <p className={cn(
                                    "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                                    isOpen ? "px-3" : "text-center"
                                )}>
                                    {isOpen ? "Admin" : "..."}
                                </p>
                            </div>
                            <nav className="space-y-1">
                                {adminNavigation.map((item) => (
                                    <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                                ))}
                            </nav>
                        </>
                    )}
                </div>

                <div className={cn("p-4 border-t border-border space-y-4", !isOpen && "md:items-center md:flex md:flex-col")}>
                    {isOpen ? userProfile : (
                        <div className="hidden md:flex justify-center" title="User Profile">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                U
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className={cn(
                            "flex items-center justify-center text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors",
                            isOpen ? "w-full px-3 py-2" : "md:w-10 md:h-10 md:p-0"
                        )}
                        title="Sign Out"
                    >
                        <LogOut className={cn("h-4 w-4", isOpen && "mr-2")} />
                        {isOpen && "Sign Out"}
                    </button>
                </div>
            </div>
        </>
    )
}
