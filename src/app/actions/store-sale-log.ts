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

export async function updateStoreSaleLog(id: string, data: { nominal?: number, quantity?: number, marketplace?: string, itemName?: string, itemSku?: string, orderDate?: Date }) {
    try {
        await prisma.storeSaleLog.update({
            where: { id },
            data
        })
        return { success: true }
    } catch (error: any) {
        console.error('Error updating store sale log:', error.message)
        return { success: false, error: 'Gagal menyimpan perubahan' }
    }
}

export async function deleteStoreSaleLog(id: string) {
    try {
        await prisma.storeSaleLog.delete({
            where: { id }
        })
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting store sale log:', error.message)
        return { success: false, error: 'Gagal menghapus data' }
    }
}

export async function getStoreSaleStats(startDate: Date, endDate: Date) {
    try {
        const where = {
            orderDate: {
                gte: startDate,
                lte: endDate
            }
        }

        const [topQty, topNominal, marketShare] = await Promise.all([
            prisma.storeSaleLog.groupBy({
                by: ['itemName', 'itemId'],
                where,
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10
            }),
            prisma.storeSaleLog.groupBy({
                by: ['itemName', 'itemId'],
                where,
                _sum: { nominal: true },
                orderBy: { _sum: { nominal: 'desc' } },
                take: 10
            }),
            prisma.storeSaleLog.groupBy({
                by: ['marketplace'],
                where,
                _sum: { nominal: true, quantity: true }
            })
        ])

        return {
            success: true,
            topQuantity: topQty.map((i: any) => ({
                itemId: i.itemId,
                itemName: i.itemName,
                quantity: i._sum.quantity || 0
            })),
            topNominal: topNominal.map((i: any) => ({
                itemId: i.itemId,
                itemName: i.itemName,
                nominal: i._sum.nominal || 0
            })),
            marketShare: marketShare.map((m: any) => ({
                name: m.marketplace.toUpperCase(),
                value: m._sum.nominal || 0,
                quantity: m._sum.quantity || 0
            }))
        }
    } catch (error: any) {
        console.error('Error fetching store sale stats:', error.message)
        return { success: false, error: 'Gagal mengambil data statistik' }
    }
}
