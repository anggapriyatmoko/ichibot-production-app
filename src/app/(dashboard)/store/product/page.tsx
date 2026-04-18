import StoreProductList from '@/components/store/store-product-list';
import { getStoreProductsPaginated } from '@/app/actions/store-product';
import { requireAuth, isAllowedForPage } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import StoreSkeleton from '@/components/store/store-skeleton';


async function StoreProductContent() {
    const result = await getStoreProductsPaginated({ page: 1, perPage: 20 });
    return (
        <StoreProductList
            initialProducts={result.products}
            initialTotalCount={result.totalCount}
            initialTotalPages={result.totalPages}
            serverSidePagination={true}
            showSupplierColumn={false}
            showPurchasedColumn={false}
            showExportButton={true}
            exportFilenamePrefix="PRODUK STORE"
            showFilterButton={false}
        />
    );
}

export default async function StoreProductPage() {
    const session = await requireAuth();
    const allowed = await isAllowedForPage('/store/product');
    if (!allowed) redirect('/dashboard');


    return (
        <div className="space-y-8">
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
