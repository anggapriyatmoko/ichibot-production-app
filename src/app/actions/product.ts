'use server'

import { product } from '@prisma/client'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { downloadExternalImage } from '@/lib/upload'
import { apiClient } from '@/lib/api-client'

type AppSession = (Session & { user?: { id?: string } }) | null

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
    } catch {
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
    const session = await getServerSession(authOptions) as AppSession

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
        } catch { }

        await writeFile(path.join(uploadDir, filename), resizedBuffer)

        // Use API route for serving
        imagePath = '/api/uploads/' + filename
    }

    let createdProduct: product | null = null;
    try {
        const product = await prisma.product.create({
            data: {
                name,
                sku,
                stock,
                lowStockThreshold,
                notes,
                drawerLocation: drawerLocation?.trim() || null,
                image: imagePath
            }
        })
        createdProduct = product;

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
    } catch (error: unknown) {
        const err = error as { code?: string; meta?: { target?: string[] } };
        if (err && typeof err === 'object' && err.code === 'P2002' && err.meta?.target?.includes('sku')) {
            return { error: `SKU '${sku}' already exists.` }
        }
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }

    revalidatePath('/inventory')
    revalidatePath('/history')

    // Sync to Laravel
    if (createdProduct) {
        try {
            await apiClient.post('/productions/sync', {
                sku: createdProduct.sku,
                name: createdProduct.name,
                stock: createdProduct.stock,
                low_stock_threshold: createdProduct.lowStockThreshold,
                notes: createdProduct.notes,
                drawer_location: createdProduct.drawerLocation,
                external_id: createdProduct.id,
                image: createdProduct.image ? (createdProduct.image.startsWith('http') ? createdProduct.image : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${createdProduct.image}`) : null,
            })
        } catch {
            console.error('Failed to sync to Laravel after creation:')
        }
    }

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

    const data: {
        name: string
        sku: string | null
        lowStockThreshold: number
        notes: string | null
        drawerLocation: string | null
        image?: string | null
    } = {
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

        try { await mkdir(uploadDir, { recursive: true }) } catch { }

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
        const updatedProduct = await prisma.product.update({
            where: { id },
            data
        })

        revalidatePath('/inventory')

        // Sync to Laravel
        try {
            await apiClient.post('/productions/sync', {
                sku: updatedProduct.sku,
                name: updatedProduct.name,
                stock: updatedProduct.stock,
                low_stock_threshold: updatedProduct.lowStockThreshold,
                notes: updatedProduct.notes,
                drawer_location: updatedProduct.drawerLocation,
                external_id: updatedProduct.id,
                image: updatedProduct.image ? (updatedProduct.image.startsWith('http') ? updatedProduct.image : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${updatedProduct.image}`) : null,
            })
        } catch (error) {
            console.error('Failed to sync to Laravel after update:', error)
        }

        return { success: true }
    } catch (error: unknown) {
        const err = error as { code?: string; meta?: { target?: string[] } };
        if (err && typeof err === 'object' && err.code === 'P2002' && err.meta?.target?.includes('sku')) {
            return { error: `SKU '${sku}' already exists.` }
        }
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}


export async function addStock(productId: string, quantity: number) {
    const session = await getServerSession(authOptions) as AppSession

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

    revalidatePath('/inventory')
    revalidatePath('/history')

    // Sync to Laravel
    try {
        const product = await prisma.product.findUnique({ where: { id: productId } })
        if (product) {
            await apiClient.post('/productions/sync', {
                sku: product.sku,
                name: product.name,
                stock: product.stock,
                low_stock_threshold: product.lowStockThreshold,
                notes: product.notes,
                drawer_location: product.drawerLocation,
                external_id: product.id,
            })
        }
    } catch {
        console.error('Failed to sync to Laravel after addStock:')
    }
}

