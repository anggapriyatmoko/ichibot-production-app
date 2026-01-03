import ProductList from '@/components/inventory/product-list'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export default async function InventoryPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const session: any = await getServerSession(authOptions)
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const limit = 50
    const skip = (page - 1) * limit

    const [products, totalCount] = await prisma.$transaction([
        prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip
        }),
        prisma.product.count()
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Inventory Management</h1>
                <p className="text-muted-foreground">Monitor stock levels and manage your raw materials.</p>
            </div>

            <ProductList
                initialProducts={products}
                totalPages={totalPages}
                currentPage={page}
                userRole={session?.user?.role}
            />
        </div>
    )
}
