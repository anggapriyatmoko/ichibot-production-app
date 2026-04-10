import prisma from '@/lib/prisma'
import POSServiceSystem from '@/components/pos/pos-service-system'
import { getSession } from '@/lib/auth'


export default async function POSServicePage() {
    const products = await prisma.serviceProduct.findMany({
        orderBy: { name: 'asc' }
    })

    const session = await getSession()
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
