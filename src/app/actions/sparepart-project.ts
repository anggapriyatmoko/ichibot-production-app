'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { requireAuth, requireAdmin } from '@/lib/auth'

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
        console.log('Deleted old sparepart project image:', filePath)
    } catch (error) {
        // File might not exist, ignore error
        console.log('Could not delete old sparepart project image (may not exist):', imagePath)
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

    // Check file extension
    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return { valid: false, error: 'Ekstensi file tidak valid.' }
    }

    return { valid: true }
}

export async function getSparepartProjects(search: string = '') {
    await requireAuth()

    const where: any = search ? {
        AND: search.split(/\s+/).filter(Boolean).map(word => ({
            OR: [
                { name: { contains: word } },
                { notes: { contains: word } }
            ]
        }))
    } : {}

    return await prisma.sparepartProject.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    })
}

export async function createSparepartProject(formData: FormData) {
    await requireAuth()

    const name = formData.get('name') as string
    const sku = formData.get('sku') as string | null
    const stock = parseFloat(formData.get('stock') as string) || 0
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null

    let imagePath = null

    if (imageFile && imageFile.size > 0) {
        // Validate image file
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

        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

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

    try {
        await prisma.sparepartProject.create({
            data: {
                name,
                sku,
                stock,
                notes,
                image: imagePath
            }
        })
    } catch (error: any) {
        return { error: error.message }
    }

    revalidatePath('/sparepart-project')
    return { success: true }
}

export async function updateSparepartProject(formData: FormData) {
    await requireAuth()

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const sku = formData.get('sku') as string | null
    const stock = parseFloat(formData.get('stock') as string) || 0
    const notes = formData.get('notes') as string | null
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('removeImage') === 'true'

    // Fetch existing item to get current image path
    const existingItem = await prisma.sparepartProject.findUnique({
        where: { id },
        select: { image: true }
    })

    const data: any = {
        name,
        sku,
        stock,
        notes
    }

    if (imageFile && imageFile.size > 0) {
        // Validate image file
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

        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

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
        if (existingItem?.image) {
            await deleteOldImage(existingItem.image)
        }
    }

    // Handle image removal
    if (removeImage) {
        data.image = null
        // Delete old image from storage
        if (existingItem?.image) {
            await deleteOldImage(existingItem.image)
        }
    }

    try {
        await prisma.sparepartProject.update({
            where: { id },
            data
        })
    } catch (error: any) {
        return { error: error.message }
    }

    revalidatePath('/sparepart-project')
    return { success: true }
}

export async function addSparepartProjectStock(id: string, quantity: number) {
    await requireAuth()

    await prisma.sparepartProject.update({
        where: { id },
        data: { stock: { increment: quantity } }
    })

    revalidatePath('/sparepart-project')
}

export async function reduceSparepartProjectStock(id: string, quantity: number) {
    await requireAuth()

    // Verify stock is sufficient
    const item = await prisma.sparepartProject.findUnique({
        where: { id },
        select: { stock: true, name: true }
    })

    if (!item) {
        return { error: 'Item tidak ditemukan' }
    }

    if (item.stock < quantity) {
        return { error: `Stock tidak cukup. Stock tersedia: ${item.stock}` }
    }

    await prisma.sparepartProject.update({
        where: { id },
        data: { stock: { decrement: quantity } }
    })

    revalidatePath('/sparepart-project')
    return { success: true }
}

export async function deleteSparepartProject(id: string) {
    await requireAdmin()

    // Fetch item to get image path before deleting
    const item = await prisma.sparepartProject.findUnique({
        where: { id },
        select: { image: true }
    })

    await prisma.sparepartProject.delete({
        where: { id }
    })

    // Delete image from storage after successful DB deletion
    if (item?.image) {
        await deleteOldImage(item.image)
    }

    revalidatePath('/sparepart-project')
}

export async function moveToProduction(id: string, sku?: string) {
    await requireAuth()

    // Fetch the sparepart project item
    const item = await prisma.sparepartProject.findUnique({
        where: { id }
    })

    if (!item) {
        return { error: 'Item tidak ditemukan' }
    }

    // Check if a product with the same name already exists
    const existingProduct = await prisma.product.findFirst({
        where: { name: item.name }
    })

    if (existingProduct) {
        // Add stock to existing product
        await prisma.product.update({
            where: { id: existingProduct.id },
            data: { stock: { increment: item.stock } }
        })
    } else {
        // Create new product in inventory with the same data
        await prisma.product.create({
            data: {
                name: item.name,
                sku: sku?.trim() || null,
                stock: item.stock,
                notes: item.notes,
                image: item.image,
                lowStockThreshold: 0 // Default threshold
            }
        })
    }

    // Delete the sparepart project item (keep the image since it's now used by the product)
    await prisma.sparepartProject.delete({
        where: { id }
    })

    revalidatePath('/sparepart-project')
    revalidatePath('/inventory')

    return { success: true, merged: !!existingProduct }
}
