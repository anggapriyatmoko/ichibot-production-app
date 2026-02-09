import StoreLowStockList from '@/components/store/store-low-stock-list';
import { getStoreLowStockProducts } from '@/app/actions/store-product';
import { getStoreSuppliers } from '@/app/actions/store-supplier';
import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic';

async function StoreLowStockContent() {
    const [products, suppliers] = await Promise.all([
        getStoreLowStockProducts(),
        getStoreSuppliers()
    ]);
    return <StoreLowStockList initialProducts={products} suppliers={suppliers} />;
}

export default async function StoreLowStockPage() {
    const role = await getUserRole();
    if (role !== 'ADMIN') {
        redirect('/dashboard');
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Stok Rendah Store</h1>
                <p className="text-muted-foreground">Monitoring stok produk WooCommerce yang menipis.</p>
            </div>

            <Suspense fallback={<StoreSkeleton showSyncButton={false} />}>
                <StoreLowStockContent />
            </Suspense>
        </div>
    );
}
