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

export async function exportAttendance(month: number, year: number) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    // 1. Get all users
    const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, nameEnc: true, usernameEnc: true, departmentEnc: true }
    })

    // 2. Get all attendance for the period
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    endDate.setHours(23, 59, 59, 999)

    const attendances = await prisma.attendance.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    })

    // 3. Build Data Grid
    // Headers: Month, Year, User ID, Username, Name, Department, 1, 2, ..., 31
    const days = getDaysArray(year, month)
    const headers = ['Month', 'Year', 'User ID', 'Username', 'Name', 'Department', ...days.map(String)]

    const dataRows = users.map(user => {
        const row: any[] = [month, year, user.id, decrypt(user.usernameEnc) || 'Unknown', decrypt(user.nameEnc), decrypt(user.departmentEnc) || '-']

        days.forEach(day => {
            const att = attendances.find((a: any) =>
                a.userId === user.id &&
                new Date(a.date).getDate() === day
            )

            let cellContent = ''
            if (att) {
                // Decrypt status
                const status = decrypt(att.statusEnc)
                const clockIn = decryptDate(att.clockInEnc)
                const clockOut = decryptDate(att.clockOutEnc)

                if (att.isHoliday) {
                    cellContent = 'LIBUR'
                } else if (status === 'SICK') {
                    cellContent = 'SAKIT'
                } else if (status === 'PERMIT') {
                    cellContent = 'IZIN'
                } else if (status === 'LEAVE') {
                    cellContent = 'CUTI'
                } else if (clockIn) {
                    // Has clock in - output time range
                    const inTime = formatTime(clockIn)
                    const outTime = formatTime(clockOut)
                    if (inTime && outTime) {
                        cellContent = `${inTime} - ${outTime}`
                    } else if (inTime) {
                        cellContent = inTime
                    }
                } else if (status === 'PRESENT') {
                    cellContent = 'HADIR'
                }
            }
            row.push(cellContent)
        })
        return row
    })

    // 4. Create Workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

    // Set column widths
    const wscols = [
        { wch: 6 },  // Month
        { wch: 6 },  // Year
        { wch: 0 },  // Hide User ID
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 15 }, // Dept
        ...days.map(() => ({ wch: 13 }))
    ]
    ws['!cols'] = wscols

    XLSX.utils.book_append_sheet(wb, ws, `Attendance ${month}-${year}`)

    // 5. Write to buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Convert to base64 to send to client
    return buf.toString('base64')
}

export async function getAttendanceTemplate(month: number, year: number) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    // Get all users
    const users = await prisma.user.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, nameEnc: true, usernameEnc: true, departmentEnc: true }
    })

    // Build empty template with users
    const days = getDaysArray(year, month)
    const headers = ['Month', 'Year', 'User ID', 'Username', 'Name', 'Department', ...days.map(String)]

    const dataRows = users.map(user => {
        const row: any[] = [month, year, user.id, decrypt(user.usernameEnc) || 'Unknown', decrypt(user.nameEnc) || '-', decrypt(user.departmentEnc) || '-']
        // Leave day columns empty for user to fill
        days.forEach(() => row.push(''))
        return row
    })

    // Create Workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

    // Set column widths
    const wscols = [
        { wch: 6 },  // Month
        { wch: 6 },  // Year
        { wch: 0 },  // Hide User ID
        { wch: 15 }, // Username
        { wch: 25 }, // Name
        { wch: 15 }, // Dept
        ...days.map(() => ({ wch: 13 }))
    ]
    ws['!cols'] = wscols

    XLSX.utils.book_append_sheet(wb, ws, `Template ${month}-${year}`)

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return buf.toString('base64')
}

export async function importAttendance(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const file = formData.get('file') as File
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)

    if (!file || !month || !year) throw new Error('Missing file or date')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    // Determine column indices
    const hasMonthCol = data[0]?.[0]?.toString().toLowerCase().includes('month')
    const daysStartIndex = hasMonthCol ? 6 : 4
    const userIdIndex = hasMonthCol ? 2 : 0

    let updatedCount = 0

    for (let i = 1; i < data.length; i++) {
        const row = data[i]
        const userId = row[userIdIndex]
        if (!userId) continue

        const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))

        for (let d = 1; d <= daysInMonth; d++) {
            const colIndex = daysStartIndex + (d - 1)
            const cellVal = row[colIndex]?.toString().trim().toUpperCase()

            if (!cellVal) continue

            const dateObj = new Date(year, month - 1, d)
            dateObj.setHours(0, 0, 0, 0)

            let updateData: any = { isHoliday: false, statusEnc: null, clockInEnc: null, clockOutEnc: null }
            let shouldUpdate = false

            // Parse Content
            // 1. Status Keywords
            if (cellVal === 'LIBUR' || cellVal === 'LIBUR NASIONAL' || cellVal === 'L') {
                updateData.isHoliday = true
                shouldUpdate = true
            } else if (cellVal === 'SAKIT' || cellVal === 'S') {
                updateData.statusEnc = encrypt('SICK')
                shouldUpdate = true
            } else if (cellVal === 'IZIN' || cellVal === 'I') {
                updateData.statusEnc = encrypt('PERMIT')
                shouldUpdate = true
            } else if (cellVal === 'CUTI' || cellVal === 'C') {
                updateData.statusEnc = encrypt('LEAVE')
                shouldUpdate = true
            }
            // 2. Time Range: "08:00 - 17:00"
            else if (cellVal.includes('-') && cellVal.includes(':')) {
                const parts = cellVal.split('-').map((s: string) => s.trim())
                if (parts.length === 2) {
                    const [inStr, outStr] = parts

                    updateData.statusEnc = encrypt('PRESENT')

                    // Parse Time 1
                    const [inH, inM] = inStr.split(':').map(Number)
                    const dIn = new Date(dateObj)
                    dIn.setHours(inH || 0, inM || 0)
                    updateData.clockInEnc = encryptDate(dIn)

                    // Parse Time 2
                    if (outStr !== '?' && outStr.includes(':')) {
                        const [outH, outM] = outStr.split(':').map(Number)
                        const dOut = new Date(dateObj)
                        dOut.setHours(outH || 0, outM || 0)
                        updateData.clockOutEnc = encryptDate(dOut)
                    }
                    shouldUpdate = true
                }
            }
            // 3. Single time "14:21" -> Clock in only
            else if (/^\d{1,2}:\d{2}$/.test(cellVal)) {
                updateData.statusEnc = encrypt('PRESENT')
                const [h, m] = cellVal.split(':').map(Number)
                const dIn = new Date(dateObj)
                dIn.setHours(h || 0, m || 0)
                updateData.clockInEnc = encryptDate(dIn)
                // No clockOut
                shouldUpdate = true
            }
            // 4. Simple "HADIR" or "H" -> Default Times (08:00 - 17:00)
            else if (cellVal === 'HADIR' || cellVal === 'H') {
                updateData.statusEnc = encrypt('PRESENT')
                updateData.clockInEnc = encryptDate(new Date(year, month - 1, d, 8, 0))
                updateData.clockOutEnc = encryptDate(new Date(year, month - 1, d, 17, 0))
                shouldUpdate = true
            }
            // 5. "ALPHA" or "TIDAK MASUK" or just "-" -> Clear
            else if (cellVal === '-' || cellVal === 'ALPHA' || cellVal === 'A') {
                shouldUpdate = true
                // fields already null
            }

            if (shouldUpdate) {
                await prisma.attendance.upsert({
                    where: {
                        userId_date: { userId, date: dateObj }
                    },
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
    }

    revalidatePath('/attendance')
    return { success: true, count: updatedCount }
}
