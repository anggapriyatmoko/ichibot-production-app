import ProductList from '@/components/inventory/product-list'
import { getInventoryProductsPaginated } from '@/app/actions/product'
import { getSession } from '@/lib/auth'


export default async function InventoryPage() {
    const session: any = await getSession()
    const result = await getInventoryProductsPaginated({ page: 1, perPage: 20 })

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Sparepart Produksi</h1>
                <p className="text-muted-foreground">Monitor stock levels and manage your raw materials.</p>
            </div>

            <ProductList
                initialProducts={result.products}
                initialTotalCount={result.totalCount}
                initialTotalPages={result.totalPages}
                serverSidePagination={true}
                userRole={session?.user?.role}
            />
        </div>
    )
}
