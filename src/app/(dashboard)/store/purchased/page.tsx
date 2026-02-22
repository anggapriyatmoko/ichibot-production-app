import { getStorePurchasedProducts } from '@/app/actions/store-product'
import { getSystemSetting } from '@/app/actions/system-settings'
import StoreProductList from '@/components/store/store-product-list'
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic'

async function StorePurchasedContent({ userRole }: { userRole: string }) {
    const [products, kursYuanStr, kursUsdStr, additionalFeeStr] = await Promise.all([
        getStorePurchasedProducts(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD'),
        getSystemSetting('STORE_ADDITIONAL_FEE')
    ]);
    const kursYuan = kursYuanStr ? parseFloat(kursYuanStr) : undefined
    const kursUsd = kursUsdStr ? parseFloat(kursUsdStr) : undefined
    const additionalFee = additionalFeeStr ? parseFloat(additionalFeeStr) : 0

    return (
        <StoreProductList
            initialProducts={products}
            showPurchasedStyles={false}
            showPurchasedAt={true}
            showSyncButton={false}
            showSupplierColumn={userRole === 'ADMIN'}
            showPurchaseColumns={true}
            kursYuan={kursYuan}
            kursUsd={kursUsd}
            additionalFee={additionalFee}
        />
    );
}

export default async function StorePurchasedPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/purchased', ['ADMIN', 'USER', 'TEKNISI', 'HRD', 'ADMINISTRASI']);
    if (!allowed) redirect('/dashboard');


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Produk Terbeli</h1>
                <p className="text-muted-foreground">
                    Daftar produk yang sudah ditandai sebagai &quot;Beli&quot; (Purchased).
                </p>
            </div>

            <Suspense fallback={<StoreSkeleton showSyncButton={false} showSupplierColumn={session.user.role === 'ADMIN'} />}>
                <StorePurchasedContent userRole={session.user.role} />
            </Suspense>
        </div>
    )
}
