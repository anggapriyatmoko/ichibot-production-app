'use client'

import { useState } from 'react'
import { Loader2, Copy, ExternalLink, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/modal'
import { createPayment } from '@/app/actions/store-payment'
import { useAlert } from '@/hooks/use-alert'
import { useRouter } from 'next/navigation'

interface CreatePaymentModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreatePaymentModal({ isOpen, onClose }: CreatePaymentModalProps) {
    const [nama, setNama] = useState('')
    const [nominal, setNominal] = useState<number | ''>('')
    const [nominalDisplay, setNominalDisplay] = useState('')
    const [uniqueCode, setUniqueCode] = useState<number | null>(null)
    const [keterangan, setKeterangan] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<{ invoiceNumber: string; paymentUrl: string } | null>(null)
    const [copied, setCopied] = useState(false)
    const { showError } = useAlert()
    const router = useRouter()

    const formatRupiah = (value: string) => {
        const num = value.replace(/\D/g, '')
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }

    const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '')
        const num = raw ? parseInt(raw, 10) : ''
        setNominal(num)
        setNominalDisplay(raw ? formatRupiah(raw) : '')
        setUniqueCode(null)
    }

    const generateUniqueCode = () => {
        const code = Math.floor(Math.random() * 99) + 1 // 1-99
        setUniqueCode(code)
    }

    const removeUniqueCode = () => {
        setUniqueCode(null)
    }

    const totalAmount = nominal ? Number(nominal) + (uniqueCode || 0) : 0

    const resetForm = () => {
        setNama('')
        setNominal('')
        setNominalDisplay('')
        setUniqueCode(null)
        setKeterangan('')
        setResult(null)
        setCopied(false)
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nama.trim() || !nominal || nominal <= 0) return

        setIsSubmitting(true)
        try {
            const res = await createPayment({
                nama: nama.trim(),
                keterangan: keterangan.trim() || undefined,
                nominal: totalAmount,
            })

            if (res.success && res.data) {
                setResult({
                    invoiceNumber: res.data.invoiceNumber,
                    paymentUrl: res.data.paymentUrl,
                })
                router.refresh()
            } else {
                showError(res.error || 'Gagal membuat payment')
            }
        } catch {
            showError('Terjadi kesalahan')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCopy = async () => {
        if (!result?.paymentUrl) return
        await navigator.clipboard.writeText(result.paymentUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Success view
    if (result) {
        return (
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title="Payment Berhasil Dibuat"
                footer={
                    <div className="flex justify-end">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 bg-muted/50 border border-border rounded-xl">
                        <p className="text-sm text-muted-foreground">Invoice</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">
                            {result.invoiceNumber}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                            Link Pembayaran
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={result.paymentUrl}
                                className="flex-1 px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg truncate"
                            />
                            <button
                                onClick={handleCopy}
                                className="px-3 py-2 text-sm font-medium bg-muted border border-border rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-1.5"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Tersalin' : 'Salin'}
                            </button>
                        </div>
                    </div>

                    <a
                        href={result.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Buka Halaman Pembayaran
                    </a>
                </div>
            </Modal>
        )
    }

    // Form view
    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Buat Payment Baru"
            footer={
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        form="create-payment-form"
                        type="submit"
                        disabled={isSubmitting || !nama.trim() || !nominal || nominal <= 0}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSubmitting ? 'Memproses...' : 'Buat Payment'}
                    </button>
                </div>
            }
        >
            <form id="create-payment-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Nama <span className="text-destructive">*</span>
                    </label>
                    <input
                        type="text"
                        value={nama}
                        onChange={e => setNama(e.target.value)}
                        placeholder="Nama customer"
                        required
                        className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Nominal (Rp) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={nominalDisplay}
                            onChange={handleNominalChange}
                            placeholder="0"
                            required
                            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <button
                            type="button"
                            onClick={uniqueCode ? removeUniqueCode : generateUniqueCode}
                            className={cn(
                                'text-xs font-bold px-3 py-1.5 rounded-md transition-colors',
                                uniqueCode
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            )}
                        >
                            {uniqueCode ? 'Hapus Kode Unik' : 'Generate Kode Unik'}
                        </button>
                        {uniqueCode !== null && (
                            <button
                                type="button"
                                onClick={generateUniqueCode}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                                Acak Ulang
                            </button>
                        )}
                    </div>
                    {uniqueCode !== null && nominal && (
                        <div className="mt-2 p-2.5 bg-muted/50 border border-border rounded-lg text-sm space-y-1">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Nominal</span>
                                <span>Rp {formatRupiah(String(nominal))}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Kode Unik</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">+{uniqueCode}</span>
                            </div>
                            <div className="flex justify-between font-semibold border-t border-border pt-1">
                                <span>Total Bayar</span>
                                <span>Rp {formatRupiah(String(totalAmount))}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        Keterangan
                    </label>
                    <textarea
                        value={keterangan}
                        onChange={e => setKeterangan(e.target.value)}
                        placeholder="Keterangan pembayaran (opsional)"
                        rows={3}
                        className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                </div>
            </form>
        </Modal>
    )
}
