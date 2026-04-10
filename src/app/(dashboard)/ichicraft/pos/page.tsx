import prisma from '@/lib/prisma'
import POSIchicraftSystem from '@/components/pos/pos-ichicraft-system'
import { getSession } from '@/lib/auth'


export const metadata = {
    title: 'POS Ichicraft | Ichibot Production',
    description: 'Point of Sales produk Ichicraft'
}

export default async function POSIchicraftPage() {
    const products = await prisma.ichicraftProduct.findMany({
        orderBy: { name: 'asc' }
    })

    const session = await getSession()
    const userName = session?.user?.name || "Admin"

    return (
        <div className="h-full">
            <POSIchicraftSystem
                initialProducts={products}
                userName={userName}
            />
        </div>
    )
}
