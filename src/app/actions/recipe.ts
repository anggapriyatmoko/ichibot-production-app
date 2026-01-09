'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function createRecipe(formData: FormData) {
    await requireAdmin()
    const name = formData.get('name') as string
    const productionId = formData.get('productionId') as string
    const description = formData.get('description') as string
    const categoryId = formData.get('categoryId') as string | null

    await prisma.recipe.create({
        data: {
            name,
            productionId,
            description,
            categoryId: categoryId === '' ? null : categoryId
        }
    })
    revalidatePath('/catalogue')
}

export async function updateRecipe(id: string, formData: FormData) {
    await requireAdmin()
    const name = formData.get('name') as string
    const productionId = formData.get('productionId') as string
    const description = formData.get('description') as string
    const categoryId = formData.get('categoryId') as string | null

    await prisma.recipe.update({
        where: { id },
        data: {
            name,
            productionId,
            description,
            categoryId: categoryId === '' ? null : categoryId
        }
    })
    revalidatePath('/catalogue')
}


export async function deleteRecipe(id: string) {
    await requireAdmin()
    await prisma.recipe.delete({ where: { id } })
    revalidatePath('/catalogue')
}

export async function addIngredient(recipeId: string, formData: FormData) {
    const productId = formData.get('productId') as string
    const quantity = parseFloat(formData.get('quantity') as string)
    const notes = formData.get('notes') as string
    const sectionId = formData.get('sectionId') as string | null

    // Validate if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new Error('Product not found')

    await prisma.recipeIngredient.create({
        data: {
            recipeId,
            productId,
            quantity,
            notes,
            sectionId: sectionId === 'null' ? null : sectionId
        }
    })



    revalidatePath(`/catalogue/${recipeId}`)
}

