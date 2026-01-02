'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createRecipe(formData: FormData) {
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
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function removeIngredient(id: string, recipeId: string) {
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
