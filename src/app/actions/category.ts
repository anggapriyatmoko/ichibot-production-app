'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function createCategory(name: string) {
    await requireAdmin()

    if (!name || name.trim() === '') {
        return { error: 'Name is required' }
    }

    try {
        const category = await prisma.category.create({
            data: { name: name.trim() }
        })
        revalidatePath('/catalogue')
        revalidatePath('/inventory')
        return { success: true, category }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { error: 'Category already exists' }
        }
        console.error('Failed to create category:', error)
        return { error: 'Failed to create category' }
    }
}

export async function updateCategory(id: string, name: string) {
    await requireAdmin()

    if (!name || name.trim() === '') {
        return { error: 'Name is required' }
    }

    try {
        const category = await prisma.category.update({
            where: { id },
            data: { name: name.trim() }
        })
        revalidatePath('/catalogue')
        revalidatePath('/inventory')
        return { success: true, category }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { error: 'Category with this name already exists' }
        }
        console.error('Failed to update category:', error)
        return { error: 'Failed to update category' }
    }
}

export async function getCategories() {
    return await prisma.category.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { recipe: true }
            }
        }
    })
}

export async function deleteCategory(id: string) {
    await requireAdmin()
    try {
        await prisma.category.delete({
            where: { id }
        })
        revalidatePath('/catalogue')
        return { success: true }
    } catch (error: any) {
        console.error('Failed to delete category:', error)
        return { error: 'Failed to delete category' }
    }
}
