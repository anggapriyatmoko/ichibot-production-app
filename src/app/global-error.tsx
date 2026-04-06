'use client'

import { useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Global error:', error)

        // Auto-reload on stale server action errors (happens after redeployment)
        if (
            error.message?.includes('Failed to find Server Action') ||
            error.message?.includes('Server Action') ||
            error.digest?.includes('NEXT_NOT_FOUND')
        ) {
            // Clear caches and force a full page reload
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name))
                })
            }
            window.location.reload()
        }
    }, [error])

    return (
        <html>
            <body className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
                    <p className="text-gray-500 mb-6 text-sm">
                        Halaman mungkin sudah diperbarui. Silakan muat ulang halaman.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Muat Ulang Halaman
                        </button>
                        <button
                            onClick={() => reset()}
                            className="w-full px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
