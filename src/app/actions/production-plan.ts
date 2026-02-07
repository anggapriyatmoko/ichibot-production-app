'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function createProductionPlan(formData: FormData) {
    await requireAdmin()
    const recipeId = formData.get('recipeId') as string
    const quantity = parseFloat(formData.get('quantity') as string)
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

    // Get Recipe with Production ID and Sections for snapshot
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
            sections: {
                select: { id: true, name: true },
                orderBy: { createdAt: 'asc' }
            }
        }
    })

    if (!recipe) throw new Error('Recipe not found')

    // Create sections snapshot
    const sectionsSnapshot = JSON.stringify(
        recipe.sections.map(s => ({ id: s.id, name: s.name }))
    )

    const plan = await prisma.productionPlan.create({
        data: {
            recipeId,
            quantity,
            month,
            year,
            sectionsSnapshot, // Save snapshot
            units: {
                create: Array.from({ length: quantity }).map((_, i) => {
                    const unitNumber = i + 1
                    const serial = `${recipe.productionId}${year}${month.toString().padStart(2, '0')}${unitNumber.toString().padStart(3, '0')}`

                    return {
                        unitNumber,
                        productIdentifier: serial,
                        completed: '[]' // Initialize with empty array
                    }
                })
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
    isAssembled?: boolean,
    marketplace?: string,
    customer?: string,
    link?: string
}) {
    const updateData: any = { ...data }

    // Set packedAt timestamp
    if (data.isPacked !== undefined) {
        updateData.packedAt = data.isPacked ? new Date() : null
    }

    if (data.isAssembled !== undefined) {
        updateData.assembledAt = data.isAssembled ? new Date() : null
        delete updateData.isAssembled
    }

    await prisma.productionUnit.update({
        where: { id: unitId },
        data: updateData
    })
    revalidatePath('/production-plan/[id]')
}

export async function toggleUnitSection(unitId: string, ingredientId: string, isCompleted: boolean) {
    try {
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

        if (!unit) {
            console.error(`Unit not found: ${unitId}`)
            return
        }

        // Safe JSON parse
        let completedIds: string[] = []
        try {
            completedIds = JSON.parse(unit.completed || '[]') || []
        } catch (e) {
            console.error('Error parsing unit.completed:', e)
            completedIds = []
        }

        if (isCompleted) {
            if (!completedIds.includes(ingredientId)) {
                completedIds.push(ingredientId)
            }
        } else {
            completedIds = completedIds.filter(id => id !== ingredientId)
        }

        await prisma.productionUnit.update({
            where: { id: unitId },
            data: {
                completed: JSON.stringify(completedIds)
            }
        })

        // Log Transaction
        const session: any = await getServerSession(authOptions)

        // Find Section Name (Handle case where section might be deleted from recipe but exists in snapshot/history)
        // We use the Live Recipe to check for section existence
        const section = unit.productionPlan.recipe.sections.find(s => s.id === ingredientId)
        const sectionName = section ? section.name : 'Unknown/Deleted Section' // Defensive fallback

        // Find ingredients belonging to this section (Live Data)
        const sectionIngredients = unit.productionPlan.recipe.ingredients.filter(i => i.sectionId === ingredientId)

        // 1. Update Stock for all ingredients in the section (if any)
        if (sectionIngredients.length > 0) {
            for (const ingredient of sectionIngredients) {
                // Ensure product exists before updating (defensive)
                if (!ingredient.productId) continue

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
        } else {
            // Check if this is a single ingredient (not a section)
            const ingredient = unit.productionPlan.recipe.ingredients.find(i => i.id === ingredientId)
            if (ingredient && ingredient.productId) {
                if (isCompleted) {
                    await prisma.product.update({
                        where: { id: ingredient.productId },
                        data: { stock: { decrement: ingredient.quantity } }
                    })
                } else {
                    await prisma.product.update({
                        where: { id: ingredient.productId },
                        data: { stock: { increment: ingredient.quantity } }
                    })
                }
            }
        }

        // 2. ALWAYS Log Transaction for the Checkbox Action (regardless of ingredients)
        const transactionData = {
            type: isCompleted ? 'Checked' : 'Unchecked',
            quantity: 1,
            userId: session?.user?.id || null,
            description: `${unit.productionPlan.recipe.name} - ${sectionName} (Unit ${unit.unitNumber}) - ${unit.productIdentifier || 'No Serial'}`
        }

        await prisma.transaction.create({ data: transactionData })

        revalidatePath('/production-plan')
        revalidatePath(`/production-plan/${unit.productionPlanId}`)
    } catch (error) {
        console.error('Error in toggleUnitSection:', error)
        throw error // Re-throw to show error to user/logs
    }
}


export async function updateProductionPlanQuantity(id: string, newQuantity: number) {
    await requireAdmin()
    if (newQuantity <= 0) return

    const plan = await prisma.productionPlan.findUnique({
        where: { id },
        include: {
            units: {
                include: { issues: true },
                orderBy: { unitNumber: 'asc' }
            }
        }
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
        const safeUnits = plan.units.filter(u => {
            const unit = u as any
            const isCompletedEmpty = unit.completed === '[]'
            const isNotSold = !unit.isSold
            const isNotPacked = !unit.isPacked && !unit.packedAt
            const isNotAssembled = !unit.assembledAt
            const hasNoCustomId = !unit.customId
            const hasNoIssues = (unit.issues?.length || 0) === 0

            // We NOW allow units WITH productIdentifier to be deleted 
            // because serials are auto-generated upon plan creation.
            // As long as there is no ACTUAL content/progress/sales data, it's safe.

            return isCompletedEmpty && isNotSold && isNotPacked && isNotAssembled && hasNoCustomId && hasNoIssues
        })

        if (safeUnits.length < countToRemove) {
            // Debug why:
            const exampleBadUnit = plan.units.slice().reverse().find(u => !safeUnits.includes(u))
            let reason = 'Unknown'
            if (exampleBadUnit) {
                const u = exampleBadUnit as any
                if (u.completed !== '[]') reason = `Progress detected (Steps: ${JSON.parse(u.completed).length})`
                else if (u.isSold) reason = 'Marked as Sold'
                else if (u.isPacked || u.packedAt) reason = 'Marked as Packed'
                else if (u.assembledAt) reason = 'Marked as Assembled'
                else if (u.customId) reason = `Custom ID set (${u.customId})`
                else if (u.issues?.length > 0) reason = `Has reported issues (${u.issues.length})`
            }

            throw new Error(`Cannot reduce target. Only ${safeUnits.length} empty units found. Blocking unit #${exampleBadUnit?.unitNumber}: ${reason}`)
        }

        // Prioritize deleting from the end (highest unitNumber)
        const unitsToDelete = safeUnits.slice().reverse().slice(0, countToRemove)
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
                // Using ||| delimiter: [Unit Identity] ||| [Description Label]
                description: `${unit.productIdentifier || unit.customId || `Unit #${unit.unitNumber}`} ||| Detected Anomaly: ${description}`
            }
        })
    ])

    revalidatePath('/production-plan/[id]')
}

