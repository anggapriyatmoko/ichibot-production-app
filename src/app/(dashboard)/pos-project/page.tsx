import prisma from '@/lib/prisma'
import POSProjectSystem from '@/components/pos/pos-project-system'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export default async function POSProjectPage() {
    const products = await prisma.sparepartProject.findMany({
        orderBy: {
            name: 'asc'
        }
    })

    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || "Unknown User"

    return (
        <div className="h-full">
            <div className="mb-6 hidden md:block">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Point of Sale - Sparepart Project</h1>
                <p className="text-sm text-muted-foreground">Select spareparts to checkout (Project).</p>
            </div>

            <POSProjectSystem
                products={products.map(p => ({
                    ...p,
                    sku: p.sku || '',
                    image: p.image || null
                }))}
                userName={userName}
            />
        </div>
    )
}
