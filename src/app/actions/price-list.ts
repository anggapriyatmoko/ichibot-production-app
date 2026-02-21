'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { requireAuth } from '@/lib/auth'

// Helper function to delete old image file from storage
async function deleteOldImage(imagePath: string | null) {
    if (!imagePath) return

    try {
        const filename = imagePath.replace('/api/uploads/', '')
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
    } catch {
        // Ignore error if file doesn't exist
    }
}

// Image upload validation helper
function validateImageFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 1 * 1024 * 1024 // 1MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

    if (file.size > MAX_SIZE) {
        return { valid: false, error: 'File gambar melebihi 1MB' }
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Tipe file tidak valid (JPG, PNG, WEBP, GIF only)' }
    }
    return { valid: true }
}

async function saveImage(imageFile: File): Promise<string> {
    const buffer = Buffer.from(await imageFile.arrayBuffer())

    // Resize with Sharp
    const resizedBuffer = await sharp(buffer)
        .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .toBuffer()

    const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

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
    } catch { }

    await writeFile(path.join(uploadDir, filename), resizedBuffer)
    return '/api/uploads/' + filename
}


// --- GROUPS ---

export async function getPriceListGroups() {
    await requireAuth()
    return await prisma.priceListGroup.findMany({
        include: {
            categories: {
                orderBy: { order: 'asc' }
            },
            items: {
                orderBy: [
                    { categoryRel: { order: 'asc' } } as any,
                    { price: 'asc' }
                ],
                include: {
                    categoryRel: true,
                    prices: {
                        orderBy: { order: 'asc' }
                    }
                } as any
            }
        } as any,
        orderBy: { createdAt: 'desc' }
    })
}

export async function createPriceListGroup(name: string) {
    await requireAuth()
    try {
        await prisma.priceListGroup.create({
            data: { name }
        })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Gagal membuat grup' }
    }
}

export async function updatePriceListGroup(id: string, name: string) {
    await requireAuth()
    try {
        await prisma.priceListGroup.update({
            where: { id },
            data: { name }
        })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Gagal update grup' }
    }
}

export async function deletePriceListGroup(id: string) {
    await requireAuth()
    try {
        // Fetch items to delete images
        const group = await prisma.priceListGroup.findUnique({
            where: { id },
            include: { items: true }
        })

        if (group) {
            for (const item of group.items) {
                if (item.image) await deleteOldImage(item.image)
                try {
                    const additionalImages = JSON.parse((item as any).additionalImages || '[]') as string[]
                    for (const img of additionalImages) {
                        await deleteOldImage(img)
                    }
                } catch { }
            }
        }

        await prisma.priceListGroup.delete({
            where: { id }
        })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Gagal hapus grup' }
    }
}


// --- Category Actions ---

export async function createPriceListCategory(groupId: string, name: string) {
    try {
        await requireAuth()

        // Get max order
        const maxOrder = await (prisma as any).priceListCategory.findFirst({
            where: { groupId },
            orderBy: { order: 'desc' },
            select: { order: true }
        })

        const newOrder = (maxOrder?.order ?? 0) + 1

        const category = await (prisma as any).priceListCategory.create({
            data: {
                groupId,
                name,
                order: newOrder
            }
        })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true, category }
    } catch (error: any) {
        return { error: 'Gagal membuat kategori' }
    }
}

export async function reorderPriceListCategories(groupId: string, orderedIds: string[]) {
    try {
        await requireAuth()

        const uncategorizedIndex = orderedIds.indexOf('uncategorized')
        const updates: any[] = []

        // 1. Update the 'uncategorizedOrder' field on the group if the virtual category is present
        if (uncategorizedIndex !== -1) {
            updates.push(
                (prisma as any).priceListGroup.update({
                    where: { id: groupId },
                    data: { uncategorizedOrder: uncategorizedIndex + 1 } // 1-based index
                })
            )
        }

        // 2. Update real categories' order
        orderedIds.forEach((id, index) => {
            if (id !== 'uncategorized') {
                updates.push(
                    (prisma as any).priceListCategory.update({
                        where: { id },
                        data: { order: index + 1 }
                    })
                )
            }
        })

        await prisma.$transaction(updates)

        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: 'Gagal mengurutkan kategori' }
    }
}

export async function deletePriceListCategory(id: string) {
    try {
        await requireAuth()
        await (prisma as any).priceListCategory.delete({ where: { id } })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: 'Gagal menghapus kategori' }
    }
}

