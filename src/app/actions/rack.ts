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

// Helper to get row label (A, B... Z, AA, BB... ZZ)
export async function getRowLabel(rowIndex: number) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (rowIndex < 26) {
        return letters[rowIndex];
    } else {
        const char = letters[rowIndex % 26];
        const repeat = Math.floor(rowIndex / 26) + 1;
        return char.repeat(repeat);
    }
}

// Helper to get drawer code based on rack mode
export async function getDrawerCode(rackName: string, index: number, rows?: number | null, cols?: number | null) {
    if (rows && cols) {
        const r = Math.floor(index / cols);
        const c = (index % cols) + 1;
        const rowLabel = await getRowLabel(r);
        const colLabel = c.toString().padStart(2, '0');
        return `${rackName}-${rowLabel}${colLabel}`;
    } else {
        const drawerNum = (index + 1).toString().padStart(2, '0');
        return `${rackName}-${drawerNum}`;
    }
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

    // Find sparepart projects that use drawers from this rack (checking SKU)
    const usedSparepartProjects = await prisma.sparepartProject.findMany({
        where: {
            sku: {
                startsWith: `${rackName}-`
            }
        },
        select: {
            sku: true
        }
    })

    const usedDrawers = new Set([
        ...usedProducts.map(p => p.sku),
        ...usedSparepartProjects.map(sp => sp.sku)
    ])

    // Return drawers that are not used
    return allDrawers.filter(drawer => !usedDrawers.has(drawer))
}

// Get all racks with their drawer details
export async function getRacksWithUnusedDrawers() {
    await requireAuth() // Allow all authenticated users to view

    const racks = await prisma.rack.findMany({
        orderBy: { name: 'asc' }
    })

    // Get all products - check SKU for drawer codes
    const products = await prisma.product.findMany({
        where: { sku: { startsWith: '' } }, // Fetch all with SKU
        select: { name: true, sku: true, stock: true, image: true }
    })

    // Get all sparepart projects
    const sparepartProjects = await (prisma as any).sparepartProject.findMany({
        where: { sku: { startsWith: '' } },
        select: { name: true, sku: true, stock: true, image: true }
    })

    // Get all service products
    const serviceProducts = await (prisma as any).serviceProduct.findMany({
        where: { sku: { startsWith: '' } },
        select: { name: true, sku: true, stock: true, image: true }
    })

    // Map by SKU for quick lookup
    const drawerDetails = new Map<string, { name: string; sku: string; stock: number; image: string | null; source: string }>()

    products.forEach(p => {
        if (p.sku) drawerDetails.set(p.sku, { name: p.name, sku: p.sku, stock: p.stock, image: p.image, source: 'internal' })
    })
    sparepartProjects.forEach((sp: any) => {
        if (sp.sku) drawerDetails.set(sp.sku, { name: sp.name, sku: sp.sku, stock: sp.stock, image: sp.image, source: 'sparepart' })
    })
    serviceProducts.forEach((sv: any) => {
        if (sv.sku) drawerDetails.set(sv.sku, { name: sv.name, sku: sv.sku, stock: sv.stock, image: sv.image, source: 'service' })
    })

    // Calculate details for each rack
    return racks.map(rack => {
        const allDrawers: Array<{ code: string; isUsed: boolean; details?: { name: string; sku: string; stock: number; image: string | null } }> = []
        let usedCount = 0

        for (let i = 1; i <= rack.drawerCount; i++) {
            const drawerNum = i.toString().padStart(2, '0')
            const code = `${rack.name}-${drawerNum}`
            const details = drawerDetails.get(code)

            if (details) {
                usedCount++
                allDrawers.push({ code, isUsed: true, details })
            } else {
                allDrawers.push({ code, isUsed: false })
            }
        }

        return {
            ...rack,
            allDrawers, // Array of all drawer objects with details
            unusedDrawersCount: rack.drawerCount - usedCount,
            unusedDrawersList: allDrawers.filter(d => !d.isUsed).map(d => d.code) // Keep for backward compatibility if needed
        }
    })
}
// Helper to get drawer index from code
export async function getDrawerIndex(rackName: string, code: string, rows?: number | null, cols?: number | null) {
    if (!code.startsWith(`${rackName}-`)) return -1;
    const suffix = code.replace(`${rackName}-`, '');
    if (rows && cols) {
        // Grid format: rowLabel + colLabel (e.g., A01)
        // colLabel is always the last 2 digits according to getDrawerCode
        if (suffix.length < 3) return -1;
        const colLabel = suffix.slice(-2);
        const rowLabel = suffix.slice(0, -2);

        const col = parseInt(colLabel) - 1;

        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const char = rowLabel[0];
        const repeat = rowLabel.length;
        const charIndex = letters.indexOf(char);
        if (charIndex === -1) return -1;
        const row = (repeat - 1) * 26 + charIndex;

        return row * cols + col;
    } else {
        // Sequential: 01
        const index = parseInt(suffix) - 1;
        return isNaN(index) ? -1 : index;
    }
}
