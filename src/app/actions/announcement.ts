'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'
import { encrypt, decrypt } from '@/lib/crypto'

export async function createAnnouncement(content: string, targetUserIds: string[], speed: number = 12) {
    await requireAdmin()
    const user = await getCurrentUser()

    if (!user) return { error: 'Unauthorized' }

    try {
        await prisma.announcement.create({
            data: {
                contentEnc: encrypt(content) || '',
                isActive: true,
                speed,
                creatorId: user.id,
                targetUsers: {
                    connect: targetUserIds.map(id => ({ id }))
                }
            }
        })
        revalidatePath('/hrd-dashboard')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error(error)
        return { error: error.message }
    }
}

export async function updateAnnouncement(id: string, content: string, targetUserIds: string[]) {
    await requireAdmin()

    try {
        await prisma.announcement.update({
            where: { id },
            data: {
                contentEnc: encrypt(content) || '',
                targetUsers: {
                    set: targetUserIds.map(id => ({ id }))
                }
            }
        })
        revalidatePath('/hrd-dashboard')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        console.error(error)
        return { error: error.message }
    }
}

export async function updateAnnouncementSpeed(id: string, speed: number) {
    await requireAdmin()

    try {
        await prisma.announcement.update({
            where: { id },
            data: { speed }
        })
        revalidatePath('/hrd-dashboard')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getAnnouncements(page: number = 1, limit: number = 5) {
    await requireAdmin()
    const { decrypt } = require('@/lib/crypto')

    const skip = (page - 1) * limit

    const [rawData, total] = await prisma.$transaction([
        prisma.announcement.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                targetUsers: {
                    select: {
                        id: true,
                        nameEnc: true,
                        usernameEnc: true
                    }
                },
                creator: {
                    select: {
                        nameEnc: true
                    }
                }
            }
        }),
        prisma.announcement.count()
    ])

    const data = rawData.map((ann: any) => ({
        ...ann,
        content: decrypt(ann.contentEnc) || '',
        targetUsers: ann.targetUsers.map((u: any) => ({
            id: u.id,
            name: decrypt(u.nameEnc) || '',
            username: decrypt(u.usernameEnc) || 'Unknown'
        })),
        creator: ann.creator ? {
            name: decrypt(ann.creator.nameEnc) || ''
        } : null
    }))

    return {
        data,
        total,
        totalPages: Math.ceil(total / limit)
    }
}

export async function toggleAnnouncementStatus(id: string, currentStatus: boolean) {
    await requireAdmin()

    try {
        await prisma.announcement.update({
            where: { id },
            data: { isActive: !currentStatus }
        })
        revalidatePath('/hrd-dashboard')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function deleteAnnouncement(id: string) {
    await requireAdmin()

    try {
        await prisma.announcement.delete({
            where: { id }
        })
        revalidatePath('/hrd-dashboard')
        revalidatePath('/')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getActiveAnnouncementsForUser() {
    const user = await getCurrentUser()
    if (!user) return []

    const announcementsData = await prisma.announcement.findMany({
        where: {
            isActive: true,
            targetUsers: {
                some: {
                    id: user.id
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            contentEnc: true,
            speed: true
        }
    })

    return announcementsData.map(ann => ({
        ...ann,
        content: decrypt(ann.contentEnc) || ''
    }))
}
