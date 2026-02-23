
'use client'

import React, { useEffect, useRef } from 'react'
import Modal from '@/components/ui/modal'
import { Terminal, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LogEntry {
    message: string
    timestamp: string
}

interface SyncLogModalProps {
    isOpen: boolean
    onClose: () => void
    logs: LogEntry[]
    isComplete: boolean
    hasError: boolean
}

export default function SyncLogModal({
    isOpen,
    onClose,
    logs,
    isComplete,
    hasError
}: SyncLogModalProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    <span>Sinkronisasi WooCommerce</span>
                </div>
            }
            maxWidth="2xl"
        >
            <div className="flex flex-col gap-4">
                {/* Status Indicator */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="flex items-center gap-3">
                        {!isComplete ? (
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : hasError ? (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                        )}
                        <span className="font-medium">
                            {!isComplete ? 'Sedang menyinkronkan data...' : hasError ? 'Terjadi kesalahan' : 'Sinkronisasi selesai'}
                        </span>
                    </div>
                    {isComplete && (
                        <button
                            onClick={onClose}
                            className="text-sm font-medium text-primary hover:underline"
                        >
                            Tutup
                        </button>
                    )}
                </div>

                {/* Terminal Window */}
                <div
                    ref={scrollRef}
                    className="bg-zinc-950 text-zinc-300 font-mono text-xs p-4 rounded-xl h-[400px] overflow-y-auto custom-scrollbar border border-zinc-800"
                >
                    {logs.length === 0 && (
                        <div className="text-zinc-500 italic">Menunggu log...</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 flex gap-2">
                            <span className="text-zinc-600 shrink-0">
                                [{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                            </span>
                            <span className={cn(
                                "break-all",
                                log.message.startsWith('Error') || log.message.includes('CRITICAL') ? 'text-red-400' :
                                    log.message.includes('Success') || log.message.includes('selesai') ? 'text-green-400' : ''
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    {!isComplete && (
                        <div className="animate-pulse inline-block w-2 h-4 bg-zinc-500 ml-1 translate-y-0.5" />
                    )}
                </div>

                <p className="text-xs text-muted-foreground italic px-1">
                    *Jangan menutup halaman ini sampai proses sinkronisasi selesai untuk memastikan data terupdate sempurna.
                </p>
            </div>
        </Modal>
    )
}
