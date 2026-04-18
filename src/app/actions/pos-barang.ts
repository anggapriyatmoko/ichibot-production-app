'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'

type CheckoutItem = {
    productId: string
    quantity: number
    source: 'production' | 'project'
}

/**
 * Paginated product search for POS Barang — follows the standard in
 * `standard-table-get-data.md`. The POS unifies two sources (production
 * `product` table + `sparepartProject` table) behind a single searchable
 * grid, capped at `perPage` results.
 *
 * search: AND across whitespace-separated tokens over name + sku.
 * source: 'all' | 'production' | 'project' — when not 'all' we only hit
 * the corresponding table, saving the other query entirely.
 *
 * Return shape: `{ products, totalCount, page, perPage }`.
 * `products` is the combined + sorted page; items carry a `source` tag.
 */
export async function getPosBarangProductsPaginated(params: {
    search?: string
    source?: 'all' | 'production' | 'project'
    page?: number
    perPage?: number
}) {
    const session = await getSession()
    if (!session) throw new Error('Unauthorized')

    const search = (params.search ?? '').trim()
    const source = params.source ?? 'all'
    const page = Math.max(1, params.page ?? 1)
    const perPage = Math.max(1, Math.min(200, params.perPage ?? 50))

    const tokens = search ? search.split(/\s+/).filter(Boolean) : []
    const buildWhere = () => (
        tokens.length === 0
            ? {}
            : {
                AND: tokens.map(word => ({
                    OR: [
                        { name: { contains: word } },
                        { sku: { contains: word } },
                    ]
                }))
            }
    )

    try {
        const where: any = buildWhere()
        // We need the overall total for the banner / "more results"
        // indicator, plus the page slice. Keep total logic simple: count
        // both tables when source='all', otherwise just the selected one.
        let productionItems: any[] = []
        let projectItems: any[] = []
        let productionTotal = 0
        let projectTotal = 0

        if (source === 'all' || source === 'production') {
            const [count, rows] = await Promise.all([
                prisma.product.count({ where }),
                prisma.product.findMany({
                    where,
                    orderBy: { name: 'asc' },
                    // Over-fetch so we can merge+sort+slice across both tables.
                    take: source === 'all' ? perPage * page : perPage,
                    skip: source === 'production' ? (page - 1) * perPage : 0,
                }),
            ])
            productionTotal = count
            productionItems = rows.map(r => ({ ...r, source: 'production' as const, sku: r.sku || '' }))
        }

        if (source === 'all' || source === 'project') {
            const [count, rows] = await Promise.all([
                prisma.sparepartProject.count({ where }),
                prisma.sparepartProject.findMany({
                    where,
                    orderBy: { name: 'asc' },
                    take: source === 'all' ? perPage * page : perPage,
                    skip: source === 'project' ? (page - 1) * perPage : 0,
                }),
            ])
            projectTotal = count
            projectItems = rows.map(r => ({ ...r, source: 'project' as const, sku: r.sku || '' }))
        }

        const combined = [...productionItems, ...projectItems]
            .sort((a, b) => a.name.localeCompare(b.name))

        const totalCount = productionTotal + projectTotal
        const start = source === 'all' ? (page - 1) * perPage : 0
        const products = combined.slice(start, start + perPage)

        return {
            products,
            totalCount,
            page,
            perPage,
        }
    } catch (error) {
        console.error('Error fetching POS Barang products:', error)
        return { products: [] as any[], totalCount: 0, page, perPage }
    }
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
