'use server'

import { revalidatePath } from "next/cache";
import { requireAdmin, requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getDrawerCode } from "./rack";

export async function createStoreRack(data: { name: string; drawerCount: number; rows?: number; cols?: number; drawerColors?: any; drawerNotes?: any; drawerNoteColors?: any; description?: string }) {
    await requireAdmin()
    const rack = await (prisma as any).storeRack.create({
        data: {
            name: data.name,
            drawerCount: data.drawerCount,
            rows: data.rows || null,
            cols: data.cols || null,
            drawerColors: data.drawerColors || {},
            drawerNotes: data.drawerNotes || {},
            drawerNoteColors: data.drawerNoteColors || {},
            description: data.description || null
        }
    })
    revalidatePath('/store/rack-management')
    return rack
}

export async function updateStoreRack(id: string, data: { name: string; drawerCount: number; rows?: number; cols?: number; drawerColors?: any; drawerNotes?: any; drawerNoteColors?: any; description?: string }) {
    await requireAdmin()

    // Get existing rack to preserve/migrate data
    const existingRack = await (prisma as any).storeRack.findUnique({ where: { id } })
    if (!existingRack) throw new Error("Rack not found")

    let drawerColors = data.drawerColors !== undefined ? data.drawerColors : existingRack.drawerColors
    let drawerNotes = data.drawerNotes !== undefined ? data.drawerNotes : existingRack.drawerNotes
    let drawerNoteColors = data.drawerNoteColors !== undefined ? data.drawerNoteColors : existingRack.drawerNoteColors

    // Handle renaming or layout changes - migrate keys in JSON objects
    const nameChanged = existingRack.name !== data.name
    const layoutChanged = existingRack.rows !== data.rows || existingRack.cols !== data.cols

    if (nameChanged || layoutChanged) {
        const { getDrawerIndex } = await import("./rack")

        const migrateAllKeys = async (oldObj: any) => {
            if (!oldObj || typeof oldObj !== 'object') return oldObj
            const newObj: any = {}

            // Iterate over ALL keys to ensure hidden drawers are also migrated
            for (const oldCode of Object.keys(oldObj)) {
                // Only process keys belonging to this rack
                if (oldCode.startsWith(`${existingRack.name}-`)) {
                    const index = await getDrawerIndex(existingRack.name, oldCode, existingRack.rows, existingRack.cols)
                    if (index !== -1) {
                        const newCode = await getDrawerCode(data.name, index, data.rows, data.cols)
                        newObj[newCode] = oldObj[oldCode]
                    } else {
                        // Keep keys that don't match the format (unlikely but safe)
                        newObj[oldCode] = oldObj[oldCode]
                    }
                } else {
                    // Preserve keys for other racks if any (though typically objects are per-rack)
                    newObj[oldCode] = oldObj[oldCode]
                }
            }
            return newObj
        }

        drawerColors = await migrateAllKeys(drawerColors)
        drawerNotes = await migrateAllKeys(drawerNotes)
        drawerNoteColors = await migrateAllKeys(drawerNoteColors)
    }

    const rack = await (prisma as any).storeRack.update({
        where: { id },
        data: {
            name: data.name,
            drawerCount: data.drawerCount,
            rows: data.rows !== undefined ? data.rows : existingRack.rows,
            cols: data.cols !== undefined ? data.cols : existingRack.cols,
            drawerColors: drawerColors || {},
            drawerNotes: drawerNotes || {},
            drawerNoteColors: drawerNoteColors || {},
            description: data.description !== undefined ? data.description : existingRack.description
        }
    })
    revalidatePath('/store/rack-management')
    return rack
}

export async function deleteStoreRack(id: string) {
    await requireAdmin()
    await (prisma as any).storeRack.delete({ where: { id } })
    revalidatePath('/store/rack-management')
    return { success: true }
}

