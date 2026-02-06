import { getStorePurchasedProducts } from '@/app/actions/store-product'
import StoreProductList from '@/components/store/store-product-list'

export const dynamic = 'force-dynamic'

export default async function StorePurchasedPage() {
    const products = await getStorePurchasedProducts()

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Produk Terbeli</h1>
                <p className="text-muted-foreground">
                    Daftar produk yang sudah ditandai sebagai "Beli" (Purchased).
                </p>
            </div>

            <StoreProductList
                initialProducts={products}
                showPurchasedStyles={false}
                showPurchasedAt={true}
                showSyncButton={false}
            />
        </div>
    )
}
