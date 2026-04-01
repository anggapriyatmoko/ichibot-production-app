'use client'

import { useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Auto-reload if the error is a stale server action (deployment mismatch)
        if (error.message?.includes('Failed to find Server Action') || 
            error.message?.includes('older or newer deployment')) {
            window.location.reload()
        }
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-foreground">Terjadi Kesalahan</h2>
                    <p className="text-sm text-muted-foreground">
                        Kemungkinan karena ada pembaruan aplikasi. Silakan muat ulang halaman.
                    </p>
                </div>
                <div className="flex flex-col gap-3 items-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Muat Ulang Halaman
                    </button>
                    <button
                        onClick={reset}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
                    >
                        Atau coba lagi tanpa reload
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground/50 font-mono">
                    {error.digest && `Digest: ${error.digest}`}
                </p>
            </div>
        </div>
    )
}
