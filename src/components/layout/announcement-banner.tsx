'use client'

import { useEffect, useState } from 'react'
import { getActiveAnnouncementsForUser } from '@/app/actions/announcement'
import { getSystemSetting } from '@/app/actions/settings'
import { Megaphone } from 'lucide-react'

interface Announcement {
    id: string
    content: string
}

export default function AnnouncementBanner() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [speedPerItem, setSpeedPerItem] = useState(12)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [activeAnnouncements, speedSetting] = await Promise.all([
                    getActiveAnnouncementsForUser(),
                    getSystemSetting('ANNOUNCEMENT_SPEED')
                ])
                setAnnouncements(activeAnnouncements as any)
                if (speedSetting) {
                    setSpeedPerItem(parseInt(speedSetting) || 12)
                }
            } catch (error) {
                console.error('Failed to fetch data', error)
            }
        }

        fetchData()

        const interval = setInterval(fetchData, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    if (announcements.length === 0) return null

    const duration = announcements.length * speedPerItem

    return (
        <div className="hidden md:flex flex-1 mx-8 relative overflow-hidden bg-primary/5 border border-primary/20 rounded-full h-9 items-center px-4">
            <div className="flex-shrink-0 z-20 bg-background/90 pr-4 flex items-center gap-2 border-r border-primary/10 h-full absolute left-0 pl-4 py-1">
                <Megaphone className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-bold text-primary">INFO</span>
            </div>

            <div className="w-full flex items-center relative h-full ml-[80px] overflow-hidden mask-gradient">
                <div className="flex select-none">
                    <MarqueeContent announcements={announcements} duration={duration} />
                    <MarqueeContent announcements={announcements} duration={duration} aria-hidden="true" />
                </div>
            </div>

            <style jsx global>{`
                .animate-marquee-seamless {
                    animation: marquee-seamless linear infinite;
                }
                
                @keyframes marquee-seamless {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-100%);
                    }
                }
                
                .mask-gradient {
                    mask-image: linear-gradient(to right, transparent, black 20px, black 95%, transparent);
                }
            `}</style>
        </div>
    )
}

function MarqueeContent({ announcements, duration, ...props }: { announcements: Announcement[], duration: number } & React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className="flex items-center gap-12 pr-12 min-w-full shrink-0 animate-marquee-seamless"
            style={{ animationDuration: `${duration}s` }}
            {...props}
        >
            {announcements.map((ann, index) => (
                <div key={`${ann.id}-${index}`} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                        {index + 1}
                    </div>
                    <span className="text-sm font-medium text-foreground whitespace-nowrap">
                        {ann.content}
                    </span>
                </div>
            ))}
        </div>
    )
}
