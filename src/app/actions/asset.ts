'use server'

import prisma from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

// Helper function to delete old image file from storage
async function deleteOldImage(imagePath: string | null) {
    if (!imagePath) return

    try {
        // Extract filename from path (e.g., '/api/uploads/asset-123.jpg' -> 'asset-123.jpg')
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
        console.log('Deleted old asset image:', filePath)
    } catch (error) {
        // File might not exist, ignore error
        console.log('Could not delete old asset image (may not exist):', imagePath)
    }
}

// Image upload validation helper (1MB limit)
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

    // Check file extension
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return { valid: false, error: 'Ekstensi file tidak valid.' }
    }

    return { valid: true }
}

export async function getAssets() {
    await requireAuth()
    return prisma.machineAsset.findMany({
        orderBy: { name: 'asc' }
    })
}

export async function createAsset(formData: FormData) {
    await requireAuth()

    const name = formData.get('name') as string
    const code = formData.get('code') as string | null
    const specification = formData.get('specification') as string | null
    const location = formData.get('location') as string
    const priceStr = formData.get('price') as string | null
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null
    const yearStr = formData.get('year') as string | null
    const usefulLifeStr = formData.get('usefulLife') as string | null
    const residualValueStr = formData.get('residualValue') as string | null

    if (!name?.trim()) {
        return { error: 'Nama mesin/alat wajib diisi' }
    }
    if (!location?.trim()) {
        return { error: 'Lokasi wajib diisi' }
    }

    let imagePath = null

    // Handle image upload
    if (imageFile && imageFile.size > 0) {
        const validation = validateImageFile(imageFile)
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

        const filename = 'asset-' + Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

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
    }

    const asset = await prisma.machineAsset.create({
        data: {
            name: name.trim(),
            code: code?.trim() || null,
            specification: specification?.trim() || null,
            location: location.trim(),
            price: priceStr ? parseFloat(priceStr) : null,
            notes: notes?.trim() || null,
            image: imagePath,
            year: yearStr ? parseInt(yearStr) : null,
            usefulLife: usefulLifeStr ? parseInt(usefulLifeStr) : null,
            residualValue: residualValueStr ? parseFloat(residualValueStr) : null
        }
    })
    revalidatePath('/assets')
    return { success: true, data: asset }
}

export async function updateAsset(formData: FormData) {
    await requireAuth()

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const code = formData.get('code') as string | null
    const specification = formData.get('specification') as string | null
    const location = formData.get('location') as string
    const priceStr = formData.get('price') as string | null
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('removeImage') === 'true'
    const yearStr = formData.get('year') as string | null
    const usefulLifeStr = formData.get('usefulLife') as string | null
    const residualValueStr = formData.get('residualValue') as string | null

    if (!name?.trim()) {
        return { error: 'Nama mesin/alat wajib diisi' }
    }
    if (!location?.trim()) {
        return { error: 'Lokasi wajib diisi' }
    }

    // Fetch existing asset to get current image path
    const existingAsset = await prisma.machineAsset.findUnique({
        where: { id },
        select: { image: true }
    })

    const data: any = {
        name: name.trim(),
        code: code?.trim() || null,
        specification: specification?.trim() || null,
        location: location.trim(),
        price: priceStr ? parseFloat(priceStr) : null,
        notes: notes?.trim() || null,
        year: yearStr ? parseInt(yearStr) : null,
        usefulLife: usefulLifeStr ? parseInt(usefulLifeStr) : null,
        residualValue: residualValueStr ? parseFloat(residualValueStr) : null
    }

    // Handle new image upload
    if (imageFile && imageFile.size > 0) {
        const validation = validateImageFile(imageFile)
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

        const filename = 'asset-' + Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

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
        data.image = '/api/uploads/' + filename

        // Delete old image since we're replacing it
        if (existingAsset?.image) {
            await deleteOldImage(existingAsset.image)
        }
    }

    // Handle image removal
    if (removeImage) {
        data.image = null
        // Delete old image from storage
        if (existingAsset?.image) {
            await deleteOldImage(existingAsset.image)
        }
    }

    const asset = await prisma.machineAsset.update({
        where: { id },
        data
    })
    revalidatePath('/assets')
    return { success: true, data: asset }
}

export async function deleteAsset(id: string) {
    await requireAdmin()

    // Fetch asset to get image path before deleting
    const asset = await prisma.machineAsset.findUnique({
        where: { id },
        select: { image: true }
    })

    await prisma.machineAsset.delete({ where: { id } })

    // Delete image from storage after successful DB deletion
    if (asset?.image) {
        await deleteOldImage(asset.image)
    }

    revalidatePath('/assets')
    return { success: true }
}

export async function getAllAssetsForExport() {
    await requireAdmin()
    return prisma.machineAsset.findMany({
        orderBy: { name: 'asc' },
        select: {
            name: true,
            code: true,
            specification: true,
            location: true,
            price: true,
            notes: true,
            year: true,
            usefulLife: true,
            residualValue: true,
            image: true
        }
    })
}

export async function importAssets(assets: any[]) {
    await requireAdmin()

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const item of assets) {
        try {
            // Validation: Name and Location are required
            if (!item.name) {
                errorCount++
                errors.push(`Row missing name: ${JSON.stringify(item)}`)
                continue
            }
            if (!item.location) {
                errorCount++
                errors.push(`Row missing location: ${JSON.stringify(item)}`)
                continue
            }

            const name = String(item.name).trim()
            const location = String(item.location).trim()
            const code = item.code ? String(item.code).trim() : null
            const specification = item.specification ? String(item.specification).trim() : null
            const notes = item.notes ? String(item.notes).trim() : null
            const price = item.price ? parseFloat(item.price) : null
            const year = item.year ? parseInt(item.year) : null
            const usefulLife = item.usefulLife ? parseInt(item.usefulLife) : null
            const residualValue = item.residualValue ? parseFloat(item.residualValue) : null

            // Check existing by name (unique identifier for import)
            const existing = await prisma.machineAsset.findFirst({
                where: { name }
            })

            if (existing) {
                // Update existing asset
                await prisma.machineAsset.update({
                    where: { id: existing.id },
                    data: {
                        code,
                        specification,
                        location,
                        price,
                        notes,
                        year,
                        usefulLife,
                        residualValue
                    }
                })
            } else {
                // Create new asset
                await prisma.machineAsset.create({
                    data: {
                        name,
                        code,
                        specification,
                        location,
                        price,
                        notes,
                        year,
                        usefulLife,
                        residualValue
                    }
                })
            }
            successCount++

        } catch (error: any) {
            errorCount++
            errors.push(`Failed to import item ${item.name}: ${error.message}`)
        }
    }

    revalidatePath('/assets')

    return { success: successCount, errors }
}
