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
    const search = typeof params.search === 'string' ? params.search : ''
    const limit = 10
    const skip = (page - 1) * limit

    const where: any = search ? {
        AND: search.split(/\s+/).filter(Boolean).map(word => ({
            OR: [
                { name: { contains: word } },
                { sku: { contains: word } }
            ]
        }))
    } : {}

    const [products, totalCount] = await prisma.$transaction([
        prisma.product.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip
        }),
        prisma.product.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Sparepart Produksi</h1>
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
