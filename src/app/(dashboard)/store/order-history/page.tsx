import { getStoreOrderHistoryBatches, getStoreOrderHistory } from '@/app/actions/store-product'
import { getSystemSetting } from '@/app/actions/system-settings'
import { requireAuth, isAllowedForPage } from '@/lib/auth'
import { redirect } from 'next/navigation'
import OrderHistoryView from './order-history-view'


export default async function StoreOrderHistoryPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/purchased'); // Use same permission as purchased
    if (!allowed) redirect('/dashboard');

    const [batches, kursYuanStr, kursUsdStr, additionalFeeStr, shopeeAdminFeeStr, shopeeServiceFeeStr, tokpedAdminFeeStr, tokpedServiceFeeStr] = await Promise.all([
        getStoreOrderHistoryBatches(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD'),
        getSystemSetting('STORE_ADDITIONAL_FEE'),
        getSystemSetting('STORE_SHOPEE_ADMIN_FEE'),
        getSystemSetting('STORE_SHOPEE_SERVICE_FEE'),
        getSystemSetting('STORE_TOKOPEDIA_ADMIN_FEE'),
        getSystemSetting('STORE_TOKOPEDIA_SERVICE_FEE')
    ]);

    const kursYuan = kursYuanStr ? parseFloat(kursYuanStr) : undefined
    const kursUsd = kursUsdStr ? parseFloat(kursUsdStr) : undefined
    const additionalFee = additionalFeeStr ? parseFloat(additionalFeeStr) : 0
    const shopeeAdminFee = shopeeAdminFeeStr ? parseFloat(shopeeAdminFeeStr) : 0
    const shopeeServiceFee = shopeeServiceFeeStr ? parseFloat(shopeeServiceFeeStr) : 0
    const tokpedAdminFee = tokpedAdminFeeStr ? parseFloat(tokpedAdminFeeStr) : 0
    const tokpedServiceFee = tokpedServiceFeeStr ? parseFloat(tokpedServiceFeeStr) : 0

    // Fetch initial history for the latest batch if available
    const initialBatch = batches.length > 0 ? batches[0] : null
    const initialHistory = initialBatch ? await getStoreOrderHistory(initialBatch) : []

    return (
        <div className="space-y-8">
            <OrderHistoryView 
                initialBatches={batches}
                initialHistory={initialHistory}
                showSupplierColumn={session.user.role === 'ADMIN'}
                kursYuan={kursYuan}
                kursUsd={kursUsd}
                additionalFee={additionalFee}
                shopeeAdminFee={shopeeAdminFee}
                shopeeServiceFee={shopeeServiceFee}
                tokpedAdminFee={tokpedAdminFee}
                tokpedServiceFee={tokpedServiceFee}
            />
        </div>
    )
}
