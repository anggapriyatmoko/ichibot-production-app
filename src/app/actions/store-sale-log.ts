'use server'

import prisma from '@/lib/prisma'

export async function getStoreSaleLogs(page: number = 1, search: string = '') {
    const perPage = 50
    const start = (page - 1) * perPage
    const trimmed = search.trim()

    try {
        const where = trimmed ? {
            OR: [
                { orderNumber: { contains: trimmed } },
                { itemName: { contains: trimmed } },
                { itemSku: { contains: trimmed } },
            ]
        } : {}

        const [totalItems, logs] = await Promise.all([
            prisma.storeSaleLog.count({ where }),
            prisma.storeSaleLog.findMany({
                where,
                orderBy: { orderDate: 'desc' },
                skip: start,
                take: perPage
            })
        ])

        const totalPages = Math.ceil(totalItems / perPage)

        return {
            success: true,
            logs,
            totalPages,
            totalItems
        }
    } catch (error: any) {
        console.error('Error fetching store sale logs:', error.message)
        return {
            success: false,
            error: 'Gagal mengambil data log penjualan',
            logs: [],
            totalPages: 0,
            totalItems: 0
        }
    }
}
