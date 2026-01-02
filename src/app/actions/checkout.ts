'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

type CheckoutItem = {
    productId: string
    quantity: number
}

export async function processBatchCheckout(items: CheckoutItem[]) {
    if (items.length === 0) throw new Error('No items to checkout')

    // 1. Validate Stock for all items
    const productIds = items.map(i => i.productId)
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } }
    })

    for (const item of items) {
        const product = products.find(p => p.id === item.productId)
        if (!product) throw new Error(`Product not found: ${item.productId}`)

        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`)
        }
    }

    // 2. Transact (Deduct stock & Record Transaction for each)
    await prisma.$transaction(async (tx) => {
        for (const item of items) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } }
            })

            await tx.transaction.create({
                data: {
                    type: 'OUT',
                    quantity: item.quantity,
                    productId: item.productId
                }
            })
        }
    })

    revalidatePath('/inventory')
    revalidatePath('/checkout')
    revalidatePath('/history')
}
