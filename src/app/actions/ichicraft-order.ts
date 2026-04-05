'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

function generateOrderNumber() {
    const d = new Date()
    const yy = d.getFullYear().toString().slice(-2)
    const mm = (d.getMonth() + 1).toString().padStart(2, '0')
    const dd = d.getDate().toString().padStart(2, '0')
    const time = `${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}${d.getSeconds().toString().padStart(2, '0')}`
    const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `ICHI${yy}${mm}${dd}${time}${rnd}`
}

export async function checkoutIchicraftOrder(data: {
    items: {
        productId: string
        productName: string
        productPrice: number
        quantity: number
        satuan: string
        originalPrice?: number | null
    }[]
    shippingCost: number
    discountNominal: number
}) {
    try {
        const session = await getServerSession(authOptions)
        const user = await prisma.user.findFirst({
            where: { emailEnc: session?.user?.email } // assuming username is used to lookup
        })

        const orderNumber = generateOrderNumber()

        const order = await prisma.ichicraftOrder.create({
            data: {
                orderNumber,
                userId: user?.id || null,
                shippingCost: data.shippingCost,
                discountNominal: data.discountNominal,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        productPrice: item.productPrice,
                        quantity: item.quantity,
                        satuan: item.satuan,
                        originalPrice: item.originalPrice
                    }))
                }
            },
            include: {
                items: true,
                user: {
                    select: { nameEnc: true, usernameEnc: true }
                }
            }
        })

        revalidatePath('/ichicraft/pos')
        return { success: true, order }
    } catch (error) {
        console.error('Error checking out Ichicraft Order:', error)
        return { success: false, error: 'Checkout gagal' }
    }
}

export async function getIchicraftOrderHistory(page = 1, search = '', limit = 10) {
    try {
        const skip = (page - 1) * limit
        const session = await getServerSession(authOptions)
        const user = await prisma.user.findFirst({
            where: { emailEnc: session?.user?.email }
        })

        let where: any = {}
        if (search) {
            where = {
                orderNumber: {
                    contains: search
                }
            }
        }

        const [total, orders] = await Promise.all([
            prisma.ichicraftOrder.count({ where }),
            prisma.ichicraftOrder.findMany({
                where,
                include: {
                    items: true,
                    user: {
                        select: { nameEnc: true, usernameEnc: true }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            })
        ])

        return {
            success: true,
            orders,
            total,
            totalPages: Math.ceil(total / limit)
        }
    } catch (error) {
        console.error('Error fetching Ichicraft orders:', error)
        return { success: false, error: 'Gagal mengambil data' }
    }
}
