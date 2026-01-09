'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
                    name: true,
                    username: true
                }
            },
            items: true
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 100 // Limit to last 100 orders
    })

    return orders
}

export async function getOrderById(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: {
                select: {
                    name: true,
                    username: true
                }
            },
            items: true
        }
    })

    return order
}

export { generateOrderNumber }
