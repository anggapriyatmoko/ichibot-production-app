'use server'

import prisma from '@/lib/prisma'
import { requireAuth, requirePageAccess } from '@/lib/auth'
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
    await requirePageAccess('/hr-settings', ['ADMIN', 'HRD'])

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

// ============== Custom Work Schedules ==============

// Get all custom work schedules
export async function getCustomWorkSchedules() {
    await requireAuth()

    return prisma.customWorkSchedule.findMany({
        orderBy: { startDate: 'asc' }
    })
}

// Create a new custom work schedule
export async function createCustomWorkSchedule(formData: FormData) {
    await requireAuth()
    await requirePageAccess('/hr-settings', ['ADMIN', 'HRD'])

    const startDate = new Date(formData.get('startDate') as string)
    const endDate = new Date(formData.get('endDate') as string)
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const reason = formData.get('reason') as string

    await prisma.customWorkSchedule.create({
        data: {
            startDate,
            endDate,
            startTime,
            endTime,
            reason
        }
    })

    revalidatePath('/hr-settings')
    return { success: true }
}

// Update custom work schedule
export async function updateCustomWorkSchedule(formData: FormData) {
    await requireAuth()
    await requirePageAccess('/hr-settings', ['ADMIN', 'HRD'])

    const id = formData.get('id') as string
    const startDate = new Date(formData.get('startDate') as string)
    const endDate = new Date(formData.get('endDate') as string)
    const startTime = formData.get('startTime') as string
    const endTime = formData.get('endTime') as string
    const reason = formData.get('reason') as string

    await prisma.customWorkSchedule.update({
        where: { id },
        data: {
            startDate,
            endDate,
            startTime,
            endTime,
            reason
        }
    })

    revalidatePath('/hr-settings')
    return { success: true }
}

// Delete custom work schedule
export async function deleteCustomWorkSchedule(id: string) {
    await requireAuth()
    await requirePageAccess('/hr-settings', ['ADMIN', 'HRD'])

    await prisma.customWorkSchedule.delete({
        where: { id }
    })

    revalidatePath('/hr-settings')
    return { success: true }
}
