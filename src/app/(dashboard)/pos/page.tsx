import prisma from '@/lib/prisma'
import POSSystem from '@/components/pos/pos-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
    const products = await prisma.product.findMany({
        orderBy: {
            name: 'asc'
        }
    })

    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || "Unknown User"

    return (
        <div className="h-full">
            <div className="mb-6 hidden md:block">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Point of Sale Produksi</h1>
                <p className="text-sm text-muted-foreground">Select items to checkout from inventory.</p>
            </div>

            <POSSystem
                products={products.map(p => ({ ...p, sku: p.sku || '' }))}
                userName={userName}
            />
        </div>
    )
}
