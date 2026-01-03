'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, LogOut, BookOpen, Calendar, Users, Settings } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Product', href: '/catalogue', icon: BookOpen },
    { name: 'Sparepart', href: '/inventory', icon: Package },
    { name: 'Production Plan', href: '/production-plan', icon: Calendar },
    { name: 'Checkout', href: '/checkout', icon: ShoppingCart },
    { name: 'History', href: '/history', icon: LayoutDashboard },
]

const adminNavigation = [
    { name: 'Users', href: '/users', icon: Users },
    // { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
    userProfile: React.ReactNode
    userRole?: string
}

export default function Sidebar({ userProfile, userRole }: SidebarProps) {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col bg-card border-r border-border">
            <div className="flex h-16 items-center px-6 border-b border-border">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Ichibot Production
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-3">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                    )}
                                />
                                {item.name}
                            </Link>
                        )
                    })}

                    {userRole === 'ADMIN' && (
                        <>
                            <div className="pt-4 pb-2">
                                <div className="border-t border-border" />
                                <p className="px-3 pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Admin
                                </p>
                            </div>
                            {adminNavigation.map((item) => {
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                                            isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        )}
                                    >
                                        <item.icon
                                            className={cn(
                                                'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                                                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                            )}
                                        />
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </>
                    )}
                </nav>
            </div>

            <div className="p-4 border-t border-border space-y-4">
                {userProfile}


                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex flex-1 items-center justify-center px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </button>
            </div>
        </div>

    )
}
