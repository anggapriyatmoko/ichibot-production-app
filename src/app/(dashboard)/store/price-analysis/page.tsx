import StoreProductList from '@/components/store/store-product-list';
import { getStoreProducts } from '@/app/actions/store-product';
import { getSystemSetting } from '@/app/actions/system-settings';
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic';

async function PriceAnalysisContent() {
    const [
        products, kursYuanStr, kursUsdStr, additionalFeeStr,
        shopeeAdminStr, shopeeServiceStr, tokpedAdminStr, tokpedServiceStr
    ] = await Promise.all([
        getStoreProducts(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD'),
        getSystemSetting('STORE_ADDITIONAL_FEE'),
        getSystemSetting('STORE_SHOPEE_ADMIN_FEE'),
        getSystemSetting('STORE_SHOPEE_SERVICE_FEE'),
        getSystemSetting('STORE_TOKOPEDIA_ADMIN_FEE'),
        getSystemSetting('STORE_TOKOPEDIA_SERVICE_FEE')
    ]);

    const kursYuan = kursYuanStr ? parseFloat(kursYuanStr) : undefined;
    const kursUsd = kursUsdStr ? parseFloat(kursUsdStr) : undefined;
    const additionalFee = additionalFeeStr ? parseFloat(additionalFeeStr) : 0;
    const shopeeAdminFee = shopeeAdminStr ? parseFloat(shopeeAdminStr) : 0;
    const shopeeServiceFee = shopeeServiceStr ? parseFloat(shopeeServiceStr) : 0;
    const tokpedAdminFee = tokpedAdminStr ? parseFloat(tokpedAdminStr) : 0;
    const tokpedServiceFee = tokpedServiceStr ? parseFloat(tokpedServiceStr) : 0;

    return (
        <StoreProductList
            initialProducts={products}
            showSupplierColumn={false}
            showPurchasedColumn={false}
            showPurchaseColumns={true}
            showQuantityColumn={false}
            showSyncButton={false}
            showAddButton={false}
            hideSupplierInput={false}
            hideSkuColumn={true}
            hideTotalsInCells={true}
            isAnalisaHarga={true}
            kursYuan={kursYuan}
            kursUsd={kursUsd}
            additionalFee={additionalFee}
            shopeeAdminFee={shopeeAdminFee}
            shopeeServiceFee={shopeeServiceFee}
            tokpedAdminFee={tokpedAdminFee}
            tokpedServiceFee={tokpedServiceFee}
            showExportButton={true}
            exportFilenamePrefix="ANALISA HARGA"
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
