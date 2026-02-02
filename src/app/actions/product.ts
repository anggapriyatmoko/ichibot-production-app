'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
        console.log('Deleted old product image:', filePath)
    } catch (error) {
        // File might not exist, ignore error
        console.log('Could not delete old product image (may not exist):', imagePath)
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

export async function createProduct(formData: FormData) {
    await requireAuth()
    const session: any = await getServerSession(authOptions)

    const name = formData.get('name') as string
    const rawSku = formData.get('sku') as string
    const sku = rawSku && rawSku.trim() !== '' ? rawSku.trim() : null
    const stock = parseFloat(formData.get('stock') as string)
    const lowStockThreshold = parseFloat(formData.get('lowStockThreshold') as string)
    const notes = formData.get('notes') as string | null
    const drawerLocation = formData.get('drawerLocation') as string | null
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

        // Restore original filename handling (no webp forcing)
        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

        // Determine upload directory: Favor process.env.UPLOAD_DIR or /app/uploads in Docker
        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            // Default for VPS/Docker if no env var
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                // Local dev fallback
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        // Ensure directory exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)

        // Use API route for serving
        imagePath = '/api/uploads/' + filename
    }

    try {
        const product = await prisma.product.create({
            data: {
                name,
                sku: sku as any,
                stock,
                lowStockThreshold,
                notes,
                drawerLocation: drawerLocation?.trim() || null,
                image: imagePath
            }
        })

        // Create transaction record if initial stock > 0
        if (stock > 0) {
            await prisma.transaction.create({
                data: {
                    type: 'IN',
                    quantity: stock,
                    productId: product.id,
                    userId: session?.user?.id || null,
                    description: 'Initial Stock'
                }
            })
            console.log('Transaction created with userId:', session?.user?.id || 'system')
        }
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
            return { error: `SKU '${sku}' already exists.` }
        }
        return { error: error.message }
    }

    revalidatePath('/inventory')
    revalidatePath('/history')
    return { success: true }
}

export async function updateProduct(formData: FormData) {
    await requireAuth()
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const rawSku = formData.get('sku') as string
    const sku = rawSku && rawSku.trim() !== '' ? rawSku.trim() : null
    const lowStockThreshold = parseFloat(formData.get('lowStockThreshold') as string)
    const notes = formData.get('notes') as string | null
    const drawerLocation = formData.get('drawerLocation') as string | null
    const imageFile = formData.get('image') as File | null
    const removeImage = formData.get('removeImage') === 'true'

    // Fetch existing product to get current image path
    const existingProduct = await prisma.product.findUnique({
        where: { id },
        select: { image: true }
    })

    const data: any = {
        name,
        sku,
        lowStockThreshold,
        notes,
        drawerLocation: drawerLocation?.trim() || null
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

        // Restore original filename handling (no webp forcing)
        const filename = Date.now() + '-' + imageFile.name.replace(/\s/g, '-')

        // Determine upload directory: Favor process.env.UPLOAD_DIR or /app/uploads in Docker
        let uploadDir = process.env.UPLOAD_DIR
        if (!uploadDir) {
            // Default for VPS/Docker if no env var
            if (process.env.NODE_ENV === 'production') {
                uploadDir = path.join(process.cwd(), 'uploads')
            } else {
                // Local dev fallback
                uploadDir = path.join(process.cwd(), 'public', 'uploads')
            }
        }

        try { await mkdir(uploadDir, { recursive: true }) } catch (e) { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)
        data.image = '/api/uploads/' + filename

        // Delete old image since we're replacing it
        if (existingProduct?.image) {
            await deleteOldImage(existingProduct.image)
        }
    }

    // Handle image removal
    if (removeImage) {
        data.image = null
        // Delete old image from storage
        if (existingProduct?.image) {
            await deleteOldImage(existingProduct.image)
        }
    }

    try {
        await prisma.product.update({
            where: { id },
            data
        })
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
            return { error: `SKU '${sku}' already exists.` }
        }
        return { error: error.message }
    }

    revalidatePath('/inventory')
    return { success: true }
}


export async function addStock(productId: string, quantity: number) {
    const session: any = await getServerSession(authOptions)

    console.log('=== ADD STOCK DEBUG ===')
    console.log('Session:', JSON.stringify(session, null, 2))
    console.log('User ID:', session?.user?.id)
    console.log('User:', session?.user)

    await prisma.$transaction([
        prisma.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } }
        }),
        prisma.transaction.create({
            data: {
                type: 'IN',
                quantity: quantity,
                productId: productId,
                userId: session?.user?.id || null,
                description: 'Manual Stock Addition'
            }
        })
    ])

    console.log('Transaction created with userId:', session?.user?.id)

    revalidatePath('/inventory')
    revalidatePath('/history')
}

