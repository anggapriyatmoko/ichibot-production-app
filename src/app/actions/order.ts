'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { decrypt } from '@/lib/crypto'

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

export async function getOrderHistory() {
    const orders = await prisma.order.findMany({
        include: {
            user: {
                select: {
                    nameEnc: true,
                    usernameEnc: true
                }
            },
            items: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 100 // Limit to last 100 orders
    })

    return orders.map(order => ({
        ...order,
        user: order.user ? {
            ...order.user,
            name: decrypt(order.user.nameEnc),
            username: decrypt(order.user.usernameEnc) || 'Unknown'
        } : null
    }))
}

export async function getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: {
                select: {
                    nameEnc: true,
                    usernameEnc: true
                }
            },
            items: true
        }
    })

    if (!order) return null

    return {
        ...order,
        user: order.user ? {
            ...order.user,
            name: decrypt(order.user.nameEnc)
        } : null
    }
}

export { generateOrderNumber }
