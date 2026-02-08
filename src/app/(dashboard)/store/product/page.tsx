import StoreProductList from '@/components/store/store-product-list';
import { getStoreProducts } from '@/app/actions/store-product';

export const dynamic = 'force-dynamic';

import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function StoreProductPage() {
    const session = await requireAuth();
    if (session.user.role === 'EXTERNAL') {
        redirect('/dashboard');
    }
    const products = await getStoreProducts();

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Produk Store</h1>
                <p className="text-muted-foreground">Kelola produk dari WooCommerce Ichibot Store.</p>
            </div>

            <StoreProductList
                initialProducts={products}
                showSupplierColumn={false}
                showPurchasedColumn={false}
            />
        </div>
    );
}
