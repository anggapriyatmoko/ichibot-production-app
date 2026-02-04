'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { encrypt, decrypt } from '@/lib/crypto'

function decryptOvertimeLeave(item: any) {
    if (!item) return item
    const decrypted = {
        ...item,
        type: decrypt(item.typeEnc),
        reason: decrypt(item.reasonEnc),
        attachment: decrypt(item.attachmentEnc),
        requesterName: decrypt(item.requesterNameEnc),
        job: decrypt(item.jobEnc),
        adminNote: decrypt(item.adminNoteEnc),
        status: decrypt(item.statusEnc),
        date: decrypt(item.dateEnc),
        createdAt: decrypt(item.createdAtEnc),
        updatedAt: decrypt(item.updatedAtEnc),
    }

    if (item.user && (item.user.nameEnc || item.user.roleEnc || item.user.usernameEnc)) {
        decrypted.user = {
            ...item.user,
            name: item.user.nameEnc ? decrypt(item.user.nameEnc) : null,
            username: item.user.usernameEnc ? decrypt(item.user.usernameEnc) : null,
            role: item.user.roleEnc ? decrypt(item.user.roleEnc) : null
        }
    }

    if (item.amountEnc) {
        const decAmount = decrypt(item.amountEnc)
        decrypted.amount = decAmount ? parseFloat(decAmount) : null
    }
    return decrypted
}

// File upload validation helper
function validateAttachment(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB for documents
    const ALLOWED_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File melebihi 5MB' }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Tipe file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.' }
    }

    return { valid: true }
}