export async function deleteProduct(id: string) {
    await requireAdmin()

    try {
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

        // Sync to Laravel (Delete)
        try {
            await apiClient.post('/productions/sync', {
                action: 'delete',
                external_id: id
            })
        } catch {
            console.error('Failed to delete from Laravel:')
        }

        return { success: true }
    } catch (error: unknown) {
        console.error('Error deleting product:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { error: 'Gagal menghapus produk: ' + errorMessage }
    }
}

// Helper removed, using shared version in @/lib/upload

export async function importProducts(products: {
    name: string
    sku?: string | number
    stock?: string | number
    lowStockThreshold?: string | number
    notes?: string | null
    image?: string | null
}[]) {
    await requireAdmin()
    const session = await getServerSession(authOptions) as AppSession

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
            const stock = item.stock ? parseFloat(String(item.stock)) : 0
            const lowStockThreshold = item.lowStockThreshold ? parseFloat(String(item.lowStockThreshold)) : 10
            const notes = item.notes ? String(item.notes).trim() : null

            // Image handling: Check if it's a URL and download if needed
            let imagePath = item.image ? String(item.image).trim() : null
            if (imagePath && imagePath.startsWith('http')) {
                const downloadedPath = await downloadExternalImage(imagePath)
                if (downloadedPath) {
                    imagePath = downloadedPath
                } else {
                    // If download fails, keep existing or null
                    imagePath = null
                }
            } else if (imagePath && imagePath.includes('/api/uploads/')) {
                // Already an internal path, just extract the relative part
                const filename = imagePath.split('/api/uploads/').pop()
                imagePath = '/api/uploads/' + filename
            }

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
                const updateData: {
                    name: string
                    stock: number
                    lowStockThreshold: number
                    notes: string | null
                    image: string | null
                    sku?: string | null
                } = {
                    name,
                    stock: stock,
                    lowStockThreshold,
                    notes: notes || existing.notes,
                    image: imagePath || existing.image
                }

                // Only update SKU if provided and not empty
                if (sku) {
                    updateData.sku = sku
                }
                // If excel SKU is empty, we DO NOT clear the existing SKU. Preserve it.

                const updatedProduct = await prisma.product.update({
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

                // Sync to Laravel
                try {
                    await apiClient.post('/productions/sync', {
                        sku: updatedProduct.sku,
                        name: updatedProduct.name,
                        stock: updatedProduct.stock,
                        low_stock_threshold: updatedProduct.lowStockThreshold,
                        notes: updatedProduct.notes,
                        drawer_location: updatedProduct.drawerLocation,
                        external_id: updatedProduct.id,
                        image: updatedProduct.image ? (updatedProduct.image.startsWith('http') ? updatedProduct.image : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${updatedProduct.image}`) : null,
                    })
                } catch {
                    console.error('Failed to sync to Laravel during import update:')
                }

            } else {
                // Create
                const newProduct = await prisma.product.create({
                    data: {
                        name,
                        sku, // removed as any
                        stock,
                        lowStockThreshold,
                        notes,
                        image: imagePath
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

                // Sync to Laravel
                try {
                    await apiClient.post('/productions/sync', {
                        sku: newProduct.sku,
                        name: newProduct.name,
                        stock: newProduct.stock,
                        low_stock_threshold: newProduct.lowStockThreshold,
                        notes: newProduct.notes,
                        drawer_location: newProduct.drawerLocation,
                        external_id: newProduct.id,
                        image: newProduct.image ? (newProduct.image.startsWith('http') ? newProduct.image : `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${newProduct.image}`) : null,
                    })
                } catch {
                    console.error('Failed to sync to Laravel during import create:')
                }
            }
            successCount++

        } catch (error: unknown) {
            errorCount++
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            errors.push(`Failed to import item ${item.name}: ${errorMessage}`)
        }
    }

    revalidatePath('/inventory')
    revalidatePath('/history')

    return { success: successCount, failed: errorCount, errors }
}

export async function getAllProductsForExport(baseUrl: string) {
    await requireAdmin()
    const products = await prisma.product.findMany({
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

    return products.map(p => ({
        ...p,
        image: p.image ? (p.image.startsWith('http') ? p.image : `${baseUrl}${p.image}`) : ''
    }))
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
    } catch (error: unknown) {
        console.error('Error moving product:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return { error: 'Gagal memindah produk: ' + errorMessage }
    }
}
