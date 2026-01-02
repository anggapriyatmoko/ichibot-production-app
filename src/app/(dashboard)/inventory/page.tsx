import ProductList from '@/components/inventory/product-list'
import prisma from '@/lib/prisma'

// Force dynamic since we have actions revalidating
export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Inventory Management</h1>
                <p className="text-gray-400">Monitor stock levels and manage your raw materials.</p>
            </div>

            <ProductList initialProducts={products} />
        </div>
    )
}
