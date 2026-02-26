'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getExpenseCategories() {
    try {
        const categories = await prisma.expenseCategory.findMany({
            orderBy: {
                name: 'asc'
            }
        })
        return { success: true, data: categories }
    } catch (error) {
        console.error('Error fetching expense categories:', error)
        return { success: false, error: 'Failed to fetch categories' }
    }
}

export async function createExpenseCategory(data: { name: string; description?: string }) {
    try {
        const existing = await prisma.expenseCategory.findUnique({
            where: { name: data.name }
        })

        if (existing) {
            return { success: false, error: 'Category with this name already exists' }
        }

        const category = await prisma.expenseCategory.create({
            data: {
                name: data.name,
                description: data.description || null
            }
        })

        revalidatePath('/keuangan/setting')
        return { success: true, data: category }
    } catch (error) {
        console.error('Error creating expense category:', error)
        return { success: false, error: 'Failed to create category' }
    }
}

export async function updateExpenseCategory(id: string, data: { name: string; description?: string }) {
    try {
        const existing = await prisma.expenseCategory.findFirst({
            where: {
                name: data.name,
                NOT: { id }
            }
        })

        if (existing) {
            return { success: false, error: 'Category with this name already exists' }
        }

        const category = await prisma.expenseCategory.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description || null
            }
        })

        revalidatePath('/keuangan/setting')
        return { success: true, data: category }
    } catch (error) {
        console.error('Error updating expense category:', error)
        return { success: false, error: 'Failed to update category' }
    }
}

export async function deleteExpenseCategory(id: string) {
    try {
        await prisma.expenseCategory.delete({
            where: { id }
        })

        revalidatePath('/keuangan/setting')
        return { success: true }
    } catch (error) {
        console.error('Error deleting expense category:', error)
        return { success: false, error: 'Failed to delete category (it may be in use)' }
    }
}
