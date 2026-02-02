'use client'

import { useState, useRef, useEffect } from 'react'
import { User, LogOut, Shield, ChevronDown, Settings, User as UserIcon } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface UserNavProps {
    user: {
        name?: string | null
        email?: string | null
        role?: string | null
        department?: string | null
    }
}

export default function UserNav({ user }: UserNavProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        localStorage.clear()
        sessionStorage.clear()
        await signOut({ callbackUrl: '/login' })
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-accent rounded-xl transition-all border border-transparent hover:border-border"
            >
                <div className="flex items-center gap-3 px-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-foreground leading-none">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">
                            {user.role} {user.department ? `• ${user.department}` : ''}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 shadow-sm">
                        <UserIcon className="w-5 h-5" />
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                </div>
            </button>

            {isOpen && (
                <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl shadow-black/5 animate-in fade-in zoom-in duration-200 z-50 overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate font-mono">{user.email}</p>
                    </div>

                    <div className="p-2">
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                            <User className="w-4 h-4 text-muted-foreground" />
                            Profile Settings
                        </Link>
                        {user.role === 'ADMIN' && (
                            <Link
                                href="/settings"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                            >
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                System Settings
                            </Link>
                        )}
                    </div>

                    <div className="p-2 border-t border-border">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-semibold"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
