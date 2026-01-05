'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
                        include: {
                            sections: true,
                            ingredients: { include: { product: true } }
                        }
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

    await prisma.productionUnit.update({
        where: { id: unitId },
        data: {
            completed: JSON.stringify(completedIds),
            assembledAt: assembledAt
        }
    })

    // Log Transaction
    const session: any = await getServerSession(authOptions)

    // The "ingredientId" passed here is actually a Section ID from the UI columns
    // We need to find all ingredients that belong to this section
    const sectionIngredients = unit.productionPlan.recipe.ingredients.filter(i => i.sectionId === ingredientId)

    // Find Section Name
    const section = unit.productionPlan.recipe.sections.find(s => s.id === ingredientId)
    const sectionName = section ? section.name : 'Unknown Section'

    // Note: If sectionIngredients is empty, it might mean the ID passed is actually a raw ingredient ID 
    // (if that use case existed) or the section has no ingredients. 
    // Given the UI implementation, it transmits Section IDs.

    if (sectionIngredients.length > 0) {
        // 1. Update Stock for all ingredients in the section
        for (const ingredient of sectionIngredients) {
            if (isCompleted) {
                // Consumed (OUT) - Decrement Stock
                await prisma.product.update({
                    where: { id: ingredient.productId },
                    data: { stock: { decrement: ingredient.quantity } }
                })
            } else {
                // Returned (IN) - Restock - Increment Stock
                await prisma.product.update({
                    where: { id: ingredient.productId },
                    data: { stock: { increment: ingredient.quantity } }
                })
            }
        }

        // 2. Log Single Transaction for the Section Check
        // Use "Checked" / "Unchecked" as type (Schema defines type as String so this is allowed)
        if (isCompleted) {
            await prisma.transaction.create({
                data: {
                    type: 'Checked',
                    quantity: 1,
                    // productId is omitted (undefined)
                    userId: session?.user?.id || null,
                    // Description format: "[Recipe Name] - [Section Name]..."
                    description: `${unit.productionPlan.recipe.name} - ${sectionName} (Unit ${unit.unitNumber}) - ${unit.productIdentifier || 'No Serial'}`
                }
            })
        } else {
            await prisma.transaction.create({
                data: {
                    type: 'Unchecked',
                    quantity: 1,
                    // productId is omitted (undefined)
                    userId: session?.user?.id || null,
                    description: `${unit.productionPlan.recipe.name} - ${sectionName} (Unit ${unit.unitNumber})`
                }
            })
        }

    } else {
        // Fallback: Try to find as single ingredient (if logic changes in future to allow single ingredient toggles)
        const ingredient = unit.productionPlan.recipe.ingredients.find(i => i.id === ingredientId)
        if (ingredient) {
            if (isCompleted) {
                // Consumed (OUT)
                await prisma.transaction.create({
                    data: {
                        type: 'OUT',
                        quantity: ingredient.quantity, // Quantity per unit
                        productId: ingredient.productId,
                        userId: session?.user?.id || null,
                        description: `Used in ${unit.productionPlan.recipe.name} (Unit ${unit.unitNumber})`
                    }
                })
                // Decrement Stock
                await prisma.product.update({
                    where: { id: ingredient.productId },
                    data: { stock: { decrement: ingredient.quantity } }
                })
            } else {
                // Returned (IN) - Restocking because unchecked
                await prisma.transaction.create({
                    data: {
                        type: 'IN',
                        quantity: ingredient.quantity,
                        productId: ingredient.productId,
                        userId: session?.user?.id || null,
                        description: `Restock from ${unit.productionPlan.recipe.name} (Unit ${unit.unitNumber} - Unchecked)`
                    }
                })
                // Increment Stock
                await prisma.product.update({
                    where: { id: ingredient.productId },
                    data: { stock: { increment: ingredient.quantity } }
                })
            }
        }
    }

    revalidatePath('/production-plan/[id]')
}


export async function updateProductionPlanQuantity(id: string, newQuantity: number) {
    await requireAdmin()
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
    const session: any = await getServerSession(authOptions)

    const unit = await prisma.productionUnit.findUnique({
        where: { id: unitId },
        include: {
            productionPlan: {
                include: {
                    recipe: true
                }
            }
        }
    })

    if (!unit) throw new Error('Unit not found')

    await prisma.$transaction([
        prisma.productionIssue.create({
            data: {
                productionUnitId: unitId,
                description
            }
        }),
        prisma.transaction.create({
            data: {
                type: 'Problem',
                quantity: 1,
                userId: session?.user?.id || null,
                // Using ||| delimiter: [Product Info] ||| [Issue Description]
                description: `${unit.productionPlan.recipe.name} - Unit ${unit.unitNumber} ||| ${description}`
            }
        })
    ])

    revalidatePath('/production-plan/[id]')
}

