import { getStoreSuppliers } from '@/app/actions/store-supplier'
import { getSystemSetting } from '@/app/actions/settings'
import StoreSupplierManager from '@/components/store/store-supplier-manager'
import CurrencyConversionManager from '@/components/store/currency-conversion-manager'
import StoreFeeManager from '@/components/store/store-fee-manager'
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function StoreSettingsPage() {
    const role = await getUserRole()
    if (role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const [suppliers, kursYuan, kursUsd, additionalFee] = await Promise.all([
        getStoreSuppliers(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD'),
        getSystemSetting('STORE_ADDITIONAL_FEE')
    ])

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Pengaturan Toko</h1>
                <p className="text-muted-foreground">Kelola data supplier dan konfigurasi mata uang</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Content */}
                <div className="lg:col-span-12 space-y-8">
                    <section>
                        <StoreSupplierManager initialSuppliers={suppliers} />
                    </section>

                    <hr className="border-border" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section>
                            <CurrencyConversionManager initialRates={{ KURS_YUAN: kursYuan, KURS_USD: kursUsd }} />
                        </section>

                        <section>
                            <StoreFeeManager initialFee={additionalFee} />
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
