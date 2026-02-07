'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

type CheckoutItem = {
    productId: string
    quantity: number
    source: 'production' | 'project'
}

// Generate order number format: ORDB-YYYYMMDD-XXX (B for Barang/Unified)
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
    return `ORDB-${dateStr}-${sequence}`
}

export async function processBatchCheckoutBarang(items: CheckoutItem[]): Promise<{ orderNumber: string }> {
    if (items.length === 0) throw new Error('No items to checkout')

    // Get current user session
    const session = await getSession()
    const userId = session?.user?.id || null

    // 1. Fetch products from both sources to validate
    const productionIds = items.filter(i => i.source === 'production').map(i => i.productId)
    const projectIds = items.filter(i => i.source === 'project').map(i => i.productId)

    const productionProducts = await prisma.product.findMany({
        where: { id: { in: productionIds } }
    })

    const projectProducts = await prisma.sparepartProject.findMany({
        where: { id: { in: projectIds } }
    })

    // Validate Stock
    for (const item of items) {
        let product
        if (item.source === 'production') {
            product = productionProducts.find(p => p.id === item.productId)
        } else {
            product = projectProducts.find(p => p.id === item.productId)
        }

        if (!product) throw new Error(`Product not found: ${item.productId} (${item.source})`)

        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`)
        }
    }

    // Generate unified order number
    const orderNumber = await generateOrderNumber()

    // 2. Transact (Deduct stock, Create Order, and Transaction logs where possible)
    const order = await prisma.$transaction(async (tx) => {
        // Create Order first
        const newOrder = await tx.order.create({
            data: {
                orderNumber,
                userId,
                items: {
                    create: items.map(item => {
                        let product
                        if (item.source === 'production') {
                            product = productionProducts.find(p => p.id === item.productId)!
                        } else {
                            product = projectProducts.find(p => p.id === item.productId)!
                        }

                        return {
                            productId: item.productId,
                            productName: `${product.name} [${item.source.toUpperCase()}]`,
                            productSku: product.sku || '',
                            productNote: product.notes,
                            quantity: item.quantity
                        }
                    })
                }
            }
        })

        // Deduct stock and create transactions
        for (const item of items) {
            if (item.source === 'production') {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                })

                // Create Transaction log for production items
                await tx.transaction.create({
                    data: {
                        type: 'OUT',
                        quantity: item.quantity,
                        productId: item.productId,
                        userId: userId,
                        description: `Checkout via POS Barang - ${orderNumber}`
                    }
                })
            } else {
                await tx.sparepartProject.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                })
                // Note: No Transaction record for project items due to schema constraints
            }
        }

        return newOrder
    })

    revalidatePath('/inventory')
    revalidatePath('/sparepart-project')
    revalidatePath('/pos-barang')
    revalidatePath('/history')

    return { orderNumber: order.orderNumber }
}
