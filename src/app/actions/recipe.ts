'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function createRecipe(formData: FormData) {
    await requireAdmin()
    const name = formData.get('name') as string
    const description = formData.get('description') as string

    await prisma.recipe.create({
        data: {
            name,
            description
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
    const quantity = parseInt(formData.get('quantity') as string)
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

    // Create transaction record for BOM_ADD
    await prisma.transaction.create({
        data: {
            type: 'BOM_ADD',
            quantity,
            productId,
            // @ts-ignore
            recipeId
        }
    })

    revalidatePath(`/catalogue/${recipeId}`)
}

export async function removeIngredient(id: string, recipeId: string) {
    // Fetch ingredient before deleting to get product info
    const ingredient = await prisma.recipeIngredient.findUnique({
        where: { id },
        include: { product: true }
    })

    if (ingredient) {
        // Create transaction record for BOM_REMOVE
        await prisma.transaction.create({
            data: {
                type: 'BOM_REMOVE',
                quantity: ingredient.quantity,
                productId: ingredient.productId,
                // @ts-ignore
                recipeId
            }
        })
    }

    await prisma.recipeIngredient.delete({ where: { id } })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function createSection(recipeId: string, formData: FormData) {
    const name = formData.get('name') as string

    await prisma.recipeSection.create({
        data: {
            name,
            recipeId
        }
    })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function deleteSection(id: string, recipeId: string) {
    // Fetch all ingredients in this section before deleting
    const ingredients = await prisma.recipeIngredient.findMany({
        where: { sectionId: id }
    })

    // Create transaction records for all removed ingredients
    for (const ingredient of ingredients) {
        await prisma.transaction.create({
            data: {
                type: 'BOM_REMOVE',
                quantity: ingredient.quantity,
                productId: ingredient.productId,
                // @ts-ignore
                recipeId
            }
        })
    }

    // Cascade delete ingredients in this section
    await prisma.recipeIngredient.deleteMany({ where: { sectionId: id } })
    await prisma.recipeSection.delete({ where: { id } })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function updateSection(id: string, recipeId: string, formData: FormData) {
    const name = formData.get('name') as string
    await prisma.recipeSection.update({
        where: { id },
        data: { name }
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
