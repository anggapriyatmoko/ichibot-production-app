'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt, encryptDate, decryptDate } from '@/lib/crypto'

// Helper to decrypt attendance record
function decryptAttendance(att: any) {
    if (!att) return null
    return {
        ...att,
        clockIn: decryptDate(att.clockInEnc),
        clockOut: decryptDate(att.clockOutEnc),
        status: decrypt(att.statusEnc),
        notes: decrypt(att.notesEnc),
        // Keep original encrypted fields removed from output
        clockInEnc: undefined,
        clockOutEnc: undefined,
        statusEnc: undefined,
        notesEnc: undefined
    }
}

// Get all attendances for a specific date
export async function getAttendances(dateStr?: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN and HRD can access
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const dateObj = dateStr ? new Date(dateStr) : new Date()
    dateObj.setHours(0, 0, 0, 0)

    // Get all users
    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            username: true,
            department: true,
            role: true
        }
    })

    // Get attendances for this date
    const attendances = await prisma.attendance.findMany({
        where: {
            date: dateObj
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    department: true
                }
            }
        }
    })

    // Map users with their decrypted attendance
    return users.map(user => {
        const attendance = attendances.find((a: any) => a.userId === user.id)
        return {
            user,
            attendance: decryptAttendance(attendance)
        }
    })
}

// Upsert attendance (clock in or clock out)
export async function upsertAttendance(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN and HRD can access
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const userId = formData.get('userId') as string
    const dateStr = formData.get('date') as string
    const clockInStr = formData.get('clockIn') as string | null
    const clockOutStr = formData.get('clockOut') as string | null
    const isHolidayStr = formData.get('isHoliday') as string | null
    const notes = formData.get('notes') as string | null

    if (!userId || !dateStr) {
        throw new Error('User ID and date are required')
    }

    const dateObj = new Date(dateStr)
    dateObj.setHours(0, 0, 0, 0)

    const isHoliday = isHolidayStr === 'true'
    const updateHolidayGlobal = formData.get('updateHolidayGlobal') === 'true'
    const status = formData.get('status') as string | null

    // Build update data with encryption
    const updateData: any = {
        isHoliday,
        statusEnc: encrypt(status),
        notesEnc: encrypt(notes)
    }
    const createData: any = {
        userId,
        date: dateObj,
        isHoliday,
        statusEnc: encrypt(status),
        notesEnc: encrypt(notes)
    }

    // Logic: Only set clockIn/clockOut if Status is PRESENT (or null for backward compat)
    if (!status || status === 'PRESENT') {
        if (clockInStr) {
            const [hours, minutes] = clockInStr.split(':')
            const clockIn = new Date(dateObj)
            clockIn.setHours(parseInt(hours), parseInt(minutes), 0, 0)
            updateData.clockInEnc = encryptDate(clockIn)
            createData.clockInEnc = encryptDate(clockIn)
        } else if (clockInStr === '') {
            updateData.clockInEnc = null
            createData.clockInEnc = null
        }

        if (clockOutStr) {
            const [hours, minutes] = clockOutStr.split(':')
            const clockOut = new Date(dateObj)
            clockOut.setHours(parseInt(hours), parseInt(minutes), 0, 0)
            updateData.clockOutEnc = encryptDate(clockOut)
            createData.clockOutEnc = encryptDate(clockOut)
        } else if (clockOutStr === '') {
            updateData.clockOutEnc = null
            createData.clockOutEnc = null
        }
    } else {
        // Clear times if status is NOT PRESENT
        updateData.clockInEnc = null
        createData.clockInEnc = null
        updateData.clockOutEnc = null
        createData.clockOutEnc = null
    }

    // If updating global holiday status (checked or unchecked)
    if (updateHolidayGlobal) {
        const allUsers = await prisma.user.findMany({ select: { id: true } })

        for (const user of allUsers) {
            await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: user.id,
                        date: dateObj
                    }
                },
                update: { isHoliday },
                create: {
                    userId: user.id,
                    date: dateObj,
                    isHoliday
                }
            })
        }

        revalidatePath('/attendance')
        return { success: true, message: isHoliday ? 'Libur Nasional diterapkan ke semua karyawan' : 'Libur Nasional dibatalkan untuk semua karyawan' }
    }

    // Regular attendance upsert for single user
    const result = await prisma.attendance.upsert({
        where: {
            userId_date: {
                userId,
                date: dateObj
            }
        },
        update: updateData,
        create: createData
    })

    revalidatePath('/attendance')
    return { success: true, data: result }
}

// Delete attendance
export async function deleteAttendance(id: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN and HRD can access
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    await prisma.attendance.delete({ where: { id } })
    revalidatePath('/attendance')
    return { success: true }
}

// Get monthly attendance summary for a user (decrypted)
export async function getMonthlyAttendance(userId: string, month: number, year: number) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN and HRD can access
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month

    const records = await prisma.attendance.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { date: 'asc' }
    })

    // Decrypt all records
    return records.map(decryptAttendance)
}
