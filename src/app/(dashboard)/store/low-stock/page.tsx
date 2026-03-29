import StoreLowStockList from '@/components/store/store-low-stock-list';
import { getStoreLowStockProducts } from '@/app/actions/store-product';
import { getStoreSuppliers } from '@/app/actions/store-supplier';
import { getSystemSetting } from '@/app/actions/system-settings';
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic';

async function StoreLowStockContent() {
    const [
        products, 
        suppliers, 
        kursYuanRaw, 
        kursUsdRaw,
        additionalFeeStr,
        shopeeAdminFeeStr,
        shopeeServiceFeeStr,
        tokpedAdminFeeStr,
        tokpedServiceFeeStr
    ] = await Promise.all([
        getStoreLowStockProducts(),
        getStoreSuppliers(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('KURS_USD'),
        getSystemSetting('STORE_ADDITIONAL_FEE'),
        getSystemSetting('STORE_SHOPEE_ADMIN_FEE'),
        getSystemSetting('STORE_SHOPEE_SERVICE_FEE'),
        getSystemSetting('STORE_TOKOPEDIA_ADMIN_FEE'),
        getSystemSetting('STORE_TOKOPEDIA_SERVICE_FEE')

    ]);

    const kursYuan = kursYuanRaw ? parseFloat(kursYuanRaw) : undefined;
    const kursUsd = kursUsdRaw ? parseFloat(kursUsdRaw) : undefined;
    const additionalFee = additionalFeeStr ? parseFloat(additionalFeeStr) : 0;
    const shopeeAdminFee = shopeeAdminFeeStr ? parseFloat(shopeeAdminFeeStr) : 0;
    const shopeeServiceFee = shopeeServiceFeeStr ? parseFloat(shopeeServiceFeeStr) : 0;
    const tokpedAdminFee = tokpedAdminFeeStr ? parseFloat(tokpedAdminFeeStr) : 0;
    const tokpedServiceFee = tokpedServiceFeeStr ? parseFloat(tokpedServiceFeeStr) : 0;

    return (
        <StoreLowStockList 
            initialProducts={products} 
            suppliers={suppliers} 
            kursYuan={kursYuan} 
            kursUsd={kursUsd}
            additionalFee={additionalFee} 
            shopeeAdminFee={shopeeAdminFee}
            shopeeServiceFee={shopeeServiceFee}
            tokpedAdminFee={tokpedAdminFee}
            tokpedServiceFee={tokpedServiceFee}
        />
    );
}

export default async function StoreLowStockPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/low-stock');
    if (!allowed) {
        redirect('/dashboard');
    }

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Produk Stok Rendah Store</h1>
                <p className="text-muted-foreground">Monitoring stok produk WooCommerce yang menipis</p>
            </div>

            <Suspense fallback={<StoreSkeleton showSyncButton={false} />}>
                <StoreLowStockContent />
            </Suspense>
        </div>
    );
}