export async function createOvertimeLeave(formData: FormData) {
    const session: any = await getServerSession(authOptions)
    if (!session?.user) {
        return { error: 'Unauthorized' }
    }

    const userId = session.user.id
    const date = new Date(formData.get('date') as string)
    const type = formData.get('type') as string // "LEAVE" or "OVERTIME"
    const reason = formData.get('reason') as string
    const attachmentFile = formData.get('attachment') as File | null

    let attachmentPath = null

    if (attachmentFile && attachmentFile.size > 0) {
        const validation = validateAttachment(attachmentFile)
        if (!validation.valid) {
            return { error: validation.error }
        }

        const buffer = Buffer.from(await attachmentFile.arrayBuffer())
        const filename = `${Date.now()}-${attachmentFile.name.replace(/\s/g, '-')}`

        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) { }

        await writeFile(path.join(uploadDir, filename), buffer)
        attachmentPath = '/api/uploads/' + filename
    }


    const now = new Date().toISOString()
    try {
        await (prisma as any).overtimeleave.create({
            data: {
                userId,
                dateEnc: encrypt(date.toISOString()) || '',
                typeEnc: encrypt(type) || '',
                reasonEnc: encrypt(reason) || '',
                attachmentEnc: encrypt(attachmentPath),
                statusEnc: encrypt('PENDING') || '',
                createdAtEnc: encrypt(now) || '',
                updatedAtEnc: encrypt(now) || '',
            }
        })

        revalidatePath('/overtime-leave')
        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getOvertimeLeaves(page = 1, limit = 50, filterTypes: string[] = ['ORDER', 'OVERTIME_SUBMISSION', 'LEAVE', 'VACATION'], ownOnly = false, startDateStr?: string, endDateStr?: string) {
    const session: any = await requireAuth()

    // If Admin/HRD, they can see all. Otherwise, only their own.
    const isAdmin = ['ADMIN', 'HRD'].includes(session.user.role)

    let where: any = (isAdmin && !ownOnly) ? {} : { userId: session.user.id }

    // Date Range Calculation
    let startDate: Date | null = null
    let endDate: Date | null = null

    if (startDateStr && endDateStr) {
        startDate = new Date(startDateStr)
        endDate = new Date(endDateStr)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
    }

    try {
        // Fetch all relevant data and filter in memory because fields are encrypted
        const allData = await (prisma as any).overtimeleave.findMany({
            where: isAdmin && !ownOnly ? {} : { userId: session.user.id },
            include: {
                user: {
                    select: {
                        nameEnc: true,
                        usernameEnc: true,
                        roleEnc: true
                    }
                }
            },
            orderBy: {
                id: 'desc' // Fallback order
            }
        })

        const decryptedData = allData.map(decryptOvertimeLeave)

        // Apply filters in memory
        const filteredData = decryptedData.filter((item: any) => {
            // 1. Date Period Filter (if provided)
            if (startDate && endDate) {
                const itemDate = new Date(item.date)
                if (itemDate < startDate || itemDate > endDate) return false
            }

            // 2. Type Filter Logic
            const isOrder = item.type === 'OVERTIME' && item.requesterName
            const isSubmission = item.type === 'OVERTIME' && !item.requesterName

            if (filterTypes.includes('ORDER') && isOrder) return true
            if (filterTypes.includes('OVERTIME_SUBMISSION') && isSubmission) return true
            if (filterTypes.includes('LEAVE') && item.type === 'LEAVE') return true
            if (filterTypes.includes('VACATION') && item.type === 'VACATION') return true

            return false
        })

        // Sort by createdAt descending
        filteredData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        const total = filteredData.length
        const skip = (page - 1) * limit
        const paginatedData = filteredData.slice(skip, skip + limit)

        return {
            success: true,
            data: paginatedData,
            total,
            pages: Math.ceil(total / limit),
            period: null // Remove period display to avoid confusion
        }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function updateOvertimeLeaveStatus(id: string, status: string, amount?: number, adminNote?: string) {
    await requireAdmin() // requireAdmin covers both ADMIN and HRD in lib/auth

    const now = new Date().toISOString()
    try {
        const updateData: any = {
            statusEnc: encrypt(status) || '',
            updatedAtEnc: encrypt(now) || ''
        }
        if (amount !== undefined) updateData.amountEnc = encrypt(amount.toString()) || ''
        if (adminNote !== undefined) updateData.adminNoteEnc = encrypt(adminNote)

        await (prisma as any).overtimeleave.update({
            where: { id },
            data: updateData
        })

        revalidatePath('/overtime-leave')
        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function deleteOvertimeLeave(id: string) {
    const session: any = await requireAuth()

    // Check if the user owns it or is admin
    const request = await (prisma as any).overtimeleave.findUnique({
        where: { id }
    })

    if (!request) return { error: 'Request not found' }

    if (request.userId !== session.user.id && !['ADMIN', 'HRD'].includes(session.user.role)) {
        return { error: 'Forbidden' }
    }

    // Only allow deletion if still PENDING
    if (request.status !== 'PENDING' && !['ADMIN', 'HRD'].includes(session.user.role)) {
        return { error: 'Hanya pengajuan yang masih pending yang dapat dihapus' }
    }

    try {
        await (prisma as any).overtimeleave.delete({
            where: { id }
        })
        revalidatePath('/overtime-leave')
        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function createOvertimeOrder(formData: FormData) {
    await requireAdmin()

    const userId = formData.get('userId') as string
    const requesterName = formData.get('requesterName') as string
    const job = formData.get('job') as string
    const amount = parseFloat(formData.get('amount') as string)
    const dateStr = formData.get('date') as string
    const date = dateStr ? new Date(dateStr) : new Date()

    const now = new Date().toISOString()
    try {
        await (prisma as any).overtimeleave.create({
            data: {
                userId,
                dateEnc: encrypt(date.toISOString()) || '',
                typeEnc: encrypt('OVERTIME') || '',
                reasonEnc: encrypt(`Perintah Lembur: ${job}`) || '',
                requesterNameEnc: encrypt(requesterName),
                jobEnc: encrypt(job),
                amountEnc: encrypt(amount.toString()),
                statusEnc: encrypt('MANDATE') || '',
                createdAtEnc: encrypt(now) || '',
                updatedAtEnc: encrypt(now) || '',
            }
        })

        revalidatePath('/overtime-leave')
        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}
export async function getPendingOvertimeLeaveCount() {
    try {
        const allData = await (prisma as any).overtimeleave.findMany({
            include: { user: { select: { nameEnc: true, usernameEnc: true } } }
        })
        const decrypted = allData.map(decryptOvertimeLeave)
        const pending = decrypted.filter((item: any) => item.status === 'PENDING')
        return { success: true, count: pending.length }
    } catch (error: any) {
        return { error: error.message }
    }
}
export async function getPendingOvertimeLeavesDetails() {
    try {
        const allData = await (prisma as any).overtimeleave.findMany({
            include: { user: { select: { nameEnc: true, usernameEnc: true } } }
        })
        const decrypted = allData.map(decryptOvertimeLeave)
        const pending = decrypted
            .filter((item: any) => item.status === 'PENDING')
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)

        return { success: true, data: pending }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function updateOvertimeLeave(id: string, data: any) {
    await requireAdmin()

    const now = new Date().toISOString()
    try {
        await (prisma as any).overtimeleave.update({
            where: { id },
            data: {
                dateEnc: data.date ? (encrypt(new Date(data.date).toISOString()) || '') : undefined,
                typeEnc: data.type ? (encrypt(data.type) || '') : undefined,
                reasonEnc: data.reason ? (encrypt(data.reason) || '') : undefined,
                jobEnc: data.job ? encrypt(data.job) : undefined,
                requesterNameEnc: data.requesterName ? encrypt(data.requesterName) : undefined,
                amountEnc: data.amount !== undefined ? encrypt(data.amount?.toString() || '0') : undefined,
                adminNoteEnc: data.adminNote !== undefined ? encrypt(data.adminNote) : undefined,
                statusEnc: data.status ? (encrypt(data.status) || '') : undefined,
                updatedAtEnc: encrypt(now) || ''
            }
        })

        revalidatePath('/overtime-leave')
        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getUserOvertimeOrders() {
    const session: any = await requireAuth()

    try {
        const allData = await (prisma as any).overtimeleave.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 20
        })

        const decrypted = allData.map(decryptOvertimeLeave)

        const orders = decrypted.filter((item: any) =>
            item.type === 'OVERTIME' &&
            item.requesterName &&
            item.status === 'MANDATE'
        ).slice(0, 5)

        return { success: true, data: orders }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getUserStatusUpdates() {
    const session: any = await requireAuth()

    try {
        const allData = await (prisma as any).overtimeleave.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: { updatedAt: 'desc' },
            take: 20
        })

        const decrypted = allData.map(decryptOvertimeLeave)

        // Filter for items that are APPROVED or REJECTED recently?
        // Or we just return the latest updates and let frontend filter/display/handle "read" state
        // For this specific request: "if submitted... and accepted or rejected... notification"
        // We will return items that are NOT PENDING (i.e. APPROVED/REJECTED)
        // And maybe filter by time? For now, we return specific statuses.

        const updates = decrypted.filter((item: any) =>
            ['APPROVED', 'REJECTED'].includes(item.status)
        ).slice(0, 5)

        return { success: true, data: updates }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function respondToOvertimeOrder(id: string, response: 'ACCEPT' | 'REJECT') {
    const session: any = await requireAuth()

    const request = await (prisma as any).overtimeleave.findUnique({
        where: { id }
    })

    if (!request) return { error: 'Request not found' }

    if (request.userId !== session.user.id) {
        return { error: 'Forbidden' }
    }

    const decryptedStatus = decrypt(request.statusEnc)
    if (decryptedStatus !== 'MANDATE') {
        return { error: 'Invalid status for this action' }
    }

    const newStatus = response === 'ACCEPT' ? 'APPROVED' : 'REJECTED'
    const now = new Date().toISOString()

    try {
        await (prisma as any).overtimeleave.update({
            where: { id },
            data: {
                statusEnc: encrypt(newStatus) || '',
                updatedAtEnc: encrypt(now) || ''
            }
        })

        revalidatePath('/overtime-leave')
        revalidatePath('/hrd-dashboard')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}