export async function resolveIssue(issueId: string, resolution: string) {
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
            data: {
                isResolved: true,
                resolution: resolution
            }
        }),
        prisma.transaction.create({
            data: {
                type: 'Solved',
                quantity: 1,
                userId: session?.user?.id || null,
                // Using ||| delimiter: [Product Info] ||| [Solved Description]
                description: `${issue.productionUnit.productionPlan.recipe.name} - Unit ${issue.productionUnit.unitNumber} ||| Solved: ${issue.description}\nResolution: ${resolution}`
            }
        })
    ])

    revalidatePath('/production-plan/[id]')
}

export async function updateIssue(issueId: string, description: string) {
    const session: any = await getServerSession(authOptions)

    const issue = await prisma.productionIssue.findUnique({
        where: { id: issueId },
        include: {
            productionUnit: true
        }
    })

    if (!issue) throw new Error('Issue not found')

    await prisma.$transaction([
        prisma.productionIssue.update({
            where: { id: issueId },
            data: { description }
        }),
        prisma.transaction.create({
            data: {
                type: 'Problem Edited',
                quantity: 1,
                userId: session?.user?.id || null,
                // Using ||| delimiter: [Unit Identity] ||| [Description Label]
                description: `${issue.productionUnit.productIdentifier || issue.productionUnit.customId || `Unit #${issue.productionUnit.unitNumber}`} ||| Detected Anomaly: ${description}`
            }
        })
    ])

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
                else if ((unit.completed || '[]') === '[]') status = 'Planned'

                flattened.push({
                    month,
                    year,
                    recipeName: plan.recipe.name,
                    targetQuantity: plan.quantity,
                    unitNumber: unit.unitNumber,
                    serialNumber: unit.productIdentifier || '',
                    customId: unit.customId || '',
                    status: status,
                    progress: (unit.completed || '[]') === '[]' ? 0 : JSON.parse(unit.completed || '[]').length, // Raw step count
                    completedSteps: unit.completed || '[]'
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
            const quantity = parseFloat(row.quantity) || 0

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

export async function getUnresolvedProductionIssuesCount() {
    try {
        const count = await prisma.productionIssue.count({
            where: { isResolved: false }
        })
        return { success: true, count }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getUnresolvedProductionIssuesDetails() {
    try {
        const data = await prisma.productionIssue.findMany({
            where: { isResolved: false },
            include: {
                productionUnit: {
                    include: {
                        productionPlan: {
                            include: {
                                recipe: {
                                    select: { name: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
        return { success: true, data }
    } catch (error: any) {
        return { error: error.message }
    }
}
