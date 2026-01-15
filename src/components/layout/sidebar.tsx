'use client'

import { useState, useEffect } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, LogOut, BookOpen, Calendar, Users, Settings, PanelLeftClose, PanelLeftOpen, User, Warehouse, ClipboardList, Wrench, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import TimeDisplay from './time-display'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    {
        name: 'Spareparts',
        icon: Package,
        children: [
            { name: 'Sparepart Production', href: '/inventory', icon: Package },
            { name: 'POS Production', href: '/pos', icon: ShoppingCart },
            { name: 'Sparepart Project', href: '/sparepart-project', icon: Package },
            { name: 'Rack Management', href: '/rack-management', icon: Warehouse }
        ]
    },
    { name: 'Product Catalogue', href: '/catalogue', icon: BookOpen },
    { name: 'Production Plan', href: '/production-plan', icon: Calendar },
    {
        name: 'Activity',
        icon: ClipboardList,
        children: [
            { name: 'History', href: '/history', icon: LayoutDashboard },
            { name: 'Log Activity', href: '/log-activity', icon: ClipboardList }
        ]
    },
    { name: 'Aset Mesin/Alat', href: '/assets', icon: Wrench },
]

// Menu visible to ADMIN and TEKNISI only
const teknisiNavigation = [
    { name: 'Service Robot', href: '/service-robot', icon: Bot },
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
    const [openMenus, setOpenMenus] = useState<string[]>(['Spareparts'])
    const pathname = usePathname()

    // Auto open parent menu if child is active, otherwise default to Spareparts
    useEffect(() => {
        const allNav = [...navigation, ...teknisiNavigation, ...adminNavigation]
        let foundActiveDropdown = false

        allNav.forEach(item => {
            if ('children' in item && item.children) {
                const isChildActive = item.children.some(child => pathname === child.href)
                if (isChildActive) {
                    foundActiveDropdown = true
                    if (!openMenus.includes(item.name)) {
                        setOpenMenus([item.name])
                    }
                }
            }
        })

        // If no dropdown is active (top level menu), ensure Spareparts is open
        if (!foundActiveDropdown && !openMenus.includes('Spareparts')) {
            setOpenMenus(['Spareparts'])
        }
    }, [pathname])

    const toggleMenu = (name: string) => {
        setOpenMenus(prev =>
            prev.includes(name)
                ? []
                : [name]
        )
    }

    // Helper for nav items to avoid duplication
    const NavItem = ({ item, isCollapsed, isSubItem = false }: { item: any, isCollapsed: boolean, isSubItem?: boolean }) => {
        const hasChildren = 'children' in item && item.children && item.children.length > 0
        const isMenuOpen = openMenus.includes(item.name)
        const isActive = pathname === item.href
        const isChildActive = hasChildren && item.children.some((child: any) => pathname === child.href)

        if (hasChildren) {
            return (
                <div className="space-y-1">
                    <button
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                            'w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                            isChildActive
                                ? 'bg-primary/5 text-primary'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            isCollapsed && "md:justify-center md:px-2"
                        )}
                        title={isCollapsed ? item.name : undefined}
                    >
                        <item.icon
                            className={cn(
                                'flex-shrink-0 transition-colors duration-200',
                                'mr-3 h-5 w-5',
                                isChildActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                                isCollapsed && "md:mr-0 md:h-6 md:w-6"
                            )}
                        />
                        {!isCollapsed && (
                            <>
                                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                                    {item.name}
                                </span>
                                {isMenuOpen ? (
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                )}
                            </>
                        )}
                    </button>
                    {isMenuOpen && !isCollapsed && (
                        <div className="ml-4 space-y-1 border-l border-border pl-2">
                            {item.children.map((child: any) => (
                                <NavItem key={child.name} item={child} isCollapsed={isCollapsed} isSubItem={true} />
                            ))}
                        </div>
                    )}
                </div>
            )
        }

        return (
            <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                    setIsMobileOpen(false)
                    if (!isSubItem) {
                        setOpenMenus([])
                    }
                }}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && "md:justify-center md:px-2",
                    isSubItem && "py-2"
                )}
            >
                <item.icon
                    className={cn(
                        'flex-shrink-0 transition-colors duration-200',
                        'mr-3 h-5 w-5', // Base icon size and margin for expanded/mobile
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                        isCollapsed && "md:mr-0 md:h-6 md:w-6", // Override for desktop collapsed
                        isSubItem && "h-4 w-4"
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

    // Get current page title from navigation
    const getCurrentPageTitle = () => {
        const flattenNav = (nav: any[]): any[] => {
            return nav.reduce((acc, item) => {
                acc.push(item)
                if (item.children) {
                    acc.push(...flattenNav(item.children))
                }
                return acc
            }, [])
        }
        const allNav = flattenNav([...navigation, ...teknisiNavigation, ...adminNavigation])
        const current = allNav.find(item => pathname === item.href)
        return current?.name || 'Dashboard'
    }

    return (
        <>
            {/* Mobile Menu Button - Only show when sidebar is closed */}
            {!isMobileOpen && (
                <button
                    onClick={() => setIsMobileOpen(true)}
                    className="md:hidden fixed top-4 left-4 z-30 p-2.5 rounded-xl bg-card border border-border shadow-lg hover:bg-accent text-muted-foreground transition-colors"
                >
                    <PanelLeftOpen className="h-5 w-5" />
                </button>
            )}

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



                    {/* Service Robot menu - visible to ADMIN and TEKNISI */}
                    {['ADMIN', 'TEKNISI'].includes(userRole || '') && (
                        <>
                            <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                                <div className="border-t border-border" />
                                <p className={cn(
                                    "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                                    isOpen ? "px-3" : "text-center"
                                )}>
                                    {isOpen ? "Service" : "..."}
                                </p>
                            </div>
                            <nav className="space-y-1">
                                {teknisiNavigation.map((item) => (
                                    <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                                ))}
                            </nav>
                        </>
                    )}

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
                    {isOpen && <TimeDisplay />}

                    <Link href="/profile" className="block hover:opacity-80 transition-opacity">
                        {isOpen ? userProfile : (
                            <div className="hidden md:flex justify-center" title="User Profile">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    U
                                </div>
                            </div>
                        )}
                    </Link>

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
