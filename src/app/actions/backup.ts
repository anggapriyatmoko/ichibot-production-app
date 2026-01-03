'use server'

import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function exportDatabase() {
    await requireAdmin()

    try {
        const [
            users,
            products,
            recipes,
            recipeSections,
            recipeIngredients,
            productionPlans,
            productionUnits,
            transactions
        ] = await prisma.$transaction([
            prisma.user.findMany(),
            prisma.product.findMany(),
            prisma.recipe.findMany(),
            prisma.recipeSection.findMany(),
            prisma.recipeIngredient.findMany(),
            prisma.productionPlan.findMany(),
            prisma.productionUnit.findMany(),
            prisma.transaction.findMany()
        ])

        const backupData = {
            timestamp: new Date().toISOString(),
            version: 1.0,
            data: {
                users,
                products,
                recipes,
                recipeSections,
                recipeIngredients,
                productionPlans,
                productionUnits,
                transactions
            }
        }

        return { success: true, data: JSON.stringify(backupData, null, 2) }
    } catch (error: any) {
        console.error('Export failed:', error)
        return { success: false, error: 'Failed to export database' }
    }
}

export async function importDatabase(jsonString: string) {
    await requireAdmin()

    try {
        const parsed = JSON.parse(jsonString)
        const d = parsed.data || parsed // Handle both wrapped and unwrapped structure if user edits it

        // Validate basic structure
        if (!d.users || !d.products) {
            throw new Error('Invalid backup format: Missing users or products')
        }

        // Execute Restore in Transaction
        await prisma.$transaction(async (tx: any) => {
            // 1. DELETE ALL (Reverse Dependency Order)
            // Use deleteMany({}) to wipe table
            await tx.transaction.deleteMany()
            await tx.productionUnit.deleteMany()
            await tx.productionPlan.deleteMany()
            await tx.recipeIngredient.deleteMany()
            await tx.recipeSection.deleteMany()
            await tx.recipe.deleteMany()
            await tx.product.deleteMany()
            await tx.user.deleteMany()

            // 2. INSERT ALL (Dependency Order)
            // Restore IDs is critical. createMany supports setting ID explicitly.

            if (d.users.length) await tx.user.createMany({ data: d.users })
            if (d.products.length) await tx.product.createMany({ data: d.products })
            if (d.recipes.length) await tx.recipe.createMany({ data: d.recipes })
            if (d.recipeSections.length) await tx.recipeSection.createMany({ data: d.recipeSections })
            if (d.recipeIngredients.length) await tx.recipeIngredient.createMany({ data: d.recipeIngredients })
            if (d.productionPlans.length) await tx.productionPlan.createMany({ data: d.productionPlans })
            if (d.productionUnits.length) await tx.productionUnit.createMany({ data: d.productionUnits })
            if (d.transactions.length) await tx.transaction.createMany({ data: d.transactions })
        })

        revalidatePath('/')
        return { success: true }

    } catch (error: any) {
        console.error('Import failed:', error)
        return { success: false, error: error.message || 'Failed to import database' }
    }
}
