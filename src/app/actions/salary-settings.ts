'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSalaryComponents(type: 'DEDUCTION' | 'ADDITION') {
    try {
        const components = await prisma.salaryComponent.findMany({
            where: {
                type
            },
            orderBy: {
                createdAt: 'asc'
            }
        })
        return { success: true, data: components }
    } catch (error) {
        console.error('Error fetching salary components:', error)
        return { success: false, error: 'Failed to fetch components' }
    }
}

export async function createSalaryComponent(name: string, type: 'DEDUCTION' | 'ADDITION') {
    try {
        // Check for duplicates
        const existing = await prisma.salaryComponent.findFirst({
            where: {
                name,
                type
            }
        })

        if (existing) {
            return { success: false, error: 'Component already exists' }
        }

        await prisma.salaryComponent.create({
            data: {
                name,
                type
            }
        })

        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error creating salary component:', error)
        return { success: false, error: 'Failed to create component' }
    }
}

export async function deleteSalaryComponent(id: string) {
    try {
        await prisma.salaryComponent.delete({
            where: {
                id
            }
        })

        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting salary component:', error)
        return { success: false, error: 'Failed to delete component' }
    }
}
