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

    // Validate if product exists
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw new Error('Product not found')

    await prisma.recipeIngredient.create({
        data: {
            recipeId,
            productId,
            quantity,
            notes
        }
    })
    revalidatePath(`/catalogue/${recipeId}`)
}

export async function removeIngredient(id: string, recipeId: string) {
    await prisma.recipeIngredient.delete({ where: { id } })
    revalidatePath(`/catalogue/${recipeId}`)
}
