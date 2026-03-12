import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET() {
    try {
        const session: any = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const today = new Date()
        const dayOfWeek = today.getDay() // 0=Sunday, 1=Monday, ...

        // Check custom work schedule first
        const todayStart = new Date(today)
        todayStart.setHours(0, 0, 0, 0)

        const customSchedule = await prisma.customWorkSchedule.findFirst({
            where: {
                startDate: { lte: todayStart },
                endDate: { gte: todayStart }
            }
        })

        if (customSchedule) {
            return NextResponse.json({
                isWorkDay: true,
                startTime: customSchedule.startTime,
                endTime: customSchedule.endTime,
                isCustom: true
            })
        }

        // Fallback to regular work schedule
        const schedule = await prisma.workSchedule.findUnique({
            where: { dayOfWeek }
        })

        if (!schedule) {
            return NextResponse.json({
                isWorkDay: false,
                startTime: null,
                endTime: null
            })
        }

        return NextResponse.json({
            isWorkDay: schedule.isWorkDay,
            startTime: schedule.startTime,
            endTime: schedule.endTime
        })
    } catch (error) {
        console.error('Error fetching work schedule:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
