'use server'

import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { revalidatePath } from 'next/cache'
import { encrypt, decrypt } from '@/lib/crypto'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

// Helper function to delete old image file from storage
async function deleteOldImage(imagePath: string | null) {
    if (!imagePath) return

    try {
        // Extract filename from path (e.g., '/api/uploads/123-image.jpg' -> '123-image.jpg')
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
        console.log('Deleted old user profile image:', filePath)
    } catch (error) {
        // File might not exist, ignore error
        console.log('Could not delete old user profile image (may not exist):', imagePath)
    }
}

// Image upload validation helper
function validateImageFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 1 * 1024 * 1024 // 1MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

    // Check file size
    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File gambar melebihi 1MB' }
    }

    // Check MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Tipe file tidak valid. Hanya JPG, PNG, WEBP, atau GIF yang diperbolehkan.' }
    }

    return { valid: true }
}

// Get all users for HRD dashboard
export async function getAllUsersForHRD() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user || !['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            username: true,
            name: true,
            department: true,
            role: true,
            photoEnc: true,
            phoneEnc: true,
            addressEnc: true,
            ktpNumberEnc: true,
            contractEndDateEnc: true,
            createdAt: true,
        },
        orderBy: { name: 'asc' }
    })

    // Decrypt sensitive fields
    return users.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        department: user.department,
        role: user.role,
        photo: decrypt(user.photoEnc),
        phone: decrypt(user.phoneEnc),
        address: decrypt(user.addressEnc),
        ktpNumber: decrypt(user.ktpNumberEnc),
        contractEndDate: decrypt(user.contractEndDateEnc),
        createdAt: user.createdAt,
    }))
}

// Get single user for editing
export async function getUserForEdit(userId: string) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user || !['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            name: true,
            department: true,
            role: true,
            photoEnc: true,
            phoneEnc: true,
            addressEnc: true,
            ktpNumberEnc: true,
            contractEndDateEnc: true,
        }
    })

    if (!user) return null

    // Decrypt for display/edit
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        department: user.department,
        role: user.role,
        photo: decrypt(user.photoEnc),
        phone: decrypt(user.phoneEnc),
        address: decrypt(user.addressEnc),
        ktpNumber: decrypt(user.ktpNumberEnc),
        contractEndDate: decrypt(user.contractEndDateEnc),
    }
}

// Update user data (encrypts sensitive fields)
export async function updateUserData(formData: FormData) {
    const session: any = await getServerSession(authOptions)

    if (!session?.user || !['ADMIN', 'HRD'].includes(session?.user?.role)) {
        throw new Error('Unauthorized')
    }

    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const department = formData.get('department') as string
    const role = formData.get('role') as string

    // Personal Data
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const ktpNumber = formData.get('ktpNumber') as string
    const contractEndDate = formData.get('contractEndDate') as string

    // File Upload
    const imageFile = formData.get('photo') as File | null
    const removeImage = formData.get('removePhoto') === 'true'

    // Fetch existing user to get old encrypted photo path
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { photoEnc: true }
    })

    // Decrypt old photo path to find the file
    const oldPhotoPath = existingUser?.photoEnc ? decrypt(existingUser.photoEnc) : null

    let finalPhotoPath = oldPhotoPath

    if (imageFile && imageFile.size > 0) {
        // Validate image file
        const validation = validateImageFile(imageFile)
        if (!validation.valid) {
            return { error: validation.error }
        }

        const buffer = Buffer.from(await imageFile.arrayBuffer())

        // Resize with Sharp
        const resizedBuffer = await sharp(buffer)
            .resize(500, 500, { // Profile pictures can be smaller
                fit: 'cover',
                withoutEnlargement: true
            })
            .toBuffer()

        // Generate filename
        const filename = 'user-' + Date.now() + '-' + userId.substring(0, 8) + '.jpg'

        // Determine upload directory
        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        // Ensure directory exists
        try { await mkdir(uploadDir, { recursive: true }) } catch (e) { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)
        finalPhotoPath = '/api/uploads/' + filename

        // Delete old image since we're replacing it
        if (oldPhotoPath) {
            await deleteOldImage(oldPhotoPath)
        }
    } else if (removeImage) {
        finalPhotoPath = null
        if (oldPhotoPath) {
            await deleteOldImage(oldPhotoPath)
        }
    }

    // Only ADMIN can change role
    // BUT user requested: "tidak perlu ada merubah ROLE" - so we ignore the role from formData unless strict Admin need
    // We will keep the existing role logic just in case, but Frontend won't send it or we can ignore it.
    // Let's Respect the code: if Admin sends role, update it. But instruction says "tidak perlu ada merubah ROLE". 
    // I will NOT update role here to be safe, or just keep it as is since user UI won't send it. 
    // Wait, if I don't include it in updateData, it won't update.

    const updateData: any = {
        name: name || null,
        email,
        department: department || null,
        // Encrypt sensitive fields
        photoEnc: encrypt(finalPhotoPath),
        phoneEnc: encrypt(phone),
        addressEnc: encrypt(address),
        ktpNumberEnc: encrypt(ktpNumber),
        contractEndDateEnc: encrypt(contractEndDate),
    }

    // Explicitly disabling role update based on request "tidak perlu ada merubah ROLE"
    // (Or I can just leave it available for ADMIN API calls but remove from UI. 
    // The request likely means "don't let them change it in the UI". 
    // But safely, let's allow it if ADMIN really wanted to via API, but I will comment it out or leave it.)

    // if (session.user.role === 'ADMIN' && role) {
    //     updateData.role = role
    // }

    await prisma.user.update({
        where: { id: userId },
        data: updateData
    })

    revalidatePath('/hrd-dashboard')
    revalidatePath('/hr-other-data') // Also revalidate user's personal view
    return { success: true }
}
