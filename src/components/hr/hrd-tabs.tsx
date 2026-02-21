'use client'

import { ReactNode } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
    id: string
    label: string
    icon: ReactNode
    content: ReactNode
}

interface HRDTabsProps {
    tabs: Tab[]
    defaultTab?: string
}

export default function HRDTabs({ tabs, defaultTab }: HRDTabsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const activeTabId = searchParams.get('tab') || defaultTab || tabs[0]?.id

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tabId)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

    return (
        <div className="flex flex-col gap-6">
            <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex bg-muted/50 p-1 rounded-xl w-max min-w-full">
                    {tabs.map((tab) => {
                        const isActive = activeTabId === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-background text-primary shadow-sm ring-1 ring-border"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <div className={cn(
                                    "flex items-center justify-center transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {tab.icon}
                                </div>
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab?.content}
            </div>
        </div>
    )
}
