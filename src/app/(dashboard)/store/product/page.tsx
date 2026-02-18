import StoreProductList from '@/components/store/store-product-list';
import { getStoreProducts } from '@/app/actions/store-product';
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';

export const dynamic = 'force-dynamic';

async function StoreProductContent() {
    const products = await getStoreProducts();
    return (
        <StoreProductList
            initialProducts={products}
            showSupplierColumn={false}
            showPurchasedColumn={false}
        />
    );
}

export default async function StoreProductPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/product', ['ADMIN', 'USER', 'TEKNISI', 'HRD', 'ADMINISTRASI']);
    if (!allowed) redirect('/dashboard');


    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Produk Store</h1>
                <p className="text-muted-foreground">Kelola produk dari WooCommerce Ichibot Store.</p>
            </div>

            <Suspense fallback={<StoreSkeleton showSupplierColumn={false} showSyncButton={true} />}>
                <StoreProductContent />
            </Suspense>
        </div>
    );
}
