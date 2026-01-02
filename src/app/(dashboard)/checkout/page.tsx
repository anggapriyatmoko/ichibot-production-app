import prisma from '@/lib/prisma'
import POSSystem from '@/components/checkout/pos-system'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
    const products = await prisma.product.findMany({
        orderBy: {
            name: 'asc'
        }
    })

    return (
        <div className="h-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Point of Sale</h1>
                <p className="text-sm text-muted-foreground">Select items to checkout from inventory.</p>
            </div>

            <POSSystem products={products} />
        </div>
    )
}
