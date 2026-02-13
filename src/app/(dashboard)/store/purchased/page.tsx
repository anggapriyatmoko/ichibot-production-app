import { getStorePurchasedProducts } from '@/app/actions/store-product'
import { getSystemSetting } from '@/app/actions/system-settings'
import StoreProductList from '@/components/store/store-product-list'
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic'

async function StorePurchasedContent({ userRole }: { userRole: string }) {
    const [products, kursYuanStr, kursUsdStr] = await Promise.all([
        getStorePurchasedProducts(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD')
    ]);
    const kursYuan = kursYuanStr ? parseFloat(kursYuanStr) : undefined
    const kursUsd = kursUsdStr ? parseFloat(kursUsdStr) : undefined

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
        />
    );
}

export default async function StorePurchasedPage() {
    const session = await requireAuth();
    if (session.user.role === 'EXTERNAL') {
        redirect('/dashboard');
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Produk Terbeli</h1>
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
