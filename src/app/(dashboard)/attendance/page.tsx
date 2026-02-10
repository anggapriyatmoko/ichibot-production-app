import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import AttendanceManager from '@/components/attendance/attendance-manager'
import UserAttendanceSummary from '@/components/attendance/user-attendance-summary'
import AttendanceHeader from '@/components/attendance/attendance-header'

import { decrypt, decryptDate } from '@/lib/crypto'

export const metadata = {
    title: 'Absensi | Ichibot Production',
    description: 'Kelola data absensi karyawan'
}

export const dynamic = 'force-dynamic'

export default async function AttendancePage({
    searchParams
}: {
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    const isAdmin = ['ADMIN', 'HRD'].includes(session?.user?.role)
    const currentUserId = session.user.id

    const params = await searchParams
    const today = new Date()
    const currentMonth = params.month ? parseInt(params.month) : today.getMonth() + 1
    const currentYear = params.year ? parseInt(params.year) : today.getFullYear()

    // Calculate first and last day of month
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const nextMonth = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth, 0) // For daysInMonth calculation

    // Get all days in month
    const daysInMonth = lastDay.getDate()

    // Get users - all for admin/HRD, only self for regular users
    const users = isAdmin
        ? await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                nameEnc: true,
                usernameEnc: true,
                departmentEnc: true,
                roleEnc: true
            }
        })
        : await prisma.user.findMany({
            where: { id: currentUserId },
            select: {
                id: true,
                nameEnc: true,
                usernameEnc: true,
                departmentEnc: true,
                roleEnc: true
            }
        })

    // Get all attendances for the month
    const rawAttendances = await prisma.attendance.findMany({
        where: isAdmin
            ? {
                date: {
                    gte: firstDay,
                    lt: nextMonth
                }
            }
            : {
                userId: currentUserId,
                date: {
                    gte: firstDay,
                    lt: nextMonth
                }
            }
    })

    // Decrypt attendance records
    const attendances = rawAttendances.map((att: any) => ({
        ...att,
        clockIn: decryptDate(att.clockInEnc),
        clockOut: decryptDate(att.clockOutEnc),
        status: decrypt(att.statusEnc),
        notes: decrypt(att.notesEnc)
    }))

    // Get work schedules
    const workSchedules = await prisma.workSchedule.findMany()
    const workScheduleMap = new Map<number, typeof workSchedules[0]>(workSchedules.map(s => [s.dayOfWeek, s]))

    // Build monthly data structure
    const monthlyData = users.map(userItem => {
        const user = {
            ...userItem,
            name: decrypt(userItem.nameEnc),
            username: decrypt(userItem.usernameEnc) || 'Unknown',
            department: decrypt(userItem.departmentEnc),
            role: decrypt(userItem.roleEnc) || 'USER'
        }
        const userAttendances: { [day: number]: any } = {}
        let totalLateMinutes = 0
        let totalEarlyDepartureMinutes = 0
        let totalAbsentDays = 0

        for (let day = 1; day <= daysInMonth; day++) {
            const dateToCheck = new Date(currentYear, currentMonth - 1, day)
            dateToCheck.setHours(0, 0, 0, 0)

            const attendance = attendances.find((a: any) =>
                a.userId === user.id &&
                new Date(a.date).toDateString() === dateToCheck.toDateString()
            )

            // Calculation Logic
            let isLate = false
            let isEarlyDeparture = false
            if (attendance && !attendance.isHoliday && attendance.clockIn) {
                const dayOfWeek = dateToCheck.getDay()
                const schedule = workScheduleMap.get(dayOfWeek)

                if (schedule && schedule.isWorkDay && schedule.startTime && schedule.endTime) {
                    // Late Calculation: Compare Minutes Only
                    const [scheduleHours, scheduleMinutes] = schedule.startTime.split(':').map(Number)
                    const scheduleTotalMinutes = scheduleHours * 60 + scheduleMinutes

                    const clockIn = new Date(attendance.clockIn)
                    const clockInTotalMinutes = clockIn.getHours() * 60 + clockIn.getMinutes()

                    if (clockInTotalMinutes > scheduleTotalMinutes) {
                        isLate = true
                        totalLateMinutes += (clockInTotalMinutes - scheduleTotalMinutes)
                    }

                    // Early Departure Calculation: Compare Minutes Only
                    if (attendance.clockOut) {
                        const [endHours, endMinutes] = schedule.endTime.split(':').map(Number)
                        const scheduleTotalMinutes = endHours * 60 + endMinutes

                        const clockOut = new Date(attendance.clockOut)
                        const clockOutTotalMinutes = clockOut.getHours() * 60 + clockOut.getMinutes()

                        if (clockOutTotalMinutes < scheduleTotalMinutes) {
                            isEarlyDeparture = true
                            totalEarlyDepartureMinutes += (scheduleTotalMinutes - clockOutTotalMinutes)
                        }
                    }
                }
            }

            // Absence Calculation
            if (!attendance) {
                const dayOfWeek = dateToCheck.getDay()
                const schedule = workScheduleMap.get(dayOfWeek)

                // If it's a work day and no attendance record (and not future), count as absent
                if (schedule && schedule.isWorkDay && dateToCheck <= new Date()) {
                    totalAbsentDays++
                }
            }

            userAttendances[day] = attendance ? { ...attendance, isLate, isEarlyDeparture } : null
        }

        return {
            user,
            attendances: userAttendances,
            stats: {
                lateMinutes: totalLateMinutes,
                earlyMinutes: totalEarlyDepartureMinutes,
                absentDays: totalAbsentDays
            }
        }
    })

    return (
        <div className="max-w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Absensi</h1>
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Kelola data absensi karyawan.' : 'Lihat data absensi Anda.'}
                    </p>
                </div>
                <div className="w-fit">
                    <AttendanceHeader
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        isAdmin={isAdmin}
                    />
                </div>
            </div>

            <div className={isAdmin ? "w-full" : "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"}>
                <div className="min-w-0">
                    <AttendanceManager
                        monthlyData={monthlyData}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                        daysInMonth={daysInMonth}
                        isAdmin={isAdmin}
                    />
                </div>
                {!isAdmin && (
                    <div className="space-y-6">
                        <UserAttendanceSummary month={currentMonth} year={currentYear} />
                    </div>
                )}
            </div>
        </div>
    )
}