export async function removeIngredient(id: string, recipeId: string) {


    await prisma.recipeIngredient.delete({ where: { id } })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function updateIngredient(formData: FormData) {
    const id = formData.get('id') as string
    const recipeId = formData.get('recipeId') as string
    const quantity = parseFloat(formData.get('quantity') as string)
    const notes = formData.get('notes') as string

    // Get old ingredient for diff
    const oldIngredient = await prisma.recipeIngredient.findUnique({
        where: { id }
    })

    if (!oldIngredient) throw new Error('Ingredient not found')

    await prisma.recipeIngredient.update({
        where: { id },
        data: {
            quantity,
            notes
        }
    })



    revalidatePath(`/catalogue/${recipeId}`)
}

export async function createSection(recipeId: string, formData: FormData) {
    const name = formData.get('name') as string
    const category = formData.get('category') as string | null

    await prisma.recipeSection.create({
        data: {
            name,
            category: category && category.trim() !== '' ? category.trim() : null,
            recipeId
        }
    })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function deleteSection(id: string, recipeId: string) {


    // Cascade delete ingredients in this section
    await prisma.recipeIngredient.deleteMany({ where: { sectionId: id } })
    await prisma.recipeSection.delete({ where: { id } })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function updateSection(id: string, recipeId: string, formData: FormData) {
    const name = formData.get('name') as string
    const category = formData.get('category') as string | null

    const data: any = { name }
    if (category !== null) {
        data.category = category && category.trim() !== '' ? category.trim() : null
    }

    await prisma.recipeSection.update({
        where: { id },
        data
    })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function renameUncategorizedSection(recipeId: string, formData: FormData) {
    const name = formData.get('name') as string

    // 1. Create the new section
    const newSection = await prisma.recipeSection.create({
        data: {
            name,
            recipeId
        }
    })

    // 2. Move all uncategorized ingredients (sectionId: null) to this new section
    await prisma.recipeIngredient.updateMany({
        where: {
            recipeId: recipeId,
            sectionId: null
        },
        data: {
            sectionId: newSection.id
        }
    })

    revalidatePath(`/catalogue/${recipeId}`)
}

export async function reorderSections(recipeId: string, orderedSectionIds: string[]) {
    await prisma.$transaction(
        orderedSectionIds.map((id, index) =>
            prisma.recipeSection.update({
                where: { id },
                data: { order: index }
            })
        )
    )
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function getAllRecipesForExport() {
    await requireAdmin()
    const recipes = await prisma.recipe.findMany({
        include: {
            ingredients: {
                include: {
                    product: true,
                    section: true
                }
            },
            sections: true
        },
        orderBy: { name: 'asc' }
    })

    // Flatten for export
    const flattened: any[] = []
    for (const r of recipes) {
        const coveredSectionIds = new Set<string>()

        // 1. Process Ingredients
        for (const ing of r.ingredients) {
            if (ing.sectionId) coveredSectionIds.add(ing.sectionId)
            flattened.push({
                recipeName: r.name,
                description: r.description,
                section: ing.section?.name || 'Main',
                sku: ing.product.sku || '',
                productName: ing.product.name,
                quantity: ing.quantity,
                notes: ing.notes || ''
            })
        }

        // 2. Process Empty Sections (that had no ingredients)
        for (const sec of r.sections) {
            if (!coveredSectionIds.has(sec.id)) {
                flattened.push({
                    recipeName: r.name,
                    description: r.description,
                    section: sec.name,
                    sku: '',
                    productName: '',
                    quantity: 0,
                    notes: ''
                })
            }
        }

        // 3. Process Completely Empty Recipe (No ingredients, No sections)
        if (r.ingredients.length === 0 && r.sections.length === 0) {
            flattened.push({
                recipeName: r.name,
                description: r.description,
                section: '',
                sku: '',
                productName: '',
                quantity: 0,
                notes: ''
            })
        }
    }
    return flattened
}

export async function importRecipes(rows: any[]) {
    await requireAdmin()
    const session: any = await getServerSession(authOptions)

    // Group by Recipe Name
    const groups: { [key: string]: typeof rows } = {}
    rows.forEach(r => {
        if (!r.recipeName) return
        const name = String(r.recipeName).trim()
        if (!groups[name]) groups[name] = []
        groups[name].push(r)
    })

    let successCount = 0
    const errors: string[] = []

    for (const [name, items] of Object.entries(groups)) {
        try {
            const firstItem = items[0]
            const description = firstItem.description || ''

            // 1. Find or Create Recipe
            let recipe = await prisma.recipe.findFirst({ where: { name } })

            if (recipe) {
                // UPDATE: Clear existing structure first to sync
                // We must log REMOVE transactions for existing ingredients
                const existingIngredients = await prisma.recipeIngredient.findMany({
                    where: { recipeId: recipe.id }
                })

                for (const ing of existingIngredients) {
                    await prisma.transaction.create({
                        data: {
                            type: 'BOM_REMOVE',
                            quantity: ing.quantity,
                            productId: ing.productId,
                            recipeId: recipe.id,
                            userId: session?.user?.id
                        }
                    })
                }

                // Delete sections (cascades to ingredients)
                await prisma.recipeSection.deleteMany({ where: { recipeId: recipe.id } })
                // Also delete uncategorized ingredients if any (though loop above covers logs)
                await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } })

                // Update description
                await prisma.recipe.update({
                    where: { id: recipe.id },
                    data: { description }
                })
            } else {
                // CREATE
                recipe = await prisma.recipe.create({
                    data: { name, description }
                })
            }

            // 2. Add Sections and Ingredients from Excel
            // Cache sections for this recipe to avoid duplicate creates
            const sectionCache: { [key: string]: string } = {}

            for (const item of items) {
                const sectionName = item.section ? String(item.section).trim() : 'Main'

                // Handle Section Creation FIRST (even if no ingredient)
                let sectionId = sectionCache[sectionName]
                if (!sectionId && sectionName) { // Allow blank section to mean 'uncategorized' if we want, but 'Main' is default above
                    const section = await prisma.recipeSection.create({
                        data: { name: sectionName, recipeId: recipe.id }
                    })
                    sectionId = section.id
                    sectionCache[sectionName] = sectionId
                }

                // Skip if no ingredient info (just a section placeholder row)
                if (!item.productName && !item.sku) continue

                const sku = item.sku ? String(item.sku).trim() : null
                const productName = String(item.productName).trim()
                const quantity = parseFloat(item.quantity) || 0
                const notes = item.notes || ''

                if (quantity <= 0) continue

                // Find Product
                let product = null
                if (sku) {
                    product = await prisma.product.findUnique({ where: { sku } })
                }
                if (!product) {
                    product = await prisma.product.findFirst({ where: { name: productName } })
                }

                if (!product) {
                    errors.push(`Recipe "${name}": Product not found (SKU: ${sku}, Name: ${productName})`)
                    continue
                }

                // Create Ingredient
                await prisma.recipeIngredient.create({
                    data: {
                        recipeId: recipe.id,
                        sectionId: sectionId,
                        productId: product.id,
                        quantity,
                        notes
                    }
                })

                // Log ADD Transaction
                await prisma.transaction.create({
                    data: {
                        type: 'BOM_ADD',
                        quantity,
                        productId: product.id,
                        recipeId: recipe.id,
                        userId: session?.user?.id
                    }
                })
            }

            successCount++

        } catch (error: any) {
            console.error(error)
            errors.push(`Failed to import recipe "${name}": ${error.message}`)
        }
    }

    revalidatePath('/catalogue')
    return { success: successCount, errors }
}

export async function getRecipeForExport(recipeId: string) {
    await requireAdmin()
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
            ingredients: {
                include: {
                    product: true,
                    section: true
                }
            },
            sections: true
        }
    })

    const flattened: any[] = []
    if (!recipe) return flattened

    const coveredSectionIds = new Set<string>()

    // 1. Process Ingredients
    for (const ing of recipe.ingredients) {
        if (ing.sectionId) coveredSectionIds.add(ing.sectionId)
        flattened.push({
            recipeName: recipe.name,
            description: recipe.description,
            section: ing.section?.name || 'Main',
            sku: ing.product.sku || '',
            productName: ing.product.name,
            quantity: ing.quantity,
            notes: ing.notes || ''
        })
    }

    // 2. Process Empty Sections (that had no ingredients)
    for (const sec of recipe.sections) {
        if (!coveredSectionIds.has(sec.id)) {
            flattened.push({
                recipeName: recipe.name,
                description: recipe.description,
                section: sec.name,
                sku: '',
                productName: '',
                quantity: 0,
                notes: ''
            })
        }
    }

    // 3. Process Completely Empty Recipe (No ingredients, No sections)
    if (recipe.ingredients.length === 0 && recipe.sections.length === 0) {
        flattened.push({
            recipeName: recipe.name,
            description: recipe.description,
            section: '',
            sku: '',
            productName: '',
            quantity: 0,
            notes: ''
        })
    }

    return flattened
}
