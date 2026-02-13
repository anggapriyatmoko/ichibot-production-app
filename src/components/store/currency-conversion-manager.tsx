'use client'

import { useState } from 'react'
import { Save, Loader2, Coins, RefreshCw } from 'lucide-react'
import { setSystemSetting } from '@/app/actions/settings'
import { useAlert } from '@/hooks/use-alert'

interface CurrencyRow {
    key: string
    label: string
    apiCurrency: string
    symbol: string
}

const CURRENCIES: CurrencyRow[] = [
    { key: 'KURS_YUAN', label: 'Yuan (CNY) ke IDR', apiCurrency: 'CNY', symbol: '¥' },
    { key: 'KURS_USD', label: 'USD ke IDR', apiCurrency: 'USD', symbol: '$' },
]

export default function CurrencyConversionManager({
    initialRates
}: {
    initialRates: Record<string, string | null | undefined>
}) {
    const [rates, setRates] = useState<Record<string, string>>(
        Object.fromEntries(CURRENCIES.map(c => [c.key, initialRates[c.key] || '0']))
    )
    const [saving, setSaving] = useState<Record<string, boolean>>({})
    const [fetching, setFetching] = useState<Record<string, boolean>>({})
    const { showAlert, showError } = useAlert()

    const fetchLatestRate = async (currency: CurrencyRow) => {
        setFetching(prev => ({ ...prev, [currency.key]: true }))
        try {
            const response = await fetch(`https://open.er-api.com/v6/latest/${currency.apiCurrency}`)
            const data = await response.json()

            if (data.result === 'success' && data.rates && data.rates.IDR) {
                const newRate = Math.round(data.rates.IDR).toString()
                setRates(prev => ({ ...prev, [currency.key]: newRate }))
                showAlert(`Kurs terbaru ${currency.label}: Rp ${newRate}`)
            } else {
                showError('Gagal mengambil data dari API')
            }
        } catch (error) {
            showError('Gagal menghubungkan ke API Kurs')
            console.error('Fetch error:', error)
        } finally {
            setFetching(prev => ({ ...prev, [currency.key]: false }))
        }
    }

    const handleSave = async (currency: CurrencyRow) => {
        setSaving(prev => ({ ...prev, [currency.key]: true }))
        try {
            const result = await setSystemSetting(currency.key, rates[currency.key])
            if (result.success) {
                showAlert(`Kurs ${currency.label} berhasil diperbarui`)
            } else {
                showError(result.error || 'Gagal memperbarui kurs')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        } finally {
            setSaving(prev => ({ ...prev, [currency.key]: false }))
        }
    }

    const fetchAllRates = async () => {
        for (const currency of CURRENCIES) {
            await fetchLatestRate(currency)
        }
    }

    const saveAllRates = async () => {
        for (const currency of CURRENCIES) {
            await handleSave(currency)
        }
    }

    const isAnyBusy = Object.values(saving).some(Boolean) || Object.values(fetching).some(Boolean)

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Coins className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Kurs Mata Uang</h2>
                            <p className="text-sm text-muted-foreground">Atur kurs konversi mata uang asing ke Rupiah (IDR)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchAllRates}
                            disabled={isAnyBusy}
                            className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Tarik Semua
                        </button>
                        <button
                            onClick={saveAllRates}
                            disabled={isAnyBusy}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Simpan Semua
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {CURRENCIES.map((currency) => (
                        <div key={currency.key} className="flex flex-col md:flex-row items-end gap-3">
                            <div className="flex-1 w-full space-y-1.5">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <span className="text-muted-foreground font-bold">{currency.symbol}</span>
                                    {currency.label}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">Rp</span>
                                    <input
                                        type="number"
                                        value={rates[currency.key]}
                                        onChange={(e) => setRates(prev => ({ ...prev, [currency.key]: e.target.value }))}
                                        placeholder="Masukkan nominal..."
                                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <button
                                    onClick={() => fetchLatestRate(currency)}
                                    disabled={fetching[currency.key] || saving[currency.key]}
                                    title={`Ambil kurs terbaru ${currency.label}`}
                                    className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-all shadow-sm active:scale-95 disabled:opacity-50 h-10 flex-1 md:flex-none"
                                >
                                    {fetching[currency.key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Tarik dari API
                                </button>
                                <button
                                    onClick={() => handleSave(currency)}
                                    disabled={saving[currency.key] || fetching[currency.key]}
                                    className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 h-10 min-w-[120px] flex-1 md:flex-none"
                                >
                                    {saving[currency.key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
