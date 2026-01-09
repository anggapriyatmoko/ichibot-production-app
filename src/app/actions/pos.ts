'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

type CheckoutItem = {
    productId: string
    quantity: number
}

// Generate order number format: ORD-YYYYMMDD-XXX
async function generateOrderNumber(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD

    // Count orders created today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const count = await prisma.order.count({
        where: {
            createdAt: {
                gte: startOfDay,
                lt: endOfDay
            }
        }
    })

    const sequence = String(count + 1).padStart(3, '0')
    return `ORD-${dateStr}-${sequence}`
}

export async function processBatchCheckout(items: CheckoutItem[]): Promise<{ orderNumber: string }> {
    if (items.length === 0) throw new Error('No items to checkout')

    // Get current user session
    const session = await getSession()
    const userId = session?.user?.id || null

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

    // Generate order number
    const orderNumber = await generateOrderNumber()

    // 2. Transact (Deduct stock, Record Transaction, Create Order)
    const order = await prisma.$transaction(async (tx) => {
        // Create Order first
        const newOrder = await tx.order.create({
            data: {
                orderNumber,
                userId,
                items: {
                    create: items.map(item => {
                        const product = products.find(p => p.id === item.productId)!
                        return {
                            productId: item.productId,
                            productName: product.name,
                            productSku: product.sku,
                            productNote: product.notes,
                            quantity: item.quantity
                        }
                    })
                }
            }
        })

        // Deduct stock and create transactions
        for (const item of items) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } }
            })

            await tx.transaction.create({
                data: {
                    type: 'OUT',
                    quantity: item.quantity,
                    productId: item.productId,
                    userId: userId,
                    description: `Checkout via POS - ${orderNumber}`
                }
            })
        }

        return newOrder
    })

    revalidatePath('/inventory')
    revalidatePath('/pos')
    revalidatePath('/history')

    return { orderNumber: order.orderNumber }
}
