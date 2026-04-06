'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const [isReloading, setIsReloading] = useState(false)

    useEffect(() => {
        console.error('Dashboard error:', error)

        // Auto-reload on stale server action errors (happens after redeployment)
        const isStaleActionError =
            error.message?.includes('Failed to find Server Action') ||
            error.message?.includes('fetch failed') ||
            error.message?.includes('Load failed')

        if (isStaleActionError) {
            setIsReloading(true)
            // Clear browser caches
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name))
                })
            }
            // Short delay then reload
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        }
    }, [error])

    if (isReloading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-medium">Memuat ulang halaman...</p>
                <p className="text-sm text-muted-foreground/60">Versi baru terdeteksi</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2">Terjadi Kesalahan</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                    Halaman gagal dimuat. Ini mungkin terjadi setelah pembaruan sistem.
                </p>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Muat Ulang
                </button>
                <button
                    onClick={() => reset()}
                    className="px-6 py-2.5 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors"
                >
                    Coba Lagi
                </button>
            </div>
        </div>
    )
}
