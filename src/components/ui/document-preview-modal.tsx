'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import { Download, ExternalLink, Printer } from 'lucide-react'

interface DocumentPreviewModalProps {
    document: { url: string; name: string } | null
    onClose: () => void
}

export default function DocumentPreviewModal({ document, onClose }: DocumentPreviewModalProps) {
    const [fileSize, setFileSize] = useState('')

    useEffect(() => {
        if (document?.url) {
            setFileSize('')
            // Try fetching just the headers to get the file size
            fetch(document.url, { method: 'HEAD' })
                .then(res => {
                    if (!res.ok) throw new Error('HEAD request failed')
                    const length = res.headers.get('content-length')
                    if (length) {
                        const bytes = parseInt(length, 10)
                        if (bytes >= 1024 * 1024) {
                            setFileSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`)
                        } else {
                            setFileSize(`${(bytes / 1024).toFixed(1)} KB`)
                        }
                    } else {
                        throw new Error('No content-length')
                    }
                })
                .catch(() => {
                    // Fallback to GET Blob if HEAD is not allowed (CORS, etc.) or no content-length
                    fetch(document.url, { method: 'GET' })
                        .then(res => res.blob())
                        .then(blob => {
                            const bytes = blob.size
                            if (bytes >= 1024 * 1024) {
                                setFileSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`)
                            } else {
                                setFileSize(`${(bytes / 1024).toFixed(1)} KB`)
                            }
                        })
                        .catch(() => {
                            setFileSize('Tidak diketahui')
                        })
                })
        }
    }, [document])

    if (!document) return null

    const handlePrint = () => {
        const printWindow = window.open(document.url, "_blank")
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print()
            }
        }
    }

    return (
        <Modal
            isOpen={!!document}
            onClose={onClose}
            title={document.name}
            maxWidth="5xl"
            footer={
                <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium text-muted-foreground truncate max-w-[50%]">
                        {fileSize ? `Ukuran File: ${fileSize}` : 'Menghitung ukuran...'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="hidden sm:flex px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-medium rounded-lg items-center gap-2 transition-colors border border-border"
                        >
                            <Printer className="w-4 h-4" />
                            Cetak
                        </button>
                        <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span className="hidden sm:inline">Buka Tab Baru</span>
                        </a>
                        <a
                            href={document.url}
                            download={document.name}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Unduh
                        </a>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            }
        >
            <div className="w-full h-[75vh] bg-muted/30">
                <iframe
                    src={`${document.url}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                />
            </div>
        </Modal>
    )
}
