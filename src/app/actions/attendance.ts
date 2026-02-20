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
        orderBy: { id: 'asc' },
        select: {
            id: true,
            nameEnc: true,
            usernameEnc: true,
            departmentEnc: true,
            roleEnc: true
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
                    nameEnc: true,
                    usernameEnc: true,
                    departmentEnc: true
                }
            }
        }
    })

    // Map users with their decrypted attendance
    return users.map(user => {
        const attendance = attendances.find((a: any) => a.userId === user.id)
        return {
            user: {
                ...user,
                name: decrypt(user.nameEnc),
                username: decrypt(user.usernameEnc) || 'Unknown',
                department: decrypt(user.departmentEnc),
                role: decrypt(user.roleEnc) || 'USER'
            },
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

// Get attendance summary for payroll period (from salaryCalcDay of previous month to salaryCalcDay-1 of current month)
export async function getPayrollPeriodAttendanceSummary(salaryCalcDay: number, month: number, year: number) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    // Only ADMIN and HRD can access
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    // Calculate period: from salaryCalcDay of previous month to salaryCalcDay-1 of current month
    // Example: salaryCalcDay=25, month=1, year=2026
    // Period: 25 Dec 2025 to 24 Jan 2026
    let startDate: Date
    let endDate: Date

    if (month === 1) {
        startDate = new Date(year - 1, 11, salaryCalcDay) // December of previous year
    } else {
        startDate = new Date(year, month - 2, salaryCalcDay) // Previous month
    }
    endDate = new Date(year, month - 1, salaryCalcDay - 1) // Current month, day before salaryCalcDay

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // Cap endDate at today if it's in the future
    const now = new Date()
    now.setHours(23, 59, 59, 999)

    if (endDate > now) {
        endDate = now
    }

    // Get all users
    const users = await prisma.user.findMany({
        where: {},
        orderBy: { id: 'asc' },
        select: {
            id: true,
            nameEnc: true,
            departmentEnc: true,
            roleEnc: true
        }
    })

    // Get work schedules
    const workSchedules = await prisma.workSchedule.findMany()
    const workDays = workSchedules.filter(ws => ws.isWorkDay).map(ws => ws.dayOfWeek)
    const scheduleByDay = new Map(workSchedules.map(ws => [ws.dayOfWeek, ws]))

    // Get custom work schedules that overlap with the period
    const customSchedules = await prisma.customWorkSchedule.findMany({
        where: {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
        }
    })

    // Helper to find custom schedule for a date
    const findCustomSchedule = (date: Date) => {
        return customSchedules.find(cs => {
            const csStart = new Date(cs.startDate)
            csStart.setHours(0, 0, 0, 0)
            const csEnd = new Date(cs.endDate)
            csEnd.setHours(23, 59, 59, 999)
            return date >= csStart && date <= csEnd
        })
    }

    // Get all attendances in period
    const allAttendances = await prisma.attendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    })

    // Process each user
    const result = users.map(user => {
        const userAttendances = allAttendances.filter(a => a.userId === user.id)

        let totalWorkDays = 0
        let lateCount = 0
        let lateMinutes = 0
        let absentCount = 0
        let permitCount = 0
        let noClockOutCount = 0

        // Iterate through each day in the period
        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay()
            const schedule = scheduleByDay.get(dayOfWeek)
            const isSunday = dayOfWeek === 0

            // Count all days as total work days
            totalWorkDays++

            const attendance = userAttendances.find(a => {
                const attDate = new Date(a.date)
                return attDate.toDateString() === currentDate.toDateString()
            })

            // Sunday = counted as present (skip further checks)
            if (isSunday) {
                currentDate.setDate(currentDate.getDate() + 1)
                continue
            }

            // National holiday = counted as present
            if (attendance?.isHoliday) {
                currentDate.setDate(currentDate.getDate() + 1)
                continue
            }

            // Check if it's a work day based on schedule or custom schedule
            const customSchedule = findCustomSchedule(currentDate)
            const isWorkDay = customSchedule ? true : workDays.includes(dayOfWeek)

            if (isWorkDay) {
                if (attendance) {
                    const decrypted = decryptAttendance(attendance)
                    const status = decrypted?.status

                    if (status === 'PERMIT' || status === 'LEAVE' || status === 'SICK') {
                        permitCount++
                    } else if (status === 'PRESENT' || !status) {
                        // Check if late - use custom schedule times if available
                        const effectiveStartTime = customSchedule?.startTime || schedule?.startTime
                        if (decrypted?.clockIn && effectiveStartTime) {
                            const clockInTime = new Date(decrypted.clockIn)
                            const [schedHours, schedMins] = effectiveStartTime.split(':').map(Number)
                            const scheduleStart = new Date(currentDate)
                            scheduleStart.setHours(schedHours, schedMins, 0, 0)

                            if (clockInTime > scheduleStart) {
                                lateCount++
                                // Calculate minutes late
                                const diffMs = clockInTime.getTime() - scheduleStart.getTime()
                                lateMinutes += Math.floor(diffMs / 60000)
                            }
                        }

                        // Check if no clock out
                        if (decrypted?.clockIn && !decrypted?.clockOut) {
                            noClockOutCount++
                        }
                    }
                } else {
                    // No attendance record on a work day = absent
                    absentCount++
                }
            }

            currentDate.setDate(currentDate.getDate() + 1)
        }

        return {
            id: user.id,
            name: decrypt(user.nameEnc),
            department: decrypt(user.departmentEnc),
            role: decrypt(user.roleEnc) || 'USER',
            totalWorkDays,
            lateCount,
            lateMinutes,
            absentCount,
            permitCount,
            noClockOutCount
        }
    })

    return {
        success: true,
        data: result,
        period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        }
    }
}

