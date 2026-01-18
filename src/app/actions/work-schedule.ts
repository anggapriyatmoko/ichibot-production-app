'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'

const defaultSchedule = [
    { dayOfWeek: 0, dayName: 'Minggu', startTime: null, endTime: null, isWorkDay: false },
    { dayOfWeek: 1, dayName: 'Senin', startTime: '08:00', endTime: '17:00', isWorkDay: true },
    { dayOfWeek: 2, dayName: 'Selasa', startTime: '08:00', endTime: '17:00', isWorkDay: true },
    { dayOfWeek: 3, dayName: 'Rabu', startTime: '08:00', endTime: '17:00', isWorkDay: true },
    { dayOfWeek: 4, dayName: 'Kamis', startTime: '08:00', endTime: '17:00', isWorkDay: true },
    { dayOfWeek: 5, dayName: 'Jumat', startTime: '08:00', endTime: '17:00', isWorkDay: true },
    { dayOfWeek: 6, dayName: 'Sabtu', startTime: null, endTime: null, isWorkDay: false },
]

// Get all work schedules
export async function getWorkSchedules() {
    await requireAuth()

    const schedules = await prisma.workSchedule.findMany({
        orderBy: { dayOfWeek: 'asc' }
    })

    // If no schedules exist, create default ones
    if (schedules.length === 0) {
        for (const schedule of defaultSchedule) {
            await prisma.workSchedule.create({
                data: schedule
            })
        }
        return prisma.workSchedule.findMany({
            orderBy: { dayOfWeek: 'asc' }
        })
    }

    return schedules
}

// Update work schedule
export async function updateWorkSchedule(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN and HRD can update
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const dayOfWeek = parseInt(formData.get('dayOfWeek') as string)
    const startTime = formData.get('startTime') as string | null
    const endTime = formData.get('endTime') as string | null
    const isWorkDay = formData.get('isWorkDay') === 'true'

    await prisma.workSchedule.update({
        where: { dayOfWeek },
        data: {
            startTime: isWorkDay ? startTime : null,
            endTime: isWorkDay ? endTime : null,
            isWorkDay
        }
    })

    revalidatePath('/hr-settings')
    return { success: true }
}
