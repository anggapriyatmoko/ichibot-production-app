'use server'

import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

// Helper function to delete old image file from storage
async function deleteOldImage(imagePath: string | null) {
    if (!imagePath) return

    try {
        // Extract filename from path (e.g., '/api/uploads/log-123.jpg' -> 'log-123.jpg')
        const filename = imagePath.replace('/api/uploads/', '')

        // Determine upload directory
        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        const filePath = path.join(uploadDir, filename)
        await unlink(filePath)
        console.log('Deleted old image:', filePath)
    } catch (error) {
        // File might not exist, ignore error
        console.log('Could not delete old image (may not exist):', imagePath)
    }
}

// Image upload validation helper for log activity (2MB limit)
function validateLogImageFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 2 * 1024 * 1024 // 2MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

    // Check file size
    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'Ukuran file terlalu besar. Maksimal 2MB.' }
    }

    // Check MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Tipe file tidak valid. Hanya JPG, PNG, WEBP, atau GIF yang diperbolehkan.' }
    }

    // Check file extension
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return { valid: false, error: 'Ekstensi file tidak valid.' }
    }

    return { valid: true }
}

export async function upsertLogActivity(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) throw new Error('User not found')

    const dateStr = formData.get('date') as string
    const activity = formData.get('activity') as string
    const problem = formData.get('problem') as string | null
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('removeImage') === 'true'

    // Normalize date to midnight
    const dateObj = new Date(dateStr)
    dateObj.setHours(0, 0, 0, 0)

    // Check if existing log has an image that needs to be deleted
    const existingLog = await prisma.logActivity.findUnique({
        where: {
            userId_date: {
                userId,
                date: dateObj
            }
        },
        select: { image: true }
    })

    let imagePath: string | null | undefined = undefined

    // Handle image upload
    if (imageFile && imageFile.size > 0) {
        const validation = validateLogImageFile(imageFile)
        if (!validation.valid) {
            return { error: validation.error }
        }

        const buffer = Buffer.from(await imageFile.arrayBuffer())

        // Resize with Sharp
        const resizedBuffer = await sharp(buffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer()

        const filename = 'log-' + Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

        // Determine upload directory
        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        try { await mkdir(uploadDir, { recursive: true }) } catch (e) { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)
        imagePath = '/api/uploads/' + filename

        // Delete old image if exists (since we're replacing it)
        if (existingLog?.image) {
            await deleteOldImage(existingLog.image)
        }
    }

    // Handle image removal
    if (removeImage) {
        imagePath = null
        // Delete old image from storage
        if (existingLog?.image) {
            await deleteOldImage(existingLog.image)
        }
    }

    const updateData: any = {
        activity,
        problem: problem || null
    }

    const createData: any = {
        userId,
        date: dateObj,
        activity,
        problem: problem || null
    }

    // Only update image if it changed
    if (imagePath !== undefined) {
        updateData.image = imagePath
        createData.image = imagePath
    }

    const result = await prisma.logActivity.upsert({
        where: {
            userId_date: {
                userId,
                date: dateObj
            }
        },
        update: updateData,
        create: createData
    })

    revalidatePath('/log-activity')
    return { success: true, data: result }
}

export async function getLogActivities(targetUserId?: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const currentUserId = session?.user?.id
    const isAdmin = ['ADMIN', 'HRD'].includes(session?.user?.role)

    // If targetUserId is provided, check if admin.
    // If not admin, ignore targetUserId and use current.
    let queryUserId = currentUserId

    if (isAdmin && targetUserId) {
        queryUserId = targetUserId
    }

    return prisma.logActivity.findMany({
        where: {
            userId: queryUserId
        },
        orderBy: {
            date: 'desc'
        },
        include: {
            user: {
                select: {
                    name: true,
                    username: true,
                    department: true
                }
            }
        }
    })
}

export async function getUsersForLog() {
    await requireAuth()
    // Allow admin to fetch users list
    // Or maybe just fetch all users if admin?
    // Let's check admin inside
    const session: any = await getServerSession(authOptions)
    const isAdmin = ['ADMIN', 'HRD'].includes(session?.user?.role)

    if (!isAdmin) return []

    return prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            department: true
        },
        orderBy: {
            name: 'asc'
        }
    })
}

export async function deleteLogActivity(id: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const currentUserId = session?.user?.id
    const isAdmin = ['ADMIN', 'HRD'].includes(session?.user?.role)

    const log = await prisma.logActivity.findUnique({ where: { id } })
    if (!log) throw new Error('Log not found')

    if (log.userId !== currentUserId && !isAdmin) {
        throw new Error(`Unauthorized: Owner ${log.userId} !== User ${currentUserId}`)
    }

    await prisma.logActivity.delete({ where: { id } })
    revalidatePath('/log-activity')
}

export async function getDailyActivityRecap(dateStr: string) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) return []

    const dateObj = new Date(dateStr)
    dateObj.setHours(0, 0, 0, 0)

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            username: true,
            department: true
        }
    })

    const logs = await prisma.logActivity.findMany({
        where: {
            date: dateObj
        }
    })

    return users.map(user => {
        const log = logs.find(l => l.userId === user.id)
        return {
            user,
            log: log || null
        }
    })
}
