import prisma from '@/lib/prisma'
import POSBarangSystem from '@/components/pos/pos-barang-system'
import { getSession } from '@/lib/auth'


export default async function POSBarangPage() {
    // 1. Fetch Production Products
    const productionProducts = await prisma.product.findMany({
        orderBy: { name: 'asc' }
    })

    // 2. Fetch Project Products
    const projectProducts = await prisma.sparepartProject.findMany({
        orderBy: { name: 'asc' }
    })

    const session = await getSession()
    const userName = session?.user?.name || "Unknown User"

    return (
        <div className="h-full">

            <POSBarangSystem
                productionProducts={productionProducts}
                projectProducts={projectProducts}
                userName={userName}
            />
        </div>
    )
}
