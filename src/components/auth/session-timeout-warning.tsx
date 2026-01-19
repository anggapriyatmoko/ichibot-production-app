'use client'

import { Clock, LogOut, RefreshCw } from 'lucide-react'

interface SessionTimeoutWarningProps {
    remainingSeconds: number
    onExtend: () => void
    onLogout: () => void
}

export function SessionTimeoutWarning({
    remainingSeconds,
    onExtend,
    onLogout
}: SessionTimeoutWarningProps) {
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60

    const formatTime = () => {
        if (minutes > 0) {
            return `${minutes} menit ${seconds} detik`
        }
        return `${seconds} detik`
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
                {/* Icon */}
                <div className="mb-4 flex justify-center">
                    <div className="relative">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        {/* Pulse animation */}
                        <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
                    Sesi Akan Berakhir
                </h2>

                {/* Message */}
                <p className="mb-4 text-center text-gray-600 dark:text-gray-400">
                    Sesi Anda akan berakhir karena tidak ada aktivitas.
                    Anda akan logout otomatis dalam:
                </p>

                {/* Countdown */}
                <div className="mb-6 rounded-xl bg-gray-100 p-4 dark:bg-gray-800">
                    <p className="text-center text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {formatTime()}
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onLogout}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout Sekarang
                    </button>
                    <button
                        onClick={onExtend}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 font-medium text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-xl"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Perpanjang Sesi
                    </button>
                </div>
            </div>
        </div>
    )
}
