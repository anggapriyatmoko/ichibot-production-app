'use client'

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Download, FileText, Printer, Loader2 } from "lucide-react"
import jsPDF from "jspdf"
import { toPng } from "html-to-image"

interface PayrollPdfModalProps {
    isOpen: boolean
    onClose: () => void
    payslipData: any // from getPayslipData
}

export default function PayrollPdfModal({
    isOpen,
    onClose,
    payslipData
}: PayrollPdfModalProps) {
    const [loading, setLoading] = useState(false)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [pdfSize, setPdfSize] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const templateRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen && payslipData) {
            setLoading(true)
            setPdfUrl(null)

            // Generate PDF logic by waiting a bit for fonts to load
            const timer = setTimeout(generatePdf, 800)
            return () => clearTimeout(timer)
        }
    }, [isOpen, payslipData])

    const generatePdf = async () => {
        if (!templateRef.current) return

        try {
            // Using toJpeg with quality parameter reduces size significantly compared to toPng
            const { toJpeg } = await import('html-to-image')
            const imgData = await toJpeg(templateRef.current, {
                pixelRatio: 1.5, // Reduced from 2 to save space
                quality: 0.8,    // 80% JPEG quality
                backgroundColor: '#ffffff',
                cacheBust: true,
                skipFonts: false
            })

            const tempPdf = new jsPDF()
            const imgProps = tempPdf.getImageProperties(imgData)

            const pdfWidth = 210 // A4 width in mm
            const imgHeightInMm = (imgProps.height * pdfWidth) / imgProps.width

            const pdfHeight = Math.max(297, imgHeightInMm) // At least A4 height (297mm)

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight],
                compress: true
            })

            // Add the compressed JPEG
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeightInMm, undefined, 'FAST')

            const blob = pdf.output('blob')
            const size = formatBytes(blob.size)
            const url = URL.createObjectURL(blob)

            setPdfUrl(url)
            setPdfSize(size)
        } catch (error) {
            console.error("Failed to generate PDF", error)
        } finally {
            setLoading(false)
        }
    }

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    if (!isOpen || !mounted) return null

    const handleDownload = () => {
        if (!pdfUrl) return
        const link = document.createElement("a")
        link.href = pdfUrl
        const periodStr = `${payslipData.year}-${payslipData.month.toString().padStart(2, '0')}`
        const nameStr = payslipData.user.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
        link.download = `${periodStr}-${nameStr}.pdf`
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

    const { user, items, basicSalary, netSalary, month, year, attendanceSummary, period } = payslipData || {}

    // Group items
    const additions = items?.filter((i: any) => i.component.type === 'ADDITION') || []
    const deductions = items?.filter((i: any) => i.component.type === 'DEDUCTION') || []

    const totalAdditions = additions.reduce((sum: number, item: any) => sum + item.amount, 0)
    const totalDeductions = deductions.reduce((sum: number, item: any) => sum + item.amount, 0)
    const totalPendapatan = basicSalary + totalAdditions

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
    }

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    const periodName = `${monthNames[month - 1]} ${year}`
    const periodStart = period?.startDate ? new Date(period.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'
    const periodEnd = period?.endDate ? new Date(period.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

    const modalContent = (
        <>
            <div
                className="fixed inset-0 bg-black/60 z-[9999] backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
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
                                <h2 className="text-lg font-semibold text-gray-900">Preview Slip Gaji</h2>
                                <p className="text-xs text-gray-500">{user?.name} - {periodName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrint} disabled={loading} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 disabled:opacity-50" title="Cetak">
                                <Printer className="w-5 h-5" />
                            </button>
                            <button onClick={handleDownload} disabled={loading} className="p-2 hover:bg-blue-50 rounded-xl transition-colors text-blue-600 disabled:opacity-50" title="Unduh PDF">
                                <Download className="w-5 h-5" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* PDF Preview Area */}
                    <div className="flex-1 relative bg-gray-100 overflow-hidden flex flex-col items-center py-8 overflow-y-auto">
                        {loading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/90 backdrop-blur-md">
                                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-gray-900">Memproses PDF...</h3>
                                    <p className="text-sm text-gray-500">Mohon tunggu sebentar</p>
                                </div>
                            </div>
                        )}

                        {pdfUrl ? (
                            <iframe src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`} className="w-full h-full border-0 absolute inset-0" title="PDF Preview" />
                        ) : (
                            <div className="opacity-0 absolute top-[-9999px] left-[-9999px]">
                                {/* Payslip UI Template for Canvas Conversion */}
                                <div ref={templateRef} className="w-[800px] bg-white text-gray-900 p-8 pb-12 font-sans overflow-hidden">
                                    {/* Header Slip */}
                                    <div className="bg-[#2a5999] text-white p-8 text-center rounded-t-sm mb-6">
                                        <h1 className="text-3xl font-bold tracking-widest mb-3 uppercase">Slip Gaji</h1>
                                        <h2 className="text-xl font-bold mb-1">PT Gagas Anagata Nusantara (ICHIBOT)</h2>
                                        <p className="text-sm text-blue-100 font-light">Jl. Dworowati No.11, RT.05/RW.35, Nglarang, Malangrejo, Kec. Ngemplak, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55584</p>
                                    </div>

                                    {/* User Info */}
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 px-4">
                                        <div className="grid grid-cols-2">
                                            <span className="font-bold text-gray-700">Nama/NIK:</span>
                                            <span className="text-gray-600">{user?.name}</span>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <span className="font-bold text-gray-700">Jabatan:</span>
                                            <span className="text-gray-600">{user?.role}</span>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <span className="font-bold text-gray-700">Periode Gaji:</span>
                                            <span className="text-gray-600">{periodStart} - {periodEnd}</span>
                                        </div>
                                        <div className="grid grid-cols-2">
                                            <span className="font-bold text-gray-700">Bulan:</span>
                                            <span className="text-gray-600">{periodName}</span>
                                        </div>
                                    </div>

                                    <hr className="border-gray-200 mb-6" />

                                    {/* Financial Breakdown */}
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        {/* Pendapatan */}
                                        <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h3 className="text-[#2a5999] font-bold text-lg border-b-2 border-[#2a5999] pb-2 mb-4">Pendapatan</h3>

                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-gray-600">Gaji Pokok</span>
                                                <span className="font-semibold text-[#2a5999]">{formatRupiah(basicSalary)}</span>
                                            </div>

                                            {additions.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center mb-3">
                                                    <span className="text-gray-600">{item.component.name}</span>
                                                    <span className="font-semibold text-[#2a5999]">{formatRupiah(item.amount)}</span>
                                                </div>
                                            ))}

                                            <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center">
                                                <span className="font-bold text-gray-800">Total Pendapatan</span>
                                                <span className="font-bold text-[#2a5999] text-lg">{formatRupiah(totalPendapatan)}</span>
                                            </div>
                                        </div>

                                        {/* Potongan */}
                                        <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h3 className="text-[#2563eb] font-bold text-lg border-b-2 border-gray-200 pb-2 mb-4">Potongan</h3>

                                            {deductions.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center mb-3">
                                                    <span className="text-gray-600">{item.component.name}</span>
                                                    <span className="font-semibold text-[#2563eb]">{formatRupiah(item.amount)}</span>
                                                </div>
                                            ))}

                                            <div className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center" style={{ marginTop: deductions.length > 0 ? '1rem' : '3.5rem' }}>
                                                <span className="font-bold text-gray-800">Total Potongan</span>
                                                <span className="font-bold text-[#2563eb] text-lg">{formatRupiah(totalDeductions)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Net Income */}
                                    <div className="bg-[#2a5999] text-white p-8 rounded-xl text-center mb-6 shadow-md">
                                        <p className="text-blue-200 font-medium tracking-widest text-sm mb-1 uppercase">Pendapatan Bersih</p>
                                        <h2 className="text-4xl font-bold">{formatRupiah(netSalary)}</h2>
                                    </div>

                                    {/* Attendance Summary */}
                                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                        <h3 className="text-[#2a5999] font-bold text-lg border-b-2 border-[#2a5999] pb-2 mb-6">Ringkasan Kehadiran</h3>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">{attendanceSummary?.totalWorkDays - (attendanceSummary?.absentCount + attendanceSummary?.permitCount) || 0}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Hadir</div>
                                            </div>
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">{attendanceSummary?.absentCount || 0}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tidak Hadir</div>
                                            </div>
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">{attendanceSummary?.permitCount || 0}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Izin</div>
                                            </div>
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">{attendanceSummary?.absentCount || 0}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Alpha</div>
                                            </div>
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">{attendanceSummary?.lateMinutes || 0}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Terlambat (mnt)</div>
                                            </div>
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">0</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Cuti</div>
                                            </div>
                                            <div className="bg-white p-4 text-center rounded-lg shadow-sm border border-gray-100">
                                                <div className="text-[#2a5999] text-3xl font-bold mb-1">0</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Sakit</div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl shrink-0">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Format: A4 | PDF Size: {pdfSize || '--'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="px-5 py-2 text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">Tutup</button>
                            <button onClick={handleDownload} disabled={loading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50">
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