export async function syncCategoriesFromItems(groupId: string) {
    try {
        await requireAuth()
        // Find items with legacy category string but no relation
        const items = await prisma.priceListItem.findMany({
            where: {
                groupId,
                categoryId: null,
                category: { not: null }
            } as any
        })

        if (items.length === 0) return { success: true, count: 0 }

        const uniqueCategories = Array.from(new Set(items.map(i => (i as any).category).filter(Boolean) as string[]))

        let addedCount = 0
        for (const catName of uniqueCategories) {
            // Find or create category
            let cat = await (prisma as any).priceListCategory.findFirst({
                where: { groupId, name: catName }
            })

            if (!cat) {
                // Get max order
                const maxOrder = await (prisma as any).priceListCategory.findFirst({
                    where: { groupId },
                    orderBy: { order: 'desc' },
                    select: { order: true }
                })
                cat = await (prisma as any).priceListCategory.create({
                    data: {
                        groupId,
                        name: catName,
                        order: (maxOrder?.order ?? 0) + 1
                    }
                })
                addedCount++
            }

            // Link items
            await prisma.priceListItem.updateMany({
                where: { groupId, category: catName } as any,
                data: { categoryId: cat.id } as any
            })
        }

        revalidatePath('/administrasi/daftar-harga')
        return { success: true, count: addedCount }
    } catch (error) {
        console.error(error)
        return { error: 'Migration failed' }
    }
}


// --- ITEMS ---

export async function createPriceListItem(formData: FormData) {
    await requireAuth()
    const groupId = formData.get('groupId') as string
    const name = formData.get('name') as string
    const categoryName = formData.get('category') as string
    const quantity = formData.get('quantity') as string
    const price = parseFloat(formData.get('price') as string)
    const discount = parseFloat(formData.get('discount') as string) || 0
    const description = formData.get('description') as string
    const shortDescription = formData.get('shortDescription') as string
    const pricesJson = formData.get('prices') as string
    const imageFile = formData.get('image') as File | null
    const additionalImageFiles = formData.getAll('additionalImages') as File[]

    let imagePath = null
    let additionalImages: string[] = []

    // Main Image
    if (imageFile && imageFile.size > 0) {
        const validation = validateImageFile(imageFile)
        if (!validation.valid) return { error: validation.error }
        try {
            imagePath = await saveImage(imageFile)
        } catch (e) {
            return { error: 'Gagal upload gambar utama' }
        }
    }

    // Additional Images
    for (const file of additionalImageFiles) {
        if (file.size > 0) {
            const validation = validateImageFile(file)
            if (!validation.valid) return { error: `File tambahan tidak valid: ${validation.error}` }
            try {
                const path = await saveImage(file)
                additionalImages.push(path)
            } catch (e) {
                return { error: 'Gagal upload gambar tambahan' }
            }
        }
    }

    try {
        // Handle Category Logic
        let categoryId = null
        if (categoryName) {
            // Check if exists
            let cat = await (prisma as any).priceListCategory.findFirst({
                where: { groupId, name: categoryName }
            })
            if (!cat) {
                const maxOrder = await (prisma as any).priceListCategory.findFirst({
                    where: { groupId },
                    orderBy: { order: 'desc' },
                    select: { order: true }
                })
                cat = await (prisma as any).priceListCategory.create({
                    data: {
                        groupId,
                        name: categoryName,
                        order: (maxOrder?.order ?? 0) + 1
                    }
                })
            }
            categoryId = cat.id
        }

        // Parse variant prices
        let pricesData: { label: string; price: number; discount: number; qty: string; description: string }[] = []
        try {
            if (pricesJson) pricesData = JSON.parse(pricesJson)
        } catch { }

        await prisma.priceListItem.create({
            data: {
                groupId,
                name,
                category: categoryName || null,
                categoryId, // Link relation
                quantity: quantity || null,
                price: isNaN(price) ? 0 : price,
                discount: isNaN(discount) ? 0 : discount,
                description: description || null,
                shortDescription: shortDescription || null,
                image: imagePath,
                additionalImages: JSON.stringify(additionalImages),
                prices: pricesData.length > 0 ? {
                    create: pricesData.map((p, i) => ({
                        label: p.label,
                        price: p.price || 0,
                        discount: p.discount || 0,
                        qty: p.qty || null,
                        description: p.description || null,
                        order: i
                    }))
                } : undefined
            } as any
        })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Gagal tambah item' }
    }
}

