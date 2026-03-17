'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { decrypt } from '@/lib/crypto'

// Submit mood for current user
export async function submitMood(mood: string, type: 'CHECK_IN' | 'CHECK_OUT', note?: string) {
    const session: any = await getServerSession(authOptions)
    if (!session?.user?.id) throw new Error('Unauthorized')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Upsert to handle resubmission
    await (prisma.userMood as any).upsert({
        where: {
            userId_date_type: {
                userId: session.user.id,
                date: today,
                type
            }
        },
        update: {
            mood,
            note: note || null
        },
        create: {
            userId: session.user.id,
            date: today,
            type,
            mood,
            note: note || null
        }
    })

    return { success: true }
}

// Check if user already submitted mood today for a given type
export async function getUserMoodToday(type: 'CHECK_IN' | 'CHECK_OUT') {
    const session: any = await getServerSession(authOptions)
    if (!session?.user?.id) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mood = await (prisma.userMood as any).findUnique({
        where: {
            userId_date_type: {
                userId: session.user.id,
                date: today,
                type
            }
        }
    })

    return mood
}

// Admin: Get all moods for a specific date
export async function getAllMoodsForDate(dateStr: string) {
    await requireAuth()

    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)

    const moods = await (prisma.userMood as any).findMany({
        where: { date },
        include: {
            user: {
                select: {
                    id: true,
                    nameEnc: true,
                    photoEnc: true,
                    departmentEnc: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    // Decrypt user data
    const decryptedMoods = moods.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        date: m.date,
        type: m.type,
        mood: m.mood,
        note: m.note,
        createdAt: m.createdAt,
        userName: decrypt(m.user.nameEnc) || 'Unknown',
        userPhoto: decrypt(m.user.photoEnc),
        userDepartment: decrypt(m.user.departmentEnc) || '-'
    }))

    return { success: true, data: decryptedMoods }
}
// Get summary of moods for a specific type today
export async function getMoodSummaryToday(type: 'CHECK_IN' | 'CHECK_OUT') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const moodCounts = await (prisma.userMood as any).groupBy({
        by: ['mood'],
        where: {
            date: today,
            type
        },
        _count: {
            mood: true
        }
    })

    return { 
        success: true, 
        data: moodCounts.map((m: any) => ({
            mood: m.mood,
            count: m._count.mood
        }))
    }
}
