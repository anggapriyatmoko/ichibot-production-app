'use server'

import prisma from '@/lib/prisma'

export async function getStoreSaleLogs(page: number = 1, search: string = '', perPage: number = 20) {
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

        const offlineWhere = {
            orderDate: {
                gte: startDate,
                lte: endDate
            },
            marketplace: 'offline'
        }

        const [topQty, topNominal, marketShare, offlineDailyRaw] = await Promise.all([
            prisma.storeSaleLog.groupBy({
                by: ['itemName', 'itemId'],
                where,
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 50
            }),
            prisma.storeSaleLog.groupBy({
                by: ['itemName', 'itemId'],
                where,
                _sum: { nominal: true },
                orderBy: { _sum: { nominal: 'desc' } },
                take: 50
            }),
            prisma.storeSaleLog.groupBy({
                by: ['marketplace'],
                where,
                _sum: { nominal: true, quantity: true }
            }),
            // Daily offline sales
            prisma.storeSaleLog.findMany({
                where: offlineWhere,
                select: {
                    orderDate: true,
                    nominal: true,
                    quantity: true,
                },
                orderBy: { orderDate: 'asc' }
            })
        ])

        // Group offline sales by day
        const dailyMap = new Map<string, { nominal: number; quantity: number }>()
        for (const sale of offlineDailyRaw) {
            const day = new Date(sale.orderDate).toISOString().slice(0, 10) // YYYY-MM-DD
            const existing = dailyMap.get(day) || { nominal: 0, quantity: 0 }
            existing.nominal += sale.nominal || 0
            existing.quantity += sale.quantity || 0
            dailyMap.set(day, existing)
        }

        // Fill in missing days with 0
        const dailyOffline: { date: string; nominal: number; quantity: number }[] = []
        const currentDate = new Date(startDate)
        const end = new Date(endDate)
        while (currentDate <= end) {
            const dayStr = currentDate.toISOString().slice(0, 10)
            const data = dailyMap.get(dayStr) || { nominal: 0, quantity: 0 }
            dailyOffline.push({ date: dayStr, ...data })
            currentDate.setDate(currentDate.getDate() + 1)
        }

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
            })),
            dailyOffline
        }
    } catch (error: any) {
        console.error('Error fetching store sale stats:', error.message)
        return { success: false, error: 'Gagal mengambil data statistik' }
    }
}

export async function checkExistingOrders(externalOrderNumbers: string[]) {
    try {
        const existing = await prisma.storeSaleLog.findMany({
            where: {
                externalOrderNumber: { in: externalOrderNumbers }
            },
            select: { externalOrderNumber: true }
        })
        const existingSet = new Set(existing.map((e: any) => e.externalOrderNumber))
        return { success: true, existingOrders: Array.from(existingSet) }
    } catch (error: any) {
        console.error('Error checking existing orders:', error.message)
        return { success: false, existingOrders: [] }
    }
}

export async function getProductsBySkuOrName(skus: string[], names: string[]) {
    try {
        const products = await prisma.storeProduct.findMany({
            where: {
                OR: [
                    { sku: { in: skus } },
                    { name: { in: names } }
                ]
            },
            select: { wcId: true, sku: true, name: true }
        })
        return { success: true, products }
    } catch (error: any) {
        console.error('Error fetching products by SKU or Name:', error.message)
        return { success: false, products: [] }
    }
}

export async function bulkCreateStoreSaleLogs(data: {
    orderNumber: string
    externalOrderNumber: string
    orderDate: Date
    itemId: number
    itemName: string
    itemSku: string
    quantity: number
    nominal: number
    marketplace: string
}[]) {
    try {
        const CHUNK_SIZE = 500
        let totalCount = 0
        
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE)
            const result = await prisma.storeSaleLog.createMany({
                data: chunk
            })
            totalCount += result.count
        }

        return { success: true, count: totalCount }
    } catch (error: any) {
        console.error('Error bulk creating store sale logs:', error.message)
        return { success: false, error: 'Gagal menyimpan data import: ' + error.message }
    }
}
