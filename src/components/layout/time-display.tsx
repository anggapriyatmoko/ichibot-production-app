'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

export default function TimeDisplay() {
    const [time, setTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => {
            setTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    if (!mounted) return null

    return (
        <div className="flex items-center gap-2 px-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-medium text-foreground">
                {time.toLocaleString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                })}
            </span>
        </div>
    )
}
