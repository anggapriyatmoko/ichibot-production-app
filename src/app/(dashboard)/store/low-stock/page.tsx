import StoreLowStockList from '@/components/store/store-low-stock-list';
import { getStoreLowStockProducts } from '@/app/actions/store-product';

export const dynamic = 'force-dynamic';

export default async function StoreLowStockPage() {
    const products = await getStoreLowStockProducts();

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Stok Rendah Store</h1>
                <p className="text-muted-foreground">Monitoring stok produk WooCommerce yang menipis.</p>
            </div>

            <StoreLowStockList initialProducts={products} />
        </div>
    );
}