export async function updatePriceListItem(formData: FormData) {
    await requireAuth()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const categoryName = formData.get('category') as string
    const quantity = formData.get('quantity') as string
    const price = parseFloat(formData.get('price') as string)
    const discount = parseFloat(formData.get('discount') as string) || 0
    const description = formData.get('description') as string
    const shortDescription = formData.get('shortDescription') as string
    const pricesJson = formData.get('prices') as string
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('removeImage') === 'true'
    const additionalImageFiles = formData.getAll('additionalImages') as File[]
    const removedAdditionalImages = JSON.parse(formData.get('removedAdditionalImages') as string || '[]') as string[]

    try {
        const currentItem = await prisma.priceListItem.findUnique({ where: { id } })
        if (!currentItem) return { error: 'Item tidak ditemukan' }

        // Handle Main Image
        let imagePath = currentItem.image
        if (removeImage && imagePath) {
            await deleteOldImage(imagePath)
            imagePath = null
        }
        if (imageFile && imageFile.size > 0) {
            const validation = validateImageFile(imageFile)
            if (!validation.valid) return { error: validation.error }
            if (imagePath) await deleteOldImage(imagePath)
            imagePath = await saveImage(imageFile)
        }

        // Handle Additional Images
        let currentAdditionalImages: string[] = []
        try {
            currentAdditionalImages = JSON.parse((currentItem as any).additionalImages || '[]')
        } catch { }

        // Remove deleted images
        for (const imgToRemove of removedAdditionalImages) {
            if (currentAdditionalImages.includes(imgToRemove)) {
                await deleteOldImage(imgToRemove)
                currentAdditionalImages = currentAdditionalImages.filter(img => img !== imgToRemove)
            }
        }

        // Add new images
        for (const file of additionalImageFiles) {
            if (file.size > 0) {
                const validation = validateImageFile(file)
                if (!validation.valid) return { error: `File tambahan tidak valid: ${validation.error}` }
                const path = await saveImage(file)
                currentAdditionalImages.push(path)
            }
        }

        // Handle Category Logic
        let categoryId = (currentItem as any).categoryId
        if (categoryName) {
            const existCat = await (prisma as any).priceListCategory.findFirst({
                where: { groupId: currentItem.groupId, name: categoryName }
            })

            if (existCat) {
                categoryId = existCat.id
            } else {
                // Create new
                const maxOrder = await (prisma as any).priceListCategory.findFirst({
                    where: { groupId: currentItem.groupId },
                    orderBy: { order: 'desc' },
                    select: { order: true }
                })
                const newCat = await (prisma as any).priceListCategory.create({
                    data: {
                        groupId: currentItem.groupId,
                        name: categoryName,
                        order: (maxOrder?.order ?? 0) + 1
                    }
                })
                categoryId = newCat.id
            }
        } else {
            categoryId = null
        }

        // Parse variant prices
        let pricesData: { label: string; price: number; discount: number; qty: string; description: string }[] = []
        try {
            if (pricesJson) pricesData = JSON.parse(pricesJson)
        } catch { }

        // Delete existing prices and recreate
        await (prisma as any).priceListPrice.deleteMany({ where: { itemId: id } })

        await prisma.priceListItem.update({
            where: { id },
            data: {
                name,
                category: categoryName || null,
                categoryId,
                quantity: quantity || null,
                price: isNaN(price) ? 0 : price,
                discount: isNaN(discount) ? 0 : discount,
                description: description || null,
                shortDescription: shortDescription || null,
                image: imagePath,
                additionalImages: JSON.stringify(currentAdditionalImages),
                prices: pricesData.length > 0 ? {
                    create: pricesData.map((p, i) => ({
                        label: p.label,
                        price: p.price || 0,
                        discount: p.discount || 0,
                        qty: p.qty || null,
                        description: p.description || null,
                        order: i
                    }))
                } : undefined
            } as any
        })

        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Gagal update item' }
    }
}

export async function deletePriceListItem(id: string) {
    await requireAuth()
    try {
        const item = await prisma.priceListItem.findUnique({ where: { id } })
        if (item) {
            if (item.image) await deleteOldImage(item.image)
            try {
                const additionalImages = JSON.parse((item as any).additionalImages || '[]') as string[]
                for (const img of additionalImages) {
                    await deleteOldImage(img)
                }
            } catch { }
        }

        await prisma.priceListItem.delete({ where: { id } })
        revalidatePath('/administrasi/daftar-harga')
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Gagal hapus item' }
    }
}
