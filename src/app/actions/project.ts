'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireAdmin } from '@/lib/auth'

// Project Category Actions
export async function getProjectCategories() {
    await requireAuth()
    return (prisma as any).projectCategory.findMany({
        orderBy: { name: 'asc' }
    })
}

export async function createProjectCategory(name: string) {
    await requireAdmin()
    try {
        const category = await (prisma as any).projectCategory.create({
            data: { name: name.trim() }
        })
        revalidatePath('/projects/settings')
        return { success: true, data: category }
    } catch (error: any) {
        return { error: 'Kategori sudah ada atau terjadi kesalahan' }
    }
}

export async function updateProjectCategory(id: string, name: string) {
    await requireAdmin()
    try {
        const category = await (prisma as any).projectCategory.update({
            where: { id },
            data: { name: name.trim() }
        })
        revalidatePath('/projects/settings')
        return { success: true, data: category }
    } catch (error: any) {
        return { error: 'Gagal memperbarui kategori' }
    }
}

export async function deleteProjectCategory(id: string) {
    await requireAdmin()
    try {
        await (prisma as any).projectCategory.delete({
            where: { id }
        })
        revalidatePath('/projects/settings')
        return { success: true }
    } catch (error: any) {
        return { error: 'Gagal menghapus kategori (mungkin masih digunakan oleh project)' }
    }
}

// Project Actions
export async function getProjects() {
    const session = await requireAuth()

    const where: any = {}

    // If user is not ADMIN or HRD, only show projects assigned to them
    if (!['ADMIN', 'HRD'].includes(session.user.role || '')) {
        where.assignedUsers = {
            some: {
                id: session.user.id
            }
        }
    }

    return (prisma as any).project.findMany({
        where,
        include: {
            category: true,
            links: true,
            assignedUsers: {
                select: {
                    id: true,
                    name: true,
                    role: true
                }
            }
        },
        orderBy: { date: 'desc' }
    })
}

export async function createProject(formData: FormData) {
    await requireAdmin()
    const name = formData.get('name') as string
    const client = formData.get('client') as string | null
    const dateStr = formData.get('date') as string | null
    const description = formData.get('description') as string | null
    const status = formData.get('status') as string || 'PENDING'
    const categoryId = formData.get('categoryId') as string | null
    const linksJson = formData.get('links') as string | null // Expecting "[{label: '...', url: '...'}]"
    const assignedUserIdsJson = formData.get('assignedUserIds') as string | null // Expecting "["id1", "id2"]"

    if (!name?.trim()) return { error: 'Nama project wajib diisi' }

    try {
        const links = linksJson ? JSON.parse(linksJson) : []
        const assignedUserIds = assignedUserIdsJson ? JSON.parse(assignedUserIdsJson) : []

        const project = await (prisma as any).project.create({
            data: {
                name: name.trim(),
                client: client?.trim(),
                date: dateStr ? new Date(dateStr) : null,
                description: description?.trim(),
                status,
                categoryId: categoryId || null,
                links: {
                    create: links.map((l: any) => ({
                        label: l.label,
                        url: l.url
                    }))
                },
                assignedUsers: {
                    connect: assignedUserIds.map((id: string) => ({ id }))
                }
            }
        })
        revalidatePath('/projects')
        return { success: true, data: project }
    } catch (error: any) {
        console.error(error)
        return { error: 'Gagal membuat project' }
    }
}

export async function updateProject(formData: FormData) {
    await requireAdmin()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const client = formData.get('client') as string | null
    const dateStr = formData.get('date') as string | null
    const description = formData.get('description') as string | null
    const status = formData.get('status') as string
    const categoryId = formData.get('categoryId') as string | null
    const linksJson = formData.get('links') as string | null
    const assignedUserIdsJson = formData.get('assignedUserIds') as string | null

    if (!name?.trim()) return { error: 'Nama project wajib diisi' }

    try {
        const links = linksJson ? JSON.parse(linksJson) : []
        const assignedUserIds = assignedUserIdsJson ? JSON.parse(assignedUserIdsJson) : []

        // Delete old links and create new ones
        await (prisma as any).projectLink.deleteMany({
            where: { projectId: id }
        })

        const project = await (prisma as any).project.update({
            where: { id },
            data: {
                name: name.trim(),
                client: client?.trim(),
                date: dateStr ? new Date(dateStr) : null,
                description: description?.trim(),
                status,
                categoryId: categoryId || null,
                links: {
                    create: links.map((l: any) => ({
                        label: l.label,
                        url: l.url
                    }))
                },
                assignedUsers: {
                    set: assignedUserIds.map((id: string) => ({ id }))
                }
            }
        })
        revalidatePath('/projects')
        return { success: true, data: project }
    } catch (error: any) {
        console.error(error)
        return { error: 'Gagal memperbarui project' }
    }
}

export async function deleteProject(id: string) {
    await requireAdmin()
    try {
        await (prisma as any).project.delete({
            where: { id }
        })
        revalidatePath('/projects')
        return { success: true }
    } catch (error: any) {
        return { error: 'Gagal menghapus project' }
    }
}
