'use client'

import { useState } from 'react'
import { Save, Loader2, Percent, ShoppingBag } from 'lucide-react'
import { setSystemSetting } from '@/app/actions/settings'
import { useAlert } from '@/hooks/use-alert'

export default function StoreMarketplaceFeeManager({
    initialShopeeAdmin,
    initialShopeeService,
    initialTokpedAdmin,
    initialTokpedService
}: {
    initialShopeeAdmin: string | null | undefined,
    initialShopeeService: string | null | undefined,
    initialTokpedAdmin: string | null | undefined,
    initialTokpedService: string | null | undefined
}) {
    const [fees, setFees] = useState({
        shopeeAdmin: initialShopeeAdmin || '0',
        shopeeService: initialShopeeService || '0',
        tokpedAdmin: initialTokpedAdmin || '0',
        tokpedService: initialTokpedService || '0'
    })
    const [isSaving, setIsSaving] = useState(false)
    const { showAlert, showError } = useAlert()

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const results = await Promise.all([
                setSystemSetting('STORE_SHOPEE_ADMIN_FEE', fees.shopeeAdmin),
                setSystemSetting('STORE_SHOPEE_SERVICE_FEE', fees.shopeeService),
                setSystemSetting('STORE_TOKOPEDIA_ADMIN_FEE', fees.tokpedAdmin),
                setSystemSetting('STORE_TOKOPEDIA_SERVICE_FEE', fees.tokpedService)
            ])
            
            if (results.every(r => r.success)) {
                showAlert('Biaya marketplace berhasil diperbarui')
            } else {
                showError('Gagal memperbarui satu atau lebih pengaturan biaya')
            }
        } catch (error) {
            showError('Terjadi kesalahan sistem')
        } finally {
            setIsSaving(false)
        }
    }

    const handleChange = (key: keyof typeof fees, value: string) => {
        setFees(prev => ({ ...prev, [key]: value }))
    }

    return (
        <div className="h-full">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <ShoppingBag className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Marketplace Fee (Shopee & Tokopedia)</h2>
                        <p className="text-sm text-muted-foreground">Atur persentase pemotongan per pesanan di marketplace</p>
                    </div>
                </div>

                <div className="space-y-6 flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {/* Shopee Configuration */}
                        <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-[#EE4D2D]"></div>
                            <h3 className="font-medium text-foreground text-sm uppercase tracking-wider text-[#EE4D2D]">Shopee</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Biaya Administrasi (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={fees.shopeeAdmin}
                                            onChange={(e) => handleChange('shopeeAdmin', e.target.value)}
                                            placeholder="0"
                                            className="w-full pr-10 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                        />
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Biaya Layanan (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={fees.shopeeService}
                                            onChange={(e) => handleChange('shopeeService', e.target.value)}
                                            placeholder="0"
                                            className="w-full pr-10 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                        />
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tokopedia Configuration */}
                        <div className="space-y-4 border border-border rounded-xl p-4 bg-muted/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-[#00AA5B]"></div>
                            <h3 className="font-medium text-foreground text-sm uppercase tracking-wider text-[#00AA5B]">Tokopedia</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Biaya Administrasi (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={fees.tokpedAdmin}
                                            onChange={(e) => handleChange('tokpedAdmin', e.target.value)}
                                            placeholder="0"
                                            className="w-full pr-10 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                        />
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Biaya Layanan (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={fees.tokpedService}
                                            onChange={(e) => handleChange('tokpedService', e.target.value)}
                                            placeholder="0"
                                            className="w-full pr-10 pl-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none transition-all"
                                        />
                                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-sm active:scale-95 disabled:opacity-50 h-10 min-w-[120px]"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