export async function getStoreRacksWithDetails() {
    await requireAuth()

    const racks = await (prisma as any).storeRack.findMany({
        orderBy: { name: 'asc' }
    });

    // Get all Store products - check SKU for drawer codes
    const storeProducts = await prisma.storeProduct.findMany({
        select: { name: true, sku: true, stockQuantity: true, images: true, wcId: true, backupGudang: true }
    });

    // Map store products by SKU for quick lookup
    const drawerDetails = new Map<string, { name: string; sku: string; stock: number; image: string | null; wcId: number; backupGudang: string | null }>();

    storeProducts.forEach(product => {
        if (product.sku) {
            let imageUrl: string | null = null;
            if (product.images) {
                try {
                    const parsed = JSON.parse(product.images);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        imageUrl = parsed[0].src;
                    }
                } catch (e) {
                    // Fallback to raw string if not JSON
                    imageUrl = product.images;
                }
            }

            drawerDetails.set(product.sku, {
                name: product.name,
                sku: product.sku,
                stock: product.stockQuantity || 0,
                image: imageUrl,
                wcId: product.wcId,
                backupGudang: product.backupGudang || null
            });
        }
    });

    // Calculate details for each rack
    const result = []
    for (const rack of racks) {
        const allDrawers: Array<{
            code: string;
            isUsed: boolean;
            details?: {
                name: string;
                sku: string;
                stock: number;
                image: string | null;
                source: string;
                wcId: number;
                backupGudang: string | null;
            }
        }> = [];

        let usedCount = 0;
        const rows = (rack as any).rows;
        const cols = (rack as any).cols;

        for (let i = 0; i < rack.drawerCount; i++) {
            const code = await getDrawerCode(rack.name, i, rows, cols);
            const details = drawerDetails.get(code);

            if (details) {
                usedCount++;
                allDrawers.push({
                    code,
                    isUsed: true,
                    details: { ...details, source: 'store' }
                });
            } else {
                allDrawers.push({ code, isUsed: false });
            }
        }

        result.push({
            ...rack,
            allDrawers,
            unusedDrawersCount: rack.drawerCount - usedCount,
            unusedDrawersList: allDrawers.filter(d => !d.isUsed).map(d => d.code)
        });
    }
    return result
}

export async function exportStoreRacks() {
    await requireAdmin()
    const racks = await (prisma as any).storeRack.findMany({
        orderBy: { name: 'asc' }
    })
    return racks
}

export async function importStoreRacks(racks: any[]) {
    await requireAdmin()

    let createdCount = 0
    let updatedCount = 0

    const parseJson = (val: any) => {
        if (typeof val === 'string') {
            try {
                return JSON.parse(val)
            } catch (e) {
                return {}
            }
        }
        return val || {}
    }

    for (const rackData of racks) {
        try {
            // Strictly pick only fields that exist in the database schema
            const { id, createdAt, updatedAt, isValid, errors, ...cleanData } = rackData

            const toInt = (val: any) => {
                if (val === null || val === undefined || val === '') return null
                const p = parseInt(String(val))
                return isNaN(p) ? null : p
            }

            // Ensure JSON fields and numbers are handled correctly
            const dataToSave = {
                ...cleanData,
                drawerColors: parseJson(cleanData.drawerColors),
                drawerNotes: parseJson(cleanData.drawerNotes),
                drawerNoteColors: parseJson(cleanData.drawerNoteColors),
                drawerCount: toInt(cleanData.drawerCount) || 0,
                rows: toInt(cleanData.rows),
                cols: toInt(cleanData.cols),
            }

            if (!cleanData.name) continue

            // Try to update by name (unique) or create
            const existing = await (prisma as any).storeRack.findUnique({
                where: { name: cleanData.name }
            })

            if (existing) {
                await (prisma as any).storeRack.update({
                    where: { id: existing.id },
                    data: dataToSave
                })
                updatedCount++
            } else {
                await (prisma as any).storeRack.create({
                    data: dataToSave
                })
                createdCount++
            }
        } catch (error: any) {
            console.error(`Import error for rack ${rackData.name}:`, error)
            return { success: false, error: `Gagal mengimport rack "${rackData.name}": ${error.message}` }
        }
    }

    revalidatePath('/store/rack-management')
    return { success: true, createdCount, updatedCount }
}
