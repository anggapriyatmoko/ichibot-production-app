'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import { Building2, Save } from 'lucide-react'
import { BankAccountData, createBankAccount, updateBankAccount } from '@/app/actions/bank-account'
import { useAlert } from '@/hooks/use-alert'

interface AccountFormModalProps {
    isOpen: boolean
    onClose: () => void
    initialData?: BankAccountData | null
    onSuccess?: () => void
    kursYuan?: number
    kursUsd?: number
}

export default function AccountFormModal({ isOpen, onClose, initialData, onSuccess, kursYuan = 0, kursUsd = 0 }: AccountFormModalProps) {
    const [bankName, setBankName] = useState('')
    const [accountNumber, setAccountNumber] = useState('')
    const [accountName, setAccountName] = useState('')
    const [balance, setBalance] = useState('')
    const [currency, setCurrency] = useState('IDR')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { showAlert, showError } = useAlert()

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setBankName(initialData.bankName)
                setAccountNumber(initialData.accountNumber)
                setAccountName(initialData.accountName)
                setBalance(initialData.balance.toString())
                setCurrency(initialData.currency || 'IDR')
            } else {
                setBankName('')
                setAccountNumber('')
                setAccountName('')
                setBalance('')
                setCurrency('IDR')
            }
        }
    }, [isOpen, initialData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!bankName.trim() || balance === '') {
            showError('Mohon isi Nama Bank dan Saldo Awal')
            return
        }

        const balanceNum = parseFloat(balance.replace(/\./g, ''))
        if (isNaN(balanceNum)) {
            showError('Saldo tidak valid')
            return
        }

        setIsSubmitting(true)
        try {
            const data = { bankName, accountNumber, accountName, balance: balanceNum, currency }
            let result

            if (initialData) {
                result = await updateBankAccount(initialData.id, data)
            } else {
                result = await createBankAccount(data)
            }

            if (result.success) {
                showAlert(`Akun bank berhasil ${initialData ? 'diperbarui' : 'ditambahkan'}`)
                onSuccess?.()
                onClose()
            } else {
                showError(result.error || 'Terjadi kesalahan sistem')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span>{initialData ? 'Edit Akun Bank' : 'Tambah Akun Bank'}</span>
                </div>
            }
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                        Nama Bank
                    </label>
                    <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Misal: BCA, Mandiri"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary outline-none transition-colors"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                        Nomor Rekening <span className="text-muted-foreground font-normal">(Opsional)</span>
                    </label>
                    <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Masukkan nomor rekening"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary outline-none transition-colors"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                        Nama Pemilik / Atas Nama <span className="text-muted-foreground font-normal">(Opsional)</span>
                    </label>
                    <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Nama sesuai buku tabungan"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary outline-none transition-colors"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                        Mata Uang
                    </label>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary outline-none transition-colors"
                    >
                        <option value="IDR">Rupiah (IDR)</option>
                        <option value="USD">Dolar AS (USD) - Kurs: Rp {kursUsd.toLocaleString('id-ID')}</option>
                        <option value="CNY">Yuan (CNY) - Kurs: Rp {kursYuan.toLocaleString('id-ID')}</option>
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                        Saldo Awal ({currency})
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={balance}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            // format with dots
                            const formatted = val.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                            setBalance(formatted)
                        }}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:border-primary outline-none transition-colors"
                        required
                    />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {initialData ? 'Simpan' : 'Tambah'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
