'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Checkout', href: '/checkout', icon: ShoppingCart },
    { name: 'History', href: '/history', icon: LayoutDashboard },
]

export default function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col bg-[#0a0a0a] border-r border-white/10">
            <div className="flex h-16 items-center px-6 border-b border-white/10">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    StockManager
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
                                        ? 'bg-blue-600/10 text-blue-400'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                                        isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-white'
                                    )}
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    )
}
