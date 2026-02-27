import StoreLowStockList from '@/components/store/store-low-stock-list';
import { getStoreLowStockProducts } from '@/app/actions/store-product';
import { getStoreSuppliers } from '@/app/actions/store-supplier';
import { getSystemSetting } from '@/app/actions/system-settings';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic';

async function StoreLowStockContent() {
    const [products, suppliers, kursYuanRaw, additionalFeeStr] = await Promise.all([
        getStoreLowStockProducts(),
        getStoreSuppliers(),
        getSystemSetting('KURS_YUAN'),
        getSystemSetting('STORE_ADDITIONAL_FEE')
    ]);
    const kursYuan = kursYuanRaw ? parseFloat(kursYuanRaw) : undefined;
    const additionalFee = additionalFeeStr ? parseFloat(additionalFeeStr) : 0;
    return <StoreLowStockList initialProducts={products} suppliers={suppliers} kursYuan={kursYuan} additionalFee={additionalFee} />;
}

export default async function StoreLowStockPage() {
    const role = await getUserRole();
    if (role !== 'ADMIN') {
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
