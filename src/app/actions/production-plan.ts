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

export async function updateUnitCustomId(unitId: string, customId: string) {
    await prisma.productionUnit.update({
        where: { id: unitId },
        data: { customId }
    })
    revalidatePath('/production-plan/[id]')
}

export async function updateUnitSalesData(unitId: string, data: {
    isPacked?: boolean,
    isSold?: boolean,
    marketplace?: string,
    customer?: string
}) {
    const updateData: any = { ...data }

    // Set packedAt timestamp
    if (data.isPacked !== undefined) {
        updateData.packedAt = data.isPacked ? new Date() : null
    }

    await prisma.productionUnit.update({
        where: { id: unitId },
        data: updateData
    })
    revalidatePath('/production-plan/[id]')
}

export async function toggleUnitIngredient(unitId: string, ingredientId: string, isCompleted: boolean) {
    const unit = await prisma.productionUnit.findUnique({
        where: { id: unitId },
        include: {
            productionPlan: {
                include: {
                    recipe: {
                        include: { sections: true }
                    }
                }
            }
        }
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

    // Check if fully assembled
    const totalSections = unit.productionPlan.recipe.sections.length
    const isFullyChecked = totalSections > 0 && completedIds.length >= totalSections
    const assembledAt = isFullyChecked ? new Date() : null

    // If unchecking, and it was previously assembled, we might want to clear assembledAt or keep the original date?
    // User logic: "Assembled" status depends on checks. If unchecked, it's no longer assembled.
    // So we update assembledAt based on current state. 
    // Optimization: Only update assembledAt if status changes? For now, simple is better.
    // Actually, if we just unchecked an item, isFullyChecked becomes false, assembledAt becomes null. Correct.
    // If we check the last item, isFullyChecked becomes true, assembledAt becomes now. Correct.

    await prisma.productionUnit.update({
        where: { id: unitId },
        data: {
            completed: JSON.stringify(completedIds),
            assembledAt: assembledAt
        }
    })

    revalidatePath('/production-plan/[id]')
}


export async function updateProductionPlanQuantity(id: string, newQuantity: number) {
    if (newQuantity < 1) return

    const plan = await prisma.productionPlan.findUnique({
        where: { id },
        include: { units: { orderBy: { unitNumber: 'asc' } } }
    })

    if (!plan) return

    const diff = newQuantity - plan.quantity

    if (diff === 0) return

    if (diff > 0) {
        // Add more units
        const lastUnitNumber = plan.units.length > 0 ? plan.units[plan.units.length - 1].unitNumber : 0
        const newUnits = Array.from({ length: diff }).map((_, i) => ({
            unitNumber: lastUnitNumber + i + 1,
            completed: '[]'
        }))

        await prisma.productionPlan.update({
            where: { id },
            data: {
                quantity: newQuantity,
                units: { create: newUnits }
            }
        })
    } else {
        // Decrease units (Smart Deletion)
        const countToRemove = Math.abs(diff)

        // Find all units that are safe to delete (no progress)
        // Check if units to be removed are safe to delete (no progress)
        const safeUnits = plan.units.filter(u => {
            const unit = u as any
            const isCompletedEmpty = unit.completed === '[]'
            const isNotSold = !unit.isSold
            const isNotPacked = !unit.isPacked
            const hasNoIdentifier = !unit.productIdentifier
            const hasNoCustomId = !unit.customId

            // console.log(`Unit ${unit.unitNumber}: completed=${unit.completed}, isSold=${unit.isSold}, isPacked=${unit.isPacked}, id=${unit.productIdentifier}, customId=${unit.customId}`)

            return isCompletedEmpty && isNotSold && isNotPacked && hasNoIdentifier && hasNoCustomId
        })

        if (safeUnits.length < countToRemove) {
            // Debug why:
            const exampleBadUnit = plan.units.reverse().find(u => !safeUnits.includes(u)) // Check from end
            let reason = 'Unknown'
            if (exampleBadUnit) {
                const u = exampleBadUnit as any
                if (u.completed !== '[]') reason = `Progress detected`
                else if (u.isSold) reason = 'Marked as Sold'
                else if (u.isPacked) reason = 'Marked as Packed'
                else if (u.productIdentifier) reason = `Serial set (${u.productIdentifier})`
                else if (u.customId) reason = `ID set (${u.customId})`
            }

            throw new Error(`Cannot reduce target. Only ${safeUnits.length} empty units found. Blocking unit #${exampleBadUnit?.unitNumber}: ${reason}`)
        }

        // Prioritize deleting from the end (highest unitNumber)
        // safeUnits is already ordered by unitNumber asc from the query, so reverse it
        const unitsToDelete = safeUnits.reverse().slice(0, countToRemove)
        const idsToDelete = unitsToDelete.map(u => u.id)

        await prisma.$transaction([
            prisma.productionUnit.deleteMany({
                where: { id: { in: idsToDelete } }
            }),
            prisma.productionPlan.update({
                where: { id },
                data: { quantity: newQuantity }
            })
        ])
    }

    revalidatePath('/production-plan')
}

export async function reportIssue(unitId: string, description: string) {
    await prisma.productionIssue.create({
        data: {
            productionUnitId: unitId,
            description
        }
    })
    revalidatePath('/production-plan/[id]')
}

export async function resolveIssue(issueId: string) {
    await prisma.productionIssue.update({
        where: { id: issueId },
        data: { isResolved: true }
    })
    revalidatePath('/production-plan/[id]')
}

export async function updateIssue(issueId: string, description: string) {
    await prisma.productionIssue.update({
        where: { id: issueId },
        data: { description }
    })
    revalidatePath('/production-plan/[id]')
}
