'use client'

import { useState } from 'react'
import { Save, Loader2, Percent, Info } from 'lucide-react'
import { setSystemSetting } from '@/app/actions/settings'
import { useAlert } from '@/hooks/use-alert'

export default function StoreFeeManager({
    initialFee
}: {
    initialFee: string | null | undefined
}) {
    const [fee, setFee] = useState(initialFee || '0')
    const [isSaving, setIsSaving] = useState(false)
    const { showAlert, showError } = useAlert()

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const result = await setSystemSetting('STORE_ADDITIONAL_FEE', fee)
            if (result.success) {
                showAlert('Persentase fee berhasil diperbarui')
            } else {
                showError(result.error || 'Gagal memperbarui fee')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="h-full">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Percent className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Additional Fee Pembelian</h2>
                        <p className="text-sm text-muted-foreground">Atur persentase biaya tambahan untuk perhitungan total pembelian</p>
                    </div>
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="flex flex-col md:flex-row items-end gap-3">
                        <div className="flex-1 w-full space-y-1.5">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                Persentase Fee (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={fee}
                                    onChange={(e) => setFee(e.target.value)}
                                    placeholder="0"
                                    className="w-full pr-10 pl-4 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 h-10 min-w-[120px] w-full md:w-auto font-bold"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan
                        </button>
                    </div>

                    <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-lg flex gap-3 mt-4">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                            Fee ini akan ditambahkan ke <strong>Total Pembelian (IDR)</strong> pada halaman Produk Terbeli.
                            Misal: Total Rp 1.000.000 dengan Fee 10% maka Total Include Fee menjadi Rp 1.100.000.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
