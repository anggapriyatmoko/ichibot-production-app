'use client'

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Download, FileText, Printer } from "lucide-react"
import { generatePriceListGroupDetailPdf } from "./generate-pdf"

interface PdfModalProps {
    isOpen: boolean
    onClose: () => void
    group: any
    items: any[]
}

export default function PriceListGroupPdfModal({
    isOpen,
    onClose,
    group,
    items
}: PdfModalProps) {
    const [loading, setLoading] = useState(true)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [pdfSize, setPdfSize] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen && group && items) {
            setLoading(true)
            setPdfUrl(null)

            // Generate PDF logic
            const generate = async () => {
                try {
                    const result = await generatePriceListGroupDetailPdf(group, items, true) as any
                    setPdfUrl(result.url)
                    setPdfSize(result.formattedSize)
                    setLoading(false)
                } catch (error) {
                    console.error("Failed to generate PDF", error)
                    setLoading(false)
                }
            }

            // Artificial delay for better UX
            setTimeout(generate, 500)
        }
    }, [isOpen, group, items])

    if (!isOpen || !mounted) return null

    const handleDownload = () => {
        if (!pdfUrl) return
        const link = document.createElement("a")
        link.href = pdfUrl
        link.download = `Daftar-Harga-${group.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handlePrint = () => {
        if (!pdfUrl) return
        const printWindow = window.open(pdfUrl, "_blank")
        if (printWindow) {
            printWindow.onload = () => {
                printWindow.print()
            }
        }
    }

    const modalContent = (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-[9999] backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8 pointer-events-none">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-200 relative overflow-hidden pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-50">
                                <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Preview Daftar Harga
                                </h2>
                                <p className="text-xs text-gray-500">
                                    {group?.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                disabled={loading}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 disabled:opacity-50"
                                title="Cetak"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={loading}
                                className="p-2 hover:bg-blue-50 rounded-xl transition-colors text-blue-600 disabled:opacity-50"
                                title="Unduh PDF"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* PDF Preview Area */}
                    <div className="flex-1 relative bg-gray-100 overflow-hidden flex flex-col items-center justify-center">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/90 backdrop-blur-md">
                                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        Memproses PDF...
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Mohon tunggu sebentar
                                    </p>
                                </div>
                            </div>
                        )}

                        {pdfUrl && (
                            <iframe
                                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                className="w-full h-full border-0"
                                title="PDF Preview"
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl shrink-0">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF Size: {pdfSize || '--'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2 text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <Download className="w-4 h-4" />
                                Unduh PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )

    return createPortal(modalContent, document.body)
}
