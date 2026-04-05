import prisma from '@/lib/prisma'
import POSIchicraftSystem from '@/components/pos/pos-ichicraft-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'POS Ichicraft | Ichibot Production',
    description: 'Point of Sales produk Ichicraft'
}

export default async function POSIchicraftPage() {
    const products = await prisma.ichicraftProduct.findMany({
        orderBy: { name: 'asc' }
    })

    const session = await getServerSession(authOptions)
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