export async function deleteProduct(id: string) {
    await requireAdmin()

    // Fetch product to get image path before deleting
    const product = await prisma.product.findUnique({
        where: { id },
        select: { image: true }
    })

    await prisma.product.delete({
        where: { id }
    })

    // Delete image from storage after successful DB deletion
    if (product?.image) {
        await deleteOldImage(product.image)
    }

    revalidatePath('/inventory')
}

export async function importProducts(products: any[]) {
    await requireAdmin()
    const session: any = await getServerSession(authOptions)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const item of products) {
        try {
            // Validation: Name is required. SKU is optional.
            if (!item.name) {
                errorCount++
                errors.push(`Row missing name: ${JSON.stringify(item)}`)
                continue
            }

            const itemSku = item.sku ? String(item.sku).trim() : null
            const sku = itemSku === '' ? null : itemSku
            const name = String(item.name).trim()
            const stock = item.stock ? parseFloat(item.stock) : 0
            const lowStockThreshold = item.lowStockThreshold ? parseFloat(item.lowStockThreshold) : 10

            // Check existing logic: Priority SKU -> Name
            let existing = null

            if (sku) {
                existing = await prisma.product.findUnique({
                    where: { sku }
                })
            }

            if (!existing) {
                // Determine uniqueness by Name if SKU not found or not provided
                existing = await prisma.product.findFirst({
                    where: { name }
                })
            }

            if (existing) {
                // Update
                const updateData: any = {
                    name,
                    stock: stock,
                    lowStockThreshold,
                    image: item.image ? String(item.image).trim() : existing.image
                }

                // Only update SKU if provided and not empty
                if (sku) {
                    updateData.sku = sku
                }
                // If excel SKU is empty, we DO NOT clear the existing SKU. Preserve it.

                await prisma.product.update({
                    where: { id: existing.id },
                    data: updateData
                })

                const diff = stock - existing.stock
                if (diff !== 0) {
                    await prisma.transaction.create({
                        data: {
                            type: diff > 0 ? 'IN' : 'OUT',
                            quantity: Math.abs(diff),
                            productId: existing.id,
                            userId: session?.user?.id || null,
                            description: `Import Adjustment (${diff > 0 ? '+' : ''}${diff})`
                        }
                    })
                }

            } else {
                // Create
                const newProduct = await prisma.product.create({
                    data: {
                        name,
                        sku: sku as any, // can be null
                        stock,
                        lowStockThreshold,
                        image: item.image ? String(item.image).trim() : null
                    }
                })

                if (stock > 0) {
                    await prisma.transaction.create({
                        data: {
                            type: 'IN',
                            quantity: stock,
                            productId: newProduct.id,
                            userId: session?.user?.id || null,
                            description: 'Import Initial Stock'
                        }
                    })
                }
            }
            successCount++

        } catch (error: any) {
            errorCount++
            errors.push(`Failed to import item ${item.name}: ${error.message}`)
        }
    }

    revalidatePath('/inventory')
    revalidatePath('/history')

    return { success: successCount, errors }
}

export async function getAllProductsForExport() {
    await requireAdmin()
    return await prisma.product.findMany({
        orderBy: { name: 'asc' },
        select: {
            name: true,
            sku: true,
            stock: true,
            lowStockThreshold: true,
            notes: true,
            image: true
        }
    })
}

export async function moveToSparepartProject(id: string) {
    await requireAdmin()

    try {
        // Fetch the product
        const product = await prisma.product.findUnique({
            where: { id }
        })

        if (!product) {
            return { error: 'Produk tidak ditemukan' }
        }

        // Check if a sparepart project item with the same name already exists
        const existingSparepart = await prisma.sparepartProject.findFirst({
            where: { name: product.name }
        })

        if (existingSparepart) {
            // Add stock to existing sparepart project item
            await prisma.sparepartProject.update({
                where: { id: existingSparepart.id },
                data: { stock: { increment: product.stock } }
            })
        } else {
            // Create new sparepart project item with the same data
            await prisma.sparepartProject.create({
                data: {
                    name: product.name,
                    sku: product.sku,
                    stock: product.stock,
                    notes: product.notes,
                    image: product.image
                }
            })
        }

        // Delete the product record
        // We delete directly via prisma to avoid deleteOldImage helper which would remove the file
        await prisma.product.delete({
            where: { id }
        })

        revalidatePath('/inventory')
        revalidatePath('/sparepart-project')

        return { success: true, merged: !!existingSparepart }
    } catch (error: any) {
        console.error('Error moving product:', error)
        return { error: 'Gagal memindah produk: ' + error.message }
    }
}
