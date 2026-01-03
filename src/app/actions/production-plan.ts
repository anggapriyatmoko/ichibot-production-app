'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function createProductionPlan(formData: FormData) {
    await requireAdmin()
    const recipeId = formData.get('recipeId') as string
    const quantity = parseInt(formData.get('quantity') as string)
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    // Check for existing plan for this product in the same period
    const existingPlan = await prisma.productionPlan.findFirst({
        where: {
            recipeId,
            month,
            year
        }
    })

    if (existingPlan) {
        throw new Error('Plan for this product already exists in this period')
    }

    const plan = await prisma.productionPlan.create({
        data: {
            recipeId,
            quantity,
            month,
            year,
            units: {
                create: Array.from({ length: quantity }).map((_, i) => ({
                    unitNumber: i + 1,
                    completed: '[]' // Initialize with empty array
                }))
            }
        }
    })

    revalidatePath('/production-plan')
}

export async function deleteProductionPlan(id: string) {
    await prisma.productionPlan.delete({ where: { id } })
    revalidatePath('/production-plan')
}

export async function updateUnitIdentifier(unitId: string, identifier: string) {
    await prisma.productionUnit.update({
        where: { id: unitId },
        data: { productIdentifier: identifier }
    })
    revalidatePath('/production-plan/[id]')
}

export async function updateUnitSalesData(unitId: string, data: {
    isPacked?: boolean,
    isSold?: boolean,
    marketplace?: string,
    customer?: string
}) {
    await prisma.productionUnit.update({
        where: { id: unitId },
        data
    })
    revalidatePath('/production-plan/[id]')
}

export async function toggleUnitIngredient(unitId: string, ingredientId: string, isCompleted: boolean) {
    const unit = await prisma.productionUnit.findUnique({
        where: { id: unitId },
        select: { completed: true }
    })

    if (!unit) return

    let completedIds: string[] = JSON.parse(unit.completed)

    if (isCompleted) {
        if (!completedIds.includes(ingredientId)) {
            completedIds.push(ingredientId)
        }
    } else {
        completedIds = completedIds.filter(id => id !== ingredientId)
    }

    await prisma.productionUnit.update({
        where: { id: unitId },
        data: { completed: JSON.stringify(completedIds) }
    })

    revalidatePath('/production-plan/[id]')
}
