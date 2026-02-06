'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getStoreSuppliers() {
    try {
        return await prisma.storeSupplier.findMany({
            orderBy: { name: 'asc' }
        })
    } catch (error) {
        console.error('Error fetching suppliers:', error)
        return []
    }
}

export async function addStoreSupplier(name: string) {
    try {
        const supplier = await prisma.storeSupplier.create({
            data: { name }
        })
        revalidatePath('/store/settings')
        return { success: true, data: supplier }
    } catch (error: any) {
        console.error('Error adding supplier:', error)
        return { success: false, error: error.message }
    }
}

export async function updateStoreSupplier(id: string, name: string) {
    try {
        // 1. Get current supplier to know the old name
        const oldSupplier = await prisma.storeSupplier.findUnique({
            where: { id }
        })

        if (!oldSupplier) {
            return { success: false, error: 'Supplier tidak ditemukan' }
        }

        const oldName = oldSupplier.name

        // 2. Perform the update
        await prisma.storeSupplier.update({
            where: { id },
            data: { name }
        })

        // 3. Propagate name change to products if name changed
        if (oldName !== name) {
            // Find products containing the old name
            const products = await prisma.storeProduct.findMany({
                where: {
                    storeName: { contains: oldName }
                }
            })

            // Update each product
            for (const product of products) {
                if (product.storeName) {
                    const names = product.storeName.split(',').map((n: string) => n.trim()).filter(Boolean)
                    const newNames = names.map((n: string) => n === oldName ? name : n)

                    // Remove duplicates just in case
                    const uniqueNames = Array.from(new Set(newNames))
                    const newStoreName = uniqueNames.join(', ')

                    await prisma.storeProduct.update({
                        where: { wcId: product.wcId },
                        data: { storeName: newStoreName }
                    })
                }
            }
        }

        revalidatePath('/store/settings')
        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')

        return { success: true }
    } catch (error: any) {
        console.error('Error updating supplier:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteStoreSupplier(id: string) {
    try {
        // 1. Get supplier name before delete
        const supplier = await prisma.storeSupplier.findUnique({
            where: { id }
        })

        if (!supplier) {
            return { success: false, error: 'Supplier tidak ditemukan' }
        }

        const supplierName = supplier.name

        // 2. Delete the supplier
        await prisma.storeSupplier.delete({
            where: { id }
        })

        // 3. Remove name from products containing it
        const products = await prisma.storeProduct.findMany({
            where: {
                storeName: { contains: supplierName }
            }
        })

        for (const product of products) {
            if (product.storeName) {
                const names = product.storeName.split(',').map((n: string) => n.trim()).filter(Boolean)
                const newNames = names.filter((n: string) => n !== supplierName)
                const newStoreName = newNames.join(', ')

                await prisma.storeProduct.update({
                    where: { wcId: product.wcId },
                    data: { storeName: newStoreName }
                })
            }
        }

        revalidatePath('/store/settings')
        revalidatePath('/store/product')
        revalidatePath('/store/low-stock')
        revalidatePath('/store/purchased')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting supplier:', error)
        return { success: false, error: error.message }
    }
}