// Get attendance summary for payroll period for CURRENT USER
export async function getMyPayrollPeriodAttendanceSummary(salaryCalcDay: number, month: number, year: number) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) {
        throw new Error('Unauthorized')
    }

    // Calculate period: from salaryCalcDay of previous month to salaryCalcDay-1 of current month
    let startDate: Date
    let endDate: Date

    if (month === 1) {
        startDate = new Date(year - 1, 11, salaryCalcDay) // December of previous year
    } else {
        startDate = new Date(year, month - 2, salaryCalcDay) // Previous month
    }
    endDate = new Date(year, month - 1, salaryCalcDay - 1) // Current month, day before salaryCalcDay

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // Cap endDate at today if it's in the future
    const now = new Date()
    now.setHours(23, 59, 59, 999)

    if (endDate > now) {
        endDate = now
    }

    // Get user details
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            nameEnc: true,
            departmentEnc: true,
            roleEnc: true
        }
    })

    if (!user) throw new Error('User not found')

    // Get work schedules
    const workSchedules = await prisma.workSchedule.findMany()
    const workDays = workSchedules.filter(ws => ws.isWorkDay).map(ws => ws.dayOfWeek)
    const scheduleByDay = new Map(workSchedules.map(ws => [ws.dayOfWeek, ws]))

    // Get custom work schedules that overlap with the period
    const customSchedules = await prisma.customWorkSchedule.findMany({
        where: {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
        }
    })

    // Helper to find custom schedule for a date
    const findCustomSchedule = (date: Date) => {
        return customSchedules.find(cs => {
            const csStart = new Date(cs.startDate)
            csStart.setHours(0, 0, 0, 0)
            const csEnd = new Date(cs.endDate)
            csEnd.setHours(23, 59, 59, 999)
            return date >= csStart && date <= csEnd
        })
    }

    // Get user attendances in period
    const userAttendances = await prisma.attendance.findMany({
        where: {
            userId: userId,
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    })

    let totalWorkDays = 0
    let lateCount = 0
    let lateMinutes = 0
    let absentCount = 0
    let permitCount = 0
    let noClockOutCount = 0

    // Iterate through each day in the period
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        const schedule = scheduleByDay.get(dayOfWeek)
        const isSunday = dayOfWeek === 0

        // Count all days as total work days
        totalWorkDays++

        const attendance = userAttendances.find(a => {
            const attDate = new Date(a.date)
            return attDate.toDateString() === currentDate.toDateString()
        })

        // Sunday = counted as present (skip further checks)
        if (isSunday) {
            currentDate.setDate(currentDate.getDate() + 1)
            continue
        }

        // National holiday = counted as present
        if (attendance?.isHoliday) {
            currentDate.setDate(currentDate.getDate() + 1)
            continue
        }

        // Check if it's a work day based on schedule or custom schedule
        const customSchedule = findCustomSchedule(currentDate)
        const isWorkDay = customSchedule ? true : workDays.includes(dayOfWeek)

        if (isWorkDay) {
            if (attendance) {
                const decrypted = decryptAttendance(attendance)
                const status = decrypted?.status

                if (status === 'PERMIT' || status === 'LEAVE' || status === 'SICK') {
                    permitCount++
                } else if (status === 'PRESENT' || !status) {
                    // Check if late - use custom schedule times if available
                    const effectiveStartTime = customSchedule?.startTime || schedule?.startTime
                    if (decrypted?.clockIn && effectiveStartTime) {
                        const clockInTime = new Date(decrypted.clockIn)
                        const [schedHours, schedMins] = effectiveStartTime.split(':').map(Number)
                        const scheduleStart = new Date(currentDate)
                        scheduleStart.setHours(schedHours, schedMins, 0, 0)

                        if (clockInTime > scheduleStart) {
                            lateCount++
                            // Calculate minutes late
                            const diffMs = clockInTime.getTime() - scheduleStart.getTime()
                            lateMinutes += Math.floor(diffMs / 60000)
                        }
                    }

                    // Check if no clock out
                    if (decrypted?.clockIn && !decrypted?.clockOut) {
                        noClockOutCount++
                    }
                }
            } else {
                // No attendance record on a work day = absent
                absentCount++
            }
        }

        currentDate.setDate(currentDate.getDate() + 1)
    }

    return {
        success: true,
        data: {
            id: user.id,
            name: decrypt(user.nameEnc),
            department: decrypt(user.departmentEnc),
            role: decrypt(user.roleEnc) || 'USER',
            totalWorkDays,
            lateCount,
            lateMinutes,
            absentCount,
            permitCount,
            noClockOutCount
        },
        period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        }
    }
}
