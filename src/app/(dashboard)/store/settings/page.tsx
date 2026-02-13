import { getStoreSuppliers } from '@/app/actions/store-supplier'
import { getSystemSetting } from '@/app/actions/settings'
import StoreSupplierManager from '@/components/store/store-supplier-manager'
import CurrencyConversionManager from '@/components/store/currency-conversion-manager'
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function StoreSettingsPage() {
    const role = await getUserRole()
    if (role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const [suppliers, kursYuan, kursUsd] = await Promise.all([
        getStoreSuppliers(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD')
    ])

    return (
        <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Pengaturan Toko</h1>
                <p className="text-muted-foreground">Kelola data supplier dan konfigurasi mata uang</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Suppliers */}
                <div className="lg:col-span-12 space-y-6">
                    <section>
                        <StoreSupplierManager initialSuppliers={suppliers} />
                    </section>

                    <hr className="border-border" />

                    <section>
                        <CurrencyConversionManager initialRates={{ KURS_YUAN: kursYuan, KURS_USD: kursUsd }} />
                    </section>
                </div>
            </div>
        </div>
    )
}
