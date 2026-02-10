'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'
import { getDaysInMonth } from 'date-fns'
import { encrypt, decrypt, encryptDate, decryptDate } from '@/lib/crypto'

// Helper to get days in month
function getDaysArray(year: number, month: number) {
    const date = new Date(year, month - 1, 1)
    const days = []
    const numDays = getDaysInMonth(date)
    for (let i = 1; i <= numDays; i++) {
        days.push(i)
    }
    return days
}

// Helper to format time
function formatTime(date: Date | null | undefined) {
    if (!date) return ''
    const d = new Date(date)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
}


export async function getValidUserIds() {
    await requireAuth()
    const users = await prisma.user.findMany({
        select: { id: true }
    })
    return users.map(u => u.id)
}

export async function getAttendanceTemplate() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, nameEnc: true }
    })

    const headers = ['ID', 'Nama', 'Date', 'Time']
    const exampleRows = [
        ['kode_id_user', 'nama user', '2026-02-01', '08:05'],
        ['kode_id_user', 'nama user', '2026-02-01', '17:15']
    ]

    const userRows = users.map(user => [
        user.id,
        decrypt(user.nameEnc) || '-',
        '', // Empty Date
        ''  // Empty Time
    ])

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows, ...userRows])

    // Set column widths
    const wscols = [
        { wch: 15 }, // ID
        { wch: 30 }, // Nama
        { wch: 15 }, // Date
        { wch: 10 }  // Time
    ]
    ws['!cols'] = wscols

    XLSX.utils.book_append_sheet(wb, ws, 'Template Import Absensi')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return buf.toString('base64')
}

export async function importRawAttendance(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const file = formData.get('file') as File
    if (!file) throw new Error('Missing file')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    if (data.length < 2) throw new Error('File empty or invalid')

    // Expecting columns: ID, Nama, Date, Time (B, C, D, E in Excel snapshot)
    // We search for these in the header (row 0)
    const headers = data[0].map(h => h?.toString().toLowerCase())
    const idIdx = headers.indexOf('id')
    const dateIdx = headers.indexOf('date')
    const timeIdx = headers.indexOf('time')

    if (idIdx === -1 || dateIdx === -1 || timeIdx === -1) {
        throw new Error('Required columns (ID, Date, Time) not found')
    }

    // Aggregate data by userId and date
    type AggregatedLog = {
        clockInRows: number[] // minutes from midnight
        clockOutRows: number[]
    }
    const aggregated: Record<string, Record<string, AggregatedLog>> = {}

    for (let i = 1; i < data.length; i++) {
        const row = data[i]
        const userId = row[idIdx]?.toString().trim()
        let dateVal = row[dateIdx]
        let timeVal = row[timeIdx]

        if (!userId || !dateVal || !timeVal) continue

        // Parse Date - handle Excel date objects or strings
        let dObj: Date
        if (typeof dateVal === 'number') {
            // Convert Excel serial date to JS Date
            // Excel started counting from 1900-01-01
            dObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000))
        } else {
            dObj = new Date(dateVal)
        }
        if (isNaN(dObj.getTime())) continue

        const dateKey = dObj.toISOString().split('T')[0]

        // Parse Time - handle Excel time (decimal) or "HH:mm" strings
        let totalMinutes = 0
        if (typeof timeVal === 'number') {
            totalMinutes = Math.round(timeVal * 24 * 60)
        } else {
            const parts = timeVal.toString().split(':')
            if (parts.length >= 2) {
                totalMinutes = parseInt(parts[0]) * 60 + parseInt(parts[1])
            } else {
                continue
            }
        }

        if (!aggregated[userId]) aggregated[userId] = {}
        if (!aggregated[userId][dateKey]) {
            aggregated[userId][dateKey] = { clockInRows: [], clockOutRows: [] }
        }

        const threshold = 12 * 60 // 12:00 PM
        if (totalMinutes < threshold) {
            aggregated[userId][dateKey].clockInRows.push(totalMinutes)
        } else {
            aggregated[userId][dateKey].clockOutRows.push(totalMinutes)
        }
    }

    let updatedCount = 0
    // Process aggregated data
    for (const userId of Object.keys(aggregated)) {
        // Validate user exists before processing
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) continue

        for (const dateKey of Object.keys(aggregated[userId])) {
            const log = aggregated[userId][dateKey]
            const dateObj = new Date(dateKey)
            dateObj.setHours(0, 0, 0, 0)

            const updateData: any = {
                isHoliday: false,
                statusEnc: encrypt('PRESENT'),
                clockInEnc: null,
                clockOutEnc: null,
            }

            if (log.clockInRows.length > 0) {
                const minIn = Math.min(...log.clockInRows)
                const dIn = new Date(dateObj)
                dIn.setHours(Math.floor(minIn / 60), minIn % 60)
                updateData.clockInEnc = encryptDate(dIn)
            }

            if (log.clockOutRows.length > 0) {
                const maxOut = Math.max(...log.clockOutRows)
                const dOut = new Date(dateObj)
                dOut.setHours(Math.floor(maxOut / 60), maxOut % 60)
                updateData.clockOutEnc = encryptDate(dOut)
            }

            await prisma.attendance.upsert({
                where: { userId_date: { userId, date: dateObj } },
                update: updateData,
                create: {
                    userId,
                    date: dateObj,
                    ...updateData
                }
            })
            updatedCount++
        }
    }

    revalidatePath('/attendance')
    return { success: true, count: updatedCount }
}

export async function exportRawAttendance(month?: number, year?: number) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    let whereClause = {}
    if (month && year) {
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        endDate.setHours(23, 59, 59, 999)
        whereClause = {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    }

    const attendances = await prisma.attendance.findMany({
        where: whereClause,
        include: {
            user: {
                select: {
                    id: true,
                    nameEnc: true
                }
            }
        },
        orderBy: [
            { date: 'asc' },
            { userId: 'asc' }
        ]
    })

    const headers = ['ID', 'Nama', 'Date', 'Time']
    const dataRows: any[] = []

    attendances.forEach(att => {
        const userId = att.userId
        const userName = decrypt(att.user.nameEnc) || '-'
        const dateStr = att.date.toISOString().split('T')[0]

        const clockIn = decryptDate(att.clockInEnc)
        const clockOut = decryptDate(att.clockOutEnc)

        if (clockIn) {
            dataRows.push([userId, userName, dateStr, formatTime(clockIn)])
        }
        if (clockOut) {
            dataRows.push([userId, userName, dateStr, formatTime(clockOut)])
        }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

    // Set column widths
    const wscols = [
        { wch: 15 }, // ID
        { wch: 30 }, // Nama
        { wch: 15 }, // Date
        { wch: 10 }  // Time
    ]
    ws['!cols'] = wscols

    const sheetName = month && year ? `Attendance ${month}-${year}` : 'All Attendance'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return buf.toString('base64')
}
