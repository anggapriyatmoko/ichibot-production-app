'use server'

import prisma from '@/lib/prisma'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getRacks() {
    await requireAdmin()
    return prisma.rack.findMany({
        orderBy: { name: 'asc' }
    })
}

export async function createRack(data: { name: string; drawerCount: number; description?: string }) {
    await requireAdmin()
    const rack = await prisma.rack.create({
        data: {
            name: data.name,
            drawerCount: data.drawerCount,
            description: data.description || null
        }
    })
    revalidatePath('/rack-management')
    return rack
}

export async function updateRack(id: string, data: { name: string; drawerCount: number; description?: string }) {
    await requireAdmin()
    const rack = await prisma.rack.update({
        where: { id },
        data: {
            name: data.name,
            drawerCount: data.drawerCount,
            description: data.description || null
        }
    })
    revalidatePath('/rack-management')
    return rack
}

export async function deleteRack(id: string) {
    await requireAdmin()
    await prisma.rack.delete({ where: { id } })
    revalidatePath('/rack-management')
    return { success: true }
}

// Get unused drawer codes for a rack
export async function getUnusedDrawers(rackName: string, drawerCount: number) {
    await requireAdmin()

    // Generate all possible drawer codes
    const allDrawers: string[] = []
    for (let i = 1; i <= drawerCount; i++) {
        const drawerNum = i.toString().padStart(2, '0')
        allDrawers.push(`${rackName}-${drawerNum}`)
    }

    // Find products that use drawers from this rack (checking SKU)
    const usedProducts = await prisma.product.findMany({
        where: {
            sku: {
                startsWith: `${rackName}-`
            }
        },
        select: {
            sku: true
        }
    })

    const usedDrawers = new Set(usedProducts.map(p => p.sku))

    // Return drawers that are not used
    return allDrawers.filter(drawer => !usedDrawers.has(drawer))
}

// Get all racks with their unused drawer counts
export async function getRacksWithUnusedDrawers() {
    await requireAuth() // Allow all authenticated users to view

    const racks = await prisma.rack.findMany({
        orderBy: { name: 'asc' }
    })

    // Get all products - check SKU for drawer codes
    const productsWithDrawers = await prisma.product.findMany({
        where: {
            sku: { not: null }
        },
        select: {
            sku: true
        }
    })

    const usedDrawers = new Set(productsWithDrawers.map(p => p.sku))

    // Calculate unused drawers for each rack
    return racks.map(rack => {
        const allDrawers: string[] = []
        for (let i = 1; i <= rack.drawerCount; i++) {
            const drawerNum = i.toString().padStart(2, '0')
            allDrawers.push(`${rack.name}-${drawerNum}`)
        }

        const unusedDrawersList = allDrawers.filter(drawer => !usedDrawers.has(drawer))

        return {
            ...rack,
            unusedDrawersList, // Array of unused drawer codes
            unusedDrawersCount: unusedDrawersList.length
        }
    })
}
