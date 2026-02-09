import prisma from '@/lib/prisma'
import POSServiceSystem from '@/components/pos/pos-service-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export default async function POSServicePage() {
    const products = await prisma.serviceProduct.findMany({
        orderBy: { name: 'asc' }
    })

    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || "Unknown User"

    return (
        <div className="h-full">
            <POSServiceSystem
                initialProducts={products}
                userName={userName}
            />
        </div>
    )
}
