'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'

// Project Category Actions
export async function getProjectCategories() {
    await requireAuth()
    return (prisma as any).projectcategory.findMany({
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
        const category = await (prisma as any).projectcategory.update({
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
        await (prisma as any).projectcategory.delete({
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

    const projects = await (prisma as any).project.findMany({
        where,
        include: {
            projectcategory: true,
            projectlink: true,
            projecttouser: {
                include: {
                    User: {
                        select: {
                            id: true,
                            nameEnc: true,
                            roleEnc: true
                        }
                    }
                }
            }
        },
        orderBy: { date: 'desc' }
    })

    return projects.map((p: any) => ({
        ...p,
        category: p.projectcategory,
        links: p.projectlink,
        assignedUsers: p.projecttouser.map((pt: any) => ({
            id: pt.User.id,
            name: decrypt(pt.User.nameEnc),
            role: decrypt(pt.User.roleEnc) || 'USER'
        }))
    }))
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
                projectlink: {
                    create: links.map((l: any) => ({
                        label: l.label,
                        url: l.url
                    }))
                },
                projecttouser: {
                    create: assignedUserIds.map((userId: string) => ({
                        User: { connect: { id: userId } }
                    }))
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
        await (prisma as any).projectlink.deleteMany({
            where: { projectId: id }
        })

        // Delete old assigned users and create new ones
        await (prisma as any).projecttouser.deleteMany({
            where: { A: id }
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
                projectlink: {
                    create: links.map((l: any) => ({
                        label: l.label,
                        url: l.url
                    }))
                },
                projecttouser: {
                    create: assignedUserIds.map((userId: string) => ({
                        User: { connect: { id: userId } }
                    }))
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
