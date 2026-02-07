'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'

export async function getSectionCategories() {
    return await prisma.sectioncategory.findMany({
        orderBy: { name: 'asc' }
    })
}

export async function createSectionCategory(name: string) {
    await requireAdmin()

    if (!name || name.trim() === '') {
        return { error: 'Nama kategori wajib diisi' }
    }

    try {
        const category = await prisma.sectioncategory.create({
            data: { name: name.trim() }
        })
        revalidatePath('/catalogue/settings')
        return { success: true, category }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { error: 'Kategori sudah ada' }
        }
        console.error('Failed to create section category:', error)
        return { error: 'Gagal membuat kategori' }
    }
}

export async function updateSectionCategory(id: string, name: string) {
    await requireAdmin()

    if (!name || name.trim() === '') {
        return { error: 'Nama kategori wajib diisi' }
    }

    try {
        const category = await prisma.sectioncategory.update({
            where: { id },
            data: { name: name.trim() }
        })
        revalidatePath('/catalogue/settings')
        return { success: true, category }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { error: 'Kategori dengan nama ini sudah ada' }
        }
        console.error('Failed to update section category:', error)
        return { error: 'Gagal memperbarui kategori' }
    }
}

export async function deleteSectionCategory(id: string) {
    await requireAdmin()
    try {
        await prisma.sectioncategory.delete({
            where: { id }
        })
        revalidatePath('/catalogue/settings')
        return { success: true }
    } catch (error: any) {
        // Check if it's being used in RecipeSection
        if (error.code === 'P2003') {
            return { error: 'Kategori ini sedang digunakan oleh Section dalam Recipe dan tidak bisa dihapus.' }
        }
        console.error('Failed to delete section category:', error)
        return { error: 'Gagal menghapus kategori' }
    }
}
