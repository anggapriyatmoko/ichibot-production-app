'use server'

import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'

export async function upsertLogActivity(data: { date: Date | string; activity: string; problem?: string }) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) throw new Error('User not found')

    // Normalize date to midnight
    const dateObj = new Date(data.date)
    dateObj.setHours(0, 0, 0, 0)

    const result = await prisma.logActivity.upsert({
        where: {
            userId_date: {
                userId,
                date: dateObj
            }
        },
        update: {
            activity: data.activity,
            problem: data.problem
        },
        create: {
            userId,
            date: dateObj,
            activity: data.activity,
            problem: data.problem
        }
    })

    revalidatePath('/log-activity')
    return result
}

export async function getLogActivities(targetUserId?: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const currentUserId = session?.user?.id
    const isAdmin = session?.user?.role === 'ADMIN'

    // If targetUserId is provided, check if admin.
    // If not admin, ignore targetUserId and use current.
    let queryUserId = currentUserId

    if (isAdmin && targetUserId) {
        queryUserId = targetUserId
    }

    return prisma.logActivity.findMany({
        where: {
            userId: queryUserId
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            user: {
                select: {
                    name: true,
                    username: true,
                    department: true
                }
            }
        }
    })
}

export async function getUsersForLog() {
    await requireAuth()
    // Allow admin to fetch users list
    // Or maybe just fetch all users if admin?
    // Let's check admin inside
    const session: any = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    if (!isAdmin) return []

    return prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            department: true
        },
        orderBy: {
            name: 'asc'
        }
    })
}

export async function deleteLogActivity(id: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const currentUserId = session?.user?.id
    const isAdmin = session?.user?.role === 'ADMIN'

    const log = await prisma.logActivity.findUnique({ where: { id } })
    if (!log) throw new Error('Log not found')

    if (log.userId !== currentUserId && !isAdmin) {
        throw new Error(`Unauthorized: Owner ${log.userId} !== User ${currentUserId}`)
    }

    await prisma.logActivity.delete({ where: { id } })
    revalidatePath('/log-activity')
}

export async function getDailyActivityRecap(dateStr: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') return []

    const dateObj = new Date(dateStr)
    dateObj.setHours(0, 0, 0, 0)

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            username: true,
            department: true
        }
    })

    const logs = await prisma.logActivity.findMany({
        where: {
            date: dateObj
        }
    })

    return users.map(user => {
        const log = logs.find(l => l.userId === user.id)
        return {
            user,
            log: log || null
        }
    })
}
