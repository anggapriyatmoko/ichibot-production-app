import StoreProductList from '@/components/store/store-product-list';
import { getStoreProducts } from '@/app/actions/store-product';
import { getSystemSetting } from '@/app/actions/system-settings';
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic';

async function PriceAnalysisContent() {
    const [products, kursYuanStr, kursUsdStr, additionalFeeStr] = await Promise.all([
        getStoreProducts(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD'),
        getSystemSetting('STORE_ADDITIONAL_FEE')
    ]);

    const kursYuan = kursYuanStr ? parseFloat(kursYuanStr) : undefined;
    const kursUsd = kursUsdStr ? parseFloat(kursUsdStr) : undefined;
    const additionalFee = additionalFeeStr ? parseFloat(additionalFeeStr) : 0;

    return (
        <StoreProductList
            initialProducts={products}
            showSupplierColumn={false}
            showPurchasedColumn={false}
            showPurchaseColumns={true}
            showQuantityColumn={false}
            showSyncButton={false}
            showAddButton={false}
            hideSupplierInput={true}
            hideSkuColumn={true}
            hideTotalsInCells={true}
            isAnalisaHarga={true}
            kursYuan={kursYuan}
            kursUsd={kursUsd}
            additionalFee={additionalFee}
        />
    );
}

export default async function PriceAnalysisPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/price-analysis');
    if (!allowed) redirect('/dashboard');

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Analisa Harga</h1>
                <p className="text-muted-foreground">Analisa laba rugi produk berdasarkan harga beli dan harga jual WooCommerce.</p>
            </div>

            <Suspense fallback={<StoreSkeleton showSupplierColumn={false} showSyncButton={false} />}>
                <PriceAnalysisContent />
            </Suspense>
        </div>
    );
}