export async function resolveIssue(issueId: string) {
    const session: any = await getServerSession(authOptions)

    const issue = await prisma.productionIssue.findUnique({
        where: { id: issueId },
        include: {
            productionUnit: {
                include: {
                    productionPlan: {
                        include: {
                            recipe: true
                        }
                    }
                }
            }
        }
    })

    if (!issue) throw new Error('Issue not found')

    await prisma.$transaction([
        prisma.productionIssue.update({
            where: { id: issueId },
            data: { isResolved: true }
        }),
        prisma.transaction.create({
            data: {
                type: 'Solved',
                quantity: 1,
                userId: session?.user?.id || null,
                // Using ||| delimiter: [Product Info] ||| [Solved Description]
                description: `${issue.productionUnit.productionPlan.recipe.name} - Unit ${issue.productionUnit.unitNumber} ||| Solved: ${issue.description}`
            }
        })
    ])

    revalidatePath('/production-plan/[id]')
}

export async function updateIssue(issueId: string, description: string) {
    await prisma.productionIssue.update({
        where: { id: issueId },
        data: { description }
    })
    revalidatePath('/production-plan/[id]')
}
// ... existing code ...

export async function getProductionPlanForExport(month: number, year: number) {
    await requireAdmin()

    // Fetch all plans for the period with full details
    const plans = await prisma.productionPlan.findMany({
        where: { month, year },
        include: {
            recipe: true,
            units: { orderBy: { unitNumber: 'asc' } }
        },
        orderBy: { recipe: { name: 'asc' } }
    })

    const flattened: any[] = []

    for (const plan of plans) {
        if (plan.units.length === 0) {
            flattened.push({
                month,
                year,
                recipeName: plan.recipe.name,
                targetQuantity: plan.quantity,
                unitNumber: '',
                serialNumber: '',
                customId: '',
                status: 'Planned',
                progress: 0,
                completedSteps: ''
            })
        } else {
            for (const unit of plan.units) {
                let status = 'In Production'
                if (unit.isSold) status = `Sold (${unit.customer || '-'})`
                else if (unit.isPacked) status = 'Packed'
                else if (unit.completed === '[]') status = 'Planned'

                flattened.push({
                    month,
                    year,
                    recipeName: plan.recipe.name,
                    targetQuantity: plan.quantity,
                    unitNumber: unit.unitNumber,
                    serialNumber: unit.productIdentifier || '',
                    customId: unit.customId || '',
                    status: status,
                    progress: unit.completed === '[]' ? 0 : JSON.parse(unit.completed).length, // Raw step count
                    completedSteps: unit.completed
                })
            }
        }
    }

    return flattened
}

export async function importProductionPlan(rows: any[], month: number, year: number) {
    await requireAdmin()

    let successCount = 0
    const errors: string[] = []

    for (const row of rows) {
        try {
            const recipeName = String(row.recipeName || '').trim()
            const quantity = parseInt(row.quantity) || 0

            if (!recipeName || quantity <= 0) continue

            // Find Recipe
            const recipe = await prisma.recipe.findFirst({ where: { name: recipeName } })
            if (!recipe) {
                errors.push(`Recipe not found: ${recipeName}`)
                continue
            }

            // Check if plan exists
            let plan = await prisma.productionPlan.findFirst({
                where: {
                    recipeId: recipe.id,
                    month,
                    year
                },
                include: { units: true }
            })

            if (plan) {
                // Update Quantity if different
                if (plan.quantity !== quantity) {
                    await updateProductionPlanQuantity(plan.id, quantity)
                }
            } else {
                // Create New Plan
                await prisma.productionPlan.create({
                    data: {
                        recipeId: recipe.id,
                        month,
                        year,
                        quantity,
                        units: {
                            create: Array.from({ length: quantity }).map((_, i) => ({
                                unitNumber: i + 1,
                                completed: '[]'
                            }))
                        }
                    }
                })
            }
            successCount++

        } catch (e: any) {
            console.error(e)
            errors.push(`Error processing ${row.recipeName}: ${e.message}`)
        }
    }

    revalidatePath('/production-plan')
    return { success: successCount, errors }
}
